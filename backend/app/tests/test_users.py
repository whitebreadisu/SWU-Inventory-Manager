"""
P5 Stage 1: users table.

Integration tests -- require DATABASE_URL (standard inside the backend container).
"""
import os
import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

pytestmark = pytest.mark.skipif(
    "DATABASE_URL" not in os.environ,
    reason="requires DATABASE_URL -- run inside the backend container",
)


def test_users_table_empty(db):
    count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
    assert count == 0, "users table should be empty until P5 Stage 2 auto-provisions rows"


def test_users_firebase_uid_unique_constraint(db):
    db.execute(
        text(
            "INSERT INTO users (firebase_uid, tenant_id, email) "
            "VALUES ('test-uid-1', 1, 'a@example.com')"
        )
    )
    with pytest.raises(IntegrityError):
        db.execute(
            text(
                "INSERT INTO users (firebase_uid, tenant_id, email) "
                "VALUES ('test-uid-1', 1, 'b@example.com')"
            )
        )
    db.rollback()


def test_users_tenant_id_foreign_key_enforced(db):
    with pytest.raises(IntegrityError):
        db.execute(
            text(
                "INSERT INTO users (firebase_uid, tenant_id, email) "
                "VALUES ('test-uid-2', 999, 'c@example.com')"
            )
        )
    db.rollback()
