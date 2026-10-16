---
title: "Loyallia — Software Maintenance Plan (ISO 9001:2015 §8.5.1 / ISO/IEC/IEEE 14764)"
document_id: "LOYALLIA-DOC-MAINT-PLAN-001"
version: "1.0"
status: "draft"
last_updated: "2026-10-16"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "N/A"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-DOC-MAINT-PLAN-001 |
| **Title** | Loyallia — Software Maintenance Plan (ISO 9001:2015 §8.5.1 / ISO/IEC/IEEE 14764) |
| **Version** | 1.0 |
| **Date** | 2026-10-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | draft |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/06-planning/quality/LOYALLIA-DOC-MAINT-PLAN-001.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-10-16 | Engineering Lead | Initial release. Defines maintenance scope and types (corrective/adaptive/perfective/preventive), roles & responsibilities, the release process (branch → gates → review → deploy), versioning policy, the vendor-sync procedure for the vendored Agent Zero fork (`services/agent-zero/VENDOR.md`), defect management (D-xx register workflow), configuration management, and verification gates (pytest 983+, ruff, mypy, vitest, npm build, Playwright, load tests). |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation of maintenance policy |
| Security Officer | Reviewer | Vendor-sync, secret handling and defect severity validation |
| QA Lead | Reviewer | Verification gates and defect workflow validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-DOC-AGENT-V3-ARCH-001 | Agent V3 Architecture | Reference (subject of maintenance for the agent layer) |
| LOYALLIA-DOC-AGENT-V3-TEST-001 | Agent Test & Verification Plan | Reference (verification gates detail) |
| LOYALLIA-DOC-AGENT_ARCHITECTURE.MD | AI Agent Architecture, Plan Binding & Isolation Model | Reference (defect register exemplar D-01…D-16) |
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-DOC-DEPLOYMENT_GUIDE | Loyallia Production Deployment Guide | Reference (deploy stage) |
| LOYALLIA-DOC-ESCALATION.md | Loyallia On-Call Escalation Matrix | Reference (incident-driven maintenance) |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-10-16 | Submitted |
| Product Owner | — | — | — | Pending Review |
| Security Officer | — | — | — | Pending Review |
| QA Lead | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-10-16 | Engineering Lead | Initial maintenance plan authored for the Agent V3 program and platform-wide upkeep |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

---

# Loyallia — Software Maintenance Plan

