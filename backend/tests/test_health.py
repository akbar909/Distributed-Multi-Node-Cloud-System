"""Integration tests for the service health check endpoint."""


def test_health_check_endpoint(test_client):
    """Test GET /api/health returns 200 with service information and deployment mode."""
    response = test_client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "deployment_mode" in data
    assert "services" in data
    assert data["services"]["api"]["status"] == "healthy"
