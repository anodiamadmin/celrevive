import uuid
from pydantic import BaseModel, ConfigDict, Field


class CombinedSkinConcernResponse(BaseModel):
    skin_concern_id: str
    skin_concern_name: str
    image_skin_concern_exists: bool
    questionnaire_skin_concern_exists: bool
    skin_concern_exists: bool
    if_skin_concern_true_why: str


class RecommendedBaseResponse(BaseModel):
    base_id: int
    base_name: str
    if_base_selected_why: str


class RecommendedActiveResponse(BaseModel):
    active_id: int
    active_name: str
    if_active_selected_why: str


class RecommendationOutputResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: uuid.UUID
    skin_concerns: list[CombinedSkinConcernResponse]
    recommended_base: RecommendedBaseResponse
    recommended_actives: list[RecommendedActiveResponse] = Field(default_factory=list)
    overall_explanation: str
    safety_notice: str = ""