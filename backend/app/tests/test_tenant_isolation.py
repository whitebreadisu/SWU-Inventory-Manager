"""
P4 Stage 4: tenant isolation test suite.

A second tenant ("Tenant Two") and inventory rows for cards tenant #1
already tracks are created for the duration of this module, then removed.
Proves RLS isolation holds even for "naive," unfiltered queries -- the
exact shape app/repositories/inventory.py's upsert_increment/
upsert_decrement use -- because the database itself, not application code,
refuses to return another tenant's rows.

Integration tests -- require DATABASE_URL and APP_DATABASE_URL (standard
inside the backend container).
"""
import os

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

pytestmark = pytest.mark.skipif(
    "DATABASE_URL" not in os.environ or "APP_DATABASE_URL" not in os.environ,
    reason="requires DATABASE_URL and APP_DATABASE_URL -- run inside the backend container",
)

SEEDED_QUANTITY = 2


@pytest.fixture(scope="module")
def app_db():
    """SQLAlchemy session connected as swu_app -- the role tenant_isolation actually applies to."""
    engine = create_engine(os.environ["APP_DATABASE_URL"])
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="module")
def tenant_two(db):
    """Create a second tenant with its own rows for cards tenant #1 already
    tracks, then remove everything afterward. Setup/teardown use the
    swu_user (admin) connection, which bypasses RLS regardless of which
    tenant is "current" -- the same property test_row_level_security.py's
    test_swu_user_bypasses_rls documents.

    The two cards are chosen from distinct (set, base_card_number) groups
    and excluding Leader/Base, so seeding tenant #2's rows at
    SEEDED_QUANTITY can't trip app/services/inventory.py's
    singleton/playset "blocked" rules during the increment test below.
    """
    tenant_id = db.execute(
        text("INSERT INTO tenants (name) VALUES ('Tenant Two') RETURNING id")
    ).scalar()
    db.commit()

    try:
        rows = db.execute(
            text(
                """
                SELECT DISTINCT ON (c.set_id, c.base_card_number)
                       i.card_id, i.quantity
                FROM inventory i
                JOIN cards c ON c.id = i.card_id
                WHERE i.tenant_id = 1 AND c.type NOT IN ('Leader', 'Base')
                ORDER BY c.set_id, c.base_card_number, i.card_id
                LIMIT 2
                """
            )
        ).all()
        assert len(rows) == 2, "expected at least 2 eligible tenant #1 inventory rows"

        card_ids = [r[0] for r in rows]
        tenant_one_quantities = {r[0]: r[1] for r in rows}

        for card_id in card_ids:
            db.execute(
                text(
                    "INSERT INTO inventory (tenant_id, card_id, quantity) "
                    "VALUES (:tenant_id, :card_id, :quantity)"
                ),
                {"tenant_id": tenant_id, "card_id": card_id, "quantity": SEEDED_QUANTITY},
            )
        db.commit()

        yield {
            "tenant_id": tenant_id,
            "card_ids": card_ids,
            "tenant_one_quantities": tenant_one_quantities,
        }
    finally:
        db.rollback()
        db.execute(text("DELETE FROM inventory WHERE tenant_id = :tenant_id"), {"tenant_id": tenant_id})
        db.execute(text("DELETE FROM tenants WHERE id = :tenant_id"), {"tenant_id": tenant_id})
        db.commit()


def test_naive_query_as_tenant_two_excludes_tenant_one_rows(app_db, tenant_two):
    """The exact unfiltered shape upsert_increment/upsert_decrement use
    (SELECT ... FROM inventory with no WHERE tenant_id) -- run as tenant
    #2 -- returns only tenant #2's rows, even though tenant #1 has rows
    for the very same card_ids."""
    app_db.execute(
        text("SET LOCAL app.current_tenant_id = :tid"),
        {"tid": str(tenant_two["tenant_id"])},
    )
    rows = app_db.execute(text("SELECT tenant_id, card_id, quantity FROM inventory")).all()
    app_db.rollback()

    assert len(rows) == len(tenant_two["card_ids"])
    assert {r[0] for r in rows} == {tenant_two["tenant_id"]}
    assert {r[1] for r in rows} == set(tenant_two["card_ids"])
    assert all(r[2] == SEEDED_QUANTITY for r in rows)


def test_naive_query_as_tenant_one_excludes_tenant_two_rows(app_db, tenant_two):
    """Same naive query, run as tenant #1 -- tenant #2's rows for these
    card_ids never appear, even though they exist in the table."""
    app_db.execute(text("SET LOCAL app.current_tenant_id = '1'"))
    rows = app_db.execute(
        text("SELECT card_id, tenant_id, quantity FROM inventory WHERE card_id = ANY(:card_ids)"),
        {"card_ids": tenant_two["card_ids"]},
    ).all()
    app_db.rollback()

    assert len(rows) == len(tenant_two["card_ids"])
    for card_id, tenant_id, quantity in rows:
        assert tenant_id == 1
        assert quantity == tenant_two["tenant_one_quantities"][card_id]


def test_api_tenant_two_sees_its_own_quantities(client, tenant_two):
    headers = {"X-Tenant-Id": str(tenant_two["tenant_id"])}
    records = client.get("/api/inventory", headers=headers).json()
    by_card_id = {r["id"]: r["quantity"] for r in records}
    for card_id in tenant_two["card_ids"]:
        assert by_card_id[card_id] == SEEDED_QUANTITY


def test_api_tenant_one_unaffected_by_tenant_two_rows(client, tenant_two):
    records = client.get("/api/inventory", headers={"X-Tenant-Id": "1"}).json()
    by_card_id = {r["id"]: r["quantity"] for r in records}
    for card_id, expected in tenant_two["tenant_one_quantities"].items():
        assert by_card_id[card_id] == expected


def test_increment_for_tenant_two_does_not_affect_tenant_one(client, tenant_two, db):
    """The 'two people, two inventories' proof: incrementing tenant #2's
    row for a card -- via the same naive repository code tenant #1 uses --
    leaves tenant #1's row for that same card_id untouched."""
    card_id = tenant_two["card_ids"][0]
    headers = {"X-Tenant-Id": str(tenant_two["tenant_id"])}

    response = client.post(f"/api/inventory/{card_id}/increment", headers=headers)
    assert response.status_code == 200
    assert response.json()["quantity"] == SEEDED_QUANTITY + 1

    tenant_one_quantity = db.execute(
        text("SELECT quantity FROM inventory WHERE tenant_id = 1 AND card_id = :card_id"),
        {"card_id": card_id},
    ).scalar()
    assert tenant_one_quantity == tenant_two["tenant_one_quantities"][card_id]

    # restore tenant #2's row to its fixture-seeded quantity
    response = client.post(f"/api/inventory/{card_id}/decrement", headers=headers)
    assert response.json()["quantity"] == SEEDED_QUANTITY
