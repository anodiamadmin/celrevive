# import logging
# from fastapi import FastAPI
#
# from app.api.v1.routes.image_analysis import router as image_router
#
# logging.basicConfig(level=logging.INFO)
#
# app = FastAPI(title="CelRevive AI Skin Assessment", version="0.1.0")
#
# app.include_router(image_router, prefix="/api/v1", tags=["image-analysis"])
#
# @app.get("/health")
# def health_check() -> dict:
#     return {"status": "ok"}

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes.image_analysis import router as image_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="CelRevive AI Skin Assessment", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(image_router, prefix="/api/v1", tags=["image-analysis"])

@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}
