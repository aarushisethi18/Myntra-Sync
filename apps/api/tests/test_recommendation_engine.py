from app.services.context_service import ContextService


def signals(**overrides):
    base = {
        "weather": "",
        "festival": "",
        "event": "",
        "gender": "",
        "dna": {},
        "wishlist": {"status": "empty"},
        "history": {"status": "insufficient_data"},
    }
    return base | overrides


def product(identifier: str, **overrides):
    base = {
        "id": identifier,
        "title": "Cotton Kurta",
        "category": "Ethnic Wear",
        "brand": "Anouk",
        "color": "White",
        "style": "Festive",
        "rating": 4.5,
        "occasions": ["Wedding"],
        "fabrics": ["Cotton"],
        "weatherSuitability": ["Rain"],
        "festivalSuitability": ["Diwali"],
        "trendTags": [],
    }
    return base | overrides


def scorer():
    return ContextService(engine=object())


def test_weather_festival_and_event_scores_are_independent():
    service = scorer()
    item = product("one")
    weather_scores, _ = service._scores(item, signals(weather="rain"))
    festival_scores, _ = service._scores(item, signals(festival="diwali"))
    event_scores, _ = service._scores(item, signals(event="wedding"))

    assert weather_scores["weather"] > 0 and weather_scores["festival"] == 0 and weather_scores["event"] == 0
    assert festival_scores["festival"] > 0 and festival_scores["weather"] == 0 and festival_scores["event"] == 0
    assert event_scores["event"] > 0 and event_scores["weather"] == 0 and event_scores["festival"] == 0


def test_combined_ranking_deduplicates_and_has_deterministic_ties(monkeypatch):
    service = scorer()
    active_signals = signals(weather="rain", festival="diwali")
    monkeypatch.setattr(service, "_signals", lambda _user_id, _context: active_signals)
    items = [product("same"), product("same"), product("z"), product("a")]

    ranked = service.recommend_products("user", items, {}, "homepage")

    assert [item["id"] for item in ranked] == ["a", "same", "z"]
    assert ranked[0]["recommendationScore"] > 0


def test_cold_start_uses_only_live_catalog_candidates(monkeypatch):
    service = scorer()
    monkeypatch.setattr(service, "_signals", lambda _user_id, _context: signals())

    ranked = service.recommend_products("user", [product("rated", badge="Top Rated"), product("unrated", rating=0)], {}, "homepage")

    assert [item["id"] for item in ranked] == ["rated"]
    assert ranked[0]["recommendationReasons"] == ["Popular in the live catalog while we learn your preferences."]
