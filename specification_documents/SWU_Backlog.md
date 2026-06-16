# SWU Inventory Manager — Backlog

**Created:** 2026-06-14
**Purpose:** Tech-debt, refactoring, and documentation work identified at the close of the P1-P7 platform track, before S5/Decks feature work resumes. This is the durable record of *why* each item exists — narrative context lives here, not in an issue tracker (see "Open Questions" item C).

## How to use this document

- Items are grouped into **tiers** reflecting sequencing/priority, not raw urgency — Tier 1 is foundational for everything after it.
- Each item has a short ID (`BL-1`...`BL-17`) for stable cross-referencing (commit messages, future issues, etc.).
- When an item is picked up, do the work via a normal PR/commit, then mark the item `✅ Resolved YYYY-MM-DD — <commit/PR>` in place. Don't delete resolved items — this mirrors how `SWU_Platform_Roadmap.md` handles "Open Decisions."
- The **Open Questions / Deferred Decisions** section at the bottom captures things explicitly *not yet decided* — conversations to pick back up, not work items.

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

**Status:** 🔲 Open

---

### BL-15: Observability walkthrough — dashboards and logs, guided

**What:** A hands-on session where Jeremy opens the live `swu-prod` Cloud Monitoring dashboard (`SWU_Platform_Spec.md` Section 4.2), Cloud Logging's structured JSON entries (Section 4.1), the "any 5xx for 60s" alert policy (Section 4.3), and Cloud Error Reporting (Section 4.4), with Claude explaining what each view shows, how to read it, and which code produces it. Where useful, Claude can pull the same data via `gcloud logging read` / `gcloud monitoring` from the CLI alongside the console views.

**Why:** P6 built all of this, but Jeremy hasn't had a session focused on actually *using* it — a dashboard or alert is only useful once you know how to read it. This is the natural "go use what we built" follow-up to P6.

**Definition of done:** Session held; Jeremy can navigate to and interpret the dashboard, a structured log entry, and (if one exists) an Error Reporting group.

**Status:** 🔲 Open

---

## Tier 3 — Tooling Investment

No linting or formatting tooling exists anywhere in this repo today (confirmed via grep — no ruff/black/mypy/flake8 in backend, no ESLint/Prettier in frontend `package.json`). The codebase is currently clean (zero TODO/FIXME markers found), which makes this a good time to establish a baseline before S5/Decks add surface area.

### BL-6: Backend linting/formatting

**What:** Add a linter/formatter to `backend/requirements.txt` (dev extras) and wire it into `.github/workflows/ci.yml` as a check. Likely candidate: **ruff** (lint + format in one tool, fast, increasingly the default choice for new Python projects) — decide specifics at execution time.

**Why:** No backend lint/format tooling exists. Establishing one now, while the codebase is small and clean, is far cheaper than retrofitting after S5/Decks.

**Definition of done:** Tool configured, CI step added, existing code passes (or is reformatted in one pass with a clearly-labeled commit).

**Status:** 🔲 Open

---

### BL-7: Frontend linting/formatting

**What:** Add ESLint + Prettier (or an all-in-one alternative like Biome) to `frontend/package.json`, configure for React/TypeScript, wire into CI.

**Why:** Same rationale as BL-6 — no lint/format tooling exists despite a substantial component library already built (`FilterPanel`, `AddCardsModal`, etc.).

**Definition of done:** Tooling configured, CI step added, existing code passes/is reformatted.

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

**Status:** 🔲 Open

---

### BL-9: Dependabot PR backlog triage

