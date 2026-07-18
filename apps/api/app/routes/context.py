from fastapi import APIRouter

from app.services.wardrobe_intelligence import WardrobeIntelligence

router = APIRouter()

@router.get("/context")
def get_context():
    context = {
        "user": {
            "id": "1",
            "name": "Aarushi",
            "email": "aarushi@example.com"
        },
        "weather": {
            "city": "Delhi",
            "temperature": 33,
            "condition": "Sunny"
        },
        "upcomingEvents": [
            {
                "id": "1",
                "title": "Friend's Wedding",
                "startTime": "2026-07-20T18:00",
                "endTime": "2026-07-20T23:00"
            }
        ],
        "wardrobe": [],
        "recommendations": [
            {
                "id": "1",
                "title": "Pastel Pink Kurta Set",
                "reason": "Perfect for the weather and event",
                "confidence": 0.96
            }
        ],
        "notifications": []
    }
    # The decision output remains authoritative; the graph only supplies
    # additional deterministic explanation for the existing selection.
    recommendation = context["recommendations"][0]
    event = context["upcomingEvents"][0] if context["upcomingEvents"] else None
    graph_reasons = WardrobeIntelligence().recommendation_reasons(
        context["wardrobe"], event, recommendation
    )
    if graph_reasons:
        recommendation["reason"] = "; ".join([recommendation["reason"], *graph_reasons])
    return context
