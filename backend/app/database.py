import os

from fastapi import Depends, Request
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.auth import get_current_identity

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


def get_db(
    request: Request,
    identity: tuple[str, str] = Depends(get_current_identity),
):
    """FastAPI dependency: a swu_app session scoped to the caller's tenant.

    P5 stage 2: tenant_id is resolved from the verified Firebase identity,
    replacing P4 stage 3's X-Tenant-Id header. app.current_firebase_uid is
    set first so the users RLS policy (migration 0021) can find -- or, for a
    first-ever request, create -- this identity's own users row. The first
    time a firebase_uid is seen, it gets a brand-new tenant (auto-provisioning,
    "one user, one tenant"). set_config's third argument (false) sets both
    session variables for the life of this connection checkout, so they
    survive the commit()+refresh() pattern in upsert_increment/
    upsert_decrement (a plain SET LOCAL would revert after the first commit).

    P6 stage 1: tenant_id is also stashed on request.state so the request
    logging middleware (app/middleware.py) can include it in the structured
    log line for this request.
    """
    firebase_uid, email = identity
    db = AppSessionLocal()
    try:
        db.execute(
            text("SELECT set_config('app.current_firebase_uid', :uid, false)"),
            {"uid": firebase_uid},
        )

        row = db.execute(
            text("SELECT tenant_id FROM users WHERE firebase_uid = :uid"),
            {"uid": firebase_uid},
        ).first()

        if row is None:
            new_tenant_id = db.execute(
                text("INSERT INTO tenants (name) VALUES (:name) RETURNING id"),
                {"name": f"{email}'s Tenant"},
            ).scalar()
            inserted = db.execute(
                text(
                    "INSERT INTO users (firebase_uid, tenant_id, email) "
                    "VALUES (:uid, :tenant_id, :email) "
                    "ON CONFLICT (firebase_uid) DO NOTHING "
                    "RETURNING tenant_id"
                ),
                {"uid": firebase_uid, "tenant_id": new_tenant_id, "email": email},
            ).first()
            if inserted is not None:
                tenant_id = inserted.tenant_id
            else:
                # Lost a race with a concurrent first request for this uid --
                # new_tenant_id is now an orphaned row; use the winner's tenant.
                tenant_id = db.execute(
                    text("SELECT tenant_id FROM users WHERE firebase_uid = :uid"),
                    {"uid": firebase_uid},
                ).scalar()
            db.commit()
        else:
            tenant_id = row.tenant_id

        db.execute(
            text("SELECT set_config('app.current_tenant_id', :tenant_id, false)"),
            {"tenant_id": str(tenant_id)},
        )
        request.state.tenant_id = tenant_id
        yield db
    finally:
        db.close()
