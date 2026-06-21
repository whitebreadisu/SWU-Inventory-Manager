"""Integration tests for GET /api/base-cards/{base_card_id} -- the card
detail / card-inventory popup endpoint (SWU_Catalog_Redesign_Spec.md §5.3).

Uses conftest's seed_minimal_catalog fixture base card "Test Champion
Gamma" (swuapi_id test-0006), which carries a richer variant long tail
(Standard, Standard Foil, and a PQ Champion/PQ Judge stamp_group pair) plus
a seeded nonzero inventory row, specifically for this endpoint.

Run inside the backend container:
    docker compose exec backend pytest app/tests/test_base_cards_api.py -v
"""

import os

import pytest
from sqlalchemy import text

pytestmark = pytest.mark.skipif(
    "DATABASE_URL" not in os.environ,
    reason="requires DATABASE_URL — run inside the backend container",
)


@pytest.fixture
def champion_gamma_id(db):
    return db.execute(
        text("SELECT id FROM base_cards WHERE swuapi_id = 'test-0006'")
    ).scalar()


@pytest.fixture
def champion_gamma_variant_ids(db):
    rows = db.execute(
        text(
            "SELECT swuapi_id, id FROM card_variants "
            "WHERE swuapi_id IN ('test-v0007', 'test-v0008', 'test-v0009', 'test-v0010')"
        )
    ).all()
    return {r.swuapi_id: r.id for r in rows}


class TestGetBaseCardDetail:
    def test_returns_200_with_base_card_fields(self, client, champion_gamma_id):
        response = client.get(f"/api/base-cards/{champion_gamma_id}")
        assert response.status_code == 200
        body = response.json()
        assert body["id"] == champion_gamma_id
        assert body["set_code"] == "SOR"
        assert body["set_name"] == "Spark of Rebellion"
        assert body["base_card_number"] == "9006"
        assert body["name"] == "Test Champion Gamma"
        assert body["type"] == "Unit"
        assert body["rarity"] == "Rare"
        assert isinstance(body["aspects"], list)
        assert isinstance(body["keywords"], list)
        assert isinstance(body["traits"], list)

    def test_returns_all_variants_with_classification(
        self, client, champion_gamma_id, champion_gamma_variant_ids
    ):
        body = client.get(f"/api/base-cards/{champion_gamma_id}").json()
        variants_by_swuapi_id_order = sorted(champion_gamma_variant_ids.values())
        returned_ids = {v["variant_id"] for v in body["variants"]}
        assert returned_ids == set(variants_by_swuapi_id_order)

        by_id = {v["variant_id"]: v for v in body["variants"]}
        standard = by_id[champion_gamma_variant_ids["test-v0007"]]
        assert standard["variant_type"] == "Standard"
        assert standard["finish"] == "Standard"
        assert standard["channel"] == "Retail"
        assert standard["stamped"] is False
        assert standard["stamp_group"] is None
        assert standard["source_set_code"] == "SOR"
        assert standard["source_set_name"] == "Spark of Rebellion"

        standard_foil = by_id[champion_gamma_variant_ids["test-v0008"]]
        assert standard_foil["finish"] == "Standard Foil"

    def test_stamp_group_consolidation_present(
        self, client, champion_gamma_id, champion_gamma_variant_ids
    ):
        body = client.get(f"/api/base-cards/{champion_gamma_id}").json()
        by_id = {v["variant_id"]: v for v in body["variants"]}
        pq_champion = by_id[champion_gamma_variant_ids["test-v0009"]]
        pq_judge = by_id[champion_gamma_variant_ids["test-v0010"]]
        assert pq_champion["stamp_group"] is not None
        assert pq_champion["stamp_group"] == pq_judge["stamp_group"]
        assert pq_champion["stamped"] is True

    def test_quantity_reflects_seeded_inventory(
        self, client, champion_gamma_id, champion_gamma_variant_ids
    ):
        body = client.get(f"/api/base-cards/{champion_gamma_id}").json()
        by_id = {v["variant_id"]: v for v in body["variants"]}
        standard = by_id[champion_gamma_variant_ids["test-v0007"]]
        standard_foil = by_id[champion_gamma_variant_ids["test-v0008"]]
        # Standard has no seeded row -> 0; Standard Foil is seeded to 1
        # (conftest.seed_minimal_catalog).
        assert standard["quantity"] == 0
        assert standard_foil["quantity"] == 1

    def test_returns_404_for_unknown_id(self, client):
        response = client.get("/api/base-cards/99999999")
        assert response.status_code == 404


class TestGetBaseCardDetailTenantIsolation:
    def test_quantity_is_tenant_scoped(
        self, make_client, champion_gamma_id, champion_gamma_variant_ids, db
    ):
        """A second tenant with no inventory rows for this base card sees
        quantity 0 across all variants, even though tenant #1 has a
        nonzero row for the Standard Foil variant."""
        tenant_id = db.execute(
            text(
                "INSERT INTO tenants (name) VALUES ('Detail Isolation Tenant') RETURNING id"
            )
        ).scalar()
        uid = "test-detail-isolation-user"
        email = "detail-isolation@example.com"
        db.execute(
            text(
                "INSERT INTO users (firebase_uid, tenant_id, email) "
                "VALUES (:uid, :tenant_id, :email)"
            ),
            {"uid": uid, "tenant_id": tenant_id, "email": email},
        )
        db.commit()
        try:
            other_client = make_client(uid, email)
            body = other_client.get(f"/api/base-cards/{champion_gamma_id}").json()
            assert all(v["quantity"] == 0 for v in body["variants"])

            # tenant #1 (the default client) still sees its own nonzero row
            tenant_one_body = (
                make_client().get(f"/api/base-cards/{champion_gamma_id}").json()
            )
            by_id = {v["variant_id"]: v for v in tenant_one_body["variants"]}
            assert by_id[champion_gamma_variant_ids["test-v0008"]]["quantity"] == 1
        finally:
            db.rollback()
            db.execute(
                text("DELETE FROM inventory WHERE tenant_id = :tenant_id"),
                {"tenant_id": tenant_id},
            )
            db.execute(
                text("DELETE FROM users WHERE firebase_uid = :uid"), {"uid": uid}
            )
            db.execute(
                text("DELETE FROM tenants WHERE id = :tenant_id"),
                {"tenant_id": tenant_id},
            )
            db.commit()
