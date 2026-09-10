"""
Pydantic schemas for Visual AI integration.
Handles AI response validation, deduplication, and supported-ID filtering.
"""
import logging
from typing import List, Set
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger("celrevive_backend.visual_ai")

# Valid IDs where detectable_by_selfie = 1 (SC0001-SC0019, SC1001-SC1009)
SUPPORTED_IMAGE_CONCERNS: Set[str] = {
    f"SC{str(i).zfill(4)}" for i in list(range(1, 20)) + list(range(1001, 1010))
}


class ImageSkinConcern(BaseModel):
    skin_concern_id: str
    skin_concern_name: str
    skin_concern_exists: bool
    if_skin_concern_true_why: str


class VisualAIResponse(BaseModel):
    """Schema matching the exact structure of image_detection.json"""
    image_skin_concerns: List[ImageSkinConcern] = Field(default_factory=list)

    @field_validator('image_skin_concerns')
    def validate_and_deduplicate_concerns(cls, concerns: List[ImageSkinConcern]) -> List[ImageSkinConcern]:
        seen_ids = set()
        validated_concerns = []

        for concern in concerns:
            # Filters out unsupported/hallucinated/questionnaire-only IDs
            if concern.skin_concern_id not in SUPPORTED_IMAGE_CONCERNS:
                logger.warning("Unsupported or non-visual concern ID dropped: %s", concern.skin_concern_id)
                continue

            # Handles duplicates (keeps the first occurrence)
            if concern.skin_concern_id not in seen_ids:
                seen_ids.add(concern.skin_concern_id)
                validated_concerns.append(concern)

        return validated_concerns


class AIAnalysisRequest(BaseModel):
    """Payload expected from the frontend containing the image URL"""
    image_url: str
    session_id: str