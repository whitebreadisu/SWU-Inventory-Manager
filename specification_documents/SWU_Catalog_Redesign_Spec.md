# SWU Catalog Redesign — Target Design Specification

**Created:** 2026-06-20
**Status:** Living target-design reference for the swuapi-first catalog/inventory rebuild. Authoritative for *what the redesigned system should be*; the work to get there is sequenced in `SWU_Backlog.md` BL-33.
**Origin:** Produced in the Opus design session called for by `SWU_Backlog.md` **Open Question E** ("swuapi-first counterfactual"). It captures the decisions made there so a later implementation session has a concrete spec to execute against rather than a conversation to re-derive.

**Related:**
- [`SWU_Standard_Variant_Mapping_Spec.md`](SWU_Standard_Variant_Mapping_Spec.md) — the data mechanism (`variant_of_uuid`) this design rests on.
- [`swuapi_standard_variant_exceptions.md`](swuapi_standard_variant_exceptions.md) — current standard-anchor exceptions.
- [`SWU_Backlog.md`](SWU_Backlog.md) — BL-33 (execution/sequencing), BL-24/27/29/31/32/35/36/37 (discrete work), Open Questions D/E.
- [`SWU_ClaudeCode_Spec.md`](SWU_ClaudeCode_Spec.md) — the as-built app spec; its §4/§6/§7/§9 are updated *at implementation time*, not here.

---

## 1. Why this document exists

BL-28's analysis found swuapi.com substantially richer than the original TCGPlayer CSV pipeline assumed. Open Question E asked whether designing *swuapi-first* — from the data source's real shape plus the application's actual goals — would land on a different system than the one retrofitted onto a CSV-shaped schema.

This session ran that question, **app-goals first**. The net finding matches Open Question E's hypothesis: the **variant-identity layer converges** on BL-33's `base_cards`/`card_variants` split, but **user-experience intent drove real refinements** that pure data analysis hadn't surfaced — chiefly the separation of *finish* from *provenance* and the *base-set anchoring* of the whole UX. This document is the consolidated target design those decisions produced.

---

## 2. Product frame (requirements that drive the design)

Decisions made this session, treated here as fixed requirements:

- **Multi-user inventory tracker** — many isolated collectors over one shared catalog. No decks, trading/sharing, or valuation (explicitly scoped out). [Open Q E]
- **Full long-tail variant tracking** — every variant swuapi exposes (~58 types), not just the original 8.
- **Base-set anchoring** — the experience is organized around the ~10 base sets; long-tail provenance is a secondary, toggleable dimension.
- **Completion is base-card-level and variant-agnostic** (playset / owned) — already built; unchanged. [§6]
- **Per-variant, per-tenant configurable keep-limits** — advisory policy, never DB constraints. [BL-24, BL-35]
- **Approximately-current catalog** — daily detection + operator-gated apply. [BL-33 step 7, BL-36, BL-37]
- **Public catalog, auth-gated inventory.** [Open Q D, BL-17]

---

## 3. Core concepts

### 3.1 Base-set anchoring

Every variant resolves to exactly one **base card** in a **base set**, via swuapi's `variant_of_uuid` (see the mapping spec). Container-set variants — Weekly Play (OP), Judge, Convention, Promo, etc. — anchor *cross-set* into a base-set root; the data already expresses this. Other inventory tools show these as disconnected separate sets only because they render swuapi's sets verbatim instead of resolving the variant graph. Eliminating that friction is the central goal of the redesign.

### 3.2 Finish vs. provenance — two orthogonal axes

The original 8-variant model conflated two independent dimensions:

