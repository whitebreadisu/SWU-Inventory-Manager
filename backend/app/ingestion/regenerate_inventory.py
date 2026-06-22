"""BL-33 step 4: remap the archived pre-redesign inventory snapshot onto the
new `card_variants` schema and reload it for a tenant resolved BY USER
IDENTITY (never a positional tenant id).

Background -- the old schema (dropped in aa2b86b, BL-33 step 1) had one
`cards` row per printing with boolean flags (is_foil, is_hyperspace,
is_prestige, is_showcase, is_organized_play) and a `card_number` that, for
OP printings, was an OP-specific number distinct from `base_card_number`
(the real card number). The new schema splits identity (`base_cards`,
keyed by (set, base_card_number)) from printing (`card_variants`, keyed by
`variant_type` + `source_set_code` + `card_number`). This module rebuilds
the old_card_id -> new card_variants.id crosswalk from the old catalog seed
(recovered from git history, see CROSSWALK_SOURCE below) and uses it to
remap the archived inventory snapshot.

Mapping rules (SWU_Catalog_Redesign_Spec.md SS8.5, SS10.3-10.4):
  1. Resolve the old card's base_card via (set_code, base_card_number) ->
     base_cards (set, base_card_number), excluding is_token rows (the new
     schema's token numbering can collide with regular low card numbers,
     e.g. SOR base_card_number '1' is both "Experience" (token) and
     "Director Krennic" (Leader); the old schema's tokens use a disjoint
     'T0x' numbering so a plain numeric old card_number always means the
     non-token candidate -- this is asserted, not assumed: ambiguous or
     empty candidate sets are flagged).
  2. Non-OP: pick the sibling card_variants row whose variant_type matches
     the old boolean flags (FLAG_TO_FINISH below).
  3. OP (is_organized_play): the OP flag was retired; OP printings moved to
     the Weekly Play channel. Pick the sibling whose variant_type is
     "Weekly Play" (is_foil=false) or "Weekly Play Foil" (is_foil=true).
     Note some base sets (SOR/SHD/TWI) keep these as variant_type "Weekly
     Play[ Foil]" rows with source_set_code == the base set itself (not a
     '*P' container) -- matching is by variant_type alone, not
     source_set_code, exactly as app/ingestion/swuapi_classify.py's channel
     rule does.

Anything that fails to resolve uniquely is collected in result.flagged and
never silently dropped or guessed -- see RegenResult.

Usage:
    python -m app.ingestion.regenerate_inventory --email jeremy.braden@gmail.com
    python -m app.ingestion.regenerate_inventory --dry-run
"""

from __future__ import annotations

import argparse
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import SessionLocal

logger = logging.getLogger(__name__)

DEFAULT_SNAPSHOT_PATH = Path(
    "db/snapshots/archive/inventory_snapshot_pre_redesign_2026-06-21.sql"
)
DEFAULT_EMAIL = "jeremy.braden@gmail.com"

# Old `sets.id` -> code, frozen at the BL-33-step-1 cutover (aa2b86b^:
# db/seeds/catalog_seed.sql). The old seed only ever had these 7 base sets.
OLD_SET_ID_TO_CODE = {
    1: "SOR",
    2: "SHD",
    3: "TWI",
    4: "JTL",
    5: "LOF",
    6: "SEC",
    7: "LAW",
}

# Old boolean-flag combination -> new card_variants.variant_type, per the
# redesign spec's frozen finish vocabulary (SS10.3). OP is handled
# separately (channel, not finish) -- see _resolve_op below.
FLAG_TO_FINISH = {
    (False, False, False, False): "Standard",
    (True, False, False, False): "Standard Foil",
    (False, True, False, False): "Hyperspace",
    (True, True, False, False): "Hyperspace Foil",
    (False, False, True, False): "Standard Prestige",
    (True, False, True, False): "Foil Prestige",
    (False, False, False, True): "Showcase",
    # The redesign's frozen finish vocabulary (SS10.3) has only "Showcase",
    # no "Showcase Foil" -- confirmed empty in the new schema. Several old
    # leader rows carry is_foil=True alongside is_showcase=True (redundant:
    # Showcase finish is foil-only by convention), so foil is irrelevant
    # once is_showcase is set.
    (True, False, False, True): "Showcase",
}

WEEKLY_PLAY_VARIANT_TYPES = {False: "Weekly Play", True: "Weekly Play Foil"}

