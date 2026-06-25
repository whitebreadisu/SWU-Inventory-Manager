"""Catalog bootstrap (ADR-0004): on startup, populate the catalog from the
committed swuapi export when it is empty. Idempotent -- a no-op once `base_cards`
is populated, so warm databases and production (already ingested) pay nothing.
Replaces the retired CSV-era `apply_seed` / `catalog_seed.sql` path.

The catalog's source of truth is swuapi; the committed export
(`app/ingestion/data/swuapi_export_2026-06-21.json`) is a point-in-time capture.
Real freshness is the planned operator-gated ongoing sync (BL-36/BL-37).
"""

import logging
import os
from pathlib import Path

from sqlalchemy import text

from app.database import SessionLocal
from app.ingestion.run_swuapi_ingestion import load_export_from_file, run_ingestion

logger = logging.getLogger(__name__)

DEFAULT_EXPORT_PATH = Path(
    os.environ.get(
        "SWUAPI_EXPORT_PATH",
        str(Path(__file__).parent / "data" / "swuapi_export_2026-06-21.json"),
    )
)


def bootstrap_catalog(export_path: Path = DEFAULT_EXPORT_PATH) -> None:
    """Ingest the committed swuapi export into an empty catalog. No-op if
    `base_cards` is already populated. Called from the FastAPI lifespan on
    startup (replacing the retired `apply_seed`)."""
    db = SessionLocal()
    try:
        count = db.execute(text("SELECT COUNT(*) FROM base_cards")).scalar()
    finally:
        db.close()

    if count and count > 0:
        logger.info(
            "Catalog already populated (%d base_cards). Skipping bootstrap.", count
        )
        print(f"Catalog already populated ({count} base_cards). Skipping bootstrap.")
        return

    if not export_path.exists():
        logger.warning(
            "swuapi export not found at %s. Catalog will be empty.", export_path
        )
        print(
            f"WARNING: swuapi export not found at {export_path}. Catalog will be empty."
        )
        return

    logger.info("Bootstrapping catalog from %s ...", export_path)
    print(f"Bootstrapping catalog from {export_path} ...")
    export = load_export_from_file(export_path)
    result = run_ingestion(export)
    logger.info(
        "Catalog bootstrapped: %d sets, %d base_cards, %d card_variants.",
        len(result.sets),
        len(result.base_cards),
        len(result.card_variants),
    )
    print(
        f"Catalog bootstrapped: {len(result.sets)} sets, "
        f"{len(result.base_cards)} base_cards, {len(result.card_variants)} card_variants."
    )
