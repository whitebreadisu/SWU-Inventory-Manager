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
2. **End of P3 — "I pushed, and production changed."** A `git push` to main results in an automatic, observable update to the live application — the core "push to prod" experience.
3. **End of P5 — "Two people, two inventories."** A second account can log in, see only its own inventory, and that whole change (data model + auth + UI) arrived in production through the P3 pipeline.

---

## 5. Open Decisions (Deferred to Specific Phases)

- **P4 — Tenant #1 migration mechanics.** The exact mechanism for converting the existing single-tenant inventory snapshot into "tenant #1's" data (e.g., a one-time backfill migration vs. seed-time assignment) will be decided when P4 begins.
- **P5 — Auth provider selection.** GCP Identity Platform vs. a third-party provider (Auth0, Clerk, Supabase Auth) requires its own focused discussion, weighing cost (most have generous free tiers at hobby scale), GCP-native integration vs. portability, and frontend developer experience. Deferred to the start of P5.

---

*— End of Platform Roadmap —*