OLD_CARDS_INSERT_RE = re.compile(
    r"INSERT INTO cards \(([^)]*)\) VALUES\s*(.*?);", re.DOTALL
)
# One old `cards` row tuple, e.g.:
# (453, 1, '1', '1', 'Director Krennic - Aspiring to Authority', 'C',
#  'Leader', false, false, false, false, false, '2026-05-09 ...')
_Q = r"((?:[^']|'')*)"  # a SQL single-quoted string literal, '' is the escape for an embedded quote
OLD_CARDS_TUPLE_RE = re.compile(
    r"\((\d+),\s*(\d+),\s*'" + _Q + r"',\s*'" + _Q + r"',"
    r"\s*'" + _Q + r"',\s*'" + _Q + r"',\s*'" + _Q + r"',"
    r"\s*(true|false),\s*(true|false),\s*(true|false),"
    r"\s*(true|false),\s*(true|false),\s*'[^']*'\)"
)

INVENTORY_INSERT_RE = re.compile(
    r"INSERT INTO inventory \(([^)]*)\) VALUES\s*(.*?)\s*ON CONFLICT", re.DOTALL
)
INVENTORY_TUPLE_RE = re.compile(r"\((\d+),\s*(\d+),\s*(\d+),\s*'([^']*)'\)")


@dataclass
class OldCard:
    id: int
    set_code: str
    card_number: str
    base_card_number: str
    name: str
    is_foil: bool
    is_hyperspace: bool
    is_prestige: bool
    is_showcase: bool
    is_organized_play: bool


@dataclass
class FlaggedRow:
    old_card_id: int
    set_code: str | None
    base_card_number: str | None
    card_number: str | None
    flags: dict
    quantity: int
    reason: str

    def as_line(self) -> str:
        return (
            f"old_card_id={self.old_card_id} set={self.set_code} "
            f"base_card_number={self.base_card_number} card_number={self.card_number} "
            f"flags={self.flags} quantity={self.quantity} -- {self.reason}"
        )


@dataclass
class RegenResult:
    archived_row_count: int = 0
    archived_total_quantity: int = 0
    mapped_count: int = 0
    mapped_total_quantity: int = 0
    flagged: list[FlaggedRow] = field(default_factory=list)
    loaded_row_count: int = 0
    loaded_total_quantity: int = 0
    tenant_id: int | None = None
    email: str | None = None

    @property
    def flagged_count(self) -> int:
        return len(self.flagged)

    @property
    def flagged_total_quantity(self) -> int:
        return sum(f.quantity for f in self.flagged)


def parse_old_cards_crosswalk(seed_sql: str) -> dict[int, OldCard]:
    """Parse every `INSERT INTO cards (...) VALUES (...)` statement in the
    old catalog seed into old_card_id -> OldCard. The old seed has multiple
    INSERT statements (one per batch); all are parsed and merged."""
    cards: dict[int, OldCard] = {}
    for _cols, values_blob in OLD_CARDS_INSERT_RE.findall(seed_sql):
        for m in OLD_CARDS_TUPLE_RE.finditer(values_blob):
            (
                old_id,
                set_id,
                card_number,
                base_card_number,
                _name,
                _rarity,
                _type,
                is_foil,
                is_hyperspace,
                is_prestige,
                is_showcase,
                is_organized_play,
            ) = m.groups()
            set_code = OLD_SET_ID_TO_CODE.get(int(set_id))
            cards[int(old_id)] = OldCard(
                id=int(old_id),
                set_code=set_code,
                card_number=card_number.replace("''", "'"),
                base_card_number=base_card_number.replace("''", "'"),
                name=_name.replace("''", "'"),
                is_foil=is_foil == "true",
                is_hyperspace=is_hyperspace == "true",
                is_prestige=is_prestige == "true",
                is_showcase=is_showcase == "true",
                is_organized_play=is_organized_play == "true",
            )
    return cards


def parse_archived_snapshot(snapshot_sql: str) -> list[tuple[int, int, int, str]]:
    """Parse every `INSERT INTO inventory (...) VALUES (...) ON CONFLICT...`
    line into (tenant_id, card_id, quantity, updated_at) tuples. tenant_id
    from the archive is ignored by the caller -- the reload target tenant is
    resolved by user identity, never from this file."""
    rows: list[tuple[int, int, int, str]] = []
    for _cols, values_blob in INVENTORY_INSERT_RE.findall(snapshot_sql):
        for m in INVENTORY_TUPLE_RE.finditer(values_blob):
            tenant_id, card_id, quantity, updated_at = m.groups()
            rows.append((int(tenant_id), int(card_id), int(quantity), updated_at))
    return rows


