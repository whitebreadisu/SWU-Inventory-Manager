"""Card catalog integrity tests.

Verifies the state of the cards table after F3 ingestion + all migrations.
These are integration tests that require a running database.

Run inside the backend container:
    docker compose exec backend pytest app/tests/test_card_catalog.py -v
"""
import os

import pytest
from sqlalchemy import text

from app.models.card import Card

pytestmark = pytest.mark.skipif(
    "DATABASE_URL" not in os.environ,
    reason="requires DATABASE_URL — run inside the backend container",
)


class TestBaseCardNumberIntegrity:
    """Every card's base_card_number must point to a valid standard card
    in the same set. This is the core lookup key for inventory ingestion."""

    def test_no_orphaned_base_card_numbers(self, db):
        """base_card_number must exist as a card_number within the same set."""
        orphans = db.execute(text("""
            SELECT s.code, c.card_number, c.base_card_number, c.name
            FROM cards c
            JOIN sets s ON s.id = c.set_id
            WHERE NOT EXISTS (
                SELECT 1 FROM cards ref
                WHERE ref.set_id = c.set_id
                  AND ref.card_number = c.base_card_number
            )
        """)).fetchall()
        assert orphans == [], (
            f"{len(orphans)} card(s) have a base_card_number that doesn't exist — "
            + ", ".join(f"{r.code}#{r.card_number}(base={r.base_card_number})" for r in orphans[:5])
        )

    def test_standard_card_exists_for_every_resolved_variant(self, db):
        """For every card that was successfully resolved (base_card_number differs
        from its own card_number), a standard card must exist at that base_card_number.
        Self-referencing cards (base == own number) are excluded — they represent
        unresolved cards such as OP-only or Prestige-only variants where no matching
        standard card name was found during ingestion."""
        missing = db.execute(text("""
            SELECT DISTINCT s.code, c.card_number, c.base_card_number, c.name
            FROM cards c
            JOIN sets s ON s.id = c.set_id
            WHERE c.card_number != c.base_card_number
              AND NOT EXISTS (
                SELECT 1 FROM cards std
                WHERE std.set_id = c.set_id
                  AND std.card_number = c.base_card_number
                  AND std.is_foil = false
                  AND std.is_hyperspace = false
                  AND std.is_prestige = false
                  AND std.is_showcase = false
                  AND std.is_organized_play = false
              )
        """)).fetchall()
        assert missing == [], (
            f"{len(missing)} resolved variant(s) point to a missing standard — "
            + ", ".join(f"{r.code}#{r.card_number}(base={r.base_card_number})" for r in missing[:5])
        )

    def test_variant_groups_share_consistent_base_name(self, db):
        """All cards that share a base_card_number within a set must share
        the same base name. The only permitted name difference is the
        '(Showcase)' suffix, which is preserved in stored names by design."""
        inconsistent = db.execute(text("""
            SELECT s.code, c.base_card_number,
                   COUNT(DISTINCT REPLACE(c.name, ' (Showcase)', '')) AS distinct_names
            FROM cards c
            JOIN sets s ON s.id = c.set_id
            GROUP BY s.code, c.base_card_number
            HAVING COUNT(DISTINCT REPLACE(c.name, ' (Showcase)', '')) > 1
        """)).fetchall()
        assert inconsistent == [], (
            f"{len(inconsistent)} variant group(s) have inconsistent names — "
            + ", ".join(f"{r.code} base={r.base_card_number} ({r.distinct_names} names)" for r in inconsistent[:5])
        )


class TestNameIntegrity:

    def test_no_accented_characters_in_stored_names(self, db):
        """All card names must be accent-normalized (no combining diacritical marks).
        normalize_card_name() in normalize.py strips these before storage."""
        accented = db.execute(text("""
            SELECT s.code, c.card_number, c.name
            FROM cards c
            JOIN sets s ON s.id = c.set_id
            WHERE c.name != unaccent(c.name)
            ORDER BY s.code, c.card_number::int
        """)).fetchall()
        assert accented == [], (
            f"{len(accented)} card(s) have accented names — "
            + ", ".join(repr(r.name) for r in accented[:5])
        )


class TestSchemaConstraints:

    def test_showcase_cards_are_always_foil(self, db):
        """Showcase cards are physically foil — is_foil must always be True."""
        non_foil_showcases = db.query(Card).filter(
            Card.is_showcase == True,
            Card.is_foil == False,
        ).count()
        assert non_foil_showcases == 0


class TestSetRecordCounts:
    """Expected totals reflect the catalog state after F3 ingestion and all
    data quality migrations (0004–0011). Update these if new sets are added
    or a migration changes the catalog."""

    EXPECTED_TOTALS = {
        "SOR": 976,
        "SHD": 988,
        "TWI": 985,
        "JTL": 1127,
        "LOF": 1154,
        "SEC": 1149,
        "LAW": 902,
    }
    EXPECTED_STANDARD = {
        "SOR": 253, "SHD": 263, "TWI": 258,
        "JTL": 263, "LOF": 264, "SEC": 265, "LAW": 264,
    }
    EXPECTED_OP = {
        "SOR": 29, "SHD": 28, "TWI": 30,
        "JTL": 40, "LOF": 40, "SEC": 40, "LAW": 40,
    }

    def test_total_cards_per_set(self, db, set_ids):
        for code, expected in self.EXPECTED_TOTALS.items():
            actual = db.query(Card).filter(Card.set_id == set_ids[code]).count()
            assert actual == expected, f"{code}: expected {expected} total, got {actual}"

    def test_standard_cards_per_set(self, db, set_ids):
        for code, expected in self.EXPECTED_STANDARD.items():
            actual = db.query(Card).filter(
                Card.set_id == set_ids[code],
                Card.is_foil == False,
                Card.is_hyperspace == False,
                Card.is_prestige == False,
                Card.is_showcase == False,
                Card.is_organized_play == False,
            ).count()
            assert actual == expected, f"{code}: expected {expected} standard, got {actual}"

    def test_op_cards_per_set(self, db, set_ids):
        for code, expected in self.EXPECTED_OP.items():
            actual = db.query(Card).filter(
                Card.set_id == set_ids[code],
                Card.is_organized_play == True,
            ).count()
            assert actual == expected, f"{code}: expected {expected} OP cards, got {actual}"


