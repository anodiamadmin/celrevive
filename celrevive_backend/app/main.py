import logging
from fastapi import FastAPI

from app.api.v1.routes.image import router as image_router
from app.api.v1.routes.recommendation import router as recommendation_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="CelRevive AI Skin Assessment", version="0.1.0")

app.include_router(image_router, prefix="/api/v1", tags=["image-validation"])
app.include_router(recommendation_router, prefix="/api/v1/recommendation", tags=["recommendation"])


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}
