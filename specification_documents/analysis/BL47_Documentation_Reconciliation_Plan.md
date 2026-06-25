# BL-47 — Documentation Reconciliation Plan

> **Status:** ✅ Executed 2026-06-24 — phases 0–5 complete (branch `docs/bl47-recon-phases-0-1-4`). This is the auditable disposition record for BL-47. Spillover tracked as BL-48 (learning-guide rationalization) and BL-49 (absorb API/ingestion/architecture into the Application Spec); memory cleanup is the remaining deferred follow-up.
> **Owner decisions:** all dispositions below were reviewed and accepted by Jeremy in the planning conversation of 2026-06-23.
> **Location:** moved to `specification_documents/analysis/` as the BL-47 disposition log; BL-47 closed in `SWU_Backlog.md`.

---

## 1. Context & goals

The documentation set grew into a web of cross-referencing files where it's no longer clear what is current, stale, or duplicative (BL-47). This plan reconciles it against four goals: (1) onboarding a future developer, (2) portfolio quality for engineers, (3) token-efficiency for Claude Code sessions, (4) practicing good documentation standards.

**Guiding principles adopted this session:**
- **Name docs for their role, not the moment** that produced them ("redesign" → "Application"). Version via in-doc `Last updated` + changelog + git tags, **never** in filenames.
- **Single source of truth + cheap navigation.** Each fact/decision lives in exactly one place; everything else points to it. Three non-overlapping layers: README (human front door) / CLAUDE.md (agent routing — addresses, not content) / specs (content, once).
- **A doc earns separation** when it has an independent reason to change, an independent reason to be read, or multiple consumers. Otherwise fold it in. Records/analyses → `analysis/` (linked); reference data with its own cadence/consumers → its own file.
- **Outstanding work lives only in the backlog;** everywhere else points to a BL-ID.

## 2. Per-file disposition table

**Dispositions:** Keep · Update · Freeze · Rename · Move · New

### Repo root
| File | Disposition | Notes |
|---|---|---|
| `README.md` | Update | Expand Documentation Map into an authority table; point to CLAUDE.md routing block |
| `CLAUDE.md` | Update | Add lean "where to look" routing block; update the `redesign spec` alias → `SWU_Application_Spec.md` |
| `frontend;F/` | Delete | Empty accidental directory, untracked |

### `specification_documents/` — durable specs (stay top-level)
| File | Disposition | Authority domain |
|---|---|---|
| `SWU_Catalog_Redesign_Spec.md` | **Rename → `SWU_Application_Spec.md`** + Update | Application hub: data model, API, UX, ingestion. `git mv` to preserve history; broaden from "redesign" to as-built; port still-true API/ingestion detail from the frozen ClaudeCode spec |
| `SWU_ClaudeCode_Spec.md` | **Freeze** (header banner) | Historical V1 design record; banner: "Frozen — original V1 design; superseded by SWU_Application_Spec.md" |
| `SWU_Platform_Spec.md` | Keep | Platform/infra/auth/CI/observability/security (as-built) |
| `SWU_Platform_Roadmap.md` | Keep | Platform history (P1–P7) |
| `SWU_Platform_Security_Review.md` | Keep | Security posture detail |
| `SWU_Backlog.md` | Update | Single work registry (absorbs scattered items) |
| `SWU_Standard_Variant_Mapping_Spec.md` | Keep | Variant mechanism (subsystem spec) |
| `swuapi_standard_variant_exceptions.md` | Keep | Current variant exceptions (generated lookup; 3 consumers) |
| `CARD_RULES.md` | Keep | Card catalog domain rules (enforced by `backend/app/tests/test_card_domain_rules.py`) |

### `specification_documents/analysis/` — tracked supporting evidence (NEW folder)
| File | Disposition | Reason |
|---|---|---|
| `BL27_Variant_Census_2026-06-21.md` | Move here | Evidence behind the variant model; shows rigor; orphaned (no live link) but worth retaining |
| `BL33_Step1_Test_Disposition_Log.md` | Move here | A record, not a spec dependency. App Spec links to it as "the auditable record" |
| `CSV_Analysis.md` | Move here | Historical source-data analysis (F3 pre-work, old TCGPlayer CSV pipeline, pre-swuapi). Link from ADR-0002 |

### `working/` — gitignored, point-in-time (NEW folder)
| File | Disposition |
|---|---|
| `BL29_Sonnet_Kickoff_Prompt.md` | Move (session scaffolding) |
| `swuapi_standard_variant_exceptions_review_2026-06-21.md` | Move (point-in-time review, conclusions folded into the live list) |
| `Screen changes and popups during redesign.pdf` / `.vsdx` | Move (visual working files) |
| `card popup example.PNG` | Move |

### Personal, gitignored — no repo changes this pass
`learning_guide/` and `learning_journal/` stay as-is. Two follow-ups parked (§6).

