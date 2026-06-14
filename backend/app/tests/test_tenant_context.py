"""
P4 Stage 3: FastAPI tenant context.

Integration tests -- require DATABASE_URL and APP_DATABASE_URL (standard
inside the backend container).
"""
import os

import pytest
from sqlalchemy import text

from app.database import get_db

pytestmark = pytest.mark.skipif(
    "DATABASE_URL" not in os.environ or "APP_DATABASE_URL" not in os.environ,
    reason="requires DATABASE_URL and APP_DATABASE_URL -- run inside the backend container",
)


def _current_tenant_setting(tenant_id: int) -> str | None:
    """Drive get_db() directly with an explicit tenant id and read back
    app.current_tenant_id from the session it produced."""
    gen = get_db(x_tenant_id=tenant_id)
    db = next(gen)
    try:
        return db.execute(
            text("SELECT current_setting('app.current_tenant_id', true)")
        ).scalar()
    finally:
        gen.close()


def test_get_db_sets_session_variable_from_tenant_id():
    assert _current_tenant_setting(999) == "999"


def test_session_variable_survives_commit():
    """set_config(..., false) is session-scoped, unlike SET LOCAL -- it must
    still be set after a commit() so upsert_increment/upsert_decrement's
    commit() + refresh() pattern sees the right tenant on the refresh."""
    gen = get_db(x_tenant_id=7)
    db = next(gen)
    try:
        db.commit()
        value = db.execute(
            text("SELECT current_setting('app.current_tenant_id', true)")
        ).scalar()
        assert value == "7"
    finally:
        gen.close()


def test_default_tenant_header_matches_no_header(client):
    default = client.get("/api/inventory").json()
    explicit = client.get("/api/inventory", headers={"X-Tenant-Id": "1"}).json()
    assert default == explicit


def test_unknown_tenant_sees_no_inventory_quantities(client):
    records = client.get("/api/inventory", headers={"X-Tenant-Id": "999"}).json()
    assert len(records) > 0
    assert all(r["quantity"] == 0 for r in records)


def test_default_tenant_has_nonzero_quantities(client):
    records = client.get("/api/inventory").json()
    assert any(r["quantity"] > 0 for r in records)


def test_increment_decrement_round_trip_with_explicit_tenant_header(client):
    headers = {"X-Tenant-Id": "1"}
    records = client.get("/api/inventory", headers=headers).json()
    zero_card = next((r for r in records if r["quantity"] == 0), None)
    if zero_card is None:
        pytest.skip("No zero-quantity card available for this test")

    card_id = zero_card["id"]
    response = client.post(f"/api/inventory/{card_id}/increment", headers=headers)
    assert response.status_code == 200
    assert response.json()["quantity"] == 1

    response = client.post(f"/api/inventory/{card_id}/decrement", headers=headers)
    assert response.status_code == 200
    assert response.json()["quantity"] == 0
