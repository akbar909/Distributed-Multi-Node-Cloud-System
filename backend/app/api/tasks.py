"""Task monitoring, retries, and artifact downloads API."""

import re
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse
from app.database import get_database
from app.models.task import TaskStatus
from app.services.storage import storage_service
from app.tasks.image_tasks import process_image

router = APIRouter()


def format_task_doc(t: dict) -> dict:
    """Format MongoDB datetime objects to ISO strings."""
    t.pop("_id", None)
    for dt_field in ("created_at", "started_at", "completed_at"):
        if isinstance(t.get(dt_field), datetime):
            t[dt_field] = t[dt_field].isoformat()
    return t


@router.get("/tasks")
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
):
    """List tasks with pagination, status filtering, and search by filename/worker/ID."""
    db = get_database()
    query = {}

    if status and status.lower() != "all":
        query["status"] = status.lower()

    if search:
        safe_search = re.escape(search)
        query["$or"] = [
            {"filename": {"$regex": safe_search, "$options": "i"}},
            {"task_id": {"$regex": safe_search, "$options": "i"}},
            {"worker_name": {"$regex": safe_search, "$options": "i"}},
        ]

    total = await db.tasks.count_documents(query)
    direction = -1 if sort_order.lower() == "desc" else 1

    skip = (page - 1) * page_size
    cursor = db.tasks.find(query).sort(sort_by, direction).skip(skip).limit(page_size)
    tasks = await cursor.to_list(length=page_size)

    formatted_tasks = [format_task_doc(t) for t in tasks]
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return {
        "items": formatted_tasks,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    """Retrieve full details of a single task by ID."""
    db = get_database()
    task = await db.tasks.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found.")
    return format_task_doc(task)


@router.post("/tasks/{task_id}/retry")
async def retry_task(task_id: str):
    """Retry an eligible failed task."""
    db = get_database()
    task = await db.tasks.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found.")

    if task.get("status") not in (TaskStatus.FAILED, TaskStatus.RETRYING):
        raise HTTPException(
            status_code=400,
            detail=f"Task is currently '{task.get('status')}'; only failed tasks can be retried.",
        )

    # Reset task state for retry
    await db.tasks.update_one(
        {"task_id": task_id},
        {
            "$set": {
                "status": TaskStatus.QUEUED,
                "error": None,
                "started_at": None,
                "completed_at": None,
                "processing_time": None,
            }
        },
    )

    # Re-dispatch to Celery
    process_image.delay(task_id)

    updated_task = await db.tasks.find_one({"task_id": task_id})
    return format_task_doc(updated_task)


@router.get("/tasks/{task_id}/download")
async def download_task_output(task_id: str, operation: Optional[str] = None):
    """Download output for a task. If operation is specified, download that single file.
    Otherwise, if multiple outputs exist, download a ZIP archive."""
    db = get_database()
    task = await db.tasks.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    outputs = task.get("outputs", [])
    if not outputs:
        raise HTTPException(status_code=404, detail="No output files available for this task.")

    # Filter by operation if specified
    if operation:
        matching = [o for o in outputs if o.get("operation") == operation]
        if not matching:
            raise HTTPException(status_code=404, detail=f"No output found for operation '{operation}'.")
        target_out = matching[0]
        abs_path = storage_service.get_file_absolute_path(target_out["path"])
        if not abs_path.exists():
            raise HTTPException(status_code=404, detail="File missing from storage.")
        return FileResponse(path=str(abs_path), filename=target_out["filename"])

    # If single output, return file directly
    if len(outputs) == 1:
        single_out = outputs[0]
        abs_path = storage_service.get_file_absolute_path(single_out["path"])
        if not abs_path.exists():
            raise HTTPException(status_code=404, detail="File missing from storage.")
        return FileResponse(path=str(abs_path), filename=single_out["filename"])

    # Multiple outputs: generate ZIP archive
    file_rel_paths = [o["path"] for o in outputs if "path" in o]
    zip_path = storage_service.create_zip_for_task(task_id, file_rel_paths)
    if not zip_path.exists():
        raise HTTPException(status_code=500, detail="Failed to create zip package.")

    return FileResponse(
        path=str(zip_path),
        filename=f"task_{task_id}_outputs.zip",
        media_type="application/zip",
    )
