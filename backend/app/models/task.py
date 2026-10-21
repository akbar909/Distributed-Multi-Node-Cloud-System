"""Pydantic schemas and models for Tasks."""

from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


class ImageOperation(str, Enum):
    RESIZE = "resize"
    THUMBNAIL = "thumbnail"
    COMPRESS = "compress"
    CONVERT = "convert"
    ROTATE = "rotate"
    GRAYSCALE = "grayscale"
    BLUR = "blur"
    METADATA = "metadata"


class ImageFormat(str, Enum):
    JPEG = "jpeg"
    PNG = "png"
    WEBP = "webp"


class ProcessingConfig(BaseModel):
    width: Optional[int] = Field(None, ge=1, le=10000, description="Target width in pixels")
    height: Optional[int] = Field(None, ge=1, le=10000, description="Target height in pixels")
    thumbnail_size: Optional[int] = Field(256, ge=16, le=1024, description="Thumbnail max dimension")
    quality: Optional[int] = Field(85, ge=1, le=100, description="Compression quality (1-100)")
    format: Optional[ImageFormat] = Field(None, description="Target format (jpeg, png, webp)")
    rotate_angle: Optional[int] = Field(90, description="Rotation degrees counter-clockwise or clockwise")
    blur_radius: Optional[float] = Field(2.0, ge=0.1, le=50.0, description="Gaussian blur radius")


class TaskOutput(BaseModel):
    operation: ImageOperation
    filename: str
    path: str
    size: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    format: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class TaskInDB(BaseModel):
    task_id: str
    batch_id: str
    filename: str
    original_filename: str
    original_path: str
    status: TaskStatus = TaskStatus.QUEUED
    operations: List[ImageOperation]
    config: ProcessingConfig = Field(default_factory=ProcessingConfig)
    outputs: List[TaskOutput] = Field(default_factory=list)
    worker_name: Optional[str] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_time: Optional[float] = None  # in seconds


class TaskResponse(BaseModel):
    task_id: str
    batch_id: str
    filename: str
    original_filename: str
    original_path: str
    status: TaskStatus
    operations: List[ImageOperation]
    config: ProcessingConfig
    outputs: List[TaskOutput] = []
    worker_name: Optional[str] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    processing_time: Optional[float] = None
