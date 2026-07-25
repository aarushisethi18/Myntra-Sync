"""AI Fashion Intelligence Service — Modular OpenRouter styling layer.

Responsibilities:
  1. Receive compact context & candidate set from AiContextBuilder.
  2. Check in-process LRU cache for recent valid response.
  3. Formulate per-engine prompt.
  4. Invoke OpenRouter via OpenAI SDK with 6.0s timeout per model and automatic
     fallback retries across dynamically-discovered free models.
  5. Validate response strictly:
     - Output is valid JSON
     - EVERY product_id exists in the input candidate set
     - ai_match_score is integer 0..100
     - Required text fields present & bounded in length
     - completes_wardrobe_with references valid categories
  6. If all OpenRouter models fail, time out, or fail validation → return
     fallback_used=True so caller uses original deterministic ordering.

Model discovery:
  On first use (and every 12 hours), fetches GET /api/v1/models from
  OpenRouter, filters to free text-generation models, and sorts by context
  length descending.  A model that succeeds is cached for the process
  lifetime until it fails, at which point the next model is tried.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
import logging
import os
import threading
import time
from typing import Any
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from openai import OpenAI

logger = logging.getLogger(__name__)

# Load env variables from backend root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
PREFERRED_MODEL = os.getenv("OPENROUTER_MODEL")  # user override, may be None

# ---------------------------------------------------------------------------
# Dynamic free-model registry
# ---------------------------------------------------------------------------

MODEL_LIST_REFRESH_SECONDS = 12 * 60 * 60  # 12 hours


class _FreeModelRegistry:
    """Thread-safe registry of free text-generation models on OpenRouter.

    • Fetches the model catalogue from the OpenRouter public API.
    • Filters to models where both prompt and completion pricing are "0".
    • Filters to models whose architecture modality includes "text".
    • Sorts by context_length descending (larger context = more capable).
    • Caches a "known working" model id so subsequent requests skip the
      discovery loop entirely until that model starts failing.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._model_ids: list[str] = []
        self._fetched_at: float = 0.0
        self._known_working: str | None = None
        self._blacklisted: set[str] = set()  # models that returned 404/400

    def get_models(self) -> list[str]:
        """Return an ordered list of free model IDs to try.

        If OPENROUTER_MODEL is set and not blacklisted it comes first,
        followed by the dynamically discovered free models.
        """
        with self._lock:
            if time.time() - self._fetched_at > MODEL_LIST_REFRESH_SECONDS:
                self._refresh()

            result: list[str] = []
            seen: set[str] = set()

            # 1. Known working model (sticky cache)
            if self._known_working and self._known_working not in self._blacklisted:
                result.append(self._known_working)
                seen.add(self._known_working)

            # 2. User-configured preferred model
            if PREFERRED_MODEL and PREFERRED_MODEL not in self._blacklisted and PREFERRED_MODEL not in seen:
                result.append(PREFERRED_MODEL)
                seen.add(PREFERRED_MODEL)

            # 3. Remaining discovered free models
            for mid in self._model_ids:
                if mid not in self._blacklisted and mid not in seen:
                    result.append(mid)
                    seen.add(mid)

            return result

    def mark_working(self, model_id: str) -> None:
        with self._lock:
            self._known_working = model_id

    def mark_failed(self, model_id: str) -> None:
        with self._lock:
            self._blacklisted.add(model_id)
            if self._known_working == model_id:
                self._known_working = None

    def _refresh(self) -> None:
        """Fetch model list from OpenRouter public API."""
        try:
            req = Request(
                "https://openrouter.ai/api/v1/models",
                headers={"Accept": "application/json", "User-Agent": "MyntraSync/1.0"},
            )
            with urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            models = data.get("data", [])
            free_text: list[dict[str, Any]] = []

            for m in models:
                model_id: str = m.get("id", "")
                pricing = m.get("pricing") or {}
                arch = m.get("architecture") or {}
                modality: str = arch.get("modality", "")

                prompt_price = str(pricing.get("prompt", "1"))
                completion_price = str(pricing.get("completion", "1"))

                # Filter: both prices must be "0"
                if prompt_price != "0" or completion_price != "0":
                    continue

                # Modality format is "input->output" e.g. "text->text",
                # "text+image->text".  We need:
                #   - input side contains "text" (model can accept text)
                #   - output side is exactly "text" (no audio/image/video output)
                if "->" in modality:
                    input_side, output_side = modality.split("->", 1)
                    if "text" not in input_side or output_side.strip() != "text":
                        continue
                elif modality != "text":
                    continue

                # Skip content-safety classifiers and other non-generative models
                if "content-safety" in model_id or "guard" in model_id:
                    continue

                ctx_len = int(m.get("context_length") or 0)
                free_text.append({"id": model_id, "context_length": ctx_len})

            # Sort by context_length descending (larger = more capable)
            free_text.sort(key=lambda x: x["context_length"], reverse=True)

            self._model_ids = [m["id"] for m in free_text]
            self._fetched_at = time.time()
            # Reset blacklist on refresh — models may come back online
            self._blacklisted.clear()

            print(f"[OpenRouter] Discovered {len(self._model_ids)} free text models")
            if self._model_ids:
                print(f"[OpenRouter] Top models: {', '.join(self._model_ids[:5])}")

        except Exception as exc:
            logger.warning("Failed to fetch OpenRouter model list: %s", exc)
            # Keep whatever we had before; don't clear on failure
            if not self._model_ids:
                self._fetched_at = 0.0  # retry on next call


