"""Health check endpoint for monitoring service status."""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter
from redis import Redis
from app.config import settings
from app.database import get_database

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    """Check the health of all connected services.
    
    Returns status of API, MongoDB, and Redis connections
    along with deployment mode and version information.
    """
    status = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.APP_VERSION,
        "deployment_mode": settings.DEPLOYMENT_MODE,
        "services": {
            "api": {"status": "healthy"},
            "mongodb": {"status": "unknown"},
            "redis": {"status": "unknown"},
        },
    }

    # Check MongoDB
    try:
        db = get_database()
        await db.command("ping")
        status["services"]["mongodb"]["status"] = "healthy"
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        status["services"]["mongodb"]["status"] = "unhealthy"
        status["services"]["mongodb"]["error"] = str(e)
        status["status"] = "degraded"

    # Check Redis
    try:
        redis_client = Redis.from_url(settings.REDIS_URL, socket_timeout=3)
        redis_client.ping()
        status["services"]["redis"]["status"] = "healthy"
        redis_client.close()
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        status["services"]["redis"]["status"] = "unhealthy"
        status["services"]["redis"]["error"] = str(e)
        status["status"] = "degraded"

    return status
