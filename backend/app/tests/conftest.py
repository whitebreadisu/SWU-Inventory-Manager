import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth import get_current_identity
from app.main import app

# P5 Stage 2: get_db() resolves tenant_id from a verified Firebase identity.
# Tests authenticate by overriding get_current_identity instead of sending a
# real token. DEFAULT_TEST_UID is pre-seeded (below) to map to tenant #1 --
# the tenant the real catalog/inventory data belongs to -- so existing tests
# that assume "tenant #1" keep working unchanged.
DEFAULT_TEST_UID = "test-tenant-1-user"
DEFAULT_TEST_EMAIL = "test-tenant-1@example.com"


@pytest.fixture(scope="session", autouse=True)
def seed_default_test_user():
    """Ensure tenant #1 has a users row for DEFAULT_TEST_UID, so the default
    `client` fixture resolves to tenant #1 instead of auto-provisioning a
    brand-new, empty tenant. Uses the admin (swu_user) connection, which
    bypasses the users RLS policy from migration 0021."""
    if "DATABASE_URL" not in os.environ:
        return

    from app.database import SessionLocal

    db = SessionLocal()
    try:
        db.execute(
            text(
                "INSERT INTO users (firebase_uid, tenant_id, email) "
                "VALUES (:uid, 1, :email) "
                "ON CONFLICT (firebase_uid) DO NOTHING"
            ),
            {"uid": DEFAULT_TEST_UID, "email": DEFAULT_TEST_EMAIL},
        )
        db.commit()
    finally:
        db.close()


def delete_provisioned_identity(db, firebase_uid: str) -> None:
    """Test cleanup helper: remove a users row and the tenant it was
    auto-provisioned into. Uses the admin (swu_user) connection, which
    bypasses RLS regardless of which identity provisioned the row."""
    tenant_id = db.execute(
        text("SELECT tenant_id FROM users WHERE firebase_uid = :uid"),
        {"uid": firebase_uid},
    ).scalar()
    db.execute(
        text("DELETE FROM users WHERE firebase_uid = :uid"), {"uid": firebase_uid}
    )
    if tenant_id is not None:
        db.execute(
            text("DELETE FROM tenants WHERE id = :tenant_id"), {"tenant_id": tenant_id}
        )
    db.commit()


@pytest.fixture
def make_client():
    """Returns a function that builds a TestClient authenticated as the given
    (firebase_uid, email) identity, via a get_current_identity override."""

    def _make(
        uid: str = DEFAULT_TEST_UID, email: str = DEFAULT_TEST_EMAIL
    ) -> TestClient:
        app.dependency_overrides[get_current_identity] = lambda: (uid, email)
        return TestClient(app)

    yield _make
    app.dependency_overrides.pop(get_current_identity, None)


@pytest.fixture
def client(make_client):
    return make_client()


@pytest.fixture(scope="module")
def db():
    """SQLAlchemy session for integration tests. Requires DATABASE_URL to be set
    (automatically present when running inside the backend container)."""
    from app.database import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="module")
def set_ids(db):
    """Map of set code → set_id for all known sets."""
    from app.models.set_model import CardSet

    return {s.code: s.id for s in db.query(CardSet).all()}


BASE_SETS = [
    # (code, name, release_date) -- in canonical release order; see CLAUDE.md's
    # Set Codes table. Only relied on here and by test_sets_api.py's
    # canonical-order / release-date assertions, now that catalog_seed.sql
    # (which used to seed `sets` on a fresh DB) is retired with the CSV
    # pipeline (BL-33 step 1).
    ("SOR", "Spark of Rebellion", "2024-03-08"),
    ("SHD", "Shadows of the Galaxy", "2024-08-02"),
    ("TWI", "Twilight of the Republic", "2024-11-08"),
    ("JTL", "Jump to Lightspeed", "2025-03-14"),
    ("LOF", "Legends of the Force", "2025-06-06"),
    ("SEC", "Secrets of Power", "2025-09-12"),
    ("LAW", "A Lawless Time", "2025-12-05"),
]


