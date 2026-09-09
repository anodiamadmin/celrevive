# ============================================================================
# API tests for POST /api/v1/image-validation
# ============================================================================


def test_health_check(client):
    """
    Verify that the FastAPI application is running correctly.
    """

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_valid_image_is_accepted(
    client,
    sharp_image,
    image_to_bytes,
):
    """
    A valid image should pass all image-quality checks.
    """

    image_bytes = image_to_bytes(sharp_image)

    response = client.post(
        "/api/v1/image-validation",
        files={
            "image": (
                "valid.jpg",
                image_bytes,
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["valid"] is True
    assert data["reasons"] == []
    assert data["message"] == "Image passed all quality checks."
    assert data["session_id"] is not None
    assert data["image_id"] is not None


def test_existing_session_id_is_forwarded_to_persistence(
    client,
    sharp_image,
    image_to_bytes,
    monkeypatch,
):
    from uuid import uuid4

    session_id = uuid4()
    captured = {}

    from app.api.v1.routes import image_validation as image_validation_route

    def fake_persist(**kwargs):
        from app.services.image_persistence import PersistedImage

        captured.update(kwargs)
        return PersistedImage(
            session_id=session_id,
            image_id=uuid4(),
            storage_uri="file:///test/skin-image.jpg",
            sha256="0" * 64,
        )

    monkeypatch.setattr(image_validation_route, "persist_accepted_image", fake_persist)

    response = client.post(
        "/api/v1/image-validation",
        data={"session_id": str(session_id)},
        files={"image": ("valid.jpg", image_to_bytes(sharp_image), "image/jpeg")},
    )

    assert response.status_code == 200
    assert captured["session_id"] == session_id
    assert response.json()["session_id"] == str(session_id)


def test_invalid_file_type_is_rejected(
    client,
    sharp_image,
    image_to_bytes,
):
    """
    A file with an unsupported MIME type should be rejected.
    """

    image_bytes = image_to_bytes(sharp_image)

    response = client.post(
        "/api/v1/image-validation",
        files={
            "image": (
                "document.pdf",
                image_bytes,
                "application/pdf",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["valid"] is False
    assert "invalid_file_type" in data["reasons"]


def test_corrupted_image_is_rejected(client):
    """
    An uploaded file that cannot be decoded as an image
    should be rejected.
    """

    response = client.post(
        "/api/v1/image-validation",
        files={
            "image": (
                "corrupted.jpg",
                b"this is not actually an image",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["valid"] is False
    assert "unreadable_image" in data["reasons"]


def test_empty_file_returns_bad_request(client):
    """
    An empty upload is rejected by the API route itself
    before the image-validation service is called.
    """

    response = client.post(
        "/api/v1/image-validation",
        files={
            "image": (
                "empty.jpg",
                b"",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 400

    data = response.json()

    assert data["detail"] == "Empty file upload."


def test_low_resolution_image_is_rejected(
    client,
    low_resolution_image,
    image_to_bytes,
):
    """
    An image below the configured resolution threshold
    should be rejected.
    """

    image_bytes = image_to_bytes(low_resolution_image)

    response = client.post(
        "/api/v1/image-validation",
        files={
            "image": (
                "low-resolution.jpg",
                image_bytes,
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["valid"] is False
    assert "low_resolution" in data["reasons"]


def test_blurry_image_is_rejected(
    client,
    blurry_image,
    image_to_bytes,
):
    """
    An image below the configured sharpness threshold
    should be rejected.
    """

    image_bytes = image_to_bytes(blurry_image)

    response = client.post(
        "/api/v1/image-validation",
        files={
            "image": (
                "blurry.jpg",
                image_bytes,
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["valid"] is False
    assert "blurry" in data["reasons"]


def test_dark_image_is_rejected(
    client,
    dark_image,
    image_to_bytes,
):
    """
    An image below the configured brightness threshold
    should be rejected.
    """

    image_bytes = image_to_bytes(dark_image)

    response = client.post(
        "/api/v1/image-validation",
        files={
            "image": (
                "dark.jpg",
                image_bytes,
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["valid"] is False
    assert "low_light" in data["reasons"]


def test_overexposed_image_is_rejected(
    client,
    overexposed_image,
    image_to_bytes,
):
    """
    An image above the configured brightness threshold
    should be rejected.
    """

    image_bytes = image_to_bytes(overexposed_image)

    response = client.post(
        "/api/v1/image-validation",
        files={
            "image": (
                "overexposed.jpg",
                image_bytes,
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["valid"] is False
    assert "overexposed" in data["reasons"]


def test_invalid_image_does_not_persist_or_schedule_visual_ai(
    client,
    blurry_image,
    image_to_bytes,
    monkeypatch,
):
    from app.api.v1.routes import image_validation as image_validation_route

    persisted = False
    scheduled = False

    def fail_if_persisted(**_kwargs):
        nonlocal persisted
        persisted = True
        raise AssertionError("invalid image must not be persisted")

    def fail_if_scheduled(**_kwargs):
        nonlocal scheduled
        scheduled = True
        raise AssertionError("invalid image must not schedule Visual AI")

    monkeypatch.setattr(image_validation_route, "persist_accepted_image", fail_if_persisted)
    monkeypatch.setattr(image_validation_route, "trigger_visual_ai_analysis", fail_if_scheduled)

    response = client.post(
        "/api/v1/image-validation",
        files={"image": ("blurry.jpg", image_to_bytes(blurry_image), "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.json()["valid"] is False
    assert "blurry" in response.json()["reasons"]
    assert persisted is False
    assert scheduled is False


def test_valid_image_schedules_visual_ai_after_persistence(
    client,
    sharp_image,
    image_to_bytes,
    monkeypatch,
):
    from app.api.v1.routes import image_validation as image_validation_route

    captured = {}

    def fake_trigger(**kwargs):
        captured.update(kwargs)

    monkeypatch.setattr(
        image_validation_route,
        "trigger_visual_ai_analysis",
        fake_trigger,
    )

    response = client.post(
        "/api/v1/image-validation",
        files={"image": ("valid.jpg", image_to_bytes(sharp_image), "image/jpeg")},
    )

    assert response.status_code == 200
    assert captured["session_id"]
    assert captured["image_id"]
    assert captured["storage_uri"] == "file:///test/skin-image.jpg"
    assert captured["mime_type"] == "image/jpeg"


def test_response_contains_expected_fields(
    client,
    sharp_image,
    image_to_bytes,
):
    """
    Verify the public API response contract.

    The frontend should receive exactly the fields defined
    by ImageValidationResponse.
    """

    image_bytes = image_to_bytes(sharp_image)

    response = client.post(
        "/api/v1/image-validation",
        files={
            "image": (
                "valid.jpg",
                image_bytes,
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert "valid" in data
    assert "message" in data
    assert "reasons" in data

    assert isinstance(data["valid"], bool)
    assert isinstance(data["message"], str)
    assert isinstance(data["reasons"], list)