def _resolve_base_card_id(
    db: Session, set_code: str | None, base_card_number: str | None
) -> tuple[int | None, str | None]:
    """Returns (base_card_id, error_reason). error_reason is None on a clean,
    unambiguous match."""
    if set_code is None:
        return None, "unknown old set_id (not in OLD_SET_ID_TO_CODE)"

    rows = db.execute(
        text(
            "SELECT bc.id, bc.is_token FROM base_cards bc "
            "JOIN sets s ON s.id = bc.set_id "
            "WHERE s.code = :set_code AND bc.base_card_number = :number"
        ),
        {"set_code": set_code, "number": base_card_number},
    ).fetchall()

    if not rows:
        return None, f"no base_card found for ({set_code}, {base_card_number})"

    non_token = [r for r in rows if not r.is_token]
    if len(non_token) == 1:
        return non_token[0].id, None
    if len(rows) == 1:
        return rows[0].id, None

    return None, (
        f"ambiguous base_card match for ({set_code}, {base_card_number}): "
        f"{len(rows)} candidates ({len(non_token)} non-token)"
    )


def _resolve_variant_id(
    db: Session, base_card_id: int, old: OldCard
) -> tuple[int | None, str | None]:
    """Returns (variant_id, error_reason)."""
    if old.is_organized_play:
        # Early Weekly Play promos (SOR/SHD/TWI) sit in a dedicated '*P'
        # container set but kept the variant_type "Hyperspace" rather than
        # "Weekly Play" -- confirmed empty: SORP/SHDP/TWIP hold exactly 10
        # "Hyperspace" rows each, no foil, no "Weekly Play" label at all
        # (SWU_Catalog_Redesign_Spec.md SS10.4). The old is_hyperspace flag
        # is the signal that an OP row belongs to this early-promo shape
        # rather than the later dedicated Weekly Play channel.
        if old.is_hyperspace:
            candidates = db.execute(
                text(
                    "SELECT id FROM card_variants "
                    "WHERE base_card_id = :bcid AND variant_type = 'Hyperspace' "
                    "AND source_set_code = :source_set_code"
                ),
                {"bcid": base_card_id, "source_set_code": f"{old.set_code}P"},
            ).fetchall()
            if len(candidates) == 1:
                return candidates[0].id, None
            if not candidates:
                return None, (
                    "OP card (early Hyperspace promo): no "
                    f"'{old.set_code}P' Hyperspace channel variant found for base_card_id={base_card_id}"
                )
            return None, (
                f"OP card (early Hyperspace promo): {len(candidates)} candidates for "
                f"base_card_id={base_card_id} (ambiguous)"
            )

        wanted_type = WEEKLY_PLAY_VARIANT_TYPES[old.is_foil]
        candidates = db.execute(
            text(
                "SELECT id FROM card_variants "
                "WHERE base_card_id = :bcid AND variant_type = :vt"
            ),
            {"bcid": base_card_id, "vt": wanted_type},
        ).fetchall()
        if len(candidates) == 1:
            return candidates[0].id, None
        if not candidates:
            return None, (
                f"OP card: no '{wanted_type}' channel variant found for base_card_id={base_card_id}"
            )
        return None, (
            f"OP card: {len(candidates)} '{wanted_type}' candidates for "
            f"base_card_id={base_card_id} (ambiguous)"
        )

    flag_key = (old.is_foil, old.is_hyperspace, old.is_prestige, old.is_showcase)
    wanted_type = FLAG_TO_FINISH.get(flag_key)
    if wanted_type is None:
        return None, f"unrecognized flag combination {flag_key}"

    # Constrain by source_set_code == the old card's own base set as well as
    # variant_type: a base-set printing can share its variant_type
    # ("Standard") with an unrelated P25/promo reprint of the same base
    # card (confirmed: 8 base cards across SHD/TWI/JTL/LOF each have both a
    # base-set "Standard" and a P25 "Standard" sibling). The old card was
    # always a base-set printing, never a promo reprint, so this is a
    # correctness fix, not a narrowing that could hide a real ambiguity.
    candidates = db.execute(
        text(
            "SELECT id FROM card_variants "
            "WHERE base_card_id = :bcid AND variant_type = :vt "
            "AND source_set_code = :set_code"
        ),
        {"bcid": base_card_id, "vt": wanted_type, "set_code": old.set_code},
    ).fetchall()
    if len(candidates) == 1:
        return candidates[0].id, None
    if not candidates:
        return None, f"no '{wanted_type}' variant found for base_card_id={base_card_id}"
    return None, (
        f"{len(candidates)} '{wanted_type}' candidates for base_card_id={base_card_id} (ambiguous)"
    )


