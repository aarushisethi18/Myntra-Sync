from fastapi import APIRouter

router = APIRouter()

@router.get("/context")
def get_context():
    return {
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