import uuid
import pytest
from unittest.mock import AsyncMock, Mock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.models.customer_session import CustomerSession
from app.core.database import get_db

@pytest.fixture
def api_client() -> TestClient:
    return TestClient(app)

def test_recommendation_session_not_found(api_client):
    """Unknown session_id should return 404."""
    session_id = uuid.uuid4()

    async def fake_get_db():
        mock_db = AsyncMock()
        mock_exec = Mock() # <-- CHANGED TO Mock()
        mock_exec.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_exec
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db
    try:
        response = api_client.get(f"/api/v1/recommendation/{session_id}")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()

def test_recommendation_clean_skin_response(api_client):
    """When no concerns are detected, return 'Your skin looks perfect!' and empty list."""
    session_id = uuid.uuid4()
    mock_session = CustomerSession(session_id=session_id)

    async def fake_get_db():
        mock_db = AsyncMock()
        session_result = Mock() # <-- CHANGED TO Mock()
        session_result.scalar_one_or_none.return_value = mock_session
        mock_db.execute.return_value = session_result
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db
    try:
        with patch("app.api.v1.routes.recommendation.get_detected_image_concerns_by_session", AsyncMock(return_value=[])):
            response = api_client.get(
                f"/api/v1/recommendation/{session_id}?user_full_name=Jane%20Doe"
            )
            assert response.status_code == 200
            payload = response.json()
            assert payload["user_full_name"] == "Jane Doe"
            assert payload["message"] == "Your skin looks perfect!"
            assert payload["primary_concerns"] == []
    finally:
        app.dependency_overrides.clear()

def test_recommendation_with_detected_concerns(api_client):
    """When concerns exist, populate primary_concerns list."""
    session_id = uuid.uuid4()
    mock_session = CustomerSession(session_id=session_id)

    async def fake_get_db():
        mock_db = AsyncMock()
        session_result = Mock() # <-- CHANGED TO Mock()
        session_result.scalar_one_or_none.return_value = mock_session
        mock_db.execute.return_value = session_result
        yield mock_db

    concerns = ["Acne", "Redness"]

    app.dependency_overrides[get_db] = fake_get_db
    try:
        with patch("app.api.v1.routes.recommendation.get_detected_image_concerns_by_session", AsyncMock(return_value=concerns)):
            response = api_client.get(
                f"/api/v1/recommendation/{session_id}?user_full_name=John%20Smith"
            )
            assert response.status_code == 200
            payload = response.json()
            assert payload["user_full_name"] == "John Smith"
            assert payload["primary_concerns"] == ["Acne", "Redness"]
    finally:
        app.dependency_overrides.clear()