# SWU Catalog Redesign — Target Design Specification

**Created:** 2026-06-20
**Status:** Living target-design reference for the swuapi-first catalog/inventory rebuild. Authoritative for *what the redesigned system should be*; the work to get there is sequenced in `SWU_Backlog.md` BL-33.
**Implementation status (2026-06-21):** Schema + ingestion (BL-33 steps 1–3, BL-27, BL-29) and the **frontend rewire + full UI redesign — §5 catalog/filters, popups (§5.3 / S6 / BL-31), inventory, two-axis Add Cards (§5.4) — are built and DEPLOYED TO PROD** (commits `e1832c0`..`8d33e86`, CI run 27910607802). Remaining: BL-33 step 4 (inventory snapshot regen). Open follow-ups surfaced post-ship: BL-44 (catalog perf at scale), BL-45 (popover polish), BL-46 (Add Cards UX rethink); still-deferred BL-32 / BL-39 / BL-40.
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

> **Resolved by BL-27 (2026-06-21) — see §10.** The vocabulary is now frozen. `variant_type` is stored **raw** (swuapi's verbatim label), with a **curated classification** mapping each value to `finish` / `channel` / `stamped` / `stamp_family`. The 8 finishes are frozen (§10.3); provenance (`channel`) is **derived from `variant_type` + `source_set_code`** because the encoding is inconsistent (§10.4); nothing is normalized into `source_set_code`.

### 3.3 Standard anchor & exceptions

Per the mapping spec: a **root** has `variant_of_uuid: null` and is the standard-bearing printing within its set. A **standard-anchor exception** is a root whose own `variant_type` is not `"Standard"`. The full census found **15** such roots, but BL-27 determined **14 are swuapi null-errors** that resolve to a base-set Standard via a case-insensitive `(name, subtitle)` fallback (tokens exempt) — leaving **Zam Wesell as the sole genuine exception** (§10.6). `base_cards.standard_variant_id` must be **nullable** regardless. Exceptions are flagged, never block catalog inclusion.

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
- **`variant_type`** — swuapi's **raw** label, stored verbatim (58 values). A curated classification (§10.2) derives `finish` (8 frozen values, §10.3), `channel` (provenance, §10.4), and stamp metadata. Not normalized into `source_set_code`.
- **`source_set_code`** — provenance (FK → `sets.code`; may be a base or container set)
- `card_number`
- `front_image_url`, `back_image_url`
- `swuapi_id` (swuapi UUID, unique-indexed — the upsert key for the ongoing-sync thread)
- `stamp_group` (nullable — consolidation key for same-art/same-finish stamp variants: `(base_card, finish)` with a stamped member, §10.5. Confirmed families: Prestige Foil (Foil Prestige + Serialized Prestige) and the PQ/SQ/RQ/GC/SS tournament tiers. Judge/Prerelease deferred to BL-39; a broader group-by-art model is BL-40.)

**The `is_organized_play` boolean is retired** — OP becomes ordinary variants with `source_set_code` = a Weekly Play set, anchored by `variant_of_uuid`. This removes the old OP card-number-collision handling. **Keying:** `card_variants` is uniquely keyed on `swuapi_id` (uuid); `(base_card_id, variant_type)` is **not** unique — Serialized Prestige collides (§10.8).

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
| **BL-27** | ✅ Resolved 2026-06-21 — census + classification (§10): vocabulary frozen, finish/channel/stamp rules, exception resolution, `is_token`, keying. |
| **BL-29** | Ingestion from swuapi, upsert-keyed on `swuapi_id`. |
| **BL-24 / BL-25 / BL-35 / BL-22** | Keep-limits, settings UI, hard/soft mode, settings page (§4.5, §6). |
| **BL-31 / BL-32** | `stamp_group` consolidation — popup (§5.3) and inline editing. |
| **BL-36 / BL-37** | New-set onboarding considerations; gated → full auto-apply (§7). |
| **BL-34** | Mapping-spec test suite (validates §3 mechanism). |
| **BL-30** | Bulk-add precon products (independent; blocked on a decklist source). |

---

## 10. Variant Census & Classification (BL-27 — resolved 2026-06-21)

Resolved in an Opus session against the captured full export (`backend/app/tests/fixtures/swuapi_export_2026-06-21.json` — 8,353 cards, 27 sets), analyzed **programmatically** (not via WebFetch). This freezes the `variant_type` vocabulary and the §3.2 / §4.3 classification.

### 10.1 The graph (base_cards count + resolution)

**2,319 roots** (= `base_cards`). `variant_of_uuid` chains resolve in **≤2 hops** (5,891 one-hop, 143 two-hop), **0 cycles, 0 dangling**. Resolution must **walk to the ultimate root** (the mapping-spec 2026-06-21 correction); the invariant test asserts termination within a small bounded hop count.

### 10.2 Variant model — raw + curated classification

- `card_variants.variant_type` stores swuapi's **raw label verbatim** (58 values) — faithful, human-readable, clean uuid upsert. Not normalized into `source_set_code`.
- A **curated classification** maps each `variant_type` → `finish`, `channel` (provenance), `stamped` (bool), `stamp_family`. This is the interpretation layer the app uses for grouping, limits, and consolidation; maintained centrally, grows as new variant_types appear.

### 10.3 Finish vocabulary (8, frozen)

Standard · Standard Foil · Hyperspace · Hyperspace Foil · Standard Prestige · Foil Prestige · Serialized Prestige · Showcase. (Overwhelmingly base-set; the remaining 50 variant_types are channel or tournament-tier labels.)

### 10.4 Channel (provenance) — derived from `variant_type` + `source_set_code`

Provenance is **inconsistently encoded** (confirmed): early Weekly Play sits in the base set as `variant_type` "Weekly Play" while `SORP/SHDP/TWIP` hold only 10 Hyperspace promos each; later Weekly Play sits in dedicated `*P` containers. So `channel` is derived from **both** signals:

- `*P` set OR `variant_type` "Weekly Play"/"Weekly Play Foil" → **Weekly Play**
- J24/J25 or "Judge Program"/"* Judge" → **Judge**
- C24/C25/C26 or "Convention Exclusive" → **Convention**
- P25/P26 → **Promo / Tournament-tier**
- MV26 or "Movie Promo" → **Movie**; "Prerelease *" → **Prerelease**
- else (a finish variant in a base set) → **Retail**

### 10.5 `stamp_group` — finish + stamp

A `stamp_group` consolidates variants sharing the **same base art AND the same finish**, differing **only by a stamp**, including the ≤1 same-finish *unstamped* variant. Mechanized: `stamp_group = (base_card, finish)` for any (base_card, finish) with a stamped member.

- **Prestige Foil family (confirmed):** finish "Prestige Foil" → { **Foil Prestige** (unstamped anchor) + **Serialized Prestige** (stamped; Carbonite/Gold/Rose Gold tiers, distinguished by image-filename suffix `_Gold` / `_Rose_Gold` / plain — filenames decode `Carb_A`=Standard Prestige, `Carb_B`=Foil Prestige, `Carb_C`=Serialized) }. **Standard Prestige is separate** (non-foil — a finish difference, like Standard vs Foil).
- **Tournament-tier family (confirmed):** each card's PQ/SQ/RQ/GC/SS tier set is one promo finish, all stamped, no unstamped anchor → one group. Presentation-only consolidation; per-`uuid` images and inventory are preserved, and selecting a tier shows its real image — so pixel-identity is *trusted* from BL-28's sampled inspection, not re-verified per card.
- **Judge / Prerelease Judge / Prerelease Promo:** a varied lot (some stamped, some not) — **deferred to BL-39** (visual set-by-set analysis); **default ungrouped** for now.
- **Group-by-art alternative:** the whole finish+stamp model is a deliberate *starting point*; a broader "group by base art regardless of finish" model (Standard+Foil, Hyperspace+HS Foil, all prestiges, …) is **deferred to BL-40**.

### 10.6 Exceptions — structural 15 → fallback → Zam

- **15 roots** have a non-`"Standard"` `variant_type` (the structural definition). The earlier "1 (Zam)" was the old name-match result.
- **14 are swuapi null-errors** (the `variant_of_uuid` should not have been null): each resolves to a unique base-set Standard via case-insensitive `(name, subtitle)` fallback — confirmed in the census (e.g. C25 BB-8 → JTL_145, J25 Luke → JTL_94, Grogu → ASH_18). Ingestion applies this fallback to re-anchor them.
- **Tokens are exempt** from the fallback: `GG_5 Experience` matched **7** base-set Standards (duplicate-per-set tokens) — it stays its own `base_card` per §3.4, not force-matched. **If the fallback ever returns 0 or >1 non-token matches for a future card, stop and decide manually** (don't guess).
- **Zam Wesell (C26_3)** is the sole genuine no-anchor exception (0 matches). The exceptions file regenerates to just Zam.

### 10.7 `is_token`

Derived from the `type` field containing **"Token"** — `Token Unit` (21), `Token Upgrade` (28), `Credit Token` (2), `Force Token` (2). Drives §6 token treatment and the §10.6 fallback exemption.

### 10.8 Keying & data-quality

- `card_variants` is uniquely keyed on **`swuapi_id` (uuid)** — `(base_card_id, variant_type)` is **not** unique. Serialized Prestige collides: 23 `(set, number)` groups have multiple rows; SEC senators carry 3 same-`variant_type` rows distinguished only by image-filename suffix.
- **Identical-image collisions** (e.g. LAW_865/866 Serialized Prestige ×2 with the same image hash) are flagged as **suspected swuapi duplicates** to surface at ingestion — not silently kept or merged.

### 10.9 Aspect multiplicity — confirmed flattened

**0 of 8,353 cards** carry a duplicated aspect; `aspectDuplicates` does not exist in live data. swuapi flattening confirmed on raw JSON (the 5 physical double-pip examples all return single-element `aspects`). Accepted; tracked in **BL-38**.

### 10.10 Remaining open

- **Judge / Prerelease stamp classification** — visual set-by-set analysis → **BL-39**.
- **Group-by-art grouping revisit** — finish+stamp vs. broader art-based grouping → **BL-40** (BL-39's visual pass is an input).
- **Limit configuration granularity** — per `variant_type` vs. per `stamp_group`/finish family (§4.5; tied to BL-31/32 and BL-40).
- **Additional swuapi fields** beyond §4 (e.g. `rules`/`additionalRulings`) — deferred, no current consumer.
- **Exact column types / constraints / indexes** — settled at BL-33 implementation.
