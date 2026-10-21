"""Celery background tasks for image processing with idempotency and retry handling."""

import os
import json
import logging
from datetime import datetime, timezone
from celery.exceptions import MaxRetriesExceededError
from app.tasks.celery_app import celery_app
from app.database import get_sync_database
from app.services.storage import storage_service
from app.services.image_processor import image_processor
from app.models.task import TaskStatus, ImageOperation

logger = logging.getLogger(__name__)


def update_batch_progress(db, batch_id: str):
    """Recalculate and update the aggregate batch status in MongoDB."""
    try:
        tasks = list(db.tasks.find({"batch_id": batch_id}))
        if not tasks:
            return

        total = len(tasks)
        completed = sum(1 for t in tasks if t.get("status") == TaskStatus.COMPLETED)
        failed = sum(1 for t in tasks if t.get("status") == TaskStatus.FAILED)

        if completed == total:
            new_status = "completed"
        elif completed + failed == total:
            new_status = "partial" if completed > 0 else "failed"
        elif any(t.get("status") in (TaskStatus.PROCESSING, TaskStatus.RETRYING) for t in tasks):
            new_status = "processing"
        else:
            new_status = "pending"

        update_fields = {
            "completed_tasks": completed,
            "failed_tasks": failed,
            "status": new_status,
        }
        if new_status in ("completed", "partial", "failed"):
            update_fields["completed_at"] = datetime.now(timezone.utc)

        db.batches.update_one({"batch_id": batch_id}, {"$set": update_fields})
    except Exception as e:
        logger.error(f"Error updating batch progress for {batch_id}: {e}")


