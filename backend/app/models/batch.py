"""Pydantic schemas and models for Batches."""

from enum import Enum
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class BatchStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"


class BatchInDB(BaseModel):
    batch_id: str
    task_ids: List[str]
    total_tasks: int
    completed_tasks: int = 0
    failed_tasks: int = 0
    status: BatchStatus = BatchStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None


class BatchResponse(BaseModel):
    batch_id: str
    task_ids: List[str]
    total_tasks: int
    completed_tasks: int
    failed_tasks: int
    status: BatchStatus
    created_at: str
    completed_at: Optional[str] = None
