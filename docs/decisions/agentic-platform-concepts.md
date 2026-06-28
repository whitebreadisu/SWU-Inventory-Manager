# Agentic Platform — Concepts Reference

This document captures the architectural concepts that underpin ADR-0006 (dedicated dev environment), ADR-0007 (build-once/promote), and `SWU_Platform_Roadmap.md §7` (agentic platform evolution). It is the tracked substitute for two personal learning guides that were cited but not committed. Read this for the *reasoning* behind those decisions; read the ADRs for the *decisions themselves*.

---

## 1. The environment ladder

Each tier exists to catch a specific failure class. A tier earns its place only when it catches failures that no cheaper tier catches — otherwise it is overhead, not safety.

| Tier | Question it answers | Failure class it catches |
|------|--------------------|---------------------------------|
| **local** | Does the code run on my machine? | Logic bugs; fast inner-loop iteration |
| **dev** | Does it work in a *real cloud* environment? | Cloud-specific failures invisible to local Docker (§2) |
| **staging** | Is *this exact candidate* safe at prod fidelity? | Release-specific risk: prod-scale data, real integrations, release mechanics (§5) |
| **prod** | Does it work for real users? | The real world |

The principle applies recursively: you do not add staging because "real projects have staging." You add it when you can name the failure class it uniquely catches and the cost is bearable. The same principle governs removing a tier: if dev and prod would catch the same class, dev is waste.

---

## 2. Why dev is not just another local

A local Docker stack and a cloud dev environment answer *different* questions, because a whole class of failures is structurally invisible to local containers:

- **Managed Postgres vs. local Postgres.** Cloud SQL uses IAM-authenticated connections via the Cloud SQL Auth Proxy, has real connection limits, and behaves differently under the `alembic upgrade head`-on-every-cold-start pattern. A local `postgres:16` container reproduces none of this.
- **Cloud Run cold starts.** The multi-second first-request latency after scale-to-zero, and anything in the container's startup path (migrations, seed checks), only exist in a real Cloud Run service.
- **Firebase Auth as a real external.** The local emulator is not the real Identity Platform — token issuance, the `email_verified` claim, authorized domains, and per-project SDK config are live-service concerns.
- **RLS / tenancy under pooled connections.** The `set_config('app.current_tenant_id', …)` mechanism and RLS policies behave against a real pooled connection in ways a single-user local session can mask.
- **Secret Manager wiring.** `DATABASE_URL`/`APP_DB_PASSWORD`/`APP_DATABASE_URL` sourced from Secret Manager into Cloud Run, not from a local `.env`.

Local answers "is my logic right?" Dev answers "does my logic survive contact with the actual platform?" Those are different questions; dev is not redundant with local — it catches a class local cannot.

**Empirical evidence:** the dev environment's first clean apply in BL-43 Phase 3 immediately surfaced two latent bugs that production had been running with for months, both structurally invisible to the incremental prod build: a missing `depends_on` on secret version resources (race on clean apply), and `deletion_protection=true` (provider default) blocking resource recovery. Dev caught both before any user saw them.

---

## 3. GCP project IDs are immutable

A GCP project's *display name* can change freely, but the *project ID* is permanent for the life of the project. The ID is baked into the Firebase Hosting URL (`<id>.web.app`), Terraform state bucket convention, Workload Identity principal paths, and every `var.project_id` reference. "Rename this project" is not possible — only creating a new project yields a project that *is* the new name. See ADR-0006 for how this shaped the swu-sandbox vs. swu-dev decision.

**Bootstrap chicken-and-egg:** a Terraform GCS state backend requires its bucket to exist before `terraform init`. Standing up any new environment needs a small pre-step (create project → link billing → create state bucket) that Terraform cannot do for itself.

---

## 4. Build-once / promote — the law and why

Two delivery models were considered for routing code through environments. See ADR-0007 for the decision; this section records the comparison that informed it.

