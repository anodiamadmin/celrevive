"""
POST /api/v1/analyze-image
Triggers the Visual AI analysis and formats the frontend recommendation response.
"""
import logging
from fastapi import APIRouter, status

from app.schemas.visual_ai import AIAnalysisRequest
from app.services.visual_ai import analyze_image_with_ai

router = APIRouter()
logger = logging.getLogger("celrevive_backend.visual_ai")


@router.post(
    "/analyze-image",
    status_code=status.HTTP_200_OK,
)
async def trigger_image_analysis(request: AIAnalysisRequest) -> dict:
    # Executes analysis and Pydantic validation via the service layer
    ai_result = await analyze_image_with_ai(image_url=request.image_url)

    # Filters for only the concerns that the AI flagged as actively existing
    active_concerns = [
        concern for concern in ai_result.image_skin_concerns
        if concern.skin_concern_exists
    ]

    # Handles empty/no-concern response
    if not active_concerns:
        logger.info("No active skin concerns detected for session %s.", request.session_id)
        return {
            "status": "success",
            "message": "Your skin looks perfect!",
            "detected_concerns": []
        }

    # NOTE: Database insertion logic for `session_skin_concern_detection`
    # goes here now that the data is 100% clean and deduplicated.

    return {
        "status": "success",
        "message": "Skin analysis complete.",
        "detected_concerns": [concern.model_dump() for concern in active_concerns]
    }