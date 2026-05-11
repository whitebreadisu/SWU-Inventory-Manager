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

- **Playset:** Three copies of a card constitute a full playset. Visual variants do not count as different cards for gameplay purposes; a deck may hold three of a given card regardless of variant.
- **Variants:** A card may exist in multiple visual variants. Not all sets contain all variant types. Not all cards within a set have all variants.
- **Card numbering:** Numbering schemes differ by set. In some sets all variants of a card share the same card number; in others, each variant has a unique card number.
- **Showcase variant rule:** The Showcase variant is only valid for cards where Type = Leader.

### 1.3 Out of Scope (Version 1)

- Serialized card variants (individually-numbered collector cards)
- External API integration for card/set data
- Adding new sets post-initial import
- Cross-set filtering views
- Cloud hosting and CI/CD pipeline to production
- Figma/MCP UI design workflow

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
| TWI | Twilight of the Republic |
| SHD | Shadows of the Galaxy |
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
| has_unique_variant_numbers | BOOLEAN | NOT NULL | True if Standard and Foil variants have distinct card numbers (JTL, LOF, SEC, LAW). False if Standard and Foil share a card number (SOR, SHD, TWI). Note: Hyperspace and OP variants always have distinct card numbers regardless of this flag. |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

### 4.3 Cards Table (MVP Attributes)

> ⚠ The data model is intentionally designed to support Phase 2 multi-value attributes (Aspects, Keywords, Traits) via separate junction tables. These tables are not populated in Phase 1 but the base Card record is structured to accommodate them without schema changes to this table.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | |
| set_id | INTEGER | NOT NULL, FK → sets.id | |
| base_card_number | VARCHAR(10) | NOT NULL | The canonical card number for the base variant. Used as the linking key during inventory import. |
| card_number | VARCHAR(10) | NOT NULL | The actual card number for this specific variant record. May differ from base_card_number in sets with unique variant numbering. |
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

### 4.5 Phase 2 Attribute Tables (Schema Placeholders)

The following tables are defined here for documentation purposes. They are **not populated in Phase 1**. SQLAlchemy ORM models are defined in Phase 1 for structural reference, but the database migration for these tables is deferred to Phase 2. Deferral rationale: field definitions may evolve before Phase 2 implementation begins, and creating empty tables now would require a drop-and-recreate migration later. The models inform the cards table design without requiring immediate schema commitment.

- `card_aspects` — junction table: card_id, aspect (Heroism, Villainy, Cunning, Aggression, Command, Vigilance)
- `card_keywords` — junction table: card_id, keyword (enumerated list to be defined before Phase 2)
- `card_traits` — junction table: card_id, trait (enumerated list to be defined before Phase 2)
- `card_details` — one-to-one extension: card_id, sub_text, cost, power, hp, arena, is_unique

**Phase 2 nullability rules to implement when card_details is populated:**

- `power` and `hp`: NOT NULL for types Leader, Unit, Upgrade — always NULL for Base and Event
- `sub_text`: Cannot be null when is_unique = true (to be confirmed before Phase 2 implementation)
- `arena`: 0 or 1 values from [Ground, Space]

---

## 5. Data Ingestion Pipeline

### 5.1 Overview

The ingestion pipeline runs once during initial setup. It processes 14 source files (7 standard set CSVs + 7 Organized Play CSVs) and 1 Excel inventory file. All source files are discarded after successful import. The pipeline must be idempotent — running it twice on a clean database must produce the same result without errors.

After the catalog data is validated at the end of Foundation F4, a catalog seed file is generated from the current database state (see Section 5.4). The seed file — not the original CSVs or the migration history — becomes the authoritative source for rebuilding the catalog on a fresh database.

### 5.2 CSV Ingestion (Card & Set Data)

#### Field Normalization Rules

- **Card number:** Strip the denominator and remove leading zeros. Transform `'112/252'` → `'112'`. Transform `'009/252'` → `'9'`. Store as string. Numbers with no denominator (e.g., `'525'`) are stored as-is. Exception: SOP Organized Play CSV has no card number field — assign sequential integers as strings starting at `'1'` during ingestion. These values must be updated when accurate source data becomes available. (Known data gap.)
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
2. Apply catalog seed file
3. Load user inventory (Excel ingestion)

**New set release sequence:**
1. Run ingestion pipeline for new set CSVs
2. Validate catalog completeness
3. Regenerate seed file

The CSV source files and ingestion pipeline are development tools used to produce and update the seed file — not production dependencies.

**Seed file location:** `db/seeds/catalog_seed.sql` — committed to version control.

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
| GET | /api/inventory | List all inventory records with quantity > 0. Supports query param: set_code |
| GET | /api/inventory/missing | List card+variant records with quantity < 3 (incomplete playset). Supports query param: set_code |
| POST | /api/inventory/{card_id}/increment | Increment quantity by 1. Returns updated record and a flag if quantity has reached 3 (playset complete) or exceeds 3 (trade/sell signal). |
| POST | /api/inventory/{card_id}/decrement | Decrement quantity by 1. Minimum quantity is 0. |
| PUT | /api/inventory/{card_id} | Set an explicit quantity. Body: `{ quantity: int }` |