**Model A — Branch-per-environment.** A long-lived `dev` branch deploys to dev; `main` deploys to prod. Each branch builds its own image.

**Model B — Build once, promote the artifact.** Short-lived feature branches merge to a single trunk. On merge, the image is built exactly once and auto-deployed to dev; the *same SHA-tagged image* is then promoted to prod behind an approval gate.

The industry consensus (DORA/*Accelerate*, Google "Modern CD", the CD Foundation) lands firmly on Model B:

> **Build the artifact once, then promote that same artifact through environments. Never rebuild per environment.**

If dev and prod each build their own image, the tested artifact and the shipped artifact are not bit-identical — dependencies resolve differently, caches diverge, transitive versions drift. The entire value of having a dev tier (knowing that what passed in dev is what will run in prod) disappears. Build-once is the mechanism that preserves it.

| | Model A — Branch-per-env | Model B — Build-once + promote |
|---|---|---|
| Artifact integrity | ❌ rebuilds per env; tested ≠ shipped | ✅ same artifact to every env |
| Branch model | Long-lived `dev`/`release` branches | Trunk-based; short-lived feature branches |
| Enterprise alignment | Common starter pattern; now legacy | **The modern standard** |
| Setup complexity | Lower | Moderate (gated promote step) |
| Verdict | Valid stepping stone | The target |

---

## 5. When staging is justified — and the cheaper alternative

Staging catches a distinct failure class from dev: *release-specific* risk at prod fidelity (same tiers/data/config as prod, a stable QA/UAT target, prod-scale migration rehearsal, real integrations, release mechanics). That class becomes live under these conditions:

1. Real users + prod-shaped data volume (migrations/perf at scale have real risk)
2. Need for a stable demo/UAT target distinct from a churning dev
3. Prod-like third-party integrations that reject sandbox endpoints
4. Canary/blue-green/rollback rehearsal under change management or regulatory pressure
5. Agents merging autonomously enough that an *automated* prod-fidelity gate is needed

Until those triggers fire, staging is overhead for a failure class you do not face. The cheaper next step when pre-exposure validation is needed is **Cloud Run revision traffic-splitting (canary)** — promote a new revision to a fraction of traffic, watch observability dashboards, then ramp to 100%. That buys much of staging's "validate before full exposure" value at near-zero cost without a third environment.

---

## 6. Release gates — mechanics and how they enable autonomy

A release gate is an enforced pause between producing a release and exposing it to users. The native mechanism on this stack is **GitHub Environments with required reviewers**: a deploy job declares `environment: production` and the pipeline halts until an authorized reviewer approves.

**Two gates operate differently:**

- **Application promote to prod** — gated by the GitHub Environment approval. The reviewer approves deployment of an already-built, already-dev-tested image.
- **Infrastructure changes (Terraform)** — gated by `terraform plan` review. The plan is read-only and safe to run at any time; the plan output *is* the approval artifact, enumerating exactly what will change. Only after the plan is reviewed does `apply` run. This is the `plan-safe / apply-gated` discipline.

**The counter-intuitive insight: a gate enables autonomy, it does not merely constrain it.**

> A gate decouples "how much the agent does" from "how much risk reaches users."

Without a gate, every increment of agent autonomy is also an increment of prod risk. *With* an enforced gate — and with prod-only secrets scoped to the environment so agents literally cannot obtain prod credentials without passing it — the agent can do arbitrarily more (branch, implement, test, merge, build, deploy to dev, run smoke checks, assemble evidence) while prod exposure stays exactly one human approval away. The two dials turn independently.

**Three properties a gate must have to be real:**

1. **Detection + undo bounds how thin the gate can get.** A lighter gate is safe only if a bad release is caught fast and reversed cheaply. The levers are observability (P6 dashboards, 5xx alerting, Error Reporting) and Cloud Run revision rollback (near-instant traffic shift). Invest in these to earn the right to a lighter gate.
2. **A gate you do not genuinely exercise is theater.** Rubber-stamping without reading the evidence gives you the cost of a gate with none of the safety. Either genuinely review, or formally move that change class to auto-promote.
3. **The agent's role at the gate is to assemble the approval packet, not to request permission.** A well-run gate delivers a curated evidence bundle (diff, CI results, dev smoke output, risk summary, `terraform plan`) so the human decision is cheap and well-informed — not a re-execution of work.

---

## 7. Spec quality is the autonomy ceiling

> An agent can run autonomously only as far as the Definition of Done is unambiguous and machine-verifiable.

This is structural, not a model limitation. Autonomy means acting without a human in the loop; you can only safely remove the human where "is this correct and done?" can be answered without one. Three axes determine whether a task is autonomy-ready:

1. **Crispness of DoD** — can "done" be stated as a checkable condition, not a judgment call?
2. **Verification path** — can the agent prove it is done (tests, CI, smoke check, `terraform plan`) without human eyeballing?
3. **Blast radius** — if it is wrong, how bad and how reversible? (Low blast radius tolerates more autonomy; auth/migrations/infra require a gate.)

The corollary: you raise the autonomy ceiling not by waiting for better models, but by writing better specs and building better verification. Spec-writing is autonomy-enablement.

---

## 8. Autonomy tiering — sorting work by readiness

Because the ceiling is per-task, the practical move is to tier work by autonomy-readiness, not by size:

| Tier | Characteristics | Examples (v1.0 issues) |
|------|----------------|----------------------|
| **A — Fully autonomous** | Crisp deletion-shaped DoD; near-zero blast radius; CI fully verifies | BL-59 (remove Decks tab), BL-65 (remove helper copy) |
| **B — Autonomous build, human gate at PR** | Well-specified enough to build unattended; one human check the agent cannot self-certify (complex logic review, visual, security) | BL-70 (faceted filters), BL-72 (filter CSS), BL-67 (resolver bug) |
| **C — Buildable but blocked** | Code is agent-friendly; go-signal isn't (gated by spike, dependency, or open design question) | BL-61 (cross-set batch), BL-60 ("show only owned") |
| **D — Not autonomy-ready** | Needs human/design work first — a spike, undesigned feature, or undefined DoD | BL-46 (Add Cards rethink), BL-54 (import/export) |

Moving items *up* the tiers by resolving what blocks them (run the spike, design the feature, answer the open question) is the concrete activity that expands the autonomous work surface.

---

## 9. Gate progression — the gate gets smarter, not gone

As trust accumulates, the gate becomes more selective rather than disappearing:

| Stage | Human involvement |
|-------|------------------|
| **0 — Supervised-to-PR** | Agent works to an open PR; human reviews and merges |
| **1 — Dev environment** | Agent deploys to dev and verifies; human approves prod promote |
| **2 — Build-once + promote** | One image per merge; dev is automatic; prod behind required-reviewer gate |
| **3 — Risk-tiered gating** | `risk:low` changes auto-promote on green CI + dev smoke; high-blast-radius keep the human gate |
| **4 — Automated prod-fidelity** | Human gate for routine changes replaced by machine checks (canary, automated rollback) |
| **5 — Autonomous within policy** | Human sets policy and monitors; agent ships within it |

The throughline: you are not removing safety — you are moving from "human checks everything" to "human checks what is risky, machines check the rest, rollback catches the misses." The rate at which you can climb this progression is bounded by §6: *you can thin the gate only as fast as your ability to detect and undo improves.*

---

**Referenced by:** ADR-0006, ADR-0007, `SWU_Platform_Roadmap.md §7`  
**Supersedes:** `learning_guide/SWU_Learning_Guide_CD_Environments_and_Release_Gates_2026-06-27.md`, `learning_guide/SWU_Learning_Guide_Agentic_Workflows_and_Autonomy_2026-06-27.md` (personal, gitignored — this document distils the architecture-relevant content for the tracked repo)
