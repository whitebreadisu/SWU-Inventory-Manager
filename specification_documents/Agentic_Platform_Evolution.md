# Agentic Platform Evolution — Emerging Roadmap

**Created:** 2026-06-27
**Status:** 🌱 Emergent / draft capture — not yet ratified work. This document exists so the direction sensed during the 2026-06-27 dev-environment conversation isn't lost while focus returns to the immediate ADR + BL-43 steps. Placement is provisional: it may later become a **track in `SWU_Platform_Roadmap.md`**, an **epic in `SWU_Backlog.md`**, or stay standalone — to be decided.

**Purpose:** Capture the *thesis*, the *governing principles*, the *staged roadmap*, and the *open decisions* for evolving the SWU platform toward agentic engineering workflows. Concepts are taught in two companion learning guides (gitignored, personal): `learning_guide/SWU_Learning_Guide_CD_Environments_and_Release_Gates_2026-06-27.md` and `learning_guide/SWU_Learning_Guide_Agentic_Workflows_and_Autonomy_2026-06-27.md`.

---

## 1. Thesis

The platform is evolving toward a model where **humans set policy and review; agents execute.** The aim is progressive autonomy — from supervised agents (work up to a PR / a gate) toward, eventually, agents that ship low-risk changes within policy while humans handle judgment, design, and exceptions. This is a *biased direction*, not a destination with a date: every step is justified by safety and value, not by autonomy for its own sake.

The operating pattern is **Opus orchestrates, Sonnet builds** — an Opus session plans, spawns Sonnet implementation agents, reviews their work for quality and safety, and assembles approval-ready evidence; the human is the final approver.

## 2. Governing principles (the "laws" surfaced so far)

1. **Spec quality is the autonomy ceiling.** An agent runs autonomously only as far as the DoD is crisp and machine-verifiable. Raise the ceiling by writing better specs + verification, not by waiting for better models.
2. **A gate decouples agent-scope from prod-risk.** An enforced release gate lets you grant *more* agent autonomy without letting *more* risk reach users — the two dials turn independently.
3. **You can thin the gate only as fast as detect + undo improves.** A lighter gate is tolerable only with fast detection (observability/alerting) and cheap reversal (rollback).
4. **A tier or gate earns its place by catching a failure class nothing else catches.** Don't add environments/gates by ladder-completion instinct; add them when a real, live failure class justifies the cost.
5. **Build once, promote the same artifact.** Never rebuild per environment; the tested artifact and the shipped artifact must be the same bytes.
6. **plan-safe, apply-gated.** Agents may run `terraform plan` (read-only) freely; `terraform apply` to cloud infra is always human-gated. The plan *is* the approval artifact.
7. **Single source of truth, point don't copy.** Narrative lives once (backlog); execution status lives once (Issues/board); decisions live once (ADRs). Each layer points, never duplicates — keeps both humans and agents cheap to serve and impossible to desync.

## 3. Current state — what's already built (enablers)

- **CI/CD pipeline** — lint → test → build/push → deploy → frontend-deploy (`.github/workflows/ci.yml`).
- **Test discipline** — enforced coverage floor + the port/replace/retire disposition rule (CLAUDE.md, Application Spec §8).
- **Workload Identity Federation** — keyless GitHub→GCP auth, already bootstrapped for both `swu-prod` and the (to-be-renamed) sandbox project.
- **Observability (P6)** — dashboards, 5xx alerting, Error Reporting → the *detection* half of principle 3.
- **Cloud Run revision rollback** — near-instant traffic-shift → the *undo* half of principle 3.
- **Opus/Sonnet orchestration** — established and observed working.
- **Hybrid work registry** — backlog (narrative) + GitHub Issues/board (execution), v1.0 issues #50–#62 created 2026-06-27.

## 4. Gaps — what's missing to climb the autonomy spectrum

- **A cloud dev environment** (BL-43) — agents have nowhere realistic to validate before prod. *The current priority.*
- **Build-once + promote pipeline with a GitHub Environment prod gate** — today CI rebuilds on deploy and is hardcoded to prod.
- **Automated rollback + tighter alerting** — needed before the human gate can safely thin.
- **Risk-tiered gating policy** — a defined classification of which change classes may auto-promote vs. require review.
- **Automated prod-fidelity checks** (canary / eventual staging) — the machine substitute for the human gate, added only when triggers fire (see CD guide §5).

## 5. Staged roadmap (direction, not commitments)

- **Stage 0 — Supervised-to-PR (now).** Agents build to an open PR; human reviews/merges. Tier A/B issues are the proving ground.
- **Stage 1 — Dev environment (BL-43).** Stand up `swu-dev` (new project; old sandbox left dormant for its original load-balancing-experiment intent). Agents deploy to dev and verify on a live URL.
- **Stage 2 — Build-once + promote + prod gate.** One artifact built on merge to `main`, auto-deployed to dev, promoted to prod behind a GitHub Environment approval. Agent assembles the approval packet; human approves.
- **Stage 3 — Risk-tiered gating.** Low-risk change classes auto-promote on green CI + dev smoke; the human gate fires only for high-blast-radius changes (auth, migrations, infra).
- **Stage 4 — Automated prod-fidelity + rollback.** Canary (Cloud Run traffic-split) and/or staging substitute for the human gate on routine changes; fast automated rollback catches misses.
- **Stage 5 — Autonomous within policy (aspirational).** Human moves from "approve each release" to "set policy and monitor."

## 6. Open decisions (pending)

- **ADR — dev environment + deploy model.** New `swu-dev` project (vs. repurpose sandbox); build-once/promote (vs. branch-per-env); staging explicitly deferred with named triggers. *Next action.*
- **Branch/promotion mechanics** — exact GitHub Environments config, where the approval lives, which branch may deploy to prod.
- **Risk-tier classification** — what counts as "low-risk auto-promotable" vs. "must review" (Stage 3).
- **When canary/staging enters** — the trigger conditions from the CD guide §5.

## 7. Relationships

- **BL-43** (cloud dev environment) is Stage 1 and the immediate work.
- **Platform Generator idea** (memory `project_platform_generator_idea`) — building the second environment by extracting a reusable Terraform module is the "hand-extract before automating" validation step for that future reusable-IDP idea.
- **`feedback_agentic_autonomy`** (memory) — the durable statement of this goal + the Opus/Sonnet pattern.
- Companion learning guides (§ top) teach the concepts; this doc holds the roadmap.
