"""Card domain / business rule tests.

Verifies that the card catalog matches known SWU product release rules —
what variant combinations are expected for each card type and rarity.

These tests are written from a user/game perspective, not a data integrity
perspective. A failure means a card or variant is missing from the catalog,
or an unexpected variant was added.

Run inside the backend container:
    docker compose exec backend pytest app/tests/test_card_domain_rules.py -v
"""
import os

import pytest
from sqlalchemy import text

pytestmark = pytest.mark.skipif(
    "DATABASE_URL" not in os.environ,
    reason="requires DATABASE_URL — run inside the backend container",
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _base_card_groups(db):
    """Return variant groups for all non-OP, non-Prestige Base cards.

    Returns a dict keyed by (set_code, base_card_number) with values:
        {"rarity": str, "variants": set of (is_foil, is_hyperspace)}
    """
    rows = db.execute(text("""
        SELECT s.code, c.base_card_number, c.rarity, c.is_foil, c.is_hyperspace
        FROM cards c
        JOIN sets s ON s.id = c.set_id
        WHERE c.type = 'Base'
          AND c.is_organized_play = false
          AND c.is_prestige     = false
        ORDER BY s.code, c.base_card_number::int
    """)).fetchall()

    groups = {}
    for row in rows:
        key = (row.code, row.base_card_number)
        if key not in groups:
            groups[key] = {"rarity": row.rarity, "variants": set()}
        groups[key]["variants"].add((row.is_foil, row.is_hyperspace))

    return groups


STANDARD        = (False, False)   # is_foil=F, is_hyperspace=F
FOIL            = (True,  False)   # is_foil=T, is_hyperspace=F
HYPERSPACE      = (False, True)    # is_foil=F, is_hyperspace=T
FOIL_HYPERSPACE = (True,  True)    # is_foil=T, is_hyperspace=T


# ---------------------------------------------------------------------------
# Base card variant rules
# ---------------------------------------------------------------------------

class TestBaseCardVariants:
    """Base cards follow specific variant rules based on rarity.

    Common:  standard + hyperspace                          (2 variants)
    Rare:    standard + foil + hyperspace + f-hyperspace    (4 variants)
    """

    def test_common_base_cards_have_standard_and_hyperspace(self, db):
        """Every Common Base card should have exactly standard and hyperspace variants."""
        expected = {STANDARD, HYPERSPACE}
        failures = [
            f"{code} base={num} got={data['variants']}"
            for (code, num), data in _base_card_groups(db).items()
            if data["rarity"] == "C" and data["variants"] != expected
        ]
        assert not failures, (
            f"{len(failures)} Common Base card(s) have wrong variants:\n  "
            + "\n  ".join(failures)
        )

    def test_rare_base_cards_have_standard_foil_hyperspace_and_foil_hyperspace(self, db):
        """Every Rare Base card should have exactly standard, foil, hyperspace,
        and foil-hyperspace variants.

        Note: LAW Rare Bases skip standalone Foil and have F-Hyperspace instead,
        matching the LAW product design (no standalone foil slot for Bases).
        The expected sets are split by set to account for this difference.
        """
        groups = _base_card_groups(db)
        rare_groups = {k: v for k, v in groups.items() if v["rarity"] == "R"}

        # Sets that include standalone Foil
        expected_with_foil    = {STANDARD, FOIL, HYPERSPACE, FOIL_HYPERSPACE}
        # LAW skips standalone Foil
        expected_law          = {STANDARD, HYPERSPACE, FOIL_HYPERSPACE}

        failures = []
        for (code, num), data in rare_groups.items():
            expected = expected_law if code == "LAW" else expected_with_foil
            if data["variants"] != expected:
                failures.append(f"{code} base={num} got={data['variants']} expected={expected}")

        assert not failures, (
            f"{len(failures)} Rare Base card(s) have wrong variants:\n  "
            + "\n  ".join(failures)
        )


# ---------------------------------------------------------------------------
# Leader card variant rules
# ---------------------------------------------------------------------------

class TestLeaderCardVariants:
    """Every Common and Rare Leader card should have exactly three variants:
    standard, hyperspace, and showcase.

    Special (S) rarity Leaders are starter-deck exclusives and follow different
    product release rules depending on the set — they are excluded from this test.

    Implementation note: Showcase cards in LOF and SEC have their own
    base_card_number rather than pointing back to the standard card, so the
    showcase check is done by name matching ('Card Name (Showcase)') rather
    than by base_card_number grouping.
    """

    def test_common_and_rare_leaders_have_standard_hyperspace_and_showcase(self, db):
        """Every C/R Leader should have a standard, hyperspace, and showcase variant."""
        # Standard cards are the anchor: non-foil, non-hyperspace, non-showcase, non-OP
        rows = db.execute(text("""
            SELECT s.code, c.card_number, c.name
            FROM cards c
            JOIN sets s ON s.id = c.set_id
            WHERE c.type    = 'Leader'
              AND c.rarity  IN ('C', 'R')
              AND c.is_foil          = false
              AND c.is_hyperspace    = false
              AND c.is_showcase      = false
              AND c.is_organized_play = false
              AND c.is_prestige      = false
            ORDER BY s.code, c.card_number::int
        """)).fetchall()

        missing_hyperspace = []
        missing_showcase   = []

        for row in rows:
            # Hyperspace: linked via base_card_number in all sets
            hs = db.execute(text("""
                SELECT 1 FROM cards c
                JOIN sets s ON s.id = c.set_id
                WHERE s.code = :code
                  AND c.base_card_number = :num
                  AND c.is_hyperspace    = true
                  AND c.is_organized_play = false
                LIMIT 1
            """), {"code": row.code, "num": row.card_number}).fetchone()

            if not hs:
                missing_hyperspace.append(f"{row.code} '{row.name}'")

            # Showcase: check by name match to handle LOF/SEC unlinked showcases
            sc = db.execute(text("""
                SELECT 1 FROM cards c
                JOIN sets s ON s.id = c.set_id
                WHERE s.code   = :code
                  AND c.name   = :showcase_name
                  AND c.is_showcase = true
                LIMIT 1
            """), {"code": row.code, "showcase_name": f"{row.name} (Showcase)"}).fetchone()

            if not sc:
                missing_showcase.append(f"{row.code} '{row.name}'")

        failures = []
        if missing_hyperspace:
            failures.append(
                f"{len(missing_hyperspace)} Leader(s) missing Hyperspace:\n    "
                + "\n    ".join(missing_hyperspace)
            )
        if missing_showcase:
            failures.append(
                f"{len(missing_showcase)} Leader(s) missing Showcase:\n    "
                + "\n    ".join(missing_showcase)
            )

        assert not failures, "\n  ".join(failures)
