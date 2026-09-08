"""Response/domain models for the image-validation flow (work item 1.1 / 1.3)."""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class RejectionReason(str, Enum):
    INVALID_FILE_TYPE = "invalid_file_type"
    FILE_TOO_LARGE = "file_too_large"
    UNREADABLE_IMAGE = "unreadable_image"
    LOW_RESOLUTION = "low_resolution"
    BLURRY = "blurry"
    LOW_LIGHT = "low_light"
    OVEREXPOSED = "overexposed"


class QualityMetrics(BaseModel):
    """Raw measured values — always returned when the image could be decoded,
    even on rejection, so the reasons are inspectable/loggable."""

    width_px: Optional[int] = None
    height_px: Optional[int] = None
    sharpness_score: Optional[float] = None
    brightness_score: Optional[float] = None


class ImageValidationResult(BaseModel):
    is_valid: bool
    reasons: List[RejectionReason] = Field(default_factory=list)
    metrics: QualityMetrics = Field(default_factory=QualityMetrics)
    message: str


# --- Frontend-facing response for POST /image-validation (work item 1.3) ---

class ImageValidationResponse(BaseModel):
    valid: bool
    message: str
    # Kept out of the default frontend message but included for debugging/logging on the client if needed
    reasons: List[RejectionReason] = Field(default_factory=list)