@pytest.fixture(scope="session", autouse=True)
def seed_minimal_catalog():
    """BL-33 step 1: the production CSV-sourced catalog seed is retired
    (BL-29 now repopulates base_cards/card_variants from swuapi for real
    environments, but CI's fresh ephemeral DB has no seed step of its own).
    Tests can no longer rely on a bulk-seeded catalog with known counts (the
    old "977 SOR cards" pattern) — this seeds the 7 base sets (idempotent via
    ON CONFLICT DO NOTHING on code) plus a small, self-contained fixture
    catalog scoped to SOR. Idempotent via ON CONFLICT DO NOTHING on
    swuapi_id too, so it's safe across repeated runs against a persistent
    dev database."""
    if "DATABASE_URL" not in os.environ:
        return

    from app.database import SessionLocal

    db = SessionLocal()
    try:
        for code, name, release_date in BASE_SETS:
            db.execute(
                text(
                    "INSERT INTO sets (code, name, is_base_set, release_date) "
                    "VALUES (:code, :name, true, :release_date) "
                    "ON CONFLICT (code) DO NOTHING"
                ),
                {"code": code, "name": name, "release_date": release_date},
            )
        db.commit()

        sor_id = db.execute(text("SELECT id FROM sets WHERE code = 'SOR'")).scalar()
        if sor_id is None:
            return

        base_cards = [
            # (swuapi_id, base_card_number, name, type, rarity)
            ("test-0001", "9001", "Test Leader Alpha", "Leader", "Common"),
            ("test-0002", "9002", "Test Base Alpha", "Base", "Common"),
            ("test-0003", "9003", "Test Trooper Alpha", "Unit", "Common"),
            ("test-0004", "9004", "Test Trooper Beta", "Unit", "Common"),
            ("test-0005", "9005", "Test Officer Alpha", "Unit", "Rare"),
            # Detail-endpoint fixture (BL-29/S6): a richer variant long tail
            # incl. a stamp_group, for the base-card detail popup tests.
            ("test-0006", "9006", "Test Champion Gamma", "Unit", "Rare"),
        ]
        base_card_ids = {}
        for swuapi_id, number, name, type_, rarity in base_cards:
            row = db.execute(
                text(
                    "INSERT INTO base_cards "
                    "(set_id, base_card_number, name, type, rarity, swuapi_id) "
                    "VALUES (:set_id, :number, :name, :type, :rarity, :swuapi_id) "
                    "ON CONFLICT (swuapi_id) DO UPDATE SET name = EXCLUDED.name "
                    "RETURNING id"
                ),
                {
                    "set_id": sor_id,
                    "number": number,
                    "name": name,
                    "type": type_,
                    "rarity": rarity,
                    "swuapi_id": swuapi_id,
                },
            ).first()
            base_card_ids[swuapi_id] = row.id

        variants = [
            # (swuapi_id, base_card_swuapi_id, card_number, variant_type)
            ("test-v0001", "test-0001", "9001", "Standard"),
            ("test-v0002", "test-0002", "9002", "Standard"),
            ("test-v0003", "test-0003", "9003", "Standard"),
            ("test-v0004", "test-0004", "9004", "Standard"),
            ("test-v0005", "test-0004", "9104", "Foil"),
            ("test-v0006", "test-0005", "9005", "Standard"),
            ("test-v0007", "test-0006", "9006", "Standard"),
            ("test-v0008", "test-0006", "9106", "Standard Foil"),
            ("test-v0009", "test-0006", "9206", "PQ Champion"),
            ("test-v0010", "test-0006", "9207", "PQ Judge"),
        ]
        # stamp_group for the PQ tier siblings (test-v0009/test-v0010) --
        # mirrors swuapi_classify.classify_variant's pq_tier stamp_family,
        # keyed on this fixture's own base_card_id once known below.
        STAMP_GROUPED_SWUAPI_IDS = {"test-v0009", "test-v0010"}
        variant_ids = {}
        for swuapi_id, base_swuapi_id, card_number, variant_type in variants:
            base_card_id = base_card_ids[base_swuapi_id]
            stamp_group = (
                f"{base_card_id}:pq_tier"
                if swuapi_id in STAMP_GROUPED_SWUAPI_IDS
                else None
            )
            row = db.execute(
                text(
                    "INSERT INTO card_variants "
                    "(base_card_id, variant_type, source_set_code, card_number, "
                    "swuapi_id, stamp_group) "
                    "VALUES (:base_card_id, :variant_type, 'SOR', :card_number, "
                    ":swuapi_id, :stamp_group) "
                    "ON CONFLICT (swuapi_id) DO UPDATE SET card_number = EXCLUDED.card_number "
                    "RETURNING id"
                ),
                {
                    "base_card_id": base_card_id,
                    "variant_type": variant_type,
                    "card_number": card_number,
                    "swuapi_id": swuapi_id,
                    "stamp_group": stamp_group,
                },
            ).first()
            variant_ids[swuapi_id] = row.id

        # Tenant #1 inventory: one nonzero row (Trooper Beta, Standard) so
        # "has nonzero quantities"/RLS "count > 0" assertions hold; explicit
        # zero rows on two more non-singleton base-card groups so
        # tenant_isolation's "eligible tenant #1 rows" query has >=2 groups
        # to pick from.
        seed_inventory = [
            ("test-v0004", 2),  # Trooper Beta, Standard
            ("test-v0003", 0),  # Trooper Alpha, Standard (solo variant)
            ("test-v0005", 0),  # Trooper Beta, Foil
            ("test-v0008", 1),  # Champion Gamma, Standard Foil
        ]
        for swuapi_id, quantity in seed_inventory:
            db.execute(
                text(
                    "INSERT INTO inventory (tenant_id, variant_id, quantity) "
                    "VALUES (1, :variant_id, :quantity) "
                    "ON CONFLICT (tenant_id, variant_id) DO UPDATE SET quantity = EXCLUDED.quantity"
                ),
                {"variant_id": variant_ids[swuapi_id], "quantity": quantity},
            )

        db.commit()
    finally:
        db.close()
