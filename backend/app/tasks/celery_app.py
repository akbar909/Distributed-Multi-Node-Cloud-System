"""Celery application configuration.

Connects to Redis as broker and result backend.
Configures task acknowledgement, retries, and serialization.
"""

from celery import Celery
from app.config import settings

celery_app = Celery(
    "cdc_image_processor",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.image_tasks"],
)

celery_app.conf.update(
    broker_connection_retry_on_startup=True,
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Timezone
    timezone="UTC",
    enable_utc=True,

    # Task behavior
    task_acks_late=True,                   # Acknowledge after task completes
    task_reject_on_worker_lost=True,       # Re-queue if worker crashes
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT,
    worker_prefetch_multiplier=1,          # Fetch one task at a time for fair distribution

    # Events for monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,

    # Result expiration
    result_expires=86400,  # 24 hours

    # Task routing
    task_default_queue="default",

    # Task discovery
    task_routes={
        "app.tasks.image_tasks.*": {"queue": "default"},
    },
)

# Auto-discover tasks in app.tasks
celery_app.autodiscover_tasks(["app.tasks"])
