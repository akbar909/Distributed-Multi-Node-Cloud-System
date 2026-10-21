"""Storage service supporting local filesystem storage with path-traversal protection and optional AWS S3."""

import os
import io
import re
import shutil
import zipfile
import logging
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and special character issues."""
    name = os.path.basename(filename)
    # Remove any characters other than alphanumeric, dots, underscores, dashes
    clean_name = re.sub(r"[^\w\.-]", "_", name)
    return clean_name or "image"


class StorageService:
    def __init__(self):
        self.backend = settings.STORAGE_BACKEND.lower()
        self.base_path = Path(settings.STORAGE_PATH).resolve()
        self.originals_dir = self.base_path / "originals"
        self.processed_dir = self.base_path / "processed"
        self.temp_dir = self.base_path / "temp"

        # Ensure local directories exist
        self.originals_dir.mkdir(parents=True, exist_ok=True)
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

        self.s3_client = None
        if self.backend == "s3" and settings.S3_BUCKET_NAME:
            try:
                import boto3
                self.s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
                    region_name=settings.AWS_REGION or "us-east-1",
                )
                logger.info(f"Initialized S3 storage client for bucket {settings.S3_BUCKET_NAME}")
            except Exception as e:
                logger.warning(f"Failed to initialize S3 client: {e}. Falling back to local storage.")
                self.backend = "local"

    def _resolve_safe_path(self, parent: Path, child_rel: str) -> Path:
        """Resolve a path safely within a parent directory to prevent directory traversal attacks."""
        resolved = (parent / child_rel).resolve()
        if not str(resolved).startswith(str(parent)):
            raise ValueError("Directory traversal attempt detected.")
        return resolved

    def save_upload(self, content: bytes, ref_id: str, original_filename: str) -> str:
        """Save an uploaded original file and return its storage path."""
        safe_name = sanitize_filename(original_filename)
        ref_dir = self.originals_dir / ref_id
        ref_dir.mkdir(parents=True, exist_ok=True)

        target_path = self._resolve_safe_path(ref_dir, safe_name)
        with open(target_path, "wb") as f:
            f.write(content)

        if self.backend == "s3" and self.s3_client:
            s3_key = f"originals/{ref_id}/{safe_name}"
            self.s3_client.upload_file(str(target_path), settings.S3_BUCKET_NAME, s3_key)

        # Return path relative to base storage
        rel_path = f"originals/{ref_id}/{safe_name}"
        return rel_path

    def get_file_absolute_path(self, rel_path: str) -> Path:
        """Get absolute Path for a given relative storage path."""
        return self._resolve_safe_path(self.base_path, rel_path)

    def get_processed_dir_for_task(self, task_id: str) -> Path:
        """Get directory for a task's processed outputs, ensuring it exists."""
        task_dir = self._resolve_safe_path(self.processed_dir, task_id)
        task_dir.mkdir(parents=True, exist_ok=True)
        return task_dir

    def cleanup_task_outputs(self, task_id: str) -> None:
        """Clean up existing outputs for a task before re-processing (idempotency)."""
        task_dir = self._resolve_safe_path(self.processed_dir, task_id)
        if task_dir.exists():
            shutil.rmtree(task_dir, ignore_errors=True)
            task_dir.mkdir(parents=True, exist_ok=True)

    def save_processed_bytes(
        self,
        task_id: str,
        filename: str,
        content: bytes,
    ) -> str:
        """Save a processed image from bytes and return relative path."""
        task_dir = self.get_processed_dir_for_task(task_id)
        safe_name = sanitize_filename(filename)
        out_path = self._resolve_safe_path(task_dir, safe_name)

        with open(out_path, "wb") as f:
            f.write(content)

        if self.backend == "s3" and self.s3_client:
            s3_key = f"processed/{task_id}/{safe_name}"
            self.s3_client.upload_file(str(out_path), settings.S3_BUCKET_NAME, s3_key)

        return f"processed/{task_id}/{safe_name}"

    def create_zip_for_task(self, task_id: str, file_rel_paths: List[str]) -> Path:
        """Create a zip archive of outputs for a single task."""
        task_dir = self.get_processed_dir_for_task(task_id)
        zip_path = task_dir / f"task_{task_id}_outputs.zip"

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for rel in file_rel_paths:
                file_abs = self.get_file_absolute_path(rel)
                if file_abs.exists() and file_abs.is_file():
                    zf.write(file_abs, arcname=file_abs.name)

        return zip_path

    def create_zip_for_batch(self, batch_id: str, tasks_data: List[Dict[str, Any]]) -> Path:
        """Create a zip archive containing all outputs from a batch."""
        batch_zip_dir = self.temp_dir / "batches"
        batch_zip_dir.mkdir(parents=True, exist_ok=True)
        zip_path = batch_zip_dir / f"batch_{batch_id}_all.zip"

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for task in tasks_data:
                task_id = task.get("task_id", "unknown")
                outputs = task.get("outputs", [])
                for out in outputs:
                    rel_path = out.get("path")
                    if rel_path:
                        file_abs = self.get_file_absolute_path(rel_path)
                        if file_abs.exists() and file_abs.is_file():
                            arc_name = f"{task_id}/{file_abs.name}"
                            zf.write(file_abs, arcname=arc_name)

        return zip_path


storage_service = StorageService()
