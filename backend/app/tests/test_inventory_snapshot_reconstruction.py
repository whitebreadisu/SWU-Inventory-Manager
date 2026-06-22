"""SS8.5 cutover-safety test (SWU_Catalog_Redesign_Spec.md): proves the
remap+reload tool (app/ingestion/regenerate_inventory.py) restores
inventory correctly onto the new card_variants schema.

Disposition note (CLAUDE.md "## Testing" / redesign spec SS8.1): this file's
pre-redesign predecessor (a TRUNCATE/reload-from-file/rollback test against
the now-retired flat `inventory_snapshot.sql` format and `cards.id`) was
removed by BL-33 step 1 along with the old schema (cards.id no longer
exists). This is a **replace**, not a port: the underlying behavior
("inventory survives a wipe+reload") is the same, but the mechanism is
now the old_card_id -> card_variants.id crosswalk + remap, not a literal
snapshot-file replay, so a fresh test against the new mechanism supersedes
the old assertion.

Per redesign spec SS8.3, this uses a SMALL synthetic fixture inline (a
handful of old-card rows + a matching slice of new-schema base_cards/
card_variants), not the real archived snapshot and not live data -- the
real archived snapshot is exercised by manual local validation only
(BL-33 step 4), never in CI.
"""

from sqlalchemy import text

from app.ingestion.regenerate_inventory import (
    FlaggedRow,
    OldCard,
    build_crosswalk,
    regenerate_inventory,
    resolve_tenant_id,
)

# Reuses the session-autouse seed_default_test_user fixture (conftest.py):
# tenant #1 already has a users row for this email.
TEST_EMAIL = "test-tenant-1@example.com"


def _make_crosswalk_sql(old_cards: list[tuple]) -> str:
    """Builds a minimal `INSERT INTO cards (...) VALUES (...);` statement in
    the exact old-seed column order regenerate_inventory.py's regex parses:
    (id, set_id, card_number, base_card_number, name, rarity, type,
    is_foil, is_hyperspace, is_prestige, is_showcase, is_organized_play,
    created_at)."""
    tuples = ", ".join(
        f"({old_id}, {set_id}, '{card_number}', '{base_card_number}', "
        f"'{name}', 'C', '{type_}', {str(is_foil).lower()}, "
        f"{str(is_hyperspace).lower()}, {str(is_prestige).lower()}, "
        f"{str(is_showcase).lower()}, {str(is_op).lower()}, '2026-01-01 00:00:00')"
        for (
            old_id,
            set_id,
            card_number,
            base_card_number,
            name,
            type_,
            is_foil,
            is_hyperspace,
            is_prestige,
            is_showcase,
            is_op,
        ) in old_cards
    )
    return (
        "INSERT INTO cards (id, set_id, card_number, base_card_number, name, "
        "rarity, type, is_foil, is_hyperspace, is_prestige, is_showcase, "
        f"is_organized_play, created_at) VALUES {tuples};"
    )


def _make_snapshot_sql(rows: list[tuple]) -> str:
    """rows: (tenant_id, old_card_id, quantity, updated_at)."""
    tuples = ", ".join(
        f"({tenant_id}, {old_card_id}, {qty}, '{updated_at}')"
        for tenant_id, old_card_id, qty, updated_at in rows
    )
    return (
        f"INSERT INTO inventory (tenant_id, card_id, quantity, updated_at) "
        f"VALUES {tuples} ON CONFLICT DO NOTHING;"
    )


