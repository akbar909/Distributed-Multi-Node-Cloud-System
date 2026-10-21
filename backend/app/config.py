"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Central configuration for the application.
    
    All values can be overridden via environment variables or a .env file.
    """

    # Application
    APP_NAME: str = "CDC Image Processor"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    DEPLOYMENT_MODE: str = "local"  # "local" or "cloud"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:80"

    # MongoDB
    MONGO_URL: str = "mongodb://mongodb:27017"
    MONGO_DB_NAME: str = "cdc_image_processor"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Storage
    STORAGE_BACKEND: str = "local"  # "local" or "s3"
    STORAGE_PATH: str = "/app/storage"

    # S3 (optional, used when STORAGE_BACKEND=s3)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = ""

    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 20
    MAX_IMAGE_DIMENSION: int = 10000
    ALLOWED_EXTENSIONS: str = "jpg,jpeg,png,webp,bmp,tiff"

    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/1"
    CELERY_TASK_TIME_LIMIT: int = 300
    CELERY_TASK_SOFT_TIME_LIMIT: int = 240

    # Security
    API_KEY: str = "dev-api-key-change-in-production"

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def allowed_extension_list(self) -> List[str]:
        return [ext.strip().lower() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
