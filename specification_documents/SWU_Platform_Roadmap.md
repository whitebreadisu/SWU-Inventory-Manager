# SWU Platform Roadmap: Enterprise & Multi-Tenant Transformation

**Version 1.2 | June 2026** — slimmed 2026-06-15 per `SWU_Backlog.md` BL-2; **§7 (Agentic Platform Evolution) added 2026-06-27** as the post-P7 platform track. See `SWU_Platform_Spec.md` for the as-built reference this roadmap cross-references.

---

## 1. Purpose & Relationship to the Application Spec

`SWU_ClaudeCode_Spec.md` defines the SWU Inventory Manager application (V1) and explicitly listed cloud hosting, CI/CD, and multi-tenancy as out of scope. This document defines the **P-phases** — a parallel track of work that takes the existing application and transforms it into a multi-tenant, enterprise-grade application running in a real production environment on Google Cloud Platform (GCP).

Like the application itself, this effort is dual-purpose: (1) produce a real production system, and (2) serve as a structured learning vehicle. A companion document, `learning_guide/SWU_Platform_Learning_Guide.md`, provides chapter-by-chapter concept explanations and external resources for each phase.

**Application feature work is paused for the duration of P1–P7.** This includes S5 (Official Card Images) and the unscoped Decks section. Once the platform reaches a stable state at the end of P7, feature work resumes — and becomes the first "real" features to flow through the now-mature CI/CD pipeline.

**P7 completed 2026-06-14** — all four stages (Dependabot, concurrency-safe upserts, expanded RLS/coverage tests, OWASP/secrets review) done; see the Phase Table and Decision Log below. The platform has reached that stable, audited state — feature work (S5, Decks) is unpaused as of this point.

**Post-P7, a new platform track opened: §7 (Agentic Platform Evolution, 2026-06-27)** — evolving the platform toward agentic engineering workflows, with a cloud dev environment (BL-43) as its first stage.

**Since P7, `SWU_Platform_Spec.md` was created** (`SWU_Backlog.md` BL-1) as the as-built platform reference — auth/tenancy, CI/CD, Terraform, observability, and security, with file/line references precise enough to verify against the code. This document remains the phase-by-phase **history and status tracker**: read it for *when and why* a decision was made; read `SWU_Platform_Spec.md` for *how the system works now*. Section 5 below was condensed accordingly (BL-2) — each resolved decision now points to its as-built reference rather than repeating it.

---

## 2. Foundational Decisions

These decisions were made before phase work begins and shape every phase below.

| Decision | Choice | Rationale |
|---|---|---|
| Cloud provider | **GCP** | Smoothest onramp for the chosen focus areas (IAM model, sensible default networking, well-documented Terraform provider); $300/90-day new-account credit; GCP Projects map cleanly onto the sandbox/production split below |
| Infrastructure as Code | **Terraform** | Industry-standard; best-documented GCP provider; transferable to other clouds |
| Multi-tenancy model | **Shared schema + PostgreSQL Row-Level Security** ("real SaaS-grade isolation") | Database-enforced tenant isolation without the operational overhead of per-tenant databases; RLS works identically on local Postgres and Cloud SQL |
| Cost / environment model | **Hybrid**: persistent minimal production (`swu-prod`) + ephemeral sandbox (`swu-sandbox`) | A real, always-on production app at low cost, while still allowing full access to expensive/complex patterns (load balancers, VPCs, multi-AZ-equivalents) for learning |
| CI/CD | **GitHub Actions**, extended; GCP authentication via **Workload Identity Federation (OIDC)** | No long-lived credentials stored in CI — an enterprise-standard pattern |
| Focus areas — go deep | Cloud infrastructure & IaC, CI/CD & deployment, Observability & operations | Selected as primary learning priorities |
| Focus areas — solid but not exhaustive | Security hardening, Testing strategy | Addressed via a dedicated pass (P7) plus ambient coverage in earlier phases |

---

## 3. Phase Table

