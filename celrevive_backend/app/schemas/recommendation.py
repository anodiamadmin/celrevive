import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.customer_session import CombinedSkinConcernResponse
from app.schemas.questionnaire import SkinType


class RecommendedBaseResponse(BaseModel):
    base_id: int
    base_name: str
    if_base_selected_why: str


class RecommendedActiveResponse(BaseModel):
    active_id: int
    active_name: str
    if_active_selected_why: str
    recommended_usage_percentage: float = Field(
        description="Defaults to the active catalog's minimum usage level."
    )


class RecommendationOutputResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: uuid.UUID
    recommendation_id: uuid.UUID
    user_full_name: str | None = None
    skin_concerns: list[CombinedSkinConcernResponse]
    skin_type: SkinType
    recommended_base: RecommendedBaseResponse
    recommended_actives: list[RecommendedActiveResponse] = Field(default_factory=list)
    formulation_weight_g: int
    overall_explanation: str
    safety_notice: str = ""