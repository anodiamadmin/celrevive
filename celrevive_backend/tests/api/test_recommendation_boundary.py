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


def test_recommendation_endpoint_returns_formatted_recommendation(monkeypatch):
    session_id = uuid.uuid4()
    result = Mock()
    result.scalar_one_or_none.return_value = CustomerSession(
        session_id=session_id,
        session_status="RECOMMENDATION_GENERATED",
    )
    mock_db = Mock()
    mock_db.execute = AsyncMock(return_value=result)
    output = {
        "session_id": str(session_id),
        "skin_concerns": [
            {
                "skin_concern_id": "SC0001",
                "skin_concern_name": "Dry Skin",
                "image_skin_concern_exists": False,
                "questionnaire_skin_concern_exists": True,
                "skin_concern_exists": True,
                "if_skin_concern_true_why": "Questionnaire: Dryness was self-reported.",
            }
        ],
        "recommended_base": {
            "base_id": 1,
            "base_name": "Light Lotion",
            "if_base_selected_why": "Matches the selected texture preference.",
        },
        "recommended_actives": [
            {
                "active_id": 7,
                "active_name": "Active A",
                "if_active_selected_why": "Addresses the detected concern.",
            }
        ],
        "overall_explanation": "The active addresses the detected concern.",
        "safety_notice": "",
    }
    monkeypatch.setattr(
        "app.api.v1.routes.sessions.get_latest_recommendation_output",
        AsyncMock(return_value=output),
    )

    async def fake_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db
    try:
        response = TestClient(app).get(
            f"/api/v1/sessions/{session_id}/recommendation"
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == output
