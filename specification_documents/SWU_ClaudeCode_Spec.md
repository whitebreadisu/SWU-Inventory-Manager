# Star Wars Unlimited: Card Inventory Application
## Technical Specification for Claude Code

**Version 1.0 | May 2026**

---

## 1. Project Overview

This application provides personal card inventory management for the Star Wars Unlimited (SWU) collectible trading card game. It replaces an existing Excel-based tracking system with a low-friction web application built to enterprise-grade design standards.

### 1.1 Core Objectives

- View the complete card list for any SWU set regardless of inventory status
- View current personal inventory
- Add and remove cards from inventory with minimal friction
- Track cards and their associated variants
- Identify cards missing from a complete set (playset)

### 1.2 Domain Rules

- **Playset:** The number of copies that constitute a full playset depends on card type. For **Leader** and **Base** cards, one copy constitutes a full playset (only one leader and one base may be used in a deck at a time). For all other card types, three copies constitute a full playset. Visual variants do not count as different cards for gameplay purposes.
- **Variants:** A card may exist in multiple visual variants. Not all sets contain all variant types. Not all cards within a set have all variants.
- **Card numbering:** Numbering schemes differ by set. In some sets all variants of a card share the same card number; in others, each variant has a unique card number.
- **Showcase variant rule:** The Showcase variant is only valid for cards where Type = Leader.

### 1.3 Out of Scope (Version 1)

- Serialized card variants (individually-numbered collector cards)
- External API integration for card/set data
- Adding new sets post-initial import
- Cross-set filtering views
- Cloud hosting and CI/CD pipeline to production

---

## 2. Technology Stack

> ⚠ The developer runs Windows with VS Code and Docker Desktop already installed. All services run locally via Docker Compose. Cloud deployment is a planned future enhancement.

| Layer | Technology | Purpose |
|-------|------------|---------|
| Backend | Python 3.12 + FastAPI | REST API, data ingestion, business logic |
| Database | PostgreSQL 16 | Persistent storage for all card and inventory data |
| Frontend | React (Vite) | Single-page web application |
| Containerization | Docker + Docker Compose | Local orchestration of all services |
| Backend Testing | pytest | Automated backend unit and integration tests |
| Frontend Testing | Vitest | Automated frontend component tests |
| CI/CD | GitHub Actions | Automated test execution on push; blocks deployment on failure |
| Version Control | Git + GitHub | Source control and CI/CD trigger |

---

## 3. System Architecture

### 3.1 Architectural Pattern

The system follows a three-tier architecture: React frontend communicates exclusively with the FastAPI backend via REST API. The backend communicates with PostgreSQL. The frontend never queries the database directly.

### 3.2 Module Structure

The backend must be organized into the following modules. Each module is independently testable.

- `ingestion/` — CSV and Excel import pipeline
- `models/` — SQLAlchemy ORM models
- `repositories/` — Database query logic (no business logic)
- `services/` — Business logic (no direct DB calls)
- `routers/` — FastAPI route handlers (no business logic)
- `tests/` — pytest test suite mirroring the module structure

### 3.3 API Design

All API endpoints follow RESTful conventions. The API must include auto-generated documentation accessible at `/docs` (Swagger UI) and `/redoc`.

---

## 4. Data Model

### 4.1 Overview

The central entity is a Card+Variant record. Each unique combination of card and variant is its own record in the database. Inventory quantities are stored against these Card+Variant records, not against base cards alone.

### 4.2 Sets Table

Known sets at initial import:

| Code | Full Name |
|------|-----------|
| SOR | Spark of Rebellion |
| SHD | Shadows of the Galaxy |
| TWI | Twilight of the Republic |
| JTL | Jump to Lightspeed |
| LOF | Legends of the Force |
| SEC | Secrets of Power |
| LAW | A Lawless Time |

**Schema:**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | |
| code | VARCHAR(3) | NOT NULL, UNIQUE | Three-character set code (e.g., SOR, SHD) |
| name | VARCHAR(100) | NOT NULL | Full set name |
| has_unique_variant_numbers | BOOLEAN | NOT NULL | Data characteristic: True if Standard and Foil variants have distinct card numbers (JTL, LOF, SEC, LAW). False if Standard and Foil can share a card number (SOR, SHD, TWI). This flag is NOT used by the Add Cards resolver — resolution always matches on `card_number` and the variant picker appears whenever multiple cards share the same `card_number` in the same OP partition, regardless of set type. |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

### 4.3 Cards Table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | |
| set_id | INTEGER | NOT NULL, FK → sets.id | |
| base_card_number | VARCHAR(10) | NOT NULL | The canonical card number for the base variant. Used as the linking key during inventory import. |
| card_number | VARCHAR(10) | NOT NULL | The actual card number for this specific variant record — the number printed on the physical card and always the value the user types in the Add Cards modal. May equal or differ from base_card_number depending on the variant and set. |
| name | VARCHAR(200) | NOT NULL | Card name |
| rarity | VARCHAR(1) | NOT NULL | S=Starter, C=Common, U=Uncommon, R=Rare, L=Legendary |
| type | VARCHAR(20) | NOT NULL | Leader, Base, Unit, Event, Upgrade |
| is_foil / is_hyperspace / is_prestige / is_showcase | BOOLEAN × 4 | NOT NULL, DEFAULT FALSE each | Four independent variant flags. Any combination is valid (e.g., a Hyperspace Foil sets both is_hyperspace and is_foil). is_showcase = TRUE is only valid when type = 'Leader' (DB CHECK constraint: NOT is_showcase OR type = 'Leader'). See Section 5.2 for flag determination logic. |
| is_organized_play | BOOLEAN | NOT NULL, DEFAULT FALSE | Identifies the Organized Play variant. OP printings are distinct physical cards tracked separately in inventory from regular set printings. |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

