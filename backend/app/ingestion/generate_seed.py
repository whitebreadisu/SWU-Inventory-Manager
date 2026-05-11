"""
Generate the catalog seed file from the current database.

Run after F3 ingestion and validation are complete, and whenever a new
set is ingested and validated.

Usage (inside container):
    docker compose exec backend python -m app.ingestion.generate_seed

Output: /db/seeds/catalog_seed.sql (mounted from ./db/seeds at repo root)
"""
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text

from app.database import SessionLocal

logger = logging.getLogger(__name__)

SEED_PATH = Path(os.environ.get("CATALOG_SEED_PATH", "/db/seeds/catalog_seed.sql"))
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


def generate_seed(output_path: Path = SEED_PATH) -> Path:
    db = SessionLocal()
    try:
        sets_rows = db.execute(
            text(
                "SELECT id, code, name, has_unique_variant_numbers, created_at "
                "FROM sets ORDER BY id"
            )
        ).fetchall()

        cards_rows = db.execute(
            text(
                "SELECT id, set_id, card_number, base_card_number, name, rarity, type, "
                "is_foil, is_hyperspace, is_prestige, is_showcase, is_organized_play, created_at "
                "FROM cards ORDER BY id"
            )
        ).fetchall()

        set_count = len(sets_rows)
        card_count = len(cards_rows)

        output_path.parent.mkdir(parents=True, exist_ok=True)

        with output_path.open("w", encoding="utf-8") as f:
            f.write("-- SWU Card Catalog Seed\n")
            f.write(f"-- Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n")
            f.write(f"-- Sets: {set_count} | Cards: {card_count}\n")
            f.write("\n")

            # Sets — single multi-row INSERT
            set_cols = "id, code, name, has_unique_variant_numbers, created_at"
            set_vals = ", ".join(
                f"({_q(r[0])}, {_q(r[1])}, {_q(r[2])}, {_q(r[3])}, {_q(str(r[4]))})"
                for r in sets_rows
            )
            f.write(f"INSERT INTO sets ({set_cols}) VALUES {set_vals};\n")
            f.write("SELECT setval('sets_id_seq', (SELECT MAX(id) FROM sets));\n")
            f.write("\n")

            # Cards — batched multi-row INSERTs (one statement per line)
            card_cols = (
                "id, set_id, card_number, base_card_number, name, rarity, type, "
                "is_foil, is_hyperspace, is_prestige, is_showcase, is_organized_play, created_at"
            )
            for start in range(0, card_count, _BATCH_SIZE):
                batch = cards_rows[start : start + _BATCH_SIZE]
                vals = ", ".join(
                    f"({_q(r[0])}, {_q(r[1])}, {_q(r[2])}, {_q(r[3])}, {_q(r[4])}, "
                    f"{_q(r[5])}, {_q(r[6])}, {_q(r[7])}, {_q(r[8])}, {_q(r[9])}, "
                    f"{_q(r[10])}, {_q(r[11])}, {_q(str(r[12]))})"
                    for r in batch
                )
                f.write(f"INSERT INTO cards ({card_cols}) VALUES {vals};\n")
            f.write("SELECT setval('cards_id_seq', (SELECT MAX(id) FROM cards));\n")

        logger.info("Seed written: %s (%d sets, %d cards)", output_path, set_count, card_count)
        print(f"Seed written: {output_path} ({set_count} sets, {card_count} cards)")
        return output_path

    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    generate_seed()
