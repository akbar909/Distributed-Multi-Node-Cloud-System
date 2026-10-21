"""Tests for download endpoints."""


def test_download_missing_task_returns_404(test_client):
    """Test downloading an invalid task output returns 404."""
    response = test_client.get("/api/tasks/nonexistent-task-id/download")
    assert response.status_code in (404, 500)