> ⚠ UNIQUE constraint on (set_id, card_number, is_foil, is_organized_play) — is_foil is included because early sets (SOR, SHD, TWI) assign the same card number to both Standard and Foil variants. is_organized_play is included because OP CSVs use sequential card numbers (1–40) that collide with base set card numbers; without it, OP records would be silently dropped by ON CONFLICT.

> ⚠ Showcase flag: is_showcase = TRUE is only valid when type = 'Leader'. Enforced as a DB CHECK constraint (NOT is_showcase OR type = 'Leader') and validated at the service layer.

### 4.4 Inventory Table

> ⚠ UNIQUE constraint on (card_id) — one inventory record per Card+Variant.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | |
| card_id | INTEGER | NOT NULL, FK → cards.id | References the specific Card+Variant record |
| quantity | INTEGER | NOT NULL, DEFAULT 0, CHECK >= 0 | Count owned. Null in source Excel is treated as 0 on import. |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Updated on every inventory change |

### 4.5 Card Attribute Tables

The following tables extend the core card record with multi-value attributes and game stat details. They were originally planned as Phase 2 but were brought into Phase 1 during the UI session when catalog display required the data. All four tables were created in migration 0016 and populated via `backend/app/ingestion/backfill_card_details.py`, which reads the 7 standard-set CSVs and matches rows to cards by `base_card_number`.

| Table | Structure | Notes |
|-------|-----------|-------|
| `card_aspects` | card_id (FK), aspect (VARCHAR 20) — composite PK | Valid values: Heroism, Villainy, Cunning, Aggression, Command, Vigilance |
| `card_keywords` | card_id (FK), keyword (VARCHAR 50) — composite PK | Keyword data not present in TCGPlayer CSV source; table exists but is unpopulated |
| `card_traits` | card_id (FK), trait (VARCHAR 50) — composite PK | Populated from CSV `extTraits` field. Base cards receive special handling — see note below. |
| `card_details` | card_id (FK, PK), sub_text, cost, power, hp, arena, is_unique | Populated from CSV `extCost`, `extPower`, `extHP`, `extArenaType` fields |

**Known data gaps:**
- `card_keywords`: No keyword source in the TCGPlayer CSV. Will require a separate data source.
- `sub_text` and `is_unique`: Not available in the CSV source. Reserved for future population.

**Base card trait handling:**

TCGPlayer repurposes the `extTraits` CSV field for base cards: it stores the card's location name (a display subtitle, not a gameplay trait) mixed with traits belonging to the token card printed on the reverse side of double-sided bases. The backfill script isolates the location name using two steps:

1. **Intersection** — collects `extTraits` across all rows sharing a `card_number`. Traits that vary between token variants (e.g., Armor on a Shield token, Learned on an Experience token) are eliminated; only the value common to every variant survives. Effective for JTL (4 token types) and LOF (3 token types).
2. **Token trait filter** — removes a maintained set of known token card traits (`Armor`, `Learned`, `Fighter`, `Vehicle`, `Force`, `Official`, `Supply`). Handles sets with only one token variant (SEC, LAW) where intersection alone cannot separate the location from the token trait.

The result is that `card_traits` for base cards contains only the location name (e.g., `Tatooine`, `Coruscant`), or is empty if no location is present in the CSV. This must be updated when a new set introduces a new token type.

**Backfill idempotency:** Trait rows are deleted and re-inserted on each run (unlike aspects and details which use `ON CONFLICT DO NOTHING`). This ensures corrections to the backfill logic take effect without requiring a manual cleanup step.

**Nullability rules (in effect):**
- `power`: NULL for Base and Event types; populated for Leader, Unit, Upgrade.
- `hp`: NULL for Event types; populated for Leader, Unit, Upgrade, and Base (base HP is 25, 27, 30, or 35 depending on the card). Some base cards have NULL hp due to missing data in the TCGPlayer CSV source.
- `arena`: "Ground" or "Space" for unit cards; NULL for non-unit types.
- `cost`: NULL for Base cards; populated for all other types.

---

## 5. Data Ingestion Pipeline

### 5.1 Overview

The ingestion pipeline runs once during initial setup. It processes 14 source files (7 standard set CSVs + 7 Organized Play CSVs) and 1 Excel inventory file. All source files are discarded after successful import. The pipeline must be idempotent — running it twice on a clean database must produce the same result without errors.

After the catalog data is validated at the end of Foundation F4, a catalog seed file is generated from the current database state (see Section 5.4). The seed file — not the original CSVs or the migration history — becomes the authoritative source for rebuilding the catalog on a fresh database.

### 5.2 CSV Ingestion (Card & Set Data)

#### Field Normalization Rules

- **Card number:** Strip the denominator and remove leading zeros. Transform `'112/252'` → `'112'`. Transform `'009/252'` → `'9'`. Store as string. Numbers with no denominator (e.g., `'525'`) are stored as-is.
- **Variant flags** (is_foil, is_hyperspace, is_prestige, is_showcase): Derived by parsing parenthetical suffixes in the card name field. Check compound suffixes before simple ones (e.g., check `'(Hyperspace Foil)'` before `'(Foil)'`). For cards with no name suffix, fall back to the subTypeName field (`'Normal'` → all flags False; `'Foil'` → is_foil = True). Cards named `'(Showcase)'` retain that suffix in the stored name. Cards named `'(Serialized)'` are skipped entirely. See the CSV Analysis document for the complete flag determination table.
- **Organized Play variant flag** (is_organized_play): Set TRUE for cards sourced from Organized Play (Weekly Play Promo) CSV files. The Organized Play printing is a distinct physical card — not a sourcing annotation. It is a variant type in the same sense as Foil or Hyperspace, and is tracked separately in inventory. Determined by the source file's groupId — see the CSV Analysis document for the complete groupId-to-set mapping. An OP Hyperspace card has both is_organized_play = TRUE and is_hyperspace = TRUE.
- **Set code:** Derive from the filename or a configured mapping — not from a field in the CSV.

