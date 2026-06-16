"""
Apply the inventory snapshot file to the database.

Called automatically during container startup (after apply_seed).
Idempotent: skips if the inventory table is already populated.

Usage (called in Docker entrypoint):
    python -m app.ingestion.apply_inventory_snapshot
"""

import logging
import os
from pathlib import Path

from sqlalchemy import text

from app.database import SessionLocal

logger = logging.getLogger(__name__)

SNAPSHOT_PATH = Path(
    os.environ.get("INVENTORY_SNAPSHOT_PATH", "/db/snapshots/inventory_snapshot.sql")
)


def apply_inventory_snapshot(snapshot_path: Path = SNAPSHOT_PATH) -> None:
    db = SessionLocal()
    try:
        inventory_count = db.execute(text("SELECT COUNT(*) FROM inventory")).scalar()
        if inventory_count > 0:
            logger.info(
                "Inventory already populated (%d records). Skipping snapshot.",
                inventory_count,
            )
            print(
                f"Inventory already populated ({inventory_count} records). Skipping snapshot."
            )
            return

        if not snapshot_path.exists():
            logger.warning(
                "Snapshot file not found at %s. Inventory table will be empty.",
                snapshot_path,
            )
            print(
                f"WARNING: Snapshot file not found at {snapshot_path}. Inventory table will be empty."
            )
            return

        logger.info("Applying inventory snapshot from %s ...", snapshot_path)
        print(f"Applying inventory snapshot from {snapshot_path} ...")

        for line in snapshot_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("--"):
                db.execute(text(line))

        db.commit()

        final_count = db.execute(text("SELECT COUNT(*) FROM inventory")).scalar()
        logger.info("Snapshot applied: %d inventory records.", final_count)
        print(f"Snapshot applied: {final_count} inventory records.")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    apply_inventory_snapshot()
