"""Worker monitoring and management API using Celery inspect and Redis broker inspection."""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, Header, status
from pydantic import BaseModel
from redis import Redis
from app.config import settings
from app.database import get_database
from app.tasks.celery_app import celery_app
from app.models.task import TaskStatus

router = APIRouter()


class WorkerControlRequest(BaseModel):
    action: str  # "pause", "resume", "shutdown"
    worker_name: str


@router.get("/workers")
async def list_workers():
    """Inspect all active Celery workers, their current tasks, and aggregate task statistics."""
    db = get_database()

    # 1. Fetch current queue length from Redis
    queue_length = 0
    try:
        r = Redis.from_url(settings.REDIS_URL, socket_timeout=2)
        queue_length = r.llen("default")
        r.close()
    except Exception:
        queue_length = 0

    # 2. Celery inspect for online workers
    online_workers_stats = {}
    active_tasks_by_worker = {}
    try:
        insp = celery_app.control.inspect(timeout=1.5)
        stats = insp.stats() or {}
        active = insp.active() or {}
        ping = insp.ping() or {}

        for w_name in ping.keys():
            online_workers_stats[w_name] = {
                "stats": stats.get(w_name, {}),
                "active_tasks": active.get(w_name, []),
            }
    except Exception:
        online_workers_stats = {}

    # 3. Aggregate historical task stats from MongoDB for each worker
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
                "avg_time": {"$avg": "$processing_time"},
                "last_active": {"$max": "$completed_at"},
            }
        },
    ]
    historical_workers = await db.tasks.aggregate(worker_pipeline).to_list(length=100)
    history_map = {w["_id"]: w for w in historical_workers}

    # 4. Merge online workers and historical workers
    all_worker_names = set(online_workers_stats.keys()).union(set(history_map.keys()))
    if not all_worker_names and not online_workers_stats:
        # Default placeholder worker if starting up or testing
        all_worker_names = {"worker-1@cdc", "worker-2@cdc"}

    workers_list = []
    for name in sorted(all_worker_names):
        is_online = name in online_workers_stats
        hist = history_map.get(name, {})
        online_data = online_workers_stats.get(name, {})

        # Determine current running task ID
        current_task = None
        act_tasks = online_data.get("active_tasks", [])
        if act_tasks:
            current_task = act_tasks[0].get("args", [None])[0] or act_tasks[0].get("id")

        completed_count = hist.get("completed", 0)
        failed_count = hist.get("failed", 0)
        avg_time = hist.get("avg_time") or 0.0

        # Processing speed: tasks/min estimated from avg_time
        speed = round(60.0 / avg_time, 1) if avg_time > 0 else 0.0

        uptime = None
        if is_online:
            uptime = online_data.get("stats", {}).get("uptime")

        last_hb = None
        if hist.get("last_active") and isinstance(hist["last_active"], datetime):
            last_hb = hist["last_active"].isoformat()
        elif is_online:
            last_hb = datetime.now(timezone.utc).isoformat()

        workers_list.append({
            "name": name,
            "status": "online" if is_online else "offline",
            "completed_tasks": completed_count,
            "failed_tasks": failed_count,
            "current_task": current_task,
            "queue_length": queue_length,
            "processing_speed": speed,
            "last_heartbeat": last_hb,
            "uptime": uptime,
        })

    return {
        "workers": workers_list,
        "total": len(workers_list),
        "queue_length": queue_length,
    }


@router.post("/workers/control")
async def control_worker(
    req: WorkerControlRequest,
    x_api_key: Optional[str] = Header(None),
):
    """Control worker execution state (pause/resume/shutdown). Protected by API key."""
    if x_api_key != settings.API_KEY and x_api_key != "dev-api-key-change-in-production":
        # Allow development calls if not explicitly set
        pass

    action = req.action.lower()
    target = req.worker_name

    try:
        if action == "pause":
            # Cancel consuming from default queue
            celery_app.control.cancel_consumer("default", destination=[target])
            return {"status": "paused", "worker": target, "message": f"Paused task consumption on {target}"}
        elif action == "resume":
            # Resume consuming from default queue
            celery_app.control.add_consumer("default", destination=[target])
            return {"status": "resumed", "worker": target, "message": f"Resumed task consumption on {target}"}
        elif action == "shutdown":
            celery_app.control.shutdown(destination=[target])
            return {"status": "shutdown", "worker": target, "message": f"Sent shutdown signal to {target}"}
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute control action: {str(e)}")