#### Field Mapping Configuration

Each set's CSV may use different field names. A field mapping configuration file (`ingestion/mappings/set_mappings.yaml`) must be created during development to record the mapping decisions made for each of the 14 CSV files. This file is documentation as much as configuration — it must be retained and committed to version control as the authoritative record of normalization decisions, to inform the future 'add new set' enhancement.

> ⚠ Sample mapping structure for YAML config: set_code, csv_filename, is_organized_play (bool), has_unique_variant_numbers (bool), field_map (dict of canonical_name → csv_field_name). Variant flag logic is consistent across all files and is handled in code, not in the YAML configuration.

#### Organized Play CSV Handling

- OP CSVs follow a similar structure to standard set CSVs.
- Cards imported from OP CSVs must have is_organized_play = TRUE.
- OP CSVs have their own field mapping entries in the mapping configuration.

### 5.3 Excel Inventory Ingestion

#### File Structure

- One tab per set, named by set.
- One row per card (base card level, not variant level).
- Each row contains the base card number and one quantity field per variant type present in that set.
- Null quantity fields represent zero inventory — treat as 0 on import.

#### Import Logic

- For each row, read the base card number.
- For each variant quantity field in the row with a non-null value > 0:
  - Look up the card record in the database by (set_id, base_card_number) plus the variant flags (is_foil, is_hyperspace, is_prestige, is_showcase, is_organized_play) that correspond to the Excel column being processed. This lookup is consistent across all sets — base_card_number is always the Standard card's number for that name, regardless of the variant being looked up. This lookup is always deterministic — one result guaranteed.
  - Create or update the inventory record with the quantity.

> ⚠ If a lookup fails to find a matching card record, log the failure with full row details and continue processing. Do not abort the entire import. Produce a summary report of all failed lookups after import completes.

### 5.4 Catalog Seed File

After Foundation phase F4 is complete and catalog data is validated, a SQL seed file is generated from the current database state. This file is the authoritative source for populating the `sets` and `cards` tables on a fresh database — not the original CSVs and not the sequence of data-fix migrations.

**Rationale:** Schema migrations (DDL) and catalog data are different concerns. Migrations that patch specific data rows encode bugs as permanent, load-bearing history. The correct model separates them:

- **Schema migrations** — DDL only: table structure, indexes, constraints. Always run on fresh install.
- **Catalog seed file** — A single SQL file generated from the validated database. Applied once after schema migrations, before any user inventory is loaded.
- **Ingestion pipeline** — Retained for future set releases. After each new set is ingested and validated, the seed file is regenerated to incorporate it.

**Fresh install sequence:**
1. Run schema migrations (Alembic)
2. Apply catalog seed file (includes sets, cards, card_aspects, card_traits, card_details)
3. Apply inventory snapshot (see Section 5.5)

**New set release sequence:**
1. Run ingestion pipeline for new set CSVs
2. Validate catalog completeness
3. Regenerate seed file

The CSV source files and ingestion pipeline are development tools used to produce and update the seed file — not production dependencies.

**Seed file location:** `db/seeds/catalog_seed.sql` — committed to version control.

### 5.5 Inventory Snapshot

The UI owns the inventory. The Excel file (F4) is retired and a snapshot-based pattern takes over — parallel to the catalog seed but with a different operational rhythm.

- **`generate_inventory_snapshot.py`** — exports the `inventory` table (card_id, quantity, updated_at) to `db/snapshots/inventory_snapshot.sql`. Run after every significant update to your collection, and always before any destructive database operation.
- **`apply_inventory_snapshot.py`** — restores inventory on a fresh database. Idempotent: skips if inventory is already populated. Runs automatically on container startup, immediately after the catalog seed is applied.

**Operational rhythm:** The catalog seed changes infrequently (only when a new set releases). The inventory snapshot should be updated regularly — it is a living record of your collection committed to version control.

**F4 retirement:** F4's ON CONFLICT behavior was changed from DO UPDATE to DO NOTHING, and the `personal_card_inventory` Excel volume mount was removed from `docker-compose.yml`. The F4 ingestion script remains in the repository as a retired/historical tool — it will not run inside the container without manually remounting the volume.

**Snapshot file location:** `db/snapshots/inventory_snapshot.sql` — committed to version control.

---

## 6. API Endpoints

### 6.1 Sets

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/sets | List all sets with code and name |
| GET | /api/sets/{set_code} | Get a single set by code |

### 6.2 Cards

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/cards | List cards. Supports query params: set_code, variant, type, rarity |
| GET | /api/cards/{id} | Get a single card+variant record by ID |

### 6.3 Inventory

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/inventory | List every card variant record joined with its inventory quantity, including records with quantity 0. Response: `CardResponse` extended with `quantity: int`. |
| GET | /api/inventory/missing | List card+variant records with an incomplete playset. Supports query param: set_code. |
| POST | /api/inventory/{card_id}/increment | Increment the quantity for a specific variant by 1. See increment rules below. |
| POST | /api/inventory/{card_id}/decrement | Decrement the quantity for a specific variant by 1. Floor: 0. Returns `{ card_id, quantity }`. |
| PUT | /api/inventory/{card_id} | Set an explicit quantity. Body: `{ quantity: int }`. |

**Increment rules (`POST /api/inventory/{card_id}/increment`):**

The behaviour differs by card type because Leader and Base cards have a playset size of 1.

*Leader and Base cards — per-variant cap of 1:*
- If this variant's `quantity >= 1`: do NOT increment. Return `{ blocked: true, reason: "trade_sell" }` with HTTP 200.
- Otherwise: increment to 1 and return `{ quantity: 1, playset_complete: true }`.