def test_reconstruct_inventory_from_crosswalk_remap(db):
    """End-to-end: a small synthetic old-schema fixture (foil/non-foil
    shared-number case + an OP case + an unmappable case) is remapped onto
    a matching slice of the real new-schema catalog and reloaded for the
    tenant resolved by email. Asserts quantities land on the correct new
    variant_ids, and that the unmappable row is flagged, not dropped."""
    # 1. Pick a real, known-shape slice of the *new* schema to remap onto:
    #    a base card with both a Standard and Standard Foil sibling, plus a
    #    Weekly Play / Weekly Play Foil pair (any base set with full OP
    #    coverage works -- JTL has 40 Weekly Play[+Foil] rows per the local
    #    validation run, so it's a safe, populated choice).
    row = db.execute(
        text(
            """
            SELECT bc.id AS base_card_id, s.code AS set_code, bc.base_card_number,
                   (SELECT id FROM card_variants WHERE base_card_id = bc.id
                    AND variant_type = 'Standard') AS standard_id,
                   (SELECT id FROM card_variants WHERE base_card_id = bc.id
                    AND variant_type = 'Standard Foil') AS standard_foil_id,
                   (SELECT id FROM card_variants WHERE base_card_id = bc.id
                    AND variant_type = 'Weekly Play') AS weekly_play_id,
                   (SELECT id FROM card_variants WHERE base_card_id = bc.id
                    AND variant_type = 'Weekly Play Foil') AS weekly_play_foil_id
            FROM base_cards bc
            JOIN sets s ON s.id = bc.set_id
            WHERE s.code = 'JTL'
            AND EXISTS (SELECT 1 FROM card_variants WHERE base_card_id = bc.id AND variant_type = 'Standard')
            AND EXISTS (SELECT 1 FROM card_variants WHERE base_card_id = bc.id AND variant_type = 'Standard Foil')
            AND EXISTS (SELECT 1 FROM card_variants WHERE base_card_id = bc.id AND variant_type = 'Weekly Play')
            AND EXISTS (SELECT 1 FROM card_variants WHERE base_card_id = bc.id AND variant_type = 'Weekly Play Foil')
            LIMIT 1
            """
        )
    ).first()
    assert row is not None, (
        "Test requires at least one JTL base card with Standard/Standard Foil/"
        "Weekly Play/Weekly Play Foil siblings in the local catalog -- run "
        "BL-29 ingestion first."
    )

    old_cards = [
        # (old_id, set_id, card_number, base_card_number, name, type,
        #  is_foil, is_hyperspace, is_prestige, is_showcase, is_organized_play)
        # Non-foil/foil shared-number case: same base_card_number, finish
        # disambiguates.
        (
            90001,
            4,
            row.base_card_number,
            row.base_card_number,
            "Fixture Card",
            "Unit",
            False,
            False,
            False,
            False,
            False,
        ),
        (
            90002,
            4,
            row.base_card_number,
            row.base_card_number,
            "Fixture Card",
            "Unit",
            True,
            False,
            False,
            False,
            False,
        ),
        # OP case (non-foil): old OP-specific card_number differs from
        # base_card_number, exactly like the real General Veers example.
        (
            90003,
            4,
            "999",
            row.base_card_number,
            "Fixture Card",
            "Unit",
            False,
            False,
            False,
            False,
            True,
        ),
        # OP case (foil).
        (
            90004,
            4,
            "998",
            row.base_card_number,
            "Fixture Card",
            "Unit",
            True,
            False,
            False,
            False,
            True,
        ),
        # Unmappable: a base_card_number that does not exist in JTL.
        (
            90005,
            4,
            "999999",
            "999999",
            "Nonexistent Fixture Card",
            "Unit",
            False,
            False,
            False,
            False,
            False,
        ),
    ]
    crosswalk_sql = _make_crosswalk_sql(old_cards)

    snapshot_rows = [
        (1, 90001, 2, "2026-01-01 00:00:00"),
        (1, 90002, 1, "2026-01-01 00:00:00"),
        (1, 90003, 3, "2026-01-01 00:00:00"),
        (1, 90004, 4, "2026-01-01 00:00:00"),
        (1, 90005, 5, "2026-01-01 00:00:00"),
    ]
    snapshot_sql = _make_snapshot_sql(snapshot_rows)

    tenant_id = resolve_tenant_id(db, TEST_EMAIL)

    # regenerate_inventory() commits internally (it must, to durably wipe +
    # reload for a real cutover run), so a savepoint can't wrap it the way
    # the old TRUNCATE-based reconstruction test did -- a commit closes any
    # enclosing nested transaction. Snapshot tenant #1's pre-existing
    # inventory explicitly instead, and restore it by hand afterward.
    pre_existing_rows = db.execute(
        text("SELECT variant_id, quantity FROM inventory WHERE tenant_id = :tid"),
        {"tid": tenant_id},
    ).fetchall()

    try:
        result = regenerate_inventory(
            db, crosswalk_sql, snapshot_sql, email=TEST_EMAIL, dry_run=False
        )

        assert result.archived_row_count == 5
        assert result.archived_total_quantity == 2 + 1 + 3 + 4 + 5
        assert result.mapped_count == 4
        assert result.mapped_total_quantity == 2 + 1 + 3 + 4
        assert result.flagged_count == 1
        assert result.flagged[0].old_card_id == 90005
        assert result.flagged[0].quantity == 5
        assert "no base_card found" in result.flagged[0].reason
        assert result.tenant_id == tenant_id

        # Quantities land on the correct new variant_ids.
        loaded = {
            r.variant_id: r.quantity
            for r in db.execute(
                text(
                    "SELECT variant_id, quantity FROM inventory WHERE tenant_id = :tid"
                ),
                {"tid": tenant_id},
            )
        }
        assert loaded[row.standard_id] == 2
        assert loaded[row.standard_foil_id] == 1
        assert loaded[row.weekly_play_id] == 3
        assert loaded[row.weekly_play_foil_id] == 4
        # The wipe-and-reload nature of regenerate_inventory means only
        # these 4 rows exist post-reload for this tenant (pre-existing
        # tenant #1 rows from seed_minimal_catalog are wiped too).
        assert sum(loaded.values()) == 2 + 1 + 3 + 4

        # Conservation: mapped + flagged == archived (nothing silently lost).
        assert (
            result.mapped_total_quantity + result.flagged_total_quantity
            == result.archived_total_quantity
        )
    finally:
        db.execute(
            text("DELETE FROM inventory WHERE tenant_id = :tid"), {"tid": tenant_id}
        )
        for r in pre_existing_rows:
            db.execute(
                text(
                    "INSERT INTO inventory (tenant_id, variant_id, quantity) "
                    "VALUES (:tid, :vid, :qty) "
                    "ON CONFLICT (tenant_id, variant_id) DO UPDATE SET quantity = EXCLUDED.quantity"
                ),
                {"tid": tenant_id, "vid": r.variant_id, "qty": r.quantity},
            )
        db.commit()

    # Explicit restore reproduced the pre-test state exactly.
    post_rows = db.execute(
        text("SELECT variant_id, quantity FROM inventory WHERE tenant_id = :tid"),
        {"tid": tenant_id},
    ).fetchall()
    assert {(r.variant_id, r.quantity) for r in post_rows} == {
        (r.variant_id, r.quantity) for r in pre_existing_rows
    }


def test_unmappable_row_is_flagged_with_full_detail(db):
    """Unit-level guard on build_crosswalk/FlaggedRow directly (DB-free
    apart from the base_card lookup): an old card whose (set, number) has
    no match in the new catalog is collected with full detail, never
    silently dropped."""
    old_cards = {
        77777: OldCard(
            id=77777,
            set_code="JTL",
            card_number="999999",
            base_card_number="999999",
            name="Nonexistent Fixture Card",
            is_foil=False,
            is_hyperspace=False,
            is_prestige=False,
            is_showcase=False,
            is_organized_play=False,
        )
    }
    crosswalk, flagged = build_crosswalk(db, old_cards)

    assert crosswalk == {}
    assert len(flagged) == 1
    f: FlaggedRow = flagged[0]
    assert f.old_card_id == 77777
    assert f.set_code == "JTL"
    assert f.base_card_number == "999999"
    assert "no base_card found" in f.reason
