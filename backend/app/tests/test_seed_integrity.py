"""
Seed file integrity tests.

Validates the catalog seed file against the live database. These are
integration tests that require DATABASE_URL to be set (standard inside
the backend container).
"""

import os
import re
from pathlib import Path

from sqlalchemy import text

SEED_PATH = Path(os.environ.get("CATALOG_SEED_PATH", "/db/seeds/catalog_seed.sql"))

_KNOWN_SETS = {"SOR", "SHD", "TWI", "JTL", "LOF", "SEC", "LAW"}


def _read_seed() -> str:
    return SEED_PATH.read_text(encoding="utf-8")


def _parse_metadata(content: str) -> tuple[int, int]:
    """Extract declared set/card counts from the seed header comment."""
    for line in content.splitlines():
        m = re.search(r"Sets:\s*(\d+)\s*\|\s*Cards:\s*(\d+)", line)
        if m:
            return int(m.group(1)), int(m.group(2))
    return 0, 0


# ---------------------------------------------------------------------------
# File-level checks (no DB required)
# ---------------------------------------------------------------------------


def test_seed_file_exists():
    assert SEED_PATH.exists(), f"Seed file not found: {SEED_PATH}"


def test_seed_file_contains_required_sections():
    content = _read_seed()
    assert "INSERT INTO sets" in content, "Seed missing INSERT INTO sets"
    assert "INSERT INTO cards" in content, "Seed missing INSERT INTO cards"
    assert "setval('sets_id_seq'" in content, "Seed missing sets sequence reset"
    assert "setval('cards_id_seq'" in content, "Seed missing cards sequence reset"


# ---------------------------------------------------------------------------
# Counts: seed metadata vs live database
# ---------------------------------------------------------------------------


def test_seed_set_count_matches_database(db):
    content = _read_seed()
    seed_sets, _ = _parse_metadata(content)
    assert seed_sets > 0, "Could not parse set count from seed metadata"

    db_sets = db.execute(text("SELECT COUNT(*) FROM sets")).scalar()
    assert seed_sets == db_sets, (
        f"Seed declares {seed_sets} sets but database has {db_sets}"
    )


def test_seed_card_count_matches_database(db):
    content = _read_seed()
    _, seed_cards = _parse_metadata(content)
    assert seed_cards > 0, "Could not parse card count from seed metadata"

    db_cards = db.execute(text("SELECT COUNT(*) FROM cards")).scalar()
    assert seed_cards == db_cards, (
        f"Seed declares {seed_cards} cards but database has {db_cards}"
    )


# ---------------------------------------------------------------------------
# Set codes: seed vs live database
# ---------------------------------------------------------------------------


def test_seed_set_codes_match_database(db):
    content = _read_seed()
    set_line = next(
        (ln for ln in content.splitlines() if ln.startswith("INSERT INTO sets")), None
    )
    assert set_line is not None, "Could not find INSERT INTO sets line in seed"

    # Extract 3-character uppercase set codes from the VALUES clause
    codes_in_seed = set(re.findall(r"'([A-Z]{3})'", set_line))
    assert codes_in_seed == _KNOWN_SETS, (
        f"Seed set codes {codes_in_seed} do not match expected {_KNOWN_SETS}"
    )

    from app.models.set_model import CardSet

    codes_in_db = {s.code for s in db.query(CardSet).all()}
    assert codes_in_seed == codes_in_db, (
        f"Seed set codes {codes_in_seed} differ from database {codes_in_db}"
    )


# ---------------------------------------------------------------------------
# Spot check: known variant counts per set
# ---------------------------------------------------------------------------


def test_seed_card_counts_per_set_match_database(db):
    """Each set's card count in the seed header should match the live DB.
    Validates that no set was silently dropped or duplicated during seed generation."""
    content = _read_seed()
    _, seed_total = _parse_metadata(content)
    assert seed_total > 0

    rows = db.execute(
        text(
            "SELECT s.code, COUNT(c.id) FROM cards c JOIN sets s ON c.set_id = s.id GROUP BY s.code"
        )
    ).fetchall()
    db_total = sum(count for _, count in rows)

    assert seed_total == db_total, (
        f"Seed total {seed_total} does not match sum of per-set DB counts {db_total}"
    )
