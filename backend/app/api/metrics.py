"""Metrics aggregation API providing real-time system throughput and utilization metrics."""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter
from app.database import get_database
from app.tasks.celery_app import celery_app
from app.models.task import TaskStatus

router = APIRouter()


@router.get("/metrics")
async def get_metrics():
    """Aggregate system metrics from MongoDB and Celery broker."""
    db = get_database()

    # Aggregate counts by status
    status_counts = {
        TaskStatus.QUEUED.value: 0,
        TaskStatus.PROCESSING.value: 0,
        TaskStatus.COMPLETED.value: 0,
        TaskStatus.FAILED.value: 0,
        TaskStatus.RETRYING.value: 0,
    }

    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    cursor = db.tasks.aggregate(pipeline)
    async for doc in cursor:
        st = doc.get("_id")
        if st in status_counts:
            status_counts[st] = doc.get("count", 0)

    queued = status_counts[TaskStatus.QUEUED.value] + status_counts[TaskStatus.RETRYING.value]
    processing = status_counts[TaskStatus.PROCESSING.value]
    completed = status_counts[TaskStatus.COMPLETED.value]
    failed = status_counts[TaskStatus.FAILED.value]
    total_processed = completed + failed

    # Calculate average processing time for completed tasks
    avg_pipeline = [
        {"$match": {"status": TaskStatus.COMPLETED.value, "processing_time": {"$ne": None}}},
        {"$group": {"_id": None, "avg_time": {"$avg": "$processing_time"}}},
    ]
    avg_res = await db.tasks.aggregate(avg_pipeline).to_list(length=1)
    avg_time = round(avg_res[0]["avg_time"], 2) if avg_res and "avg_time" in avg_res[0] else 0.0

    # Calculate success rate
    success_rate = round((completed / total_processed * 100), 1) if total_processed > 0 else 100.0

    # Active workers from Celery inspect
    active_worker_count = 0
    try:
        insp = celery_app.control.inspect(timeout=1.0)
        ping_res = insp.ping()
        if ping_res:
            active_worker_count = len(ping_res)
    except Exception:
        active_worker_count = 0

    # Processing volume by hour (last 24 hours)
    now = datetime.now(timezone.utc)
    one_day_ago = now - timedelta(hours=24)

    vol_pipeline = [
        {"$match": {"created_at": {"$gte": one_day_ago}}},
        {
            "$project": {
                "hour": {
                    "$dateToString": {"format": "%H:00", "date": "$created_at", "timezone": "UTC"}
                }
            }
        },
        {"$group": {"_id": "$hour", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    vol_res = await db.tasks.aggregate(vol_pipeline).to_list(length=24)
    vol_dict = {doc["_id"]: doc["count"] for doc in vol_res}

    processing_volume = []
    for h in range(24):
        slot_time = one_day_ago + timedelta(hours=h + 1)
        slot_label = slot_time.strftime("%H:00")
        processing_volume.append({
            "hour": slot_label,
            "count": vol_dict.get(slot_label, 0),
        })

    # Per-worker stats from MongoDB tasks
    worker_pipeline = [
        {"$match": {"worker_name": {"$ne": None}}},
        {
            "$group": {
                "_id": "$worker_name",
                "completed": {
                    "$sum": {"$cond": [{"$eq": ["$status", TaskStatus.COMPLETED.value]}, 1, 0]}
                },
                "failed": {
                    "$sum": {"$cond": [{"$eq": ["$status", TaskStatus.FAILED.value]}, 1, 0]}
                },
            }
        },
    ]
    worker_res = await db.tasks.aggregate(worker_pipeline).to_list(length=50)
    worker_stats = [
        {"name": w["_id"], "completed": w["completed"], "failed": w["failed"]}
        for w in worker_res
    ]

    return {
        "total_processed": total_processed,
        "queued": queued,
        "processing": processing,
        "completed": completed,
        "failed": failed,
        "active_workers": active_worker_count,
        "avg_processing_time": avg_time,
        "success_rate": success_rate,
        "processing_volume": processing_volume,
        "worker_stats": worker_stats,
    }
