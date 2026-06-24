# BL-33 Step 1 — Test Disposition Log

**Created:** 2026-06-21
**Scope:** The catalog schema redesign migration (`0022_catalog_schema_redesign.py`) and the full backend-layer port it required (models, repositories, services, schemas, routers, ingestion scripts). Per `SWU_Catalog_Redesign_Spec.md` §8.1 and `CLAUDE.md`'s Testing rule — every legacy test broken by the migration gets a deliberate disposition recorded here, never an unreasoned delete-to-go-green.

**Result:** 87/87 backend tests passing post-port (9 new + 78 ported/retained from the prior 209; the gap is the retired tests below, not lost coverage — see reasons).

---

## Port — behavior preserved, re-expressed against the new schema

| File | What changed |
|------|--------------|
| `test_cards_api.py` | `cards`/`is_foil` flags → `card_variants`/`base_cards` join; `variant=foil` query param → `variant_type=Foil` exact match (see Replace below for why). Endpoint shape (200/404, set_code/type/rarity filters) ported 1:1. |
| `test_inventory_api.py` | `card_id` → `variant_id` throughout (path param, response field). Singleton/playset cap logic, `_find_solo_zero_card`/`_find_zero_singleton` helpers ported unchanged — they read API JSON, not the DB directly. |
| `test_sets_api.py` | `has_unique_variant_numbers` field → `is_base_set` (see Replace — the underlying concept changed, not just the name). |
| `test_sets_service.py` | Same field rename in the `SimpleNamespace` mock. |
| `test_inventory_concurrency.py` | `cards`/`card_id` raw SQL → `card_variants`/`variant_id`. Atomic `ON CONFLICT` upsert mechanism and the concurrency proof itself are unchanged. |
| `test_row_level_security.py` | No code changes needed — the RLS policy (migration 0018) only ever referenced `tenant_id`, never `card_id`. Started failing only because the catalog was empty post-migration (no bulk seed); fixed by `conftest.py`'s new `seed_minimal_catalog` fixture providing tenant #1 inventory rows. |
| `test_tenant_context.py` | Same — no code changes, just needed seeded data via the new fixture. |
| `test_tenant_isolation.py` | `cards`/`card_id` raw SQL → `card_variants` JOIN `base_cards`/`variant_id`. RLS isolation proof itself unchanged. |

## Replace — behavior changed, new test/assertion supersedes the old one

| Old | New | Why |
|-----|-----|-----|
| `repositories/cards.py`'s `_apply_variant_filter` — closed 6-value switch (`foil`/`hyperspace`/`prestige`/`showcase`/`organized_play`/`standard`) over boolean flags | Exact-match filter on `CardVariant.variant_type` (open vocabulary) | The boolean-flag model is retired; the open `variant_type` vocabulary (BL-27, ~58 values) has no fixed enum to switch over. `test_variant_filter_foil`/`test_variant_filter_standard` → `test_variant_type_filter_foil`/`test_variant_type_filter_standard`. |
| `IncrementResponse`/`DecrementResponse`'s `card_id` field | `variant_id` | API contract rename matching `inventory.variant_id`'s retarget — not just an internal rename, callers see the new field name. |
| `sets.has_unique_variant_numbers` | `sets.is_base_set` | Different concept, not a rename: the old flag supported per-set old-style card-number-collision handling (now superseded by `variant_of_uuid` resolution — see mapping spec §5D); the new flag is curated and marks base vs. long-tail-container sets for the picker UX (redesign spec §4.1, §5.1). |

## Retire — behavior eliminated by the redesign, with reason

