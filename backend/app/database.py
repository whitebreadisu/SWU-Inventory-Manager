import os
from fastapi import Header
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ["DATABASE_URL"]
APP_DATABASE_URL = os.environ["APP_DATABASE_URL"]

# Migration-running admin connection (swu_user). Used by ingestion scripts
# (apply_seed, apply_inventory_snapshot, etc.) which need write access to the
# catalog tables that swu_app can only read.
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Request-serving connection (swu_app) -- the RLS-aware role from P4 stage 2.
app_engine = create_engine(APP_DATABASE_URL)
AppSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=app_engine)


def get_db(x_tenant_id: int = Header(default=1, alias="X-Tenant-Id")):
    """FastAPI dependency: a swu_app session scoped to the requesting tenant.

    P4 stage 3 dev-only mechanism -- P5's real auth replaces the header with
    an identity -> tenant lookup. set_config's third argument (false) sets
    app.current_tenant_id for the life of this connection checkout, so it
    survives the commit()+refresh() pattern in upsert_increment/upsert_decrement
    (a plain SET LOCAL would revert after the first commit).
    """
    db = AppSessionLocal()
    try:
        db.execute(
            text("SELECT set_config('app.current_tenant_id', :tenant_id, false)"),
            {"tenant_id": str(x_tenant_id)},
        )
        yield db
    finally:
        db.close()
