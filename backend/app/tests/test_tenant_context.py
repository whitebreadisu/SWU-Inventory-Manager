"""
P5 Stage 2: identity-based tenant resolution.

Integration tests -- require DATABASE_URL and APP_DATABASE_URL (standard
inside the backend container).
"""
import os

import pytest
from fastapi import Request
from sqlalchemy import text

from app.database import get_db

from .conftest import DEFAULT_TEST_EMAIL, DEFAULT_TEST_UID, delete_provisioned_identity

pytestmark = pytest.mark.skipif(
    "DATABASE_URL" not in os.environ or "APP_DATABASE_URL" not in os.environ,
    reason="requires DATABASE_URL and APP_DATABASE_URL -- run inside the backend container",
)


def _make_request() -> Request:
    """A bare Request for driving get_db() directly -- only its .state is
    used (P6 stage 1: get_db() stashes tenant_id there for the request
    logging middleware)."""
    return Request(scope={"type": "http", "headers": []})


def _current_tenant_setting(identity: tuple[str, str]) -> str | None:
    """Drive get_db() directly with an explicit identity and read back
    app.current_tenant_id from the session it produced."""
    gen = get_db(request=_make_request(), identity=identity)
    db = next(gen)
    try:
        return db.execute(
            text("SELECT current_setting('app.current_tenant_id', true)")
        ).scalar()
    finally:
        gen.close()


def test_get_db_sets_session_variable_for_known_identity():
    identity = (DEFAULT_TEST_UID, DEFAULT_TEST_EMAIL)
    assert _current_tenant_setting(identity) == "1"


def test_session_variable_survives_commit():
    """set_config(..., false) is session-scoped, unlike SET LOCAL -- it must
    still be set after a commit() so upsert_increment/upsert_decrement's
    commit() + refresh() pattern sees the right tenant on the refresh."""
    gen = get_db(request=_make_request(), identity=(DEFAULT_TEST_UID, DEFAULT_TEST_EMAIL))
    db = next(gen)
    try:
        db.commit()
        value = db.execute(
            text("SELECT current_setting('app.current_tenant_id', true)")
        ).scalar()
        assert value == "1"
    finally:
        gen.close()


def test_new_identity_auto_provisions_tenant(db):
    """A firebase_uid seen for the first time gets its own brand-new tenant,
    named after its email -- the "one user, one tenant" model."""
    uid, email = "test-new-identity-1", "newuser1@example.com"
    gen = get_db(request=_make_request(), identity=(uid, email))
    app_db = next(gen)
    try:
        tenant_id = app_db.execute(
            text("SELECT current_setting('app.current_tenant_id', true)")
        ).scalar()
        assert tenant_id != "1"

        tenant_name = db.execute(
            text("SELECT name FROM tenants WHERE id = :id"), {"id": int(tenant_id)}
        ).scalar()
        assert tenant_name == f"{email}'s Tenant"
    finally:
        gen.close()
        delete_provisioned_identity(db, uid)


def test_new_identity_sees_zero_inventory_quantities(make_client, db):
    """A brand-new, empty tenant has no inventory rows -- every card's
    quantity falls back to 0 via card.inventory.quantity if card.inventory
    else 0, with no repository/service changes needed."""
    uid, email = "test-new-identity-2", "newuser2@example.com"
    client = make_client(uid, email)
    try:
        records = client.get("/api/inventory").json()
        assert len(records) > 0
        assert all(r["quantity"] == 0 for r in records)
    finally:
        delete_provisioned_identity(db, uid)


def test_default_tenant_has_nonzero_quantities(client):
    records = client.get("/api/inventory").json()
    assert any(r["quantity"] > 0 for r in records)


def test_increment_decrement_round_trip(client):
    records = client.get("/api/inventory").json()
    zero_card = next((r for r in records if r["quantity"] == 0), None)
    if zero_card is None:
        pytest.skip("No zero-quantity card available for this test")

    card_id = zero_card["id"]
    response = client.post(f"/api/inventory/{card_id}/increment")
    assert response.status_code == 200
    assert response.json()["quantity"] == 1

    response = client.post(f"/api/inventory/{card_id}/decrement")
    assert response.status_code == 200
    assert response.json()["quantity"] == 0
