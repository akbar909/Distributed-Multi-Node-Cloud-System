"""Pydantic schemas and models for Benchmarking."""

from enum import Enum
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class BenchmarkStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class BenchmarkRun(BaseModel):
    worker_count: int
    task_ids: List[str] = Field(default_factory=list)
    wall_time: float = 0.0          # in seconds
    throughput: float = 0.0         # tasks / sec
    avg_duration: float = 0.0       # avg task duration in sec
    failures: int = 0
    speedup: float = 1.0            # wall_time(1) / wall_time(N)
    efficiency: float = 100.0       # speedup / N * 100%


class BenchmarkInDB(BaseModel):
    benchmark_id: str
    status: BenchmarkStatus = BenchmarkStatus.PENDING
    runs: List[BenchmarkRun] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class BenchmarkResponse(BaseModel):
    benchmark_id: str
    status: BenchmarkStatus
    runs: List[BenchmarkRun]
    created_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None
