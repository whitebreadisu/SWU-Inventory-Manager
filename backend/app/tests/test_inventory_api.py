"""Integration tests for GET /api/inventory, POST /api/inventory/{id}/increment,
and POST /api/inventory/{id}/decrement endpoints.

Ported to base_cards/card_variants (BL-33 step 1): "card_id" is now
"variant_id" in increment/decrement responses, and the fixture catalog
(conftest's seed_minimal_catalog) replaces the old bulk CSV-seeded one.

Run inside the backend container:
    docker compose exec backend pytest app/tests/test_inventory_api.py -v
"""

import os

import pytest

pytestmark = pytest.mark.skipif(
    "DATABASE_URL" not in os.environ,
    reason="requires DATABASE_URL — run inside the backend container",
)


class TestListInventory:
    def test_returns_200_with_list(self, client):
        response = client.get("/api/inventory")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_each_record_has_card_and_quantity_fields(self, client):
        records = client.get("/api/inventory").json()
        assert len(records) > 0
        for r in records[:5]:
            assert "id" in r
            assert "set_code" in r
            assert "base_card_number" in r
            assert "card_number" in r
            assert "name" in r
            assert "quantity" in r
            assert isinstance(r["quantity"], int)
            assert r["quantity"] >= 0

    def test_quantity_zero_cards_are_included(self, client):
        records = client.get("/api/inventory").json()
        quantities = [r["quantity"] for r in records]
        assert 0 in quantities, "Cards with quantity 0 should be included"


class TestIncrementCard:
    SINGLETON_TYPES = {"Leader", "Base"}

    def _find_solo_zero_card(self, client, *, exclude_types: set | None = None):
        """Return a non-Leader/Base variant card that is the sole variant for its
        base card and has quantity 0, so the base-card total starts at 0."""
        from collections import Counter

        records = client.get("/api/inventory").json()
        exclude = exclude_types or self.SINGLETON_TYPES
        base_counts = Counter((r["set_code"], r["base_card_number"]) for r in records)
        return next(
            (
                r
                for r in records
                if r["quantity"] == 0
                and r["type"] not in exclude
                and base_counts[(r["set_code"], r["base_card_number"])] == 1
            ),
            None,
        )

    def _find_zero_singleton(self, client):
        """Return a Leader or Base variant card with quantity 0."""
        records = client.get("/api/inventory").json()
        return next(
            (
                r
                for r in records
                if r["quantity"] == 0 and r["type"] in self.SINGLETON_TYPES
            ),
            None,
        )

    def test_increment_happy_path_returns_updated_quantity(self, client):
        solo = self._find_solo_zero_card(client)
        assert solo is not None, "fixture should include an isolated zero-qty card"

        variant_id = solo["id"]
        response = client.post(f"/api/inventory/{variant_id}/increment")
        assert response.status_code == 200
        body = response.json()
        assert body["variant_id"] == variant_id
        assert body["quantity"] == 1
        assert body["blocked"] is False

        # Restore
        client.post(f"/api/inventory/{variant_id}/decrement")

    def test_increment_to_playset_returns_playset_complete(self, client):
        solo = self._find_solo_zero_card(client)
        assert solo is not None, "fixture should include an isolated zero-qty card"

        variant_id = solo["id"]
        client.post(f"/api/inventory/{variant_id}/increment")
        client.post(f"/api/inventory/{variant_id}/increment")
        response = client.post(f"/api/inventory/{variant_id}/increment")
        assert response.status_code == 200
        body = response.json()
        assert body["playset_complete"] is True
        assert body["quantity"] == 3

        # Restore
        for _ in range(3):
            client.post(f"/api/inventory/{variant_id}/decrement")

    def test_increment_beyond_playset_returns_blocked(self, client):
        solo = self._find_solo_zero_card(client)
        assert solo is not None, "fixture should include an isolated zero-qty card"

        variant_id = solo["id"]
        for _ in range(3):
            client.post(f"/api/inventory/{variant_id}/increment")

        response = client.post(f"/api/inventory/{variant_id}/increment")
        assert response.status_code == 200
        body = response.json()
        assert body["blocked"] is True
        assert body["reason"] == "trade_sell"
        assert body["quantity"] == 3

        # Restore
        for _ in range(3):
            client.post(f"/api/inventory/{variant_id}/decrement")

    def test_singleton_increment_returns_playset_complete_at_1(self, client):
        singleton = self._find_zero_singleton(client)
        assert singleton is not None, "fixture should include a zero-qty Leader/Base"

        variant_id = singleton["id"]
        response = client.post(f"/api/inventory/{variant_id}/increment")
        assert response.status_code == 200
        body = response.json()
        assert body["quantity"] == 1
        assert body["playset_complete"] is True
        assert body["blocked"] is False

        # Restore
        client.post(f"/api/inventory/{variant_id}/decrement")

    def test_singleton_increment_blocked_at_1(self, client):
        singleton = self._find_zero_singleton(client)
        assert singleton is not None, "fixture should include a zero-qty Leader/Base"

        variant_id = singleton["id"]
        client.post(f"/api/inventory/{variant_id}/increment")

        response = client.post(f"/api/inventory/{variant_id}/increment")
        assert response.status_code == 200
        body = response.json()
        assert body["blocked"] is True
        assert body["reason"] == "trade_sell"
        assert body["quantity"] == 1

        # Restore
        client.post(f"/api/inventory/{variant_id}/decrement")

    def test_increment_unknown_card_returns_404(self, client):
        response = client.post("/api/inventory/99999999/increment")
        assert response.status_code == 404


class TestDecrementCard:
    def test_decrement_happy_path_reduces_quantity(self, client):
        records = client.get("/api/inventory").json()
        zero_card = next((r for r in records if r["quantity"] == 0), None)
        assert zero_card is not None, "fixture should include a zero-qty card"

        variant_id = zero_card["id"]
        client.post(f"/api/inventory/{variant_id}/increment")

        response = client.post(f"/api/inventory/{variant_id}/decrement")
        assert response.status_code == 200
        body = response.json()
        assert body["variant_id"] == variant_id
        assert body["quantity"] == 0

    def test_decrement_at_zero_stays_at_zero(self, client):
        records = client.get("/api/inventory").json()
        zero_card = next((r for r in records if r["quantity"] == 0), None)
        assert zero_card is not None, "fixture should include a zero-qty card"

        variant_id = zero_card["id"]
        response = client.post(f"/api/inventory/{variant_id}/decrement")
        assert response.status_code == 200
        body = response.json()
        assert body["quantity"] == 0

    def test_decrement_unknown_card_returns_404(self, client):
        response = client.post("/api/inventory/99999999/decrement")
        assert response.status_code == 404