def build_crosswalk(
    db: Session, old_cards: dict[int, OldCard]
) -> tuple[dict[int, int], list[FlaggedRow]]:
    """old_card_id -> new card_variants.id, plus a flagged list for anything
    that didn't resolve cleanly. Quantity is filled in by the caller once
    the archived snapshot rows (which carry quantity) are known -- this
    function only resolves identity, not quantity."""
    crosswalk: dict[int, int] = {}
    flagged: list[FlaggedRow] = []

    for old_id, old in old_cards.items():
        base_card_id, err = _resolve_base_card_id(
            db, old.set_code, old.base_card_number
        )
        if err is not None:
            flagged.append(
                FlaggedRow(
                    old_card_id=old_id,
                    set_code=old.set_code,
                    base_card_number=old.base_card_number,
                    card_number=old.card_number,
                    flags={
                        "is_foil": old.is_foil,
                        "is_hyperspace": old.is_hyperspace,
                        "is_prestige": old.is_prestige,
                        "is_showcase": old.is_showcase,
                        "is_organized_play": old.is_organized_play,
                    },
                    quantity=0,
                    reason=err,
                )
            )
            continue

        variant_id, err = _resolve_variant_id(db, base_card_id, old)
        if err is not None:
            flagged.append(
                FlaggedRow(
                    old_card_id=old_id,
                    set_code=old.set_code,
                    base_card_number=old.base_card_number,
                    card_number=old.card_number,
                    flags={
                        "is_foil": old.is_foil,
                        "is_hyperspace": old.is_hyperspace,
                        "is_prestige": old.is_prestige,
                        "is_showcase": old.is_showcase,
                        "is_organized_play": old.is_organized_play,
                    },
                    quantity=0,
                    reason=err,
                )
            )
            continue

        crosswalk[old_id] = variant_id

    return crosswalk, flagged


def resolve_tenant_id(db: Session, email: str) -> int:
    """Look up users.email -> tenant_id. Aborts (raises) if no such user
    exists -- never falls back to a positional tenant id (spec requirement)."""
    row = db.execute(
        text("SELECT tenant_id FROM users WHERE email = :email"),
        {"email": email},
    ).first()
    if row is None:
        raise SystemExit(
            f"ABORT: no users row found for email={email!r}. "
            "Refusing to fall back to a positional tenant id -- create the "
            "user (e.g. by logging in once against this DB) before retrying."
        )
    return row.tenant_id


