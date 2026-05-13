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


def generate_seed(output_path: Path = SEED_PATH) -> Path:
    db = SessionLocal()
    try:
        sets_rows = db.execute(
            text("SELECT id, code, name, has_unique_variant_numbers, created_at FROM sets ORDER BY id")
        ).fetchall()

        cards_rows = db.execute(
            text(
                "SELECT id, set_id, card_number, base_card_number, name, rarity, type, "
                "is_foil, is_hyperspace, is_prestige, is_showcase, is_organized_play, created_at "
                "FROM cards ORDER BY id"
            )
        ).fetchall()

        aspects_rows = db.execute(
            text("SELECT card_id, aspect FROM card_aspects ORDER BY card_id, aspect")
        ).fetchall()

        traits_rows = db.execute(
            text("SELECT card_id, trait FROM card_traits ORDER BY card_id, trait")
        ).fetchall()

        details_rows = db.execute(
            text(
                "SELECT card_id, cost, power, hp, arena FROM card_details ORDER BY card_id"
            )
        ).fetchall()

        keywords_rows = db.execute(
            text("SELECT card_id, keyword FROM card_keywords ORDER BY card_id, keyword")
        ).fetchall()

        set_count = len(sets_rows)
        card_count = len(cards_rows)

        output_path.parent.mkdir(parents=True, exist_ok=True)

        with output_path.open("w", encoding="utf-8") as f:
            f.write("-- SWU Card Catalog Seed\n")
            f.write(f"-- Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n")
            f.write(
                f"-- Sets: {set_count} | Cards: {card_count} | "
                f"Aspects: {len(aspects_rows)} | Traits: {len(traits_rows)} | "
                f"Details: {len(details_rows)} | Keywords: {len(keywords_rows)}\n"
            )
            f.write("\n")

            # Sets
            set_vals = ", ".join(
                f"({_q(r[0])}, {_q(r[1])}, {_q(r[2])}, {_q(r[3])}, {_q(str(r[4]))})"
                for r in sets_rows
            )
            f.write(
                f"INSERT INTO sets (id, code, name, has_unique_variant_numbers, created_at) "
                f"VALUES {set_vals};\n"
            )
            f.write("SELECT setval('sets_id_seq', (SELECT MAX(id) FROM sets));\n\n")

            # Cards
            card_cols = (
                "id, set_id, card_number, base_card_number, name, rarity, type, "
                "is_foil, is_hyperspace, is_prestige, is_showcase, is_organized_play, created_at"
            )
            _write_batched(f, "cards", card_cols, cards_rows, lambda r: (
                f"({_q(r[0])}, {_q(r[1])}, {_q(r[2])}, {_q(r[3])}, {_q(r[4])}, "
                f"{_q(r[5])}, {_q(r[6])}, {_q(r[7])}, {_q(r[8])}, {_q(r[9])}, "
                f"{_q(r[10])}, {_q(r[11])}, {_q(str(r[12]))})"
            ))
            f.write("SELECT setval('cards_id_seq', (SELECT MAX(id) FROM cards));\n\n")

            # Card aspects
            _write_batched(f, "card_aspects", "card_id, aspect", aspects_rows,
                           lambda r: f"({_q(r[0])}, {_q(r[1])})")
            f.write("\n")

            # Card traits
            _write_batched(f, "card_traits", "card_id, trait", traits_rows,
                           lambda r: f"({_q(r[0])}, {_q(r[1])})")
            f.write("\n")

            # Card details
            _write_batched(f, "card_details", "card_id, cost, power, hp, arena", details_rows,
                           lambda r: f"({_q(r[0])}, {_q(r[1])}, {_q(r[2])}, {_q(r[3])}, {_q(r[4])})")
            f.write("\n")

            # Card keywords (currently empty — included for completeness)
            _write_batched(f, "card_keywords", "card_id, keyword", keywords_rows,
                           lambda r: f"({_q(r[0])}, {_q(r[1])})")

        msg = (
            f"Seed written: {output_path} "
            f"({set_count} sets, {card_count} cards, "
            f"{len(aspects_rows)} aspects, {len(traits_rows)} traits, "
            f"{len(details_rows)} details)"
        )
        logger.info(msg)
        print(msg)
        return output_path

    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    generate_seed()
