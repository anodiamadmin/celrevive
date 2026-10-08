import uuid
from unittest.mock import AsyncMock, Mock

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.models.customer_session import CustomerSession


def test_create_customer_session_persists_session():
    mock_db = Mock()
    mock_db.commit = AsyncMock()
    added_sessions = []
    mock_db.add.side_effect = added_sessions.append

    async def fake_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db
    try:
        response = TestClient(app).post(
            "/api/v1/sessions",
            json={
                "shopify_customer_id": "SHOPIFY-CUST-10001",
                "shopify_customer_email": "customer@example.com",
                "shopify_cart_id": "cart_10001",
                "shopify_checkout_id": "checkout_10001",
                "consent_given": True,
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    assert response.json()["session_status"] == "STARTED"
    session = added_sessions[0]
    assert isinstance(session, CustomerSession)
    assert session.shopify_customer_id == "SHOPIFY-CUST-10001"
    assert session.shopify_customer_email == "customer@example.com"
    assert session.shopify_cart_id == "cart_10001"
    assert session.shopify_checkout_id == "checkout_10001"
    assert session.consent_given is True
    assert session.notes == "Customer session initiated with consent."
    mock_db.commit.assert_awaited_once()


def test_create_customer_session_rejects_missing_consent():
    mock_db = Mock()
    mock_db.commit = AsyncMock()

    async def fake_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db
    try:
        response = TestClient(app).post(
            "/api/v1/sessions",
            json={"consent_given": False},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 400
    assert response.json()["detail"] == "Consent is required to create a customer session."
    mock_db.add.assert_not_called()
    mock_db.commit.assert_not_awaited()


def test_create_customer_session_requires_consent_field():
    response = TestClient(app).post("/api/v1/sessions", json={})

    assert response.status_code == 422


def test_analysis_status_is_pending_until_worker_finishes():
    session_id = uuid.uuid4()
    mock_db = Mock()
    result = Mock()
    result.scalar_one_or_none.return_value = CustomerSession(
        session_id=session_id,
        session_status="IMAGE_RECEIVED",
    )
    mock_db.execute = AsyncMock(return_value=result)

    async def fake_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db
    try:
        response = TestClient(app).get(f"/api/v1/sessions/{session_id}/analysis")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "session_id": str(session_id),
        "analysis_status": "pending",
        "message": "Image analysis is in progress.",
        "primary_concerns": [],
    }


def test_analysis_status_returns_results_when_complete(monkeypatch):
    session_id = uuid.uuid4()
    mock_db = Mock()
    result = Mock()
    result.scalar_one_or_none.return_value = CustomerSession(
        session_id=session_id,
        session_status="RECOMMENDATION_GENERATED",
    )
    mock_db.execute = AsyncMock(return_value=result)
    monkeypatch.setattr(
        "app.api.v1.routes.sessions.get_detected_image_concerns_by_session",
        AsyncMock(return_value=["Acne"]),
    )

    async def fake_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db
    try:
        response = TestClient(app).get(f"/api/v1/sessions/{session_id}/analysis")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["analysis_status"] == "completed"
    assert response.json()["primary_concerns"] == ["Acne"]


def test_analysis_status_returns_failed_when_worker_fails():
    session_id = uuid.uuid4()
    mock_db = Mock()
    result = Mock()
    result.scalar_one_or_none.return_value = CustomerSession(
        session_id=session_id,
        session_status="ERROR",
    )
    mock_db.execute = AsyncMock(return_value=result)

    async def fake_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db
    try:
        response = TestClient(app).get(f"/api/v1/sessions/{session_id}/analysis")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["analysis_status"] == "failed"
    assert response.json()["primary_concerns"] == []
