"""
Generate the inventory snapshot file from the current database.

Run after every significant update to your collection, and always before
any destructive database operation.

Usage (inside container):
    docker compose exec backend python -m app.ingestion.generate_inventory_snapshot

Output: /db/snapshots/inventory_snapshot.sql (mounted from ./db/snapshots at repo root)
"""

import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text

from app.database import SessionLocal

logger = logging.getLogger(__name__)

SNAPSHOT_PATH = Path(
    os.environ.get("INVENTORY_SNAPSHOT_PATH", "/db/snapshots/inventory_snapshot.sql")
)
_BATCH_SIZE = 500


def _q(value) -> str:
    """Format a Python value as a SQL literal."""
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def _write_batched(f, table: str, cols: str, rows: list, row_fn) -> int:
    """Write batched multi-row INSERTs for a table. Returns row count."""
    count = len(rows)
    if count == 0:
        f.write(f"-- {table}: no rows\n")
        return 0
    for start in range(0, count, _BATCH_SIZE):
        batch = rows[start : start + _BATCH_SIZE]
        vals = ", ".join(row_fn(r) for r in batch)
        f.write(f"INSERT INTO {table} ({cols}) VALUES {vals} ON CONFLICT DO NOTHING;\n")
    return count


def generate_inventory_snapshot(output_path: Path = SNAPSHOT_PATH) -> Path:
    db = SessionLocal()
    try:
        inventory_rows = db.execute(
            text(
                "SELECT tenant_id, card_id, quantity, updated_at FROM inventory ORDER BY card_id"
            )
        ).fetchall()

        record_count = len(inventory_rows)
        total_quantity = sum(r[2] for r in inventory_rows)

        output_path.parent.mkdir(parents=True, exist_ok=True)

        with output_path.open("w", encoding="utf-8") as f:
            f.write("-- SWU Inventory Snapshot\n")
            f.write(
                f"-- Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n"
            )
            f.write(f"-- Records: {record_count} | Total quantity: {total_quantity}\n")
            f.write("\n")

            _write_batched(
                f,
                "inventory",
                "tenant_id, card_id, quantity, updated_at",
                inventory_rows,
                lambda r: f"({_q(r[0])}, {_q(r[1])}, {_q(r[2])}, {_q(str(r[3]))})",
            )

        msg = f"Snapshot written: {output_path} ({record_count} records, total quantity {total_quantity})"
        logger.info(msg)
        print(msg)
        return output_path

    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    generate_inventory_snapshot()
