import uuid


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


def test_invalid_file_type_is_rejected_without_intake(
    client,
    sharp_image,
    image_to_bytes,
):
    response = post_image(client, image_to_bytes(sharp_image), "application/pdf")

    assert response.status_code == 200
    assert response.json()["valid"] is False
    assert "invalid_file_type" in response.json()["reasons"]


def test_unreadable_image_is_rejected(client):
    response = post_image(client, b"not an image")

    assert response.status_code == 200
    assert response.json()["valid"] is False
    assert "unreadable_image" in response.json()["reasons"]


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


def test_missing_session_id_is_validation_error(client, sharp_image, image_to_bytes):
    response = client.post(
        "/api/v1/image-validation",
        files={"image": ("skin.jpg", image_to_bytes(sharp_image), "image/jpeg")},
    )

    assert response.status_code == 422
