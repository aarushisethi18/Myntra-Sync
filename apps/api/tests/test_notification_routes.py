from fastapi.testclient import TestClient

from app.dependencies.auth import get_current_user
from app.main import app
from app.services.auth_service import AuthenticatedUser


def test_get_notifications_response_shape_when_store_is_unavailable(monkeypatch):
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id="00000000-0000-0000-0000-000000000001", email="test@example.com")
    client = TestClient(app)
    response = client.get("/notifications")
    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json() == {"count": 0, "total": 0, "notifications": []}
