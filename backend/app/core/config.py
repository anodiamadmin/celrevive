# app/core/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CelRevive Backend API"
    API_V1_STR: str = "/api/v1"
    SHOPIFY_API_SECRET: str
    SHOPIFY_STORE_DOMAIN: str = ""
    PORT: int = 8000

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()