*All other card types — shared cap of 3 across variants:*
- Compute `total` = sum of quantities across all variants of the same base card.
- If `total >= 3`: do NOT increment. Return `{ blocked: true, reason: "trade_sell" }` with HTTP 200.
- Otherwise: increment and return `{ quantity, playset_complete: true }` when the new total equals exactly 3, or `{ quantity, playset_complete: false }` otherwise.

All responses include `card_id`, `quantity`, `playset_complete` (bool), `blocked` (bool), and `reason` (string | null).

### 6.4 Card Lookup

> ⚠ This endpoint powers the core low-friction UX: the user types a card number, the UI calls this endpoint, and displays all variants with current inventory counts and trade/sell signals.

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/cards/lookup | Look up cards by card number within a set. Query params: set_code (required), card_number (required). Returns all variant records for that base card number, with inventory quantities attached. |

> **Implementation decision (S3):** The Add Cards modal resolves card numbers client-side against the inventory data already loaded by `InventoryPage` (`GET /api/inventory` returns every card+variant record). Because all required data is already in memory, calling this endpoint per keystroke adds latency with no benefit. `GET /api/cards/lookup` is deferred — it will be implemented when a consumer requires server-side lookup (e.g., a future mobile client or API integration).

---

## 7. Frontend Specification

### 7.1 Application Shell

Single-page React application. No full page reloads between views. The application is structured around three top-level sections: **Inventory**, **Catalog**, and **Decks**. The active section is controlled by a tabbed header navigation; content below the section separator changes on tab selection.

**Shell components:**

| Component | Description |
|-----------|-------------|
| `Header` | Full-width dark bar containing the brand label, tab navigation (Inventory / Catalog / Decks), and a context-sensitive sub-navigation row for section-specific action buttons. The active tab has a 2px blue underline indicator. |
| `SectionSeparator` | A full-width decorative bar separating the header from the content area. Styled as a dark band with a dot-matrix background pattern and thin blue top/bottom borders — approximating the transparent-PNG separator used on the official SWU site. |

### 7.2 Design System

The application visual design mirrors the official Star Wars: Unlimited website (starwarsunlimited.com). The design system is defined via CSS custom properties in `index.css`.

**Color palette:**

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-page` | `#090b14` | Page background |
| `--bg-surface` | `#0f1528` | Header, table header |
| `--bg-surface-alt` | `#0b0f1f` | Alternating table rows |
| `--color-primary` | `#2563eb` | Active buttons, underlines, borders |
| `--color-primary-dim` | `#1d4ed8` | Hover/pressed state for primary buttons |
| `--color-btn-off` | `#2d3748` | Inactive/greyed-out filter buttons |
| `--color-border-strong` | `rgba(37,99,235,0.45)` | Section separator accent border |
| `--color-text` | `#e6e6e6` | Primary text |
| `--color-text-muted` | `#6b7a99` | Secondary text, column headers |
| `--color-border` | `#1e2748` | Table borders, surface dividers |

**Typography:**
- Headings and navigation: `Barlow Condensed` (Google Fonts), weights 400/600/700, uppercase with letter-spacing.
- Body and table content: `Barlow` (Google Fonts), weights 400/500.

**SWU Button (`SWUButton` component):**
The button shape is recreated from the polygon paths used by the official site's SVG button assets (`swh_button_blue_l.svg`, `swh_button_blue_r.svg`). Each button is assembled from three parts: an inline SVG left cap (angled/pointed edge), a flat center label area, and an inline SVG right cap with a shadow polygon. Button color is driven by an `active` prop — blue (`#2563eb`) when active, dark grey (`#2d3748`) when inactive. Supports three sizes: `sm` (40px), `md` (52px), `lg` (64px).

**Aspect Icons (`AspectIcon` component):**
Official PNG images downloaded from the SWU media kit (`starwarsunlimited.com/media-kit`), served as static assets from `frontend/public/images/SWH_Aspects_*.png`. Rendered via `<img>` with a configurable `size` prop (width and height in px). One file per aspect: `SWH_Aspects_Command.png`, `SWH_Aspects_Aggression.png`, `SWH_Aspects_Cunning.png`, `SWH_Aspects_Vigilance.png`, `SWH_Aspects_Heroism.png`, `SWH_Aspects_Villainy.png`.

**Variant Circles (`VariantCircles` component):**
A row of 12px circles, one per variant type that exists for a given base card. Solid fill for non-foil variants; transparent with a colored border for foil variants.

| Variant | Color | Style |
|---------|-------|-------|
| Standard | `#6b7280` | Solid |
| Foil | `#9ca3af` | Outlined |
| Hyperspace | `#2563eb` | Solid |
| Hyperspace Foil | `#60a5fa` | Outlined |
| Prestige | `#d97706` | Solid |
| Prestige Foil | `#fbbf24` | Outlined |
| OP | `#dc2626` | Solid |
| OP Foil | `#f87171` | Outlined |

### 7.3 Catalog View

The Catalog view displays the complete card catalog across all sets. It is the primary read-only reference view — inventory interaction happens in the Inventory section.

**Canonical ordering rules (applied consistently everywhere sets or aspects appear in the UI):**

- **Sets** — release order: SOR, SHD, TWI, JTL, LOF, SEC, LAW
- **Aspects** — canonical order: Vigilance, Command, Aggression, Cunning, Heroism, Villainy

These orderings govern filter buttons, table columns, card-level aspect display, and any future views. A card with multiple aspects always displays them in canonical aspect order regardless of the order returned by the API.

**Filter panel (`FilterPanel` component):**

A shared, collapsible filter panel used on both the Catalog and Inventory screens. All filter state is managed in the parent screen component. The panel collapses to a single header row via a chevron toggle.

> The Catalog initially shipped with simple set-logo image toggle buttons and aspect-icon toggle buttons (S1). `FilterPanel` replaced that bar in S3 (complete).