## 3. New artifacts to create
- `working/` folder + `.gitignore` entry (`working/`).
- `specification_documents/analysis/` folder (tracked).
- `SWU_Application_Spec.md` — via `git mv` of the redesign spec, then broaden/reconcile. Add header block:
  ```
  > Status: Authoritative — current as-built application reference
  > Supersedes: SWU_ClaudeCode_Spec.md (frozen — original V1 design)
  > App milestone: v0.x, approaching v1.0
  > Last updated: <date>
  ```
  plus a short changelog at the bottom.
- `docs/decisions/` (repo-root, conventional ADR location) with `0000-template.md` and three backfilled ADRs:
  - **ADR-0001** — RLS tenant isolation (P4/P5).
  - **ADR-0002** — CSV → swuapi rewrite incl. DB changes; links to `analysis/CSV_Analysis.md`.
  - **ADR-0003** — Two-axis variant model (finish × provenance). *This is the worked example to supersede later when the variant model is revised.*

## 4. Authority map (lands in README; condensed in CLAUDE.md)
| Domain | Authoritative source |
|---|---|
| Setup / onboarding | `README.md` |
| Agent routing / conventions | `CLAUDE.md` |
| Application (data model, API, UX, ingestion) | `SWU_Application_Spec.md` |
| Variant mechanism | `SWU_Standard_Variant_Mapping_Spec.md` (+ exceptions list) |
| Card domain rules | `CARD_RULES.md` |
| Platform / infra / security | `SWU_Platform_Spec.md` (history → Roadmap; detail → Security Review) |
| Outstanding work | `SWU_Backlog.md` |
| Decisions & rationale | `docs/decisions/` (ADRs) |
| Supporting analysis | `specification_documents/analysis/` |
| Design assets | `claude_design/` |
| Personal (gitignored) | `learning_guide/`, `learning_journal/` |

## 5. Execution order (commit per phase; nothing pushed until reviewed)
0. **Hygiene & scaffolding** — delete `frontend;F/`; create `working/` + `analysis/` + `docs/decisions/`; add `working/` to `.gitignore`.
1. **File moves** — visuals + scaffolding → `working/`; census/log/CSV-analysis → `analysis/` (`git mv` the tracked ones).
2. **Freeze + rename** — banner ClaudeCode spec; `git mv` redesign → `SWU_Application_Spec.md`; broaden + reconcile (port still-true API/ingestion from frozen spec); update CLAUDE.md alias.
3. **Backlog consolidation** — sweep the ~42 work-need markers across 6 specs (promote real deferrals to BL-IDs, leave legitimate scope-boundary prose); graduate triage Bucket-3 #2/#3/#9 from the gitignored rubric into BL-entries; specs point to BL-IDs.
4. **ADRs** — create template + the 3 backfills; adopt the trigger rubric (§7) going forward.
5. **Authority map** — README table + CLAUDE.md routing block; fix stale cross-refs across the set.
6. **Close BL-47** (status + move this doc to `analysis/`); then **memory cleanup** pass (deferred until after implementation, per Jeremy).

## 6. Parked follow-ups
- **BL-48 — Learning guide rationalization** (created this session). The main `SWU_Learning_Guide.md` is significantly stale and per-session standalone guides have accumulated; personal/gitignored, its own effort.
- **Memory cleanup** — `MEMORY.md` + memory files; deferred to *after* this plan is implemented.

## 7. ADR trigger rubric (going-forward practice)
Write an ADR when a decision is *most* of: (1) structural / cross-cutting (data model, security boundary, integration, repeated pattern); (2) expensive to reverse; (3) had live alternatives that were weighed; (4) future-you would ask "why is it this way?". Not for routine/reversible choices. Healthy projects have ~a dozen, not a hundred.

**Responsibility:** Claude proactively flags ADR-worthy moments in-session (names the candidate + one-line why); Jeremy approves/declines. Piggybacks on the existing pattern where an architectural `AskUserQuestion` already produces a "Selection & Comparison" learning-guide writeup — that same moment now also yields a repo ADR. **Superseding:** never edit an accepted ADR; write a new one whose Context references the old, and flip the old one's Status to `Superseded by ADR-NNNN`.

## 8. Open items to confirm during execution (surface, don't guess)
- Exact section reconciliation when broadening the redesign spec into the Application Spec (which API/ingestion sections to port from the frozen ClaudeCode spec).
- Which of the ~42 spec markers are real deferred work (→ BL-IDs) vs. legitimate scope-boundary prose (leave).

## 9. Related learning material
`learning_guide/SWU_Learning_Guide_Documentation_2026-06-23.md` (personal/gitignored) — deep-dive on ADRs, agent-friendly/token-sensitive docs, and documentation frameworks (C4, arc42, Diátaxis, 4+1, RFC/design docs, docs-as-code, Keep a Changelog/SemVer, Zettelkasten). Written this session as the teaching companion to this plan.
