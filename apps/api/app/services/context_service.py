"""Live context aggregation and deterministic recommendation rules."""

from __future__ import annotations

import logging
from datetime import date, datetime, time
from typing import Any, Callable, Iterable

from sqlalchemy import Engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import get_engine
from app.schemas.context import ContextSnapshot, Recommendation, UpcomingEvent
from app.services.decision_engine import Decision, DecisionEngine
from app.services.explainability_engine import ExplainabilityEngine
from app.services.fashion_dna_service import FashionDnaService
from app.services.order_history_service import OrderHistoryService
from app.services.recommendation_config import (
    BIRTHDAY_TAGS,
    EVENT_TAGS,
    FESTIVAL_TAGS,
    OUTFIT_COMPLETION_MAP,
    RECOMMENDATION_WEIGHTS,
    WEATHER_CATEGORY_PREFERENCES,
    WEATHER_TAGS,
)
from app.services.wishlist_intelligence_service import WishlistIntelligenceService
from app.repositories.order_history_repository import OrderHistoryRepository
from app.repositories.wishlist_repository import WishlistRepository

logger = logging.getLogger(__name__)


class ContextService:
    def __init__(self, engine: Engine | None = None, decision_engine: DecisionEngine | None = None, explainability_engine: ExplainabilityEngine | None = None) -> None:
        self._engine = engine if engine is not None else get_engine()
        self._decision_engine = decision_engine or DecisionEngine()
        self._explainability_engine = explainability_engine or ExplainabilityEngine()

    def get_snapshot(self) -> ContextSnapshot:
        if self._engine is None:
            return ContextSnapshot()
        try:
            with self._engine.connect() as conn:
                user = self._one(conn, "SELECT * FROM users ORDER BY created_at ASC LIMIT 1")
                if not user:
                    return ContextSnapshot()
                params = {"user_id": user["id"]}
                weather = self._one(conn, "SELECT * FROM weather_context WHERE city = :city ORDER BY forecast_date DESC NULLS LAST LIMIT 1", {"city": user.get("city")})
                events = self._all(conn, "SELECT * FROM calendar_events WHERE user_id = :user_id AND event_date >= CURRENT_DATE ORDER BY event_date", params)
                wardrobe = self._all(conn, "SELECT * FROM wardrobe WHERE user_id = :user_id ORDER BY created_at DESC", params)
                products = self._all(conn, "SELECT * FROM products ORDER BY name")
                notifications = self._all(conn, "SELECT * FROM notifications WHERE user_id = :user_id ORDER BY created_at DESC", params)
        except SQLAlchemyError:
            logger.exception("Failed to load context snapshot")
            return ContextSnapshot()

        decision = self._decision_engine.decide(
            user=user,
            upcoming_events=events,
            weather=weather,
            wardrobe=wardrobe,
            budget=(user.get("budget_min"), user.get("budget_max")),
            preferred_style=user.get("preferred_style"),
        )
        recommendations = self._recommend(products, user, decision)
        recommendations = [
            recommendation.model_copy(update={"explanation": self._explainability_engine.generate(recommendation, decision, user, weather, events, wardrobe)})
            for recommendation in recommendations
        ]
        return ContextSnapshot(
            user={"id": str(user["id"]), "name": user.get("full_name") or "", "email": user.get("email")},
            weather={} if not weather else {"city": weather.get("city"), "temperature": weather.get("temperature"), "condition": weather.get("condition")},
            upcomingEvents=[self._event(row) for row in events],
            wardrobe=[self._json(row) for row in wardrobe],
            recommendations=recommendations,
            notifications=[self._json(row) for row in notifications],
        )

    @staticmethod
    def _one(conn: Any, query: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
        row = conn.execute(text(query), params or {}).mappings().first()
        return dict(row) if row else None

    @staticmethod
    def _all(conn: Any, query: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        return [dict(row) for row in conn.execute(text(query), params or {}).mappings().all()]

    @staticmethod
    def _event(row: dict[str, Any]) -> UpcomingEvent:
        event_date = row.get("event_date")
        if isinstance(event_date, datetime):
            event_date = event_date.date()
        start = end = ""
        if isinstance(event_date, date):
            start = datetime.combine(event_date, time.min).isoformat()
            end = datetime.combine(event_date, time.max).isoformat()
        return UpcomingEvent(id=str(row["id"]), title=row.get("title"), startTime=start, endTime=end)

    @staticmethod
    def _json(row: dict[str, Any]) -> dict[str, Any]:
        return {
            key: value.isoformat() if isinstance(value, (date, datetime)) else str(value) if key == "id" else value
            for key, value in row.items()
        }

    def _recommend(self, products: list[dict[str, Any]], user: dict[str, Any], decision: Decision) -> list[Recommendation]:
        """Select in-budget products that fulfil the decision engine's need."""
        rules = {
            "Formal Outfit": lambda category, style, name: "formal" in style or category in {"footwear", "shirt", "pants"},
            "Ethnic Outfit": lambda category, style, name: "ethnic" in style or category in {"ethnic", "kurta", "saree"},
            "Travel Essentials": lambda category, style, name: "travel" in name or "outdoor" in style or category in {"bag", "footwear", "jacket"},
            "Rain Protection": lambda category, style, name: "waterproof" in name or category in {"footwear", "shoes"},
            "Summer Wear": lambda category, style, name: any(word in f"{name} {style}" for word in ("cotton", "linen", "breathable")),
            "Wardrobe Essentials": lambda category, style, name: True,
        }
        matches_need = rules[decision.predictedNeed]
        selected: list[dict[str, Any]] = []
        for product in products:
            price, minimum, maximum = product.get("price"), user.get("budget_min"), user.get("budget_max")
            if price is not None and ((minimum is not None and price < minimum) or (maximum is not None and price > maximum)):
                continue
            category = str(product.get("category") or "").lower()
            style = str(product.get("style") or "").lower()
            name = str(product.get("name") or "").lower()
            if matches_need(category, style, name):
                selected.append(product)
        return [
            Recommendation(
                id=str(product["id"]),
                title=str(product.get("name") or "Product recommendation"),
                reason=f"Supports your {decision.predictedNeed.lower()}.",
                confidence=decision.confidence,
                priority=decision.priority,
                reasons=decision.reasons,
            )
            for product in sorted(selected, key=lambda item: str(item.get("name") or ""))[:5]
        ]

    def recommend_products(
        self,
        user_id: str,
        products: list[dict[str, Any]],
        context: dict[str, Any] | None,
        scope: str,
    ) -> list[dict[str, Any]]:
        if self._engine is None:
            return []
        signals = self._signals(user_id, context or {})
        ranked_by_id: dict[str, dict[str, Any]] = {}
        for product in products:
            scores, reasons = self._scores(product, signals)
            selected = self._scope_score(scope, scores)
            
            # Reduce global shoe priority unless scope is explicit footwear or specifically required
            category = str(product.get("category") or "").lower()
            is_footwear = category in {"footwear", "shoes", "sneakers", "heels", "boots", "sandals", "juttis"}
            if is_footwear and scope not in {"footwear", "shoes"}:
                selected *= 0.65
                
            if selected <= 0:
                continue
            candidate = {
                **product,
                "recommendationScore": round(selected, 6),
                "recommendationReasons": reasons_for_scope(scope, reasons),
                "signalScores": scores,
            }
            product_id = str(product["id"])
            if product_id not in ranked_by_id or candidate["recommendationScore"] > ranked_by_id[product_id]["recommendationScore"]:
                ranked_by_id[product_id] = candidate
        ranked = list(ranked_by_id.values())
        if not ranked and scope == "homepage" and not any(signals[signal] for signal in ("weather", "festival", "event")):
            return self._cold_start(products)
            
        sorted_candidates = sorted(
            ranked,
            key=lambda item: (
                -float(item["recommendationScore"]),
                -float(item["signalScores"]["orderHistoryAffinity"]),
                -float(item.get("rating") or 0),
                str(item["id"]),
            ),
        )
        
        # Apply Category Diversity (MMR-style penalty) to prevent repeating identical categories consecutively
        ranked_list = self._apply_category_diversity(sorted_candidates)

        # AI Fashion Intelligence enhancement layer — Top 10 performance cap
        try:
            from app.services.ai_context_builder import AiContextBuilder
            from app.services.ai_fashion_intelligence_service import AiFashionIntelligenceService

            top_candidates = ranked_list[:10]
            ai_payload = AiContextBuilder(self._engine).build(scope, user_id, top_candidates, context)
            ai_result = AiFashionIntelligenceService().enhance(scope, user_id, ai_payload)

            if not ai_result.get("fallback_used") and ai_result.get("ranked_products"):
                cand_map = {str(p["id"]): p for p in top_candidates}

                reordered: list[dict[str, Any]] = []
                for ai_item in ai_result["ranked_products"]:
                    pid = ai_item["product_id"]
                    if pid in cand_map:
                        base = cand_map.pop(pid)
                        reordered.append({
                            **base,
                            "aiMatchScore": ai_item.get("ai_match_score"),
                            "whyRecommended": ai_item.get("why_recommended"),
                            "whyRankedHere": ai_item.get("why_ranked_here"),
                            "stylingTip": ai_item.get("styling_tip"),
                            "completesWardrobeWith": ai_item.get("completes_wardrobe_with", []),
                            "fallbackUsed": False,
                        })

                # Append any candidate that wasn't in AI result
                for pid, base in cand_map.items():
                    reordered.append({**base, "fallbackUsed": False})

                # Slice result strictly to Top 10
                return reordered[:10]
        except Exception:
            logger.exception("AI Fashion Intelligence enhancement failed; falling back to deterministic order")

        return [{**p, "fallbackUsed": True} for p in ranked_list[:10]]

    @staticmethod
    def _apply_category_diversity(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Reorder products using category diversity so top slots feature top->bottom->layer->accessory combinations."""
        if len(candidates) <= 2:
            return candidates
        diversified: list[dict[str, Any]] = []
        pool = list(candidates)
        recent_categories: list[str] = []
        
        while pool:
            best_idx = 0
            best_penalty = 1.0
            for idx, candidate in enumerate(pool):
                cat = str(candidate.get("category") or "").lower()
                penalty = 1.0
                if recent_categories and cat == recent_categories[-1]:
                    penalty = 0.5  # Penalize back-to-back same category
                elif recent_categories.count(cat) >= 2:
                    penalty = 0.7  # Penalize category dominating top items
                
                adjusted_score = float(candidate["recommendationScore"]) * penalty
                if idx == 0 or adjusted_score > (float(pool[best_idx]["recommendationScore"]) * best_penalty):
                    best_idx = idx
                    best_penalty = penalty

            selected = pool.pop(best_idx)
            diversified.append(selected)
            recent_categories.append(str(selected.get("category") or "").lower())
            if len(recent_categories) > 3:
                recent_categories.pop(0)

        return diversified

    def _signals(self, user_id: str, context: dict[str, Any]) -> dict[str, Any]:
        dna = self._signal_or_empty("Fashion DNA", lambda: FashionDnaService().get(self._engine, user_id), {})
        wishlist = self._signal_or_empty("wishlist", lambda: WishlistIntelligenceService(WishlistRepository(self._engine)).intelligence(user_id), {"status": "empty"})
        history = self._signal_or_empty("order history", lambda: OrderHistoryService(OrderHistoryRepository(self._engine)).intelligence(user_id, None), {"status": "insufficient_data"})
        weather = str((context.get("weather") or {}).get("condition") or "").casefold()
        festival = str((context.get("festival") or {}).get("name") or "").casefold()
        event = next(iter((context.get("calendar") or {}).get("events") or []), {})
        event_name = f"{event.get('title') or ''} {event.get('type') or ''}".casefold()
        gender = str((context.get("user") or {}).get("gender") or "").casefold()
        if "birthday" in event_name and not gender:
            logger.info("Birthday recommendation used neutral gender fallback for user %s", user_id)
        return {
            "weather": self._weather_key(weather, (context.get("weather") or {}).get("temperature")),
            "festival": festival,
            "event": event_name,
            "gender": gender,
            "dna": dna,
            "wishlist": wishlist,
            "history": history,
            "raw_weather_condition": weather,
            "raw_weather_temp": (context.get("weather") or {}).get("temperature"),
        }

    @staticmethod
    def _signal_or_empty(name: str, loader: Callable[[], dict[str, Any]], empty: dict[str, Any]) -> dict[str, Any]:
        try:
            return loader()
        except Exception:
            logger.exception("Recommendation %s signal failed", name)
            return empty

    @staticmethod
    def _weather_key(condition: str, temperature: object) -> str:
        if "rain" in condition or "drizzle" in condition or "storm" in condition:
            return "rain"
        if "wind" in condition:
            return "windy"
        if isinstance(temperature, (int, float)):
            if temperature <= 18:
                return "cold"
            if temperature >= 26:
                return "hot"
        if "sun" in condition or "clear" in condition or "hot" in condition:
            return "hot"
        if "cold" in condition or "snow" in condition or "fog" in condition:
            return "cold"
        return "hot"  # Default to sunny/warm if unspecified

    def _scores(self, product: dict[str, Any], signals: dict[str, Any]) -> tuple[dict[str, float], dict[str, str]]:
        searchable = self._metadata(product)
        weather_key = signals["weather"]
        
        # Weather Intelligence Scoring: check metadata tags & fabric/category suitability
        weather = self._match(searchable, WEATHER_TAGS.get(weather_key, ()))
        pref_rules = WEATHER_CATEGORY_PREFERENCES.get(weather_key, {})
        if pref_rules:
            pref_match = any(term in searchable for term in pref_rules.get("preferred", ()))
            avoid_match = any(term in searchable for term in pref_rules.get("avoid", ()))
            if pref_match:
                weather = min(1.0, weather + 0.35)
            if avoid_match:
                weather = max(0.0, weather - 0.5)

        festival = self._match(searchable, FESTIVAL_TAGS.get(signals["festival"], ()))
        event_key = next((key for key in EVENT_TAGS if key in signals["event"]), "")
        event_tags = EVENT_TAGS.get(event_key, ())
        neutral_birthday = "birthday" in signals["event"] and not signals["gender"]
        if "birthday" in signals["event"]:
            event_tags = BIRTHDAY_TAGS.get(signals["gender"], BIRTHDAY_TAGS["neutral"])
        event = self._match(searchable, event_tags)
        
        # Order History Intelligence: Outfit Completion Scoring
        history_score, history_reason = self._outfit_completion_score(product, signals["history"])

        scores = {
            "weather": weather,
            "festival": festival,
            "event": event,
            "fashionDna": self._affinity(product, signals["dna"], ("brandAffinity", "categoryAffinity", "colorAffinity", "styleAffinity")),
            "wishlistAffinity": self._preference(product, signals["wishlist"], "favorite"),
            "orderHistoryAffinity": history_score,
        }
        
        raw_cond = signals.get("raw_weather_condition") or weather_key
        temp_str = f" ({signals.get('raw_weather_temp')}°C)" if signals.get('raw_weather_temp') is not None else ""
        
        weather_explanations = {
            "hot": f"Recommended because breathable light-colored {product.get('category', 'wear')} keeps you cool during today's sunny {raw_cond} weather{temp_str}.",
            "cloudy": f"Recommended because lightweight full sleeves and dark navy/grey shades are ideal for today's cloudy {raw_cond} weather.",
            "cold": f"Ideal cozy layer for today's cooler {raw_cond} weather{temp_str}.",
            "rain": f"Quick-dry, dark-toned choice ideal for today's wet {raw_cond} conditions.",
            "windy": f"Lightweight full-sleeve layer perfect for today's breezy {raw_cond} weather.",
        }

        reasons = {
            "weather": weather_explanations.get(weather_key, f"Recommended for today's {raw_cond} weather.") if weather > 0 else "",
            "festival": f"Selected for {signals['festival']} celebratory styling." if festival > 0 else "",
            "event": "Recommended for your upcoming birthday edit." if neutral_birthday and event > 0 else (f"Curated for your upcoming {event_key}." if event > 0 else ""),
            "fashionDna": f"Matches your preferred {product.get('brand', '')} brand and {product.get('style', '')} style." if scores["fashionDna"] > 0 else "",
            "wishlistAffinity": f"Aligns with your saved wishlist preferences in {product.get('category', 'category')}." if scores["wishlistAffinity"] > 0 else "",
            "orderHistoryAffinity": history_reason if history_score > 0 else "",
        }
        return scores, reasons

    @staticmethod
    def _outfit_completion_score(product: dict[str, Any], history: dict[str, Any]) -> tuple[float, str]:
        """Score product based on whether it completes an outfit for previously purchased items instead of repeating them."""
        if history.get("status") != "ok":
            return 0.0, ""
        fav_categories = [c.get("category", "").lower() for c in history.get("favoriteCategories", [])]
        prod_category = str(product.get("category") or "").lower()
        prod_name = str(product.get("name") or product.get("title") or "").lower()
        
        for fav in fav_categories:
            # If user bought jeans/pants, do NOT heavily score another pair of jeans/pants
            if fav in prod_category or fav in prod_name:
                return 0.1, f"Complements your {fav} collection."
            
            # Check outfit completion mapping
            for key, complements in OUTFIT_COMPLETION_MAP.items():
                if key in fav:
                    for comp in complements:
                        if comp in prod_category or comp in prod_name or comp in str(product.get("style") or "").lower():
                            return 0.95, f"Pairs with previously purchased {fav} to complete your outfit."
                            
        return 0.3, "Matches brands and styles you've purchased before."

    @staticmethod
    def _metadata(product: dict[str, Any]) -> tuple[str, ...]:
        values: list[str] = [str(product.get(key) or "") for key in ("name", "title", "category", "brand", "color", "style", "subcategory")]
        for key in ("occasions", "fabrics", "weather_suitability", "weatherSuitability", "festival_suitability", "festivalSuitability", "trend_tags", "trendTags"):
            values.extend(str(value) for value in product.get(key) or [])
        return tuple(value.casefold() for value in values if value)

    @staticmethod
    def _match(values: Iterable[str], tags: tuple[str, ...]) -> float:
        return 0.0 if not tags else sum(any(tag in value for value in values) for tag in tags) / len(tags)

    @staticmethod
    def _affinity(product: dict[str, Any], dna: dict[str, Any], keys: tuple[str, ...]) -> float:
        values = {str(product.get(field) or "").casefold() for field in ("brand", "category", "color", "style")}
        scores = [float(item.get("score") or 0) for key in keys for item in dna.get(key, []) if str(item.get("value") or "").casefold() in values]
        return min(max(scores, default=0.0), 1.0)

    @staticmethod
    def _preference(product: dict[str, Any], intelligence: dict[str, Any], prefix: str) -> float:
        if intelligence.get("status") != "ok":
            return 0.0
        matches: list[float] = []
        for field, response_key, value_key in (("brand", f"{prefix}Brands", "brand"), ("category", f"{prefix}Categories", "category")):
            matches.extend(float(item.get("score") or 0) for item in intelligence.get(response_key, []) if str(item.get(value_key) or "").casefold() == str(product.get(field) or "").casefold())
        return min(max(matches, default=0.0), 1.0)

    @staticmethod
    def _scope_score(scope: str, scores: dict[str, float]) -> float:
        if scope in scores:
            return scores[scope]
        return sum(RECOMMENDATION_WEIGHTS[key] * scores[key] for key in RECOMMENDATION_WEIGHTS)

    @staticmethod
    def _cold_start(products: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Use existing live-catalog badges/rating, never placeholder products."""
        featured = [product for product in products if str(product.get("badge") or "").casefold() in {"bestseller", "trending", "top rated"}]
        candidates = featured or [product for product in products if float(product.get("rating") or 0) > 0]
        return [{**product, "recommendationScore": 0.0, "recommendationReasons": ["Popular in the live catalog while we learn your preferences."], "signalScores": {key: 0.0 for key in RECOMMENDATION_WEIGHTS}} for product in sorted(candidates, key=lambda product: (-float(product.get("rating") or 0), str(product["id"])))[:12]]


def reasons_for_scope(scope: str, reasons: dict[str, str]) -> list[str]:
    """Keep Insights single-signal while homepage can expose combined reasons."""
    if scope in reasons:
        return [reasons[scope]] if reasons[scope] else []
    return [reason for reason in reasons.values() if reason]
