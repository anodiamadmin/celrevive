# app/api/v1/routes/app_proxy.py

from fastapi import APIRouter, Request, HTTPException, status
from app.schemas.assessment import AssessmentCreate, AssessmentUpdate, AssessmentPatch
from app.core.security import verify_shopify_proxy_signature
import logging

logger = logging.getLogger("uvicorn")
router = APIRouter(prefix="/assessment", tags=["App Proxy Assessment"])

# In-memory mock store for testing POC
mock_db = {
    "draft_101": {
        "id": "draft_101",
        "age": 29,
        "skin_type": "Dry/Reactive",
        "climate": "Moderate",
        "status": "initial_draft"
    }
}


@router.get("/{record_id}")
async def get_assessment(record_id: str, request: Request):
    # Logged-in customer ID sent automatically by Shopify proxy
    customer_id = request.query_params.get("logged_in_customer_id")

    if record_id not in mock_db:
        raise HTTPException(status_code=404, detail="Assessment draft not found")

    return {
        "status": "success",
        "record_id": record_id,
        "shopify_customer_id": customer_id,
        "data": mock_db[record_id]
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_assessment(payload: AssessmentCreate, request: Request):
    customer_id = request.query_params.get("logged_in_customer_id")
    new_id = f"draft_{len(mock_db) + 101}"

    mock_db[new_id] = {
        "id": new_id,
        "age": payload.age,
        "skin_type": payload.skin_type,
        "climate": payload.climate,
        "status": "created"
    }

    return {
        "status": "created",
        "record_id": new_id,
        "shopify_customer_id": customer_id,
        "data": mock_db[new_id]
    }


@router.put("/{record_id}")
async def replace_assessment(record_id: str, payload: AssessmentUpdate):
    if record_id not in mock_db:
        raise HTTPException(status_code=404, detail="Record not found")

    mock_db[record_id] = payload.model_dump()
    return {"status": "replaced", "record_id": record_id, "data": mock_db[record_id]}


@router.patch("/{record_id}")
async def patch_assessment(record_id: str, payload: AssessmentPatch):
    if record_id not in mock_db:
        raise HTTPException(status_code=404, detail="Record not found")

    update_data = payload.model_dump(exclude_unset=True)
    mock_db[record_id].update(update_data)
    return {"status": "patched", "record_id": record_id, "data": mock_db[record_id]}


@router.delete("/{record_id}")
async def delete_assessment(record_id: str):
    if record_id not in mock_db:
        raise HTTPException(status_code=404, detail="Record not found")

    deleted = mock_db.pop(record_id)
    return {"status": "deleted", "record_id": record_id, "data": deleted}