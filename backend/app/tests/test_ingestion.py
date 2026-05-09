"""Tests for the F3 CSV ingestion pipeline.

Covers: field normalization, variant flag handling, base_card_number resolution,
and the is_card_row / is_serialized_name filters.
All tests are pure (no database required).
"""
import pytest

from app.ingestion.csv_ingestor import _assign_base_card_numbers
from app.ingestion.normalize import (
    is_card_row,
    is_serialized_name,
    normalize_rarity,
    parse_card_number,
    parse_variant_flags,
)


class TestParseCardNumber:
    def test_strips_denominator(self):
        assert parse_card_number("112/252") == "112"

    def test_strips_leading_zeros_with_denominator(self):
        assert parse_card_number("009/252") == "9"

    def test_strips_leading_zeros_without_denominator(self):
        assert parse_card_number("009") == "9"

    def test_single_digit(self):
        assert parse_card_number("001/262") == "1"

    def test_plain_number_unchanged(self):
        assert parse_card_number("525") == "525"

    def test_high_number_unchanged(self):
        assert parse_card_number("1021") == "1021"

    def test_non_numeric_preserved(self):
        # Token cards like T01 are stored as-is
        assert parse_card_number("T01") == "T01"

    def test_small_denominator(self):
        assert parse_card_number("03/20") == "3"


class TestNormalizeRarity:
    def test_common(self):
        assert normalize_rarity("Common") == "C"

    def test_uncommon(self):
        assert normalize_rarity("Uncommon") == "U"

    def test_rare(self):
        assert normalize_rarity("Rare") == "R"

    def test_legendary(self):
        assert normalize_rarity("Legendary") == "L"

    def test_special_maps_to_s(self):
        # TCGPlayer calls starter-deck cards "Special"; stored as "S" (Starter)
        assert normalize_rarity("Special") == "S"

    def test_unknown_raises(self):
        with pytest.raises(KeyError):
            normalize_rarity("Mythic")


class TestParseVariantFlags:
    def test_hyperspace_foil_compound(self):
        name, foil, hyp, pres, show = parse_variant_flags("Death Star (Hyperspace Foil)", "")
        assert name == "Death Star"
        assert foil is True
        assert hyp is True
        assert pres is False
        assert show is False

    def test_prestige_foil_compound(self):
        name, foil, hyp, pres, show = parse_variant_flags("Darth Vader (Prestige Foil)", "")
        assert name == "Darth Vader"
        assert foil is True
        assert pres is True
        assert hyp is False
        assert show is False

    def test_hyperspace_simple(self):
        name, foil, hyp, pres, show = parse_variant_flags("Death Trooper (Hyperspace)", "")
        assert name == "Death Trooper"
        assert hyp is True
        assert foil is False
        assert pres is False
        assert show is False

    def test_prestige_simple(self):
        name, foil, hyp, pres, show = parse_variant_flags("Luke Skywalker (Prestige)", "")
        assert name == "Luke Skywalker"
        assert pres is True
        assert foil is False
        assert hyp is False
        assert show is False

    def test_foil_suffix(self):
        name, foil, hyp, pres, show = parse_variant_flags("Grogu (Foil)", "Normal")
        assert name == "Grogu"
        assert foil is True
        assert hyp is False
        assert pres is False
        assert show is False

    def test_showcase_kept_in_stored_name(self):
        name, foil, hyp, pres, show = parse_variant_flags(
            "Jyn Erso - Time to Fight (Showcase)", ""
        )
        assert name == "Jyn Erso - Time to Fight (Showcase)"
        assert show is True
        assert foil is False
        assert hyp is False
        assert pres is False

    def test_no_suffix_normal_subtype_all_flags_false(self):
        name, foil, hyp, pres, show = parse_variant_flags("Clone Trooper", "Normal")
        assert name == "Clone Trooper"
        assert not any([foil, hyp, pres, show])

    def test_no_suffix_foil_subtype_sets_foil(self):
        name, foil, hyp, pres, show = parse_variant_flags("Clone Trooper", "Foil")
        assert name == "Clone Trooper"
        assert foil is True
        assert hyp is False
        assert pres is False
        assert show is False

    def test_sec_anomaly_foil_name_overrides_normal_subtype(self):
        # SEC promos: some cards have (Foil) in name but subTypeName="Normal".
        # Name-based parsing takes precedence per spec.
        name, foil, hyp, pres, show = parse_variant_flags(
            "Cantwell Arrestor Cruiser (Foil)", "Normal"
        )
        assert name == "Cantwell Arrestor Cruiser"
        assert foil is True

    def test_compound_checked_before_simple_foil(self):
        # "(Hyperspace Foil)" must not match the trailing "(Foil)" check first
        name, foil, hyp, pres, show = parse_variant_flags("Vader (Hyperspace Foil)", "")
        assert hyp is True
        assert foil is True
        assert name == "Vader"

    def test_whitespace_stripped_from_cleaned_name(self):
        name, *_ = parse_variant_flags("Grogu (Foil)", "")
        assert not name.endswith(" ")

    def test_hyperspace_foil_via_subtype_early_sets(self):
        # SOR/SHD/TWI: Hyperspace Foil uses "(Hyperspace)" name + subTypeName="Foil"
        # rather than "(Hyperspace Foil)" in the name. subTypeName must set is_foil.
        name, foil, hyp, pres, show = parse_variant_flags("Death Trooper (Hyperspace)", "Foil")
        assert name == "Death Trooper"
        assert hyp is True
        assert foil is True

    def test_hyperspace_normal_subtype_does_not_set_foil(self):
        name, foil, hyp, pres, show = parse_variant_flags("Death Trooper (Hyperspace)", "Normal")
        assert hyp is True
        assert foil is False

    def test_hyperspace_foil_name_suffix_takes_precedence_over_normal_subtype(self):
        # "(Hyperspace Foil)" in name → is_foil=True regardless of subTypeName
        name, foil, hyp, pres, show = parse_variant_flags("Death Star (Hyperspace Foil)", "Normal")
        assert foil is True
        assert hyp is True


