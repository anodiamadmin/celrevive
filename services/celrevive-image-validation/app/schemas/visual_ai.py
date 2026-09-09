"""Strict Visual AI response contract derived from architecture/image_detection.json."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


SkinConcernId = Literal[
    "SC0001", "SC0002", "SC0003", "SC0004", "SC0005", "SC0006", "SC0007",
    "SC0008", "SC0009", "SC0010", "SC0011", "SC0012", "SC0013", "SC0014",
    "SC0015", "SC0016", "SC0017", "SC0018", "SC0019", "SC1001", "SC1002",
    "SC1003", "SC1004", "SC1005", "SC1006", "SC1007", "SC1008", "SC1009",
]

CONCERN_NAMES = {
    "SC0001": "Dry Skin",
    "SC0002": "Dehydrated Skin",
    "SC0003": "Compromised Skin Barrier",
    "SC0004": "Sensitive Skin",
    "SC0005": "Redness",
    "SC0006": "Rosacea",
    "SC0007": "Reactive Skin",
    "SC0008": "Acne",
    "SC0009": "Breakouts / Blemishes",
    "SC0010": "Excess Sebum (Oily Skin)",
    "SC0011": "Mature Skin",
    "SC0012": "Uneven Skin Tone",
    "SC0013": "Hyperpigmentation",
    "SC0014": "Melasma-like Pigmentation",
    "SC0015": "Dullness / Poor Radiance",
    "SC0016": "Fatigued Skin",
    "SC0017": "Photoaging",
    "SC0018": "Chronic Skin Inflammation Risk",
    "SC0019": "Skin Ageing / Longevity Risk",
    "SC1001": "Enlarged Pores",
    "SC1002": "Blackheads / Comedones",
    "SC1003": "Fine Lines",
    "SC1004": "Wrinkles",
    "SC1005": "Expression Lines",
    "SC1006": "Loss of Firmness",
    "SC1007": "Age Spots",
    "SC1008": "Stretch Marks",
    "SC1009": "Scar / Repair Needs",
}


class VisualAIConcern(BaseModel):
    """One concern entry from the visual model."""

    model_config = ConfigDict(extra="forbid", strict=True)

    skin_concern_id: SkinConcernId
    skin_concern_name: str
    skin_concern_exists: bool
    if_skin_concern_true_why: str = Field(default="")

    @model_validator(mode="after")
    def validate_name_matches_id(self) -> "VisualAIConcern":
        expected_name = CONCERN_NAMES[self.skin_concern_id]
        if self.skin_concern_name != expected_name:
            raise ValueError(
                f"skin_concern_name does not match {self.skin_concern_id}."
            )
        if self.skin_concern_exists and not self.if_skin_concern_true_why.strip():
            raise ValueError(
                "if_skin_concern_true_why is required when skin_concern_exists is true."
            )
        return self


class VisualAIResponse(BaseModel):
    """Exact top-level contract represented by image_detection.json."""

    model_config = ConfigDict(extra="forbid", strict=True)

    image_skin_concerns: list[VisualAIConcern] = Field(min_length=28, max_length=28)

    @model_validator(mode="after")
    def validate_complete_concern_set(self) -> "VisualAIResponse":
        ids = [item.skin_concern_id for item in self.image_skin_concerns]
        expected_ids = list(CONCERN_NAMES)
        if len(ids) != len(expected_ids) or set(ids) != set(expected_ids):
            raise ValueError(
                "Visual AI response must contain each allowed skin_concern_id exactly once."
            )
        return self
