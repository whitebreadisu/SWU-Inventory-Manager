import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


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
