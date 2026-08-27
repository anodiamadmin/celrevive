# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from app.core.config import settings
from app.api.v1.routes import app_proxy

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS setup (Allow Shopify domains and local development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Proxy Routes
app.include_router(app_proxy.router, prefix=f"{settings.API_V1_STR}/celrevive-api")

@app.get("/", response_class=HTMLResponse)
def read_root():
    return """
    <html>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h2>CelRevive API POC is Active! 🚀</h2>
            <p>The backend is successfully connected to Shopify.</p>
        </body>
    </html>
    """

@app.get("/health")
def health_check():
    return {"status": "healthy"}