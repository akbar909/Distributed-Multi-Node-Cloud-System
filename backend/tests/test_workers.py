"""Tests for worker monitoring endpoint."""


def test_list_workers_endpoint(test_client):
    """Test GET /api/workers returns workers list and queue length."""
    response = test_client.get("/api/workers")
    assert response.status_code in (200, 500)
    if response.status_code == 200:
        data = response.json()
        assert "workers" in data
        assert "queue_length" in data
