"""Central API router that aggregates all sub-routers."""

from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.uploads import router as uploads_router
from app.api.batches import router as batches_router
from app.api.tasks import router as tasks_router
from app.api.workers import router as workers_router
from app.api.metrics import router as metrics_router
from app.api.benchmarks import router as benchmarks_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["Health"])
api_router.include_router(uploads_router, tags=["Uploads"])
api_router.include_router(batches_router, tags=["Batches"])
api_router.include_router(tasks_router, tags=["Tasks"])
api_router.include_router(workers_router, tags=["Workers"])
api_router.include_router(metrics_router, tags=["Metrics"])
api_router.include_router(benchmarks_router, tags=["Benchmarks"])
