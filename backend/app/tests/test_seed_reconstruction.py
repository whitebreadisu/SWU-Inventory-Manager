"""
Seed reconstruction tests.

Verifies that the catalog can be fully rebuilt from the seed file alone,
and that the rebuilt catalog passes all domain rule checks (same rules used
against the live ingested database).

Process for each test:
  1. Record current catalog and inventory counts.
  2. Open a savepoint (nested transaction).
  3. TRUNCATE sets and cards CASCADE — also clears inventory due to FK.
  4. Apply seed line-by-line (same logic as apply_seed.py).
  5. Run assertions against the seed-only catalog state.
  6. Roll back the savepoint — all data, including inventory, is restored.

PostgreSQL TRUNCATE is transactional and fully reversed by a savepoint rollback.
"""

import os
from pathlib import Path

from sqlalchemy import text

from app.tests.test_card_domain_rules import (
    TestBaseCardVariants as _BaseCardVariants,
)
from app.tests.test_card_domain_rules import (
    TestLeaderCardVariants as _LeaderCardVariants,
)
from app.tests.test_card_domain_rules import (
    TestNonLeaderNonBaseCardVariants as _NonLeaderNonBaseCardVariants,
)

SEED_PATH = Path(os.environ.get("CATALOG_SEED_PATH", "/db/seeds/catalog_seed.sql"))


def _apply_seed(db, seed_lines):
    db.execute(text("TRUNCATE sets, cards RESTART IDENTITY CASCADE"))
    for stmt in seed_lines:
        db.execute(text(stmt))


def _seed_lines():
    return [
        line.strip()
        for line in SEED_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("--")
    ]


def test_reconstruct_catalog_from_seed(db):
    assert SEED_PATH.exists(), f"Seed file not found: {SEED_PATH}"

    pre_sets = db.execute(text("SELECT COUNT(*) FROM sets")).scalar()
    pre_cards = db.execute(text("SELECT COUNT(*) FROM cards")).scalar()
    pre_inventory = db.execute(text("SELECT COUNT(*) FROM inventory")).scalar()

    assert pre_sets > 0, "Database has no sets — run ingestion before this test"
    assert pre_cards > 0, "Database has no cards — run ingestion before this test"

    savepoint = db.begin_nested()
    _apply_seed(db, _seed_lines())

    assert db.execute(text("SELECT COUNT(*) FROM sets")).scalar() == pre_sets, (
        "Set count mismatch after reconstruction"
    )
    assert db.execute(text("SELECT COUNT(*) FROM cards")).scalar() == pre_cards, (
        "Card count mismatch after reconstruction"
    )

    savepoint.rollback()

    assert db.execute(text("SELECT COUNT(*) FROM sets")).scalar() == pre_sets, (
        "Savepoint rollback did not restore sets"
    )
    assert db.execute(text("SELECT COUNT(*) FROM cards")).scalar() == pre_cards, (
        "Savepoint rollback did not restore cards"
    )
    assert (
        db.execute(text("SELECT COUNT(*) FROM inventory")).scalar() == pre_inventory
    ), "Savepoint rollback did not restore inventory"


def test_seed_rebuilt_catalog_passes_domain_rules(db):
    """Rebuild the catalog from the seed file and run all domain rule checks
    against that seed-only state. Inventory is preserved via savepoint rollback."""
    assert SEED_PATH.exists(), f"Seed file not found: {SEED_PATH}"

    savepoint = db.begin_nested()
    _apply_seed(db, _seed_lines())

    _BaseCardVariants().test_common_base_cards_have_standard_and_hyperspace(db)
    _BaseCardVariants().test_rare_base_cards_have_standard_foil_hyperspace_and_foil_hyperspace(
        db
    )
    _LeaderCardVariants().test_common_and_rare_leaders_have_standard_hyperspace_and_showcase(
        db
    )
    _NonLeaderNonBaseCardVariants().test_all_valid_variants_present(db)

    savepoint.rollback()
