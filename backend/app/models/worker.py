"""Pydantic schemas for Worker monitoring."""

from typing import Optional
from pydantic import BaseModel


class WorkerInfo(BaseModel):
    name: str
    status: str = "online"  # online, offline
    completed_tasks: int = 0
    failed_tasks: int = 0
    current_task: Optional[str] = None
    queue_length: int = 0
    processing_speed: float = 0.0  # tasks/minute
    last_heartbeat: Optional[str] = None
    uptime: Optional[int] = None   # in seconds