### 6.4 Card Lookup

> ⚠ This endpoint powers the core low-friction UX: the user types a card number, the UI calls this endpoint, and displays all variants with current inventory counts and trade/sell signals.

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/cards/lookup | Look up cards by card number within a set. Query params: set_code (required), card_number (required). Returns all variant records for that base card number, with inventory quantities attached. |

---

## 7. Frontend Specification

### 7.1 Application Shell

Single-page React application. No full page reloads between views. Set selector is always visible. The primary view is set-centric — selecting a set loads that set's card list with inventory data overlaid.

### 7.2 Primary View: Set Card List

- **Set selector:** dropdown of all sets, defaults to the first set on load.
- **Filter bar:** filter by Type, Rarity, Variant. Filters are additive (AND logic).
- **Card table/grid:** displays Card Number, Card Name, Variant, Rarity, Type, and inventory columns.
- **Inventory columns:** quantity owned, playset status indicator (e.g., 0/3, 1/3, 2/3, ✓ for complete).
- Cards with quantity = 3 display a clear 'playset complete' visual signal.
- Cards with quantity = 0 and at least one variant owned display differently than cards with no inventory at all.

### 7.3 Core Interaction: Card Number Lookup & Inventory Update

This is the primary user flow and must be fast and frictionless. It is designed for use while holding a physical card.

- A persistent search/input field accepts a card number.
- On entry of a valid card number (within the selected set), all variant records for that card are displayed immediately, with current inventory counts.
- Each variant record has a single-click increment button (+1).
- On increment:
  - If resulting quantity < 3: update inventory count, show updated count.
  - If resulting quantity = 3: update inventory count, display prominent 'Playset complete' confirmation.
  - If resulting quantity > 3: do NOT increment. Display a prominent 'Trade/Sell' signal instead. The card is not added to inventory.

### 7.4 Variant Display

Because different sets have different variant types, the UI must derive the available variant columns dynamically from the set's card data rather than hardcoding variant columns. This ensures the UI adapts correctly as sets with different variant compositions are selected.

---

## 8. Development Approach

### 8.1 Methodology: Vertical Slices

Development proceeds in vertical slices. Each slice delivers a complete, working, tested feature from database to UI before the next slice begins. The database schema and ingestion pipeline are established first as a shared foundation.

### 8.2 Development Phases

| Phase | Slice | Deliverable |
|-------|-------|-------------|
| Foundation | F1 | Docker Compose environment: PostgreSQL + FastAPI container + React dev server. All services start with a single command. |
| Foundation | F2 | Database schema migration (sets, cards, and inventory tables from Section 4). Phase 2 attribute tables (card_aspects, card_keywords, card_traits, card_details) defined as SQLAlchemy models only; database migration deferred to Phase 2. |
| Foundation | F3 | CSV ingestion pipeline with field mapping config. All 14 CSVs imported and validated. Schema refined (migration 0002): variant string column replaced with boolean flags (is_foil, is_hyperspace, is_prestige, is_showcase). SOP Organized Play CSV has no card numbers — sequential values assigned from 1; requires future correction when source data is available. |
| Foundation | F4 | Excel inventory ingestion. Inventory data loaded and reconciled against card records. After F4 validation, a catalog seed file is generated from the current database state (see Section 5.4). |
| Slice 1 | S1 | GET /api/sets and GET /api/cards endpoints. React set selector and card list table (no inventory data yet). |
| Slice 2 | S2 | GET /api/inventory and inventory columns in card list table. Playset status indicators. |
| Slice 3 | S3 | Card number lookup endpoint and UI input field. Display all variants for a looked-up card. |
| Slice 4 | S4 | Increment/decrement inventory. Trade/sell signal. Playset complete confirmation. |
| Slice 5 | S5 | Filter bar (Type, Rarity, Variant). Missing cards view (/api/inventory/missing). |

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
| Phase 2 card attributes (Aspects, Keywords, Traits, Cost, Power, HP, Arena, Unique, Sub-text) | Phase 2 tables defined in schema now (Section 4.5). Modular service layer ensures attributes can be added without restructuring. |
| Add new sets post-launch | Field mapping YAML format and ingestion pipeline must be designed to be extensible. New set = new mapping entry + new CSV run + validation + regenerate catalog seed file. |
| External API for card/set data | The ingestion module must be loosely coupled. The repository layer abstracts data source so a future API adapter can replace CSV processing without touching services or routes. |
| Cloud hosting (AWS / GCP / Azure) | Docker Compose setup must use environment variables for all configuration (DB credentials, ports). No hardcoded local paths. |
| CI/CD pipeline to production | GitHub Actions structure established in V1. Production deployment job added as a future workflow step. |
| Figma / MCP UI design workflow | No V1 impact. Design tooling is external to the codebase. |
| Serialized card variants | Serialized cards (individually-numbered collector cards) are excluded from V1. When in scope, add is_serialized BOOLEAN flag — no other schema changes needed due to the flags model design. |
| Mobile-optimized UI | React component structure should avoid fixed-width layouts. Use responsive CSS from the start. |

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
