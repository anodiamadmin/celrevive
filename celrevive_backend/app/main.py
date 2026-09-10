import logging
from fastapi import FastAPI
from app.api.v1.routes.image_validation import router as image_validation_router
from app.api.v1.routes.visual_ai import router as visual_ai_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="CelRevive AI Skin Assessment", version="0.1.0")

app.include_router(image_validation_router, prefix="/api/v1", tags=["image-validation"])
app.include_router(visual_ai_router, prefix="/api/v1", tags=["visual-ai"])


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}
