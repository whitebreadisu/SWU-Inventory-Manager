# SWU Inventory Manager — Backlog

**Created:** 2026-06-14
**Purpose:** Tech-debt, refactoring, and documentation work identified at the close of the P1-P7 platform track, before S5/Decks feature work resumes. This is the durable record of *why* each item exists — narrative context lives here, not in an issue tracker (see "Open Questions" item C).

## How to use this document

- Items are grouped into **tiers** reflecting sequencing/priority, not raw urgency — Tier 1 is foundational for everything after it.
- Each item has a short ID (`BL-1`...`BL-17`) for stable cross-referencing (commit messages, future issues, etc.).
- When an item is picked up, do the work via a normal PR/commit, then mark the item `✅ Resolved YYYY-MM-DD — <commit/PR>` in place. Don't delete resolved items — this mirrors how `SWU_Platform_Roadmap.md` handles "Open Decisions."
- The **Open Questions / Deferred Decisions** section at the bottom captures things explicitly *not yet decided* — conversations to pick back up, not work items.

---

## Status Tables

### Outstanding

| ID    | Name                                                         | Tier                      | Description                                                                                                                  |
| ----- | ------------------------------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| BL-13 | Manual review of `SWU_Platform_Spec.md` and `SWU_Backlog.md` | 2 — Guided Review         | Jeremy reads and verifies both new reference docs while context is fresh                                                     |
| BL-14 | Understanding commits, pushes, and PRs                       | 2 — Guided Review         | Guided conversation on this repo's git/CI workflow model and solo-dev practices                                              |
| BL-15 | Observability walkthrough                                    | 2 — Guided Review         | Hands-on tour of swu-prod dashboards, logs, and alert policies built in P6                                                   |
| BL-16 | Authentication hardening — email verification on signup      | 4 — Operational Hardening | Decide whether email verification should gate any part of the signup flow                                                    |
| BL-17 | Public catalog view, auth-gated inventory                    | 4 — Operational Hardening | Investigate allowing logged-out catalog browsing while keeping inventory auth-gated                                          |
| BL-10 | `card_keywords` / `sub_text` / `is_unique` data gaps         | 5 — Opportunistic         | Three unpopulated columns with no known source; revisit if S5 swuapi.com integration surfaces data                           |
| BL-11 | Local cleanup — source files                                 | 5 — Opportunistic         | Delete stale source CSVs and old Excel tracker from local disk whenever convenient                                           |
| BL-19 | Add new card sets to catalog                                 | 6 — Feature Enhancements  | Dedicated upsert script for adding new SWU sets; new sets may have new attributes requiring manual inspection before running |
| BL-20 | Import/export inventory                                      | 6 — Feature Enhancements  | User-facing CSV or JSON import/export for inventory; serves as user-managed backup until DR is live                          |
| BL-21 | Disaster recovery — automated DB backup                      | 6 — Feature Enhancements  | Automated Cloud SQL backup and restore on behalf of users, removing the burden of manual exports for recovery                |
| BL-22 | User settings page scaffolding                                | 6 — Feature Enhancements  | New account-menu entry and empty Settings route/container; infra for BL-23 and BL-25                                       |
| BL-23 | Change password from settings                                 | 6 — Feature Enhancements  | Firebase client-side reauth + password update, surfaced in the Settings page                                                |
| BL-24 | Per-tenant, per-variant inventory limit overrides (data model) | 6 — Feature Enhancements  | Configurable limits keyed by type-category × variant_type (open vocabulary per BL-33/BL-27), replacing the hardcoded shared-pool playset cap with independent per-variant caps; default-driven (per-category defaults + stored overrides) |
| BL-25 | Settings UI for inventory limit overrides                     | 6 — Feature Enhancements  | Grid UI to edit BL-24's limit matrix; updates frontend constants to use tenant-specific values                              |
| BL-26 | Claude.ai design-system sync workflow — inspection needed      | 6 — Feature Enhancements  | The conversion layer (`components/*.jsx`, `screens/*/*.jsx`) that actually renders in claude.ai isn't covered by `source/src/` syncs; needs a dedicated session |
| BL-27 | Additional card variant types (Judge, Showcase, Prerelease Promo, etc.) | 6 — Feature Enhancements  | Use swuapi.com to identify the full set of variant types beyond our existing 8; analyze and implement all touchpoints across the app |
| BL-29 | Replace CSV-based catalog seed with swuapi.com | 6 — Feature Enhancements  | Build catalog creation (new environments / full rebuilds) directly from swuapi.com instead of the F3/F4 TCGPlayer CSV pipeline |
| BL-30 | Bulk-add a pre-built product to inventory (IBH / Twin Suns / Starter Decks) | 6 — Feature Enhancements  | Add every card in a precon product to inventory in one action instead of scanning each card; blocked on a decklist (card+quantity) data source swuapi doesn't provide || BL-32 | Inline inventory editing — consolidated entry for tournament-tier variants | 6 — Feature Enhancements  | The flat per-variant +/- row pattern doesn't scale to cards with 5-6 tournament-tier variants; needs its own interaction pattern |
| BL-33 | Catalog schema redesign — `base_cards`/`card_variants` split, swuapi-id-keyed sync, scoped sequencing for BL-27/29/30/31/32/S6 | 6 — Feature Enhancements  | Replaces the flat boolean-flag `cards` table with an explicit base-card/variant model anchored on swuapi's own IDs; scopes BL-29 and orders the remaining swuapi-dependent backlog |
| BL-34 | Standard variant mapping — test suite | 6 — Feature Enhancements  | Build the fixture-based test suite specified in `SWU_Standard_Variant_Mapping_Spec.md` §8, including the one large variant-graph invariant test |
| BL-35 | Hard/soft inventory keep-limit mode (user override) | 6 — Feature Enhancements  | User-level preference toggling limit enforcement between hard cap (block adds past limit — today's behavior) and soft cap (commit over-limit cards with a visual over-limit warning). Universal rule, not per-variant |
| BL-36 | New-set onboarding considerations (applying new cards/sets) | 6 — Feature Enhancements  | Enumerate everything beyond a raw upsert that applying a new set requires — set logo asset for the Add Cards modal, new variant-type vocabulary, new attributes, preview-vs-completion interaction; applies to gated and auto apply alike |
| BL-37 | Convert ongoing catalog sync to full auto-apply | 6 — Feature Enhancements  | Future: remove the operator gate from the ongoing sync once the pipeline is validated and BL-36's onboarding considerations are automatable |
| BL-38 | Aspect double-pip multiplicity — display fidelity gap | 5 — Opportunistic | swuapi flattens same-aspect double pips (no `aspectDuplicates`); accept its fidelity now, revisit if accurate pip display + a data source appear |
| BL-39 | Judge/Prerelease variant stamp classification (visual analysis) | 6 — Feature Enhancements | Judge Program / Prerelease Judge / Prerelease Promo are a mixed bag (some stamps over a finish, some distinct art); needs visual set-by-set inspection to assign finish+stamped; ungrouped by default until done |
| BL-40 | Revisit variant grouping model — finish+stamp vs. group-by-art | 6 — Feature Enhancements | Reconsider whether stamp_group should collapse by base art across finishes (Standard+Foil, Hyperspace+HS Foil, all prestiges) rather than the BL-27 finish+stamp rule; BL-39's visual pass is an input |
| BL-41 | Channel-rule quirk: base-set tournament-tier variants classify as Retail, not Promo | 6 — Feature Enhancements | §10.4's channel rule ties "Promo / Tournament-tier" to source_set_code P25/P26 only, not the PQ/RQ/SQ/GC/SS variant_type prefix itself — so the same tier label sourced from a base set (SOR/SHD/TWI) falls through to Retail instead. Found and implemented literally during BL-29; needs an analysis pass to decide if that's actually correct |
| BL-42 | Upgrade local Node to ≥20.19 (vite 8 / vitest 4 requirement) | 3 — Tooling Investment | Local Node 20.12 is below vite 8 / vitest 4 / rolldown's ≥20.19 requirement, so the frontend dev server, vitest, and build only run via a `docker node:20` workaround; the frontend container's node_modules volume is also stale at vite 5. Upgrade host Node and rebuild the image so local dev/test work natively |
| BL-43 | Cloud dev environment — robust dev→prod pipeline | 4 — Operational Hardening | Stand up a persistent deployed dev environment (likely on the existing `swu-sandbox` GCP project) between local and prod, with a branch→dev-deploy CI path, so changes are validated in a real cloud env before prod instead of going local→prod |
| BL-44 | Catalog performance at full scale | 4 — Operational Hardening | Catalog fetches all ~8,353 variant rows and renders all ~2,306 base-card rows at once (no virtualization/pagination) — render jank + heavy payload at full catalog size. Levers for later discussion: (1) virtualization/windowing (keep client-side filtering); (2) base-cards-with-nested-variants payload (~2.3k rows not 8.3k); (3) server-side pagination+filtering (heaviest, last resort) |
| BL-45 | Bulletproof popover positioning (portal-based) | 5 — Opportunistic | Catalog Variants tooltip uses absolute positioning anchored to the button's right edge (good enough for the current right-edge column). For robustness against any column position / horizontal scroll / bottom-row vertical clipping, render the popover in a React portal with fixed positioning from the button's screen rect + edge detection. Polish; not urgent |
| BL-46 | Add Cards experience — rethink with real-card exploration | 6 — Feature Enhancements | The two-axis (provenance × finish) Add Cards flow is functionally correct but the UX isn't satisfying at full catalog scale; needs hands-on exploration with real cards/examples to define the optimal add-to-inventory experience before redesigning |
| BL-48 | Learning guide rationalization | 1 — Documentation Foundation | Reconcile the stale main `SWU_Learning_Guide.md` and the accumulated per-session standalone guides into a coherent set; split out from BL-47 because the guide is personal/gitignored and a distinct effort |
| BL-50 | Token printed-number display ("T02") | 5 — Opportunistic | Tokens show swuapi's set-sequence number (Shield "2") not the printed token number ("T02"); swuapi exposes no printed token number, so decide whether it's derivable vs. an accepted gap, incl. Add Cards resolver + sort impact (graduated from frontend-fix triage #2) |
| BL-51 | Browser Back closes popups; Add Cards unsaved-changes confirm | 6 — Feature Enhancements | Back should close an open popup and return to the app (not exit to the portal) via one shared history mechanism in the currently router-less SPA; + unsaved-changes confirm on Add Cards (graduated from triage #3; relates BL-18) |
| BL-52 | Cross-set "all printings" reprint view | 6 — Feature Enhancements | Group `base_cards` roots by case-insensitive `(name, subtitle)` across sets for a card-detail "all printings" view; query-time derived (swuapi has no reprint lineage); graduated from variant mapping spec §7's deferred concept |
| BL-53 | API rate limiting on `/api/*` | 4 — Operational Hardening | No per-IP/per-tenant cap on API routes; flagged deferred in the P7 security review (OWASP A04) and platform spec §5 — low severity at current scale, real gap before broader exposure |
| BL-54 | Inventory import/export (user-facing) | 6 — Feature Enhancements | **v1.0 goal.** Let users import inventory exported from other SWU apps (CSV/JSON) so they don't re-enter collections by hand, and export from this app. **Likely decomposes** into several items once designed (formats, parse/validate, map to `card_variants`, dedupe/merge, UI, error reporting). Landing this **retires the throwaway personal inventory-seed scaffolding** (`regenerate_inventory`, `apply_inventory_snapshot`, §8.5 test, snapshot files) |
| BL-55 | Learning — dissect the branch → PR → CI → deploy workflow | 2 — Guided Review | Walkthrough (no code): when branching matters vs. when working on `main` is fine; the full loop and **who** runs each part **when**; what CI does at each stage and why a failing check blocks deploy; solo vs. second-developer; what matters for prod vs. local. Deferred ("not tonight") |

### Completed

| ID | Name | Tier | Description |
|----|------|------|-------------|
| BL-1 | Create `SWU_Platform_Spec.md` | 1 — Documentation Foundation | New as-built platform reference covering auth, CI/CD, Terraform, observability, and security |
| BL-2 | Slim `SWU_Platform_Roadmap.md` | 1 — Documentation Foundation | Trim roadmap to phase/status tracker; cross-reference new platform spec for architecture details |
| BL-3 | Retire Learning Guide docx; rename Platform Learning Guide | 1 — Documentation Foundation | Archive docx, rename platform guide to canonical `SWU_Learning_Guide.md` |
| BL-4 | Update `README.md` | 1 — Documentation Foundation | Rewrite README to reflect live production architecture, multi-tenancy, and documentation map |
| BL-5 | Add CLAUDE.md file aliases | 1 — Documentation Foundation | Add "the backlog" and "the platform spec" aliases; update "the learning guide" path |
| BL-12 | Spec-vs-implementation reconciliation | 1 — Documentation Foundation | Reconcile `SWU_ClaudeCode_Spec.md` Sections 6-9 with what S2-S4 actually built |
| BL-47 | Documentation reconnaissance & cleanup | 1 — Documentation Foundation | ✅ 2026-06-24 — per-file dispositions; file moves (`analysis/`, gitignored `working/`); froze ClaudeCode spec + renamed redesign → `SWU_Application_Spec.md`; ADRs (`docs/decisions/`); backlog consolidation; README/CLAUDE.md authority map. Spillover: BL-48, BL-49 (+ memory cleanup). Record: `analysis/BL47_Documentation_Reconciliation_Plan.md` |
| BL-49 | Absorb API/ingestion/architecture into the Application Spec | 1 — Documentation Foundation | ✅ 2026-06-24 — added Application Spec §11 (architecture & tech stack), §12 (API reference), §13 (ingestion), §14 (environment), all code-verified against `backend/`; froze ClaudeCode spec as historical-only for every domain. Surfaced a latent bug — `apply_seed.py` still queries the dropped `cards` table (flagged for review, not fixed; sits in BL-33 step 4's seed/snapshot regen) |
| BL-6 | Backend linting/formatting | 3 — Tooling Investment | Add ruff to backend; fix five genuine lint issues; wire `ruff check` + `ruff format` into CI |
| BL-7 | Frontend linting/formatting | 3 — Tooling Investment | Add ESLint + Prettier to frontend; one genuine fix; wire lint and format checks into CI |
| BL-8 | Backend Dockerfile / Cloud Run startup review | 4 — Operational Hardening | Remove `--reload`; move seed/snapshot checks in-process via FastAPI lifespan |
| BL-9 | Dependabot PR backlog triage | 4 — Operational Hardening | Merge/close all 18 open Dependabot PRs; resolve two coordinated breaking-version pairs |
| BL-18 | Frontend tab switching — keep pages mounted | 4 — Operational Hardening | Replace `&&` conditional rendering in `App.tsx` so tab switches are instant after first load |
| BL-28 | swuapi.com analysis — ongoing sync and schema alignment | 6 — Feature Enhancements | Five-phase analysis of swuapi.com's live export; produced BL-29/30/31/32 and a field-by-field schema delta |
| BL-31 | Card detail popup — consolidated stamp-only variants | 6 — Feature Enhancements | Popup consolidates variants by `stamp_group` into one representative image with per-variant inventory underneath; shipped in the catalog redesign frontend rewire, deployed 2026-06-21 |

---

## Tier 1 — Documentation Foundation

These come first because they fix the "two specs at different detail levels" problem and give every later item a place to record its rationale.

### BL-1: Create `specification_documents/SWU_Platform_Spec.md`

**What:** A new peer document to `SWU_ClaudeCode_Spec.md`, scoped to platform/infrastructure — an as-built reference covering:
- **Auth & tenancy architecture** — the `Depends(get_db) → Depends(get_current_identity)` chain (`backend/app/database.py:22-89`, `backend/app/auth.py`), the `set_config('app.current_tenant_id', ...)` mechanism, and the RLS policies it enforces (migrations 0018, 0019, 0021).
- **CI/CD pipeline** — stages in `.github/workflows/ci.yml` (test → build/push → deploy → frontend-deploy).
- **Terraform module map** — projects (`swu-prod`/`swu-sandbox`), state backend, IAM roles, Cloud Run, Cloud SQL, Secret Manager, Cloud DNS.
- **Observability** — structured logging schema (P6 Stage 1), dashboards, alert policy, Error Reporting.
- **Security posture summary** — condensed cross-reference into `SWU_Platform_Security_Review.md`.

**Why:** `SWU_Platform_Roadmap.md` is a phase-tracker + decision log, not a reference doc — there's no document that does for the platform what spec Sections 4/6/7 do for the app (data model, API, UI). This gap is exactly what let an external review (ChatGPT, 2026-06-14) misread `database.py` and flag a false "auth isn't wired in" alarm — the mechanism is correct but non-obvious (a `Depends()` default value that itself carries another `Depends()`), and nothing documents it as a reference a reviewer could check against.

**Scope note:** Also migrate the "Selection & Comparison" decision write-ups currently in `SWU_Platform_Learning_Guide.md` (P4-P7 chapters) and the Roadmap's "Open Decisions" log into this new spec — see Open Question B for *how* (ADRs vs. inline sections).

**Definition of done:** New file exists, covers the five reference areas above; the auth/tenancy section explicitly walks through the `Depends` chain with file/line references so a future reviewer can verify it without tracing code.

**Status:** ✅ Resolved 2026-06-14 — `specification_documents/SWU_Platform_Spec.md` created, covering all five reference areas with inline "Design Rationale" subsections (Open Question B, resolved below).

---

### BL-2: Slim `SWU_Platform_Roadmap.md`

**What:** Once BL-1 exists, trim the roadmap back to its phase table, milestones, and status — remove/condense the "Open Decisions" resolutions that have moved to the new spec (or to ADRs, per Open Question B).

**Why:** Avoid the roadmap and the new platform spec drifting out of sync by recording the same architectural facts in two places.

**Depends on:** BL-1

**Definition of done:** Roadmap reads primarily as a status/phase tracker with cross-references into `SWU_Platform_Spec.md` for "how it actually works."

**Status:** ✅ Resolved 2026-06-15 — Section 1 now points to `SWU_Platform_Spec.md` as the "how it works now" reference; Section 5 ("Open Decisions") renamed "Decision Log (Resolved)" and condensed from 7 dense paragraphs to 7 short pointers (6 to `SWU_Platform_Spec.md` Design Rationale subsections + `BL-8`/`BL-9`/Security Review A06, 1 to `SWU_Platform_Learning_Guide.md`'s P7 chapter for the one decision not yet duplicated in the spec). Phase Table, Milestones, Foundational Decisions, and the Custom Domain/Portfolio section (no spec overlap) left unchanged.

---

### BL-3: Retire original Learning Guide docx; rename Platform Learning Guide

**What:**
- Move `learning_guide/SWU_Learning_Guide.docx` → `learning_guide/archive/SWU_Learning_Guide_v1.docx` (untouched, historical record).
- Rename `learning_guide/SWU_Platform_Learning_Guide.md` → `learning_guide/SWU_Learning_Guide.md`. Future chapters (S5, Decks, etc.) continue here using the deeper P1-P7 "Key Concepts"/"Selection & Comparison" format.
- Update CLAUDE.md's "the learning guide" alias to point to the renamed file.

**Why:** The original docx's Chapters 6-10 describe a slice structure ("Slices 3/4/5" as separate chapters) that doesn't match what was actually built (S2 Inventory / S3 FilterPanel / S4 Add Cards Modal); Chapter 10 (CI/CD) is entirely superseded by P3; and there's a "Future Chapters (Planned)" section that's now obsolete. Combined with the docx-vs-markdown and shallow-vs-deep "Key Concepts" mismatch, starting fresh in markdown avoids carrying forward inaccurate chapter outlines.

**Note:** This is personal-use material (per Jeremy) — lower priority than BL-1/2/4/5 from a documentation-rigor standpoint, but worth doing before S5 design work needs a new chapter.

**Definition of done:** docx archived, platform guide renamed, CLAUDE.md alias updated.

**Status:** ✅ Resolved 2026-06-15 — `SWU_Learning_Guide.docx` moved to `learning_guide/archive/SWU_Learning_Guide_v1.docx`; `SWU_Platform_Learning_Guide.md` renamed to `SWU_Learning_Guide.md`; CLAUDE.md alias updated; README.md Documentation Map and `SWU_Platform_Roadmap.md` Decision Log reference updated to new filename. (Both files gitignored — local filesystem moves only, no git rename commit.) BL-5's remaining piece ("the learning guide" alias) resolved as part of this item.

---

### BL-4: Update `README.md`

**What:** Bring the README up to date with the current architecture:
- Firebase Authentication required for all `/api/*` routes (link to BL-1's auth section once it exists).
- Multi-tenant model (one tenant per Firebase user, auto-provisioned).
- GCP/Terraform/Cloud Run/Cloud SQL deployment — this is a live production app, not just a local Docker Compose project.
- Production URLs (`https://swu.jeremybradenapps.com`, etc.).
- A **Documentation Map** section pointing to: `SWU_ClaudeCode_Spec.md`, `SWU_Platform_Spec.md`, `SWU_Platform_Roadmap.md`, `SWU_Platform_Security_Review.md`, `SWU_Backlog.md`, `learning_guide/`, `learning_journal/`, `claude_design/` — one line each on purpose/scope.

**Why:** README is the entry point and is currently frozen at the F1-era picture (local-only app, no auth, no cloud). A new reader — or an outside reviewer like ChatGPT — gets a misleading first impression of the system.

**Definition of done:** README accurately describes the current architecture and links to every major doc with a one-line description of its scope.

**Status:** ✅ Resolved 2026-06-15 — README rewritten: added live app URL, Architecture table (React/FastAPI/Cloud SQL/Firebase Auth/GCP+Terraform/CI-CD), multi-tenancy note with spec cross-reference, API-docs-disabled-in-prod note, updated Local Setup to 4 services (added Firebase Auth Emulator row + explanation), updated Project Structure (added `terraform/`, `specification_documents/`, `learning_guide/`, `learning_journal/`, `claude_design/`, auth.py/database.py/middleware.py callouts), updated Environment Variables table (added `APP_DB_PASSWORD`, `APP_DATABASE_URL`, `ENVIRONMENT` with prod Secret Manager note), added Documentation Map section (8 rows, one-line each).

---

### BL-5: Add CLAUDE.md file aliases for new docs

**What:** Add aliases for "the platform spec" → `SWU_Platform_Spec.md` and "the backlog" → `SWU_Backlog.md`; update "the learning guide" alias per BL-3.

**Why:** Keeps the same low-friction reference pattern already established for "the spec," "the journal," "the CSV files," etc.

**Depends on:** BL-1 (platform spec must exist), BL-3 (renamed learning guide)

**Definition of done:** CLAUDE.md updated with both new aliases and the corrected learning guide path.

**Status:** ✅ Resolved 2026-06-15 — all three aliases present in CLAUDE.md ("the backlog", "the platform spec" added at file creation; "the learning guide" updated from .docx → .md path as part of BL-3).

---

### BL-12: Spec-vs-implementation reconciliation for `SWU_ClaudeCode_Spec.md`

**What:** Review `SWU_ClaudeCode_Spec.md` Sections 6-9 against what was actually built in S2-S4, looking for places that still describe a planned design later superseded by the actual implementation. One confirmed instance: Section 6.4 documents `GET /api/cards/lookup`, and Section 7.5 describes a "Card Number Lookup & Inventory Update" interaction — but this endpoint was never implemented (confirmed via grep: zero matches in `backend/app/routers/`, only a forward-looking placement comment in `cards.py` lines 11-12: *"/lookup must be registered before /{card_id}... when added in S3"*). Section 6.4 already records an "Implementation decision (S3)" explaining why — client-side resolution against the already-loaded `GET /api/inventory` data made a dedicated lookup endpoint unnecessary — but Section 7.5's interaction narrative was never updated to reflect that S3 became `FilterPanel` and S4 became `AddCardsModal`.

**Why:** Jeremy asked, while scoping this backlog: "are there other instances of this?" `SWU_Learning_Guide.docx` Chapters 6-10 have the same kind of mismatch (BL-3). A spec that still describes superseded designs misleads a future reader (or external reviewer) — same motivation as BL-1 for the platform spec.

**Definition of done:** Sections 6.4 and 7.5 reconciled with what S3/S4 actually built — either updated in place, or explicitly marked "superseded by [component] — see [file]" with a pointer. Any other mismatches found during the pass are each either fixed in place or recorded as their own backlog item.

**Status:** ✅ Resolved 2026-06-15 — Seven fixes across Sections 6-9: (1) Section 6.4 opening callout rewritten from "this endpoint powers the core UX" to "Not implemented" with correct S4 pointer; (2) removed the stale "(S3)" implementation-decision note (decision was S4); (3) Section 7.4 intro updated from "card number lookup flow" to "Add Cards modal (Section 7.5)"; (4) Section 7.5 renamed from "Core Interaction: Card Number Lookup & Inventory Update" to "Add Cards Modal (S4)" and rewritten to describe the actual modal flow (button → modal → set bar → keypad → chip list → verification → commit) rather than a "persistent search/input field"; (5) Section 8.2 note updated `SWU_Platform_Learning_Guide.md` → `SWU_Learning_Guide.md`; (6) Section 9 table and (7) Section 9.1 header: "S6" → "S5" (pre-recount artifact).

---

### BL-47: Documentation reconnaissance & cleanup

**What:** The documentation set has grown into a web of cross-referencing files — `SWU_ClaudeCode_Spec.md`, `SWU_Application_Spec.md`, `SWU_Platform_Spec.md`, `SWU_Standard_Variant_Mapping_Spec.md`, `swuapi_standard_variant_exceptions.md`, this backlog, `SWU_Platform_Roadmap.md`, the learning guide(s), and `learning_journal/` — and it's no longer clear what is current, stale, superseded, or duplicative. Do a deliberate recon pass: inventory every doc, decide **keep / update / archive / consolidate** for each, then fix or remove stale cross-references and establish a clear "which doc is authoritative for what" map.

**Why:** Raised by Jeremy 2026-06-21 after the catalog redesign shipped. Concrete drift example: `SWU_ClaudeCode_Spec.md` still describes the pre-redesign `cards` boolean-flag schema, the old OP-flag Add Cards resolver (§7.5 / S4), and S5/S6 as future slices — all superseded by `SWU_Application_Spec.md` and the 2026-06-21 frontend rewire (only lightly patched in place so far, with pointers, pending this pass). The learning guide is also significantly out of date; for now a standalone per-session guide was created for the catalog-redesign session, to be integrated (or not) during this recon.

**Definition of done:** A documented disposition for each spec/guide/journal file (keep/update/archive/consolidate + reason); stale cross-references resolved; an authoritative-source map (data model, platform, UX, variant mechanism, backlog). Likely an Opus analysis session.

**Status:** ✅ Resolved 2026-06-24 — executed in 6 phases (scaffolding + `working`/`analysis` folders; file moves; froze `SWU_ClaudeCode_Spec.md` and renamed the redesign spec → `SWU_Application_Spec.md`; ADRs in `docs/decisions/`; backlog consolidated as the single work registry; README + CLAUDE.md authority map). Full disposition record: `analysis/BL47_Documentation_Reconciliation_Plan.md`. Spillover tracked as BL-48 (learning-guide rationalization) and BL-49 (absorb API/ingestion into the Application Spec); memory cleanup deferred to a follow-up pass.

---

### BL-48: Learning guide rationalization

**What:** Reconcile the learning-guide set. The main `SWU_Learning_Guide.md` is significantly out of date (it predates the catalog redesign and later platform work), and several per-session standalone guides have accumulated (`SWU_Learning_Guide_CatalogRedesign_Frontend_2026-06-21.md`, `SWU_Learning_Guide_Documentation_2026-06-23.md`, plus the gitignored `Frontend_Fix_Triage_Rubric.md`). Decide per guide: integrate into the main guide, keep standalone, or retire — and bring the main guide current.

**Why:** Split out from BL-47 (documentation recon) during the 2026-06-23 planning session. BL-47 scopes the *tracked, repo-facing* spec/doc set; the learning guides are **personal and gitignored** (Jeremy's teaching record and future blog/talk source material), so they're a distinct effort with a different audience and shouldn't be conflated with the portfolio-facing doc cleanup. Several per-session guides were intentionally written self-contained with a "integrate or discard during the recon" banner, deferring exactly this reconciliation.

**Definition of done:** A disposition for each learning-guide file (integrate / keep standalone / retire + reason); the main `SWU_Learning_Guide.md` brought current or explicitly restructured (e.g. as an index over standalone per-topic guides); still-open items from `Frontend_Fix_Triage_Rubric.md` graduated to backlog entries (handled in BL-47's backlog-consolidation phase) so the rubric can be retired or kept purely as working scratch.

**Status:** 🔲 Open

---

### BL-49: Absorb API/ingestion/architecture into the Application Spec

**What:** `SWU_Application_Spec.md` (renamed from the catalog redesign spec in BL-47 Phase 2) is authoritative for the catalog/variant/inventory data model and UX, but does not yet cover the API surface, ingestion pipeline, system architecture, tech stack, or environment setup — those still live only in the now-frozen `SWU_ClaudeCode_Spec.md` (§2–§3, §5–§6, §10). Port the still-true parts into the Application Spec, **verified against the current code** rather than copied from the frozen spec (the catalog redesign changed the schema, so endpoint and payload shapes have drifted from what §6 describes).

**Why:** Split out from BL-47 Phase 2. Copying potentially-stale API/ingestion detail into the new authoritative doc would bake in errors, so the structural reconciliation (rename, freeze, authority map) was done first and the content port deferred to this focused pass. Until BL-49 is done, the Application Spec points to the frozen spec for those domains — an intentional, documented gap, not an oversight.

**Definition of done:** The Application Spec contains current, code-verified API / ingestion / architecture / environment sections; `SWU_ClaudeCode_Spec.md` is referenced only as historical design context (no longer the live reference for any domain); the Application Spec's "Scope & authority" header is updated to drop the "see the frozen spec for X" pointers.

**Status:** ✅ Resolved 2026-06-24 — added Application Spec §11 (backend architecture & tech stack), §12 (API reference), §13 (ingestion pipeline), §14 (environment), each verified against `backend/app/` (routers, schemas, ingestion, `requirements.txt`, `package.json`). Scope & Authority header now claims those domains; the frozen `SWU_ClaudeCode_Spec.md` banner marks it historical-only for every domain. **Finding (flagged, not fixed):** `backend/app/ingestion/apply_seed.py` line 55 still runs `SELECT COUNT(*) FROM cards`, but migration 0022 dropped the `cards` table — a latent error on the fresh-DB seed path (never hit when the catalog is already populated). It sits within BL-33 step 4 (seed/snapshot regeneration, currently in flight), so it was recorded here rather than fixed under a docs item.

---

## Tier 2 — Guided Review & Learning Sessions

These are conversations and walkthroughs, not code changes — Jeremy reviewing material or exploring live infrastructure with Claude's guidance. No PRs expected; if something useful surfaces (a correction, a new Learning Guide entry), it's captured where it belongs (the relevant spec, or `SWU_Learning_Guide.md`).

### BL-13: Manual review of `SWU_Platform_Spec.md` and `SWU_Backlog.md`

**What:** Jeremy reads through `SWU_Platform_Spec.md` (BL-1) and this backlog at his own pace. Claude is available to clarify any section, expand on a "Design Rationale" subsection, or correct anything that doesn't match Jeremy's understanding of how the system actually works.

**Why:** Both documents were written by Claude in single sessions, condensing a large amount of source material (migrations, Terraform, the CI workflow, the security review). Jeremy hasn't read the consolidated output yet — reviewing now, while the context is fresh, catches drift between "what Claude wrote" and "what Jeremy understands" before these become the references future sessions build on.

**Definition of done:** Jeremy has read both documents; corrections or clarifying questions are addressed — either as direct edits, or folded into BL-12's reconciliation pass if they're spec-accuracy issues.

**Status:** 🔲 Open

---

### BL-14: Conversation — understanding commits, pushes, and PRs

**What:** A guided conversation where Claude explains the commit/push/PR model in general, then ties it to how *this* repo actually works: direct pushes to `main` as a solo developer, the `backend`/`frontend` CI checks that run on every push (`SWU_Platform_Spec.md` Section 2), what a Dependabot PR (BL-9) actually is, and what branch protection on `main` does and doesn't enforce here.

**Why:** Jeremy has pushed dozens of commits across P1-P7 but wants a clearer conceptual foundation for *why* the workflow is shaped the way it is — particularly the gap between a "textbook PR workflow" and a solo developer pushing to `main` with CI gates.

**Definition of done:** Session held. If it surfaces a reusable explanation (e.g., "how this repo's git/CI workflow works and why"), consider adding it to `SWU_Learning_Guide.md` as a Key Concepts entry.

**Status:** ✅ Retired 2026-06-27 — merged into BL-55. The git/commit/PR content is fully subsumed by BL-55's branch→PR→CI→deploy walkthrough; no separate session needed (2026-06-26/27 backlog reconciliation).

---

### BL-15: Observability walkthrough — dashboards and logs, guided

**What:** A hands-on session where Jeremy opens the live `swu-prod` Cloud Monitoring dashboard (`SWU_Platform_Spec.md` Section 4.2), Cloud Logging's structured JSON entries (Section 4.1), the "any 5xx for 60s" alert policy (Section 4.3), and Cloud Error Reporting (Section 4.4), with Claude explaining what each view shows, how to read it, and which code produces it. Where useful, Claude can pull the same data via `gcloud logging read` / `gcloud monitoring` from the CLI alongside the console views.

**Why:** P6 built all of this, but Jeremy hasn't had a session focused on actually *using* it — a dashboard or alert is only useful once you know how to read it. This is the natural "go use what we built" follow-up to P6.

**Definition of done:** Session held; Jeremy can navigate to and interpret the dashboard, a structured log entry, and (if one exists) an Error Reporting group.

**Status:** 🔲 Open

---

### BL-55: Learning — dissect the branch → PR → CI → deploy workflow

**What:** A guided walkthrough (no code) giving Jeremy a genuine end-to-end mental model of the git/GitHub workflow he's been using: when a branch matters (and when working directly on `main` is fine); the full loop — branch → commit → push → PR → CI → review → merge → delete branch → `pull main` — and **who** runs each part **when**; what CI actually does at each stage (lint/format → tests → build-and-push → deploy) and why a failing check blocks the deploy; how this differs in a **solo** project vs. with a **second developer**; and what genuinely matters for **prod** vs. for local/dev. Draws on concrete examples from the 2026-06-25 session (the BL-47 PR rebase, the BL-33 "red main" incident, the catalog-bootstrap branch).

**Why:** Requested by Jeremy 2026-06-25. He's been executing the loop but wants to fully understand the *why* and the *who/when* before it becomes habit — not just follow steps. Pairs with the branch-workflow coaching note.

**Definition of done:** Jeremy can articulate, in his own words, when to branch, what each CI stage does, and how the workflow changes with a second developer and for prod. No artifact required beyond (optionally) a learning-guide entry capturing it.

**Status:** 🔲 Open — Jeremy explicitly deferred ("not tonight").

---

## Tier 3 — Tooling Investment

No linting or formatting tooling exists anywhere in this repo today (confirmed via grep — no ruff/black/mypy/flake8 in backend, no ESLint/Prettier in frontend `package.json`). The codebase is currently clean (zero TODO/FIXME markers found), which makes this a good time to establish a baseline before S5/Decks add surface area.

### BL-6: Backend linting/formatting

**What:** Add a linter/formatter to `backend/requirements.txt` (dev extras) and wire it into `.github/workflows/ci.yml` as a check. Likely candidate: **ruff** (lint + format in one tool, fast, increasingly the default choice for new Python projects) — decide specifics at execution time.

**Why:** No backend lint/format tooling exists. Establishing one now, while the codebase is small and clean, is far cheaper than retrofitting after S5/Decks.

**Definition of done:** Tool configured, CI step added, existing code passes (or is reformatted in one pass with a clearly-labeled commit).

**Status:** ✅ Resolved 2026-06-15 — `backend/pyproject.toml` created with ruff 0.15.17; E/F/W/I rules enabled; E712/F821/E501 suppressed (SQLAlchemy false positives and SQL string lengths). One-pass format + auto-fix applied to all 67 files. Five genuine issues corrected: F841 (unused `has_unique` var in csv_ingestor.py), 3× F401 (unused `pytest` imports in test_excel_ingestion/test_seed_integrity/test_seed_reconstruction), E741 (ambiguous `l` → `ln`). Two CI steps added before pytest: `ruff check app` and `ruff format --check app`. Commit `0c5073e`.

---

### BL-7: Frontend linting/formatting

**What:** Add ESLint + Prettier (or an all-in-one alternative like Biome) to `frontend/package.json`, configure for React/TypeScript, wire into CI.

**Why:** Same rationale as BL-6 — no lint/format tooling exists despite a substantial component library already built (`FilterPanel`, `AddCardsModal`, etc.).

**Definition of done:** Tooling configured, CI step added, existing code passes/is reformatted.

**Status:** ✅ Resolved 2026-06-15 — ESLint v9 + Prettier installed with typescript-eslint, eslint-plugin-react, eslint-plugin-react-hooks, eslint-config-prettier. `frontend/eslint.config.js` (flat config) and `frontend/.prettierrc` created. One-pass Prettier format applied to all 44 files. One genuine lint fix: ternary side-effect in `FilterPanel.toggle` (→ `if/else`). `react-hooks/set-state-in-effect` disabled globally — all three instances are either async data-fetch patterns (false positive) or intentional derived-state resets. npm scripts added: `lint`, `format:check`, `format:write`. Two CI steps added before build/vitest: `npm run lint` and `npm run format:check`. Commit `0c5073e`.

---

### BL-42: Upgrade local Node to ≥20.19 (vite 8 / vitest 4 requirement)

**What:** The frontend pins vite `^8.0.16` and vitest `^4.1.8` (the BL-9 Dependabot bumps), which require Node ≥20.19, but the local host runs Node 20.12 — so `npm run dev`, `vitest`, and `npm run build` won't run natively and must go through a `docker run node:20` workaround (this is how the BL-33 catalog-rewire agents verified their work, 2026-06-21). Separately, the running frontend container's `node_modules` anonymous volume is stale (serving vite 5.4, not the pinned vite 8), so even the container isn't on the intended toolchain.

**Why:** Surfaced during the catalog-redesign frontend rewire (2026-06-21). Not being able to run the dev server or tests locally slows the inner loop and means CI and the build agents run a different toolchain than the dev box — a drift risk.

**Definition of done:** Host Node upgraded to ≥20.19 LTS; `npm run dev` / `vitest` / `build` run natively; the frontend image rebuilt so its `node_modules` matches the pinned vite 8 / vitest 4 (e.g. `docker compose build --no-cache frontend` plus renewing the anonymous `node_modules` volume).

**Status:** 🔲 Open

---

## Tier 4 — Operational Hardening

### BL-8: Backend Dockerfile / Cloud Run startup review

**What:** `backend/Dockerfile`'s `CMD` is:
```
alembic upgrade head && python -m app.ingestion.apply_seed && python -m app.ingestion.apply_inventory_snapshot && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
This runs on **every** Cloud Run container start, including in production. At minimum, `--reload` should be dropped in production — it's pure file-watcher overhead with no benefit in an immutable container, and could follow the same `ENVIRONMENT`-conditional pattern already used by `_api_docs_enabled()` in `app/main.py`.

Separately, investigate whether running `alembic upgrade head` + seed/snapshot-apply on every container start belongs in the serving container's startup path at all, vs. a separate step (e.g., a Cloud Run Job, or a CI deploy step) — balanced against the fact that **this exact mechanism performed the real `swu-prod` tenant #1 backfill in P4** (see roadmap, "P4 — Tenant #1 migration mechanics"). Changing it isn't free — it's removing a load-bearing (if accidental) production-migration pathway.

**Why:** Raised during this session's review of an external ChatGPT assessment — confirmed real and dev-shaped, but partly intentional. Worth noting: concurrent container starts during a scale-up event could in principle race on `alembic upgrade head` (Alembic has some locking via the `alembic_version` table, but this hasn't been specifically verified under Cloud Run's scaling behavior), and seed/snapshot-apply add startup latency to every cold start.

**Definition of done:** At minimum, `--reload` removed from the production path. The migration-on-every-start pattern is either confirmed-and-documented as intentional (in `SWU_Platform_Spec.md`, BL-1) or changed with a documented rationale.

**Status:** ✅ Resolved 2026-06-17 — `fd507a6`. Removed `--reload` and the two separate Python process spawns (`apply_seed`, `apply_inventory_snapshot`) from the Dockerfile `CMD`. Both functions moved into a FastAPI lifespan context manager in `main.py` — they run in-process on every cold start, reusing the existing DB connection pool, and exit immediately (idempotent COUNT check) when data is already present. 200 tests pass.

**Deferred to v1.0:** `apply_inventory_snapshot()` will be removed from the lifespan at the clean-slate milestone when test inventory is wiped and real inventory is loaded; `apply_seed()` stays as a fresh-environment bootstrap safety net.

---

### BL-9: Dependabot PR backlog triage

**What:** 18 open Dependabot PRs (#8, #9, #11-#27).
- 13 pass CI as-is.
- 5 fail (#9, #19, #21, #22, #24 — major-version bumps to `pytest`, `pytest-asyncio`, `vitest`, `@vitejs/plugin-react`) and need individual investigation (likely breaking API changes).
- Check #11/#12 (multi-package bumps: `vite`/`@vitejs/plugin-react`/`vitest`/`esbuild`) for overlap with #21/#24 (single-package bumps for the same libraries) before merging both.

**Why:** Explicitly deferred from P7 Stage 4 to "a dedicated future session" — recorded in `SWU_Platform_Security_Review.md` (A06). None of the 18 PRs touch a library with an open security alert; this is routine version-update backlog, not an unaddressed CVE.

**Definition of done:** Passing PRs merged (or closed if redundant with another PR), failing PRs individually investigated and either fixed+merged or closed with a documented reason.

**Status:** ✅ Resolved 2026-06-15 — All 18 PRs closed. Passing PRs merged (10 squash-merged via `gh pr merge --admin`; 6 applied manually due to package-lock.json 3-way conflicts after earlier merges updated the same file); failing PRs resolved via combined bumps and then closed.

**Resolution detail:**
- **#8, #18, #23** (python-dotenv 1.2.2, psycopg2-binary 2.9.12, pydantic-settings 2.14.1): squash-merged
- **#20** (sqlalchemy 2.0.50): merged manually via `cec8848` (3-way conflict after #8/#18/#23 landed first)
- **#13, #14, #15, #16, #17** (actions/checkout v6, setup-node v6, setup-python v6, setup-terraform v4, setup-gcloud v3): squash-merged
- **#11** (vite 5→8, vitest 2→4, @vitejs/plugin-react 4→6, esbuild removed): merged manually via `ad93322` (package-lock.json 3-way conflict; lock file regenerated fresh via `npm install`)
- **#12** (vite/vitest/@vitejs grouped bump — same targets as #11): closed as superseded by #11
- **#21** (vitest alone, major bump): closed — fails CI when applied alone (vitest 4.x requires vite 8.x as peer dep); superseded by #11's grouped bump
- **#24** (@vitejs/plugin-react alone, major bump): closed — same reason; superseded by #11
- **#25, #26, #27** (jsdom 29.1.1, firebase 12.14.0, typescript 6.0.3): merged manually via `9c08de1` (package-lock.json conflict after #11's major bump)
- **#9** (pytest 9.0.3): closed — superseded by #19 (9.1.0) and resolved by combined bump below
- **#19** (pytest 9.1.0 alone): closed — fails CI because `pytest-asyncio==0.24.0` pins `pytest<9`
- **#22** (pytest-asyncio 1.4.0 alone): closed — fails CI because `pytest-asyncio==1.4.0` requires `pytest>=8.4` but repo was on 8.3.3
- **Combined backend fix** (`e10f531`): bumped `pytest 8.3→9.1` AND `pytest-asyncio 0.24→1.4` together; the two packages had a mutual pin conflict requiring a coordinated bump. No test changes needed (`asyncio_mode=auto` was already set; no async test functions exist). CI green (27589627705).
- **Coverage threshold** (`ae9c82a`, `7205a98`): `@vitest/coverage-v8` needed re-adding explicitly (vitest 4.x marks it optional peer dep — skipped on local Node 20.12, not in lock file); statements threshold lowered 75→74% (vitest 4.x V8 provider counts statements slightly differently; lines coverage 79.44% unaffected).

---

### BL-16: Authentication hardening — email verification on signup

**What:** `frontend/src/screens/auth/AuthScreen.tsx` calls `createUserWithEmailAndPassword(auth, email, password)` on signup (line 38) with no follow-up `sendEmailVerification()` call, and nothing in the frontend checks `user.emailVerified`. On the backend, `verify_firebase_token` (`backend/app/auth.py`) accepts any validly-signed Firebase ID token regardless of the `email_verified` claim. Investigate adding an email-verification step to the signup flow, and decide what — if anything — should be gated on it.

**Why:** Jeremy noticed Firebase sends a "verify your email" message on signup, but the app currently does nothing with that signal: any syntactically-valid email can sign up, get auto-provisioned a tenant (P5's "one user, one tenant"), and use the full app immediately. Worth a deliberate decision, even for a small personal-use app, rather than an accidental gap.

**Definition of done:** Either (a) verification is enforced somewhere in the flow — e.g., the frontend calls `sendEmailVerification()` after signup and/or the backend checks `decoded.get("email_verified")` before allowing certain actions, with a regression test — or (b) the current "no verification required" behavior is confirmed and documented as an accepted trade-off in `SWU_Platform_Spec.md` Section 1 and `SWU_Platform_Security_Review.md`.

**Decision (2026-06-20, Open Question D):** Path (a) — email verification *will* be implemented, but deliberately deferred to the **v1.0 milestone**. Until then the current "no verification required" behavior stands as an accepted *interim* trade-off (not the permanent path (b)). At v1.0, enforce via `sendEmailVerification()` after signup plus a backend `decoded.get("email_verified")` check gating inventory mutations, with a regression test.

**Status:** 🔲 Open — decided (defer to v1.0)

---

### BL-17: Concept — public catalog view, auth-gated inventory

**What:** Investigate allowing the catalog endpoints — `GET /api/cards`, `GET /api/cards/{card_id}`, `GET /api/sets`, `GET /api/sets/{set_code}` — to be called without authentication, so a logged-out visitor can browse the Catalog screen, while `GET /api/inventory` and the increment/decrement endpoints remain authenticated and tenant-scoped exactly as today.

**Why:** Catalog data has no `tenant_id` and no RLS policy — it's identical for every user (`SWU_Platform_Spec.md` Section 1.5). Today, `Depends(get_db)` enforces authentication uniformly across *every* `/api/*` route, including catalog reads — a deliberate choice recorded in `SWU_Platform_Security_Review.md` (A01) and `SWU_Platform_Spec.md` Section 5.1: *"even though `cards` is shared catalog data... every `/api/*` route requires authentication uniformly, not just tenant-scoped ones."* This item revisits that choice: would letting visitors browse the catalog before signing up be worthwhile, and if so, what's the smallest change that achieves it without weakening the inventory/tenancy guarantees?

**Design tension to resolve when picked up:** would need a second, non-authenticating dependency for the catalog routers (distinct from `get_db`); `frontend/src/App.tsx`'s auth gate (P5 Stage 3 — currently renders only `AuthScreen` when signed out) would need to render the Catalog screen in the signed-out state too; and `SWU_Platform_Spec.md` Section 1/5 plus `SWU_Platform_Security_Review.md` A01 would need updating to describe the new (intentional) asymmetry between catalog and inventory routes.

**Definition of done:** Either implemented (new non-auth dependency for catalog routers, frontend auth-gate updated, docs updated, tests covering both authenticated and unauthenticated catalog access) or explicitly decided against with the rationale recorded here.

**2026-06-17 update:** Discussed implement-vs-decide-against. Jeremy confirmed he intends to offer this app to other people for real ongoing use, not just as a portfolio piece — which means the "does a logged-out visitor benefit from browsing first" calculus is different than for a purely personal tool. He paused the decision here because he wants to think through the full intended user flow (auth, catalog, inventory) end-to-end before deciding this item in isolation — see Open Question D.

**Decision (2026-06-20, Open Question D resolved):** **Implement** — the public catalog is wanted. A logged-out visitor browses the Catalog *and* the S6 card detail popup freely; `GET /api/inventory` and all inventory mutations stay authenticated and tenant-scoped exactly as today. The Inventory tab stays visible for anonymous users as a conversion hook and renders a value-prop empty state (lock icon + "Track your SWU collection" + Sign up / Log in) instead of the grid. The Catalog and popup are read-only for everyone, so there is no in-context "track" action to convert on — the Inventory tab is the single auth gate. **Implementation shape:** a second, non-authenticating DB dependency for the four catalog routes that opens a *tenant-less* session — RLS already fails safe here, a tenant-less session matches zero inventory rows by construction; `frontend/src/App.tsx` renders shell + Catalog when signed out (today it renders only `AuthScreen`); `SWU_Platform_Spec.md` §1/§5 and `SWU_Platform_Security_Review.md` A01 updated at implementation time to document the intentional catalog-vs-inventory asymmetry.

**Status:** ⤴️ Superseded 2026-06-27 by **BL-56** (catalog/inventory unification). BL-17's *access* decisions remain authoritative and are **inherited by BL-56** — public catalog reads, auth-gated inventory, the tenant-less catalog DB session (RLS fail-safe), and the anonymous value-prop gate. Only BL-17's *two-tab UI model* is replaced (BL-56 makes it one unified list with inventory columns shown by auth state).

---

### BL-18: Frontend tab switching — keep pages mounted

**What:** Change `App.tsx` lines 33–34 from `&&` conditional rendering to always-mounted components hidden/shown with CSS:

```tsx
<div style={{ display: activeSection === "catalog" ? "block" : "none" }}>
  <CatalogPage />
</div>
<div style={{ display: activeSection === "inventory" ? "block" : "none" }}>
  <InventoryPage />
</div>
```

**Why:** The `&&` pattern destroys the component (and all its React state, including fetched data) when a tab is left, and recreates it fresh on return. Both `CatalogPage` and `InventoryPage` fetch their data in a `useEffect` on mount, so every tab switch triggers a full API round-trip to Cloud Run + Cloud SQL — the consistent few-second delay on every switch. Keeping components mounted means data fetches once per session rather than once per tab visit.

**Scope note:** This does not address the very-first load delay after a Cloud Run cold start — that is BL-8's concern. BL-18 targets only the repeated delay on subsequent tab switches.

**Definition of done:** `App.tsx` updated; tab switching is instant after initial load; no regression in FilterPanel state, inventory increment/decrement behavior, or AddCardsModal behavior when switching away mid-flow.

**Status:** ✅ Resolved 2026-06-17 — `c77a41c`. `App.tsx` updated: `CatalogPage` and `InventoryPage` wrapped in always-mounted `<div>`s toggled via `display: none`. Decks placeholder left as conditional render (no data fetching). `App.test.tsx` (3 tests) green.

---

### BL-43: Cloud dev environment — robust dev→prod pipeline

**What:** Stand up a persistent, deployed **dev environment** in the cloud, sitting between the local Docker stack and prod, so changes are validated in a realistic cloud environment before they reach prod. Most likely built on the existing **`swu-sandbox`** GCP project (already in the Terraform module map — `SWU_Platform_Spec.md`), with its own Cloud Run + Cloud SQL + Firebase Auth config and a CI path that deploys to dev (e.g. a dedicated `dev` branch → dev deploy, or auto-deploy `main` to dev then promote to prod).

**Why:** Today the pipeline is just local → prod (`SWU_Platform_Roadmap.md`). There's no shared cloud environment to catch environment-specific issues — auth/RLS behavior, Cloud Run cold starts, migrations against real Cloud SQL, Firebase config — before they hit prod, and nowhere to demo in-progress work. Jeremy wants a more robust development pipeline (raised 2026-06-21, while setting up the catalog-redesign smoke test exposed the local-vs-prod-only gap).

**Decisions to make when picked up:** reuse `swu-sandbox` vs. a new project; branch/deploy strategy (dedicated `dev` branch → dev deploy, vs. promote-from-`main`); how the dev DB is seeded (swuapi ingestion against the dev DB); cost posture (scale-to-zero Cloud Run, smallest Cloud SQL tier); whether the custom-domain portal gets a `dev.` subdomain.

**Status:** 🔲 Open

---

### BL-44: Catalog performance at full scale

**What:** The Catalog tab fetches the entire `GET /api/cards` payload (~8,353 variant rows) and renders every grouped base-card row (~2,306) at once, with no virtualization or pagination. At full catalog size this means a multi-MB JSON payload + parse on each load and a heavy single-pass DOM render that causes jank (it also surfaced a tooltip-clipping symptom during the 2026-06-21 smoke test).

**Why:** With the 6-row fixture this was invisible; with the real catalog it's a genuine UX-performance concern. Flagged by Jeremy during smoke testing; deferred for dedicated discussion + implementation.

**Levers (bang-for-buck order; discuss before building):**
1. **Virtualization / windowing** — render only the visible rows (e.g. react-window). Keeps the single fetch and the existing rich *client-side* filtering (`applyFilters`) intact; targets the render jank directly. Likely the primary fix.
2. **Payload shape** — a base-cards-with-nested-variants list endpoint so the client fetches ~2,306 rows instead of ~8,353 (the table groups to base cards anyway); cuts network + parse ~3.6×.
3. **Server-side pagination + filtering** — the heavier architectural option; only warranted if the catalog grows much larger, and it requires moving filtering server-side (today's client-side filtering can't paginate what it hasn't fetched).

**Decision (2026-06-27 reconciliation) — approach chosen, scoped to v1.0:** stay **client-side** (server-side pagination/filtering rejected — it would degrade the instant client-side filter response Jeremy values and break the new faceted-filter design in BL-70/BL-71). Two locked levers:
- **Payload-shrink (lever 2):** add a `base-cards-with-nested-variants` **list** endpoint. The nested shape already exists for the single-card popup (`GET /api/base-cards/{id}` → `BaseCardDetail` with `variants[]`), so a list version is cheap. Fixes initial LOAD — today's flat `GET /api/cards` duplicates full base-card data (name/subtitle/aspects/keywords/traits/cost…) across all ~8,353 variant rows vs. only ~2,306 base cards (~3.6× redundancy). All data stays client-side → filtering stays instant and faceting (BL-70) is preserved.
- **Virtualization (lever 1):** window the DOM render of the fully-loaded in-memory list (~30 rows rendered at a time); continuous scroll, not page controls (scrollbar reflects the true full length). Fixes render jank.

The architectural rationale (client-side vs. server-side) will be captured as an ADR. DevTools measurement is a learning exercise, not a gate — decision made on code analysis.

**Status:** 🟡 Approach decided 2026-06-27 (payload-shrink + virtualization, client-side) → **v1.0**; pending implementation

---

### BL-53: API rate limiting on `/api/*`

**What:** No per-IP/per-tenant rate limit exists on the `/api/*` routes. Flagged as deferred in the P7 security review (OWASP A04 Insecure Design) and `SWU_Platform_Spec.md` §5 — low severity at the current single-developer, low-traffic scale, but a real gap before broader multi-user exposure.

**Why:** Surfaced during the BL-47 documentation sweep as an untracked deferral living only inside the security review / platform spec prose. Without a cap, the API is exposed to brute-force and resource-exhaustion abuse as usage grows.

**Definition of done:** A rate-limiting control on `/api/*` (per-IP and/or per-tenant), tuned not to impede legitimate use; the Platform Spec A04 row and §5 updated from "deferred" to the implemented control.

**Status:** 🔲 Open

---

## Tier 5 — Opportunistic / Low Priority

### BL-45: Bulletproof popover positioning (portal-based)

**What:** The Catalog "Variants" hover tooltip (`VariantsTooltip`) is `position: absolute`, anchored to the button's right edge (`right: 0`) so it grows inward and isn't clipped by the table wrapper's `overflow`. That works because the Variants column sits near the table's right edge. The robust general solution is to render the popover in a **React portal** (to `document.body`) with `position: fixed` computed from the button's `getBoundingClientRect()`, plus edge detection (flip side / clamp to viewport).

**Why:** The current right-align fix is layout-specific — it would clip again if the column moved, the table scrolled horizontally, or for the bottom-row downward-clip edge case. A portal escapes every overflow/stacking container. Surfaced during the 2026-06-21 smoke test; the right-align fix was deemed good enough for now.

**Definition of done:** `VariantsTooltip` (and any similar hover popovers) render via a portal with viewport-aware positioning; no clipping regardless of column/scroll position.

**Status:** 🔲 Open — flagged 2026-06-21, deferred (right-align fix shipped)

---

### BL-10: `card_keywords` / `sub_text` / `is_unique` data gaps

**What:** `card_keywords` table exists (migration 0016) but is unpopulated — no source for keyword data was found in the TCGPlayer CSVs. `card_details.sub_text` and `card_details.is_unique` are reserved columns, also unpopulated — no data source identified.

**Why:** Documented as "known data gaps" in `SWU_ClaudeCode_Spec.md` Section 4.5 since the S1 UI session. No current consumer needs this data.

**Definition of done:** Either a data source is found and a backfill script written, or explicitly marked "out of scope indefinitely." If S5's swuapi.com integration happens to surface keyword/unique-card data as a side effect, revisit then.

**Status:** ✅ Retired 2026-06-27 — overcome by events. `card_keywords` and `is_unique` are now populated from swuapi by the BL-29 ingestion run (1,067 keyword rows; `base_cards.is_unique` set); `sub_text` was dropped by migration 0022 (BL-33 redesign) with no replacement (see migration header) and no longer exists in the schema. Nothing left to do — no card attribute Jeremy wants tracked is currently uncaptured (confirmed 2026-06-27).

---

### BL-11: Local cleanup — `tcgcsv_files/` and `personal_card_inventory/`

**What:** 14 source CSVs (F3 ingestion inputs) and the old Excel tracker + Excel lock file (F4 ingestion input) are still present on disk locally, though both are untracked by git. Per spec, source files are "discarded after successful import" — both F3 and F4 have long since completed and been superseded by the catalog seed (F4) and inventory snapshot (F5).

**Why:** Pure local housekeeping, zero repo impact. Lowest priority — flagging for awareness, not a task that needs a session.

**Definition of done:** Jeremy deletes locally whenever convenient.

**Status:** 🔲 Open

---

### BL-38: Aspect double-pip multiplicity — display fidelity gap

**What:** swuapi does not expose double-pip aspect multiplicity. Some cards carry two pips of the *same* aspect (e.g. double Vigilance), but swuapi's `aspects` array returns only the *distinct* set (a single element) and exposes **no `aspectDuplicates` field** — despite the docs listing one. Confirmed 2026-06-20 against five physically-verified double-pip cards, all of which returned a single-element `aspects` array via the live API:

| Card | Set/№ | Physical pips | API `aspects` |
|------|-------|---------------|---------------|
| Exiled from the Force | SEC_054 | double Vigilance | `["Vigilance"]` |
| Chancellor Valorum | SEC_107 | double Command | `["Command"]` |
| Saw Gerrera | SOR_153 | double Aggression | `["Aggression"]` |
| Enforced Loyalty | SHD_108 | double Command | `["Command"]` |
| Oppo Rancisis | LOF_105 | double Command | `["Command"]` |

Because the source flattens it, **no schema sourced from swuapi can represent double-pip multiplicity.** Decision (2026-06-20): **accept swuapi's fidelity for now** — a double-pip card renders one icon — and keep the distinct-aspect `card_aspects` model.

**Why:** Double-pip multiplicity drives deckbuilding / aspect-penalty math, which is out of scope; for inventory tracking + catalog/popup display the only effect is visual fidelity (one vs. two same-aspect icons). Low impact, but a known fidelity gap worth tracking. Directly analogous to BL-10's unsourced-data gaps.

**Depends on:** A non-swuapi source for double-pip data (none identified). The swuapi finding should be **definitively re-confirmed against raw `/export/all` JSON during BL-27's census** (the 2026-06-20 check used WebFetch, which summarizes — high confidence but not raw).

**Definition of done:** Either a double-pip data source is found and a multiplicity-capable `card_aspects` model (ordered list or per-aspect count) is implemented so the catalog/popup render the correct pip count, or this is explicitly marked out of scope indefinitely. If pursued, BL-27's raw-JSON census first confirms swuapi truly omits the data.

**Status:** 🔲 Open — deferred (swuapi fidelity accepted 2026-06-20)

---

### BL-50: Token printed-number display ("T02")

**What:** Token cards display swuapi's set-sequence number (e.g. SOR Shield = "2") rather than the printed token number ("T02"). swuapi exposes no printed token number — it numbers tokens by set sequence (Shield = 2/4/6; zero "T0x" in the export) — so this is a data-source gap, not an ingestion bug (cf. BL-10 data gaps, BL-38 fidelity).

**Why:** Graduated from the gitignored frontend-fix triage rubric (item #2) during the BL-47 sweep. Needs analysis on whether "T02" is reliably *derivable* vs. an accepted swuapi gap, plus impact on the Add Cards resolver (keys on `card_number`) and sort. NB: tokens currently sort to the *top* (low numbers); a "tokens last" sort is a related-but-separate concern.

**Definition of done:** A decision on whether to derive/display printed token numbers or accept the swuapi gap; if displayed, the resolver and sort handle token numbering consistently.

**Status:** 🔲 Open

---

## Tier 6 — Feature Enhancements

### BL-46: Add Cards experience — rethink with real-card exploration

**What:** The Add Cards flow was rebuilt to the two-axis (provenance × finish) ambiguity-gated resolver (`SWU_Application_Spec.md` §5.4) and is functionally correct, but the *experience* isn't satisfying now that the catalog holds the full set of cards/variants. Before redesigning, use the app with **real cards and concrete examples** to figure out the optimal add-to-inventory experience (entry method, ambiguity handling, source/set selection, bulk patterns).

**Why:** Flagged by Jeremy during the 2026-06-21 smoke test ("not loving the add cards experience"). The optimal design isn't clear from analysis alone — it needs hands-on use against the real, much larger card set. This is a design-exploration item, not a defined build yet.

**Related:** BL-30 (bulk-add precon products), BL-32 (consolidated entry for tournament-tier variants), `SWU_Application_Spec.md` §5.4 (current resolver design).

**Reframed as a SPIKE (2026-06-27 reconciliation) → v1.0.** This is the *behavior-analysis* item Jeremy owns: define the wanted add-to-inventory experience (entry method, ambiguity handling, source/set selection, bulk patterns) via hands-on exploration with real cards. Its **definition of done is a behavior spec, not shipped code** — it closes by spawning/reshaping the implementation items it gates: **BL-61** (cross-set batch), **BL-62/BL-63** (card-image preview + add/won't-add cue), **BL-64** (inventory-feedback copy), **BL-67** (provenance-default bug — may be deleted if the rethink supersedes it). May then warrant a Claude Designer pass for the modal layout, gated on this analysis.

**Status:** 🔲 Open — v1.0 spike (Jeremy-owned analysis; spawns BL-61/62/63/64/67)

---

### BL-19: Add new card sets to catalog

**What:** A dedicated upsert script for loading new SWU card sets into the catalog — separate from the existing `catalog_seed.sql` bootstrap mechanism. The script should use `ON CONFLICT DO NOTHING` (or `DO UPDATE`) so it is safe to run against an already-populated catalog without duplicating existing cards.

**Why:** The current `apply_seed` guard (`COUNT(*) FROM sets > 0`) makes the seed file all-or-nothing — it will never run against a populated catalog. New sets released post-launch (e.g., Legends of the Force, subsequent sets) cannot be added via the existing mechanism. Additionally, new sets may introduce new card attributes or rules requiring manual inspection before the data is applied; a dedicated script makes that review step explicit.

**Depends on:** New set data source (TCGPlayer CSV export or equivalent).

**Definition of done:** Script exists; successfully upserts a new set into a populated production catalog; existing records are unaffected; instructions documented for the "add a new set" procedure.

**Status:** ✅ Retired 2026-06-27 — largely delivered by BL-29. `run_swuapi_ingestion.py` already upserts new sets by `swuapi_id` against a populated catalog. The residual "operational procedure for applying a new set" lives in BL-36 (new-set onboarding considerations); no separate dedicated-upsert-script item is needed.

---

### BL-20: Import/export inventory

**What:** User-facing import and export of inventory data as CSV or JSON. Export downloads the current tenant's inventory in a portable format. Import reads a previously exported file and upserts quantities into the inventory table.

**Why:** Discussed as a user-managed backup mechanism until formal disaster recovery (BL-21) is live. Also useful for migrating inventory between environments (e.g., from a test tenant to the production tenant at v1.0 clean slate). The user shoulders responsibility for routine export cadence.

**Depends on:** Stable inventory data model (no in-flight schema changes).

**Definition of done:** Export endpoint returns a downloadable file; import endpoint accepts a file and upserts inventory quantities; both are authenticated and tenant-scoped; at least one test each for export shape and import idempotency.

**Status:** ✅ Retired 2026-06-27 — absorbed into BL-54. Same feature; BL-54 is the v1.0-scoped import/export item (with the decomposition note). Tracking continues under BL-54.

---

### BL-21: Disaster recovery — automated DB backup

**What:** Establish automated backup and point-in-time recovery for the Cloud SQL instance in `swu-prod`, removing the burden of manual exports from users. Likely leverages Cloud SQL's built-in automated backups + scheduled exports to Cloud Storage. Define RTO/RPO targets, verify restore procedure, and document the DR runbook.

**Why:** As the app moves toward a live multi-tenant product, the operator (Jeremy) takes on responsibility for user data. User-managed import/export (BL-20) provides a self-service escape hatch, but it relies on users being disciplined. Automated DR on the operator side is the proper safety net for a production application.

**Depends on:** BL-20 (import/export gives a recovery path before formal DR is in place); production environment stable.

**Definition of done:** Automated backups confirmed enabled and retained for a defined window; at least one verified restore from backup to a sandbox environment; DR runbook documented in `SWU_Platform_Spec.md`.

**Status:** 🔲 Open

---

### BL-22: User settings page scaffolding

**What:** *(Revised 2026-06-27 — absorbs NEW-11.)* Replace the current inline "logged-in email + logout" line (`Header.tsx`) with a **top-right user-status menu** — an avatar/initials circle (à la Claude.ai's profile circle, but top-right) that opens a dropdown. The dropdown is the container/entry point for user-level options: **logout**, **change password** (BL-23), **edit inventory limits** (BL-25), with room for future options. The account email is surfaced *within* the menu rather than inline.

**Why:** Both BL-23 and BL-25 need a home, and the inline email+logout line is being replaced by the more conventional top-right account menu. This item establishes that menu as the shared surface those features plug into. Standard pattern → low Claude Designer value.

**Open question (deferred by Jeremy):** do the menu items navigate to a **Settings page** (menu = shortcut) or does each **open its own modal** from the dropdown? He may try options in Claude Designer. Resolution determines whether this stays a "settings page" model or becomes per-item modals.

**Definition of done:** the inline email+logout line is replaced by a top-right avatar menu; the menu contains at least logout, plus entry points for BL-23/BL-25 as those land; the account email is shown within the menu; existing primary nav is unaffected.

**Status:** 🔲 Open — v1.0 (absorbs NEW-11; supersedes the original "Settings entry under email/logout" framing)

---

### BL-23: Change password from settings

**What:** Within the Settings page (BL-22), let a logged-in user change their password. Implemented entirely via the Firebase client SDK: `reauthenticateWithCredential()` using their current password, followed by `updatePassword()`. No backend endpoints are needed — the backend never owns credentials today (`backend/app/auth.py` only verifies tokens).

**Why:** Requested directly by Jeremy as part of a broader user-settings capability for an app intended for real multi-user use (see [[project_bl17_user_flow]] discussion). Firebase requires a recent sign-in for sensitive operations like password change, so the UX must collect the current password (for reauth) in addition to the new one — this isn't optional, it's a Firebase platform constraint.

**Depends on:** BL-22 (settings page to host the form).

**Definition of done:** Settings page has a password-change form (current password, new password, confirm); successful change confirmed via Firebase; incorrect current password and weak/invalid new password produce clear error messages; manually verified end-to-end (sign out, sign back in with new password).

**Status:** 🔲 Open

---

### BL-24: Per-tenant, per-variant inventory limit overrides (data model)

**What:** Replace the hardcoded inventory limits in `backend/app/services/inventory.py` (`PLAYSET_SIZE = 3`, `SINGLETON_TYPES = {"Leader", "Base"}`) with tenant-configurable limits keyed by **type-category × variant_type**:
- *type-category* is singleton (Leader/Base) vs. standard (everything else);
- *variant_type* is **any value in the open variant vocabulary** introduced by BL-33's `card_variants.variant_type` and enumerated by BL-27 — the full long tail (~58 types), **not** the fixed 8 frontend keys this item originally assumed (`standard`, `foil`, `hyperspace`, `hyperspaceFoil`, `prestige`, `prestigeFoil`, `op`, `opFoil`). *(Revised 2026-06-20: full-long-tail variant tracking confirmed as a product goal, so an 8-column matrix is no longer sufficient.)*

Because the vocabulary is open and large, the store is **default-driven, not a dense grid**: a tenant gets per-category defaults (1 for singleton, 3 for standard) at provisioning and persists only the *overrides* that differ (e.g. "keep up to 5 Hyperspace"). New table (e.g. `tenant_card_limits`) holding overrides; new GET/PUT endpoint(s) to read/update the effective matrix (defaults merged with overrides).

**Why:** Requested by Jeremy: e.g. Standard Leader/Base capped at 1 but Hyperspace Leader/Base allowed up to 2, while non-singleton cards might allow 4 Standard / 5 Hyperspace / 3 Foil simultaneously (per-variant limits for leaders/bases confirmed in scope 2026-06-20; default stays 1 for singleton variants, 3 for standard). **Important behavior change uncovered during design:** today, non-singleton limits are enforced as a *shared pool* across all variants of a card (`inventory_repo.get_base_card_total` sums every variant toward one cap of 3 — `backend/app/services/inventory.py:70-88`). This item changes that to *independent per-variant caps*, matching how Leader/Base already work (each variant capped separately, `inventory.py:54-62`). This is a deliberate, necessary change to support the requested behavior, not an incidental side effect.

**Relationship to this session's model (2026-06-20):** these limits are **advisory tenant policy**, deliberately decoupled from two other axes — they do *not* define *completion* (which stays base-card-level and variant-agnostic: playset = 3 total / owned = ≥1, already built into `InventorySummary`), and they do *not* set a DB constraint on `inventory.quantity` (which must always be free to exceed any limit). This item owns the *numbers*; **BL-35** owns the *enforcement style* (hard cap = block past the limit, soft cap = commit-and-flag).

**Surfaced in the UI (2026-06-21):** the inventory popup currently caps total copies at 3 *across all variants* (the shared pool); this item's independent per-variant caps are the fix. Completion stays 3-total and variant-agnostic per the decoupling above — only the keep-limit goes per-variant. (Graduated from frontend-fix triage #9; no separate item needed.)

**Open consideration (resolve with BL-31/32):** with ~58 variant types, a separate limit per individual `variant_type` would be unusable in a settings UI and semantically odd for stamp-only tournament tiers (a user is unlikely to want a different keep-limit for "PQ Top 4" vs "PQ Top 8"). The likely answer is to set limits at the consolidated **`stamp_group` family** level for those variants, while keeping per-`variant_type` granularity for genuinely distinct variants — but that depends on BL-31/32's consolidation model and BL-33's `stamp_group`, so it's flagged here, not decided.

**Definition of done:** New migration adds the tenant limit-override table keyed on `(tenant_id, type_category, variant_type)` (or `stamp_group` per the open consideration above), with per-category defaults applied at tenant creation; `increment_card` resolves a card's *effective* limit (default merged with any override) and checks it independently per variant (no cross-variant summing) for both singleton and standard categories; new settings endpoint(s) are authenticated and tenant-scoped; tests cover independent-per-variant enforcement, at least one non-default override, and a leader/base per-variant override.

**Depends on:** BL-33 (open variant vocabulary / `card_variants` table the limits key against) and BL-27 (the enumeration that populates it). Pairs with BL-25 (settings UI) and BL-35 (hard/soft enforcement mode) to be usable end-to-end.

**Status:** 🔲 Open

---

### BL-25: Settings UI for inventory limit overrides

**What:** In the Settings page (BL-22), a grid/table UI to view and edit the type-category × variant limit matrix from BL-24 (e.g. rows = Standard/Hyperspace/Foil/..., columns = Singleton/Standard category, or vice versa). Also updates the two frontend hardcoded constants — `frontend/src/utils/inventory.ts` (`PLAYSET_SIZE`, `getPlaysetSize`) and `frontend/src/utils/addCardsResolver.ts` (`maxCopies`) — to read the tenant's configured matrix (fetched via BL-24's endpoint) instead of literal constants, so both inline inventory adjustments and the Add Cards flow respect the user's overrides.

**Why:** Closes the loop on BL-24 — the backend enforcement and settings storage are useless to a user without a way to view/edit them, and the frontend's own hardcoded limits would otherwise silently disagree with the backend's per-tenant values (e.g. an Add Cards UI still defaulting to "max 3" while the backend now allows 5).

**Depends on:** BL-22 (settings page), BL-24 (data model + endpoint).

**Definition of done:** Grid UI renders current limits per type-category × variant and saves edits via BL-24's endpoint; `VariantInventory.tsx`'s increment-disable logic and `addCardsResolver.ts`'s `maxCopies()` both reflect the fetched tenant limits instead of the old constants; manually verified that raising a limit in Settings immediately allows a previously-blocked increment, and lowering it blocks further increments.

**Status:** 🔲 Open

---

### BL-26: Claude.ai design-system sync workflow — inspection needed

**What:** On 2026-06-19, the `DesignSync` tool was used to push `frontend/src/` into the "SWU Inventory Manager Design System" claude.ai project's `source/src/` tree (34 files: `App.tsx`, auth, Add Cards modal flow, Inventory screens, `FilterPanel`, etc. — all the S2-S5/auth work the prior snapshot was missing). That sync is complete, but it doesn't close the real gap: per the project's own `SKILL.md`, `source/src/` is explicitly "reference only" — the files that actually *render* inside claude.ai are `components/*.jsx` and `screens/*/*.jsx`, hand-converted from the TS source (Babel-in-browser JSX, `Object.assign(window, …)` exports instead of ES modules, per `SKILL.md`'s conversion steps). Jeremy reports having to do significant continued manual modification *within* claude.ai chats to get production screens actually showing up there — almost certainly patches to this `.jsx` conversion layer, which the `source/src/` sync never touches.

**Why:** Before investing in a repeatable sync workflow, the actual conversion gap needs to be understood structurally, not just patched again from memory. Two inspection paths are available:
- **The more durable signal:** diff `components/*.jsx` + `screens/*/*.jsx` (the live-rendering layer) directly against current `frontend/src/` to see exactly what conversion logic (JSX rename, import/export rewrite, prop typing, data-fetch wiring) is missing or stale — a stable artifact, not a reconstruction from memory.
- **Available but lossier:** Jeremy's claude.ai chat history includes the actual back-and-forth where he inspected and fixed what was needed to get screens working in claude.ai — real signal on what broke and how it was fixed, but scattered across conversational turns rather than captured as a diffable artifact.

Likely the right approach is to use the chat history to understand *what kinds of fixes* were needed (informing the inspection), then formalize the result as a reusable conversion script/checklist diffed structurally against `frontend/src/` — rather than relying on either source alone.

**Definition of done:** Not yet scoped — Jeremy wants to revisit this as its own session rather than decide an approach now.

**Status:** 🔲 Open — deferred, no session scheduled

---

### BL-27: Additional card variant types (Judge, Showcase, Prerelease Promo, etc.)

**What:** Discovered while planning the card detail popup (2026-06-20): swuapi.com's `?variant=all` lookup returns variant types beyond our existing 8 (`standard`, `foil`, `hyperspace`, `hyperspaceFoil`, `prestige`, `prestigeFoil`, `op`, `opFoil`) — confirmed via a live API call on Luke Skywalker (SOR_005): `Standard`, `Hyperspace`, `Prerelease Judge`, `Prerelease Promo`, `Showcase`, each with a genuinely distinct `frontImageUrl`. The full universe of variant types isn't known yet — needs a dedicated pass against swuapi.com (likely iterating `?variant=all` across a representative sample of cards/sets) to enumerate every type that actually exists.

**Why:** These are real, rare variants (Judge, Championship, Showcase, Prerelease Promo, etc.) that collectors do own and would expect to track. They weren't on the radar when the original 8-variant model was designed (`card_variants` table, frontend's `variant.ts`/`addCardsResolver.ts` constants, inventory limit logic). Adding them isn't a narrow data change — per the discussion that surfaced this, it touches the catalog data model, ingestion/backfill scripts, Add Cards modal resolution logic, inventory limit enforcement (BL-24's per-variant caps), and now the card detail popup's variant-button UI — so it needs deliberate cross-cutting analysis, not an ad hoc add.

**Depends on:** None technically; informed by (but not blocking) the card detail popup work that surfaced it.

**Definition of done:** Full enumeration of variant types available via swuapi.com documented; a scoped plan exists identifying every touchpoint in the app that assumes the current fixed 8-variant set; either implemented or explicitly deferred per-variant-type with rationale.

**Status:** ✅ Resolved 2026-06-21 (Opus) — full programmatic census of the captured 8,353-card export (`backend/app/tests/fixtures/swuapi_export_2026-06-21.json`); classification frozen in `SWU_Application_Spec.md` §10. **58 variant_types** = 8 finishes (Standard, Standard Foil, Hyperspace, Hyperspace Foil, Standard Prestige, Foil Prestige, Serialized Prestige, Showcase) + channel labels + ~40 tournament-tier labels. Decisions: store `variant_type` **raw** + a curated `finish`/`channel`/`stamped`/`stamp_family` classification; `channel` (provenance) derived from `variant_type` + `source_set_code` (inconsistently encoded); `stamp_group` = `(base_card, finish)` with a stamped member (Prestige Foil + tournament-tier families confirmed); exceptions = 15 structural → 14 swuapi-null `(name,subtitle)` fallback re-anchors (tokens exempt) → **Zam the sole true exception**; `is_token` from `type` containing "Token"; `card_variants` keyed on `swuapi_id` (`(base_card,variant_type)` not unique); aspect double-pip flattening confirmed (0/8353). **Spun off BL-39** (judge/prerelease stamp visual analysis) and **BL-40** (group-by-art grouping revisit).

---

### BL-28: swuapi.com analysis — ongoing sync and schema alignment

**What:** Raised 2026-06-20 while planning the card detail popup, after discovering swuapi.com is significantly more capable than originally assumed (per-variant images confirmed real and distinct — see BL-26/BL-27's discovery; structured front/back/epic-action text fields; rich card metadata). This item is **analysis only** — no code changes. Two threads:

1. **Ongoing sync:** New sets can appear in swuapi.com before official release/sale date. Investigate a scheduled job (Cloud Scheduler + Cloud Run, or similar) that polls swuapi.com on some cadence and upserts new/changed cards automatically, vs. today's fully manual "new set" process (BL-19).
2. **Schema alignment:** Compare the current `cards`/`card_details`/`card_variants` schema field-by-field against everything swuapi.com's card object exposes (already found gaps: no formatted text storage need since swuapi text is plain — BL discussion above — but also fields we don't capture at all, e.g. `artist`, `reprints`/`reprintOf`, `keywords` as a structured array vs. our `card_keywords` table that's unpopulated per BL-10). Determine what's worth adding/refactoring vs. intentionally not needed.

**Why:** Jeremy's own assessment, in hindsight: swuapi.com should likely have been used more heavily from the start, both for original catalog construction and for keeping it current, rather than the one-time CSV-based F3/F4 pipeline. This is a strategic "did we pick the right long-term data source" question, not a bug — it surfaced organically while scoping the card image work (S5) and variant text work (this session), both of which already lean on swuapi.com. The original third thread of this analysis — replacing CSV-based catalog *creation* with swuapi.com — was split out into BL-29 (2026-06-20) since it's already concrete enough to be its own implementation item rather than open-ended analysis.

**Relationship to other items:** Overlaps with BL-10 (unpopulated `card_keywords`/`sub_text`/`is_unique` — swuapi.com may have these), BL-19 (manual new-set upsert — could be subsumed by thread 1 here), BL-27 (variant-type discovery — same API, adjacent investigation), and BL-29 (catalog creation — split out, see above). Don't duplicate work — if this item is picked up, fold BL-10/BL-19/BL-27's investigations into it rather than doing them separately.

**Definition of done:** This item never produces implementation — it produces backlog items. At minimum: a field-by-field comparison of current schema vs. swuapi.com's card object, and a recommendation on whether/how to automate ongoing sync. Each actionable finding gets written up as its own new backlog item (with its own ID, Why, and Definition of done) rather than implemented inline here. This item is marked resolved once that write-up is done, even if none of the resulting items have been built yet.

**Findings log (running, 2026-06-20 session):**
- **Token cards may need shared modeling, not per-set duplication.** While analyzing TS26's internal numbering (its 4 card-number collisions turned out to be its 4 generic token cards — Battle Droid, Clone Trooper, Experience, Shield — colliding with 4 of its unique Leaders), those same 4 tokens are also the only TS26 cards that matched a core-8-set card by name. Generic tokens appear to be reused/duplicated across many products in swuapi rather than being unique per set. Our schema currently has no concept of a shared token catalog — every card row belongs to exactly one set. Worth a deliberate decision later: one shared token catalog vs. a duplicate row per set (matching how swuapi/TCGPlayer both already do it). Not scoped as its own item — fold into whatever BL-28/BL-29 recommendation touches catalog structure.
- **`(name, subtitle)` matching must be case-insensitive.** While testing whether `(name, subtitle)` reliably groups every variant of a card together (Phase 3 of this analysis), an apparent "card with no Standard printing anywhere" turned out to be a false positive: R2-D2's Weekly Play variant (TWI 17) has `subtitle: "Full Of Solutions"` (capital O), while its Standard printing (TWI 193) has `subtitle: "Full of Solutions"` (lowercase o) — same physical card, inconsistent casing within swuapi's own data. This was the only such inconsistency found across the full dataset, but any future swuapi-based linking logic (BL-29, or a card-identity key per Phase 3's finding) must normalize case before comparing `name`/`subtitle`, or it will silently mis-group cards.

**Final Write-Up (2026-06-20):** Pulled the live `GET https://api.swuapi.com/export/all` export (27 sets, 8,353 cards) and analyzed it in five phases. Summary below; raw analysis is in this session's history, not reproduced here.

#### Set structure (Phase 1)

27 sets total, not the 7 (now 8, with ASH) we model:
- **Core 8** — SOR, SHD, TWI, JTL, LOF, SEC, LAW, ASH (ASH not yet released — ASH-only data is `Standard`-variant-only so far, confirming swuapi exposes upcoming-set content before sale, consistent with finding ASH was the next set to release).
- **17 sets are pure variant containers** — every card matches a core-8 card by name+subtitle (case-insensitive): the 7 Weekly Play sets (`*P`), Judge Program (J24/J25), Promo (P25/P26), Convention Exclusive (C24/C25), Gamegenic, Gift Box, Movie Promo. These need no special handling beyond normal variant linking.
- **IBH (Intro Battle: Hoth) and TS26 (2026 Twin Suns) are genuinely standalone card pools** (0% and ~5% match respectively) — confirmed by Jeremy's product knowledge (IBH and Twin Suns precons contain cards unique to themselves) and corroborated by the data. **Decision: both will be added as new sets in our database.** IBH is clean to ingest (104 cards, single rarity `Special`, single `variantType: Standard`, zero number collisions, two-sided intro-box composition: 80 Unit/20 Event/2 Leader/2 Base). TS26 has a numbering quirk: its 4 generic token cards (Battle Droid, Clone Trooper, Experience, Shield) share card numbers 1-4 with 4 of its unique Leaders — a same-set collision unrelated to foil/variant logic. Recommend ingesting both via the **BL-19 mechanism** (dedicated new-set upsert script) rather than a special case.
- **C26's one orphan card ("Zam Wesell - Not What She Seems")** doesn't exist anywhere yet (checked ASH directly — not present in its 267 currently-revealed cards). Likely a preview of an unreleased ASH or future card; not resolvable until more of ASH is revealed or the 2026 convention happens. Demonstrates the "ongoing sync" thread's value directly — a point-in-time pull can't resolve this, periodic re-sync naturally would.

#### Field census (Phase 2)

swuapi's card object has 32 fields against our ~17 columns (`cards`/`card_details`/`card_aspects`/`card_traits`/`card_keywords`). Full table produced during the session; headline outcomes:
- **Closes BL-10 directly**: `keywords` and `isUnique` are both populated in swuapi, resolving our two longest-standing unpopulated columns.
- **Confirms the planned S5 fields** (`frontText`/`backText`/`epicAction`/`frontImageUrl`/`backImageUrl`) are present and ready to source from swuapi as already specified in `SWU_ClaudeCode_Spec.md` Section 9.
- **New fields with no current DB equivalent**: `subtitle` (cleaner than our derived name-splitting), `artist` (already flagged in the spec as deferred here), `type2`/`doubleSided` (useful for popup back-face logic), `rules`/`additionalRulings` (extended errata text, not currently planned anywhere).
- **No rich text formatting exists anywhere** in `frontText`/`backText`/`text`/`rules` — confirmed by scanning the full dataset for HTML tags, markdown, and bracket-tags. Square brackets (`[Exhaust]`, `[Villainy]`) are literal printed game text, not markup. One unrelated data-quality bug found: some ASH cards have an unresolved `<uq>` template placeholder in their text, likely a scraper artifact specific to ASH being pre-release.
- **Set-level fields with no equivalent**: `release_date`, `total_cards`, `updated_at` — all directly useful for the sync thread below. Conversely, our own `has_unique_variant_numbers` and `base_card_number` have no swuapi equivalent and would still need local derivation even if swuapi became the source.

#### Variant-to-base-card alignment (Phase 3)

- **`(setCode, name, subtitle)`, matched case-insensitively, is a reliable grouping key** for "all variants of one printed card" — only one true data inconsistency found in the entire dataset (SOR "Hardpoint Heavy Blaster" has two rows mislabeled `type: Unit` instead of `Upgrade` — a swuapi data bug, not a structural problem).
- **Not every card has a Standard printing to anchor to.** True count, after correcting two false positives (a per-set-only grouping bug, and the casing bug above): **1** — "Zam Wesell - Not What She Seems" (see above). Any base-card-linking design must treat "no Standard anchor" as a valid, expected case for convention-exclusive-only cards.
- **Recommended linking key for "one physical printing": `(setCode, name, subtitle, variantType)`**, not `card_number`. `card_number` alone collides in 1,353+ cases (1,339 are expected foil pairs already consistent with our schema; 14 are genuine cross-variant collisions, e.g. two different tournament tiers sharing a number) — confirmed concentrated entirely in the three earliest sets (SOR/SHD/TWI), zero in JTL onward or in promo containers.

#### Cross-set oddities (Phase 4)

- **47 cards have a Standard printing in 2+ different core sets** (mostly shared tokens, some genuine staple reprints like "Corellian Freighter" in both JTL and SOR) — confirms `(name, subtitle)` grouping must stay scoped within a set, not used as a cross-set identity. Benign, not actionable.
- **Exception to the Phase 3 linking key recommendation**: SEC's 21 "Serialized Prestige" senator cards (Queen Amidala, Mon Mothma, etc.) each have 3 rows sharing identical `setCode`/`cardNumber`/`variantType` — they're 3 distinct finishes (plain Carbonite/Gold/Rose Gold) distinguishable only by parsing the image filename, not any structured field. `(setCode, name, subtitle, variantType)` is not sufficient for these 21 cards specifically.
- Diacritic/accent handling in swuapi is clean (verified via raw codepoints on "Chirrut Îmwe", unlike our own TCGPlayer pipeline which needed migrations 0007/0009 to fix this).

#### Tournament/judge/prerelease variant images (informs BL-31/BL-32)

Direct visual comparison (Rey - Keeping the Past, 6 RQ-tier variants; confirmed pattern via card-number-collision data on other cards) shows these variants are **pixel-identical art with only a text stamp changed** in the trait-line area. This is real for the ~58-value `variantType` long tail beyond our 8 modeled variants, and motivated BL-31 (popup) and BL-32 (inline editing) as dedicated UX items.

#### Recommendations

1. **Catalog creation (BL-29):** swuapi is a substantially richer source than the CSV pipeline ever was — recommend it as the primary source for new-environment/rebuild catalog creation, with the above linking key, case-insensitivity, no-Standard-anchor handling, and the Serialized Prestige exception built in from the start.
2. **Ongoing sync:** Recommend a scheduled job, low frequency (daily/weekly, not real-time) — `meta.lastScrapedAt` and per-set `updated_at` make "what changed since last pull" cheap to check. Directly useful for the ASH/C26 case demonstrated this session.
3. **Schema alignment:** Add `subtitle`, `artist`, `type2`, `doubleSided` as new columns; backfill `card_keywords`/`is_unique` from swuapi (closes BL-10); proceed with the already-planned S5 columns sourced from swuapi as specified. `rules`/`additionalRulings` — defer, no current consumer.
4. **IBH/TS26** — ingest via BL-19's new-set mechanism once it exists, not as a one-off.

**Spun-off backlog items from this analysis:** BL-29 (catalog creation), BL-30 (bulk-add precon products), BL-31 (popup stamp consolidation), BL-32 (inline editing consolidation).

**Addendum 2026-06-20 (later same day) — `variant_of_uuid` supersedes the recommended linking key above.** A follow-up check (prompted by revisiting the Zam Wesell exception, see below) found that swuapi exposes a structural `variant_of_uuid` field that wasn't surfaced during this analysis: every card has a `uuid`, and every non-root variant's `variant_of_uuid` points directly to its root (`variant_of_uuid: null`) **within the same set** — confirmed via live re-query on Corellian Freighter (SOR_250/JTL_258, independent roots, no cross-set merge), SORP Weekly Play (cross-set anchor into SOR), and C26 (5 of 6 cards anchor into core sets; Zam Wesell does not). This makes the `(setCode, name, subtitle, variantType)` text-matching key above unnecessary for **within-set base-card anchoring** — `variant_of_uuid` resolves it directly and more reliably (no case-sensitivity bugs, no ambiguity from the 47 cross-set name duplicates, which are confirmed genuine reprints with independent roots, not a matching hazard). Text matching is still relevant for the separate, deferred "show all reprints of this card across sets" feature. Full mechanism, scenario taxonomy, and exception handling now documented in **`SWU_Standard_Variant_Mapping_Spec.md`** (new standalone reference) and **`swuapi_standard_variant_exceptions.md`** (short, regenerated exception list — currently just Zam Wesell, precisely defined as "a root whose own `variant_type` isn't `Standard`"). Spawned **BL-33** (schema redesign — `base_cards`/`card_variants` split using `variant_of_uuid`, supersedes/scopes BL-29) and **BL-34** (test suite for the mapping spec, deferred — Jeremy wants the spec settled first).

**Status:** ✅ Resolved 2026-06-20 — five-phase analysis complete; findings and recommendations above; BL-29/30/31/32 spun off as planned; addendum same day added BL-33/34 and superseded the linking-key recommendation for within-set anchoring. No code changed by this item, per its own definition of done.

---

### BL-29: Replace CSV-based catalog seed with swuapi.com

**What:** Split out from BL-28 (2026-06-20). Today's catalog is seeded from `db/seeds/catalog_seed.sql`, originally built from the F3/F4 TCGPlayer CSV ingestion pipeline (`tcgcsv_files/`, `backend/app/ingestion/`). Investigate and likely implement catalog creation (for new environments, or full rebuilds) directly from swuapi.com instead.

**Why:** swuapi.com appears more capable than the original CSV pipeline assumed (per-variant images, structured text fields, richer metadata — see BL-26/BL-27). Pulled out of BL-28 as its own item because it's concrete enough to scope and build directly, rather than open-ended research — unlike BL-28's remaining sync-cadence and schema-delta questions, which are genuinely undecided.

**Depends on:** BL-28's schema alignment thread should inform this (don't build against a schema that's about to change), but doesn't strictly block starting design work.

**Definition of done:** Superseded/scoped by BL-33 — the real definition of done is BL-33's "Schema redesign migration" + "BL-29 ingestion script" steps.

**Built 2026-06-21 (BL-33 step 3):** `backend/app/ingestion/swuapi_classify.py` (pure §10.2-10.5 finish/channel/stamp classification), `swuapi_transform.py` (pure variant_of_uuid root resolution + §10.6 fallback re-anchoring + row-building, DB-free, runnable on the host against the captured fixture), `swuapi_client.py` (live fetch), and `run_swuapi_ingestion.py` (the upsert-by-`swuapi_id` DB layer + CLI, `--file`/`--live`). Verified against the full captured export: 2,306 `base_cards` (2,319 structural roots minus the 13 non-token roots the §10.6 fallback collapses into existing anchors), 8,353 `card_variants`, exactly the one expected exception (Zam Wesell) — `swuapi_standard_variant_exceptions.md` regenerated from a real run and diffed clean against the hand-written version. 29 new tests (pure classification/transform against the fixture + a DB idempotency test with a small synthetic export, isolated from the shared test catalog) — 116/116 backend tests green, zero legacy tests touched (purely additive, no disposition-log entry needed).

**`swuapi_client.py` correction (2026-06-21, found running this for real):** the first cut hit only `/export/all`, which turned out to **never carry `variant_of_uuid`** — that field only exists on the paginated `/cards` endpoint (camelCase vs. snake_case field shapes differ between the two too). This matches how the captured fixture was actually built per its own header comment, just missed on the first pass. Fixed to paginate `/cards` offset-based (500/page max, cursor pagination silently truncates per the mapping spec) and use `/export/all` only for `sets`/`meta`.

**Run for real against production, 2026-06-21:** pushed to `main`, deployed via the full CI/CD pipeline (migration `0022` applied to the live Cloud SQL DB), then ran `run_swuapi_ingestion.py --live` against production through the Cloud SQL Auth Proxy (same `.tools/cloud-sql-proxy.exe` pattern as the original P2 data load). Result matched the fixture-verified numbers exactly: **27 sets, 2,306 base_cards, 8,353 card_variants, 1 exception (Zam Wesell)**, plus 3,384 `card_aspects` / 1,067 `card_keywords` / 4,252 `card_traits` rows. Took ~11 minutes — row-by-row upserts over the proxy, not batched; fine for a one-time rebuild, would need batching for a recurring sync (BL-33 step 7). Two unrelated bugs surfaced and fixed by this being the *first* CI run since the BL-33 step 1 migration landed: a missing `ruff format` pass, and a latent gap where CI's fresh ephemeral DB never seeded the 7 base sets (`catalog_seed.sql` was deleted in step 1 but nothing replaced its `sets`-seeding role for CI) — fixed in `conftest.py`.

**Status:** ✅ Resolved — ingestion script built, tested, deployed, and run for real against production. Catalog is live and correct at the DB layer; the frontend (untouched, BL-25/27/S6 territory) now renders real data with incorrect/flattened variant labels until ported — accepted tradeoff, scoped to a separate Opus session

---

### BL-30: Bulk-add a pre-built product to inventory (IBH / Twin Suns / Starter Decks)

**What:** Surfaced 2026-06-20 during BL-28's swuapi.com analysis. Star Wars Unlimited sells several precon products whose card pools are partly or entirely unique: **Intro Battle: Hoth (IBH)** (104 cards, confirmed 0/104 match any core-8-set card — a fully standalone pool), **Twin Suns (TS26)** (4 decks × 83 cards = 332 physical cards; swuapi's distinct-card catalog for it is 88 cards, 84 of which are unique to Twin Suns — a different game format's precon decks with crossover collector appeal), and the **two starter decks per mainline set** (rarity `Special`/`S` cards mixed into the regular set catalog). Add a feature letting a user select one of these products and add its full card list to their inventory in one action, rather than entering each card individually through the existing Add Cards modal.

**Why:** These products are explicitly designed as an easy on-ramp for new players, but Jeremy notes the unique cards inside them are also attractive to existing collectors — someone who buys an Intro Battle: Hoth box or a Twin Suns deck wants those cards reflected in their inventory without manually keying in 80+ entries.

**Key gap — blocks scoping:** swuapi.com's `cards`/`sets` export only contains a distinct-card catalog, not deck composition. It can tell us *which* cards are unique to a given product, but not *how many copies* of each card a specific deck/box contains (332 physical TS26 cards vs. 88 distinct catalog entries — the other ~244 are duplicate copies within and across the 4 decks). A decklist (card + quantity per product) has to come from elsewhere — official decklist PDFs, FFG product pages, or manual curation — before this feature can be built.

**Second gap, found during the same analysis:** our current catalog substantially undercounts `Special`/Starter-rarity cards relative to swuapi — `db/seeds/catalog_seed.sql` has only 15 rows with `rarity = 'S'`, against 387 `Special`-rarity card records in the swuapi export. The starter-deck-unique cards this feature depends on may not even be in our catalog yet; that's a prerequisite gap, likely resolved by whichever of BL-28/BL-29's recommendations ends up adding missing cards to the catalog.

**Depends on:** A decklist/quantity data source (not yet identified) for each product; catalog completeness for `Special`-rarity cards (see gap above, tracked under BL-28/BL-29).

**Definition of done:** Not yet scoped — decklist data source needs to be identified first, then a real implementation plan (UI entry point, backend bulk-insert endpoint, inventory-limit interaction for products containing more than the normal per-variant cap) can be written.

**Status:** 🔲 Open

---

### BL-31: Card detail popup — consolidated representation for stamp-only variants

**What:** Raised 2026-06-20 during BL-28's swuapi.com analysis, while inspecting tournament/judge/prerelease card images. Confirmed by direct visual comparison: "Rey - Keeping the Past" (P25) has six tournament-tier variants — RQ Day Two, Top 4, Top 8, Finalist, Champion, Judge — that are **pixel-identical art**, differing only in a single text stamp swapped into the trait-line area. The card detail popup (in-flight feature, spec Section 9.x) cannot reasonably render one variant button per stamp — for cards with 5-6 such tiers (e.g. SHD "Doctor Evazan - Wanted on Twelve Systems" has 5: PQ Top 4/Top 8/Top 16/Finalist/Champion) that's a wall of near-duplicate buttons showing the same picture. The popup needs a consolidated display — likely one representative image standing in for the whole stamp family — while inventory tracking underneath stays per-variant (a user can still record owning specifically a "PQ Champion" copy vs. a "PQ Top 4" copy of the same card).

**Why:** Discovered organically while testing whether swuapi's per-variant images were genuinely distinct (they are, for the 8 variant types we already model) or just stamped (true for the tournament-tier long tail). Building the popup without accounting for this would either bloat the variant-button UI unusably or silently drop tournament-tier variants from being viewable at all.

**Depends on:** BL-27 (full variant-type enumeration — needed to know exactly which `variantType` values are stamp-only vs. genuinely distinct art) and the card detail popup feature itself (spec Section 9.x, in-flight).

**Definition of done:** Not yet scoped — needs a decision on what "consolidated" looks like (one shared image per tier-family vs. a single image with a rendered badge/overlay) and how the popup's variant-selection UI surfaces per-variant inventory state without one button per stamp.

**Status:** ✅ Resolved 2026-06-21 — shipped in the catalog redesign frontend rewire (commit `bf5d95d`, deployed via CI run 27910607802). `CardDetailPopup` consolidates a base card's variants by `stamp_group` — the unstamped anchor (else the first member) stands in for the whole same-art/same-finish stamp family as one representative button — while per-variant inventory stays tracked underneath via the full variant list. The `stamp_group` column was populated at ingestion per BL-27 §10.5. Consolidated *inline* editing for tournament tiers is the separate, still-open BL-32.

---

### BL-32: Inline inventory editing — consolidated entry for tournament-tier variants

**What:** Raised 2026-06-20 alongside BL-31, same root cause, different surface. The existing inventory screen's per-variant `+`/`-` row (`VariantInventory.tsx`) doesn't scale to cards with several tournament-tier variants — a card with 5 PQ tiers would need 5 near-identical rows differing only by tier label, which is a worse problem on a dense inline-editing list than it is on the popup (BL-31). Needs its own interaction pattern, likely an expandable sub-list or secondary modal per card, rather than one flat row per tournament-tier variant.

**Why:** Same triggering discovery as BL-31 (stamp-only tournament-tier variants confirmed via swuapi image comparison), but the inline-editing list and the detail popup are different UI surfaces with different space constraints and different existing interaction patterns (`+`/`-` counters vs. variant-selector buttons) — solving one doesn't automatically solve the other.

**Depends on:** BL-27 (variant-type enumeration), and is closely related to BL-31 — likely worth designing both together once BL-27's enumeration lands, even though they're separate UI surfaces.

**Definition of done:** Not yet scoped — needs a decision on the consolidated interaction pattern (expandable row, secondary modal, etc.) before implementation.

**Status:** 🔲 Open

---

### BL-33: Catalog schema redesign — `base_cards`/`card_variants` split, swuapi-id-keyed sync, scoped sequencing

**What:** Raised 2026-06-20, immediately after BL-28's analysis closed. Jeremy confirmed the app is pre-v1.0 and he's comfortable losing all current inventory and user data, as long as the ability to *reload* inventory from the F5 inventory-snapshot mechanism is preserved. That removes the one constraint (preserving `card_id` continuity for existing inventory rows) that would otherwise force BL-29's catalog rebuild to be additive-only — it can instead be a real schema redesign.

**Current schema (confirmed via `backend/app/models/`, not assumed from the backlog's shorthand):** `cards` is flat — one row *per variant* — with boolean flag columns (`is_foil`, `is_hyperspace`, `is_prestige`, `is_showcase`, `is_organized_play`) distinguishing variants, grouped only by a `base_card_number` string column. `card_aspects`/`card_traits`/`card_keywords` are keyed on `card_id` (i.e., per variant), so identical aspect/trait/keyword data is duplicated across every variant row of the same printed card today. `inventory.card_id` FKs directly to a variant row. There is no `card_variants` table today — the backlog's references to "the eight variant keys" describe frontend/business-logic concepts, not a DB table.

**Why the flat schema doesn't extend:** BL-27 found ~58 real `variantType` values in swuapi, not 8 — an unbounded set of boolean columns isn't viable, and a flag-based schema has no way to express BL-31/32's core problem ("these 6 tournament-tier variants are pixel-identical art, group them") without ad hoc string parsing at query time.

**Proposed redesign (summary — the authoritative target design now lives in `SWU_Application_Spec.md` §4):**
- **`base_cards`** (new) — one row per root printing per base set; shared card data (name, subtitle, type/type2, double_sided, rarity, cost/power/hp/arena, is_unique, front/back/epic text, artist), `swuapi_id` (UUID, unique), nullable `standard_variant_id`; `card_aspects`/`card_traits`/`card_keywords` move here (keyed on `base_card_id`). *(No reprint column — live check 2026-06-20 confirmed swuapi exposes no reprint lineage; cross-set "all printings" is derived via name/subtitle matching. See redesign spec §4.2.)*
- **`card_variants`** (replaces the boolean flag columns) — `base_card_id` FK, **`variant_type` (finish)**, **`source_set_code` (provenance — FK `sets.code`)**, `card_number`, `front_image_url`/`back_image_url`, `swuapi_id` (unique upsert key), nullable `stamp_group`.
- **`sets`** — a single table for *all* sets (base + long-tail container), with a curated **`is_base_set`** flag; `base_cards.set_id` references a base set; `card_variants.source_set_code` references any set; add `release_date`, `total_cards`, `swuapi_updated_at`. **The `is_organized_play` boolean is retired** — OP becomes `source_set_code` = a Weekly Play set.
- **`inventory`** — FK retargeted to `card_variants.id` (rename from `card_id`); unique `(tenant_id, variant_id)`.

*Refined 2026-06-20 (swuapi-first redesign session): finish/provenance split on `card_variants`, single `sets` table with `is_base_set`, `is_organized_play` retirement. **See `SWU_Application_Spec.md` for the full target design (schema + variant/provenance model + UX behaviors) — this item is now the execution/sequencing record pointing at it.** Note: §4.3's `variant_type` vocabulary must not be frozen until BL-27 resolves the finish-vs-provenance mapping against live data (a programmatic `/export/all` census — see redesign spec §10).*

**Why this over patching the current schema:** Collapses aspect/trait/keyword duplication; gives S6's popup a natural default-render anchor (`standard_variant_id`) instead of no answer for "which variant renders before one is picked"; makes BL-27's variant long tail data instead of a schema migration; makes BL-28's ongoing-sync thread an ID upsert instead of re-running fuzzy text matching on every poll. Token-card sharing across sets (noted in BL-28's findings log) isn't solved by this split alone, but becomes a tractable follow-on (shared `base_cards` row vs. one per set) instead of a fight against a flag-based schema.

**Zam Wesell re-check (2026-06-20):** BL-28 found one card with no Standard printing anywhere — "Zam Wesell - Not What She Seems" (C26, card #3, Convention Exclusive) — and guessed it might be an ASH preview. Re-checked directly against `GET /cards?set=TS26` (63 cards) and `GET /cards?set=IBH` (104 cards): absent from both. Re-confirmed absent from ASH (`[]`). `GET /sets/C26` shows that set itself has no release date, only 6 total cards, last scraped today — it's an in-development preview container, same situation as ASH, just not specifically ASH. The card remains the single confirmed no-Standard-anchor exception; `standard_variant_id` must stay nullable to handle it (and any future preview card like it) rather than being treated as a data bug to fix.

**Testing mandate (per `SWU_Application_Spec.md` §8):** each numbered step below lands **with its own tests in the same PR** — not deferred to the end. Every broken legacy test gets a **deliberate disposition — port / replace / retire (with a recorded reason for *retire*), never an unreasoned delete-to-go-green** (§8.1). The rewrite produces a **disposition log** (each legacy test area → disposition + reason) as the auditable record that coverage was preserved or deliberately reduced, never silently eroded — eliminating now-irrelevant tests happens *here, in this work*, not as a deferred cleanup item. Per-step: step 1 carries the migration plus the `variant_of_uuid` graph-invariant test, written test-first against captured swuapi fixtures (§8.2/§8.4); step 3's ingestion carries upsert-by-`swuapi_id` idempotency tests; **step 4 carries an explicit snapshot-reload test** proving the regenerated F5 snapshot restores correctly against the new `card_variants.id` values (§8.5); steps 5–6 carry the resolver / token / popup behavior tests (§8.2).

**Revised sequencing (supersedes the prior BL-29-first ordering):**
1. **Schema redesign migration** — `base_cards` + `card_variants` as above, `inventory` FK retargeted. Clean drop/recreate of the catalog tables, not an in-place ALTER chain — no data-preservation constraint per Jeremy's 2026-06-20 confirmation.
2. **BL-27 enumeration** — now needed *before* ingestion to populate `variant_type`'s real vocabulary and assign `stamp_group` correctly, not just to "know what exists" for later.
3. **BL-29 ingestion script** — builds the new tables from swuapi using `swuapi_id` as the upsert key. Folds in S5 (images), BL-10 (keywords/`is_unique`), IBH/TS26 (BL-19's new-set mechanism), and the `Special`-rarity gap (BL-30's prerequisite) in one pass, per BL-28's recommendation against duplicate passes.
4. **Inventory snapshot regeneration** — the existing F5 snapshot file keys on the old `card_id`; needs a one-time regeneration against new `card_variants.id` values (matched by `set_code + card_number`, not raw ID) as part of cutover. This is the concrete task Jeremy's "comfortable losing inventory" tolerance buys: no remapping logic, just regenerate and reload.
   - **Also fix here (found during BL-49 doc verification, 2026-06-24):** `backend/app/ingestion/apply_seed.py` (~line 55) still runs `SELECT COUNT(*) FROM cards` in its post-seed summary, but migration 0022 dropped `cards` (→ `base_cards`/`card_variants`). It's latent — only the fresh-DB seed path reaches it (when the catalog is already populated, `apply_seed` returns early) — but on a clean `docker compose down -v && up` it would raise and fail startup. Update the count query (`base_cards`/`card_variants`) and verify the full fresh-DB seed **+** snapshot startup path end-to-end as part of this cutover.
5. **S6 popup** — built against `standard_variant_id` (default render) and `stamp_group` (BL-31 consolidation) from day one instead of retrofitting.
6. **BL-31/BL-32** — UI work, now straightforward data-wise since `stamp_group` already exists.
7. **Ongoing sync job** (BL-28 thread 1) — upsert-by-`swuapi_id`, deferred until the rebuild has been live and correct for a while; automating an unvalidated pipeline just automates its bugs too. **Currency mechanism decided 2026-06-20:** Cloud Scheduler → Cloud Run, **daily detection** (cost ~$0 at any cadence) producing a reviewable diff via `swuapi_id` + `meta.lastScrapedAt` / per-set `updated_at`; **operator-gated apply** initially (one-click approve), converting to full auto-apply later (**BL-37**); the public catalog **shows pre-release/preview content** (spoilers), with the operator gate as the quality check on swuapi's preview-data warts. Per-new-set onboarding considerations (set logo assets, new variant vocabulary, preview-vs-completion interaction) tracked in **BL-36**. **Deletions (2026-06-20):** the sync also consumes swuapi `/deletions` tombstones (withdrawn/rejected cards), not just upserts, via the documented `since` + `after`/`next_cursor` contract; deletions are **surfaced in the operator gating review before apply**, with explicit attention to the edge case of deleting a card that already has inventory rows (must not silently orphan a tenant's inventory — flag for the operator to resolve). swuapi "card merges never emit," so no card-merge handling is needed for cards.
8. **BL-30** — unaffected; still blocked on a decklist/quantity source unrelated to any of the above.

**Depends on:** None technically blocking start; BL-27's enumeration should land before step 3's ingestion script is written (per the sequencing above).

**Definition of done:** Migration adds `base_cards`/`card_variants` per the design above with `inventory` retargeted; BL-29's ingestion script populates both tables from swuapi keyed on `swuapi_id`; inventory snapshot regenerated and reload-tested; S6 built against `standard_variant_id`/`stamp_group`. Each numbered sequencing step can land as its own commit/PR rather than one large change.

**Step 1 progress (2026-06-21):** Migration `0022_catalog_schema_redesign.py` landed — clean drop/recreate of `cards`/`card_details` into `base_cards`/`card_variants`, `sets` widened with `is_base_set`/`release_date`/`total_cards`/`swuapi_updated_at` (code column widened 3→4 chars for long-tail codes like `TS26`/`SORP`), `inventory.card_id` retargeted to `variant_id`. Full backend port (models/repositories/services/schemas/routers) landed in the same PR so the app boots; the F3/F4 CSV/Excel ingestion pipeline was retired outright (superseded by BL-29, not yet built) — see [`BL33_Step1_Test_Disposition_Log.md`](BL33_Step1_Test_Disposition_Log.md) for the full per-test disposition. The `variant_of_uuid` graph-invariant test (BL-34) was written test-first against a freshly captured full live export and found two corrections to `SWU_Standard_Variant_Mapping_Spec.md` itself: 143 real two-hop chains (not zero) and 15 standard-anchor exceptions (not 1) — both fixed in the mapping spec and exceptions file before the migration was written. 87/87 backend tests green. Frontend untouched (deferred to BL-25/27/S6). **Next:** BL-27 census (step 2) — handed to an Opus session per this item's original sequencing.

**Step 3 progress (2026-06-21):** BL-29's ingestion script landed, deployed, and run for real against production — see BL-29's own entry above for the full build/verification/production-run detail. `base_cards`/`card_variants` are now populated in production (27 sets, 2,306 base_cards, 8,353 card_variants, 1 exception), upserted idempotently by `swuapi_id`. Not wired into `apply_seed`/container startup as an automated step — run manually via the CLI (`--file`/`--live`) through the Cloud SQL Auth Proxy, matching the pattern of the original P2 manual data load. **Next:** step 4 (inventory snapshot regeneration) — the F5 snapshot still needs to be reloaded against the new `card_variants.id` values now that a real run has produced them; production inventory was empty going into this (Jeremy confirmed no real data to lose), so step 4 is about restoring the *reload path*, not recovering lost data.

**Step 4 progress (2026-06-25):** The remap tool (`regenerate_inventory.py`) and its §8.5 reload-safety test landed on `main`, CI-green and deployed (commit `490dc8f`). The test is now **self-contained** — a small inline `base_cards`/`card_variants` fixture (keyed to JTL to match the synthetic old rows' `set_id`), with no dependency on the full ingested catalog. That JTL-data dependency was the "not push-ready" gate from `863e2cf`. Also fixed `apply_seed.py`'s post-seed summary, which still queried the `cards` table dropped by migration 0022. **Reframed 2026-06-25 (context: BL-54):** the original step-4 goal — "regenerate + commit `catalog_seed.sql`/`inventory_snapshot.sql` + auto-restore on startup" — is **overcome by events.** Jeremy's v1.0 plan is a user-facing inventory **import/export** feature (**BL-54**) that will retire the personal inventory-seed scaffolding entirely (`regenerate_inventory`, `apply_inventory_snapshot`, the §8.5 test, any snapshot file). So we are deliberately **not** building seed/snapshot *generators* or committing static data files — that's throwaway code. Instead:
- **Catalog** bootstrap on a fresh DB = `run_swuapi_ingestion --file backend/app/tests/fixtures/swuapi_export_2026-06-21.json` (the committed 13MB export is the swuapi-sourced "seed"). Whether to auto-run it on startup vs. keep it manual is a small deferred decision — **ADR pending**, not blocking.
- **Inventory** = a one-time `regenerate_inventory` load into prod, **deferred by Jeremy** (2026-06-25) — no longer needed for personal feature-testing; he's confident in the functionality and doesn't need his real collection in prod yet.

**Status:** ✅ Resolved 2026-06-27 (2026-06-27 reconciliation) — core delivered 2026-06-25 — schema/ingestion (steps 1-3) live in prod; remap tool + self-contained §8.5 reload test + `apply_seed` fix shipped; static seed/snapshot file generation dropped as throwaway (reframe above); frontend catalog/inventory/popups (steps 5-6) shipped in the 2026-06-21 redesign. **Remaining threads are tracked as their own items:** one-time prod inventory load (deferred), catalog-bootstrap ADR, BL-32 (stamp consolidation UI), BL-36/BL-37 (ongoing sync), BL-30 (bulk-add), BL-54 (import/export, which retires this scaffolding).

---

### BL-34: Standard variant mapping — test suite

**What:** Build the test suite specified in `SWU_Standard_Variant_Mapping_Spec.md` §8: fixture-based (captured swuapi data, not live API calls in CI), covering each scenario in the taxonomy (§5, scenarios A-I) individually, plus the one large test asserting the full `variant_of_uuid` graph invariant across the entire captured export — every card is a root or resolves to exactly one root within its own set, no multi-hop chains, and every non-`"Standard"` root is accounted for in `swuapi_standard_variant_exceptions.md`.

**Why:** Raised 2026-06-20 immediately after the reference spec was written. Jeremy wants the documentation in place and reviewed before committing to test code against it — the spec itself may still shift slightly once implementation starts (e.g. the open question on whether container sets get `sets` rows, or re-verification of the Serialized Prestige triple-finish case noted as unconfirmed in §5F).

**Depends on:** `SWU_Standard_Variant_Mapping_Spec.md` (exists); informally pairs with BL-33's schema migration and BL-29's ingestion script, since the test suite's fixtures and assertions are most useful once `base_cards`/`card_variants` exist to test against — but the suite could also be written test-first, against the captured swuapi data alone, before the schema migration lands.

**Definition of done:** Test suite exists covering all of §8's scenarios; the one large invariant test passes against the current captured export; any scenario found to behave differently than documented (e.g. the unverified Serialized Prestige case) is corrected in the spec doc as part of this work, not left silently mismatched.

**Status:** 🔲 Open

---

### BL-35: Hard/soft inventory keep-limit mode (user override)

**What:** A user-level (per-tenant) preference that toggles inventory keep-limit enforcement between two modes:
- **Hard cap (default — today's behavior):** at a card's keep-limit, the Add Cards modal and inline steppers refuse to add further copies — the existing `blocked: true, reason: "trade_sell"` path (`backend/app/services/inventory.py` increment rules; `AddCardsVerification`'s "at limit"/red split).
- **Soft cap:** over-limit copies *are* committed to inventory. The Add Cards modal still shows a visual "this will put you over the limit" indicator on those rows, but they commit rather than being held back; inline steppers likewise allow incrementing past the limit.

This is a **single universal per-user setting, not a per-variant configuration** — contrast BL-24's per-variant *limits* (the numbers themselves), which this mode governs the *enforcement style* of but is otherwise orthogonal to.

**Why:** Raised 2026-06-20 during the swuapi-first redesign conversation (Open Question E). The hard cap encodes a "this tool tracks my keep-pile, not every card in hand" stance — coherent for a collector who sends surplus to a trade pile (and consistent with trading being out of scope). But some users will want the tool to record reality — the 6th hyperspace they actually opened — with the surplus merely flagged, not refused. Making this a user choice rather than a baked-in rule keeps both mental models valid. Reinforces the broader principle established this session: keep-limits are **advisory tenant policy**, fully decoupled from completion (base-card playset / owned, which stays variant-agnostic) and from what the database stores — `inventory.quantity` must never be capped at the limit by a DB constraint, only by application policy in hard mode.

**Depends on:** BL-22 (settings page to host the toggle); pairs with BL-24/BL-25 (per-variant limit values share the same enforcement path).

**Definition of done:** Tenant preference persisted (e.g. a `cap_mode` field in a tenant-settings store); `increment_card` honors the mode (block vs. commit-with-over-limit-flag) for both singleton and standard categories; Add Cards verification renders a third "over-limit, will commit" state in soft mode; inline steppers allow over-limit increments in soft mode; default remains hard cap; tests cover both modes including an over-limit commit in soft mode.

**Status:** 🔲 Open

---

### BL-36: New-set onboarding considerations (applying new cards/sets to the catalog)

**What:** When the ongoing sync — or a manual run — applies new cards/sets, a series of concerns beyond a raw data upsert must be handled. Enumerated so far (2026-06-20):
- **Set logo / image asset** used by the Add Cards modal's set bar (`AddCardsSetBar`) and anywhere set logos render. Not guaranteed to come from swuapi; historically a manually-sourced PNG per set — so a brand-new set has no logo until one is supplied.
- **New variant types** entering the open vocabulary (BL-27) that need a `variant_type` value and, for stamp-only tournament tiers, a `stamp_group` assignment (BL-31/32, BL-33).
- **New card attributes** swuapi may introduce that have no column yet.
- **Preview-vs-completion interaction:** with pre-release/preview content now shown publicly (currency decision, BL-33 step 7), an unreleased, unownable card would otherwise count as "missing" and drag down set/playset completion %. Decide how preview cards are treated in the completion stats.

Applies whether application is **gated** (the initial mode) or **automatic** (future — BL-37).

**Why:** Raised 2026-06-20 while locking the catalog-currency mechanism. Applying a new set isn't a pure data operation — assets and UI conventions assume per-set human-curated inputs (set logos especially). These must be enumerated and, where possible, automated before full auto-apply (BL-37) is safe. Jeremy explicitly deferred the deep exploration of these impacts to a future date.

**Depends on:** Pairs with BL-33/BL-29 (the ingestion these considerations wrap) and BL-19 (manual new-set path).

**Definition of done:** A checklist/spec of every per-new-set consideration (assets, variant vocabulary, attributes, preview/completion interaction), each marked automatable-or-manual; the gated-apply flow surfaces the manual ones to the operator at apply time.

**Status:** 🔲 Open — exploration deferred

---

### BL-37: Convert ongoing catalog sync to full auto-apply

**What:** The 2026-06-20 currency decision (BL-33 step 7) starts the ongoing sync as **auto-detect + operator-gated apply** — a scheduled job detects changes and produces a reviewable diff, and the operator one-click approves before anything is written. This item is the future conversion to **full auto-apply** (no human gate), so the catalog stays current hands-off.

**Why:** Requested by Jeremy when choosing the apply mode (2026-06-20): gated apply is the safe starting point; auto-apply is the eventual hands-off goal. Deferred because auto-applying before BL-36's onboarding considerations are automatable would inject un-curated data — and swuapi's known pre-release defects (the ASH `<uq>` placeholder, the Zam Wesell no-anchor card) — straight into the live, public, multi-tenant catalog.

**Depends on:** BL-36 (onboarding considerations made automatable or safely defaulted); the gated sync (BL-33 step 7) being live and validated for a sustained period.

**Definition of done:** The sync applies detected changes without a human gate; BL-36's considerations are handled automatically or safely defaulted; safeguards exist (e.g. hold/flag obviously-broken or preview-defective records) so auto-apply cannot publish bad data unattended.

**Status:** 🔲 Open — future

---

### BL-39: Judge/Prerelease variant stamp classification (visual set-by-set analysis)

**What:** The `Judge Program`, `Prerelease Judge`, and `Prerelease Promo` variant_types are a mixed bag — some are a *stamp over an existing finish* (so they belong in a `stamp_group` with that unstamped finish, per `SWU_Application_Spec.md` §10.5), others are *genuinely distinct printings* (ungrouped). Which is which **cannot** be determined from the data or image filenames — it requires visual, set-by-set inspection of the actual card art. BL-27 left them **ungrouped by default**. This item does the visual classification and assigns each (per set) its correct `finish` + `stamped` flag, updating the curated classification and `stamp_group` assignments.

**Why:** Raised 2026-06-21 during BL-27. The finish+stamp `stamp_group` rule needs each variant_type classified as stamped-over-a-finish vs. distinct; for these three it's genuinely varied (Jeremy, holding the physical cards, confirmed "some are stamps, some are not"), and only visual inspection resolves it.

**Depends on:** BL-27 (the classification framework + `stamp_group` rule, resolved); feeds BL-31/BL-32; an input to BL-40.

**Definition of done:** Each Judge Program / Prerelease Judge / Prerelease Promo variant (per set) classified via visual inspection as `(finish, stamped)`; the curated classification and `stamp_group` assignments updated from the ungrouped default; recorded in `SWU_Application_Spec.md` §10.5.

**Status:** 🔲 Open

---

### BL-40: Revisit variant grouping model — finish+stamp vs. group-by-art

**What:** BL-27 adopted a **finish + stamp** rule for `stamp_group` — consolidate variants sharing the same base art *and* the same finish, differing only by a stamp (`SWU_Application_Spec.md` §10.5). This is a deliberate starting point. Jeremy wants to revisit whether a broader **group-by-base-art** model is better — collapsing *all* finishes of the same art together (Standard + Foil, Hyperspace + Hyperspace Foil, all prestige finishes, …) regardless of finish or stamp. That would reduce the popup/inline-edit button count further but changes the consolidation semantics.

**Why:** Raised 2026-06-21. The finish+stamp model is the v1 grouping; an art-based grouping might serve the BL-31/BL-32 UI better but is a different philosophy. Jeremy wants to think it through, with BL-39's judge/prerelease visual pass as an input to the decision.

**Depends on:** BL-27 (baseline grouping), BL-39 (visual input), BL-31/BL-32 (the UI surfaces this affects).

**Definition of done:** A decision on whether to keep finish+stamp grouping, move to group-by-art, or a hybrid — documented in `SWU_Application_Spec.md`; if changed, the `stamp_group` model and BL-31/BL-32 updated accordingly.

**Status:** 🔲 Open — deferred (Jeremy thinking)

---

### BL-41: Channel-rule quirk — base-set tournament-tier variants classify as Retail, not Promo

**What:** Found 2026-06-21 while building BL-29's ingestion script, executing `SWU_Application_Spec.md` §10.4's channel-derivation rule literally. The rule's "Promo / Tournament-tier" branch is keyed only on `source_set_code` (`P25`/`P26`) — it has no `variant_type`-prefix clause, unlike every other branch in that rule (Weekly Play, Judge, Convention all check `variant_type` *or* set code). So a PQ/RQ/SQ/GC/SS-prefixed variant sourced from a base set instead of P25/P26 falls through to the `else → Retail` branch, even though it's the same tournament-tier label.

This is real, not hypothetical — the captured export has both shapes for the same labels:

| Set | Variant Type | Channel (as implemented) |
|-----|---------------|---------------------------|
| P25 | PQ Champion (×3) | Promo / Tournament-tier |
| P26 | PQ Champion (×1) | Promo / Tournament-tier |
| SOR | SS Champion (×1) | Retail |
| SHD | PQ Champion (×1) | Retail |
| SHD | PQ Top 16 (×1) | Retail |
| TWI | PQ Champion (×1) | Retail |
| TWI | SS Champion (×1) | Retail |

(Full set: SOR/SHD/TWI each carry their own small set of `PQ */SS *` rows alongside `Prerelease Judge`/`Weekly Play` — these are the early sets, before the long tail moved into dedicated `P25`/`P26`/`*P` container sets per §10.4's own note that "early Weekly Play sits in the base set... later Weekly Play sits in dedicated `*P` containers." The same early/late split appears to apply to tournament tiers, but §10.4 only wrote the explicit dual rule for Weekly Play, not for PQ/RQ/SQ/GC/SS.)

`stamp_group` consolidation is unaffected — `swuapi_classify.py`'s tournament-tier-prefix grouping is independent of channel and correctly merges a card's tiers into one `stamp_group` regardless of which set they're sourced from. This is purely a `channel` (provenance-label) inconsistency, not a data-integrity or grouping bug, and `channel` isn't even a persisted column today (BL-29 ingestion derives it on demand, not stored). Implemented literally per the spec and pinned by tests (`backend/app/tests/test_swuapi_classify.py::test_retail_channel_is_the_fallback`) rather than silently "fixed," since the kickoff scoped this session to execution against the frozen vocabulary, not re-opening §10.4.

**Why:** Surfaced organically while writing `classify_variant()` (`backend/app/ingestion/swuapi_classify.py`) against the real `variant_type`/`source_set_code` pairs in the captured export, not from re-reading the spec in the abstract.

**Depends on:** `SWU_Application_Spec.md` §10.4 (the rule in question); BL-27 (the classification framework this lives in).

**Definition of done:** Not yet scoped — needs a decision on whether SOR/SHD/TWI's own PQ/RQ/SQ/GC/SS rows should classify as Promo/Tournament-tier (extending the rule with a variant_type-prefix clause, mirroring the Weekly Play rule's dual check) or whether Retail is actually correct for them (e.g. if these specific early-set rows really were sold through retail channels rather than tournament prize support). Likely needs the same kind of visual/provenance inspection BL-39 does for Judge/Prerelease, since the prefix alone doesn't say which is true.

**Status:** 🔲 Open

---

### BL-51: Browser Back closes popups; Add Cards unsaved-changes confirm

**What:** The browser Back button should close an open popup (card detail / inventory / Add Cards) and return to the app, rather than exiting to the portal; plus an "unsaved changes" confirmation when backing out of Add Cards.

**Why:** Graduated from the frontend-fix triage rubric (item #3). The SPA is currently router-less (BL-18: tab/popup nav is pure state with no history, so Back exits the site). This needs one shared browser-history mechanism across all popups, and a custom confirm-on-back collides with browser limits (native `beforeunload` is generic-only; custom text/buttons need a `pushState`/`popstate` guard with real edge cases) — a genuine approach decision (Opus-design item).

**Definition of done:** Back closes any open popup via one shared mechanism without leaving the app; Add Cards prompts on unsaved changes; behavior covered by tests.

**Related:** BL-18 (tab mounting / nav model).

**Status:** 🔲 Open

---

### BL-52: Cross-set "all printings" reprint view

**What:** "Show every printing of this physical card, reprints across sets included" — group independent `base_cards` roots by case-insensitive `(name, subtitle)` *across* sets, layered on top of the within-set variant mechanism. Wanted for the card detail popup.

**Why:** Graduated from `SWU_Standard_Variant_Mapping_Spec.md` §7 (and referenced in `SWU_Application_Spec.md` §4.3), where it was "deferred per 2026-06-20 conversation" with no tracking item. swuapi exposes no reprint lineage (confirmed 2026-06-20), so this is a query-time derived grouping, not a schema change.

**Definition of done:** The popup can show all cross-set printings of a card via `(name, subtitle)` matching (tokens excluded per the duplicate-per-set rule); behavior covered by tests. Pick up when popup (S6) work reaches it.

**Status:** 🔲 Open

---

### BL-54: Inventory import/export (user-facing)

**What:** A v1.0 goal (Jeremy, 2026-06-25). Let a user **import** their inventory — exported from another SWU inventory app as CSV/JSON — into this app, so they don't have to re-enter a collection they've already built elsewhere; and **export** their inventory from this app (same formats) for portability/backup. Resolution maps imported rows onto `card_variants` (set + card number + finish/variant, per the resolver/two-axis model), with explicit handling for unresolved/ambiguous rows (report, never silently drop — same discipline as `regenerate_inventory`'s flagging).

**Why:** It's the feature that makes the app adoptable for collectors who already track inventory elsewhere, and it's what lets Jeremy **delete the entire personal inventory-seed mechanism** — the archived Excel ingest, `regenerate_inventory.py`, `apply_inventory_snapshot.py`, the §8.5 reconstruction test, the archived pre-redesign snapshot, and any `inventory_snapshot.sql`. That scaffolding exists only to get *Jeremy's own* collection in once (deferred — see BL-33 step 4 reframe); a real import path supersedes it for everyone.

**Likely decomposition (decide during design):** (1) supported formats + a documented import schema; (2) parser + validation; (3) row → `card_variants` resolution & the unresolved/ambiguous report; (4) merge/dedupe semantics against existing inventory; (5) import/export UI + progress/error surfacing; (6) export endpoint/format. These may become separate BL items once the design lands.

**Depends on / relates to:** the two-axis variant model and resolver (`SWU_Application_Spec.md` §5.4, §12); BL-30 (bulk-add precon, a related "get cards in fast" path); supersedes the inventory-seed scaffolding tracked under BL-33 step 4.

**Status:** 🔲 Open — v1.0 goal; not yet designed (may decompose).

---

## App Review Items — v1.0 Redesign & Beyond (added 2026-06-27)

These items came out of a structured app-review + prioritization session (2026-06-26/27, Opus). Unlike the legacy Tier 1–6 grouping above, they're organized by **epic** and tagged with a **target milestone** (v1.0 / v1.1 / later) — reflecting the move to a milestone model + GitHub Issues for execution tracking (see Open Question A, now resolved). Fine-grained status lives in GitHub Issues; these entries are the durable narrative + decisions. Architectural decisions are captured as ADRs in `docs/decisions/`.

### Epic: Catalog/Inventory Unification

#### BL-56: Unify Catalog & Inventory into one list (supersedes BL-17)
**Target:** v1.0 · **Epic:** Unification · **Area:** catalog/auth · **Type:** feature

**What:** Collapse the separate Catalog and Inventory tabs into a single list.
- **Anonymous visitor:** sees the existing catalog list as-is, with a light prompt to log in / create an account to manage inventory.
- **Authenticated user:** the *same* list with inventory + playset columns inserted to the right of the card name (the position they occupy in today's Inventory tab), plus the completion calculations and the Add Cards button.
- One table structure; inventory columns conditionally rendered by auth state — *additive columns, not a separate view*.

**Why:** The two-tab split is unnecessary — catalog and inventory are the same card list viewed with/without ownership data. One list is simpler and makes the public-catalog/conversion story cleaner.

**Inherits from BL-17 (superseded):** the access model is unchanged and authoritative — public catalog reads, auth-gated inventory + mutations, the tenant-less catalog DB session (RLS fail-safe), and the anonymous value-prop gate. BL-56 replaces only BL-17's two-tab UI.

**Not a Claude Designer candidate** (confirmed twice) — it's column insertion on the existing view, not a net-new layout.

**Open question:** variant button / hover-over position in the anonymous vs. authenticated view (or both) — undecided.

**Related:** BL-57 (value-prop popup), BL-59 (remove Decks tab), BL-60 (owned/playset toggles), BL-44 (perf, same view), BL-70 (filters, same view).

**Definition of done:** a single unified list replaces the Catalog/Inventory tabs; anonymous sees catalog + login prompt; authenticated sees inventory/playset columns + completion + Add Cards; access model matches BL-17's decisions; no regression in filtering or inventory editing.

**Status:** 🔲 Open — v1.0 (foundational; the other view items sit on it)

---

#### BL-57: "Create an account & here's what you get" value-prop popup
**Target:** v1.1 · **Epic:** Unification · **Area:** auth · **Type:** feature · **Designer candidate**

**What:** A value-prop popup with screen snippets + blurbs describing the inventory-management experience, shown to anonymous users as a conversion surface (a richer version of the inline login nudge).

**Why:** Convert browsers to signups by showing what tracking inventory gives them. The inline nudge (BL-60) is the light touch; this is the full pitch on intent.

**Designer candidate** (per rubric): net-new, purely visual marketing surface, wide-open solution space — a good batch partner for a Claude Designer session.

**Related:** BL-56 (unification), BL-60 (the inert-toggle click can open this popup).

**Definition of done:** an anonymous user can open a compelling value-prop popup (e.g. via the login nudge / inert-toggle click) that explains inventory management and routes to sign up / log in.

**Status:** 🔲 Open — v1.1

---

#### BL-58: Revisit default column widths
**Target:** later · **Epic:** Unification · **Area:** catalog · **Type:** chore

**What:** Revisit the catalog table's default column widths.

**Why:** Current defaults aren't ideal. Bundled into BL-56 if that redesign ships as a whole; standalone otherwise.

**Definition of done:** column widths tuned to sensible defaults.

**Status:** 🔲 Open — later (or fold into BL-56)

---

#### BL-59: Remove the Decks tab until the deck feature ships
**Target:** v1.0 · **Epic:** Unification · **Area:** frontend-shell · **Type:** chore

**What:** Remove the Decks placeholder tab/nav entry; reinstate when the deck feature is built.

**Why:** It's an empty placeholder; removing it cleans up the nav (especially as the Catalog/Inventory tabs merge under BL-56). The deck feature itself is a forthcoming, separately-scoped item (Jeremy will define it).

**Definition of done:** Decks tab/nav entry removed; no dead route; reinstated when the deck feature lands.

**Status:** 🔲 Open — v1.0

---

#### BL-60: "Show only cards I own" toggle (+ anonymous teaser)
**Target:** v1.0 · **Epic:** Unification · **Area:** catalog/inventory · **Type:** feature

**What:** Add a "show only cards I own" toggle (a my-collection filter) to the unified list. This toggle **and** the existing playset toggle are **shown for anonymous users too**, but **inert** (no inventory to act on) — a conversion incentive.

**Nudge treatment:** layered — a quiet persistent inline line (italic/muted, e.g. "Log in to track your collection") near the toggles for the passive nudge; clicking an inert toggle opens the value-prop popup (BL-57) for motivated users. Passive state stays light; deliberate click gets the full pitch.

**Why:** Gives authenticated users a quick my-collection view (replacing the separation the old Inventory tab provided); the inert-but-visible toggles tease the value to anonymous users.

**Related:** BL-56 (unified list this lives on), BL-57 (popup the click opens).

**Definition of done:** authenticated users can toggle to owned-only; anonymous users see both toggles inert with the light nudge + popup-on-click.

**Status:** 🔲 Open — v1.0

---

### Epic: Add Cards (gated by the BL-46 behavior spike)

#### BL-61: Add Cards — preserve batch across set changes (cross-set batch)
**Target:** v1.0 · **Epic:** Add Cards · **Area:** add-cards · **Type:** bug/behavior · **Gated by:** BL-46 spike

**What:** Changing the selected set in the Add Cards modal must be **non-destructive** — the already-entered batch persists and the user can keep adding cards from the newly selected set. A single batch spans multiple sets until commit. The chip list **and** the verification step **show the set and group by set**.

**Current:** changing set deletes/drops the entered batch.

**Why:** Building a multi-set batch in one session is natural; losing it on set change is a real friction bug.

**Definition of done:** switching sets preserves the batch; a batch can contain cards from multiple sets; chip list + verification group by and label the set.

**Status:** 🔲 Open — v1.0

---

#### BL-62: Add Cards — live card-image preview on entry
**Target:** v1.1 · **Epic:** Add Cards · **Area:** add-cards · **Type:** feature · **Designer candidate** · **Gated by:** BL-46 spike

**What:** Display the card image for the entered card number as a **live preview as the number is typed**. Front only. Jeremy is open to reworking the modal layout to accommodate it.

**Data note:** image URLs already exist (`card_variants.front_image_url`), so this is display/layout, not a data gap.

**Open question:** which image when a card number resolves to multiple variants (resolver ambiguity) — **depends on the BL-46 resolver rethink** (Jeremy is exploring a different experience).

**Definition of done:** entering a card number shows its front image live; the layout accommodates it; ambiguity behavior follows BL-46's resolved experience.

**Status:** 🔲 Open — v1.1

---

#### BL-63: Add Cards — use the card image as the add/won't-add cue (extends BL-62)
**Target:** v1.1 · **Epic:** Add Cards · **Area:** add-cards · **Type:** feature · **Depends:** BL-62 · **Gated by:** BL-46 spike

**What:** Replace the green/red circle indicator with the **card image** as the cue: **addable** → image unaltered / full color; **won't be added** → dulled colors or black & white (desaturated).

**Open question:** what counts as "won't be added" — at cap only, or also invalid card number / ambiguous? (may warrant distinct cues).

**Accessibility:** image-state alone is a weak signal (colorblind users; doesn't say *why*) — pair with a small text/icon companion (e.g. the BL-64 copy, or "invalid number"), not saturation alone.

**Definition of done:** add/won't-add state is conveyed via the card-image treatment + a text/icon companion; the green/red circle is removed.

**Status:** 🔲 Open — v1.1

---

#### BL-64: Add Cards — clearer live inventory feedback (replace "Headroom: 1 of 1")
**Target:** v1.1 · **Epic:** Add Cards · **Area:** add-cards/inventory · **Type:** feature · **Gated by:** BL-46 spike

**What:** Replace the unintuitive "Headroom: 1 of 1" with readable live feedback, e.g. **"Owned 1 → 2 (max 3)"**. Handle edge states: at cap → "Owned 3 (max 3)" (disabled); once soft-cap exists → over cap → "Owned 3 → 4 (over limit)".

**Dependency note:** the "max" value and over-limit behavior tie to **BL-24** (per-variant tenant-configurable limits) and **BL-35** (hard vs. soft cap) — write the copy to accommodate a variable max and an over-limit state even though max is hardcoded 3 today.

**Definition of done:** Add Cards shows owned→projected vs. cap in intuitive copy; edge states handled; copy not hardcoded to "3".

**Status:** 🔲 Open — v1.1

---

#### BL-65: Add Cards — remove extraneous helper copy
**Target:** v1.0 · **Epic:** Add Cards · **Area:** add-cards · **Type:** chore

**What:** Remove the bottom "Enter a card number to begin" text and the helper/subtitle text directly below the "Add Cards" title.

**Why:** UI cleanup; the flow is intuitive enough without them (a help affordance — BL-66 — can carry guidance instead).

**Definition of done:** both copy elements removed.

**Status:** 🔲 Open — v1.0 (independent of the BL-46 spike; safe quick win)

---

#### BL-67: Add Cards — provenance-default bug (JTL #1 → Retail despite collision)
**Target:** v1.0 · **Epic:** Add Cards · **Area:** add-cards (resolver) · **Type:** bug · **Claim:** reported, not yet code-verified

**What:** Reported repro: select set JTL, enter card number 1 → provenance auto-sets to **Retail**, even though other JTL cards exist at card_number 1 (e.g. Weekly Play). An ambiguous card number shouldn't silently default to one provenance.

**Standalone, with a contingency (Jeremy):** kept standalone for now. If the BL-46 resolver rethink is done first, **BL-67 can be deleted** (no longer valid); if the fix is done and the rethink deferred, the fix stands. Order undecided. Verify against `addCardsResolver.ts` + variant data when actioned.

**Definition of done:** ambiguous card numbers don't silently default provenance (or this item is deleted as superseded by BL-46).

**Status:** 🔲 Open — v1.0 (may be retired by BL-46)

---

## Open Questions / Deferred Decisions

These are conversations to pick back up, not work items — recorded so the *reasoning so far* isn't lost.

### A. GitHub Issues for backlog tracking

Jeremy's instinct is to use GitHub Issues for execution-tracking (linked to PRs via "Fixes #N"), but the value of an issue tracker is more aligned to multi-developer environments than this currently-solo project.

**How to apply:** For now, this file (`SWU_Backlog.md`) is the single source of truth for both narrative context and status (`🔲 Open` / `✅ Resolved`). Revisit if/when collaborators join, or if this file grows unwieldy (rough threshold: >20 open items, or items frequently need their own discussion threads).

### B. ADR adoption for "Selection & Comparison" decision records

Discussed adopting lightweight Architecture Decision Records (`docs/adr/NNNN-title.md` — one short, immutable file per major decision: GCP+Terraform, RLS multi-tenancy, Firebase Auth provider selection, tenant-context `set_config` mechanism, Cloud Error Reporting vs. Sentry, atomic-upsert concurrency approach, Dependabot triage deferral, etc.) as the enterprise-aligned home for content currently scattered across the Platform Roadmap's "Open Decisions" log and the Platform Learning Guide's "Selection & Comparison" sections.

**✅ Resolved 2026-06-14 — Inline "Design Rationale" subsections.** `SWU_Platform_Spec.md` (BL-1) contains condensed decision records as inline subsections within the relevant reference section (e.g., Section 1.7 for auth/tenancy decisions, Section 3.13 for infrastructure decisions), rather than a separate `docs/adr/` folder. The full narrative versions remain in `SWU_Platform_Roadmap.md`'s "Open Decisions" log and `SWU_Learning_Guide.md`'s "Selection & Comparison" sections — the spec's inline version is the condensed, durable record; the roadmap/learning guide retain the teaching-oriented version.

**If revisited later:** a `docs/adr/` folder could still be split out from these inline sections if the spec grows unwieldy or a more formal change-history (one immutable file per decision, never edited after the fact) becomes valuable — e.g., if collaborators join (see Open Question A).

### C. Learning Guide backfill for F1-S4

BL-3 retires the docx and renames the platform guide for *future* chapters, but doesn't address whether F1-S4's existing docx chapters — which use a shallower "Key Concepts" format, and (for chapters 6-10) describe a slice structure that doesn't match what was built — get rewritten in the new deeper format.

**How to apply:** Personal-use material, low priority. Revisit if Jeremy wants a consistent reference across all phases; otherwise the docx remains a historical artifact (per BL-3) and only S5-onward gets the deeper treatment.

### D. Intended user flow for auth, catalog, and inventory

Raised 2026-06-17 while discussing BL-17. Jeremy confirmed the app is intended for real ongoing use by other people, not just himself/portfolio viewing — which means decisions like "can a logged-out visitor browse the catalog" shouldn't be made item-by-item, but as part of a deliberate end-to-end picture of how new/returning/anonymous users are meant to move through auth, catalog browsing, and inventory management.

**How to apply:** Before resolving BL-17 (and likely BL-16, email verification), have a dedicated conversation mapping out the intended user flow — who can see what, when signup is required, what happens to an anonymous visitor's intent (e.g. do they get prompted to sign up after browsing?). Once that flow is decided, BL-16/BL-17 become implementation details of it rather than standalone judgment calls.

**✅ Resolved 2026-06-20 (swuapi-first redesign session).** With product scope now fixed to *isolated collectors over one shared catalog* — no trading/sharing/social surfaces (confirmed this session) — the intended user flow is:
- **Anonymous visitor:** browses the Catalog and the S6 card detail popup freely (both public, read-only). Sees the Inventory tab, but clicking it shows a value-prop empty state (lock + "Track your SWU collection" + Sign up / Log in), not the grid. No in-context "track" action exists, so the Inventory tab is the single, deliberate auth wall.
- **New user:** signup auto-provisions a tenant (P5); lands in an empty inventory over the full catalog. No special onboarding needed (deferred as polish; no structural impact).
- **Returning user:** unchanged — authenticated, tenant-scoped inventory exactly as today.
- **Signup is required only to track inventory; catalog browsing never requires an account.**
- **Email verification** deferred to v1.0 (see BL-16).

BL-17 and BL-16 are now implementation details of this flow, each carrying its own decision note. Implementation-time doc updates (`SWU_Platform_Spec.md` §1/§5, `SWU_Platform_Security_Review.md` A01) are tracked under BL-17.

### E. Swuapi-first counterfactual — where would app-goal-driven design choices actually land?

Raised 2026-06-20, immediately after BL-28's addendum (the `variant_of_uuid` discovery) and alongside BL-33/BL-34. Jeremy plans to hold this conversation in a **separate Opus session** specifically because earlier Sonnet sessions analyzing swuapi.com missed a structurally important detail (`variant_of_uuid`) across multiple passes before finding it — see [[feedback_model_choice_deep_analysis]] in memory. The output of that Opus session should be **documented decisions** (in this backlog, in `SWU_Standard_Variant_Mapping_Spec.md`, or wherever the decision naturally belongs) that a later Sonnet session can then execute. This is a design/tradeoff conversation, not an implementation session.

**If you are the Opus session reading this:** the question on the table is *"if swuapi.com had been the catalog data source from the very beginning instead of the TCGPlayer CSV pipeline, would this application's design have ended up differently — and if so, where?"* Jeremy has explicitly said he does **not** know the answer, and does **not** want the conversation pre-narrowed to one layer. Treat all three as equally live:

- **Database/schema** — would the catalog model itself (tables, keys, the `base_cards`/`card_variants` split BL-33 proposes) have looked different if designed swuapi-first rather than retrofitted onto a CSV-shaped schema?
- **Business-rule layer** — would things like per-tenant inventory limits (BL-24), variant-type handling (BL-27), or the standard/exception philosophy (this session's `SWU_Standard_Variant_Mapping_Spec.md`) have been modeled differently, independent of the underlying tables?
- **UI/UX layer** — would catalog browsing, the card detail popup (S6/BL-31/32), or inventory editing (BL-32) have surfaced this data differently if the richer swuapi fields (images, structured text, variant graph) had been assumed available from the start rather than added incrementally?

Jeremy's stated read going in (from the prior Sonnet session, worth treating as a hypothesis to test, not a conclusion): the variant-identity layer (root + `variant_of_uuid`) probably converges to roughly what BL-33 proposes regardless of source — CSV's flat shape is what *forced* the brittle boolean-flag intermediate design, and swuapi-first likely skips that generation entirely rather than landing somewhere truly different. The business-rule and UI layers are the genuinely open question — they're driven by what Jeremy wants the app to *do* for a collector, not by what shape the upstream data happens to come in, so there's no a priori reason they'd be the same regardless of source. Confirm, revise, or discard this hypothesis as the conversation actually develops — don't treat it as the answer.

**How to apply:** Hold this as an open-ended design conversation, not a checklist to execute. Whatever falls out — schema changes, business-rule changes, UI changes, or "actually it converges and nothing changes" — gets written down explicitly (update BL-33 if schema-related, add new backlog items if new work surfaces, update `SWU_Standard_Variant_Mapping_Spec.md` if the standard/exception philosophy itself shifts) so the follow-up Sonnet session has a concrete spec to execute against rather than a conversation to re-derive.
