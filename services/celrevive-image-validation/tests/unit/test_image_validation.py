import numpy as np

from app.core.config import Settings
from app.schemas.image_validation import RejectionReason
from app.services.image_validation import (
    calculate_brightness,
    calculate_sharpness,
    decode_image,
    run_full_validation,
    validate_content_type,
    validate_file_size,
    validate_resolution,
)


# ============================================================================
# File type validation
# ============================================================================


def test_valid_jpeg_content_type():
    settings = Settings()

    assert validate_content_type(
        "image/jpeg",
        settings,
    ) is True


def test_valid_png_content_type():
    settings = Settings()

    assert validate_content_type(
        "image/png",
        settings,
    ) is True


def test_valid_webp_content_type():
    settings = Settings()

    assert validate_content_type(
        "image/webp",
        settings,
    ) is True


def test_invalid_content_type():
    settings = Settings()

    assert validate_content_type(
        "application/pdf",
        settings,
    ) is False


def test_missing_content_type():
    settings = Settings()

    assert validate_content_type(
        None,
        settings,
    ) is False


# ============================================================================
# File size validation
# ============================================================================


def test_valid_file_size():
    settings = Settings()

    assert validate_file_size(
        1024,
        settings,
    ) is True


def test_empty_file_is_rejected():
    settings = Settings()

    assert validate_file_size(
        0,
        settings,
    ) is False


def test_file_above_maximum_size_is_rejected():
    settings = Settings()

    file_size = settings.max_file_size_bytes + 1

    assert validate_file_size(
        file_size,
        settings,
    ) is False


def test_file_at_maximum_size_is_accepted():
    settings = Settings()

    assert validate_file_size(
        settings.max_file_size_bytes,
        settings,
    ) is True


# ============================================================================
# Image decoding
# ============================================================================


def test_valid_image_can_be_decoded(
    sharp_image,
    image_to_bytes,
):
    image_bytes = image_to_bytes(sharp_image)

    decoded = decode_image(image_bytes)

    assert decoded is not None
    assert isinstance(decoded, np.ndarray)


def test_corrupted_image_cannot_be_decoded():
    corrupted_bytes = b"this is not a valid image"

    decoded = decode_image(corrupted_bytes)

    assert decoded is None


def test_empty_image_cannot_be_decoded():
    decoded = decode_image(b"")

    assert decoded is None


# ============================================================================
# Resolution
# ============================================================================


def test_image_above_minimum_resolution_passes(
    sharp_image,
):
    settings = Settings()

    assert validate_resolution(
        sharp_image,
        settings,
    ) is True


def test_image_below_minimum_resolution_fails(
    low_resolution_image,
):
    settings = Settings()

    assert validate_resolution(
        low_resolution_image,
        settings,
    ) is False


def test_resolution_threshold_is_respected():
    settings = Settings(
        MIN_WIDTH_PX=100,
        MIN_HEIGHT_PX=100,
    )

    image = np.zeros(
        (100, 100, 3),
        dtype=np.uint8,
    )

    assert validate_resolution(
        image,
        settings,
    ) is True


# ============================================================================
# Sharpness
# ============================================================================


def test_sharp_image_has_high_sharpness(
    sharp_image,
):
    score = calculate_sharpness(sharp_image)

    assert score > 100


def test_blurry_image_has_lower_sharpness(
    sharp_image,
    blurry_image,
):
    sharp_score = calculate_sharpness(sharp_image)
    blurry_score = calculate_sharpness(blurry_image)

    assert blurry_score < sharp_score


def test_blurry_image_fails_blur_threshold(
    blurry_image,
):
    settings = Settings()

    score = calculate_sharpness(blurry_image)

    assert score < settings.BLUR_THRESHOLD


# ============================================================================
# Brightness
# ============================================================================


def test_normal_image_has_acceptable_brightness(
    sharp_image,
):
    settings = Settings()

    score = calculate_brightness(sharp_image)

    assert settings.LOW_LIGHT_THRESHOLD <= score
    assert score <= settings.OVEREXPOSED_THRESHOLD


