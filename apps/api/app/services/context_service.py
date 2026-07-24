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
from app.services.recommendation_config import BIRTHDAY_TAGS, EVENT_TAGS, FESTIVAL_TAGS, RECOMMENDATION_WEIGHTS, WEATHER_TAGS
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
        """Score real catalog products for one insight signal or the homepage.

        Signal scores are ratios of matching metadata dimensions (0..1).  The
        composite is their configured weighted sum. Ties resolve by
        order-history score, catalog rating, then product id, making a fixed
        input deterministic. Empty context returns only genuinely personalised
        products; a no-signal caller therefore receives an empty recommendation
        edit instead of unrelated fill items.
        """
        if self._engine is None:
            return []
        signals = self._signals(user_id, context or {})
        ranked_by_id: dict[str, dict[str, Any]] = {}
        for product in products:
            scores, reasons = self._scores(product, signals)
            selected = self._scope_score(scope, scores)
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
        return sorted(
            ranked,
            key=lambda item: (
                -float(item["recommendationScore"]),
                -float(item["signalScores"]["orderHistoryAffinity"]),
                -float(item.get("rating") or 0),
                str(item["id"]),
            ),
        )

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
        return {"weather": self._weather_key(weather, (context.get("weather") or {}).get("temperature")), "festival": festival, "event": event_name, "gender": gender, "dna": dna, "wishlist": wishlist, "history": history}

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
            if temperature <= 16:
                return "cold"
            if temperature >= 28:
                return "hot"
        if "sun" in condition or "clear" in condition or "hot" in condition:
            return "hot"
        if "cold" in condition or "snow" in condition or "fog" in condition:
            return "cold"
        return ""

    def _scores(self, product: dict[str, Any], signals: dict[str, Any]) -> tuple[dict[str, float], dict[str, str]]:
        searchable = self._metadata(product)
        weather = self._match(searchable, WEATHER_TAGS.get(signals["weather"], ()))
        festival = self._match(searchable, FESTIVAL_TAGS.get(signals["festival"], ()))
        event_key = next((key for key in EVENT_TAGS if key in signals["event"]), "")
        event_tags = EVENT_TAGS.get(event_key, ())
        neutral_birthday = "birthday" in signals["event"] and not signals["gender"]
        if "birthday" in signals["event"]:
            event_tags = BIRTHDAY_TAGS.get(signals["gender"], BIRTHDAY_TAGS["neutral"])
        event = self._match(searchable, event_tags)
        scores = {
            "weather": weather,
            "festival": festival,
            "event": event,
            "fashionDna": self._affinity(product, signals["dna"], ("brandAffinity", "categoryAffinity", "colorAffinity", "styleAffinity")),
            "wishlistAffinity": self._preference(product, signals["wishlist"], "favorite"),
            "orderHistoryAffinity": self._preference(product, signals["history"], "favorite"),
        }
        reasons = {
            "weather": f"Recommended because today's weather is {signals['weather']}." if weather else "",
            "festival": f"Recommended for {signals['festival']}." if festival else "",
            "event": "Recommended for your upcoming birthday using the neutral edit." if neutral_birthday and event else (f"Recommended for your upcoming {event_key}." if event else ""),
            "fashionDna": "Recommended because it matches your Fashion DNA." if scores["fashionDna"] else "",
            "wishlistAffinity": "Recommended because it matches your wishlist preferences." if scores["wishlistAffinity"] else "",
            "orderHistoryAffinity": "Recommended because it matches your order history." if scores["orderHistoryAffinity"] else "",
        }
        return scores, reasons

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
