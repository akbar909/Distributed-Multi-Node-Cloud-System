"""Image processing service implementing all 8 required Pillow operations."""

import io
import os
import logging
from typing import Dict, Any, Tuple
from PIL import Image, ImageFilter, ImageOps
from app.models.task import ProcessingConfig, ImageFormat

logger = logging.getLogger(__name__)


class ImageProcessor:
    """Handles pure image processing operations using Pillow."""

    @staticmethod
    def validate_image(image_bytes: bytes) -> Tuple[bool, str, Dict[str, Any]]:
        """Validate that the image is valid and not corrupted.
        
        Returns (is_valid, error_message, basic_metadata).
        """
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                img.verify()  # Verify integrity

            # Re-open after verify() since verify() closes/invalidates the stream
            with Image.open(io.BytesIO(image_bytes)) as img:
                width, height = img.size
                img_format = (img.format or "unknown").lower()
                metadata = {
                    "width": width,
                    "height": height,
                    "format": img_format,
                    "mode": img.mode,
                    "size_bytes": len(image_bytes),
                }

                if width > 10000 or height > 10000:
                    return False, f"Image dimensions ({width}x{height}) exceed maximum allowed 10000px", {}

                return True, "", metadata
        except Exception as e:
            return False, f"Corrupted or invalid image file: {str(e)}", {}

    @staticmethod
    def extract_metadata(image_bytes: bytes, filename: str = "") -> Dict[str, Any]:
        """Extract full metadata including dimensions, format, mode, and EXIF if present."""
        with Image.open(io.BytesIO(image_bytes)) as img:
            width, height = img.size
            aspect_ratio = round(width / height, 2) if height else 0
            metadata = {
                "filename": filename,
                "width": width,
                "height": height,
                "aspect_ratio": aspect_ratio,
                "format": (img.format or "unknown").upper(),
                "mode": img.mode,
                "file_size_bytes": len(image_bytes),
                "has_transparency": "A" in img.mode or "transparency" in img.info,
            }

            # Optional EXIF extraction
            exif_data = {}
            try:
                exif = img.getexif()
                if exif:
                    for k, v in exif.items():
                        # Exclude binary tags
                        if isinstance(v, (str, int, float)):
                            exif_data[str(k)] = v
            except Exception:
                pass
            metadata["exif"] = exif_data

            return metadata

    @staticmethod
    def _prepare_mode_for_format(img: Image.Image, target_format: str) -> Image.Image:
        """Ensure color mode is compatible with target format (e.g. RGB for JPEG)."""
        target_fmt = target_format.lower()
        if target_fmt in ("jpeg", "jpg"):
            if img.mode in ("RGBA", "LA", "P"):
                # Create white background for transparent images
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(img, mask=img.split()[-1] if "A" in img.mode else None)
                return background
            elif img.mode != "RGB":
                return img.convert("RGB")
        return img

    @staticmethod
    def resize(image_bytes: bytes, target_width: int, target_height: int) -> bytes:
        """Resize image to specific width and height."""
        with Image.open(io.BytesIO(image_bytes)) as img:
            # Preserve original format or default to PNG
            orig_format = img.format or "PNG"
            # High-quality Lanczos resampling
            resized = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
            resized = ImageProcessor._prepare_mode_for_format(resized, orig_format)

            out_buf = io.BytesIO()
            resized.save(out_buf, format=orig_format)
            return out_buf.getvalue()

    @staticmethod
    def thumbnail(image_bytes: bytes, max_size: int = 256) -> bytes:
        """Generate thumbnail maintaining aspect ratio within max_size x max_size box."""
        with Image.open(io.BytesIO(image_bytes)) as img:
            orig_format = img.format or "JPEG"
            thumb = img.copy()
            thumb.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            thumb = ImageProcessor._prepare_mode_for_format(thumb, orig_format)

            out_buf = io.BytesIO()
            thumb.save(out_buf, format=orig_format)
            return out_buf.getvalue()

    @staticmethod
    def compress(image_bytes: bytes, quality: int = 80) -> bytes:
        """Compress image with adjustable quality (1-100)."""
        with Image.open(io.BytesIO(image_bytes)) as img:
            orig_format = (img.format or "JPEG").upper()
            if orig_format not in ("JPEG", "WEBP"):
                # PNG uses optimize=True instead of quality
                out_buf = io.BytesIO()
                img.save(out_buf, format="PNG", optimize=True)
                return out_buf.getvalue()

            processed = ImageProcessor._prepare_mode_for_format(img, orig_format)
            out_buf = io.BytesIO()
            processed.save(out_buf, format=orig_format, quality=quality, optimize=True)
            return out_buf.getvalue()

    @staticmethod
    def convert_format(image_bytes: bytes, target_format: str) -> bytes:
        """Convert image between JPEG, PNG, and WebP."""
        target_fmt = target_format.lower()
        if target_fmt == "jpg":
            target_fmt = "jpeg"

        pillow_format = target_fmt.upper()

        with Image.open(io.BytesIO(image_bytes)) as img:
            converted = ImageProcessor._prepare_mode_for_format(img, pillow_format)
            out_buf = io.BytesIO()
            converted.save(out_buf, format=pillow_format)
            return out_buf.getvalue()

    @staticmethod
    def rotate(image_bytes: bytes, angle: int = 90) -> bytes:
        """Rotate image by specified angle degrees (expand=True to prevent cropping)."""
        with Image.open(io.BytesIO(image_bytes)) as img:
            orig_format = img.format or "PNG"
            # Pillow rotate counter-clockwise by default
            rotated = img.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
            rotated = ImageProcessor._prepare_mode_for_format(rotated, orig_format)

            out_buf = io.BytesIO()
            rotated.save(out_buf, format=orig_format)
            return out_buf.getvalue()

    @staticmethod
    def grayscale(image_bytes: bytes) -> bytes:
        """Apply grayscale transformation to image."""
        with Image.open(io.BytesIO(image_bytes)) as img:
            orig_format = img.format or "PNG"
            # Convert to L (8-bit pixels, black and white)
            gray = ImageOps.grayscale(img)

            out_buf = io.BytesIO()
            gray.save(out_buf, format=orig_format)
            return out_buf.getvalue()

    @staticmethod
    def blur(image_bytes: bytes, radius: float = 2.0) -> bytes:
        """Apply Gaussian blur with configurable radius."""
        with Image.open(io.BytesIO(image_bytes)) as img:
            orig_format = img.format or "PNG"
            blurred = img.filter(ImageFilter.GaussianBlur(radius=radius))
            blurred = ImageProcessor._prepare_mode_for_format(blurred, orig_format)

            out_buf = io.BytesIO()
            blurred.save(out_buf, format=orig_format)
            return out_buf.getvalue()


image_processor = ImageProcessor()
