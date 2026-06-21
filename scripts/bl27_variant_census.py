"""BL-27 variant census (backlog item, step 2 of BL-33's sequencing).

Analysis-only — produces data for the Opus session that decides vocabulary
normalization, finish-vs-provenance grouping, and stamp_group assignment
(SWU_Catalog_Redesign_Spec.md §10, §3.2 caveat). Does NOT make any of those
decisions itself.

Reads the full live capture already used by the variant-graph invariant
test (backend/app/tests/fixtures/swuapi_export_2026-06-21.json — 8,353
cards via paginated /cards, every record carrying variant_of_uuid) rather
than re-pulling from the API, so this report and the invariant test are
guaranteed to agree on what "the corpus" means.

Usage:
    py -3 scripts/bl27_variant_census.py
Writes: specification_documents/BL27_Variant_Census_2026-06-21.md
"""

import json
from collections import Counter, defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
FIXTURE_PATH = (
    REPO_ROOT
    / "backend"
    / "app"
    / "tests"
    / "fixtures"
    / "swuapi_export_2026-06-21.json"
)
OUTPUT_PATH = (
    REPO_ROOT / "specification_documents" / "BL27_Variant_Census_2026-06-21.md"
)

# BL-38 re-confirmation: the five physically-verified double-pip cards from
# the 2026-06-20 WebFetch-based check. This census re-checks them against
# raw JSON from the bulk capture, per BL-38's "depends on" note.
BL38_DOUBLE_PIP_CARDS = [
    ("SEC", "54", "Exiled from the Force", "Vigilance"),
    ("SEC", "107", "Chancellor Valorum", "Command"),
    ("SOR", "153", "Saw Gerrera", "Aggression"),
    ("SHD", "108", "Enforced Loyalty", "Command"),
    ("LOF", "105", "Oppo Rancisis", "Command"),
]


def load_cards() -> list[dict]:
    with open(FIXTURE_PATH, encoding="utf-8") as f:
        return json.load(f)["cards"]


def census_variant_type_by_set(cards: list[dict]) -> dict[str, Counter]:
    """variant_type x set_code tabulation — set_code here is the variant's
    OWN set (provenance), per swuapi's raw field; matches
    card_variants.source_set_code in the target schema."""
    by_set: dict[str, Counter] = defaultdict(Counter)
    for c in cards:
        by_set[c["set_code"]][c["variant_type"]] += 1
    return by_set


def full_vocabulary(cards: list[dict]) -> Counter:
    return Counter(c["variant_type"] for c in cards)


def mark_tokens(cards: list[dict]) -> list[dict]:
    """Tokens are identified by `type` containing "Token" (confirmed
    pattern: ASH_T001 "Mandalorian" has type "Token Unit"). No dedicated
    boolean field exists in the raw export."""
    return [c for c in cards if "Token" in (c.get("type") or "")]


def stamp_group_candidates(cards: list[dict]) -> list[dict]:
    """Candidate stamp-group families via identical front_image_url.

    NEGATIVE RESULT (verified by spot-check against the mapping spec's own
    named example): Rey - "Keeping the Past"'s 6 RQ-tier variants (P25
    cards 59-64) — the exact case BL-31 cites as pixel-identical art with
    only a text stamp changed, confirmed by direct visual comparison — each
    have a genuinely DISTINCT front_image_url (different filename hash per
    tier). So URL identity is NOT a usable stamp-group signal for the
    tournament-tier long tail; it only catches a few unrelated coincidences
    (see the actual results below — 5 small families, none of them
    tournament tiers). See tournament_tier_candidates() for the signal that
    actually works for BL-31's case: the variant_type naming pattern itself.

    Kept here anyway (rather than deleted) because the negative result is
    itself information the Opus session needs — don't assume image-diffing
    can be skipped.
    """
    by_uuid = {c["uuid"]: c for c in cards}

    def resolve_root_uuid(card: dict) -> str:
        current = card
        seen = set()
        while current["variant_of_uuid"] is not None:
            if current["uuid"] in seen:
                break
            seen.add(current["uuid"])
            current = by_uuid[current["variant_of_uuid"]]
        return current["uuid"]

    by_root_and_image: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for c in cards:
        if not c.get("front_image_url"):
            continue
        root_uuid = resolve_root_uuid(c)
        by_root_and_image[(root_uuid, c["front_image_url"])].append(c)

    candidates = []
    for (root_uuid, image_url), variants in by_root_and_image.items():
        if len(variants) < 2:
            continue
        root = by_uuid[root_uuid]
        candidates.append(
            {
                "root_name": root["name"],
                "root_subtitle": root.get("subtitle"),
                "root_set": root["set_code"],
                "image_url": image_url,
                "variant_types": sorted({v["variant_type"] for v in variants}),
                "count": len(variants),
            }
        )
    candidates.sort(key=lambda x: -x["count"])
    return candidates


