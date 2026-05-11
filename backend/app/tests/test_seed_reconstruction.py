"""
Seed reconstruction test.

Verifies that the catalog can be fully rebuilt from the seed file alone.

Process:
  1. Record current catalog and inventory counts.
  2. Open a savepoint (nested transaction).
  3. TRUNCATE sets and cards CASCADE — this also clears inventory due to FK.
  4. Apply seed line-by-line (same logic as apply_seed.py).
  5. Assert catalog counts match the pre-truncate values.
  6. Roll back the savepoint — all data, including inventory, is restored.
  7. Assert the rollback was complete.

PostgreSQL TRUNCATE is transactional and fully reversed by a savepoint rollback.
"""
import os
from pathlib import Path

import pytest
from sqlalchemy import text

SEED_PATH = Path(os.environ.get("CATALOG_SEED_PATH", "/db/seeds/catalog_seed.sql"))


def test_reconstruct_catalog_from_seed(db):
    assert SEED_PATH.exists(), f"Seed file not found: {SEED_PATH}"

    # Record pre-test state
    pre_sets = db.execute(text("SELECT COUNT(*) FROM sets")).scalar()
    pre_cards = db.execute(text("SELECT COUNT(*) FROM cards")).scalar()
    pre_inventory = db.execute(text("SELECT COUNT(*) FROM inventory")).scalar()

    assert pre_sets > 0, "Database has no sets — run ingestion before this test"
    assert pre_cards > 0, "Database has no cards — run ingestion before this test"

    seed_lines = [
        line.strip()
        for line in SEED_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("--")
    ]

    # Savepoint: everything inside is rolled back at the end
    savepoint = db.begin_nested()

    # Clear catalog (CASCADE removes inventory rows due to FK)
    db.execute(text("TRUNCATE sets, cards RESTART IDENTITY CASCADE"))
    assert db.execute(text("SELECT COUNT(*) FROM sets")).scalar() == 0
    assert db.execute(text("SELECT COUNT(*) FROM cards")).scalar() == 0

    # Apply seed
    for stmt in seed_lines:
        db.execute(text(stmt))

    post_sets = db.execute(text("SELECT COUNT(*) FROM sets")).scalar()
    post_cards = db.execute(text("SELECT COUNT(*) FROM cards")).scalar()

    assert post_sets == pre_sets, (
        f"Reconstruction produced {post_sets} sets, expected {pre_sets}"
    )
    assert post_cards == pre_cards, (
        f"Reconstruction produced {post_cards} cards, expected {pre_cards}"
    )

    # Rollback savepoint — restores catalog and inventory
    savepoint.rollback()

    restored_sets = db.execute(text("SELECT COUNT(*) FROM sets")).scalar()
    restored_cards = db.execute(text("SELECT COUNT(*) FROM cards")).scalar()
    restored_inventory = db.execute(text("SELECT COUNT(*) FROM inventory")).scalar()

    assert restored_sets == pre_sets, "Savepoint rollback did not restore sets"
    assert restored_cards == pre_cards, "Savepoint rollback did not restore cards"
    assert restored_inventory == pre_inventory, "Savepoint rollback did not restore inventory"
