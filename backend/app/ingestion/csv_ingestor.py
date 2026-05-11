"""CSV ingestion pipeline for the SWU card catalog.

Processes all 14 source files (7 standard sets + 7 Organized Play) and populates
the sets and cards tables. Idempotent: uses ON CONFLICT DO NOTHING throughout,
so running twice on the same database produces no errors and no duplicate rows.
"""
from __future__ import annotations

import csv
import logging
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.ingestion.normalize import (
    is_card_row,
    is_serialized_name,
    normalize_rarity,
    parse_card_number,
    parse_variant_flags,
    strip_token_back,
)
from app.models.card import Card
from app.models.set_model import CardSet

logger = logging.getLogger(__name__)

_SETS_SEED = [
    {"code": "SOR", "name": "Spark of Rebellion", "has_unique_variant_numbers": False},
    {"code": "SHD", "name": "Shadows of the Galaxy", "has_unique_variant_numbers": False},
    {"code": "TWI", "name": "Twilight of the Republic", "has_unique_variant_numbers": False},
    {"code": "JTL", "name": "Jump to Lightspeed", "has_unique_variant_numbers": True},
    {"code": "LOF", "name": "Legends of the Force", "has_unique_variant_numbers": True},
    {"code": "SEC", "name": "Secrets of Power", "has_unique_variant_numbers": True},
    {"code": "LAW", "name": "A Lawless Time", "has_unique_variant_numbers": True},
]


@dataclass
class IngestionResult:
    sets_seeded: int = 0
    cards_inserted: int = 0
    cards_skipped: int = 0
    rows_filtered: int = 0
    file_summaries: list[dict] = field(default_factory=list)


def run_ingestion(db: Session, csv_dir: Path, mappings_file: Path) -> IngestionResult:
    """Run the full CSV ingestion pipeline.

    Seeds the sets table, then processes all 14 CSV files grouped by set.
    base_card_number assignment requires all files for a set to be parsed
    together before any inserts occur for that set.
    """
    result = IngestionResult()

    with open(mappings_file, encoding="utf-8") as f:
        mappings = yaml.safe_load(f)

    result.sets_seeded = _seed_sets(db)
    set_id_map = {s.code: s.id for s in db.query(CardSet).all()}

    files_by_set: dict[str, list[dict]] = {}
    for entry in mappings["files"]:
        files_by_set.setdefault(entry["set_code"], []).append(entry)

    for set_code, file_entries in files_by_set.items():
        set_id = set_id_map[set_code]
        has_unique = file_entries[0]["has_unique_variant_numbers"]

        all_rows: list[dict] = []
        total_filtered = 0

        for entry in file_entries:
            rows, filtered = _parse_file(entry, csv_dir, set_id)
            all_rows.extend(rows)
            total_filtered += filtered
            logger.info(
                "Parsed %s: %d card rows, %d filtered",
                entry["csv_filename"],
                len(rows),
                filtered,
            )

        _assign_base_card_numbers(all_rows)

        inserted, skipped = _insert_cards(db, all_rows)
        db.commit()

        result.cards_inserted += inserted
        result.cards_skipped += skipped
        result.rows_filtered += total_filtered
        result.file_summaries.append(
            {
                "set_code": set_code,
                "files": [e["csv_filename"] for e in file_entries],
                "parsed": len(all_rows),
                "inserted": inserted,
                "skipped": skipped,
                "filtered": total_filtered,
            }
        )
        logger.info(
            "Set %s complete: %d inserted, %d skipped, %d filtered",
            set_code,
            inserted,
            skipped,
            total_filtered,
        )

    return result


def _seed_sets(db: Session) -> int:
    """Insert the 7 known sets. ON CONFLICT DO NOTHING for idempotency."""
    stmt = pg_insert(CardSet.__table__).values(_SETS_SEED)
    stmt = stmt.on_conflict_do_nothing(index_elements=["code"])
    result = db.execute(stmt)
    db.commit()
    return result.rowcount


def _parse_file(
    entry: dict, csv_dir: Path, set_id: int
) -> tuple[list[dict], int]:
    """Parse one CSV file into a list of card row dicts.

    Returns (rows, filtered_count). filtered_count covers non-card product rows
    and Serialized cards. base_card_number is set to card_number as a placeholder;
    _assign_base_card_numbers overwrites it for unique-variant-number sets.
    """
    filepath = csv_dir / entry["csv_filename"]
    is_op = entry["is_organized_play"]
    use_sequential = entry.get("card_number_strategy") == "sequential"

    rows: list[dict] = []
    filtered = 0
    seq_counter = 2000

    with open(filepath, newline="", encoding="utf-8") as f:
        for raw_row in csv.DictReader(f):
            if not is_card_row(raw_row):
                filtered += 1
                continue

            name = strip_token_back(raw_row["name"])

            if is_serialized_name(name):
                filtered += 1
                continue

            if use_sequential:
                card_number = str(seq_counter)
                seq_counter += 1
            else:
                card_number = parse_card_number(raw_row["extNumber"])

            cleaned_name, is_foil, is_hyperspace, is_prestige, is_showcase = (
                parse_variant_flags(name, raw_row.get("subTypeName", ""))
            )

            rows.append(
                {
                    "set_id": set_id,
                    "name": cleaned_name,
                    "card_number": card_number,
                    "base_card_number": card_number,  # overwritten below for unique-variant sets
                    "rarity": normalize_rarity(raw_row["extRarity"]),
                    "type": raw_row["extCardType"],
                    "is_foil": is_foil,
                    "is_hyperspace": is_hyperspace,
                    "is_prestige": is_prestige,
                    "is_showcase": is_showcase,
                    "is_organized_play": is_op,
                }
            )

    return rows, filtered


def _assign_base_card_numbers(rows: list[dict]) -> None:
    """Set base_card_number on each row in-place.

    Finds the Standard card (all flags False, not OP) for each card name and
    stamps its card_number as base_card_number on every variant with that name.
    Falls back to card_number if no Standard match exists (e.g., OP-only cards).

    Applies universally to all sets. For SOR/SHD/TWI (has_unique_variant_numbers=False),
    Standard and Foil share the same card_number so their base_card_number is
    unchanged. Hyperspace and OP variants in those sets have distinct card_numbers
    and are correctly linked to the Standard card's number by this resolution.
    """
    name_to_std: dict[str, str] = {
        row["name"].lower(): row["card_number"]
        for row in rows
        if not row["is_foil"]
        and not row["is_hyperspace"]
        and not row["is_prestige"]
        and not row["is_showcase"]
        and not row["is_organized_play"]
    }

    for row in rows:
        std_number = name_to_std.get(row["name"].lower())
        if std_number:
            row["base_card_number"] = std_number
        # else: base_card_number stays as card_number (already set in _parse_file)


def _insert_cards(db: Session, rows: list[dict]) -> tuple[int, int]:
    """Bulk insert card rows. ON CONFLICT DO NOTHING on (set_id, card_number, is_foil).

    Returns (inserted, skipped).
    """
    if not rows:
        return 0, 0

    stmt = pg_insert(Card.__table__).values(rows)
    stmt = stmt.on_conflict_do_nothing(
        index_elements=["set_id", "card_number", "is_foil", "is_organized_play", "name"]
    )
    result = db.execute(stmt)
    inserted = result.rowcount
    return inserted, len(rows) - inserted
