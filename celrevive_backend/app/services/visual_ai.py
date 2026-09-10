"""
Visual AI service integration.
Handles outbound requests to the vision model and specific error handling.
"""
import logging
import httpx
from fastapi import HTTPException, status
from pydantic import ValidationError

from app.schemas.visual_ai import VisualAIResponse

logger = logging.getLogger("celrevive_backend.visual_ai")

# Placeholder for the actual Vision AI URL
VISION_API_URL = "https://mock-vision-api.celrevive.com/analyze"


async def analyze_image_with_ai(image_url: str) -> VisualAIResponse:
    """
    Sends the accepted image URL to the Visual AI API.
    Replace with headers and payload containing AI model configs
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                VISION_API_URL,
                json={"image_url": image_url}
            )
            # Handles standard HTTP errors from the AI API
            response.raise_for_status()

            # Parses JSON and pass to Pydantic for schema validation
            return VisualAIResponse.model_validate(response.json())

    except httpx.TimeoutException:
        logger.error("Visual AI API timed out.")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The visual analysis service timed out."
        )
    except httpx.HTTPStatusError as e:
        logger.error("Visual AI API HTTP error: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve a valid response from the visual analysis service."
        )
    except httpx.RequestError as e:
        logger.error("Visual AI API network error: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The visual analysis service is currently unreachable."
        )
    except ValidationError as e:
        # Handles malformed AI response that breaks the JSON contract
        logger.error("Visual AI returned malformed data: %s", e.errors())
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The visual analysis service returned an invalid data structure."
        )