"""
Inventory snapshot reconstruction test.

Verifies that the inventory table can be fully rebuilt from the snapshot
file alone.

Process:
  1. Record current inventory count and total quantity.
  2. Open a savepoint (nested transaction).
  3. TRUNCATE inventory.
  4. Apply snapshot line-by-line (same logic as apply_inventory_snapshot.py).
  5. Verify count and total quantity match the pre-truncate values.
  6. Roll back the savepoint — all data is restored.

PostgreSQL TRUNCATE is transactional and fully reversed by a savepoint rollback.
"""
import os
from pathlib import Path

from sqlalchemy import text

SNAPSHOT_PATH = Path(os.environ.get("INVENTORY_SNAPSHOT_PATH", "/db/snapshots/inventory_snapshot.sql"))


def _snapshot_lines():
    return [
        line.strip()
        for line in SNAPSHOT_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("--")
    ]


def test_reconstruct_inventory_from_snapshot(db):
    assert SNAPSHOT_PATH.exists(), f"Snapshot file not found: {SNAPSHOT_PATH}"

    pre_count = db.execute(text("SELECT COUNT(*) FROM inventory")).scalar()
    pre_sum   = db.execute(text("SELECT COALESCE(SUM(quantity), 0) FROM inventory")).scalar()

    assert pre_count > 0, "Database has no inventory records — run ingestion before this test"

    savepoint = db.begin_nested()
    db.execute(text("TRUNCATE inventory RESTART IDENTITY"))
    for stmt in _snapshot_lines():
        db.execute(text(stmt))

    assert db.execute(text("SELECT COUNT(*) FROM inventory")).scalar() == pre_count, \
        "Record count mismatch after reconstruction"
    assert db.execute(text("SELECT COALESCE(SUM(quantity), 0) FROM inventory")).scalar() == pre_sum, \
        "Total quantity mismatch after reconstruction"

    savepoint.rollback()

    assert db.execute(text("SELECT COUNT(*) FROM inventory")).scalar() == pre_count, \
        "Savepoint rollback did not restore inventory count"
    assert db.execute(text("SELECT COALESCE(SUM(quantity), 0) FROM inventory")).scalar() == pre_sum, \
        "Savepoint rollback did not restore inventory total quantity"