class TestIsCardRow:
    def test_card_with_rarity(self):
        assert is_card_row({"extRarity": "Common"}) is True

    def test_booster_pack_empty_rarity(self):
        assert is_card_row({"extRarity": ""}) is False

    def test_missing_rarity_key(self):
        assert is_card_row({}) is False

    def test_whitespace_only_rarity_not_card(self):
        assert is_card_row({"extRarity": "  "}) is False


class TestIsSerializedName:
    def test_serialized_card_detected(self):
        assert is_serialized_name("Darth Vader (Serialized)") is True

    def test_foil_card_not_serialized(self):
        assert is_serialized_name("Darth Vader (Foil)") is False

    def test_regular_card_not_serialized(self):
        assert is_serialized_name("Luke Skywalker") is False


class TestAssignBaseCardNumbers:
    def _row(self, name: str, number: str, **flags) -> dict:
        return {
            "name": name,
            "card_number": number,
            "base_card_number": number,
            "is_foil": False,
            "is_hyperspace": False,
            "is_prestige": False,
            "is_showcase": False,
            "is_organized_play": False,
            **flags,
        }

    def test_non_unique_variant_numbers_unchanged(self):
        rows = [
            self._row("Clone Trooper", "5"),
            self._row("Clone Trooper", "5", is_foil=True),
        ]
        _assign_base_card_numbers(rows, has_unique_variant_numbers=False)
        assert rows[0]["base_card_number"] == "5"
        assert rows[1]["base_card_number"] == "5"

    def test_unique_variant_standard_card_self_references(self):
        rows = [self._row("Vader", "1")]
        _assign_base_card_numbers(rows, has_unique_variant_numbers=True)
        assert rows[0]["base_card_number"] == "1"

    def test_unique_variant_foil_links_to_standard(self):
        rows = [
            self._row("Vader", "1"),
            self._row("Vader", "525", is_foil=True),
        ]
        _assign_base_card_numbers(rows, has_unique_variant_numbers=True)
        assert rows[0]["base_card_number"] == "1"
        assert rows[1]["base_card_number"] == "1"

    def test_unique_variant_hyperspace_links_to_standard(self):
        rows = [
            self._row("Grogu", "10"),
            self._row("Grogu", "300", is_hyperspace=True),
        ]
        _assign_base_card_numbers(rows, has_unique_variant_numbers=True)
        assert rows[1]["base_card_number"] == "10"

    def test_unique_variant_op_card_links_to_standard(self):
        rows = [
            self._row("Vader", "1"),
            self._row("Vader", "2", is_organized_play=True),
        ]
        _assign_base_card_numbers(rows, has_unique_variant_numbers=True)
        assert rows[1]["base_card_number"] == "1"

    def test_unique_variant_multiple_variants_all_link_to_same_standard(self):
        rows = [
            self._row("Grogu", "10"),
            self._row("Grogu", "300", is_hyperspace=True),
            self._row("Grogu", "525", is_foil=True),
            self._row("Grogu", "2", is_organized_play=True),
        ]
        _assign_base_card_numbers(rows, has_unique_variant_numbers=True)
        for row in rows:
            assert row["base_card_number"] == "10"

    def test_unique_variant_no_standard_fallback_to_own_number(self):
        # Only a foil exists — no Standard to link to
        rows = [self._row("Rare Card", "525", is_foil=True)]
        _assign_base_card_numbers(rows, has_unique_variant_numbers=True)
        assert rows[0]["base_card_number"] == "525"

    def test_unique_variant_op_standard_not_used_as_lookup(self):
        # OP Standard card should not pollute the name→number lookup
        rows = [
            self._row("Vader", "99", is_organized_play=True),  # OP Standard — excluded from lookup
            self._row("Vader", "200", is_foil=True),           # no base Standard → fallback
        ]
        _assign_base_card_numbers(rows, has_unique_variant_numbers=True)
        assert rows[1]["base_card_number"] == "200"  # fallback, not "99"
