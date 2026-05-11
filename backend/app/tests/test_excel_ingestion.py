"""Tests for the F4 Excel inventory ingestion pipeline.

All tests are pure (no database required). Covers:
  - Header row detection
  - Inventory column identification (case variations, LAW 'Standard', JTL 'PRESTIGE')
  - Quantity validation
  - Card number normalization (SEC integers, leading-zero strings)
  - VARIANT_COLUMN_FLAGS integrity
"""
import pytest

from app.ingestion.excel_ingestor import (
    VARIANT_COLUMN_FLAGS,
    find_header_row,
    identify_inventory_columns,
    is_valid_quantity,
)
from app.ingestion.normalize import parse_card_number


class TestFindHeaderRow:
    def test_finds_header_at_expected_position(self):
        rows = [
            (None,),
            (False, "Highlight Missing Cards"),
            ("Card #", "Non-Foil", "Foil", "Hyperspace"),
            (None,),
            ("001", 1, None, 1),
        ]
        assert find_header_row(rows) == 2

    def test_sec_header_immediately_before_data(self):
        # SEC has no formula row between header and data
        rows = [
            (None,),
            (False, "Stats"),
            ("Card #", "Non-Foil", "Foil", "Hyperspace"),
            (1, 1, None, 1),
        ]
        assert find_header_row(rows) == 2

    def test_returns_none_when_absent(self):
        rows = [(None,), (None,), (False, "No header here")]
        assert find_header_row(rows) is None

    def test_ignores_rows_with_none_first_cell(self):
        # A row where 'Card #' appears in a non-first column must not match
        rows = [(None, "Card #"), ("Card #", "Non-Foil")]
        assert find_header_row(rows) == 1

    def test_whitespace_stripped_from_cell(self):
        rows = [("  Card #  ", "Non-Foil")]
        assert find_header_row(rows) == 0


class TestIdentifyInventoryColumns:
    def test_sor_columns_detected(self):
        header = (
            "Card #", "Non-Foil", "Foil", "Hyperspace", "F-Hyperspace",
            "Playset", "HS-Playset", "Rarity",
        )
        cols = identify_inventory_columns(header)
        assert set(cols.keys()) == {1, 2, 3, 4}
        assert 5 not in cols  # Playset
        assert 7 not in cols  # Rarity

    def test_law_standard_column_detected(self):
        header = ("Card #", "Standard", "Hyperspace", "F-Hyperspace", "Prestige", "Prestige Foil")
        cols = identify_inventory_columns(header)
        assert 1 in cols
        assert cols[1]["is_foil"] is False
        assert cols[1]["is_hyperspace"] is False
        assert cols[1]["is_organized_play"] is False

    def test_jtl_prestige_case_insensitive(self):
        # JTL uses all-uppercase 'PRESTIGE'
        header = ("Card #", "Non-Foil", "PRESTIGE")
        cols = identify_inventory_columns(header)
        assert 2 in cols
        assert cols[2]["is_prestige"] is True
        assert cols[2]["is_foil"] is False

    def test_promo_flags(self):
        header = ("Card #", "Promo", "Promo Foil")
        cols = identify_inventory_columns(header)
        assert cols[1]["is_organized_play"] is True
        assert cols[1]["is_foil"] is False
        assert cols[2]["is_organized_play"] is True
        assert cols[2]["is_foil"] is True

    def test_prestige_foil_flags(self):
        header = ("Card #", "Prestige Foil")
        cols = identify_inventory_columns(header)
        assert cols[1]["is_prestige"] is True
        assert cols[1]["is_foil"] is True
        assert cols[1]["is_hyperspace"] is False

    def test_f_hyperspace_flags(self):
        header = ("Card #", "F-Hyperspace")
        cols = identify_inventory_columns(header)
        assert cols[1]["is_foil"] is True
        assert cols[1]["is_hyperspace"] is True
        assert cols[1]["is_prestige"] is False

    def test_none_cells_ignored(self):
        header = ("Card #", None, "Foil", None)
        cols = identify_inventory_columns(header)
        assert 1 not in cols
        assert 3 not in cols
        assert 2 in cols

    def test_empty_header_returns_empty(self):
        assert identify_inventory_columns((None, None, None)) == {}

    def test_all_nine_variant_types_recognized(self):
        header = (
            "Card #", "Non-Foil", "Foil", "Hyperspace", "F-Hyperspace",
            "Prestige", "Prestige Foil", "Promo", "Promo Foil",
        )
        cols = identify_inventory_columns(header)
        assert set(cols.keys()) == {1, 2, 3, 4, 5, 6, 7, 8}

    def test_sec_full_header(self):
        header = (
            "Card #", "Non-Foil", "Foil", "Hyperspace", "F-Hyperspace",
            "Prestige", "Prestige Foil", "Promo", "Promo Foil",
            "Playset", "HS-Playset", "Rarity", "Unique",
        )
        cols = identify_inventory_columns(header)
        # Only the 8 inventory columns; Playset, HS-Playset, Rarity, Unique are skipped
        assert set(cols.keys()) == {1, 2, 3, 4, 5, 6, 7, 8}

    def test_duplicate_column_names_use_first_occurrence_only(self):
        # Some sheets (e.g. LOF) have trailing summary columns with the same
        # header as a primary inventory column. Only the first occurrence should
        # be used; the trailing duplicate must be ignored.
        header = (
            "Card #", "Non-Foil", "Foil", "Hyperspace",
            "Card Name", "Cost",
            "Foil", "Hyperspace",   # trailing duplicates — must be ignored
        )
        cols = identify_inventory_columns(header)
        assert set(cols.keys()) == {1, 2, 3}   # indices 6 and 7 must not appear
        assert 6 not in cols
        assert 7 not in cols


