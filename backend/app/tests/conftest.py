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