**What:** 18 open Dependabot PRs (#8, #9, #11-#27).
- 13 pass CI as-is.
- 5 fail (#9, #19, #21, #22, #24 — major-version bumps to `pytest`, `pytest-asyncio`, `vitest`, `@vitejs/plugin-react`) and need individual investigation (likely breaking API changes).
- Check #11/#12 (multi-package bumps: `vite`/`@vitejs/plugin-react`/`vitest`/`esbuild`) for overlap with #21/#24 (single-package bumps for the same libraries) before merging both.

**Why:** Explicitly deferred from P7 Stage 4 to "a dedicated future session" — recorded in `SWU_Platform_Security_Review.md` (A06). None of the 18 PRs touch a library with an open security alert; this is routine version-update backlog, not an unaddressed CVE.

**Definition of done:** Passing PRs merged (or closed if redundant with another PR), failing PRs individually investigated and either fixed+merged or closed with a documented reason.

**Status:** 🔲 Open

---

### BL-16: Authentication hardening — email verification on signup

**What:** `frontend/src/screens/auth/AuthScreen.tsx` calls `createUserWithEmailAndPassword(auth, email, password)` on signup (line 38) with no follow-up `sendEmailVerification()` call, and nothing in the frontend checks `user.emailVerified`. On the backend, `verify_firebase_token` (`backend/app/auth.py`) accepts any validly-signed Firebase ID token regardless of the `email_verified` claim. Investigate adding an email-verification step to the signup flow, and decide what — if anything — should be gated on it.

**Why:** Jeremy noticed Firebase sends a "verify your email" message on signup, but the app currently does nothing with that signal: any syntactically-valid email can sign up, get auto-provisioned a tenant (P5's "one user, one tenant"), and use the full app immediately. Worth a deliberate decision, even for a small personal-use app, rather than an accidental gap.

**Definition of done:** Either (a) verification is enforced somewhere in the flow — e.g., the frontend calls `sendEmailVerification()` after signup and/or the backend checks `decoded.get("email_verified")` before allowing certain actions, with a regression test — or (b) the current "no verification required" behavior is confirmed and documented as an accepted trade-off in `SWU_Platform_Spec.md` Section 1 and `SWU_Platform_Security_Review.md`.

**Status:** 🔲 Open

---

### BL-17: Concept — public catalog view, auth-gated inventory

**What:** Investigate allowing the catalog endpoints — `GET /api/cards`, `GET /api/cards/{card_id}`, `GET /api/sets`, `GET /api/sets/{set_code}` — to be called without authentication, so a logged-out visitor can browse the Catalog screen, while `GET /api/inventory` and the increment/decrement endpoints remain authenticated and tenant-scoped exactly as today.

**Why:** Catalog data has no `tenant_id` and no RLS policy — it's identical for every user (`SWU_Platform_Spec.md` Section 1.5). Today, `Depends(get_db)` enforces authentication uniformly across *every* `/api/*` route, including catalog reads — a deliberate choice recorded in `SWU_Platform_Security_Review.md` (A01) and `SWU_Platform_Spec.md` Section 5.1: *"even though `cards` is shared catalog data... every `/api/*` route requires authentication uniformly, not just tenant-scoped ones."* This item revisits that choice: would letting visitors browse the catalog before signing up be worthwhile, and if so, what's the smallest change that achieves it without weakening the inventory/tenancy guarantees?

**Design tension to resolve when picked up:** would need a second, non-authenticating dependency for the catalog routers (distinct from `get_db`); `frontend/src/App.tsx`'s auth gate (P5 Stage 3 — currently renders only `AuthScreen` when signed out) would need to render the Catalog screen in the signed-out state too; and `SWU_Platform_Spec.md` Section 1/5 plus `SWU_Platform_Security_Review.md` A01 would need updating to describe the new (intentional) asymmetry between catalog and inventory routes.

**Definition of done:** Either implemented (new non-auth dependency for catalog routers, frontend auth-gate updated, docs updated, tests covering both authenticated and unauthenticated catalog access) or explicitly decided against with the rationale recorded here.

**Status:** 🔲 Open

---

## Tier 5 — Opportunistic / Low Priority

### BL-10: `card_keywords` / `sub_text` / `is_unique` data gaps

**What:** `card_keywords` table exists (migration 0016) but is unpopulated — no source for keyword data was found in the TCGPlayer CSVs. `card_details.sub_text` and `card_details.is_unique` are reserved columns, also unpopulated — no data source identified.

**Why:** Documented as "known data gaps" in `SWU_ClaudeCode_Spec.md` Section 4.5 since the S1 UI session. No current consumer needs this data.

**Definition of done:** Either a data source is found and a backfill script written, or explicitly marked "out of scope indefinitely." If S5's swuapi.com integration happens to surface keyword/unique-card data as a side effect, revisit then.

**Status:** 🔲 Open

---

### BL-11: Local cleanup — `tcgcsv_files/` and `personal_card_inventory/`

**What:** 14 source CSVs (F3 ingestion inputs) and the old Excel tracker + Excel lock file (F4 ingestion input) are still present on disk locally, though both are untracked by git. Per spec, source files are "discarded after successful import" — both F3 and F4 have long since completed and been superseded by the catalog seed (F4) and inventory snapshot (F5).

**Why:** Pure local housekeeping, zero repo impact. Lowest priority — flagging for awareness, not a task that needs a session.

**Definition of done:** Jeremy deletes locally whenever convenient.

**Status:** 🔲 Open

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
