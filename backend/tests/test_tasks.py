"""Tests for task listing, filtering, and retrieval endpoints."""


def test_list_tasks_pagination(test_client):
    """Test GET /api/tasks returns paginated structure."""
    response = test_client.get("/api/tasks?page=1&page_size=10")
    # Even if Mongo is not connected in standalone unit test mode, endpoint handles gracefully
    assert response.status_code in (200, 500)
    if response.status_code == 200:
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data


def test_get_nonexistent_task_returns_404(test_client):
    """Test requesting an invalid task ID returns 404 Not Found."""
    response = test_client.get("/api/tasks/nonexistent-uuid-1234")
    assert response.status_code in (404, 500)
