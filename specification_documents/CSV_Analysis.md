# TCGPlayer CSV File Analysis
## SWU Inventory Manager — F3 Pre-Work
### Analyzed: 2026-05-08 | Finalized: 2026-05-08

---

## Files Analyzed

7 sets × 2 files (base + Weekly Play Promos) = 14 files

| Set | Code | has_unique_variant_numbers | Base File | Promo File |
|-----|------|---------------------------|-----------|------------|
| Spark of Rebellion | SOR | False | SparkofRebellionProductsAndPrices.csv | SparkofRebellionWeeklyPlayPromosProductsAndPrices.csv |
| Shadows of the Galaxy | SHD | False | ShadowsoftheGalaxyProductsAndPrices.csv | ShadowsoftheGalaxyWeeklyPlayPromosProductsAndPrices.csv |
| Twilight of the Republic | TWI | False | TwilightoftheRepublicProductsAndPrices.csv | TwilightoftheRepublicWeeklyPlayPromosProductsAndPrices.csv |
| Jump to Lightspeed | JTL | True | JumptoLightspeedProductsAndPrices.csv | JumptoLightspeed-WeeklyPlayPromosProductsAndPrices.csv |
| Legends of the Force | LOF | True | LegendsoftheForceProductsAndPrices.csv | LegendsoftheForce-WeeklyPlayPromosProductsAndPrices.csv |
| Secrets of Power | SEC | True | SecretsofPowerProductsAndPrices.csv | SecretsofPower-WeeklyPlayPromosProductsAndPrices.csv |
| A Lawless Time | LAW | True | ALawlessTimeProductsAndPrices.csv | ALawlessTime-WeeklyPlayPromosProductsAndPrices.csv |

**has_unique_variant_numbers:**
- `False` (SOR/SHD/TWI): Normal and Foil printings share the same card number and productId. Variant is identified only by `subTypeName`.
- `True` (JTL/LOF/SEC/LAW): Each printing has a distinct card number and productId. Foil card numbers are significantly higher (JTL foils start at 525, SEC foils start at 1021). Variant is encoded in the card name as a parenthetical suffix.

**groupId → set mapping** (used by ingestion to determine set_id and is_organized_play):

| groupId | Set | is_organized_play |
|---------|-----|-------------------|
| 23405 | SOR | False |
| 23451 | SOR | True |
| 23488 | SHD | False |
| 23555 | SHD | True |
| 23597 | TWI | False |
| 23820 | TWI | True |
| 23956 | JTL | False |
| 24171 | JTL | True |
| 24279 | LOF | False |
| 24535 | LOF | True |
| 24387 | SEC | False |
| 24515 | SEC | True |
| 24572 | LAW | False |
| 24659 | LAW | True |

---

## Schema Design: Boolean Flags

The `cards` table uses independent boolean flags rather than a single `variant` string. This allows any combination of treatments to be represented without enumerating every possible combination.

| Flag | Meaning |
|------|---------|
| `is_foil` | Foil treatment |
| `is_hyperspace` | Hyperspace variant |
| `is_prestige` | Prestige variant |
| `is_showcase` | Showcase treatment — Leaders only (enforced by CheckConstraint) |
| `is_organized_play` | Identifies the Organized Play variant — a distinct physical printing, tracked separately in inventory from regular set printings |

**Why flags over strings:** A single `variant` string requires enumerating combinations — "Hyperspace Foil", "Prestige Foil", etc. Flags handle any combination automatically. When SOR organized play Hyperspace cards were discovered (Hyperspace promos in OP files), the flags model handled it with no design change: `is_hyperspace=True, is_organized_play=True`.

**Future variants** (e.g., Serialized when in scope) require one new migration to add a column — no existing data changes.

---

## Variant Flags Ingestion Logic

Process in this order (checked against card name before falling back to subTypeName):

**Step 1 — Skip rows:**
- Skip any row where `extRarity` is empty (non-card product rows in base files)
- Skip any row where the card name contains `(Serialized)`

**Step 2 — Determine `is_organized_play`** from groupId lookup table above. Like the other variant flags, this identifies a distinct physical printing — not metadata about sourcing.

**Step 3 — Parse flags from card name** (check compound suffixes before simple ones):

| Name suffix | is_foil | is_hyperspace | is_prestige | is_showcase | Strip suffix? |
|-------------|---------|---------------|-------------|-------------|---------------|
| `(Hyperspace Foil)` | True | True | False | False | Yes |
| `(Prestige Foil)` | True | False | True | False | Yes |
| `(Hyperspace)` | False | True | False | False | Yes |
| `(Prestige)` | False | False | True | False | Yes |
| `(Foil)` | True | False | False | False | Yes |
| `(Showcase)` | False | False | False | True | **No — keep in name** |

**Step 4 — Fallback to `subTypeName`** when no name suffix was found:
- `subTypeName = "Foil"` → `is_foil = True`
- `subTypeName = "Normal"` → all flags False

**Note on SEC promos data anomaly:** At least one SEC promo card has `(Foil)` in the name but `subTypeName = "Normal"`. Name-based parsing (Step 3) takes precedence and correctly sets `is_foil = True`.

---

## Card Name Cleaning

After flag parsing, clean the stored name:
1. Strip the matched suffix (all except Showcase)
2. Strip leading/trailing whitespace
3. Store the result as `name`

