# app/schemas/assessment.py

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class AssessmentCreate(BaseModel):
    age: int = Field(..., ge=18, le=100)
    skin_type: str
    climate: str
    timestamp: Optional[datetime] = None

class AssessmentUpdate(BaseModel):
    id: str
    age: int
    skin_type: str
    climate: str
    status: str

class AssessmentPatch(BaseModel):
    climate: Optional[str] = None
    skin_type: Optional[str] = None

class AssessmentResponse(BaseModel):
    status: str
    record_id: str
    data: Dict[str, Any]
    shopify_customer_id: Optional[str] = None