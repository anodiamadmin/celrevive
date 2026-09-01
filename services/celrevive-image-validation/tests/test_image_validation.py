"""
Tests for work item 1.1/1.4: invalid file type, unreadable image, low
resolution, blurry image, low-light image, valid image.

Synthetic images are generated with PIL/NumPy so the suite has no external
fixture files to manage.
"""

import io

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageFilter

from app.core.config import Settings
from app.main import app
from app.schemas.image_validation import RejectionReason
from app.services.image_validation import run_full_validation

client = TestClient(app)


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def _png_bytes(array: np.ndarray) -> bytes:
    buffer = io.BytesIO()
    Image.fromarray(array).save(buffer, format="PNG")
    return buffer.getvalue()


def make_sharp_image(size: int = 600) -> bytes:
    """High-frequency checkerboard pattern -> high Laplacian variance."""
    arr = np.indices((size, size)).sum(axis=0) % 2 * 255
    arr = np.stack([arr] * 3, axis=-1).astype(np.uint8)
    return _png_bytes(arr)


def make_blurry_image(size: int = 600) -> bytes:
    arr = np.indices((size, size)).sum(axis=0) % 2 * 255
    arr = np.stack([arr] * 3, axis=-1).astype(np.uint8)
    blurred = Image.fromarray(arr).filter(ImageFilter.GaussianBlur(radius=15))
    buffer = io.BytesIO()
    blurred.save(buffer, format="PNG")
    return buffer.getvalue()


def make_low_light_image(size: int = 600) -> bytes:
    arr = np.full((size, size, 3), 10, dtype=np.uint8)  # near-black
    return _png_bytes(arr)


def make_low_resolution_image(size: int = 50) -> bytes:
    arr = np.indices((size, size)).sum(axis=0) % 2 * 255
    arr = np.stack([arr] * 3, axis=-1).astype(np.uint8)
    return _png_bytes(arr)


@pytest.fixture
def settings() -> Settings:
    return Settings(
        MIN_WIDTH_PX=480,
        MIN_HEIGHT_PX=480,
        BLUR_THRESHOLD=100.0,
        LOW_LIGHT_THRESHOLD=40.0,
        OVEREXPOSED_THRESHOLD=235.0,
    )


# --------------------------------------------------------------------------
# Service-level (unit) tests
# --------------------------------------------------------------------------

def test_valid_image_passes(settings):
    result = run_full_validation(make_sharp_image(), "image/png", settings)
    assert result.is_valid is True
    assert result.reasons == []


def test_invalid_file_type_rejected(settings):
    result = run_full_validation(make_sharp_image(), "application/pdf", settings)
    assert result.is_valid is False
    assert RejectionReason.INVALID_FILE_TYPE in result.reasons


def test_unreadable_image_rejected(settings):
    garbage = b"not a real image file"
    result = run_full_validation(garbage, "image/png", settings)
    assert result.is_valid is False
    assert RejectionReason.UNREADABLE_IMAGE in result.reasons


def test_low_resolution_image_rejected(settings):
    result = run_full_validation(make_low_resolution_image(), "image/png", settings)
    assert result.is_valid is False
    assert RejectionReason.LOW_RESOLUTION in result.reasons


def test_blurry_image_rejected(settings):
    result = run_full_validation(make_blurry_image(), "image/png", settings)
    assert result.is_valid is False
    assert RejectionReason.BLURRY in result.reasons


def test_low_light_image_rejected(settings):
    result = run_full_validation(make_low_light_image(), "image/png", settings)
    assert result.is_valid is False
    assert RejectionReason.LOW_LIGHT in result.reasons


def test_combination_of_failures_reports_all_reasons(settings):
    # Small AND blurry AND dark all at once
    arr = np.full((50, 50, 3), 5, dtype=np.uint8)
    blurred = Image.fromarray(arr).filter(ImageFilter.GaussianBlur(radius=5))
    buffer = io.BytesIO()
    blurred.save(buffer, format="PNG")
    result = run_full_validation(buffer.getvalue(), "image/png", settings)
    assert result.is_valid is False
    assert RejectionReason.LOW_RESOLUTION in result.reasons
    assert RejectionReason.LOW_LIGHT in result.reasons


# --------------------------------------------------------------------------
# Endpoint-level tests (User Story 1 acceptance criteria)
# --------------------------------------------------------------------------

def test_endpoint_accepts_valid_image():
    response = client.post(
        "/api/v1/image-validation",
        files={"image": ("test.png", make_sharp_image(), "image/png")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is True


def test_endpoint_rejects_blurry_image_with_retake_message():
    response = client.post(
        "/api/v1/image-validation",
        files={"image": ("test.png", make_blurry_image(), "image/png")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is False
    assert "take another image" in body["message"].lower()


def test_endpoint_rejects_empty_upload():
    response = client.post(
        "/api/v1/image-validation",
        files={"image": ("empty.png", b"", "image/png")},
    )
    assert response.status_code == 400
