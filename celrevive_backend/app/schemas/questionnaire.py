import uuid
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


SkinType = Literal[
    "normal",
    "dry",
    "oily",
    "combination_oily",
    "sensitive",
    "mature",
    "unknown",
]
SensitivityLevel = Literal["high", "mild", "none", "unknown"]


class QuestionnaireSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    questionnaire_version: str = Field(default="1.0", min_length=1, max_length=50)
    response_json: dict[str, Any]


class QuestionnaireConcernDetection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    skin_concern_id: str
    skin_concern_name: str
    skin_concern_exists: bool
    confidence_score: float = Field(ge=0, le=1)
    if_skin_concern_true_why: str

    @model_validator(mode="after")
    def validate_explanation(self):
        if self.skin_concern_exists and not self.if_skin_concern_true_why.strip():
            raise ValueError("A detected questionnaire concern requires an explanation")
        if not self.skin_concern_exists:
            self.confidence_score = 0
            self.if_skin_concern_true_why = ""
        return self


class QuestionnaireAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    skin_type: SkinType
    sensitivity_level: SensitivityLevel
    questionnaire_skin_concerns: list[QuestionnaireConcernDetection]


class QuestionnaireSubmissionResponse(BaseModel):
    session_id: uuid.UUID
    questionnaire_status: Literal["accepted", "processing"]
    message: str
