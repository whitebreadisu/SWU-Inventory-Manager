"""Integration tests for GET /api/sets endpoints.

Run inside the backend container:
    docker compose exec backend pytest app/tests/test_sets_api.py -v
"""
import os
import pytest

pytestmark = pytest.mark.skipif(
    "DATABASE_URL" not in os.environ,
    reason="requires DATABASE_URL — run inside the backend container",
)


class TestListSets:
    def test_returns_200_with_list(self, client):
        response = client.get("/api/sets")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_each_set_has_required_fields(self, client):
        response = client.get("/api/sets")
        for s in response.json():
            assert "id" in s
            assert "code" in s
            assert "name" in s
            assert "has_unique_variant_numbers" in s

    def test_known_set_codes_present(self, client):
        codes = {s["code"] for s in client.get("/api/sets").json()}
        assert {"SOR", "SHD", "TWI", "JTL", "LOF", "SEC", "LAW"} <= codes


class TestGetSetByCode:
    def test_returns_200_for_valid_code(self, client):
        response = client.get("/api/sets/SOR")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "SOR"
        assert data["name"] == "Spark of Rebellion"

    def test_case_insensitive_lookup(self, client):
        response = client.get("/api/sets/sor")
        assert response.status_code == 200
        assert response.json()["code"] == "SOR"

    def test_returns_404_for_unknown_code(self, client):
        response = client.get("/api/sets/ZZZ")
        assert response.status_code == 404