def regenerate_inventory(
    db: Session,
    crosswalk_sql: str,
    snapshot_sql: str,
    email: str = DEFAULT_EMAIL,
    dry_run: bool = False,
) -> RegenResult:
    result = RegenResult(email=email)

    old_cards = parse_old_cards_crosswalk(crosswalk_sql)
    archived_rows = parse_archived_snapshot(snapshot_sql)
    result.archived_row_count = len(archived_rows)
    result.archived_total_quantity = sum(r[2] for r in archived_rows)

    crosswalk, flagged_identity = build_crosswalk(db, old_cards)
    flagged_by_old_id = {f.old_card_id: f for f in flagged_identity}

    tenant_id = resolve_tenant_id(db, email)
    result.tenant_id = tenant_id

    remapped: dict[int, int] = {}  # variant_id -> quantity (collapsed)
    for _old_tenant_id, old_card_id, quantity, _updated_at in archived_rows:
        if old_card_id not in old_cards:
            result.flagged.append(
                FlaggedRow(
                    old_card_id=old_card_id,
                    set_code=None,
                    base_card_number=None,
                    card_number=None,
                    flags={},
                    quantity=quantity,
                    reason="old_card_id not present in the recovered catalog_seed crosswalk",
                )
            )
            continue

        if old_card_id in flagged_by_old_id:
            template = flagged_by_old_id[old_card_id]
            result.flagged.append(
                FlaggedRow(
                    old_card_id=old_card_id,
                    set_code=template.set_code,
                    base_card_number=template.base_card_number,
                    card_number=template.card_number,
                    flags=template.flags,
                    quantity=quantity,
                    reason=template.reason,
                )
            )
            continue

        variant_id = crosswalk[old_card_id]
        remapped[variant_id] = remapped.get(variant_id, 0) + quantity
        result.mapped_count += 1
        result.mapped_total_quantity += quantity

    if dry_run:
        result.loaded_row_count = len(remapped)
        result.loaded_total_quantity = sum(remapped.values())
        return result

    db.execute(
        text("SELECT set_config('app.current_tenant_id', :tenant_id, false)"),
        {"tenant_id": str(tenant_id)},
    )
    db.execute(text("DELETE FROM inventory WHERE tenant_id = :tid"), {"tid": tenant_id})
    for variant_id, quantity in remapped.items():
        db.execute(
            text(
                "INSERT INTO inventory (tenant_id, variant_id, quantity) "
                "VALUES (:tid, :vid, :qty) "
                "ON CONFLICT (tenant_id, variant_id) DO UPDATE SET quantity = EXCLUDED.quantity"
            ),
            {"tid": tenant_id, "vid": variant_id, "qty": quantity},
        )
    db.commit()

    loaded = db.execute(
        text(
            "SELECT COUNT(*), COALESCE(SUM(quantity), 0) FROM inventory WHERE tenant_id = :tid"
        ),
        {"tid": tenant_id},
    ).first()
    result.loaded_row_count = loaded[0]
    result.loaded_total_quantity = loaded[1]

    return result


def _print_report(result: RegenResult) -> None:
    print(f"Target tenant: email={result.email} tenant_id={result.tenant_id}")
    print(
        f"Archived snapshot: {result.archived_row_count} rows, "
        f"{result.archived_total_quantity} total quantity"
    )
    print(
        f"Mapped cleanly: {result.mapped_count} rows, "
        f"{result.mapped_total_quantity} total quantity"
    )
    print(
        f"Flagged (unmapped/ambiguous): {result.flagged_count} rows, "
        f"{result.flagged_total_quantity} total quantity"
    )
    for f in result.flagged:
        print(f"  FLAGGED: {f.as_line()}")
    print(
        f"Loaded inventory for tenant_id={result.tenant_id}: "
        f"{result.loaded_row_count} rows, {result.loaded_total_quantity} total quantity"
    )
    conserved = (
        result.mapped_total_quantity + result.flagged_total_quantity
        == result.archived_total_quantity
    )
    print(
        f"Conservation check (mapped + flagged == archived): "
        f"{result.mapped_total_quantity} + {result.flagged_total_quantity} "
        f"== {result.archived_total_quantity} -> {conserved}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="BL-33 step 4: remap + reload the archived pre-redesign "
        "inventory snapshot onto the new card_variants schema, for a tenant "
        "resolved by user email."
    )
    parser.add_argument("--email", default=DEFAULT_EMAIL)
    parser.add_argument(
        "--snapshot",
        type=Path,
        default=DEFAULT_SNAPSHOT_PATH,
        help="path to the archived pre-redesign inventory snapshot SQL file",
    )
    parser.add_argument(
        "--crosswalk-seed",
        type=Path,
        default=None,
        help="path to a saved copy of the old catalog_seed.sql (old `cards` "
        "table). If omitted, run: git show aa2b86b^:db/seeds/catalog_seed.sql "
        "> /tmp/old_seed.sql and pass that path.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="compute the remap and report it, but do not wipe/write inventory",
    )
    args = parser.parse_args()

    if args.crosswalk_seed is None:
        raise SystemExit(
            "ABORT: --crosswalk-seed is required (no live git access from "
            "this process). Recover it once via: "
            "git show aa2b86b^:db/seeds/catalog_seed.sql > /tmp/old_seed.sql"
        )

    crosswalk_sql = args.crosswalk_seed.read_text(encoding="utf-8")
    snapshot_sql = args.snapshot.read_text(encoding="utf-8")

    db = SessionLocal()
    try:
        result = regenerate_inventory(
            db, crosswalk_sql, snapshot_sql, email=args.email, dry_run=args.dry_run
        )
        _print_report(result)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