@celery_app.task(
    bind=True,
    name="app.tasks.image_tasks.process_image",
    max_retries=3,
    default_retry_delay=5,
    acks_late=True,
)
def process_image(self, task_id: str) -> dict:
    """Process a single image task with full error handling, bounded retries, and idempotency."""
    db = get_sync_database()
    worker_name = getattr(self.request, "hostname", None) or "worker"

    task = db.tasks.find_one({"task_id": task_id})
    if not task:
        logger.error(f"Task {task_id} not found in database.")
        return {"task_id": task_id, "status": "not_found"}

    batch_id = task.get("batch_id")
    started_at = datetime.now(timezone.utc)

    # Update task state to processing
    db.tasks.update_one(
        {"task_id": task_id},
        {
            "$set": {
                "status": TaskStatus.PROCESSING,
                "worker_name": worker_name,
                "started_at": started_at,
                "error": None,
            }
        },
    )
    if batch_id:
        update_batch_progress(db, batch_id)

    try:
        # 1. Clean up any previous task outputs to guarantee idempotency on retry
        storage_service.cleanup_task_outputs(task_id)

        # 2. Read the original image from shared storage
        original_rel_path = task["original_path"]
        original_abs_path = storage_service.get_file_absolute_path(original_rel_path)

        if not original_abs_path.exists():
            raise FileNotFoundError(f"Original image file not found at {original_abs_path}")

        with open(original_abs_path, "rb") as f:
            original_bytes = f.read()

        # 3. Validate image integrity
        is_valid, val_err, meta = image_processor.validate_image(original_bytes)
        if not is_valid:
            raise ValueError(f"Image validation failed: {val_err}")

        # 4. Execute all requested operations
        operations = task.get("operations", [])
        config = task.get("config", {})
        base_name, ext = os.path.splitext(task.get("original_filename", "image"))
        outputs = []

        for op in operations:
            if op == ImageOperation.RESIZE:
                target_w = config.get("width") or 800
                target_h = config.get("height") or 600
                res_bytes = image_processor.resize(original_bytes, target_w, target_h)
                out_name = f"{base_name}_resized_{target_w}x{target_h}{ext}"
                rel_path = storage_service.save_processed_bytes(task_id, out_name, res_bytes)
                outputs.append({
                    "operation": op,
                    "filename": out_name,
                    "path": rel_path,
                    "size": len(res_bytes),
                    "width": target_w,
                    "height": target_h,
                })

            elif op == ImageOperation.THUMBNAIL:
                size = config.get("thumbnail_size") or 256
                thumb_bytes = image_processor.thumbnail(original_bytes, size)
                out_name = f"{base_name}_thumb_{size}{ext}"
                rel_path = storage_service.save_processed_bytes(task_id, out_name, thumb_bytes)
                outputs.append({
                    "operation": op,
                    "filename": out_name,
                    "path": rel_path,
                    "size": len(thumb_bytes),
                })

            elif op == ImageOperation.COMPRESS:
                quality = config.get("quality") or 80
                comp_bytes = image_processor.compress(original_bytes, quality)
                out_name = f"{base_name}_q{quality}{ext}"
                rel_path = storage_service.save_processed_bytes(task_id, out_name, comp_bytes)
                outputs.append({
                    "operation": op,
                    "filename": out_name,
                    "path": rel_path,
                    "size": len(comp_bytes),
                })

            elif op == ImageOperation.CONVERT:
                target_fmt = (config.get("format") or "webp").lower()
                target_ext = f".{target_fmt}" if target_fmt != "jpeg" else ".jpg"
                conv_bytes = image_processor.convert_format(original_bytes, target_fmt)
                out_name = f"{base_name}_converted{target_ext}"
                rel_path = storage_service.save_processed_bytes(task_id, out_name, conv_bytes)
                outputs.append({
                    "operation": op,
                    "filename": out_name,
                    "path": rel_path,
                    "size": len(conv_bytes),
                    "format": target_fmt,
                })

            elif op == ImageOperation.ROTATE:
                angle = config.get("rotate_angle") or 90
                rot_bytes = image_processor.rotate(original_bytes, angle)
                out_name = f"{base_name}_rot{angle}{ext}"
                rel_path = storage_service.save_processed_bytes(task_id, out_name, rot_bytes)
                outputs.append({
                    "operation": op,
                    "filename": out_name,
                    "path": rel_path,
                    "size": len(rot_bytes),
                })

            elif op == ImageOperation.GRAYSCALE:
                gray_bytes = image_processor.grayscale(original_bytes)
                out_name = f"{base_name}_grayscale{ext}"
                rel_path = storage_service.save_processed_bytes(task_id, out_name, gray_bytes)
                outputs.append({
                    "operation": op,
                    "filename": out_name,
                    "path": rel_path,
                    "size": len(gray_bytes),
                })

            elif op == ImageOperation.BLUR:
                radius = float(config.get("blur_radius") or 2.0)
                blur_bytes = image_processor.blur(original_bytes, radius)
                out_name = f"{base_name}_blur_{radius}{ext}"
                rel_path = storage_service.save_processed_bytes(task_id, out_name, blur_bytes)
                outputs.append({
                    "operation": op,
                    "filename": out_name,
                    "path": rel_path,
                    "size": len(blur_bytes),
                })

            elif op == ImageOperation.METADATA:
                meta = image_processor.extract_metadata(original_bytes, task.get("original_filename", ""))
                # Also save metadata as JSON in output folder
                json_bytes = json.dumps(meta, indent=2).encode("utf-8")
                out_name = f"{base_name}_metadata.json"
                rel_path = storage_service.save_processed_bytes(task_id, out_name, json_bytes)
                outputs.append({
                    "operation": op,
                    "filename": out_name,
                    "path": rel_path,
                    "size": len(json_bytes),
                    "metadata": meta,
                })

        # 5. Success: record completion
        completed_at = datetime.now(timezone.utc)
        processing_time = round((completed_at - started_at).total_seconds(), 3)

        db.tasks.update_one(
            {"task_id": task_id},
            {
                "$set": {
                    "status": TaskStatus.COMPLETED,
                    "outputs": outputs,
                    "completed_at": completed_at,
                    "processing_time": processing_time,
                    "error": None,
                }
            },
        )
        if batch_id:
            update_batch_progress(db, batch_id)

        logger.info(f"Task {task_id} completed successfully in {processing_time}s by {worker_name}")
        return {"task_id": task_id, "status": "completed", "processing_time": processing_time}

    except Exception as exc:
        retries = self.request.retries
        max_retries = task.get("max_retries", 3)
        error_msg = str(exc)
        logger.warning(f"Task {task_id} failed on worker {worker_name} (retry {retries}/{max_retries}): {error_msg}")

        if retries < max_retries:
            db.tasks.update_one(
                {"task_id": task_id},
                {
                    "$set": {
                        "status": TaskStatus.RETRYING,
                        "error": error_msg,
                        "retry_count": retries + 1,
                    }
                },
            )
            if batch_id:
                update_batch_progress(db, batch_id)
            raise self.retry(exc=exc, countdown=5 * (retries + 1))
        else:
            db.tasks.update_one(
                {"task_id": task_id},
                {
                    "$set": {
                        "status": TaskStatus.FAILED,
                        "error": error_msg,
                        "retry_count": retries,
                        "completed_at": datetime.now(timezone.utc),
                    }
                },
            )
            if batch_id:
                update_batch_progress(db, batch_id)
            return {"task_id": task_id, "status": "failed", "error": error_msg}
