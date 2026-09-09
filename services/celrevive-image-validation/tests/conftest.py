import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.api.v1.routes import image_validation as image_validation_route
from app.main import app


@pytest.fixture
def client(monkeypatch) -> TestClient:
    """FastAPI test client with persistence mocked for API contract tests."""
    from uuid import uuid4

    def fake_persist_accepted_image(**kwargs):
        from app.services.image_persistence import PersistedImage

        return PersistedImage(
            session_id=kwargs.get("session_id") or uuid4(),
            image_id=uuid4(),
            storage_uri="file:///test/skin-image.jpg",
            sha256="0" * 64,
        )

    monkeypatch.setattr(
        image_validation_route,
        "persist_accepted_image",
        fake_persist_accepted_image,
    )
    return TestClient(app)


@pytest.fixture
def sharp_image() -> np.ndarray:
    """
    Create a deterministic, high-contrast image.

    Expected:
    - 600x600 resolution
    - normal brightness
    - high sharpness
    """

    image = np.zeros((600, 600, 3), dtype=np.uint8)

    square_size = 30

    for y in range(0, 600, square_size):
        for x in range(0, 600, square_size):
            if ((x // square_size) + (y // square_size)) % 2:
                image[
                    y:y + square_size,
                    x:x + square_size
                ] = 255

    return image


@pytest.fixture
def blurry_image(sharp_image: np.ndarray) -> np.ndarray:
    """
    Create a deliberately blurry version of the sharp image.
    """

    return cv2.GaussianBlur(
        sharp_image,
        (15, 15),
        0,
    )


@pytest.fixture
def dark_image(sharp_image: np.ndarray) -> np.ndarray:
    """
    Create a deliberately underexposed image.
    """

    return (sharp_image * 0.2).astype(np.uint8)


@pytest.fixture
def overexposed_image() -> np.ndarray:
    """
    Create a deliberately overexposed image.
    """

    image = np.zeros((600, 600, 3), dtype=np.uint8)

    square_size = 30

    for y in range(0, 600, square_size):
        for x in range(0, 600, square_size):
            if ((x // square_size) + (y // square_size)) % 2:
                image[
                    y:y + square_size,
                    x:x + square_size
                ] = 255
            else:
                image[
                    y:y + square_size,
                    x:x + square_size
                ] = 230

    return image


@pytest.fixture
def low_resolution_image() -> np.ndarray:
    """
    Create an image smaller than the configured 480x480 minimum.
    """

    return np.full(
        (320, 320, 3),
        127,
        dtype=np.uint8,
    )


@pytest.fixture
def image_to_bytes():
    """
    Convert an OpenCV image into JPEG bytes.
    """

    def _convert(image: np.ndarray) -> bytes:
        success, encoded = cv2.imencode(
            ".jpg",
            image,
        )

        assert success

        return encoded.tobytes()

    return _convert