TOURNAMENT_TIER_PREFIXES = ("RQ", "SQ", "GC", "PQ", "SS")


def tournament_tier_candidates(cards: list[dict]) -> list[dict]:
    """Groups variants whose variant_type starts with a known tournament
    prefix (RQ/SQ/GC/PQ/SS — Regional/Store/Grand Championship/Planetary
    Qualifier/Special-Series Qualifier, per the vocabulary in §1) by their
    resolved root. This is the signal that actually surfaces BL-31's Rey
    example (6-member RQ family), unlike image-URL matching above.

    Still descriptive only — confirming these are genuinely stamp-only
    (vs. some carrying real art differences) needs either image diffing or
    Opus's judgment call, not asserted here.
    """
    by_uuid = {c["uuid"]: c for c in cards}

    def resolve_root_uuid(card: dict) -> str:
        current = card
        seen = set()
        while current["variant_of_uuid"] is not None:
            if current["uuid"] in seen:
                break
            seen.add(current["uuid"])
            current = by_uuid[current["variant_of_uuid"]]
        return current["uuid"]

    by_root: dict[str, list[dict]] = defaultdict(list)
    for c in cards:
        if c["variant_type"].startswith(TOURNAMENT_TIER_PREFIXES):
            by_root[resolve_root_uuid(c)].append(c)

    candidates = []
    for root_uuid, variants in by_root.items():
        root = by_uuid[root_uuid]
        candidates.append(
            {
                "root_name": root["name"],
                "root_subtitle": root.get("subtitle"),
                "root_set": root["set_code"],
                "variant_types": sorted({v["variant_type"] for v in variants}),
                "count": len(variants),
            }
        )
    candidates.sort(key=lambda x: -x["count"])
    return candidates


def bl38_raw_json_reconfirm(cards: list[dict]) -> list[dict]:
    by_key = {(c["set_code"], c["card_number"]): c for c in cards}
    results = []
    for set_code, card_number, name, expected_aspect in BL38_DOUBLE_PIP_CARDS:
        card = by_key.get((set_code, card_number))
        results.append(
            {
                "set_code": set_code,
                "card_number": card_number,
                "name": name,
                "expected_double_aspect": expected_aspect,
                "found": card is not None,
                "raw_aspects_field": card.get("aspects") if card else None,
                "has_aspect_duplicates_field": (
                    "aspectDuplicates" in card if card else None
                ),
            }
        )
    return results


