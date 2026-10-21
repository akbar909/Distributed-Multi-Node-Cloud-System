"""Pytest fixtures and configuration for backend testing."""

import io
import os
import shutil
import tempfile
import pytest
from pathlib import Path
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

# Ensure environment variables for testing
os.environ["STORAGE_PATH"] = tempfile.mkdtemp()
os.environ["DEPLOYMENT_MODE"] = "test"
os.environ["DEBUG"] = "true"

from app.main import app
from app.config import settings
from app.services.storage import storage_service


@pytest.fixture(scope="session", autouse=True)
def setup_test_storage():
    """Create isolated test storage directories and clean up afterwards."""
    test_dir = Path(settings.STORAGE_PATH)
    test_dir.mkdir(parents=True, exist_ok=True)
    storage_service.base_path = test_dir
    storage_service.originals_dir = test_dir / "originals"
    storage_service.processed_dir = test_dir / "processed"
    storage_service.temp_dir = test_dir / "temp"
    storage_service.originals_dir.mkdir(parents=True, exist_ok=True)
    storage_service.processed_dir.mkdir(parents=True, exist_ok=True)
    storage_service.temp_dir.mkdir(parents=True, exist_ok=True)

    yield

    shutil.rmtree(test_dir, ignore_errors=True)


@pytest.fixture
def test_client():
    """Synchronous test client for FastAPI endpoints."""
    with TestClient(app) as client:
        yield client


@pytest.fixture
def sample_rgb_image() -> bytes:
    """Generate a valid RGB JPEG image in-memory."""
    img = Image.new("RGB", (300, 200), color=(59, 130, 246))
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 50, 250, 150], fill=(239, 68, 68))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def sample_rgba_image() -> bytes:
    """Generate a valid RGBA PNG image with transparency."""
    img = Image.new("RGBA", (200, 200), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([20, 20, 180, 180], fill=(34, 197, 94, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def corrupted_image_bytes() -> bytes:
    """Generate corrupted, unparseable image content."""
    return b"NOT_A_VALID_IMAGE_HEADER_DATA_1234567890"
