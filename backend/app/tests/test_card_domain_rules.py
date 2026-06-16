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
    rows = db.execute(
        text("""
        SELECT s.code, c.base_card_number, c.rarity, c.is_foil, c.is_hyperspace
        FROM cards c
        JOIN sets s ON s.id = c.set_id
        WHERE c.type = 'Base'
          AND c.is_organized_play = false
          AND c.is_prestige     = false
        ORDER BY s.code, c.base_card_number::int
    """)
    ).fetchall()

    groups = {}
    for row in rows:
        key = (row.code, row.base_card_number)
        if key not in groups:
            groups[key] = {"rarity": row.rarity, "variants": set()}
        groups[key]["variants"].add((row.is_foil, row.is_hyperspace))

    return groups


STANDARD = (False, False)  # is_foil=F, is_hyperspace=F
FOIL = (True, False)  # is_foil=T, is_hyperspace=F
HYPERSPACE = (False, True)  # is_foil=F, is_hyperspace=T
FOIL_HYPERSPACE = (True, True)  # is_foil=T, is_hyperspace=T


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

    def test_rare_base_cards_have_standard_foil_hyperspace_and_foil_hyperspace(
        self, db
    ):
        """Every Rare Base card should have exactly standard, foil, hyperspace,
        and foil-hyperspace variants.

        Note: LAW Rare Bases skip standalone Foil and have F-Hyperspace instead,
        matching the LAW product design (no standalone foil slot for Bases).
        The expected sets are split by set to account for this difference.
        """
        groups = _base_card_groups(db)
        rare_groups = {k: v for k, v in groups.items() if v["rarity"] == "R"}

        # Sets that include standalone Foil
        expected_with_foil = {STANDARD, FOIL, HYPERSPACE, FOIL_HYPERSPACE}
        # LAW skips standalone Foil
        expected_law = {STANDARD, HYPERSPACE, FOIL_HYPERSPACE}

        failures = []
        for (code, num), data in rare_groups.items():
            expected = expected_law if code == "LAW" else expected_with_foil
            if data["variants"] != expected:
                failures.append(
                    f"{code} base={num} got={data['variants']} expected={expected}"
                )

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
    """

    def test_common_and_rare_leaders_have_standard_hyperspace_and_showcase(self, db):
        """Every C/R Leader should have a standard, hyperspace, and showcase variant."""
        # Standard cards are the anchor: non-foil, non-hyperspace, non-showcase, non-OP
        rows = db.execute(
            text("""
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
        """)
        ).fetchall()

        missing_hyperspace = []
        missing_showcase = []

        for row in rows:
            # Hyperspace: linked via base_card_number in all sets
            hs = db.execute(
                text("""
                SELECT 1 FROM cards c
                JOIN sets s ON s.id = c.set_id
                WHERE s.code = :code
                  AND c.base_card_number = :num
                  AND c.is_hyperspace    = true
                  AND c.is_organized_play = false
                LIMIT 1
            """),
                {"code": row.code, "num": row.card_number},
            ).fetchone()

            if not hs:
                missing_hyperspace.append(f"{row.code} '{row.name}'")

            # Showcase: match on base name — suffix is now stripped during ingestion
            sc = db.execute(
                text("""
                SELECT 1 FROM cards c
                JOIN sets s ON s.id = c.set_id
                WHERE s.code      = :code
                  AND c.name      = :name
                  AND c.is_showcase = true
                LIMIT 1
            """),
                {"code": row.code, "name": row.name},
            ).fetchone()

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


# ---------------------------------------------------------------------------
# Non-Leader / non-Base card variant rules
# ---------------------------------------------------------------------------

# Types excluded from variant completeness checks:
#   - Leader / Leader/Leader Unit — covered by TestLeaderCardVariants
#   - Base                        — covered by TestBaseCardVariants
#   - Token                       — generated by card effects, standard-only by design
#   - blank type                  — TCGPlayer CSV data gap; variant rules unknown
# Rarity S (Special/Starter) excluded — starter-deck exclusives with limited
# variant runs that do not follow standard product release rules.
# Card numbers beginning with 'T' (e.g. T01 Experience) are token upgrades
# and are excluded for the same reason as Token type cards.

_EXCLUDED_TYPES = ("Leader", "Base", "Token", "Leader/Leader Unit")
_TESTABLE_RARITIES = ("C", "U", "R", "L")

# Expected non-OP, non-Prestige variants per set (is_foil, is_hyperspace)
_EXPECTED_VARIANTS: dict[str, set] = {
    "SOR": {STANDARD, FOIL, HYPERSPACE, FOIL_HYPERSPACE},
    "SHD": {STANDARD, FOIL, HYPERSPACE, FOIL_HYPERSPACE},
    "TWI": {STANDARD, FOIL, HYPERSPACE, FOIL_HYPERSPACE},
    "JTL": {STANDARD, FOIL, HYPERSPACE, FOIL_HYPERSPACE},
    "LOF": {STANDARD, FOIL, HYPERSPACE, FOIL_HYPERSPACE},
    "SEC": {STANDARD, FOIL, HYPERSPACE, FOIL_HYPERSPACE},
    "LAW": {STANDARD, HYPERSPACE, FOIL_HYPERSPACE},  # no standalone Foil in LAW
}


class TestNonLeaderNonBaseCardVariants:
    """Every C/U/R/L Unit, Event, and Upgrade should have all non-OP, non-Prestige
    variants valid for their set:

    SOR / SHD / TWI / JTL / LOF / SEC:  standard + foil + hyperspace + f-hyperspace
    LAW:                                 standard + hyperspace + f-hyperspace
    """

    def test_all_valid_variants_present(self, db):
        # Fetch every standard (all-flags-false) C/U/R/L card that is not a
        # Leader, Base, Token, or blank type, and not a T-prefix token upgrade.
        rows = db.execute(
            text("""
            SELECT s.code, c.card_number, c.name, c.rarity, c.type
            FROM cards c
            JOIN sets s ON s.id = c.set_id
            WHERE c.rarity            IN ('C','U','R','L')
              AND c.type              NOT IN ('Leader','Base','Token','Leader/Leader Unit')
              AND c.type              != ''
              AND c.card_number       NOT LIKE 'T%'
              AND c.is_foil           = false
              AND c.is_hyperspace     = false
              AND c.is_prestige       = false
              AND c.is_showcase       = false
              AND c.is_organized_play = false
            ORDER BY s.code, c.card_number
        """)
        ).fetchall()

        failures = []

        for row in rows:
            expected = _EXPECTED_VARIANTS[row.code]
            present = {STANDARD}  # standard card itself always present

            for is_foil, is_hyperspace in expected - {STANDARD}:
                exists = db.execute(
                    text("""
                    SELECT 1 FROM cards v
                    JOIN sets s ON s.id = v.set_id
                    WHERE s.code               = :code
                      AND v.base_card_number   = :base_num
                      AND v.is_foil            = :is_foil
                      AND v.is_hyperspace      = :is_hyperspace
                      AND v.is_organized_play  = false
                      AND v.is_prestige        = false
                    LIMIT 1
                """),
                    {
                        "code": row.code,
                        "base_num": row.card_number,
                        "is_foil": is_foil,
                        "is_hyperspace": is_hyperspace,
                    },
                ).fetchone()

                if exists:
                    present.add((is_foil, is_hyperspace))

            missing = expected - present
            if missing:
                missing_names = []
                for f, h in sorted(missing):
                    label = {
                        FOIL: "Foil",
                        HYPERSPACE: "Hyperspace",
                        FOIL_HYPERSPACE: "F-Hyperspace",
                    }[(f, h)]
                    missing_names.append(label)
                failures.append(
                    f"{row.code} #{row.card_number} '{row.name}' "
                    f"({row.rarity} {row.type}): missing {', '.join(missing_names)}"
                )

        assert not failures, (
            f"{len(failures)} card(s) missing expected variants:\n  "
            + "\n  ".join(failures)
        )