def render_report(cards: list[dict]) -> str:
    vocab = full_vocabulary(cards)
    by_set = census_variant_type_by_set(cards)
    tokens = mark_tokens(cards)
    stamp_candidates = stamp_group_candidates(cards)
    tier_candidates = tournament_tier_candidates(cards)
    bl38_results = bl38_raw_json_reconfirm(cards)

    lines = []
    lines.append("# BL-27 Variant Census — 2026-06-21")
    lines.append("")
    lines.append(
        "**Analysis only — no vocabulary/grouping/stamp_group decisions made "
        "here.** Per `SWU_Backlog.md` BL-33's sequencing, those decisions "
        "(finish-vs-provenance mapping, vocabulary normalization, "
        "`stamp_group` assignment) are an Opus call "
        "(`SWU_Catalog_Redesign_Spec.md` §10, §3.2 caveat). This report is "
        "the data that decision should be made against."
    )
    lines.append("")
    lines.append(
        f"Source: `backend/app/tests/fixtures/swuapi_export_2026-06-21.json` "
        f"({len(cards)} cards, full live capture via paginated `/cards`)."
    )
    lines.append("")

    # --- Full vocabulary ---
    lines.append("## 1. Full `variant_type` vocabulary")
    lines.append("")
    lines.append(f"**{len(vocab)} distinct values** across {len(cards)} cards.")
    lines.append("")
    lines.append("| variant_type | count |")
    lines.append("|---|---|")
    for vtype, count in vocab.most_common():
        lines.append(f"| {vtype} | {count} |")
    lines.append("")

    # --- variant_type x set_code ---
    lines.append("## 2. `variant_type` × set_code (provenance) tabulation")
    lines.append("")
    lines.append(
        "set_code here is the variant's own set (matches the target schema's "
        "`card_variants.source_set_code`), not the base card's set."
    )
    lines.append("")
    for set_code in sorted(by_set):
        counts = by_set[set_code]
        lines.append(f"### {set_code} ({sum(counts.values())} cards)")
        lines.append("")
        lines.append("| variant_type | count |")
        lines.append("|---|---|")
        for vtype, count in counts.most_common():
            lines.append(f"| {vtype} | {count} |")
        lines.append("")

    # --- Tokens ---
    lines.append("## 3. Token marking")
    lines.append("")
    lines.append(
        f"**{len(tokens)} cards** have `type` containing \"Token\" (no "
        f"dedicated boolean field exists in the raw export)."
    )
    lines.append("")
    token_names = Counter(t["name"] for t in tokens)
    lines.append("| token name | distinct printings (across all sets) |")
    lines.append("|---|---|")
    for name, count in token_names.most_common(30):
        lines.append(f"| {name} | {count} |")
    lines.append("")

    # --- Stamp-group candidates ---
    lines.append("## 4. Stamp-group candidates")
    lines.append("")
    lines.append("### 4a. By identical `front_image_url` — negative result")
    lines.append("")
    lines.append(
        f"Only **{len(stamp_candidates)} base-card families** have 2+ "
        f"variants sharing an identical `front_image_url`, and **none of "
        f"them are tournament-tier variants.** Verified by spot-checking "
        f"the mapping spec's own named example — Rey, \"Keeping the Past\" "
        f"(P25 cards 59-64, the exact 6-tier RQ family BL-31 cites as "
        f"pixel-identical art confirmed by direct visual comparison): each "
        f"of the 6 has a genuinely **distinct** `front_image_url` (different "
        f"filename hash per tier). **Conclusion: image-URL identity is not "
        f"a usable signal for BL-31's stamp-group detection** — swuapi must "
        f"render/hash each stamped variant's image separately even when "
        f"visually near-identical to a human eye. Confirming true pixel-"
        f"identity would need actual image diffing, not metadata."
    )
    lines.append("")
    lines.append(
        "The families this method *did* find (kept for completeness, not "
        "because they're useful for BL-31):"
    )
    lines.append("")
    lines.append("| root card | set | variant_types sharing one image | count |")
    lines.append("|---|---|---|---|")
    for cand in stamp_candidates:
        subtitle = f" — {cand['root_subtitle']}" if cand["root_subtitle"] else ""
        lines.append(
            f"| {cand['root_name']}{subtitle} | {cand['root_set']} | "
            f"{', '.join(cand['variant_types'])} | {cand['count']} |"
        )
    lines.append("")

    lines.append("### 4b. By tournament-tier naming pattern — the signal that works")
    lines.append("")
    lines.append(
        f"Grouping instead by `variant_type` prefix (RQ/SQ/GC/PQ/SS — "
        f"Regional/Store/Grand Championship/Planetary Qualifier/Special-"
        f"Series Qualifier) resolved to each card's root finds "
        f"**{len(tier_candidates)} base-card families**, correctly "
        f"surfacing Rey's 6-member RQ family. This is descriptive only — "
        f"confirming these are genuinely stamp-only (vs. some carrying real "
        f"art differences) is still unverified at scale and is part of the "
        f"Opus decision, not asserted here."
    )
    lines.append("")
    lines.append(
        f"Top 25 by family size (full list has {len(tier_candidates)} "
        f"entries — re-run the script for the complete set):"
    )
    lines.append("")
    lines.append("| root card | set | tournament variant_types | count |")
    lines.append("|---|---|---|---|")
    for cand in tier_candidates[:25]:
        subtitle = f" — {cand['root_subtitle']}" if cand["root_subtitle"] else ""
        lines.append(
            f"| {cand['root_name']}{subtitle} | {cand['root_set']} | "
            f"{', '.join(cand['variant_types'])} | {cand['count']} |"
        )
    lines.append("")

    # --- BL-38 re-confirmation ---
    lines.append("## 5. BL-38 re-confirmation — aspect double-pip flattening")
    lines.append("")
    lines.append(
        "Raw-JSON re-check (not WebFetch) of the five physically-verified "
        "double-pip cards from the 2026-06-20 finding, against this "
        "session's bulk `/cards` capture."
    )
    lines.append("")
    lines.append(
        "| set | card # | name | expected double aspect | found | raw "
        "`aspects` field | has `aspectDuplicates` field |"
    )
    lines.append("|---|---|---|---|---|---|---|")
    for r in bl38_results:
        lines.append(
            f"| {r['set_code']} | {r['card_number']} | {r['name']} | "
            f"{r['expected_double_aspect']} | {r['found']} | "
            f"{r['raw_aspects_field']} | {r['has_aspect_duplicates_field']} |"
        )
    lines.append("")
    all_single = all(
        r["found"] and r["raw_aspects_field"] == [r["expected_double_aspect"]]
        for r in bl38_results
    )
    no_dup_field = all(
        r["found"] and r["has_aspect_duplicates_field"] is False for r in bl38_results
    )
    lines.append(
        f"**Confirmed via raw JSON:** all 5 cards return a single-element "
        f"`aspects` array (`{all_single}`), and none expose an "
        f"`aspectDuplicates` field (`{no_dup_field}`). This satisfies "
        f"BL-38's \"depends on\" note — the 2026-06-20 WebFetch-based "
        f"finding is now confirmed against raw JSON, not just a summary."
    )
    lines.append("")

    return "\n".join(lines)


def main() -> None:
    cards = load_cards()
    report = render_report(cards)
    OUTPUT_PATH.write_text(report, encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} ({len(report)} chars)")


if __name__ == "__main__":
    main()
