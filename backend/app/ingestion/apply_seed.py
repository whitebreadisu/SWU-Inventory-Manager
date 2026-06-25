"""
Apply the catalog seed file to the database.

Called automatically during container startup (after alembic upgrade head).
Idempotent: skips if the sets table is already populated.

Usage (called in Docker entrypoint):
    python -m app.ingestion.apply_seed
"""

import logging
import os
from pathlib import Path

from sqlalchemy import text

from app.database import SessionLocal

logger = logging.getLogger(__name__)

SEED_PATH = Path(os.environ.get("CATALOG_SEED_PATH", "/db/seeds/catalog_seed.sql"))


def apply_seed(seed_path: Path = SEED_PATH) -> None:
    db = SessionLocal()
    try:
        set_count = db.execute(text("SELECT COUNT(*) FROM sets")).scalar()
        if set_count > 0:
            logger.info(
                "Catalog already populated (%d sets). Skipping seed.", set_count
            )
            print(f"Catalog already populated ({set_count} sets). Skipping seed.")
            return

        if not seed_path.exists():
            logger.warning(
                "Seed file not found at %s. Catalog tables will be empty.", seed_path
            )
            print(
                f"WARNING: Seed file not found at {seed_path}. Catalog tables will be empty."
            )
            return

        logger.info("Applying catalog seed from %s ...", seed_path)
        print(f"Applying catalog seed from {seed_path} ...")

        for line in seed_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("--"):
                db.execute(text(line))

        db.commit()

        final_sets = db.execute(text("SELECT COUNT(*) FROM sets")).scalar()
        final_base_cards = db.execute(text("SELECT COUNT(*) FROM base_cards")).scalar()
        final_variants = db.execute(text("SELECT COUNT(*) FROM card_variants")).scalar()
        logger.info(
            "Seed applied: %d sets, %d base_cards, %d card_variants.",
            final_sets,
            final_base_cards,
            final_variants,
        )
        print(
            f"Seed applied: {final_sets} sets, {final_base_cards} base_cards, "
            f"{final_variants} card_variants."
        )

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    apply_seed()
