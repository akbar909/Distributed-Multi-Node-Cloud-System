"""Unit tests for all 8 Pillow image processing operations and validation routines."""

import io
from PIL import Image
from app.services.image_processor import image_processor


def test_validate_valid_image(sample_rgb_image):
    """Test that a valid image passes integrity validation with correct dimensions."""
    is_valid, err, meta = image_processor.validate_image(sample_rgb_image)
    assert is_valid is True
    assert err == ""
    assert meta["width"] == 300
    assert meta["height"] == 200
    assert meta["format"] == "jpeg"


def test_validate_corrupted_image(corrupted_image_bytes):
    """Test that corrupted bytes are safely rejected."""
    is_valid, err, meta = image_processor.validate_image(corrupted_image_bytes)
    assert is_valid is False
    assert "Corrupted or invalid" in err


def test_operation_resize(sample_rgb_image):
    """Test resize operation produces target width and height."""
    result = image_processor.resize(sample_rgb_image, target_width=150, target_height=100)
    with Image.open(io.BytesIO(result)) as img:
        assert img.size == (150, 100)


def test_operation_thumbnail(sample_rgb_image):
    """Test thumbnail operation maintains aspect ratio within bounding box."""
    result = image_processor.thumbnail(sample_rgb_image, max_size=120)
    with Image.open(io.BytesIO(result)) as img:
        w, h = img.size
        assert w <= 120 and h <= 120
        # Original ratio was 300:200 (1.5)
        assert round(w / h, 1) == 1.5


def test_operation_compress(sample_rgb_image):
    """Test compression reduces file size or maintains quality."""
    compressed_low = image_processor.compress(sample_rgb_image, quality=20)
    compressed_high = image_processor.compress(sample_rgb_image, quality=95)
    assert len(compressed_low) < len(compressed_high)


def test_operation_convert_format_png_to_jpeg(sample_rgba_image):
    """Test format conversion from RGBA PNG to JPEG handles transparency safely."""
    result = image_processor.convert_format(sample_rgba_image, target_format="jpeg")
    with Image.open(io.BytesIO(result)) as img:
        assert img.format == "JPEG"
        assert img.mode == "RGB"


def test_operation_convert_format_jpeg_to_webp(sample_rgb_image):
    """Test format conversion to modern WebP format."""
    result = image_processor.convert_format(sample_rgb_image, target_format="webp")
    with Image.open(io.BytesIO(result)) as img:
        assert img.format == "WEBP"


def test_operation_rotate(sample_rgb_image):
    """Test rotation by 90 degrees inverts dimensions without cropping."""
    # Original is 300 x 200
    result = image_processor.rotate(sample_rgb_image, angle=90)
    with Image.open(io.BytesIO(result)) as img:
        assert img.size == (200, 300)


def test_operation_grayscale(sample_rgb_image):
    """Test grayscale conversion transforms color image to single channel."""
    result = image_processor.grayscale(sample_rgb_image)
    with Image.open(io.BytesIO(result)) as img:
        assert img.mode == "L"


def test_operation_blur(sample_rgb_image):
    """Test Gaussian blur produces valid blurred image."""
    result = image_processor.blur(sample_rgb_image, radius=4.0)
    assert len(result) > 0
    with Image.open(io.BytesIO(result)) as img:
        assert img.size == (300, 200)


def test_operation_metadata(sample_rgb_image):
    """Test metadata extraction returns dimensions, format, mode, and aspect ratio."""
    meta = image_processor.extract_metadata(sample_rgb_image, filename="test.jpg")
    assert meta["width"] == 300
    assert meta["height"] == 200
    assert meta["aspect_ratio"] == 1.5
    assert meta["format"] == "JPEG"
    assert meta["mode"] == "RGB"
    assert meta["file_size_bytes"] == len(sample_rgb_image)
