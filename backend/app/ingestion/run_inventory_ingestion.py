"""Entry point for the Excel inventory ingestion pipeline (F4).

Run inside the backend container after CSV ingestion has completed:

    docker compose exec backend python -m app.ingestion.run_inventory_ingestion

The Excel file path defaults to /personal_card_inventory/<filename>.
Override with the INGESTION_EXCEL_FILE environment variable if needed.
"""
import logging
import os
import sys
from pathlib import Path

from app.database import SessionLocal
from app.ingestion.excel_ingestor import run_excel_ingestion

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)

_DEFAULT_EXCEL = (
    "/personal_card_inventory/SWU Collection Tracker MASTER v2.1.xlsx"
)
EXCEL_FILE = Path(os.environ.get("INGESTION_EXCEL_FILE", _DEFAULT_EXCEL))


def main() -> None:
    if not EXCEL_FILE.exists():
        print(f"ERROR: Excel file not found: {EXCEL_FILE}", file=sys.stderr)
        print(
            "Mount the personal_card_inventory directory into the container or "
            "set INGESTION_EXCEL_FILE to the full file path.",
            file=sys.stderr,
        )
        sys.exit(1)

    db = SessionLocal()
    try:
        result = run_excel_ingestion(db, EXCEL_FILE)
    finally:
        db.close()

    print("\n=== Inventory Ingestion Complete ===")
    print(f"Sheets processed:   {result.sheets_processed}")
    print(f"Records upserted:   {result.inventory_upserted}")
    print(f"Quantities skipped: {result.rows_skipped}  (null / zero / formula values)")
    print(f"Lookup failures:    {len(result.lookup_failures)}")
    print()
    print(f"{'Set':<6} {'Upserted':>9} {'Skipped':>8} {'Failures':>9}")
    print("-" * 36)
    for s in result.sheet_summaries:
        print(f"{s['set_code']:<6} {s['upserted']:>9} {s['skipped']:>8} {s['failed_lookups']:>9}")

    if result.lookup_failures:
        print("\n=== Lookup Failures ===")
        for f in result.lookup_failures:
            print(
                f"  {f['set_code']} card={f['card_number']} col={f['column']!r} "
                f"qty={f['quantity']} flags={f['flags']}"
            )


if __name__ == "__main__":
    main()
