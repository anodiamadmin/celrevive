import uuid
from unittest.mock import AsyncMock, Mock

import pytest

from app.core.database import get_db
from app.main import app


def test_health_check(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def post_image(client, image_bytes, content_type="image/jpeg"):
    return client.post(
        "/api/v1/image-validation",
        files={"image": ("skin.jpg", image_bytes, content_type)},
        data={"session_id": str(uuid.uuid4())},
    )


@pytest.fixture
def validation_session_db():
    mock_db = Mock()
    result = Mock()
    result.scalar_one_or_none.return_value = uuid.uuid4()
    mock_db.execute = AsyncMock(return_value=result)
    mock_db.commit = AsyncMock()

    async def fake_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = fake_get_db
    yield mock_db
    app.dependency_overrides.clear()


def test_invalid_file_type_is_rejected_without_intake(
    client,
    sharp_image,
    image_to_bytes,
    validation_session_db,
):
    response = post_image(client, image_to_bytes(sharp_image), "application/pdf")

    assert response.status_code == 200
    assert response.json()["valid"] is False
    assert response.json()["failure_type"] == "validation_failed"
    assert "invalid_file_type" in response.json()["reasons"]
    assert validation_session_db.execute.await_args.args[0].compile().params[
        "session_status"
    ] == "VALIDATION_FAILED"
    validation_session_db.commit.assert_awaited_once()


def test_unreadable_image_is_rejected(client, validation_session_db):
    response = post_image(client, b"not an image")

    assert response.status_code == 200
    assert response.json()["valid"] is False
    assert response.json()["failure_type"] == "validation_failed"
    assert "unreadable_image" in response.json()["reasons"]


def test_validation_failure_for_unknown_session_returns_not_found(
    client,
    sharp_image,
    image_to_bytes,
    validation_session_db,
):
    validation_session_db.execute.return_value.scalar_one_or_none.return_value = None

    response = post_image(client, image_to_bytes(sharp_image), "application/pdf")

    assert response.status_code == 404
    assert response.json()["detail"] == "Customer session does not exist"


def test_valid_image_returns_questionnaire_route(
    client,
    sharp_image,
    image_to_bytes,
    monkeypatch,
):
    expected_image_id = uuid.uuid4()
    captured = {}

    async def fake_accept_validated_image(db, background_tasks, **kwargs):
        captured.update(kwargs)
        return expected_image_id

    monkeypatch.setattr(
        "app.api.v1.routes.image.accept_validated_image",
        fake_accept_validated_image,
    )

    response = post_image(client, image_to_bytes(sharp_image))

    assert response.status_code == 200
    assert response.json() == {
        "valid": True,
        "message": "Image passed all quality checks.",
        "reasons": [],
        "image_id": str(expected_image_id),
        "next_step": "questionnaire",
    }
    assert captured["image_bytes"]
    assert captured["mime_type"] == "image/jpeg"
    assert captured["image_width"] == 600
    assert captured["image_height"] == 600


def test_legacy_analysis_upload_path_returns_accepted_without_waiting(
    client,
    sharp_image,
    image_to_bytes,
    monkeypatch,
):
    expected_image_id = uuid.uuid4()

    async def fake_accept_validated_image(db, background_tasks, **kwargs):
        return expected_image_id

    monkeypatch.setattr(
        "app.api.v1.routes.image.accept_validated_image",
        fake_accept_validated_image,
    )

    response = client.post(
        "/api/v1/image-analysis",
        files={"image": ("skin.jpg", image_to_bytes(sharp_image), "image/jpeg")},
        data={"session_id": str(uuid.uuid4())},
    )

    assert response.status_code == 202
    assert response.json()["image_id"] == str(expected_image_id)
    assert response.json()["next_step"] == "questionnaire"


def test_missing_session_id_is_validation_error(client, sharp_image, image_to_bytes):
    response = client.post(
        "/api/v1/image-validation",
        files={"image": ("skin.jpg", image_to_bytes(sharp_image), "image/jpeg")},
    )

    assert response.status_code == 422


def test_legacy_image_analysis_requires_session_id(client, sharp_image, image_to_bytes):
    response = client.post(
        "/api/v1/image-analysis",
        files={"image": ("skin.jpg", image_to_bytes(sharp_image), "image/jpeg")},
    )

    assert response.status_code == 422
