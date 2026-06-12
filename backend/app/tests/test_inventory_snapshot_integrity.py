"""
Inventory snapshot file integrity tests.

Validates the inventory snapshot file against the live database. These are
integration tests that require DATABASE_URL to be set (standard inside
the backend container).
"""
import os
import re
from pathlib import Path

from sqlalchemy import text

SNAPSHOT_PATH = Path(os.environ.get("INVENTORY_SNAPSHOT_PATH", "/db/snapshots/inventory_snapshot.sql"))


def _read_snapshot() -> str:
    return SNAPSHOT_PATH.read_text(encoding="utf-8")


def _parse_metadata(content: str) -> tuple[int, int]:
    """Extract declared record count and total quantity from the snapshot header comment."""
    for line in content.splitlines():
        m = re.search(r"Records:\s*(\d+)\s*\|\s*Total quantity:\s*(\d+)", line)
        if m:
            return int(m.group(1)), int(m.group(2))
    return 0, 0


# ---------------------------------------------------------------------------
# File-level checks (no DB required)
# ---------------------------------------------------------------------------

def test_snapshot_file_exists():
    assert SNAPSHOT_PATH.exists(), f"Snapshot file not found: {SNAPSHOT_PATH}"


def test_snapshot_file_contains_required_sections():
    content = _read_snapshot()
    assert "INSERT INTO inventory" in content, "Snapshot missing INSERT INTO inventory"
    assert "ON CONFLICT DO NOTHING" in content, "Snapshot missing ON CONFLICT DO NOTHING"


# ---------------------------------------------------------------------------
# Counts: snapshot metadata vs live database
# ---------------------------------------------------------------------------

def test_snapshot_record_count_matches_database(db):
    content = _read_snapshot()
    snapshot_records, _ = _parse_metadata(content)
    assert snapshot_records > 0, "Could not parse record count from snapshot metadata"

    db_records = db.execute(text("SELECT COUNT(*) FROM inventory")).scalar()
    assert snapshot_records == db_records, (
        f"Snapshot declares {snapshot_records} records but database has {db_records}"
    )


def test_snapshot_total_quantity_matches_database(db):
    content = _read_snapshot()
    _, snapshot_total = _parse_metadata(content)

    db_total = db.execute(text("SELECT COALESCE(SUM(quantity), 0) FROM inventory")).scalar()
    assert snapshot_total == db_total, (
        f"Snapshot declares total quantity {snapshot_total} but database sums to {db_total}"
    )
