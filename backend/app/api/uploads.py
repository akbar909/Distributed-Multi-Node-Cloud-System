"""Image upload API with format validation, size limit checks, and image integrity verification."""

import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.config import settings
from app.services.storage import storage_service, sanitize_filename
from app.services.image_processor import image_processor

router = APIRouter()


@router.post("/uploads", status_code=status.HTTP_201_CREATED)
async def upload_images(files: List[UploadFile] = File(...)):
    """Upload one or more images.
    
    Validates file extension, maximum file size, and image integrity using Pillow.
    Returns reference IDs and preview URLs for batch creation.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided for upload.",
        )

    uploaded_files = []
    allowed_exts = settings.allowed_extension_list

    for file in files:
        # Check filename
        filename = file.filename or "image.png"
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in allowed_exts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{ext}' in file '{filename}'. Allowed formats: {', '.join(allowed_exts)}",
            )

        # Read content and check size
        content = await file.read()
        if len(content) > settings.max_upload_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File '{filename}' exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
            )

        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{filename}' is empty.",
            )

        # Validate image integrity with Pillow
        is_valid, error_msg, metadata = image_processor.validate_image(content)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or corrupted image '{filename}': {error_msg}",
            )

        ref_id = str(uuid.uuid4())
        safe_name = sanitize_filename(filename)
        rel_path = storage_service.save_upload(content, ref_id, safe_name)

        uploaded_files.append({
            "ref_id": ref_id,
            "filename": filename,
            "size": len(content),
            "preview_url": f"/storage/{rel_path}",
            "width": metadata.get("width"),
            "height": metadata.get("height"),
            "format": metadata.get("format"),
        })

    return {"file_refs": uploaded_files}
