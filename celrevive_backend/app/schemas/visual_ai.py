"""
Pydantic schemas for Visual AI integration.
Handles AI response validation, deduplication, supported-ID filtering,
and explanation-consistency checks.
"""
import logging
from typing import List, Set
from pydantic import BaseModel, Field, field_validator, model_validator

logger = logging.getLogger("celrevive_backend.visual_ai")

# Valid IDs where detectable_by_selfie = true (SC0001-SC0019, SC1001-SC1009)
SUPPORTED_IMAGE_CONCERNS: Set[str] = {
    f"SC{str(i).zfill(4)}" for i in list(range(1, 20)) + list(range(1001, 1010))
}


class ImageSkinConcern(BaseModel):
    skin_concern_id: str
    skin_concern_name: str
    skin_concern_exists: bool
    if_skin_concern_true_why: str

    @model_validator(mode="after")
    def check_explanation_consistency(self):
        if self.skin_concern_exists and not self.if_skin_concern_true_why.strip():
            raise ValueError(
                f"{self.skin_concern_id}: skin_concern_exists=True requires a non-empty explanation"
            )
        if not self.skin_concern_exists and self.if_skin_concern_true_why.strip():
            logger.warning(
                "%s: exists=False but explanation was populated — clearing it", self.skin_concern_id
            )
            self.if_skin_concern_true_why = ""
        return self


class VisualAIResponse(BaseModel):
    """
    Schema matching the exact structure of image_detection.json.

    The model is instructed (system_prompt.py) to always return all 28
    supported concern entries, with skin_concern_exists=False on any not
    detected. A raw response with fewer than 28 IDs is a malformed/incomplete
    AI response — NOT a valid "no concerns found" result, which still returns
    all 28 entries, just all False. Callers should distinguish these via
    has_no_visible_concerns vs. catching ValidationError.
    """
    image_skin_concerns: List[ImageSkinConcern]

    @field_validator("image_skin_concerns")
    @classmethod
    def drop_unsupported_and_dedupe(cls, concerns: List[ImageSkinConcern]) -> List[ImageSkinConcern]:
        seen_ids = set()
        validated = []
        for concern in concerns:
            if concern.skin_concern_id not in SUPPORTED_IMAGE_CONCERNS:
                logger.warning("Unsupported or non-visual concern ID dropped: %s", concern.skin_concern_id)
                continue
            if concern.skin_concern_id in seen_ids:
                logger.warning("Duplicate concern ID dropped (kept first occurrence): %s", concern.skin_concern_id)
                continue
            seen_ids.add(concern.skin_concern_id)
            validated.append(concern)
        return validated

    @model_validator(mode="after")
    def check_full_template_coverage(self):
        present_ids = {c.skin_concern_id for c in self.image_skin_concerns}
        missing = SUPPORTED_IMAGE_CONCERNS - present_ids
        if missing:
            raise ValueError(
                f"AI response missing {len(missing)} required concern IDs after filtering: {sorted(missing)}"
            )
        return self

    @property
    def detected_concerns(self) -> List[ImageSkinConcern]:
        """Only the concerns flagged True — for 2.6's recommendation response."""
        return [c for c in self.image_skin_concerns if c.skin_concern_exists]

    @property
    def has_no_visible_concerns(self) -> bool:
        """True = a valid, complete 'clean skin' result (not a failure)."""
        return len(self.detected_concerns) == 0