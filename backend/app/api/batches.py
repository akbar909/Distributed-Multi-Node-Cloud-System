"""Batch management API for submitting and querying image processing batches."""

import os
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.database import get_database
from app.config import settings
from app.models.task import ImageOperation, ProcessingConfig, TaskStatus
from app.models.batch import BatchStatus
from app.services.storage import storage_service
from app.tasks.image_tasks import process_image

router = APIRouter()


class CreateBatchRequest(BaseModel):
    file_refs: List[str]
    operations: List[ImageOperation]
    config: ProcessingConfig = ProcessingConfig()


@router.post("/batches", status_code=status.HTTP_201_CREATED)
async def create_batch(request: CreateBatchRequest):
    """Create a processing batch from uploaded file references and dispatch tasks to Celery."""
    if not request.file_refs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file references provided.",
        )
    if not request.operations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one processing operation must be selected.",
        )

    db = get_database()
    batch_id = str(uuid.uuid4())
    task_ids = []
    task_docs = []

    for ref_id in request.file_refs:
        # Locate original file in storage
        ref_dir = storage_service.originals_dir / ref_id
        if not ref_dir.exists():
            continue

        files = list(ref_dir.iterdir())
        if not files:
            continue

        original_file = files[0]
        filename = original_file.name
        rel_path = f"originals/{ref_id}/{filename}"
        task_id = str(uuid.uuid4())

        task_doc = {
            "task_id": task_id,
            "batch_id": batch_id,
            "filename": filename,
            "original_filename": filename,
            "original_path": rel_path,
            "status": TaskStatus.QUEUED,
            "operations": [op.value for op in request.operations],
            "config": request.config.model_dump(),
            "outputs": [],
            "worker_name": None,
            "error": None,
            "retry_count": 0,
            "max_retries": 3,
            "created_at": datetime.now(timezone.utc),
            "started_at": None,
            "completed_at": None,
            "processing_time": None,
        }
        task_docs.append(task_doc)
        task_ids.append(task_id)

    if not task_docs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not find uploaded files for provided references.",
        )

    # Insert tasks and batch record into MongoDB
    await db.tasks.insert_many(task_docs)
    batch_doc = {
        "batch_id": batch_id,
        "task_ids": task_ids,
        "total_tasks": len(task_ids),
        "completed_tasks": 0,
        "failed_tasks": 0,
        "status": BatchStatus.PENDING,
        "created_at": datetime.now(timezone.utc),
        "completed_at": None,
    }
    await db.batches.insert_one(batch_doc)

    # Dispatch tasks to Celery worker queue
    for tid in task_ids:
        process_image.delay(tid)

    return {
        "batch_id": batch_id,
        "task_ids": task_ids,
        "message": f"Successfully queued {len(task_ids)} image tasks for processing.",
    }


@router.get("/batches")
async def list_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Get paginated list of batches."""
    db = get_database()
    skip = (page - 1) * page_size
    total = await db.batches.count_documents({})

    cursor = db.batches.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
    batches = await cursor.to_list(length=page_size)

    # Format datetime objects to ISO strings
    for b in batches:
        if isinstance(b.get("created_at"), datetime):
            b["created_at"] = b["created_at"].isoformat()
        if isinstance(b.get("completed_at"), datetime):
            b["completed_at"] = b["completed_at"].isoformat()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return {
        "items": batches,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/batches/{batch_id}")
async def get_batch_detail(batch_id: str):
    """Get batch details with all associated tasks."""
    db = get_database()
    batch = await db.batches.find_one({"batch_id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    tasks_cursor = db.tasks.find({"batch_id": batch_id}, {"_id": 0}).sort("created_at", 1)
    tasks = await tasks_cursor.to_list(length=500)

    for t in tasks:
        for dt_field in ("created_at", "started_at", "completed_at"):
            if isinstance(t.get(dt_field), datetime):
                t[dt_field] = t[dt_field].isoformat()

    if isinstance(batch.get("created_at"), datetime):
        batch["created_at"] = batch["created_at"].isoformat()
    if isinstance(batch.get("completed_at"), datetime):
        batch["completed_at"] = batch["completed_at"].isoformat()

    batch["tasks"] = tasks
    return batch


@router.get("/batches/{batch_id}/download")
async def download_batch_zip(batch_id: str):
    """Download a ZIP archive containing all processed outputs for a batch."""
    db = get_database()
    batch = await db.batches.find_one({"batch_id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    tasks_cursor = db.tasks.find({"batch_id": batch_id})
    tasks = await tasks_cursor.to_list(length=500)

    zip_path = storage_service.create_zip_for_batch(batch_id, tasks)
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="No processed files available for download.")

    return FileResponse(
        path=str(zip_path),
        filename=f"batch_{batch_id}_outputs.zip",
        media_type="application/zip",
    )
