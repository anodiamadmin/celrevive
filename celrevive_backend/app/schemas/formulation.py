from pydantic import BaseModel, ConfigDict, Field


class RecommendedActive(BaseModel):
    model_config = ConfigDict(extra="forbid")

    active_id: int
    if_active_selected_why: str = Field(min_length=1)


class FormulationRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    base_id: int
    if_base_selected_why: str = Field(min_length=1)
    actives: list[RecommendedActive]
    overall_explanation: str = Field(min_length=1)
    safety_notice: str = ""