> **Documento generado por agentes de IA con supervisión del equipo SomaTech LLC — sujeto a revisión y aprobación.**

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Maintenance Types](#2-maintenance-types)
3. [Roles & Responsibilities](#3-roles--responsibilities)
4. [Release Process](#4-release-process)
5. [Versioning Policy](#5-versioning-policy)
6. [Vendor-Sync Procedure (Agent Zero Fork)](#6-vendor-sync-procedure-agent-zero-fork)
7. [Defect Management (D-xx Register)](#7-defect-management-d-xx-register)
8. [Configuration Management](#8-configuration-management)
9. [Verification Gates](#9-verification-gates)
10. [Records & Quality Records](#10-records--quality-records)
11. [References](#11-references)

## 1. Purpose & Scope

This plan defines how the Loyallia platform is maintained under a quality-management (ISO 9001:2015 §7.5, §8.5) discipline. It covers:

- maintenance scope and the four maintenance types;
- roles, responsibilities and authorities;
- the release process and versioning policy;
- the **vendor-sync procedure** for the vendored Agent Zero fork (`services/agent-zero/`, `VENDOR.md`);
- defect management via the **D-xx register**;
- configuration management and the **verification gates** that no change may bypass.

Scope: `backend/`, `frontend/`, `services/` (including `services/agent-zero/`), `deploy/`, `scripts/`, `whatsapp-bridge/`, and the `docs/**` corpus. Out of scope: hardware/host provisioning contracts and third-party SaaS commercial terms.

## 2. Maintenance Types

| Type | Definition | Trigger | Examples (Loyallia) | Target response | Priority mapping |
|------|-----------|---------|---------------------|-----------------|------------------|
| **Corrective** | Fix a defect in delivered software | Defect report (D-xx), incident, failed gate | D-02 `/api/` prefix 404; D-09 nginx chat routing; D-15 Vault `put_secret` 403 | Critical ≤ 24 h to fix-or-rollback; High ≤ 5 business days | P1–P2 |
| **Adaptive** | Keep the software usable after environment change | Dependency/runtime/platform change | Django 5.x minor upgrade, Node 22 update, Vault version bump, Agent Zero upstream release (§6) | Next planned release; security-driven ASAP | P2–P3 |
| **Perfective** | Improve performance, maintainability or user value | Product decision, analytics, tech-debt register | Rollup-backed analytics (LOYALLIA-DOC-AGENT-V3-ARCH-001 K3); quota atomicity refactor | Planned release train | P3 |
| **Preventive** | Prevent latent defects | Audit finding, code review, monitoring signal | Non-destructive `vault-init` seeding (D-16); healthcheck gaps (D-13) | Planned release train; security-driven ASAP | P3–P4 |

Every change request MUST be classified as exactly one type at intake. Reclassification is recorded in the D-xx or change entry.

## 3. Roles & Responsibilities

| Role | Responsibility | Authority |
|------|----------------|-----------|
| **Engineering Lead** | Owns this plan; triage lead; release train conductor; maintains D-xx register | Merges to `main`; declares releases |
| **Product Owner** | Approves scope, pricing/plan decisions (e.g. D-14), perfective priorities | Approves documents; resolves business conflicts |
| **Security Officer** | Reviews trust boundaries, Vault/secrets handling, vendor-sync of `services/agent-zero/` | Blocks release on security findings |
| **QA Lead** | Owns verification gates evidence; test plan (LOYALLIA-DOC-AGENT-V3-TEST-001); exit criteria | Blocks release on gate failure |
| **Developers (incl. AI agents under supervision)** | Implement changes; run gates locally; write/update tests and docs with the change | Branch-level commits only |
| **Sys Admin / Ops** | Deployment, Vault operations, monitoring, rollback execution | Executes deploys and rollback |
| **On-Call** | Incident intake per LOYALLIA-DOC-ESCALATION.md; opens corrective D-xx | Triggers corrective flow |

RACI summary: **A**pprover = Product Owner (content) / QA Lead (quality evidence); **R**esponsible = Engineering Lead; **C**onsulted = Security Officer on all changes touching secrets, auth, tenant isolation or `services/agent-zero/`; **I**nformed = distribution list of each affected document.

## 4. Release Process

Branch → gates → review → deploy. **No stage may be skipped; gate evidence MUST exist before the next stage starts.**

| Stage | Name | Entry | Activity | Exit |
|-------|------|-------|----------|------|
| 1 | Branch | Change classified (§2); D-xx or plan reference exists | Feature branch off `main`; implementation + tests + doc updates in the same change | Self-assessment against AGENTS.md absolute rules |
| 2 | Gates | Implementation complete | Full verification gate suite (§9) run locally / in `loyallia-api` | All gates green, evidence pasted into the change record |
| 3 | Review | Gates green | Peer / supervising review: correctness, isolation invariants, secrets hygiene, doc currency | Approved; Security Officer sign-off when C-consulted applies |
| 4 | Deploy | Review approved | Merge to `main`; deploy per LOYALLIA-DOC-DEPLOYMENT_GUIDE; healthchecks green; smoke test | Deploy record + monitoring confirmation; rollback plan stated |
| 5 | Post-deploy | Deploy complete | Observe (Prometheus/Alertmanager); close or roll back | D-xx updated; documents updated to as-built |

Rollback: any deploy MAY be rolled back by Ops without new approval when healthchecks or smoke tests fail; a corrective D-xx is mandatory within 24 h.

Production E2E testing (where required by the change) follows `LOYALLIA-DOC-PRODUCTION_E2E_TESTING.md` with `--workers=1` and the sanctioned `e2e-production-tenant` only.

## 5. Versioning Policy

| Artefact | Scheme | Rule |
|----------|--------|------|
| Platform releases | `MAJOR.MINOR.PATCH` (git tag `vX.Y.Z`) | MAJOR = breaking API/schema change; MINOR = backward-compatible feature; PATCH = corrective fix |
| Documents | `MAJOR.MINOR` per Change Control Process (each document) | Minor = corrections; Major = new requirements/scope; every change lands in Revision History |
| Database schema | Django migrations (`app.NNNN`) | Additive-first; destructive changes require Security Officer + Product Owner approval |
| Vendored `services/agent-zero/` | Upstream SHA pin + local patch series | Pinned SHA is the version; see §6 |
| API contract (`ai_proxy` ↔ Agent Zero) | Contract version = pinned SHA | Re-verification mandatory after every vendor-sync |

Deprecation: superseded documents move to `docs/09-archive/` with a deprecation notice (never deleted). Deprecated API behaviour is documented for at least one MINOR release before removal.

## 6. Vendor-Sync Procedure (Agent Zero Fork)

The Agent Zero runtime is vendored at `services/agent-zero/` (upstream `agent0ai/agent-zero`, **MIT** — license text preserved in-tree). Local deviations are tracked in `services/agent-zero/VENDOR.md`.

`VENDOR.md` MUST contain, at minimum:

| Field | Content |
|-------|---------|
| Upstream repository & license | `agent0ai/agent-zero`, MIT |
| **Pinned upstream commit** | Full 40-char SHA (placeholder `AGENT-ZERO-PINNED-SHA-PLACEHOLDER` until first vendoring) |
| Date of last sync | ISO 8601 |
| Local patch series | Each patch: ID, purpose, files touched, upstreamability (will be proposed upstream / Loyallia-specific) |
| Contract deltas | Differences in `api_message` / `api_terminate_chat` / `agent_profiles` behaviour vs upstream |
| Sync performed by / reviewed by | Names + dates |

Sync procedure (each sync is a change under §4):

| Step | Action | Gate |
|------|--------|------|
| V1 | Identify upstream release/commit; record security advisories | — |
| V2 | Import into `services/agent-zero/` on a branch; update pinned SHA in `VENDOR.md` | — |
| V3 | Rebase/replay the local patch series; resolve conflicts | Review (Security Officer for auth/key paths) |
| V4 | Re-verify the integration contract (LOYALLIA-DOC-AGENT-V3-ARCH-001 §4): key auth 401 semantics, `context_id` lifecycle, profile rejection of changes | Integration tests (LOYALLIA-DOC-AGENT-V3-TEST-001 §4) |
| V5 | Run full verification gates (§9) | All green |
| V6 | Review + deploy per §4; update `VENDOR.md` and affected documents | QA Lead evidence check |

Policy: vendor-syncs are **adaptive** maintenance; skipping V4 is a process nonconformity.

## 7. Defect Management (D-xx Register)

Defects are recorded with **D-xx** identifiers in the defect register of the governing architecture document (exemplar: `LOYALLIA-DOC-AGENT_ARCHITECTURE.md` §8, D-01…D-16). New registers open with **D-01** in the document that owns the subsystem; cross-document references use the qualified form `DOC-ID D-xx`.

### 7.1 Register row schema

| Column | Content |
|--------|---------|
| ID | `D-NN` sequential per register |
| Defect | One-sentence description |
| Evidence (at detection) | Concrete evidence: command output, file:line, live HTTP result — never a guess |
| Severity | Critical / High / Medium / Low (§7.2) |
| Status | **Open** → **Partial** → **Fixed** (verified) / **Accepted risk** (with approver) |

### 7.2 Severity & response

| Severity | Definition | Response target |
|----------|-----------|-----------------|
| Critical | Data leak across tenants, auth bypass, total feature outage, secret exposure | Fix-or-rollback ≤ 24 h |
| High | Major function broken with workaround; quota/isolation accounting wrong | ≤ 5 business days |
| Medium | Functional defect with easy workaround; audit/log gap | Next release train |
| Low | Cosmetic, documentation, minor tech debt | Backlog |

### 7.3 Workflow

1. **Detect & register** — assign next D-xx with evidence; never claim a cause without evidence.
2. **Triage** — Engineering Lead assigns severity and type (usually corrective); Security Officer consulted on isolation/secrets defects.
3. **Fix** — fix + regression test in the same change (test level per LOYALLIA-DOC-AGENT-V3-TEST-001).
4. **Verify** — gates (§9) green; defect evidence replaced with verification evidence (as in `LOYALLIA-DOC-AGENT_ARCHITECTURE.md` §11).
5. **Close** — status **Fixed** with verification reference. **Partial** and **Open** entries MUST state the blocking decision explicitly (e.g. D-13 deferred to Security Officer; D-14 pending Product Owner).

Status honesty rule (AGENTS.md absolute rules): no defect may be marked **Fixed** without passing verification evidence.

## 8. Configuration Management

| Item | Control |
|------|---------|
| Source of truth | Git working tree; `main` is the release baseline |
| Baselines | Git tags `vX.Y.Z`; document set versioned per §5 |
| Secrets | Vault KV v2 ONLY (`secret/data/loyallia/production|development`). Never `.env`, code, or Git (absolute rule). Dev and production bootstrap credentials are separate |
| Runtime config | `PlatformSetting` (SUPER_ADMIN, audited, allowlisted keys); Django settings read from Vault/env with safe defaults; no hardcoded production values |
| Agent config | Derived `mcp_server_token`; sync agent → Vault via `deploy/scripts/sync_agent_config.sh`; `vault-init` seeds non-destructively (D-16) |
| Infrastructure | `docker-compose*.yml`, `deploy/` tracked in Git; host nginx configs documented in runbooks |
| Environment parity | Integration tests run through PgBouncer (`--ds=loyallia.settings.test_integration`); never standalone PG/SQLite/host venv |
| Auditability | High-risk flows (Vault writes, impersonation, factory reset, seed-demo, billing confirmation) require explicit audit entries and test coverage |

## 9. Verification Gates

All gates MUST pass before review (§4 stage 2). Evidence = command output summary pasted into the change record. Baseline counts are floors, not ceilings: a drop below the recorded floor is a release blocker.

| # | Gate | Command | Pass criterion (2026-10-15 baseline) | Blocking |
|---|------|---------|--------------------------------------|----------|
| G1 | Lint (backend) | `cd backend && python -m ruff check .` | 0 errors | Yes |
| G2 | Static typing | `cd backend && python -m mypy .` (per project config) | 0 errors on typed modules | Yes |
| G3 | Unit + integration (backend) | `docker exec loyallia-api pytest --ds=loyallia.settings.test --reuse-db -q` | **≥ 983 passed**, 0 failed (4 skipped allowed) | Yes |
| G4 | Integration via PgBouncer | `docker exec loyallia-api pytest --ds=loyallia.settings.test_integration -q` (when touched) | 0 failed | Yes (when triggered) |
| G5 | Frontend typecheck | `cd frontend && npm run typecheck` | 0 errors | Yes |
| G6 | Frontend unit | `cd frontend && npm run test:unit` | **≥ 798 passed**, 0 failed | Yes |
| G7 | Frontend build | `cd frontend && npm run build` | exit 0 | Yes |
| G8 | E2E (Playwright) | `cd frontend && npx playwright test` (local) or production suite per LOYALLIA-DOC-PRODUCTION_E2E_TESTING (`--workers=1`) | Targeted suites 100% green; characterization suites T1–T5 green for agent-layer changes | Yes (agent-layer changes) |
| G9 | Load / soak (k6) | Load profile per LOYALLIA-DOC-AGENT-V3-TEST-001 §6 | Latency/throughput targets met; 0 isolation violations | Yes (scale-affecting changes) |
| G10 | Documentation | Documents updated in the same change; ISO controls present (§ rules.md) | Doc set consistent; revision history entry present | Yes |

Gate waiver: only the Engineering Lead + Product Owner may jointly waive a gate, recorded in the change record with expiry. G1–G3, G5–G7 may not be waived for merges to `main`.

## 10. Records & Quality Records

| Record | Owner | Retention | Location |
|--------|-------|-----------|----------|
| D-xx defect register | Engineering Lead | Life of subsystem + 1 year | Governing architecture/planning documents |
| Change/release records | Engineering Lead | 2 years | Git history + release notes |
| Gate evidence | QA Lead | 2 years | Change records |
| Vendor-sync records (`VENDOR.md` history) | Engineering Lead | Life of fork | `services/agent-zero/VENDOR.md` |
| Approval/signature pages | Product Owner | Life of document | Each document (DOCUMENT APPROVAL block) |
| Audit entries (Vault writes, impersonation, ai_chat) | Security Officer | Per LOYALLIA-DOC-04-ACCESS-CONTROL-POLICY | `apps.audit` / Loki |

## 11. References

**Documents**

| ID | Relevance |
|----|-----------|
| LOYALLIA-DOC-AGENT-V3-ARCH-001 | Architecture maintained under this plan (agent layer) |
| LOYALLIA-DOC-AGENT-V3-TEST-001 | Verification gates detail (T1–T5, k6 profiles) |
| LOYALLIA-DOC-AGENT_ARCHITECTURE.MD | Defect register exemplar (D-01…D-16) and live gate evidence |
| LOYALLIA-DOC-DEPLOYMENT_GUIDE | Deploy stage procedure |
| LOYALLIA-DOC-PRODUCTION_E2E_TESTING.md / LOYALLIA-DOC-E2E_TESTING_RUNBOOK.md | Production E2E discipline (G8) |
| LOYALLIA-DOC-ESCALATION.md | Incident → corrective maintenance path |
| LOYALLIA-DOC-04-ACCESS-CONTROL-POLICY | Audit record policy |
| LOYALLIA-RULES-001 / LOYALLIA-AGENTS-001 | Mandatory rules; quality gate commands |

**Code**

| Path | Relevance |
|------|-----------|
| `services/agent-zero/` (+ `VENDOR.md`) | Vendored Agent Zero fork; §6 subject |
| `backend/apps/tenants/services/ai_proxy.py` | Contract boundary re-verified on vendor-sync |
| `backend/apps/ai/`, `backend/apps/agent_api/` | Maintained AI surfaces |
| `deploy/scripts/sync_agent_config.sh`, `deploy/vault/init.sh` | Agent config sync; non-destructive Vault seeding |
| `docker-compose*.yml`, `deploy/` | Configuration baseline |