class TestRegressionCases:
    """Targeted regression tests for every data quality bug found during F4.
    Each test documents the original failure mode and confirms it is resolved."""

    def test_chirrut_imwe_all_variants_resolved(self, db, set_ids):
        """LAW: 'Chirrut Îmwe' (standard) vs 'Chirrut Imwe' (variants) encoding
        inconsistency in the TCGPlayer CSV caused name-join failure in
        _assign_base_card_numbers. Fixed by normalize_card_name() + migration 0007."""
        cards = (
            db.query(Card)
            .filter(Card.set_id == set_ids["LAW"], Card.base_card_number == "46")
            .all()
        )
        assert len(cards) == 5, f"Expected 5 Chirrut Imwe variants, got {len(cards)}"
        for c in cards:
            assert c.name.startswith("Chirrut Imwe"), f"Unexpected name: {c.name!r}"
            assert "Î" not in c.name, f"Unstripped Î still present: {c.name!r}"

    def test_bardottan_ornithopter_all_four_variants_present(self, db, set_ids):
        """SEC: Bardottan Ornithopter Foil (571) and Hyperspace Foil (817) were
        silently dropped by ON CONFLICT DO NOTHING because Willrow Hood was inserted
        first and shared those card numbers (manufacturing error). Fixed by adding
        'name' to the unique constraint (migration 0008)."""
        cards = (
            db.query(Card)
            .filter(Card.set_id == set_ids["SEC"], Card.base_card_number == "62")
            .all()
        )
        assert len(cards) == 4, f"Expected 4 Bardottan Ornithopter variants, got {len(cards)}"
        variants = {(c.is_foil, c.is_hyperspace) for c in cards}
        assert variants == {(False, False), (False, True), (True, False), (True, True)}

    def test_willrow_hood_and_bardottan_coexist_at_shared_numbers(self, db, set_ids):
        """SEC: Card numbers 571 and 817 are shared between two distinct physical
        cards due to a manufacturer error. Both must be present in the catalog."""
        for card_number in ("571", "817"):
            cards = (
                db.query(Card)
                .filter(Card.set_id == set_ids["SEC"], Card.card_number == card_number)
                .all()
            )
            names = {c.name for c in cards}
            assert len(cards) == 2, (
                f"SEC #{card_number}: expected Willrow Hood + Bardottan Ornithopter, got {names}"
            )
            assert "Willrow Hood - On the Run" in names
            assert "Bardottan Ornithopter" in names

    def test_rio_durant_name_consistent_across_all_variants(self, db, set_ids):
        """JTL: TCGPlayer CSV used 'Wisecrack Wheelman' for Hyperspace (277) and
        Showcase (1011) but 'Wisecracking Wheelman' for the standard (15). Fixed
        by migration 0011 and correcting the source CSV."""
        cards = (
            db.query(Card)
            .filter(Card.set_id == set_ids["JTL"], Card.base_card_number == "15")
            .all()
        )
        assert len(cards) == 3, f"Expected 3 Rio Durant records, got {len(cards)}"
        for c in cards:
            assert "Wisecracking" in c.name, f"Inconsistent name still present: {c.name!r}"
            assert "Wisecrack " not in c.name.replace("Wisecracking", ""), (
                f"Unexpected truncated name: {c.name!r}"
            )

    def test_razor_crest_all_variants_point_to_standard(self, db, set_ids):
        """JTL: 'Ride for Hire' (standard) vs 'Ride For Hire' (all variants) case
        difference caused _assign_base_card_numbers to leave 5 variants unlinked.
        Fixed by case-insensitive resolution in migration 0010."""
        cards = (
            db.query(Card)
            .filter(Card.set_id == set_ids["JTL"], Card.base_card_number == "223")
            .all()
        )
        assert len(cards) == 6, f"Expected 6 Razor Crest records, got {len(cards)}"
        for c in cards:
            assert c.base_card_number == "223", (
                f"Razor Crest #{c.card_number} has wrong base: {c.base_card_number}"
            )

    def test_shd_showcase_op_hyperspace_variants_resolved(self, db, set_ids):
        """SHD: Phase-III Dark Trooper (84), Grogu (196), Gideon's Light Cruiser (242),
        and Greef Karga (245) each have an OP Hyperspace as their only OP variant.
        base_card_numbers were fixed by migration 0004; inventory lookup uses the
        Promo/Hyperspace fallback added to _lookup_card in excel_ingestor.py."""
        for base_num in ("84", "196", "242", "245"):
            cards = (
                db.query(Card)
                .filter(
                    Card.set_id == set_ids["SHD"],
                    Card.base_card_number == base_num,
                )
                .all()
            )
            assert len(cards) == 2, (
                f"SHD base #{base_num}: expected 2 records (standard + OP Hyperspace), got {len(cards)}"
            )
            op_hs = [c for c in cards if c.is_hyperspace and c.is_organized_play]
            assert len(op_hs) == 1, (
                f"SHD base #{base_num}: expected 1 OP Hyperspace variant, got {len(op_hs)}"
            )
