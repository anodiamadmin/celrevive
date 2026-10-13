import uuid
from unittest.mock import AsyncMock, Mock

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.models.customer_session import CustomerSession
from app.schemas.customer_session import PrimarySkinConcern


def test_legacy_recommendation_route_is_not_registered():
    response = TestClient(app).get(f"/api/v1/recommendation/{uuid.uuid4()}")

    assert response.status_code == 404


def test_analysis_status_returns_not_found_for_unknown_session():
    session_id = uuid.uuid4()
    result = Mock()
    result.scalar_one_or_none.return_value = None
    mock_db = Mock()
    mock_db.execute = AsyncMock(return_value=result)

    async def fake_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db
    try:
        response = TestClient(app).get(
            f"/api/v1/sessions/{session_id}/analysis"
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json()["detail"] == "Customer session not found."


def test_completed_analysis_returns_structured_primary_concerns(monkeypatch):
    session_id = uuid.uuid4()
    result = Mock()
    result.scalar_one_or_none.return_value = CustomerSession(
        session_id=session_id,
        session_status="RECOMMENDATION_GENERATED",
    )
    mock_db = Mock()
    mock_db.execute = AsyncMock(return_value=result)
    monkeypatch.setattr(
        "app.api.v1.routes.sessions.get_detected_image_concerns_by_session",
        AsyncMock(
            return_value=[
                PrimarySkinConcern(
                    concern_name="Acne",
                    confidence_score=0.87,
                )
            ]
        ),
    )

    async def fake_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db
    try:
        response = TestClient(app).get(
            f"/api/v1/sessions/{session_id}/analysis"
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "session_id": str(session_id),
        "analysis_status": "completed",
        "message": "Image analysis completed.",
        "primary_concerns": [
            {"concern_name": "Acne", "confidence_score": 0.87}
        ],
    }