| Control | Detail |
|---------|--------|
| Search | Free-text input. Matches name, subtitle, traits, keywords, and type. |
| Aspect picker | Six `AspectIcon` hex-shield buttons in canonical order. All active by default. Clicking when all are active isolates to that aspect. Clicking an active aspect in a partial selection deactivates it; clearing to zero resets to all-active. |
| Multi-select row 1 | **Set** (code + name), **Type**, **Rarity**, **Variant** — each a dropdown with select-all/clear controls. |
| Multi-select row 2 | **Keywords** (searchable), **Traits** (searchable), **Arenas**. |
| Range sliders | **Cost** (0–15), **Power** (0–12), **HP** (0–35) — dual-handle. Label reads "Any" when at full range. |
| Children slot | Screen-specific controls rendered inside the panel border. Catalog passes no children. Inventory slots in the "Show only incomplete playsets" toggle (see Section 7.4). |

*Filter logic:* Within each multi-select, logic is OR. Across controls, logic is AND. Cards with no aspects pass aspect filtering only when all six aspects are active.

`applyFilters(cards, filters)` is a shared pure function exported from `FilterPanel` and applied identically on both screens. Screen-specific predicates are applied after `applyFilters` in the parent component.

**Card table:**

One row per **base card** (not per variant). Cards are grouped by `base_card_number` on the frontend before rendering. The `Variants` column shows which variants exist for that card using the `VariantCircles` component.

| Column | Source | Notes |
|--------|--------|-------|
| Name | `cards.name` | See subtitle display rules below |
| Rarity | `cards.rarity` | Displayed as full label: Common, Uncommon, Rare, Legendary, Starter |
| Aspect | `card_aspects.aspect` | Rendered as `AspectIcon` images, in canonical aspect order |
| Type | `cards.type` | |
| Cost | `card_details.cost` | `—` if null |
| Power | `card_details.power` | `—` if null |
| HP | `card_details.hp` | `—` if null |
| Trait | `card_traits.trait` | Comma-joined list; `—` if none. Always `—` for Base cards (location name is shown as subtitle, not as a trait). |
| Keyword | `card_keywords.keyword` | Semicolon-joined list; `—` if none (currently unpopulated) |
| Arena | `card_details.arena` | `—` if null |
| Variants | Derived | `VariantCircles` component |
| Set | `cards.set_code` | |

**Name column — subtitle display rules:**

Two card types render a subtitle below the primary name in smaller italic muted text (`parseCardDisplay` utility in `frontend/src/utils/catalog.ts`):

- **Base cards:** subtitle is `card_traits[0]` — the location name stored there by the backfill (e.g., "Tatooine"). No trait values are shown in the Trait column for base cards.
- **Named cards with ` - ` in the name:** text before the separator is the display name; text after is the subtitle (e.g., "Director Krennic" / "Aspiring to Authority"). The full hyphenated string remains the stored `cards.name` value.

**Layout:** The catalog table wrapper fills all remaining viewport height below the heading and filter bar (`flex: 1` in a flex column chain from `html` → `.app-layout` → `.app-main` → `.catalog-page` → `.catalog-table-wrapper`). `overflow: auto` on the wrapper provides both vertical and horizontal scrollbars within the visible screen area — the horizontal scrollbar is always visible at the bottom of the viewport, not the bottom of the table content.

**API:** The catalog fetches all cards in a single call (`GET /api/cards` with no filters) and performs grouping and filtering entirely on the frontend. This avoids multiple round-trips and keeps the filter interaction instant.

### 7.4 Inventory View

The Inventory view displays all cards in the catalog with the user's current owned counts overlaid per variant. It is the primary editing surface — all bulk inventory changes happen here; quick single-card entry happens in the card number lookup flow (Section 7.5).

**Layout:**

```
InventoryPage
├── INVENTORY heading
├── InventorySummary
├── FilterPanel (+ "Show only incomplete playsets" toggle as child slot)
└── InventoryTable
```

**`InventorySummary` component:**

A single-line stat strip rendered above the filter panel. Receives the same filtered card list as `InventoryTable` (post-`applyFilters` and post-`incompleteOnly`) — all four stats update dynamically with the active filter selection, including the "Show only incomplete playsets" toggle. (Revised 2026-06-11: originally received the full unfiltered list so stats stayed stable across filter changes; changed so the summary reflects the currently visible slice of the catalog.)

Format: `Playset complete: NN%  —  Set complete: NN%  —  N cards (N unique)`

| Stat | Definition |
|------|------------|
| Playset complete % | Cards where playset is complete ÷ total cards. Leader/Base: complete at ≥ 1 total copy. All others: complete at ≥ 3 total copies across variants. |
| Set complete % | Cards where total owned > 0 ÷ total cards |
| N cards | Total owned cards summed across all variants |
| N unique | Distinct base cards with at least one copy owned |

**Filter panel:**

Uses the shared `FilterPanel` component (Section 7.3). The `incompleteOnly` toggle is a screen-specific extension slotted in as a `FilterPanel` child so it renders inside the same panel border. When active, applies a post-`applyFilters` predicate: `cards.filter(c => !isPlaysetComplete(c))`. Label: "Show only incomplete playsets". This is the UI surface for incomplete-playset filtering; `GET /api/inventory/missing` provides the equivalent data for programmatic/API access.

**`InventoryTable` columns:**

One row per **base card** (grouped by `base_card_number` on the frontend before rendering).

| Column | Source | Notes |
|--------|--------|-------|
| Name | `cards.name` | Same subtitle display rules as Catalog |
| Inventory | Derived | `VariantInventory` component |
| Playset | Derived | `PlaysetCell` component |
| Rarity | `cards.rarity` | Full label |
| Aspect | `card_aspects.aspect` | `AspectIcon` images, canonical order |
| Type | `cards.type` | |
| Cost | `card_details.cost` | `—` if null |
| Power | `card_details.power` | `—` if null |
| HP | `card_details.hp` | `—` if null |
| Trait | `card_traits.trait` | Same rules as Catalog |
| Keyword | `card_keywords.keyword` | Comma-joined; `—` if none |
| Arena | `card_details.arena` | `—` if null |
| Set | `cards.set_code` | |