- **Finish** — the visual treatment: Standard, Foil, Hyperspace, Hyperspace Foil, Prestige, Prestige Foil, … (swuapi's `variant_type`).
- **Provenance** — where/how the printing was obtained: the base set itself, vs. Weekly Play (OP), Judge, Convention, etc. (swuapi's *set*).

"OP" and "OP Foil" in the old model were never finishes — they were *(provenance = Weekly Play) × (finish = Standard/Foil)*. The redesign models the two axes separately: `card_variants.variant_type` (finish) and `card_variants.source_set_code` (provenance).

> **Caveat — must be confirmed by BL-27 before the vocabulary is frozen.** swuapi's `variant_type` is not *purely* a finish across the long tail — some values (e.g. "Prerelease Judge", "Showcase", "Prerelease Promo") read as provenance/treatment labels rather than finishes, and the precise relationship between swuapi's *set* and its *variant_type* for the long tail has not been exhaustively verified. This document models the **intent** (finish and provenance as separate, independently filterable axes); **BL-27's enumeration must resolve, against live swuapi data, exactly which `variant_type` values are finishes vs. provenance-bearing, and whether any need to be normalized into `source_set_code`.** Do not freeze the variant vocabulary or the §4.3 columns until that is done.

### 3.3 Standard anchor & exceptions

Per the mapping spec: a **root** has `variant_of_uuid: null` and is the standard-bearing printing within its set. A **standard-anchor exception** is a root whose own `variant_type` is not `"Standard"` (currently only Zam Wesell — see the exceptions file). Consequently `base_cards.standard_variant_id` must be **nullable**. Exceptions are flagged, never block catalog inclusion.

### 3.4 Tokens — duplicate-per-set

Generic token cards (Battle Droid, Clone Trooper, Experience, Shield, etc.) recur across many products. swuapi gives each set's printing its own `uuid` and independent root — structurally identical to a cross-set reprint (§3.1; mapping spec §5B). They are therefore **not merged**: one `base_cards` row per set (flagged `is_token`, §4.2), consistent with the not-merged-reprint decision and with swuapi's own structure (zero special-casing). A unified cross-set token view ("all my Battle Droids"), if ever wanted, is the same deferred application-layer grouping as the reprint "all printings" feature — a grouping *on top of* the per-set rows, no schema change. Token *treatment* (limits, visuals, aggregate exclusion) is in §6.

---

## 4. Target schema

Table-level model below. Exact column types, constraints, and indexes are settled at BL-33 implementation time; this section is authoritative for *shape and intent*.

### 4.1 `sets` — all sets, base and container

One row per swuapi set, **base and long-tail container alike**.

- `code`, `name`, `release_date`, `total_cards`, `swuapi_updated_at`
- **`is_base_set`** — *curated* boolean. `true` for the ~10 base sets (SOR, SHD, TWI, JTL, LOF, SEC, LAW, ASH, TS26, IBH); `false` for container sets (the 7 Weekly Play sets, Judge Program, Promo, Convention Exclusive, Gamegenic, Gift Box, Movie Promo).

**Rationale:** container sets need real rows so `card_variants.source_set_code` can FK to a named set for the long-tail picker; the base/long-tail toggle is then just a filter on `is_base_set`. The flag is **curated**, not derived from "set contains ≥1 root," because the derived rule misfires on edge cases like C26 (mostly a container, but holds the single Zam Wesell orphan root). **Resolves mapping spec §4.**

### 4.2 `base_cards` — roots (one per printed card design per base set)

- `set_id` → `sets` (a base set), `base_card_number`
- Shared card data: `name`, `subtitle`, `type`, `type2`, `double_sided`, `rarity`, `cost`, `power`, `hp`, `arena`, `is_unique`, `front_text`, `back_text`, `epic_action`, `artist`
- `swuapi_id` (swuapi UUID, unique-indexed)
- `standard_variant_id` (nullable FK → `card_variants` — nullable is required; see §3.3)
- `is_token` (boolean — marks generic token cards; sourced from swuapi's token designation, exact field to verify in BL-27/BL-29; drives the token treatment in §6)
- **No reprint-lineage column.** Live API check (2026-06-20) found swuapi exposes no reprint field — `reprintOf`/`reprints` appear in the docs but are **absent from live `/cards` data**, and cross-set printings (e.g. Corellian Freighter SOR vs JTL) are fully independent with zero cross-reference. The deferred cross-set "all printings" view is therefore **derived at query time via `(name, subtitle)` case-insensitive matching** (mapping spec §7), not a stored column.
- `card_aspects` / `card_traits` / `card_keywords` move here, keyed on `base_card_id` — collapses today's per-variant duplication.

### 4.3 `card_variants` — printings (replaces the old boolean flag columns)

- `base_card_id` FK (resolved via `variant_of_uuid`)
- **`variant_type`** — finish (open vocabulary; see §3.2 caveat and BL-27)
- **`source_set_code`** — provenance (FK → `sets.code`; may be a base or container set)
- `card_number`
- `front_image_url`, `back_image_url`
- `swuapi_id` (swuapi UUID, unique-indexed — the upsert key for the ongoing-sync thread)
- `stamp_group` (nullable — consolidation key for stamp-only tournament-tier variants so the popup/inline-edit UI can group look-alikes as data; BL-31/BL-32)

**The `is_organized_play` boolean is retired** — OP becomes ordinary variants with `source_set_code` = a Weekly Play set, anchored by `variant_of_uuid`. This removes the old OP card-number-collision handling.

### 4.4 `inventory`

- `variant_id` FK → `card_variants.id` (renamed from `card_id`)
- `quantity` — **never** capped at any keep-limit by a DB constraint; keep-limits are application policy (§6)
- Unique `(tenant_id, variant_id)`

### 4.5 Tenant settings & limits (cross-reference)

Keep-limits and the hard/soft enforcement mode live in a tenant-settings area:
- **BL-24** — per-tenant limit overrides keyed by *type-category × variant_type* over the open vocabulary; default-driven (per-category defaults + stored overrides only).
- **BL-35** — universal per-user hard-vs-soft enforcement mode.
- **BL-22** — settings page hosting both.

Whether limits are configured per individual `variant_type` or at the consolidated `stamp_group` level is an open question tied to BL-31/32 (see §10).

---

## 5. UX / interaction model

### 5.1 Set pickers — base/long-tail toggle

Everywhere a set is chosen (FilterPanel's Set multiselect; `AddCardsSetBar`), the picker defaults to **base sets only** (`is_base_set = true`). A header toggle button — styled like the existing dropdown header buttons (select-all/clear) — expands the list to **all sets**, including the long-tail container sets.

### 5.2 Catalog / Inventory filter semantics

- **Variants always travel with their base card.** Selecting a base set shows that set's base cards, each displaying *all* of its variants (including OP/Judge/Convention/etc.), regardless of which source set those variants came from.
- **Selecting a long-tail set is a provenance filter layered on top** — "show base cards that have a printing from that source." It is *not* a separate flat list of loose variants.

### 5.3 Card detail popup (S6)

- Variant buttons span the **full long tail** (all provenance × finish combinations that exist for the card), not just the 8. Default to the Standard variant image; leaders get a front/back flip.
- Because the long tail includes many near-identical **stamp-only tournament tiers** (e.g. Rey's 6 RQ tiers), `stamp_group` consolidation (BL-31) is **load-bearing here**, not optional polish: group look-alikes under one representative image, with per-variant inventory tracking preserved underneath. See `SWU_ClaudeCode_Spec.md` §9.2 and BL-31/BL-32.

### 5.4 Add Cards — two-axis, ambiguity-gated resolver

**Source-set selection is the primary mechanism.** The user picks a set (base set by default; toggle to a long-tail source). Card-number resolution is then scoped to that source set's own numbering — which eliminates the old card-number-collision problem and is why the `is_organized_play` special case can be retired.

Resolution proceeds on **two independent axes, each surfaced only when the input is genuinely ambiguous on that axis**:

- **Provenance** — pre-chosen when a long-tail source set is selected (no control shown). Within a base set, **provenance checkboxes appear only when** the entered `card_number` exists under more than one provenance (this generalizes today's OP flag).
- **Finish** — a finish picker appears **only when** the entered `card_number` maps to more than one finish (the SOR/SHD/TWI shared standard/foil-number case; works as it does today).

---

## 6. Completion, limits, enforcement (cross-reference)

Three decoupled axes — see `SWU_Backlog.md` for detail:

- **Completion** — base-card-level and variant-agnostic: *playset* = 3 total copies (1 for Leader/Base), *owned* = ≥1. Already built (`InventorySummary`); unchanged by the redesign.
- **Keep-limits** — per-variant, per-tenant, configurable, **advisory** (BL-24). Decoupled from completion *and* from stored `quantity`.
- **Enforcement mode** — universal per-user hard (block) vs. soft (commit-and-flag) (BL-35); default hard.

**Token cards (special class).** Tokens (`base_cards.is_token`, §4.2; identity per §3.4) behave like normal cards at the **row level** — the keep-limit applies (default 3 or the user's override) and the inline 3-pip `PlaysetCell` visual renders for them. But they are **excluded from every `InventorySummary` aggregate** at the top of the screen — both completion percentages (Playset complete %, Set complete %) *and* the raw counts (`N cards`, `N unique`) — so a token pile never distorts the collection-completion picture.

---

## 7. Access & currency (cross-reference)

- **Access** — public Catalog + card detail popup; auth-gated, tenant-scoped inventory. Anonymous Inventory tab shows a value-prop empty state. (Open Q D resolved; BL-17.)
- **Currency** — Cloud Scheduler → Cloud Run, daily detection, operator-gated apply (later full auto-apply, BL-37); public catalog shows pre-release/preview content with the gate as the quality check. New-set onboarding in BL-36. **Deletions:** the sync consumes swuapi `/deletions` tombstones (not just upserts) via the documented `since` + `after`/`next_cursor` cursor contract; deletions are surfaced in the operator gating review before apply, with explicit attention to deleting a card that already has inventory rows (rare, must not silently orphan a tenant's inventory). swuapi "card merges never emit," so no card-merge handling is needed. (BL-33 step 7; BL-36.)

---

## 8. Test Strategy

BL-33 is a clean **drop-and-recreate** of the catalog tables, so every test touching the old shape (`cards.is_foil`, `inventory.card_id`, `is_organized_play`, the OP-flag resolver, `groupWithInventory`'s variant keys, the cap rules) breaks at once. The risk is **silent coverage erosion** — broken legacy tests deleted or skipped to reach green while coverage % stays above the CI threshold. This section is the contract the implementation executes against and a reviewer checks against; it is *not* optional polish for a rewrite of this size.

### 8.1 Coverage disposition mandate

The BL-33 drop-and-recreate breaks every test touching the old shape at once. **Each broken legacy test gets a deliberate disposition — never an unreasoned delete-to-go-green:**

- **Port** — the behavior still exists; re-express the test against the new schema. *Survives conceptually and must retain coverage:* completion math (playset / owned, base-card-level, token exclusion from aggregates), limit enforcement (per-variant, default + override, hard vs. soft), increment/decrement caps and signals, every API endpoint (happy + error path, per `SWU_ClaudeCode_Spec.md` §8.3), snapshot integrity & reconstruction, RLS / tenant isolation.
- **Replace** — the behavior survives but is expressed differently; write a new test for the new behavior, superseding the old assertion. *E.g.* the Add Cards resolver (old OP-flag/finish logic → new two-axis provenance + finish), `groupWithInventory`'s variant-key derivation.
- **Retire** — the behavior is designed away; delete the test **with a recorded reason** tying it to the redesign decision that eliminated it. *E.g.* the `is_organized_play` flag + OP card-number-collision tests, the boolean variant-flag tests, `has_unique_variant_numbers` resolver tests, the F3 CSV-ingestion tests if BL-29 removes that pipeline.

The only forbidden path is the fourth: deleting or `skip`ping a red test because porting is effort, with no reasoning. **Retiring an obsolete test is correct; abandoning a still-valid one to reach green is the coverage erosion this guards against.**

**Tests encode hard-won bug knowledge — carry the intent, not just the shape.** Where a legacy test guards a specific past bug (the F4 ingestion fixes, diacritic migrations 0007/0009, the RLS `WITH CHECK` bug, OP card-number collisions), record which — so a *port* preserves it and a *retire* is a conscious "this bug class no longer exists," not an accidental loss.

**Deliverable — the disposition log.** The rewrite produces a log mapping each legacy test area to its disposition (port / replace / retire) + reason. This is the auditable record that coverage was *preserved or deliberately reduced*, never silently eroded — produced during BL-33, not as a deferred cleanup item. **Step 1's log:** [`BL33_Step1_Test_Disposition_Log.md`](BL33_Step1_Test_Disposition_Log.md).

### 8.2 New invariants the redesign introduces (must have tests)

- **`variant_of_uuid` graph integrity** — the large invariant test (mapping spec §8, BL-34): every card is a root or resolves to exactly one root *within its own set*; no multi-hop chains; every non-`"Standard"` root is present in the exceptions file.
- **Base-card anchoring/resolution** — cross-set container variants resolve to a base-set root; reprints are **not** merged (independent roots per set).
- **Finish vs. provenance separation** — `variant_type` vs. `source_set_code` modeled and queried independently.
- **Base/long-tail set picker logic** — `is_base_set` default + toggle; a long-tail selection filters by provenance layered on the base-card view (not a flat variant list).
- **Two-axis Add Cards resolver** — provenance pre-set by source-set selection; provenance checkboxes appear *only* when the number is ambiguous on provenance; finish picker appears *only* when ambiguous on finish.
- **Token treatment** — limits apply, the inline 3-pip visual renders, and tokens are excluded from *all* `InventorySummary` aggregates.
- **Standard-anchor exception** — a Zam-type root (non-`"Standard"` `variant_type`) is flagged, not blocked.
- **Ingestion** — upsert-by-`swuapi_id` idempotency (re-running yields the same result); new/changed detection for the sync thread.

### 8.3 Levels & fixtures

- **Unit** — pure functions (resolver, completion/limit services), DB-free.
- **Integration** — DB + migrations + RLS.
- **Fixture-based for swuapi** — a captured `/export/all` snapshot plus the named examples (mapping spec §5/§9). **No live `api.swuapi.com` calls in CI**; live queries are for manual re-verification only (mapping spec §8).
- **CI gates** — keep (or raise) the existing backend/frontend coverage thresholds; the variant-graph invariant test runs in CI.

### 8.4 Test-first where it pays

Write the variant-graph invariant and the resolver tests against captured fixtures **before/with** the migration (BL-34 is explicitly writable test-first). Red-green the invariants rather than retrofitting tests after the schema lands.

### 8.5 Cutover safety

Inventory is wiped and regenerated from the F5 snapshot against new `card_variants.id` values (matched by `set_code` + `card_number`). An explicit **snapshot-reload test must prove the regenerated snapshot restores correctly** to the new variant rows — extending `test_inventory_snapshot_reconstruction.py`. This is the safety net for Jeremy's "comfortable losing inventory as long as it reloads" tolerance (BL-33).

---

## 9. Relationship to backlog (which items execute which parts)

| Item | Role in this design |
|------|---------------------|
| **BL-33** | Master execution + sequencing: schema migration (§4), ingestion ordering, snapshot regeneration, cutover. Points here for the design. |
| **BL-27** | Enumerate the full `variant_type` vocabulary and resolve the finish-vs-provenance mapping (§3.2 caveat) — **must precede freezing §4.3.** |
| **BL-29** | Ingestion from swuapi, upsert-keyed on `swuapi_id`. |
| **BL-24 / BL-25 / BL-35 / BL-22** | Keep-limits, settings UI, hard/soft mode, settings page (§4.5, §6). |
| **BL-31 / BL-32** | `stamp_group` consolidation — popup (§5.3) and inline editing. |
| **BL-36 / BL-37** | New-set onboarding considerations; gated → full auto-apply (§7). |
| **BL-34** | Mapping-spec test suite (validates §3 mechanism). |
| **BL-30** | Bulk-add precon products (independent; blocked on a decklist source). |

---

## 10. Open / not yet decided

- **Finish-vs-provenance vocabulary mapping** — exactly which `variant_type` values are finishes vs. provenance-bearing, and how provenance is encoded. **Live findings 2026-06-20:** provenance is *inconsistently* encoded — some variants live in a container set (Luke's Hyperspace → SORP, Showcase → P25) while the *same conceptual* variants are in-set for other cards (most SOR leaders have in-set SOR Hyperspace/Showcase at SOR_269+); and Judge/Promo exist *both* as in-set `variant_type`s ("Prerelease Judge/Promo" in SOR) *and* as separate sets (J24/25, P25/26). Weekly Play containers (SORP…LAWP) exist for **every** main set, not just early ones — so this is **not** an early-set-only artifact. **Implication:** provenance cannot be inferred from `variant_type` or `set_code` alone; both must be stored (as designed — the model is robust to the mess). BL-27 must derive the vocabulary + grouping rules from a **programmatic census of `/export/all`** — summarized API peeks are not precise enough. **Blocks freezing §4.3.**
- **Aspect multiplicity — swuapi flattens it (confirmed 2026-06-20).** Some cards have two pips of the *same* aspect (physical examples: SEC_054 Exiled from the Force, SEC_107 Chancellor Valorum, SOR_153 Saw Gerrera, SHD_108 Enforced Loyalty, LOF_105 Oppo Rancisis — all double-pip in hand). The live API returns a **single-element `aspects` array for every one of them** and exposes **no `aspectDuplicates` field** (despite the docs listing it). So swuapi itself does not carry the second pip — **no schema sourced from swuapi can represent double-pip multiplicity.** *(High confidence; WebFetch summarizes, so the definitive raw-JSON confirmation belongs in BL-27's `/export/all` census.)* **Impact is low for our scope:** double-pip drives deckbuilding / aspect-penalty math, which is scoped out — for inventory tracking + catalog/popup display the only effect is visual fidelity (one vs. two same-aspect icons). **Decision (2026-06-20): accept swuapi's fidelity for now** (a double-pip card renders one icon); tracked for later revisit in `SWU_Backlog.md` BL-38.
- **Token source field** — how swuapi marks a card as a token (to populate `is_token`, §4.2) — verify against live data in BL-27/BL-29. *(The shared-vs-duplicate identity question is **resolved** — duplicate-per-set, §3.4 — and is no longer open.)*
- **Additional swuapi fields** beyond those in §4 (e.g. `rules`/`additionalRulings`) — deferred, no current consumer; revisit if a consumer appears.
- **Limit configuration granularity** — per `variant_type` vs. per `stamp_group` family (§4.5; tied to BL-31/32).
- **Exact column types / constraints / indexes** — settled at BL-33 implementation.
