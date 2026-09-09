import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes.image_validation import router as image_validation_router
from app.core.config import get_settings

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="CelRevive Image Validation Service", version="0.1.0")
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(image_validation_router, prefix="/api/v1", tags=["image-validation"])


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}