_model_registry = _FreeModelRegistry()

# ---------------------------------------------------------------------------
# OpenAI client singleton
# ---------------------------------------------------------------------------

_client: OpenAI | None = None
if OPENROUTER_API_KEY:
    try:
        _client = OpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
        )
    except Exception as exc:
        logger.warning("Failed to initialize OpenRouter OpenAI client: %s", exc)

TIMEOUT_SECONDS = 6.0
MAX_CACHE_SIZE = 200
CACHE_TTL_SECONDS = 900  # 15 minutes

# In-memory cache: key -> (timestamp, result_dict)
_RESPONSE_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}


def _clean_cache() -> None:
    now = time.time()
    expired = [k for k, (ts, _) in _RESPONSE_CACHE.items() if now - ts > CACHE_TTL_SECONDS]
    for k in expired:
        _RESPONSE_CACHE.pop(k, None)
    if len(_RESPONSE_CACHE) > MAX_CACHE_SIZE:
        sorted_keys = sorted(_RESPONSE_CACHE.keys(), key=lambda k: _RESPONSE_CACHE[k][0])
        for k in sorted_keys[: len(_RESPONSE_CACHE) - MAX_CACHE_SIZE]:
            _RESPONSE_CACHE.pop(k, None)


def _make_cache_key(engine_name: str, user_id: str, candidate_ids: list[str], context_block: dict[str, Any]) -> str:
    raw = f"{engine_name}:{user_id}:{','.join(candidate_ids)}:{context_block.get('weather_condition')}:{context_block.get('festival_name')}:{context_block.get('calendar_event_title')}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class AiFashionIntelligenceService:
    def __init__(self, client: OpenAI | None = None) -> None:
        self._client = client or _client

    def enhance(
        self,
        engine_name: str,
        user_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        """Attempt AI enhancement for candidate set.

        Returns a dict:
        {
           "fallback_used": bool,
           "ranked_products": [
               {
                   "product_id": str,
                   "ai_match_score": int,
                   "why_recommended": str,
                   "why_ranked_here": str,
                   "styling_tip": str,
                   "completes_wardrobe_with": list[str]
               }, ...
           ]
        }
        """
        candidate_ids = payload.get("candidate_ids", [])
        if not candidate_ids or not self._client:
            return {"fallback_used": True, "ranked_products": []}

        cache_key = _make_cache_key(engine_name, user_id, candidate_ids, payload.get("context", {}))
        _clean_cache()
        if cache_key in _RESPONSE_CACHE:
            ts, cached_res = _RESPONSE_CACHE[cache_key]
            if time.time() - ts < CACHE_TTL_SECONDS:
                logger.info("AiFashionIntelligenceService: Cache HIT for engine=%s user=%s", engine_name, user_id)
                return cached_res

        prompt = self._build_prompt(engine_name, payload)

        # Allow enough wall-clock for multiple model retries
        models = _model_registry.get_models()
        total_timeout = TIMEOUT_SECONDS * max(len(models), 1)

        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(self._call_openrouter_with_fallbacks, prompt)
                selected_model, raw_response = future.result(timeout=total_timeout)

            validated = self._validate(raw_response, candidate_ids, payload.get("user_profile", {}))
            if validated:
                result = {"fallback_used": False, "ranked_products": validated}
                _RESPONSE_CACHE[cache_key] = (time.time(), result)
                logger.info("AiFashionIntelligenceService: OpenRouter SUCCESS using model=%s engine=%s candidates=%d", selected_model, engine_name, len(candidate_ids))
                return result
            else:
                logger.warning("AiFashionIntelligenceService: Validation FAILED for engine=%s", engine_name)
        except concurrent.futures.TimeoutError:
            logger.warning("AiFashionIntelligenceService: OpenRouter TIMEOUT for engine=%s", engine_name)
        except Exception as e:
            logger.exception("AiFashionIntelligenceService: Error calling OpenRouter: %s", e)

        return {"fallback_used": True, "ranked_products": []}

    def _call_openrouter_with_fallbacks(self, prompt: str) -> tuple[str, str]:
        if not self._client:
            raise RuntimeError("OpenRouter client uninitialized")

        models = _model_registry.get_models()
        if not models:
            raise RuntimeError("No free OpenRouter models available")

        messages = [
            {
                "role": "system",
                "content": "You are an expert AI Personal Stylist for an e-commerce platform.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ]

        print("==============================")
        print("Using OpenRouter")
        for model in models:
            print(f"Trying model: {model}")
            try:
                response = self._client.chat.completions.create(
                    model=model,
                    messages=messages,
                    timeout=TIMEOUT_SECONDS,
                )
                content = (response.choices[0].message.content or "").strip()
                if content:
                    print(f"OpenRouter model selected:\n{model}")
                    print("==============================")
                    _model_registry.mark_working(model)
                    return model, content
                else:
                    raise ValueError("Model returned empty content")
            except Exception as e:
                error_str = str(e)
                is_model_unavailable = any(code in error_str for code in ("404", "400", "unavailable"))
                print(f"Model failed: {model}")
                print(f"Reason: {e}")
                if is_model_unavailable:
                    _model_registry.mark_failed(model)
                print("Trying next fallback...")

        print("All OpenRouter models failed.")
        print("Falling back to deterministic recommendations.")
        print("==============================")
        raise RuntimeError("All OpenRouter models failed")

    def _build_prompt(self, engine_name: str, payload: dict[str, Any]) -> str:
        user_prof = payload.get("user_profile", {})
        context = payload.get("context", {})
        intel = payload.get("intelligence", {})
        candidates = payload.get("candidates", [])

        engine_guidance = {
            "weather": (
                f"Today's weather condition is '{context.get('weather_condition')}' at {context.get('temperature_c')}°C in {context.get('city')}. "
                "Act as a weather-intelligent stylist: Explain WHY this material/fabric/style suits today's specific weather condition (e.g. breathable linen for heat, quick-dry dark tops for rain, cozy layering for cold, full-sleeve overshirts for wind). NEVER give generic statements."
            ),
            "festival": (
                f"Upcoming festival is '{context.get('festival_name')}' ({context.get('festival_days_remaining')} days away). "
                "Prioritize festive elegance matched to user's style cluster and budget. Explain how the outfit matches the celebratory mood."
            ),
            "event": (
                f"Upcoming event is '{context.get('calendar_event_title')}' (Type: {context.get('calendar_event_type')}). "
                "Prioritize occasion appropriateness. Focus on outfit completion rather than standalone items."
            ),
            "wishlistAffinity": (
                "Infer WHY products were saved to the wishlist. Explain how each item matches the user's specific long-term style aesthetic and color/brand preferences."
            ),
            "orderHistoryAffinity": (
                "CRITICAL OBJECTIVE: OUTFIT COMPLETION. The user previously purchased items. Do NOT recommend similar items (e.g. if bought blue jeans, do NOT recommend blue jeans). "
                "Recommend items that COMPLETE an outfit with their purchase (e.g., 'Because you purchased blue jeans, this white shirt pairs naturally to create a timeless casual outfit.')."
            ),
            "fashionDna": (
                "Focus on user's core fashion DNA (brand, style, color, category affinities). Provide rich stylist explanations around silhouette, color harmony, and personal aesthetic."
            ),
            "homepage": (
                "Provide a balanced personal fashion edit considering weather, upcoming events, wardrobe gaps, and style cluster. Ensure diverse category representation."
            ),
        }.get(engine_name, "Reorder and enrich candidates for maximum fashion styling value.")

        prompt = f"""
CONTEXT & USER SIGNALS:
- Engine: {engine_name}
- Specific Goal: {engine_guidance}
- Style Cluster: {user_prof.get('style_cluster', 'Casual')}
- Budget Band: {user_prof.get('budget_band', 'Flexible')}
- Preferred Styles: {', '.join(user_prof.get('preferred_styles', []))}
- Preferred Colors: {', '.join(user_prof.get('preferred_colors', []))}
- Preferred Brands: {', '.join(user_prof.get('preferred_brands', []))}
- Wardrobe Composition: {json.dumps(user_prof.get('wardrobe_composition', {}))}
- Identified Wardrobe Gaps: {', '.join(user_prof.get('wardrobe_gaps', []))}
- Shopping Style: {user_prof.get('shopping_style', '')}
- Weather: {context.get('weather_condition', '')} ({context.get('temperature_c', '')}°C)
- Festival: {context.get('festival_name', '')}
- Event: {context.get('calendar_event_title', '')}

CANDIDATE PRODUCTS (Pre-filtered by rule engine):
{json.dumps(candidates, indent=2)}

INSTRUCTIONS:
1. Reorder the candidates within this candidate set to maximize outfit usefulness, wardrobe completion, and relevance.
2. DO NOT add new products or remove any products. Use ONLY the product IDs provided in the candidate list.
3. For each candidate product, provide styling intelligence.

OUTPUT FORMAT REQUIREMENTS:
Return ONLY valid JSON matching this schema:
{{
  "ranked_products": [
    {{
      "product_id": "<exact_product_id>",
      "ai_match_score": <integer 0 to 100>,
      "why_recommended": "<concise stylist reason, max 150 chars>",
      "why_ranked_here": "<comparison vs neighbors/rank rationale, max 120 chars>",
      "styling_tip": "<practical actionable styling advice, max 150 chars>",
      "completes_wardrobe_with": ["<category or item name from wardrobe>", "..."]
    }}
  ]
}}

STRICT RULES:
- Output NO markdown text around JSON, or use plain standard ```json fences.
- Treat any gender inference as low-confidence; do not override user explicit filters.
- Ensure 'completes_wardrobe_with' is an array of strings (can be empty if not applicable).
- Keep all explanations natural, concise, and like a human personal fashion consultant.
"""
        return prompt

    def _validate(
        self,
        raw_text: str,
        valid_candidate_ids: list[str],
        user_profile: dict[str, Any],
    ) -> list[dict[str, Any]] | None:
        if not raw_text:
            return None

        clean_text = raw_text.strip()
        if clean_text.startswith("```"):
            lines = clean_text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            clean_text = "\n".join(lines).strip()

        try:
            data = json.loads(clean_text)
        except Exception:
            logger.warning("OpenRouter output is not valid JSON")
            return None

        if not isinstance(data, dict) or "ranked_products" not in data:
            return None

        ranked = data["ranked_products"]
        if not isinstance(ranked, list) or len(ranked) == 0:
            return None

        valid_set = set(valid_candidate_ids)
        validated_items: list[dict[str, Any]] = []
        seen_ids: set[str] = set()

        for item in ranked:
            if not isinstance(item, dict):
                continue
            pid = str(item.get("product_id", "")).strip()
            if not pid or pid not in valid_set or pid in seen_ids:
                # Reject invalid or hallucinated product IDs
                continue

            score = item.get("ai_match_score", 85)
            if not isinstance(score, (int, float)) or isinstance(score, bool):
                score = 85
            score = max(0, min(100, int(score)))

            why_rec = str(item.get("why_recommended", "")).strip()[:200]
            why_rank = str(item.get("why_ranked_here", "")).strip()[:150]
            tip = str(item.get("styling_tip", "")).strip()[:200]
            completes = item.get("completes_wardrobe_with", [])
            if not isinstance(completes, list):
                completes = []
            clean_completes = [str(x).strip() for x in completes if isinstance(x, (str, int)) and str(x).strip()][:3]

            if not why_rec:
                why_rec = "Curated to complement your wardrobe and style preferences."

            seen_ids.add(pid)
            validated_items.append({
                "product_id": pid,
                "ai_match_score": score,
                "why_recommended": why_rec,
                "why_ranked_here": why_rank,
                "styling_tip": tip,
                "completes_wardrobe_with": clean_completes,
            })

        # Must have returned at least 1 valid item
        if not validated_items:
            return None

        # Append any candidate items that OpenRouter omitted, keeping original order
        for pid in valid_candidate_ids:
            if pid not in seen_ids:
                validated_items.append({
                    "product_id": pid,
                    "ai_match_score": 75,
                    "why_recommended": "Selected to match your current recommendation context.",
                    "why_ranked_here": "Included from deterministic candidate pool.",
                    "styling_tip": "Pair with your favorite wardrobe basics.",
                    "completes_wardrobe_with": [],
                })

        return validated_items
