import uuid
from typing import List
from pydantic import BaseModel, ConfigDict


class RecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: uuid.UUID
    user_full_name: str
    message: str
    primary_concerns: List[str]