| File / area | Reason |
|---|---|
| `test_card_catalog.py` (base_card_number integrity, name/diacritic integrity, showcase-always-foil constraint, exact per-set record counts, F3/F4 regression cases — Chirrut Îmwe, Bardottan Ornithopter, Rio Durant, Razor Crest, SHD OP-Hyperspace) | All of this validated **CSV-pipeline-specific data-quality bugs** (diacritics, manufacturer card-number collisions, OP collisions) and exact bulk-seed counts from the now-deleted F3/F4 CSV ingestion. Base-card resolution is now done via swuapi's own `variant_of_uuid` graph (`test_variant_graph_invariant.py`), not name-matching heuristics, so these specific bug classes don't apply to how the catalog will be built going forward. **The bug knowledge survives**: original migration comments (0004, 0007, 0008, 0010, 0011) document each fix; the mapping spec's BL-28 findings log documents the analogous swuapi-side casing bug (R2-D2 "Full of Solutions"/"Full Of Solutions"). Equivalent regression coverage against *swuapi-sourced* data quality issues is BL-29's job once ingestion is built. |
| `test_card_domain_rules.py` (showcase-leader-only, `has_unique_variant_numbers`-based resolver tests, base_card_number integrity) | Built entirely on the retired boolean-flag model and the retired `has_unique_variant_numbers`/OP-card-number-collision concept — both named explicitly in `CLAUDE.md`'s own worked example of what BL-33 retires ("the `is_organized_play` flag + OP card-number-collision tests, the boolean variant-flag tests, `has_unique_variant_numbers` resolver tests"). |
| `test_ingestion.py`, `test_excel_ingestion.py` | The F3/F4 CSV/Excel ingestion pipeline they tested was deleted outright (`csv_ingestor.py`, `excel_ingestor.py`, `run_ingestion.py`, `run_inventory_ingestion.py`, `normalize.py`, `backfill_card_details.py`) — superseded wholesale by BL-29's swuapi-sourced ingestion. BL-29 is explicitly **not** built in this session (blocked on BL-27's vocabulary census, which itself is blocked on an Opus decision per this session's brief) — there is nothing yet to port these tests *to*. |
| `test_seed_integrity.py`, `test_seed_reconstruction.py` | `catalog_seed.sql` (a dump of the old flat `cards` table) and `generate_seed.py` were deleted — the seed *content* is retired with the CSV pipeline. The generic loader (`apply_seed.py`) is kept untouched and will apply whatever seed BL-29 eventually produces; equivalent integrity/reconstruction tests are BL-29's job once that seed exists. |
| `test_inventory_snapshot_integrity.py`, `test_inventory_snapshot_reconstruction.py` | **Not a permanent retirement.** The actual snapshot data is preserved — moved to `db/snapshots/archive/inventory_snapshot_pre_redesign_2026-06-21.sql`, not deleted — specifically so BL-33 step 4 can regenerate it against the new `card_variants.id` values (matched by `set_code` + `card_number`, per the redesign spec §8.5 and step 4). `apply_inventory_snapshot.py` is also kept untouched. These two tests assert against the *old* `card_id`-keyed shape and the *active* `/db/snapshots/inventory_snapshot.sql` load path, both of which no longer apply — retired here with the explicit, recorded expectation that step 4 reintroduces an equivalent (and per §8.5, mandatory) snapshot-reload test against the regenerated file. |

## Schema-level retirements (not test files, but worth recording here)

- **`sets.has_unique_variant_numbers`** dropped — superseded by `variant_of_uuid`-based resolution (mapping spec §5D: "matching never relies on `card_number` as a key").
- **`card_details.sub_text`** dropped, no replacement — BL-10's unpopulated data gap (no source was ever found in the TCGPlayer CSVs); no test ever asserted on its content, only nullability, so this is a clean drop with zero coverage loss.
- **`db/seeds/catalog_seed.sql`** deleted outright (re-derivable from swuapi via BL-29, unlike inventory).
- **`db/snapshots/inventory_snapshot.sql`** archived, not deleted (irreplaceable user data; BL-33 step 4's regeneration input).

## Out of scope for this disposition log

**Frontend** is untouched this session (backend-schema-first, per the brief). It type-checks cleanly (no compile-time coupling to backend response shape) but will fail at runtime against the new field names (`variant_type`/`source_set_code` replacing the 8 boolean flags, `variant_id` replacing `card_id`). Frontend porting is implicitly BL-25/BL-27/S6 territory once the variant vocabulary and UX decisions exist — not re-litigated here.