class TestIsValidQuantity:
    def test_positive_integer(self):
        assert is_valid_quantity(1) is True
        assert is_valid_quantity(3) is True

    def test_float_positive(self):
        # openpyxl may return 1.0 for integer cells
        assert is_valid_quantity(1.0) is True

    def test_zero_rejected(self):
        assert is_valid_quantity(0) is False

    def test_none_rejected(self):
        assert is_valid_quantity(None) is False

    def test_question_mark_rejected(self):
        # '?' is the display value of playset-status formula cells when read with data_only=True
        assert is_valid_quantity("?") is False

    def test_any_string_rejected(self):
        assert is_valid_quantity("1") is False
        assert is_valid_quantity("") is False

    def test_negative_rejected(self):
        assert is_valid_quantity(-1) is False

    def test_large_quantity_valid(self):
        assert is_valid_quantity(10) is True


class TestCardNumberNormalization:
    """parse_card_number (from normalize.py) is reused for Excel card numbers."""

    def test_string_leading_zeros_stripped(self):
        assert parse_card_number("001") == "1"
        assert parse_card_number("009") == "9"
        assert parse_card_number("052") == "52"

    def test_sec_integer_converted_via_str(self):
        # SEC stores card numbers as integers; str() is called before parse_card_number
        assert parse_card_number(str(1)) == "1"
        assert parse_card_number(str(42)) == "42"
        assert parse_card_number(str(263)) == "263"

    def test_high_number_unchanged(self):
        assert parse_card_number("1021") == "1021"
        assert parse_card_number("2000") == "2000"

    def test_plain_number_unchanged(self):
        assert parse_card_number("5") == "5"


class TestVariantColumnFlagsMapping:
    def test_standard_and_non_foil_are_equivalent(self):
        assert VARIANT_COLUMN_FLAGS["standard"] == VARIANT_COLUMN_FLAGS["non-foil"]

    def test_all_flags_false_for_non_foil(self):
        flags = VARIANT_COLUMN_FLAGS["non-foil"]
        assert all(v is False for v in flags.values())

    def test_foil_sets_only_is_foil(self):
        flags = VARIANT_COLUMN_FLAGS["foil"]
        assert flags["is_foil"] is True
        assert flags["is_hyperspace"] is False
        assert flags["is_prestige"] is False
        assert flags["is_organized_play"] is False

    def test_hyperspace_sets_only_is_hyperspace(self):
        flags = VARIANT_COLUMN_FLAGS["hyperspace"]
        assert flags["is_foil"] is False
        assert flags["is_hyperspace"] is True
        assert flags["is_prestige"] is False

    def test_f_hyperspace_sets_foil_and_hyperspace(self):
        flags = VARIANT_COLUMN_FLAGS["f-hyperspace"]
        assert flags["is_foil"] is True
        assert flags["is_hyperspace"] is True
        assert flags["is_prestige"] is False

    def test_prestige_foil_sets_prestige_and_foil(self):
        flags = VARIANT_COLUMN_FLAGS["prestige foil"]
        assert flags["is_prestige"] is True
        assert flags["is_foil"] is True
        assert flags["is_hyperspace"] is False

    def test_promo_sets_only_is_organized_play(self):
        flags = VARIANT_COLUMN_FLAGS["promo"]
        assert flags["is_organized_play"] is True
        assert flags["is_foil"] is False
        assert flags["is_hyperspace"] is False

    def test_promo_foil_sets_organized_play_and_foil(self):
        flags = VARIANT_COLUMN_FLAGS["promo foil"]
        assert flags["is_organized_play"] is True
        assert flags["is_foil"] is True

    def test_no_entry_sets_is_showcase(self):
        # Showcase is not a valid Excel inventory column — no sheet tracks showcase separately
        for flags in VARIANT_COLUMN_FLAGS.values():
            assert flags["is_showcase"] is False