Example: `"Death Trooper (Hyperspace)"` → stored as `"Death Trooper"`, `is_hyperspace = True`
Example: `"Jyn Erso - Time to Fight (Showcase)"` → stored as `"Jyn Erso - Time to Fight (Showcase)"`, `is_showcase = True`

---

## Field-to-Schema Mapping

### `sets` table
All values hardcoded per file at ingestion time:

| Column | Value |
|--------|-------|
| `code` | SOR, SHD, TWI, JTL, LOF, SEC, LAW |
| `name` | "Spark of Rebellion", "Shadows of the Galaxy", "Twilight of the Republic", "Jump to Lightspeed", "Legends of the Force", "Secrets of Power", "A Lawless Time" |
| `has_unique_variant_numbers` | False: SOR/SHD/TWI · True: JTL/LOF/SEC/LAW |
| `id` | Auto-generated |

### `cards` table

| Column | CSV source | Transformation |
|--------|-----------|----------------|
| `name` | `name` | Strip variant suffix (see above); trim whitespace |
| `rarity` | `extRarity` | Common→C, Uncommon→U, Rare→R, Legendary→L, Special→S |
| `type` | `extCardType` | Direct (Unit, Event, Upgrade, Leader, Base) |
| `is_foil` | Name suffix / subTypeName | See Variant Flags Ingestion Logic |
| `is_hyperspace` | Name suffix | See Variant Flags Ingestion Logic |
| `is_prestige` | Name suffix | See Variant Flags Ingestion Logic |
| `is_showcase` | Name suffix | See Variant Flags Ingestion Logic |
| `is_organized_play` | groupId lookup | Variant flag — identifies the Organized Play printing. Determined by source file groupId. |
| `card_number` | `extNumber` | Strip `/total` portion if present; no leading zeros; SEC promos → auto-increment from 1 |
| `base_card_number` | Derived | See base_card_number section |
| `set_id` | `groupId` → set code → sets.id | Via groupId lookup |
| `id` | Auto-generated | — |
| `created_at` | Auto-generated | — |

### Not ingested in V1 (Phase 2 or excluded)
- `extDescription`, `extCost`, `extPower`, `extHP`, `extArenaType`, `extEpicAction` → Phase 2 `card_details` table; strip HTML to plain text before storing
- `extAspect` → Phase 2 `card_aspects` table
- `extTraits` → Phase 2 `card_traits` table
- All price fields, `imageUrl`, `productId`, `cleanName`, `modifiedOn`, `categoryId`, `url`, `imageCount` → not stored

---

## card_number Parsing

If `extNumber` contains `/`: store only the portion before the slash, without leading zeros.
- `"103/262"` → `"103"`
- `"009/262"` → `"9"`
- `"03/20"` → `"3"`

If `extNumber` has no `/`: store as-is (these are already plain numbers).
- `"525"` → `"525"`
- `"1021"` → `"1021"`

SEC Weekly Play Promos — no `extNumber` column: assign auto-incrementing integers as strings starting at `"1"`.
**⚠️ Known data gap:** These assigned numbers must be updated when accurate source data becomes available.

---

## base_card_number Derivation

`base_card_number` links all printings of a card back to its Standard printing's card number within the same set.

| Scenario | base_card_number |
|----------|-----------------|
| Standard card (no flags set) | Same as `card_number` |
| Any non-Standard card, has_unique_variant_numbers=False (SOR/SHD/TWI) | Same as `card_number` (Normal and Foil share the number) |
| Any non-Standard card, has_unique_variant_numbers=True (JTL/LOF/SEC/LAW) | card_number of the matching Standard card in the same set, found by name match |
| No Standard match found | Fallback: same as `card_number` |

**Name match logic for base_card_number lookup:** Strip all variant suffixes from the current card's name, then find the card in the same set with that name and all flags False (Standard). Use its `card_number` as `base_card_number`.

---

## Schema Changes (Migration 0002)

Applied in `backend/alembic/versions/0002_variant_flags.py`:

| Change | Detail |
|--------|--------|
| Drop | `variant String(30)` column |
| Drop | `uq_cards_set_card_number` constraint |
| Drop | `ck_cards_showcase_leader_only` (old form) |
| Add | `is_foil Boolean default false` |
| Add | `is_hyperspace Boolean default false` |
| Add | `is_prestige Boolean default false` |
| Add | `is_showcase Boolean default false` |
| Add | `uq_cards_set_card_number_foil` on `(set_id, card_number, is_foil)` |
| Add | `ck_cards_showcase_leader_only`: `NOT is_showcase OR type = 'Leader'` |

**UniqueConstraint rationale:** Only `is_foil` is included because it is the only flag where SOR/SHD/TWI assign the same card number to two printings. All other variant flags have distinct card numbers even in early sets.

---

## Structural Differences (Reference)

Column order varies across all 14 files. The ingestion pipeline must use header-based (by-name) parsing, never index-based.

- `extEpicAction` present only in base files (7 of 14); absent from all promo files
- `extNumber` absent from SEC promos only
- Price columns appear early in SOR base and LOF base; late in all others
- `extAspect` at end of headers in JTL promos
- `extArenaType` at end of headers in TWI promos
- `extPower`, `extHP`, `extArenaType` at end of headers in LAW promos