**`VariantInventory` component:**

Renders one chip per variant the card has (only variants that exist for that base card). Each chip displays a short label, the current quantity, and `−`/`+` step buttons that appear on hover. `−` is disabled when quantity = 0. Zero-quantity chips are visually dimmed.

| Short | Variant |
|-------|---------|
| S | Standard |
| F | Foil |
| HS | Hyperspace |
| HSF | Hyperspace Foil |
| P | Prestige |
| PF | Prestige Foil |
| OP | Organized Play |
| OPF | OP Foil |

The `+` button dispatches to `POST /api/inventory/{card_id}/increment`. The server applies the playset cap rules (Section 6.3) and returns the appropriate signal. The `+` button is disabled client-side when the cap is already reached: for Leader/Base this is checked per variant chip (disabled when that chip's quantity ≥ 1); for all other cards it is checked against the shared total (disabled when total across all variants ≥ 3).

**`PlaysetCell` component:**

Display differs by card type:

*Leader and Base cards:* One pip. Filled and green when total owned ≥ 1. When total owned ≥ 2, the raw count appears beside the pip.

*All other cards:* Three pips — one per copy toward the 3-copy playset. Each pip fills as copies are added. At 3/3 the component enters `playset--complete` (green). At 0 copies it enters `playset--empty`. When owned > 3, the raw count appears beside the pips as a row-level trade/sell visual signal.

**API:** The Inventory view fetches `GET /api/inventory`, which returns every card variant record with its quantity. The frontend groups these by `base_card_number` (`groupWithInventory()`) to build one row per base card, deriving `hasStandard`/`hasFoil`/… flags and an `inventory` dict (invKey → quantity) and `cardIds` dict (invKey → card_id) for use by `VariantInventory`. Inventory mutations call `POST /api/inventory/{card_id}/increment` or `POST /api/inventory/{card_id}/decrement` per step-button click, then update local state with the returned quantity.

### 7.5 Core Interaction: Card Number Lookup & Inventory Update

This is the primary user flow for the Inventory section and must be fast and frictionless. It is designed for use while holding a physical card.

- A persistent search/input field accepts a card number.
- On entry of a valid card number (within the selected set), all variant records for that card are displayed immediately, with current inventory counts.
- Each variant record has a single-click increment button (+1).
- On increment, behaviour depends on card type (see Section 6.3 increment rules):
  - *Leader/Base:* If this variant already has 1 copy, do NOT increment — display 'Trade/Sell' signal. Otherwise increment to 1 and display 'Playset complete'.
  - *All other types:* If total owned across all variants is already 3, do NOT increment — display 'Trade/Sell' signal. If incrementing reaches exactly 3, display 'Playset complete'. Otherwise update count.

### 7.6 Variant Display

Because different sets have different variant types, the UI must derive the available variant columns dynamically from the set's card data rather than hardcoding variant columns. This ensures the UI adapts correctly as sets with different variant compositions are selected.

---

## 8. Development Approach

### 8.1 Methodology: Vertical Slices

Development proceeds in vertical slices. Each slice delivers a complete, working, tested feature from database to UI before the next slice begins. The database schema and ingestion pipeline are established first as a shared foundation.

**Pre-implementation design tooling — Claude Design:**

UI slices are preceded by a dedicated **Claude Design** session before implementation begins. Claude Design produces browser-ready JSX/CSS prototypes that serve as the visual specification and are then ported to the TypeScript codebase. Foundation phases and infrastructure slices (e.g., F5) do not require a Claude Design session.

Each Claude Design handoff is committed to `claude_design/<handoff-folder>/` and contains: a `README.md` (behavior spec, state machine, design tokens), a `design_references/` directory (JSX/CSS prototype files), and a `screenshots/` directory. The `README.md` is the authoritative UI behavior spec for that slice.

**Workflow for UI slices:**
1. Design and iterate in Claude Design until the prototype is approved.
2. Commit the handoff to `claude_design/<handoff-folder>/`.
3. Discuss the handoff with Claude Code: resolve open questions, confirm data strategy, record decisions in the spec.
4. Port JSX to TypeScript: rename `.jsx` → `.tsx`; add `import React, { … } from 'react'`; replace `Object.assign(window, { … })` exports with named `export` declarations.
5. Type props against existing API types in `frontend/src/api/`; wire to backend endpoints.
6. Write tests.

### 8.2 Development Phases

| Phase | Slice | Deliverable |
|-------|-------|-------------|
| Foundation | F1 | Docker Compose environment: PostgreSQL + FastAPI container + React dev server. All services start with a single command. |
| Foundation | F2 | Database schema migration (sets, cards, and inventory tables from Section 4). Card attribute table SQLAlchemy models (card_aspects, card_keywords, card_traits, card_details) defined in code; database migration deferred — these tables were created in migration 0016 during the S1 UI session. |
| Foundation | F3 | CSV ingestion pipeline with field mapping config. All 14 CSVs imported and validated. Schema refined (migration 0002): variant string column replaced with boolean flags (is_foil, is_hyperspace, is_prestige, is_showcase). SEC Organized Play CSV initially had no card numbers — sequential placeholders (2000-2039) were assigned during ingestion. Resolved 2026-06-11: source CSV updated with real card numbers (1-40); the 40 affected `cards.card_number` values were corrected directly in the database and the catalog seed regenerated. |
| Foundation | F4 | Excel inventory ingestion. Inventory data loaded and reconciled against card records. After F4 validation, a catalog seed file is generated from the current database state (see Section 5.4). |
| Slice 1 | S1 | *Claude Design pre-step: complete.* GET /api/sets and GET /api/cards endpoints (initial). React set selector and basic card table. Extended in the UI session: full application design system, Catalog view with set/aspect filter toggles, one-row-per-base-card table, variant circles, aspect icons, SWU-style button component, Header and SectionSeparator components. CardResponse expanded to include aspects, traits, and detail fields. Card attribute tables migrated (migration 0016) and backfilled from CSV source data. Further extended in subsequent session: official aspect PNG images (SWU media kit) replacing SVG placeholders; official set logo PNG images replacing SWUButton text filters; canonical set and aspect ordering enforced throughout; card name subtitle display (hyphen-split for named cards, location name for base cards); base card trait backfill corrected (intersection + token-trait filter isolates location from token card traits; traits DELETE + re-insert for idempotency); catalog seed regenerated; viewport-height scrollable table layout with always-visible scrollbars. |
| Slice 2 | S2 | *Claude Design pre-step: complete.* Inventory View fully wired. `GET /api/inventory`, `POST /api/inventory/{id}/increment`, `POST /api/inventory/{id}/decrement` endpoints. Frontend: `InventoryPage`, `InventoryTable`, `VariantInventory` chips with inline +/− steppers, `PlaysetCell`, `InventorySummary` stat strip. Inventory components live in `frontend/src/screens/inventory/`. `groupWithInventory()` in `utils/inventory.ts` groups per-variant API records into one-row-per-base-card objects with `inventory` and `cardIds` dicts. Singleton playset rule implemented: Leader/Base capped at 1 copy per variant with a single green pip; all other cards capped at 3 total copies with three pips. No FilterPanel yet (added in S3). |
| Slice 3 | S3 | *Claude Design pre-step: complete.* Shared `FilterPanel` ported to TypeScript and applied to both screens. `FilterPanel.tsx` lives in `frontend/src/components/` with co-located `FilterPanel.css`. Exports: `FilterPanel`, `MultiSelect`, `RangeSlider`, `AspectPicker`, `applyFilters`, `DEFAULT_FILTERS`, `FilterState`. Catalog: S1 set-logo/aspect toggle bar removed; replaced with `FilterPanel` (no children). Inventory: `FilterPanel` added with the "Show only incomplete playsets" toggle slotted as a child; `InventorySummary` receives the full unfiltered card list so stats stay stable under filtering; `applyFilters` runs first, `incompleteOnly` predicate after. Implementation note: `applyFilters` calls `parseCardDisplay(card)` internally to derive `displayName`/`subtitle` for text search — avoids adding computed fields to `BaseCard`. `InventoryCard[]` is safely cast to `BaseCard[]` when passed to `FilterPanel` because `InventoryCard` extends `BaseCard`. |
| Slice 4 | S4 | *Claude Design pre-step: complete. Implementation complete 2026-05-25. Resolver corrected 2026-06-10.* Add Cards modal. A modal popup invoked from the "Add Cards" button in `InventorySummary`. Keyboard-driven batch entry: user picks a set once, then types card numbers one at a time — each resolves client-side against the already-loaded inventory data into a card name + variant, accumulates in a chip list, and commits on Enter. A verification phase splits the batch into "will be added" (green) vs. "at limit" (red) before committing. On commit, `POST /api/inventory/{id}/increment` is called once per green row; `InventoryPage` re-fetches inventory after modal close. Card resolution uses `GET /api/inventory` data already in memory — `GET /api/cards/lookup` backend endpoint deferred (see Section 6.4). **Resolver algorithm:** `resolveRow` always matches user input against `card_number` (the number printed on the physical card) — never `base_card_number`. The variant picker (`needs_variant`) appears when multiple records share the same `card_number` in the same OP partition (e.g., SOR foil/non-foil pairs at the same number, or OP foil/non-foil pairs). Auto-resolve occurs when exactly one record matches. `has_unique_variant_numbers` is NOT used by the resolver. The OP flag (`is_organized_play`) partitions the matched pool; `hasOpOption` is true when the entered `card_number` has at least one OP record. Components live in `frontend/src/screens/inventory/` (`AddCardsModal`, `AddCardsSetBar`, `AddCardsKeypad`, `AddCardsVerification`, `AddCardsModal.css`). Resolver pure functions in `frontend/src/utils/addCardsResolver.ts` (`resolveRow`, `inventoryStatus`, `splitForVerification`, `variantLabelNoOp`). `InventoryPage` now stores both `rawCards: CardWithQty[]` (passed to modal as `catalog`) and grouped `cards: InventoryCard[]`; sets are fetched inside the modal via `getSets()`. CSS tokens `--aspect-aggression` and `--variant-op` added to `:root` in `AddCardsModal.css`. |
| Foundation | F5 | *Implemented 2026-06-11.* Inventory snapshot & F4 retirement. `generate_inventory_snapshot.py` exports the `inventory` table (card_id, quantity, updated_at) to `db/snapshots/inventory_snapshot.sql` (3,412 records, total quantity 6,439). `apply_inventory_snapshot.py` restores it idempotently on a fresh database, running automatically in the Docker startup chain immediately after `apply_seed`. F4 ON CONFLICT was already DO NOTHING (changed pre-emptively during the seed architecture session). The `personal_card_inventory` Excel volume mount was removed from `docker-compose.yml`; the F4 ingestion script remains in the repo as a retired/historical tool. New tests: `test_inventory_snapshot_integrity.py`, `test_inventory_snapshot_reconstruction.py`. See Section 5.5. |
| Slice 5 | S5 | *Claude Design pre-step: required before implementation begins.* Official card images. Enriches all card records with `front_image_url` and `back_image_url` sourced from the swuapi.com public API (no authentication required). Displays card images in Catalog and card lookup views. Regenerates catalog seed to capture URLs. See Section 9.1 for full specification. |

### 8.3 Testing Requirements

- Every API endpoint must have at least one happy-path and one error-path pytest test.
- Business logic in the service layer must be unit tested independently of the database.
- The ingestion pipeline must have tests covering: field normalization, foil flag handling, variant card number resolution, and failed lookup logging.
- Frontend components must have Vitest tests for the card lookup flow and the trade/sell signal display.
- GitHub Actions workflow runs all tests on every push. A failing test blocks merge.

### 8.4 Field Mapping Documentation Requirement

As each CSV is processed during Foundation phase F3, the field mapping decisions must be recorded in `ingestion/mappings/set_mappings.yaml` and committed alongside the ingestion code. This file is a first-class artifact of the project — not a temporary config — as it serves as the specification for the future 'add new set' enhancement.

---

## 9. Future Enhancements (Out of Scope for Version 1)

The following enhancements are explicitly acknowledged and should inform architectural decisions in Version 1 where noted.

| Enhancement | Impact on Version 1 Design |
|-------------|---------------------------|
| Phase 2 card attributes (Keywords, Sub-text, is_unique) | card_aspects, card_traits, card_details (cost, power, hp, arena) are now Phase 1 — migrated (0016) and backfilled from CSV. Remaining gaps: `card_keywords` has no CSV source; `sub_text` and `is_unique` require a separate data source. UI display of these fields is defined in Section 7.3 but data interpretation and display refinement are ongoing work. |
| Add new sets post-launch | Field mapping YAML format and ingestion pipeline must be designed to be extensible. New set = new mapping entry + new CSV run + validation + regenerate catalog seed file. |
| External API for card/set data | The ingestion module must be loosely coupled. The repository layer abstracts data source so a future API adapter can replace CSV processing without touching services or routes. |
| Cloud hosting (AWS / GCP / Azure) | Docker Compose setup must use environment variables for all configuration (DB credentials, ports). No hardcoded local paths. |
| CI/CD pipeline to production | GitHub Actions structure established in V1. Production deployment job added as a future workflow step. |
| Serialized card variants | Serialized cards (individually-numbered collector cards) are excluded from V1. When in scope, add is_serialized BOOLEAN flag — no other schema changes needed due to the flags model design. |
| Mobile-optimized UI | React component structure should avoid fixed-width layouts. Use responsive CSS from the start. |
| Official card images (FFG CDN via swuapi.com) | Add `front_image_url` and `back_image_url` columns to the `cards` table when S6 is implemented (new migration — no V1 schema impact). Extend `CardResponse` to include both fields as nullable strings. See Section 9.1 for full implementation specification. |

### 9.1 Official Card Images — S6 Specification

**Goal:** Display official FFG card artwork sourced from `cdn.starwarsunlimited.com` via the swuapi.com community API.

#### Data Source

- **Endpoint:** `GET https://api.swuapi.com/export/all` — public, no authentication required
- Returns all cards across all sets with `front_image_url` and `back_image_url` fields
- Images are served from the official FFG CDN: `cdn.starwarsunlimited.com`
- URL example: `https://cdn.starwarsunlimited.com/card_SWH_01_001_Director_Krennic_Leader_62eaa20dc2.png`
- URLs contain a content hash and **cannot be constructed** from local data — the API response is the only source

#### Schema Changes

New Alembic migration adds two nullable columns to the `cards` table:

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| front_image_url | VARCHAR(500) | NULLABLE | Front face of the card. Populated by backfill script. |
| back_image_url | VARCHAR(500) | NULLABLE | Back face (leaders only). NULL for all non-leader cards. |

#### Backfill Script

`backend/app/ingestion/backfill_image_urls.py` — one-time run, idempotent:

1. Fetch full card catalog from `GET https://api.swuapi.com/export/all`
2. For each API record, match to database records by `set_code` + `base_card_number`
3. Write `front_image_url` and `back_image_url` to all matched records (Standard, Foil, Hyperspace, and other local variants for that base card all share the same image URL)
4. Log any unmatched API records (cards not yet in the local DB — likely a new set)
5. After a successful run, regenerate `db/seeds/catalog_seed.sql` to capture the URLs

> ⚠ Variant handling: swuapi.com returns one record per unique card face, not one per local variant. The same `front_image_url` should be written to all local variant rows (Standard, Foil, Hyperspace Foil, etc.) that share a `base_card_number`. Match on `base_card_number`, not `card_number`.

#### API Endpoint Change

Extend `CardResponse` schema:

```python
front_image_url: Optional[str] = None
back_image_url: Optional[str] = None
```

Both fields are nullable — cards without populated URLs render gracefully without an image.

#### Frontend Changes

- **Catalog view:** Card image thumbnail or expandable image panel (exact design TBD at implementation time)
- **Card lookup panel (S3):** Display card image alongside variant/inventory data
- **Graceful fallback:** If `front_image_url` is null, render a dark placeholder panel with the card name

#### Seed Regeneration

After the backfill script runs successfully, regenerate `db/seeds/catalog_seed.sql`. This makes image URLs part of the standard fresh-install sequence — no external API dependency at runtime.

#### Ongoing Maintenance

When a new set releases:
1. Run ingestion pipeline for new set CSVs (existing process)
2. Run `backfill_image_urls.py` to populate image URLs for new cards
3. Regenerate catalog seed

---

## 10. Environment Setup Notes

- Developer OS: Windows 11
- Required tools already installed: VS Code, Docker Desktop, Python, Postman, Git
- The project must include a README.md with step-by-step local setup instructions assuming the above tooling
- All environment variables must be managed via a `.env` file with a `.env.example` committed to the repository
- `.env` must be in `.gitignore` — no secrets in version control
- Docker Compose must expose: FastAPI on port 8000, React dev server on port 5173, PostgreSQL on port 5432

---

*— End of Specification —*
