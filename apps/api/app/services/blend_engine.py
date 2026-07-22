"""Deterministic, context-only fashion Blend generation."""
from __future__ import annotations

from collections import Counter
from typing import Any

from sqlalchemy import text


class BlendEngine:
    """Builds ephemeral Blend intelligence; no generated result is persisted."""
    def __init__(self, engine: Any) -> None:
        self.engine = engine

    def generate(self, session_id: str, first_id: str, second_id: str, controls: dict[str, str] | None = None) -> dict[str, Any]:
        if self.engine is None:
            raise ValueError("Blend requires a configured Context data source.")
        a, b = self._profile(first_id), self._profile(second_id)
        metrics = self._metrics(a, b)
        score = round(sum(item["value"] * item["weight"] for item in metrics) / sum(item["weight"] for item in metrics))
        reasons = self._reasons(a, b, metrics)
        shared_styles = self._shared(a["styles"], b["styles"]) or self._top(a["styles"] + b["styles"], 3)
        shared_colors = self._shared(a["colors"], b["colors"]) or self._top(a["colors"] + b["colors"], 5)
        occasion = (controls or {}).get("occasion") or self._occasion(a, b)
        weather = self._weather(a, b)
        return {
            "sessionId": session_id, "score": score,
            "people": [self._person(a), self._person(b)],
            "breakdown": [{"name": x["name"], "value": round(x["value"]), "color": x["color"]} for x in metrics],
            "reasons": reasons,
            "styleDna": [self._dna(a), self._dna(b)],
            "sharedDna": [{"name": name.title(), "confidence": min(98, 65 + score // 3)} for name in shared_styles[:3]],
            "palette": [{"name": color.title(), "hex": self._color_hex(color)} for color in shared_colors[:5]],
            "moodboard": {"keywords": shared_styles[:3] + [occasion.lower()], "visualStyle": " · ".join(x.title() for x in shared_styles[:2]) or "Personal style"},
            "outfits": self._outfits(a, b, occasion, weather, score),
            "insights": self._insights(a, b, metrics),
        }

    def _profile(self, user_id: str) -> dict[str, Any]:
        with self.engine.connect() as conn:
            user = conn.execute(text("SELECT id, full_name, preferred_style, preferred_colors, favorite_brands, budget_min, budget_max FROM users WHERE id = :id"), {"id": user_id}).mappings().first()
            if not user:
                raise ValueError("A Blend member no longer has an available context.")
            wardrobe = conn.execute(text("SELECT product_name, category, color, brand FROM wardrobe WHERE user_id = :id"), {"id": user_id}).mappings().all()
            wishlist = conn.execute(text("SELECT p.name, p.category, p.color, p.brand, p.style, p.price, p.image_url FROM wishlist w JOIN products p ON p.id = w.product_id WHERE w.user_id = :id"), {"id": user_id}).mappings().all()
            orders = conn.execute(text("SELECT p.name, p.category, p.color, p.brand, p.style, p.price FROM orders o JOIN products p ON p.id = o.product_id WHERE o.user_id = :id"), {"id": user_id}).mappings().all()
            weather = conn.execute(text("SELECT wc.temperature, wc.condition FROM weather_context wc JOIN users u ON u.city = wc.city WHERE u.id = :id ORDER BY wc.forecast_date DESC LIMIT 1"), {"id": user_id}).mappings().first()
        items = list(wardrobe) + list(wishlist) + list(orders)
        values = lambda key: [str(row[key]).lower() for row in items if row.get(key)]
        return {"id": str(user["id"]), "name": user["full_name"] or "Style lover", "styles": self._values(user.get("preferred_style")) + values("style"), "colors": self._values(user.get("preferred_colors")) + values("color"), "brands": self._values(user.get("favorite_brands")) + values("brand"), "categories": values("category"), "budget": ((user["budget_min"] or 0) + (user["budget_max"] or 0)) / 2 or self._average(items, "price"), "products": list(wishlist), "weather": dict(weather or {})}

    @staticmethod
    def _values(value: Any) -> list[str]:
        if isinstance(value, list): return [str(x).lower() for x in value if x]
        return [x.strip().lower() for x in str(value or "").split(",") if x.strip()]
    @staticmethod
    def _average(rows: list[Any], key: str) -> float:
        values = [float(row[key]) for row in rows if row.get(key) is not None]
        return sum(values) / len(values) if values else 0
    @staticmethod
    def _top(items: list[str], limit: int) -> list[str]: return [x for x, _ in Counter(items).most_common(limit)]
    @staticmethod
    def _shared(a: list[str], b: list[str]) -> list[str]: return [x for x in Counter(a + b) if x in set(a) and x in set(b)]
    @staticmethod
    def _overlap(a: list[str], b: list[str]) -> float:
        union = set(a) | set(b); return 50 if not union else 100 * len(set(a) & set(b)) / len(union)
    def _metrics(self, a: dict, b: dict) -> list[dict]:
        budget = 50 if not a["budget"] or not b["budget"] else max(0, 100 - abs(a["budget"] - b["budget"]) / max(a["budget"], b["budget"]) * 100)
        pairs = [("Colour harmony", self._overlap(a["colors"], b["colors"]), "#ff5c8a", 1.2), ("Style similarity", self._overlap(a["styles"], b["styles"]), "#b18cff", 1.3), ("Brand affinity", self._overlap(a["brands"], b["brands"]), "#ffab6b", 1), ("Budget match", budget, "#77d6ba", .8), ("Category overlap", self._overlap(a["categories"], b["categories"]), "#5f9cff", 1)]
        return [{"name": n, "value": max(20, v), "color": c, "weight": w} for n, v, c, w in pairs]
    def _person(self, p: dict) -> dict: return {"name": p["name"], "initials": "".join(x[0] for x in p["name"].split()[:2]).upper(), "labels": self._dna(p), "image": ""}
    def _dna(self, p: dict) -> list[dict]: return [{"name": x.title(), "confidence": min(97, 65 + count * 8)} for x, count in Counter(p["styles"] or p["categories"]).most_common(3)] or [{"name": "Emerging style", "confidence": 55}]
    def _reasons(self, a: dict, b: dict, metrics: list[dict]) -> list[str]:
        reasons=[]
        if self._shared(a["colors"], b["colors"]): reasons.append(f"You both gravitate toward {self._shared(a['colors'], b['colors'])[0]} tones.")
        if self._shared(a["brands"], b["brands"]): reasons.append(f"{self._shared(a['brands'], b['brands'])[0].title()} appears in both of your fashion signals.")
        best=max(metrics, key=lambda x:x["value"]); reasons.append(f"{best['name']} is your strongest connection at {round(best['value'])}%.")
        return reasons
    @staticmethod
    def _occasion(a: dict, b: dict) -> str: return "Weekend plans"
    @staticmethod
    def _weather(a: dict, b: dict) -> str:
        w=a["weather"] or b["weather"]; return f"{w.get('condition', 'Everyday')} · {w.get('temperature', 'All-weather')}°C" if w else "All-weather"
    def _outfits(self, a: dict, b: dict, occasion: str, weather: str, score: int) -> list[dict]:
        catalog = (a["products"] + b["products"])[:6]
        if not catalog: return []
        outfits=[]
        for index, product in enumerate(catalog[:3]):
            price=int(product.get("price") or 0); styles=self._top(a["styles"]+b["styles"], 2)
            outfits.append({"id": str(product.get("name", index)).replace(" ", "-").lower(), "title": product.get("name") or "Shared edit", "occasion": occasion, "weather": weather, "price": f"₹{price:,} together", "match": max(50, score-index*3), "yours": 50 + (index % 2)*8, "image": product.get("image_url") or "", "pieces": [x.title() for x in styles] + [str(product.get("category") or "Everyday piece").title()], "explanation": f"This brings together your shared {', '.join(styles) or 'fashion'} signals for {occasion.lower()}.", "reason": f"Selected from a saved product and matched to both members' context."})
        return outfits
    def _insights(self, a: dict, b: dict, metrics: list[dict]) -> list[dict]:
        return [{"value": f"{round(x['value'])}%", "label": x["name"].lower()} for x in sorted(metrics, key=lambda x:x["value"], reverse=True)[:3]]
    @staticmethod
    def _color_hex(color: str) -> str:
        return {"black":"#24242d", "white":"#f6f2ed", "pink":"#e9b6ba", "brown":"#563e37", "blue":"#8fa9d6", "beige":"#d8c5a7", "green":"#738174"}.get(color.lower(), "#b18cff")
