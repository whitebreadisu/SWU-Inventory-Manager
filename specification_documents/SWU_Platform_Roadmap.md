# SWU Platform Roadmap: Enterprise & Multi-Tenant Transformation

**Version 1.0 | June 2026**

---

## 1. Purpose & Relationship to the Application Spec

`SWU_ClaudeCode_Spec.md` defines the SWU Inventory Manager application (V1) and explicitly listed cloud hosting, CI/CD, and multi-tenancy as out of scope. This document defines the **P-phases** — a parallel track of work that takes the existing application and transforms it into a multi-tenant, enterprise-grade application running in a real production environment on Google Cloud Platform (GCP).

Like the application itself, this effort is dual-purpose: (1) produce a real production system, and (2) serve as a structured learning vehicle. A companion document, `learning_guide/SWU_Platform_Learning_Guide.md`, provides chapter-by-chapter concept explanations and external resources for each phase.

**Application feature work is paused for the duration of P1–P7.** This includes S5 (Official Card Images) and the unscoped Decks section. Once the platform reaches a stable state at the end of P7, feature work resumes — and becomes the first "real" features to flow through the now-mature CI/CD pipeline.

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
| **P7** | **Security & Testing Hardening Pass** — dependency scanning (Dependabot); OWASP Top 10 review against the auth/tenancy surface; expanded integration test suite running against a real RLS-enforcing Postgres; CI coverage gate; secrets/network review. |
| *(ongoing)* | **Sandbox Infrastructure Exploration** — VPC, subnets, firewall rules, load balancing, and compute patterns built, applied, and destroyed in `swu-sandbox`. Not a gating dependency for P1–P7; can be picked up in any order, in any session. |

---

## 4. The Milestones

Three experiential milestones anchor this roadmap — each is a concrete moment where you'll *see* something work, not just read about it:

1. **End of P2 — "It's alive."** The application, as it exists today, is reachable at a real URL, backed by a real managed database, for the first time. **✅ Reached 2026-06-12** — backend at `https://backend-qsolsepaya-uc.a.run.app`, frontend (Firebase Hosting, `/api/**` rewritten to the backend) at `https://swu-prod.web.app`.
2. **End of P3 — "I pushed, and production changed."** A `git push` to main results in an automatic, observable update to the live application — the core "push to prod" experience. **✅ Reached 2026-06-13** — branch protection on `main` requires the `backend`/`frontend` CI checks to pass before merge (PR #5 was the first PR gated by it); a rollback procedure (Cloud Run traffic shift between revisions) was written and demonstrated, then reverted; and a merge to `main` now automatically redeploys *both* halves of the app — the backend (Cloud Run, via Terraform) and the frontend (Firebase Hosting) — confirmed live at `https://swu-prod.web.app` and `https://swu.jeremybradenapps.com`.
3. **End of P5 — "Two people, two inventories."** A second account can log in, see only its own inventory, and that whole change (data model + auth + UI) arrived in production through the P3 pipeline.

---

## 5. Open Decisions (Deferred to Specific Phases)

- **P4 — Tenant #1 migration mechanics. ✅ Resolved 2026-06-13.** Both, sequenced — not an either/or. A single Alembic migration adds `inventory.tenant_id` via relax → backfill → constrain, backfilling `swu-prod`'s real inventory rows to a newly-created tenant #1; because `alembic upgrade head` runs on every Cloud Run container start, this is the actual production backfill, not a rehearsal. `db/snapshots/inventory_snapshot.sql` is then regenerated to include `tenant_id`, keeping CI and fresh local databases in sync. A `users` table is deferred to P5, where real auth gives its rows a purpose. See `SWU_Platform_Learning_Guide.md`'s P4 chapter for the full reasoning.
- **P5 — Auth provider selection. ✅ Resolved 2026-06-13.** Firebase Authentication (the free tier of GCP Identity Platform) selected — it's the same Firebase project already used for Hosting (P2), has a mature React SDK, and offers a free tier with no practical cap for email/password sign-in at this scale. A full pros/cons comparison against Auth0, Clerk, and Supabase Auth — covering cost, GCP-native integration vs. portability, and frontend developer experience — is recorded in `SWU_Platform_Learning_Guide.md`'s P5 chapter for later review.
- **P4 — `swu_user` bypasses RLS; role split required. ✅ Resolved 2026-06-13.** Stage 2 found that `swu_user` (the `POSTGRES_USER`/Cloud SQL admin role, and `initdb`'s bootstrap superuser locally) has `BYPASSRLS` and can never have it removed — `ALTER ROLE ... NOSUPERUSER` is refused outright for the bootstrap role. `FORCE ROW LEVEL SECURITY` alone is therefore not enough. Resolution: a new least-privilege `swu_app` role (migration `0019`) is the only role RLS ever actually applies to; `swu_user` remains the migration-running admin. This also required adding `APP_DB_PASSWORD` as a Cloud Run env var (`terraform/environments/prod/secrets.tf`/`cloud_run.tf`) so migration `0019` doesn't crash the next `swu-prod` deploy. See `SWU_Platform_Learning_Guide.md`'s P4 Stage 2 for the full reasoning.
- **P4 — Tenant context: `SET` vs `SET LOCAL` for `app.current_tenant_id`. ✅ Resolved 2026-06-13.** Stage 3's original framing (a dev-only `X-Tenant-Id` header → `SET LOCAL app.current_tenant_id` per request) assumed one transaction per request. But `upsert_increment`/`upsert_decrement` call `db.commit()` then `db.refresh(inv)` — two transactions per request — and `SET LOCAL`/`set_config(..., true)` reverts at `COMMIT`, so the `refresh()` transaction would see `app.current_tenant_id` unset and fall back to tenant #1 via the Stage 2 `COALESCE` bridge. Resolution: `get_db()` uses session-scoped `set_config('app.current_tenant_id', tenant_id, false)` instead — set once per request, persisting across commits until the connection is returned to the pool. See `SWU_Platform_Learning_Guide.md`'s P4 Stage 3 for the full reasoning.

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

*— End of Platform Roadmap —*
