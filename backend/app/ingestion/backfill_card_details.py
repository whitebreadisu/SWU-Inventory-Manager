"""Backfill card_aspects, card_traits, and card_details from the CSV source files.

Reads the 7 standard-set (non-OP) CSVs and matches each row to all DB cards
sharing the same base_card_number. Idempotent: uses ON CONFLICT DO NOTHING.

Usage (inside the backend container):
    python -m app.ingestion.backfill_card_details
"""
from __future__ import annotations

import csv
import logging
from pathlib import Path

from sqlalchemy import text

from app.database import SessionLocal
from app.ingestion.normalize import parse_card_number

logger = logging.getLogger(__name__)

CSV_DIR = Path("/tcgcsv_files")

# Non-OP files only — OP promos often have incomplete aspect/trait data
STANDARD_FILES = [
    ("SOR", "SparkofRebellionProductsAndPrices.csv"),
    ("SHD", "ShadowsoftheGalaxyProductsAndPrices.csv"),
    ("TWI", "TwilightoftheRepublicProductsAndPrices.csv"),
    ("JTL", "JumptoLightspeedProductsAndPrices.csv"),
    ("LOF", "LegendsoftheForceProductsAndPrices.csv"),
    ("SEC", "SecretsofPowerProductsAndPrices.csv"),
    ("LAW", "ALawlessTimeProductsAndPrices.csv"),
]


def _parse_list(raw: str) -> list[str]:
    return [s.strip() for s in raw.split(";") if s.strip()]


def _parse_int(raw: str) -> int | None:
    try:
        return int(raw.split("/")[0].strip())
    except (ValueError, AttributeError):
        return None


def run(db) -> None:
    set_id_map: dict[str, int] = {
        row[0]: row[1]
        for row in db.execute(text("SELECT code, id FROM sets")).fetchall()
    }

    for set_code, csv_filename in STANDARD_FILES:
        set_id = set_id_map.get(set_code)
        if set_id is None:
            logger.warning("Set %s not found in DB — skipping", set_code)
            continue

        filepath = CSV_DIR / csv_filename
        if not filepath.exists():
            logger.warning("CSV not found: %s — skipping", filepath)
            continue

        # Build map: base_card_number (str) -> enrichment data
        # Use the first non-empty record for each card_number as canonical data.
        enrichment: dict[str, dict] = {}

        with open(filepath, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                raw_number = row.get("extNumber", "").strip()
                if not raw_number:
                    continue
                try:
                    card_number = parse_card_number(raw_number)
                except Exception:
                    continue

                if card_number in enrichment:
                    continue  # already captured canonical data from first row

                aspects = _parse_list(row.get("extAspect", ""))
                traits = _parse_list(row.get("extTraits", ""))
                cost = _parse_int(row.get("extCost", ""))
                power = _parse_int(row.get("extPower", ""))
                hp = _parse_int(row.get("extHP", ""))
                arena = row.get("extArenaType", "").strip() or None

                enrichment[card_number] = {
                    "aspects": aspects,
                    "traits": traits,
                    "cost": cost,
                    "power": power,
                    "hp": hp,
                    "arena": arena,
                }

        # Fetch all cards for this set, grouped by base_card_number
        rows = db.execute(
            text("SELECT id, base_card_number FROM cards WHERE set_id = :sid"),
            {"sid": set_id},
        ).fetchall()

        aspect_rows = []
        trait_rows = []
        detail_rows = []

        for card_id, base_num in rows:
            data = enrichment.get(base_num)
            if data is None:
                continue

            for aspect in data["aspects"]:
                aspect_rows.append({"card_id": card_id, "aspect": aspect})

            for trait in data["traits"]:
                trait_rows.append({"card_id": card_id, "trait": trait})

            detail_rows.append({
                "card_id": card_id,
                "cost": data["cost"],
                "power": data["power"],
                "hp": data["hp"],
                "arena": data["arena"],
            })

        if aspect_rows:
            db.execute(
                text(
                    "INSERT INTO card_aspects (card_id, aspect) VALUES (:card_id, :aspect) "
                    "ON CONFLICT DO NOTHING"
                ),
                aspect_rows,
            )

        if trait_rows:
            db.execute(
                text(
                    "INSERT INTO card_traits (card_id, trait) VALUES (:card_id, :trait) "
                    "ON CONFLICT DO NOTHING"
                ),
                trait_rows,
            )

        if detail_rows:
            db.execute(
                text(
                    "INSERT INTO card_details (card_id, cost, power, hp, arena) "
                    "VALUES (:card_id, :cost, :power, :hp, :arena) "
                    "ON CONFLICT DO NOTHING"
                ),
                detail_rows,
            )

        db.commit()
        logger.info(
            "%s: %d aspects, %d traits, %d details inserted",
            set_code,
            len(aspect_rows),
            len(trait_rows),
            len(detail_rows),
        )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    db = SessionLocal()
    try:
        run(db)
    finally:
        db.close()
