"""Backfill card_aspects, card_traits, and card_details from the CSV source files.

Reads the 7 standard-set (non-OP) CSVs and matches each row to all DB cards
sharing the same base_card_number. Idempotent: aspects and details use ON CONFLICT
DO NOTHING; traits are deleted and re-inserted each run to allow corrections.

Base card trait handling
------------------------
TCGPlayer repurposes the extTraits field for base cards: it mixes the card's
location name (a subtitle, not a gameplay trait) with traits from the token card
printed on the back of double-sided bases (e.g. "Armor", "Learned", "Official").

Two-step isolation of the location name:
  1. Intersection: collect extTraits across all rows sharing a card_number. Traits
     that vary between token variants (Armor vs Learned vs Fighter) are eliminated;
     only traits common to every variant survive. Works for JTL (4 variants) and
     LOF (3 variants).
  2. Token-trait filter: remove known token card traits from whatever remains.
     Handles SEC and LAW, which each have only one token variant so intersection
     alone cannot distinguish the location from the token trait.

_TOKEN_TRAITS must be updated whenever a new set introduces a new token type.

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

# Traits that belong to token card backs, not to the base card itself.
# These are filtered out when extracting the location name from base card extTraits.
# Update this set when a new set introduces a new token type.
_TOKEN_TRAITS: frozenset[str] = frozenset(
    {
        "Armor",  # Shield token (JTL, LOF)
        "Learned",  # Experience token (JTL, LOF)
        "Fighter",  # Unit token — X-Wing / TIE Fighter (JTL)
        "Vehicle",  # Unit token — X-Wing / TIE Fighter (JTL)
        "Force",  # Force token (LOF)
        "Official",  # Spy token (SEC)
        "Supply",  # Credit token (LAW)
    }
)


def _parse_list(raw: str) -> list[str]:
    return [s.strip() for s in raw.split(";") if s.strip()]


def _parse_int(raw: str) -> int | None:
    try:
        return int(raw.split("/")[0].strip())
    except (ValueError, AttributeError):
        return None


def _build_enrichment(filepath: Path) -> dict[str, dict]:
    """Parse one CSV file into a per-card enrichment dict.

    Phase 1 — collect every row for each card_number.
    Phase 2 — compute canonical enrichment data:
      - Base cards: location = intersection of all trait sets, minus token traits.
      - All other cards: first row wins for all fields.
    """
    rows_by_number: dict[str, list[dict]] = {}

    with open(filepath, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            raw_number = row.get("extNumber", "").strip()
            if not raw_number:
                continue
            try:
                card_number = parse_card_number(raw_number)
            except Exception:
                continue
            rows_by_number.setdefault(card_number, []).append(row)

    enrichment: dict[str, dict] = {}

    for card_number, rows in rows_by_number.items():
        first = rows[0]
        card_type = first.get("extCardType", "").strip()

        if card_type == "Base":
            trait_sets = [set(_parse_list(r.get("extTraits", ""))) for r in rows]
            non_empty = [s for s in trait_sets if s]
            if non_empty:
                candidates = set.intersection(*non_empty) - _TOKEN_TRAITS
            else:
                candidates = set()
            traits = sorted(candidates)
        else:
            traits = _parse_list(first.get("extTraits", ""))

        enrichment[card_number] = {
            "aspects": _parse_list(first.get("extAspect", "")),
            "traits": traits,
            "cost": _parse_int(first.get("extCost", "")),
            "power": _parse_int(first.get("extPower", "")),
            "hp": _parse_int(first.get("extHP", "")),
            "arena": first.get("extArenaType", "").strip() or None,
        }

    return enrichment


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

        enrichment = _build_enrichment(filepath)

        card_rows = db.execute(
            text("SELECT id, base_card_number FROM cards WHERE set_id = :sid"),
            {"sid": set_id},
        ).fetchall()

        aspect_rows = []
        trait_rows = []
        detail_rows = []

        for card_id, base_num in card_rows:
            data = enrichment.get(base_num)
            if data is None:
                continue

            for aspect in data["aspects"]:
                aspect_rows.append({"card_id": card_id, "aspect": aspect})

            for trait in data["traits"]:
                trait_rows.append({"card_id": card_id, "trait": trait})

            detail_rows.append(
                {
                    "card_id": card_id,
                    "cost": data["cost"],
                    "power": data["power"],
                    "hp": data["hp"],
                    "arena": data["arena"],
                }
            )

        # Traits are deleted and re-inserted to ensure corrections take effect.
        db.execute(
            text(
                "DELETE FROM card_traits WHERE card_id IN "
                "(SELECT id FROM cards WHERE set_id = :sid)"
            ),
            {"sid": set_id},
        )

        if aspect_rows:
            db.execute(
                text(
                    "INSERT INTO card_aspects (card_id, aspect) "
                    "VALUES (:card_id, :aspect) ON CONFLICT DO NOTHING"
                ),
                aspect_rows,
            )

        if trait_rows:
            db.execute(
                text(
                    "INSERT INTO card_traits (card_id, trait) "
                    "VALUES (:card_id, :trait) ON CONFLICT DO NOTHING"
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
