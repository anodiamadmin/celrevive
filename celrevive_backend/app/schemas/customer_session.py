import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CustomerSessionCreate(BaseModel):
    shopify_customer_id: str | None = Field(default=None, max_length=100)
    shopify_customer_email: str | None = Field(default=None, max_length=320)
    shopify_cart_id: str | None = Field(default=None, max_length=255)
    shopify_checkout_id: str | None = Field(default=None, max_length=255)
    consent_given: bool
    notes: str | None = "Customer session initiated with consent."


class CustomerSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: uuid.UUID
    session_status: str


class PrimarySkinConcern(BaseModel):
    concern_name: str
    confidence_score: float


class CombinedSkinConcernResponse(BaseModel):
    skin_concern_id: str
    skin_concern_name: str
    image_skin_concern_exists: bool
    questionnaire_skin_concern_exists: bool
    skin_concern_exists: bool
    if_skin_concern_true_why: str


class ImageAnalysisStatusResponse(BaseModel):
    session_id: uuid.UUID
    analysis_status: Literal[
        "pending",
        "processing",
        "completed",
        "validation_failed",
        "analysis_failed",
    ]
    message: str
    primary_concerns: list[PrimarySkinConcern] = Field(default_factory=list)
    combined_skin_concerns: list[CombinedSkinConcernResponse] | None = None
