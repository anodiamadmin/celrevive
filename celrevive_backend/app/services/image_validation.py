"""
Image-validation service — work item 1.1.

Pure functions, independently unit-testable (feeds into 1.4), composed by
`run_full_validation` into a single pass/fail result with reasons + metrics.
"""

import io
import logging
from typing import Optional

import cv2
import numpy as np
import pillow_heif
from PIL import Image

from app.core.config import Settings, get_settings
from app.schemas.image_validation import (
    ImageValidationResult,
    QualityMetrics,
    RejectionReason,
)

logger = logging.getLogger("celrevive.image_validation")

# Registers HEIF/HEIC opener support into Pillow. Needed because iPhone
# camera photos default to HEIC, which OpenCV cannot decode natively.
pillow_heif.register_heif_opener()


# --------------------------------------------------------------------------
# Individual checks
# --------------------------------------------------------------------------

def validate_content_type(content_type: Optional[str], settings: Settings) -> bool:
    """Checks the declared MIME type against the configured allow-list.

    This is a cheap first-pass check only — it trusts the client's declared
    content_type. `decode_image` below is the real gate: a file can only pass
    validation if OpenCV can actually decode it as image pixel data.
    """
    return content_type in settings.ALLOWED_CONTENT_TYPES


def validate_file_size(size_bytes: int, settings: Settings) -> bool:
    return 0 < size_bytes <= settings.max_file_size_bytes


def decode_image(file_bytes: bytes) -> Optional[np.ndarray]:
    """Attempts to decode raw bytes into a BGR image array.

    Tries OpenCV first (fast path for JPEG/PNG/WebP). Falls back to Pillow
    for anything OpenCV can't handle — in practice this is what catches
    HEIC/HEIF (iPhone's default camera format), since pillow_heif registers
    HEIF support into Pillow's plugin system at import time above.

    Returns None if the bytes are corrupt, truncated, or not a real image —
    this is what actually proves the file is readable, regardless of what
    its extension/content-type claimed.
    """
    try:
        np_buffer = np.frombuffer(file_bytes, dtype=np.uint8)
        image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
        if image is not None:
            return image
    except Exception:
        logger.exception("Unexpected error during OpenCV decode")

    # OpenCV couldn't handle it (e.g. HEIC) — try Pillow as a fallback.
    try:
        pil_image = Image.open(io.BytesIO(file_bytes))
        pil_image = pil_image.convert("RGB")
        rgb_array = np.array(pil_image)
        return cv2.cvtColor(rgb_array, cv2.COLOR_RGB2BGR)
    except Exception:
        logger.exception("Pillow fallback decode also failed — not a readable image")
        return None


def validate_resolution(image: np.ndarray, settings: Settings) -> bool:
    height, width = image.shape[:2]
    return width >= settings.MIN_WIDTH_PX and height >= settings.MIN_HEIGHT_PX


def calculate_sharpness(image: np.ndarray) -> float:
    """Laplacian-variance blur metric. Higher = sharper.

    Standard, cheap blur-detection approach: the variance of the Laplacian
    (2nd derivative) drops sharply for blurry images because there are fewer
    hard edges.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def calculate_brightness(image: np.ndarray) -> float:
    """Mean pixel intensity (0-255) on the grayscale image as a lighting proxy."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return float(gray.mean())


# --------------------------------------------------------------------------
# Composed validation (work item 1.1 end-to-end + feeds 1.2's single endpoint)
# --------------------------------------------------------------------------

def run_full_validation(
    file_bytes: bytes,
    content_type: Optional[str],
    settings: Optional[Settings] = None,
) -> ImageValidationResult:
    settings = settings or get_settings()
    reasons: list[RejectionReason] = []
    metrics = QualityMetrics()

    # 1. Filetype check
    if not validate_content_type(content_type, settings):
        reasons.append(RejectionReason.INVALID_FILE_TYPE)
        return _reject(reasons, metrics)

    # 2. Size check (cheap, before we bother decoding)
    if not validate_file_size(len(file_bytes), settings):
        reasons.append(RejectionReason.FILE_TOO_LARGE)
        return _reject(reasons, metrics)

    # 3. Decodability check
    image = decode_image(file_bytes)
    if image is None:
        reasons.append(RejectionReason.UNREADABLE_IMAGE)
        return _reject(reasons, metrics)

    height, width = image.shape[:2]
    metrics.width_px = width
    metrics.height_px = height

    # 4. Resolution check
    if not validate_resolution(image, settings):
        reasons.append(RejectionReason.LOW_RESOLUTION)

    # 5. Sharpness (blur) check
    sharpness = calculate_sharpness(image)
    metrics.sharpness_score = round(sharpness, 2)
    if sharpness < settings.BLUR_THRESHOLD:
        reasons.append(RejectionReason.BLURRY)

    # 6. Brightness (low-light / overexposed) check
    brightness = calculate_brightness(image)
    metrics.brightness_score = round(brightness, 2)
    if brightness < settings.LOW_LIGHT_THRESHOLD:
        reasons.append(RejectionReason.LOW_LIGHT)
    elif brightness > settings.OVEREXPOSED_THRESHOLD:
        reasons.append(RejectionReason.OVEREXPOSED)

    if reasons:
        return _reject(reasons, metrics)

    return ImageValidationResult(
        is_valid=True,
        reasons=[],
        metrics=metrics,
        message="Image passed all quality checks.",
    )


def _reject(reasons: list[RejectionReason], metrics: QualityMetrics) -> ImageValidationResult:
    return ImageValidationResult(
        is_valid=False,
        reasons=reasons,
        metrics=metrics,
        message="Your image is not valid. Take another image with better quality.",
    )