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
    # 1. Insert a small, self-contained new-schema slice to remap onto -- a
    #    handful of base_cards/card_variants per this file's docstring, with no
    #    dependency on the full ingested catalog, so it runs on CI's fresh DB.
    #    One base card with Standard / Standard Foil (source_set_code = its own
    #    base set, which regenerate_inventory._resolve_variant_id requires for
    #    finishes) plus Weekly Play / Weekly Play Foil siblings (matched by
    #    variant_type alone). SOR is old set_id 1 (regenerate_inventory.
    #    OLD_SET_ID_TO_CODE), so the synthetic old rows below use set_id=1.
    sor_id = db.execute(text("SELECT id FROM sets WHERE code = 'SOR'")).scalar()
    base_card_number = "99007"
    base_card_id = db.execute(
        text(
            "INSERT INTO base_cards "
            "(set_id, base_card_number, name, type, rarity, swuapi_id) "
            "VALUES (:sid, :num, 'SS8.5 Fixture Card', 'Unit', 'Common', 'test-ss85-bc') "
            "ON CONFLICT (swuapi_id) DO UPDATE SET name = EXCLUDED.name "
            "RETURNING id"
        ),
        {"sid": sor_id, "num": base_card_number},
    ).scalar()

    def _fixture_variant(swuapi_id: str, variant_type: str, card_number: str) -> int:
        return db.execute(
            text(
                "INSERT INTO card_variants "
                "(base_card_id, variant_type, source_set_code, card_number, swuapi_id) "
                "VALUES (:bcid, :vt, 'SOR', :num, :sid) "
                "ON CONFLICT (swuapi_id) DO UPDATE SET card_number = EXCLUDED.card_number "
                "RETURNING id"
            ),
            {
                "bcid": base_card_id,
                "vt": variant_type,
                "num": card_number,
                "sid": swuapi_id,
            },
        ).scalar()

    standard_id = _fixture_variant("test-ss85-v1", "Standard", "99007")
    standard_foil_id = _fixture_variant("test-ss85-v2", "Standard Foil", "99107")
    weekly_play_id = _fixture_variant("test-ss85-v3", "Weekly Play", "99307")
    weekly_play_foil_id = _fixture_variant("test-ss85-v4", "Weekly Play Foil", "99407")
    db.commit()

    old_cards = [
        # (old_id, set_id, card_number, base_card_number, name, type,
        #  is_foil, is_hyperspace, is_prestige, is_showcase, is_organized_play)
        # Non-foil/foil shared-number case: same base_card_number, finish
        # disambiguates.
        (
            90001,
            4,
            base_card_number,
            base_card_number,
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
            base_card_number,
            base_card_number,
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
            base_card_number,
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
            base_card_number,
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
        assert loaded[standard_id] == 2
        assert loaded[standard_foil_id] == 1
        assert loaded[weekly_play_id] == 3
        assert loaded[weekly_play_foil_id] == 4
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
        # Drop the inline fixture slice. Inventory referencing these variants
        # was wiped above, and the restored pre-existing rows reference only
        # seed_minimal_catalog variants, so the deletes can't FK-violate.
        db.execute(
            text("DELETE FROM card_variants WHERE base_card_id = :bcid"),
            {"bcid": base_card_id},
        )
        db.execute(
            text("DELETE FROM base_cards WHERE id = :bcid"), {"bcid": base_card_id}
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
