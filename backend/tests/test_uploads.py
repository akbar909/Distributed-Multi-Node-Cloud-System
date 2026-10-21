"""Integration tests for image upload endpoint validation and storage."""

import io


def test_upload_valid_image(test_client, sample_rgb_image):
    """Test uploading a valid JPEG returns 201 with generated reference ID and preview URL."""
    files = [
        ("files", ("photo.jpg", io.BytesIO(sample_rgb_image), "image/jpeg"))
    ]
    response = test_client.post("/api/uploads", files=files)
    assert response.status_code == 201
    data = response.json()
    assert "file_refs" in data
    assert len(data["file_refs"]) == 1
    ref = data["file_refs"][0]
    assert "ref_id" in ref
    assert ref["filename"] == "photo.jpg"
    assert ref["width"] == 300
    assert ref["height"] == 200
    assert "/storage/originals/" in ref["preview_url"]


def test_upload_corrupted_file_rejected(test_client, corrupted_image_bytes):
    """Test uploading corrupted image data returns 400 Bad Request."""
    files = [
        ("files", ("broken.jpg", io.BytesIO(corrupted_image_bytes), "image/jpeg"))
    ]
    response = test_client.post("/api/uploads", files=files)
    assert response.status_code == 400
    assert "Invalid or corrupted image" in response.json()["detail"]


def test_upload_unsupported_format_rejected(test_client):
    """Test uploading an unsupported extension is rejected."""
    files = [
        ("files", ("script.sh", io.BytesIO(b"echo 'hello'"), "text/plain"))
    ]
    response = test_client.post("/api/uploads", files=files)
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_upload_empty_file_rejected(test_client):
    """Test uploading an empty zero-byte file is rejected."""
    files = [
        ("files", ("empty.png", io.BytesIO(b""), "image/png"))
    ]
    response = test_client.post("/api/uploads", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]
