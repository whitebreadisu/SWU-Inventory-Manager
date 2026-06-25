"""Pure transform tests (app/ingestion/swuapi_transform.py) against the
captured full export -- DB-free, mirrors test_variant_graph_invariant.py's
fixture but exercises the actual ingestion transform (base_card anchoring,
fallback re-anchoring, is_token/is_base_set, stamp_group) rather than just
the raw variant_of_uuid graph.
"""

import json
from pathlib import Path

import pytest

from app.ingestion.swuapi_transform import (
    BASE_SET_CODES,
    AmbiguousFallbackError,
    render_exceptions_doc,
    transform,
)

FIXTURE_PATH = (
    Path(__file__).parent.parent
    / "ingestion"
    / "data"
    / "swuapi_export_2026-06-21.json"
)


@pytest.fixture(scope="module")
def export():
    with open(FIXTURE_PATH, encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def result(export):
    return transform(export)


def test_base_card_count_after_fallback_reanchoring(result):
    """2,319 structural roots (§10.1) minus the 13 non-token roots the §10.6
    fallback merges into an existing Standard root elsewhere (15 total
    non-Standard roots, minus the 1 true exception (Zam) and the 1 exempt
    token (GG_5) that both stay their own base_cards)."""
    assert len(result.base_cards) == 2319 - 13


def test_card_variant_count_equals_total_cards(export, result):
    assert len(result.card_variants) == len(export["cards"])


def test_zam_wesell_is_the_sole_exception(result):
    assert len(result.exceptions) == 1
    exc = result.exceptions[0]
    assert exc["name"] == "Zam Wesell"
    assert exc["subtitle"] == "Not What She Seems"
    assert exc["set_code"] == "C26"


def test_token_root_with_non_standard_variant_type_is_exempt_from_fallback(result):
    """GG_5 "Experience" matches 7 Standard roots (duplicate-per-set token)
    but must stay its own base_card, not be flagged or force-matched."""
    gg5_uuid = next(
        bc["swuapi_id"]
        for bc in result.base_cards
        if bc["set_code"] == "GG" and bc["base_card_number"] == "5"
    )
    base_card = next(bc for bc in result.base_cards if bc["swuapi_id"] == gg5_uuid)
    assert base_card["is_token"] is True
    assert base_card["name"] == "Experience"
    assert not any(exc["name"] == "Experience" for exc in result.exceptions)


def test_non_token_non_standard_roots_are_reanchored_to_their_standard_match(result):
    """C25_2 BB-8 "Happy Beeps" (Convention Exclusive root) re-anchors to
    JTL_145's base card rather than staying its own (mapping spec §6)."""
    variant = next(
        cv
        for cv in result.card_variants
        if cv["source_set_code"] == "C25" and cv["card_number"] == "2"
    )
    base_card = next(
        bc
        for bc in result.base_cards
        if bc["swuapi_id"] == variant["base_card_swuapi_id"]
    )
    assert base_card["set_code"] == "JTL"
    assert base_card["base_card_number"] == "145"
    assert base_card["name"] == "BB-8"


def test_reanchored_siblings_collapse_into_the_same_base_card(result):
    """C25_2 and JTLP_10 are two independent non-Standard BB-8 "Happy
    Beeps" roots that both fallback-match the same JTL_145 Standard --
    they must collapse into one base_card, not two."""
    c25_2 = next(
        cv
        for cv in result.card_variants
        if cv["source_set_code"] == "C25" and cv["card_number"] == "2"
    )
    jtlp_10 = next(
        cv
        for cv in result.card_variants
        if cv["source_set_code"] == "JTLP" and cv["card_number"] == "10"
    )
    assert c25_2["base_card_swuapi_id"] == jtlp_10["base_card_swuapi_id"]


def test_is_token_matches_the_frozen_census(result):
    """§10.7: type containing "Token" -- 21 Token Unit + 28 Token Upgrade +
    2 Credit Token + 2 Force Token = 53 token cards total (across both root
    and non-root rows); base_cards.is_token marks the 26 token roots."""
    token_base_cards = [bc for bc in result.base_cards if bc["is_token"]]
    assert len(token_base_cards) == 26


def test_is_base_set_matches_the_curated_ten(result):
    base_sets = {s["code"] for s in result.sets if s["is_base_set"]}
    assert base_sets == BASE_SET_CODES
    assert len(base_sets) == 10


def test_serialized_prestige_collision_retained_as_distinct_variants(result):
    """Scenario F / §10.8: SEC Serialized Prestige senator cards keep all 3
    finish rows distinct, keyed by swuapi_id, not collapsed."""
    senator_variants = [
        cv
        for cv in result.card_variants
        if cv["source_set_code"] == "SEC"
        and cv["variant_type"] == "Serialized Prestige"
    ]
    from collections import Counter

    counts = Counter(cv["card_number"] for cv in senator_variants)
    assert any(count >= 3 for count in counts.values())
    swuapi_ids = {cv["swuapi_id"] for cv in senator_variants}
    assert len(swuapi_ids) == len(senator_variants)


def test_identical_image_collisions_are_flagged(result):
    """§10.8: LAW_865/866 Serialized Prestige rows share an identical image
    hash across distinct uuids -- flagged, not silently merged."""
    flagged_urls = {w["front_image_url"] for w in result.duplicate_image_warnings}
    assert any("Highsinger" in url for url in flagged_urls)
    assert any("Hounds_Tooth" in url for url in flagged_urls)


def test_card_variants_keyed_on_swuapi_id_not_base_card_and_variant_type(result):
    """§4.3/§10.8: (base_card_id, variant_type) must not be unique."""
    keys = [
        (cv["base_card_swuapi_id"], cv["variant_type"]) for cv in result.card_variants
    ]
    assert len(keys) != len(set(keys))


def test_ambiguous_fallback_raises_instead_of_guessing():
    """If a future card's fallback ever returns >1 non-token Standard
    match, ingestion must stop rather than pick one (mapping spec §6)."""
    export = {
        "sets": [{"code": "XX1", "name": "Test Set"}],
        "cards": [
            {
                "uuid": "root-1",
                "name": "Ambiguous Card",
                "subtitle": "Sub",
                "type": "Unit",
                "rarity": "Common",
                "set_code": "XX1",
                "card_number": "1",
                "variant_type": "Convention Exclusive",
                "variant_of_uuid": None,
            },
            {
                "uuid": "standard-a",
                "name": "Ambiguous Card",
                "subtitle": "Sub",
                "type": "Unit",
                "rarity": "Common",
                "set_code": "XX1",
                "card_number": "2",
                "variant_type": "Standard",
                "variant_of_uuid": None,
            },
            {
                "uuid": "standard-b",
                "name": "Ambiguous Card",
                "subtitle": "Sub",
                "type": "Unit",
                "rarity": "Common",
                "set_code": "XX1",
                "card_number": "3",
                "variant_type": "Standard",
                "variant_of_uuid": None,
            },
        ],
    }
    with pytest.raises(AmbiguousFallbackError):
        transform(export)


def test_render_exceptions_doc_with_zam_only(result):
    doc = render_exceptions_doc(result.exceptions)
    assert "## Current exceptions (1)" in doc
    assert "Zam Wesell" in doc


def test_render_exceptions_doc_with_no_exceptions():
    doc = render_exceptions_doc([])
    assert "## Current exceptions (0)" in doc
    assert "None" in doc
