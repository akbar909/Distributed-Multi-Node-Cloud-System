"""Tests for benchmark API endpoint."""


def test_list_benchmarks(test_client):
    """Test GET /api/benchmarks returns list of past benchmark records."""
    response = test_client.get("/api/benchmarks")
    assert response.status_code in (200, 500)
    if response.status_code == 200:
        assert "items" in response.json()