def test_dark_image_has_low_brightness(
    dark_image,
):
    settings = Settings()

    score = calculate_brightness(dark_image)

    assert score < settings.LOW_LIGHT_THRESHOLD


def test_overexposed_image_has_high_brightness(
    overexposed_image,
):
    settings = Settings()

    score = calculate_brightness(overexposed_image)

    assert score > settings.OVEREXPOSED_THRESHOLD


# ============================================================================
# Full validation
# ============================================================================


def test_valid_image_passes_all_checks(
    sharp_image,
    image_to_bytes,
):
    settings = Settings()

    image_bytes = image_to_bytes(sharp_image)

    result = run_full_validation(
        file_bytes=image_bytes,
        content_type="image/jpeg",
        settings=settings,
    )

    assert result.is_valid is True
    assert result.reasons == []
    assert result.metrics.width_px == 600
    assert result.metrics.height_px == 600
    assert result.metrics.sharpness_score is not None
    assert result.metrics.brightness_score is not None


def test_invalid_file_type_rejects_image(
    sharp_image,
    image_to_bytes,
):
    settings = Settings()

    image_bytes = image_to_bytes(sharp_image)

    result = run_full_validation(
        file_bytes=image_bytes,
        content_type="application/pdf",
        settings=settings,
    )

    assert result.is_valid is False
    assert RejectionReason.INVALID_FILE_TYPE in result.reasons


def test_corrupted_image_is_rejected():
    settings = Settings()

    result = run_full_validation(
        file_bytes=b"not an actual image",
        content_type="image/jpeg",
        settings=settings,
    )

    assert result.is_valid is False
    assert RejectionReason.UNREADABLE_IMAGE in result.reasons


def test_low_resolution_image_is_rejected(
    low_resolution_image,
    image_to_bytes,
):
    settings = Settings()

    image_bytes = image_to_bytes(low_resolution_image)

    result = run_full_validation(
        file_bytes=image_bytes,
        content_type="image/jpeg",
        settings=settings,
    )

    assert result.is_valid is False
    assert RejectionReason.LOW_RESOLUTION in result.reasons


def test_blurry_image_is_rejected(
    blurry_image,
    image_to_bytes,
):
    settings = Settings()

    image_bytes = image_to_bytes(blurry_image)

    result = run_full_validation(
        file_bytes=image_bytes,
        content_type="image/jpeg",
        settings=settings,
    )

    assert result.is_valid is False
    assert RejectionReason.BLURRY in result.reasons


def test_dark_image_is_rejected(
    dark_image,
    image_to_bytes,
):
    settings = Settings()

    image_bytes = image_to_bytes(dark_image)

    result = run_full_validation(
        file_bytes=image_bytes,
        content_type="image/jpeg",
        settings=settings,
    )

    assert result.is_valid is False
    assert RejectionReason.LOW_LIGHT in result.reasons


def test_overexposed_image_is_rejected(
    overexposed_image,
    image_to_bytes,
):
    settings = Settings()

    image_bytes = image_to_bytes(overexposed_image)

    result = run_full_validation(
        file_bytes=image_bytes,
        content_type="image/jpeg",
        settings=settings,
    )

    assert result.is_valid is False
    assert RejectionReason.OVEREXPOSED in result.reasons


def test_large_file_is_rejected(
    sharp_image,
    image_to_bytes,
):
    settings = Settings()

    image_bytes = image_to_bytes(sharp_image)

    oversized_bytes = (
        image_bytes
        + b"\x00" * (
            settings.max_file_size_bytes
            - len(image_bytes)
            + 1
        )
    )

    result = run_full_validation(
        file_bytes=oversized_bytes,
        content_type="image/jpeg",
        settings=settings,
    )

    assert result.is_valid is False
    assert RejectionReason.FILE_TOO_LARGE in result.reasons