| Phase | Deliverable |
|-------|-------------|
| **P1** | **GCP & IaC Foundations** — GCP billing account; `swu-sandbox` and `swu-prod` projects; Terraform state backend (GCS bucket); baseline IAM; Workload Identity Federation configured for GitHub Actions. |
| **P2** | **Production Deploy (current app, as-is)** — current single-tenant app containerized and deployed to `swu-prod` via Terraform: Cloud Run (backend), Cloud SQL for PostgreSQL (seeded from the catalog seed + inventory snapshot), Secret Manager, static frontend hosting. *Milestone: the app is live on the internet.* |
| **P3** | **CI/CD Pipeline** — GitHub Actions extended: test/lint/build → push to Artifact Registry → deploy to `swu-prod` via Terraform, authenticated via OIDC. Branch protection requires CI to pass before merge. *Milestone: a merge to main automatically updates production.* |
| **P4** | **Multi-Tenant Data Model** — `tenants`/`users` tables; `tenant_id` columns on per-user tables; Postgres Row-Level Security policies; tenant-context plumbing in FastAPI (stub/dev header pending real auth); existing inventory becomes tenant #1's data; tenant-isolation test suite. |
| **P5** | **Authentication & Authorization** — auth provider selected and integrated; login/signup/session flows; frontend wiring; identity → `tenant_id` resolution replaces the P4 stub. |
| **P6** | **Observability** — structured (JSON) logging to Cloud Logging; Cloud Monitoring dashboards (request rate, error rate, latency); at least one alerting policy; error tracking. |
| **P7** | **Security & Testing Hardening Pass** — dependency scanning (Dependabot); concurrency-safe inventory updates (atomic backend upserts + frontend race fixes); OWASP Top 10 review against the auth/tenancy surface; expanded integration test suite running against a real RLS-enforcing Postgres; CI coverage gate; secrets/network review. |
| *(ongoing)* | **Sandbox Infrastructure Exploration** — VPC, subnets, firewall rules, load balancing, and compute patterns built, applied, and destroyed in `swu-sandbox`. Not a gating dependency for P1–P7; can be picked up in any order, in any session. |

---

## 4. The Milestones

Three experiential milestones anchor this roadmap — each is a concrete moment where you'll *see* something work, not just read about it:

1. **End of P2 — "It's alive."** The application, as it exists today, is reachable at a real URL, backed by a real managed database, for the first time. **✅ Reached 2026-06-12** — backend at `https://backend-qsolsepaya-uc.a.run.app`, frontend (Firebase Hosting, `/api/**` rewritten to the backend) at `https://swu-prod.web.app`.
2. **End of P3 — "I pushed, and production changed."** A `git push` to main results in an automatic, observable update to the live application — the core "push to prod" experience. **✅ Reached 2026-06-13** — branch protection on `main` requires the `backend`/`frontend` CI checks to pass before merge (PR #5 was the first PR gated by it); a rollback procedure (Cloud Run traffic shift between revisions) was written and demonstrated, then reverted; and a merge to `main` now automatically redeploys *both* halves of the app — the backend (Cloud Run, via Terraform) and the frontend (Firebase Hosting) — confirmed live at `https://swu-prod.web.app` and `https://swu.jeremybradenapps.com`.
3. **End of P5 — "Two people, two inventories."** A second account can log in, see only its own inventory, and that whole change (data model + auth + UI) arrived in production through the P3 pipeline. **✅ Reached 2026-06-14** — two real accounts, created and signed in through `swu.jeremybradenapps.com`'s live auth UI (against the real `swu-prod` Firebase project), each see and manage their own isolated inventory via the inline +/- buttons and Add Cards modal — shipped through the P3 pipeline (commit `44a7dfc`, CI run `27491834926`).

---

## 5. Decision Log (Resolved)

Each decision below was worked through during a specific phase and is now resolved. The *as-built* mechanism each one produced is documented in `SWU_Platform_Spec.md` (condensed "Design Rationale" subsections, per BL-1) or `SWU_Platform_Learning_Guide.md` (full teaching-oriented comparisons). This log keeps the *when* and *what was decided*; follow the cross-references for *how it works* and *what the alternatives were*.

- **P4 — Tenant #1 migration mechanics. ✅ Resolved 2026-06-13.** A single Alembic migration (0017) adds `inventory.tenant_id` via relax → backfill → constrain — the real `swu-prod` backfill to tenant #1, not a rehearsal, since `alembic upgrade head` runs on every container start. See `SWU_Platform_Spec.md` Section 1.5 (migration 0017) and `SWU_Backlog.md` BL-8 (the ongoing migration-on-startup question).
- **P5 — Auth provider selection. ✅ Resolved 2026-06-13.** Firebase Authentication selected over Auth0, Clerk, and Supabase Auth. Full comparison: `SWU_Platform_Spec.md` Section 1.7.4.
- **P4 — `swu_user` bypasses RLS; role split required. ✅ Resolved 2026-06-13.** `swu_user` (the bootstrap/admin role) can never have `BYPASSRLS` removed, so a new least-privilege `swu_app` role (migration 0019) is the only role RLS policies actually apply to. See `SWU_Platform_Spec.md` Section 1.7.2.
- **P4 — Tenant context: `SET` vs `SET LOCAL` for `app.current_tenant_id`. ✅ Resolved 2026-06-13.** Session-scoped `set_config(..., false)`, not transaction-scoped `SET LOCAL`, because `upsert_increment`/`upsert_decrement` span two transactions per request. See `SWU_Platform_Spec.md` Section 1.7.1.
- **P6 — Error tracking provider. ✅ Resolved 2026-06-14.** Cloud Error Reporting selected over Sentry. Full comparison: `SWU_Platform_Spec.md` Section 4.5.1.
- **P7 — Scope of concurrency-safe inventory updates. ✅ Resolved 2026-06-14.** A dedicated P7 stage (Stage 2) — not folded into the testing-expansion stage, not patched ad hoc. `upsert_increment`/`upsert_decrement`'s SELECT-then-mutate-then-commit race and the frontend's missing in-flight guard both got deliberate fixes with dedicated regression tests. Full comparison against the alternatives: `SWU_Learning_Guide.md`'s P7 chapter.
- **P7 — Dependabot PR backlog: triage now vs. defer. ✅ Resolved 2026-06-14.** Documented and deferred to a dedicated future session rather than triaged within P7's Stage 4. See `SWU_Backlog.md` BL-9 and `SWU_Platform_Security_Review.md` (A06) for the current 18-PR state.

---

## 6. Cross-Cutting: Custom Domain & Portfolio (`jeremybradenapps.com`)

Decided 2026-06-13, ahead of P3. Jeremy plans to build 2-5 additional apps over the next 12 months, each reachable via its own subdomain of `jeremybradenapps.com`, alongside a landing page linking to all of them. This is a cross-cutting concern — it touches the P2 Firebase Hosting setup but does not block or belong to any single P-phase.

**Decisions (locked):**

| Decision | Choice | Rationale |
|---|---|---|
| Linking strategy | **Subdomains-as-primary** (e.g., `swu.jeremybradenapps.com`) | Maps directly onto Firebase Hosting's multi-site model; each app stays fully independent — no shared routing layer, no changes to an app's existing frontend base path. Path-based redirects (e.g., `jeremybradenapps.com/swu` → 302 to the subdomain) can be added later via Firebase Hosting `redirects`, at near-zero cost, if desired |
| Domain registrar | **Namecheap** | A pure registrar — delegating nameservers to a different DNS provider is the default workflow, with no bundled DNS/CDN features pulling toward keeping DNS elsewhere (unlike Cloudflare Registrar, whose product is built around Cloudflare also being the DNS host) |
| DNS | **Cloud DNS** (Terraform-managed) | One managed zone for `jeremybradenapps.com` becomes the single source of truth for every app's subdomain records — consistent with the "everything as code" theme of P1-P7 |
| Project structure | **Dedicated `jeremy-portfolio` GCP project** (separate from `swu-prod`), owning the Cloud DNS zone and the portal's Firebase Hosting site (landing page, root domain as custom domain) | Keeps the root domain and landing page out of any single app's isolation boundary. Each app keeps its own `<app>-prod`/`<app>-sandbox` pair (the pattern P1 established) with its own Firebase Hosting site and subdomain custom domain; each app's DNS record(s) are added as `google_dns_record_set` resources in the portfolio project's zone |
| Repo | **Separate repo**, [`whitebreadisu/jeremy-portfolio`](https://github.com/whitebreadisu/jeremy-portfolio) | The portfolio isn't part of the SWU Inventory Manager application; as more apps are built, each may get its own repo, with the portfolio repo as the natural shared home for the root domain and landing page |

**Relationship to P3 and beyond:** The portfolio repo gets its own small, self-contained bootstrap — a "P1-style" setup (new GCP project, billing link, Terraform state bucket, Cloud DNS zone, Firebase project + landing page Hosting site) — independent of SWU's CI/CD work. The only point of contact with this repo: once the portfolio's Cloud DNS zone exists and `jeremybradenapps.com` is delegated to it, SWU gets one small, optional addition — a custom domain (`swu.jeremybradenapps.com`) on `swu-prod`'s existing Firebase Hosting site, plus the matching DNS record in the portfolio's zone. This can happen before, during, or after P3 — it does not touch CI/CD.

**Status: COMPLETE (2026-06-13).** All five bootstrap stages (A-E) are done and live:
- **A-C**: `jeremy-portfolio-prod` GCP project, Cloud DNS zone for `jeremybradenapps.com`, Firebase Hosting landing page
- **D**: `jeremybradenapps.com` mapped as a custom domain on the portal's Hosting site — live at `https://jeremybradenapps.com`
- **E**: `swu.jeremybradenapps.com` mapped as a custom domain on `swu-prod`'s Hosting site — live at `https://swu.jeremybradenapps.com`; the portal's landing page links here

Nothing from this cross-cutting work blocks P3 or any later P-phase.

---

## 7. Agentic Platform Evolution (post-P7 track)

**Added 2026-06-27.** A new platform track — the natural successor to P1–P7 — biased toward **agentic engineering workflows**: humans set policy and review; agents execute. Unlike P1–P7 (a fixed phase sequence), this is a *direction* with staged increments, each justified by safety and value, not autonomy for its own sake. The architectural concepts behind this track — environment ladder, build-once law, release gate mechanics, spec-quality ceiling, autonomy tiering, gate progression — are documented in `docs/decisions/agentic-platform-concepts.md`; heavyweight decisions are ADRs (`docs/decisions/0006`, `0007`, …).

### 7.1 Thesis
The platform is evolving toward a model where **humans set policy and review; agents execute** — progressing from supervised agents (work up to a PR / a gate) toward agents that ship low-risk changes within policy while humans handle judgment, design, and exceptions. The operating pattern is **Opus orchestrates, Sonnet builds**: an Opus session plans, spawns Sonnet implementation agents, reviews their work for quality and safety, and assembles approval-ready evidence; the human is the final approver.

### 7.2 Governing principles (the "laws")
1. **Spec quality is the autonomy ceiling.** An agent runs autonomously only as far as the DoD is crisp and machine-verifiable. Raise the ceiling by writing better specs + verification, not by waiting for better models.
2. **A gate decouples agent-scope from prod-risk.** An enforced release gate lets you grant *more* agent autonomy without letting *more* risk reach users — the two dials turn independently.
3. **You can thin the gate only as fast as detect + undo improves.** A lighter gate is tolerable only with fast detection (observability/alerting) and cheap reversal (rollback).
4. **A tier or gate earns its place by catching a failure class nothing else catches.** Don't add environments/gates by ladder-completion instinct.
5. **Build once, promote the same artifact.** Never rebuild per environment; the tested artifact and the shipped artifact must be the same bytes.
6. **plan-safe, apply-gated.** Agents may run `terraform plan` (read-only) freely; `terraform apply` to cloud infra is always human-gated. The plan *is* the approval artifact.
7. **Single source of truth, point don't copy.** Narrative lives once (backlog); execution status lives once (Issues/board); decisions live once (ADRs). Each layer points, never duplicates.

### 7.3 Current enablers & gaps
**Already built:** the P1–P7 CI/CD pipeline; test discipline (coverage floor + port/replace/retire rule); keyless WIF auth; P6 observability (the *detection* half of principle 3); Cloud Run revision rollback (the *undo* half); the Opus/Sonnet pattern; and the hybrid work registry (backlog + GitHub Issues/board).

**Missing (to climb the autonomy spectrum):** a cloud **dev environment** (BL-43, *current priority*); a **build-once/promote pipeline with a gated prod release**; **automated rollback + tighter alerting**; a **risk-tiered gating policy**; and eventual **automated prod-fidelity checks** (canary / staging, added only when triggers fire).

### 7.4 Staged roadmap (direction, not commitments)
| Stage | State |
|-------|-------|
| **0 — Supervised-to-PR** *(now)* | Agents build to an open PR; human reviews/merges. Tier A/B v1.0 issues are the proving ground. |
| **1 — Dev environment** | Stand up `swu-dev` (new project; sandbox left dormant for its original experimentation intent). Agents deploy to dev and verify on a live URL. **= BL-43, epic #63 + phases #64–#70.** |
| **2 — Build-once + promote + prod gate** | One artifact built on merge to `main`, auto-deployed to dev, promoted to prod behind a GitHub Environment approval. Agent assembles the approval packet; human approves. |
| **3 — Risk-tiered gating** | Low-risk change classes auto-promote on green CI + dev smoke; the human gate fires only for high-blast-radius changes (auth, migrations, infra). |
| **4 — Automated prod-fidelity + rollback** | Canary (Cloud Run traffic-split) and/or staging substitute for the human gate on routine changes; fast automated rollback catches misses. |
| **5 — Autonomous within policy** *(aspirational)* | Human moves from "approve each release" to "set policy and monitor." |

### 7.5 Open decisions
- **Branch/promotion mechanics** — exact GitHub Environments config, where the approval lives, which branch may deploy to prod (refined during BL-43 Phase 6).
- **Risk-tier classification** — what counts as "low-risk auto-promotable" vs. "must review" (Stage 3).
- **When canary/staging enters** — the trigger conditions in ADR-0007 / the CD learning guide §5.

### 7.6 Relationships
- **BL-43** (cloud dev environment) is Stage 1 and the immediate work — tracked as **epic #63** with phase sub-issues **#64–#70** (milestone `two-dev experiment`).
- **ADR-0006** (dedicated `swu-dev`) and **ADR-0007** (build-once/promote) are this track's foundational decisions.
- The **Sandbox Infrastructure Exploration** row in the Phase Table (§3) is the dormant `swu-sandbox` slot ADR-0006 preserves — this track deliberately does *not* repurpose it.
- **Platform-generator idea** (future): extracting the shared Terraform module in BL-43 Phase 2 is the "hand-extract before automating" validation step for a future reusable internal developer platform.

---

*— End of Platform Roadmap —*
