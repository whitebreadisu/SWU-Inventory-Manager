"""Integration tests for GET /api/cards endpoints.

Run inside the backend container:
    docker compose exec backend pytest app/tests/test_cards_api.py -v
"""

import os

import pytest

pytestmark = pytest.mark.skipif(
    "DATABASE_URL" not in os.environ,
    reason="requires DATABASE_URL — run inside the backend container",
)


class TestListCards:
    def test_returns_200_with_list(self, client):
        response = client.get("/api/cards")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_each_card_has_required_fields(self, client):
        response = client.get("/api/cards?set_code=SOR")
        cards = response.json()
        assert len(cards) > 0
        for card in cards[:5]:
            assert "id" in card
            assert "set_code" in card
            assert "card_number" in card
            assert "base_card_number" in card
            assert "name" in card
            assert "rarity" in card
            assert "type" in card
            assert "is_foil" in card
            assert "is_hyperspace" in card
            assert "is_prestige" in card
            assert "is_showcase" in card
            assert "is_organized_play" in card

    def test_set_code_filter_returns_only_that_set(self, client):
        cards = client.get("/api/cards?set_code=SOR").json()
        assert all(c["set_code"] == "SOR" for c in cards)

    def test_unknown_set_code_returns_empty_list(self, client):
        cards = client.get("/api/cards?set_code=ZZZ").json()
        assert cards == []

    def test_type_filter(self, client):
        cards = client.get("/api/cards?set_code=SOR&type=Leader").json()
        assert len(cards) > 0
        assert all(c["type"] == "Leader" for c in cards)

    def test_rarity_filter(self, client):
        cards = client.get("/api/cards?set_code=SOR&rarity=L").json()
        assert len(cards) > 0
        assert all(c["rarity"] == "L" for c in cards)

    def test_variant_filter_foil(self, client):
        cards = client.get("/api/cards?set_code=SOR&variant=foil").json()
        assert all(c["is_foil"] for c in cards)

    def test_variant_filter_standard(self, client):
        cards = client.get("/api/cards?set_code=SOR&variant=standard").json()
        assert len(cards) > 0
        for c in cards:
            assert not c["is_foil"]
            assert not c["is_hyperspace"]
            assert not c["is_prestige"]
            assert not c["is_showcase"]
            assert not c["is_organized_play"]


class TestGetCardById:
    def test_returns_200_for_valid_id(self, client):
        cards = client.get("/api/cards?set_code=SOR").json()
        first_id = cards[0]["id"]
        response = client.get(f"/api/cards/{first_id}")
        assert response.status_code == 200
        assert response.json()["id"] == first_id

    def test_returns_404_for_unknown_id(self, client):
        response = client.get("/api/cards/99999999")
        assert response.status_code == 404
