"""Pure normalization functions for CSV ingestion. No database dependencies."""

RARITY_MAP = {
    "Common": "C",
    "Uncommon": "U",
    "Rare": "R",
    "Legendary": "L",
    "Special": "S",
}

# (suffix, is_foil, is_hyperspace, is_prestige, is_showcase, strip_from_name)
# Compound suffixes are listed before simple ones — order is significant.
_VARIANT_SUFFIXES = [
    ("(Hyperspace Foil)", True, True, False, False, True),
    ("(Prestige Foil)", True, False, True, False, True),
    ("(Hyperspace)", False, True, False, False, True),
    ("(Prestige)", False, False, True, False, True),
    ("(Foil)", True, False, False, False, True),
    ("(Showcase)", False, False, False, True, False),  # keep in stored name per domain rules
]


def parse_card_number(raw: str) -> str:
    """Strip /total denominator and leading zeros.

    '009/262' → '9', '525' → '525', 'T01' → 'T01' (non-numeric preserved).
    """
    if "/" in raw:
        raw = raw.split("/")[0]
    raw = raw.strip()
    try:
        return str(int(raw))
    except ValueError:
        return raw


def normalize_rarity(raw: str) -> str:
    """Map full rarity name to single-char code. Raises KeyError on unknown value."""
    return RARITY_MAP[raw]


def parse_variant_flags(
    name: str, sub_type_name: str
) -> tuple[str, bool, bool, bool, bool]:
    """Derive variant boolean flags from card name suffix with subTypeName fallback.

    Returns (cleaned_name, is_foil, is_hyperspace, is_prestige, is_showcase).
    Name suffix takes precedence over subTypeName (handles SEC promo data anomaly
    where some foil cards have subTypeName='Normal' but '(Foil)' in the name).
    """
    for suffix, is_foil, is_hyperspace, is_prestige, is_showcase, strip in _VARIANT_SUFFIXES:
        if name.endswith(suffix):
            cleaned = name[: -len(suffix)].rstrip() if strip else name
            # For early sets (SOR/SHD/TWI), Hyperspace/Prestige variants use the same
            # name suffix for both Normal and Foil, with subTypeName distinguishing them.
            # Apply subTypeName's foil signal when the suffix didn't already set is_foil.
            if not is_foil and sub_type_name.strip() == "Foil":
                is_foil = True
            return cleaned, is_foil, is_hyperspace, is_prestige, is_showcase

    is_foil = sub_type_name.strip() == "Foil"
    return name, is_foil, False, False, False


def is_card_row(row: dict) -> bool:
    """True if this CSV row is an actual card (not a booster pack or display box)."""
    return bool(row.get("extRarity", "").strip())


def is_serialized_name(name: str) -> bool:
    """True for Serialized variants, which are excluded from V1."""
    return "(Serialized)" in name
