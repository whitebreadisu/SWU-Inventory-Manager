"""Entry point for the CSV ingestion pipeline.

Run inside the backend container after migrations have applied:

    docker compose exec backend python -m app.ingestion.run_ingestion

The CSV files directory defaults to /tcgcsv_files (mounted via docker-compose
volume). Override with the INGESTION_CSV_DIR environment variable if needed.
"""

import logging
import os
import sys
from pathlib import Path

from app.database import SessionLocal
from app.ingestion.csv_ingestor import run_ingestion

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)

CSV_DIR = Path(os.environ.get("INGESTION_CSV_DIR", "/tcgcsv_files"))
MAPPINGS_FILE = Path(__file__).parent / "mappings" / "set_mappings.yaml"


def main() -> None:
    if not CSV_DIR.exists():
        print(f"ERROR: CSV directory not found: {CSV_DIR}", file=sys.stderr)
        print(
            "Mount the tcgcsv_files directory into the container or set "
            "INGESTION_CSV_DIR to its path.",
            file=sys.stderr,
        )
        sys.exit(1)

    db = SessionLocal()
    try:
        result = run_ingestion(db, CSV_DIR, MAPPINGS_FILE)
    finally:
        db.close()

    print("\n=== Ingestion Complete ===")
    print(f"Sets seeded:    {result.sets_seeded}")
    print(f"Cards inserted: {result.cards_inserted}")
    print(
        f"Cards skipped:  {result.cards_skipped}  (ON CONFLICT — duplicates or SEC promo placeholder collision)"
    )
    print(
        f"Rows filtered:  {result.rows_filtered}  (non-card products + Serialized cards)"
    )
    print()
    print(f"{'Set':<6} {'Inserted':>9} {'Skipped':>8} {'Filtered':>9}")
    print("-" * 36)
    for s in result.file_summaries:
        print(
            f"{s['set_code']:<6} {s['inserted']:>9} {s['skipped']:>8} {s['filtered']:>9}"
        )


if __name__ == "__main__":
    main()
