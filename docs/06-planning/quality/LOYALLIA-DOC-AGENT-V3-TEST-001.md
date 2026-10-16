---
title: "Loyallia — Agent Test & Verification Plan (Agent V3)"
document_id: "LOYALLIA-DOC-AGENT-V3-TEST-001"
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
parent_document: "LOYALLIA-DOC-AGENT-V3-ARCH-001"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-DOC-AGENT-V3-TEST-001 |
| **Title** | Loyallia — Agent Test & Verification Plan (Agent V3) |
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
| **Parent Document** | LOYALLIA-DOC-AGENT-V3-ARCH-001 |
| **Supersedes** | N/A (extends the test sections of LOYALLIA-DOC-AGENT_ARCHITECTURE for the Agent V3 program) |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/06-planning/quality/LOYALLIA-DOC-AGENT-V3-TEST-001.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-10-16 | Engineering Lead | Initial release. Defines the test strategy per level (unit: pytest/vitest; integration: `docker exec loyallia-api pytest`; E2E Playwright human-like characterization suites T1 continuity / T2 lifecycle / T3 message-size robustness / T4 tenant isolation / T5 role→profile gating; load/soak with k6 against the millions-of-transactions target), acceptance criteria per phase, and entry/exit gates. |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Acceptance criteria validation |
| Security Officer | Reviewer | Isolation test adequacy (T4) and secret-handling test validation |
| QA Lead | Reviewer | Test level coverage and gate evidence validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-DOC-AGENT-V3-ARCH-001 | Agent V3 Architecture | Parent (system under test) |
| LOYALLIA-DOC-MAINT-PLAN-001 | Software Maintenance Plan | Reference (verification gates G1–G10, defect workflow) |
| LOYALLIA-DOC-AGENT_ARCHITECTURE.MD | AI Agent Architecture, Plan Binding & Isolation Model | Reference (as-built behaviour, acceptance criteria §10, defect register) |
| LOYALLIA-DOC-PRODUCTION_E2E_TESTING.md | Production E2E Testing Guide | Reference (production E2E discipline) |
| LOYALLIA-DOC-E2E_TESTING_RUNBOOK.md | E2E Testing Runbook | Reference (step-by-step execution) |
| LOYALLIA-DOC-TESTING-QA-STRATEGY.md | Testing & QA Strategy | Reference (platform-wide strategy) |
| LOYALLIA-RULES-001 / LOYALLIA-AGENTS-001 | Rules / Agent Instructions | Reference (test execution constraints) |

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
| Draft | 2026-10-16 | Engineering Lead | Initial test & verification plan for the Agent V3 program |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release or Agent V3 phase gate |

---

# Loyallia — Agent Test & Verification Plan (Agent V3)

> **Documento generado por agentes de IA con supervisión del equipo SomaTech LLC — sujeto a revisión y aprobación.**

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Test Strategy Overview](#2-test-strategy-overview)
3. [Level 1 — Unit Tests](#3-level-1--unit-tests)
4. [Level 2 — Integration Tests](#4-level-2--integration-tests)
5. [Level 3 — E2E Playwright Characterization Suite](#5-level-3--e2e-playwright-characterization-suite)
6. [Level 4 — Load & Soak (k6)](#6-level-4--load--soak-k6)
7. [Acceptance Criteria per Phase](#7-acceptance-criteria-per-phase)
8. [Entry & Exit Gates](#8-entry--exit-gates)
9. [Defect Handling & Regression Policy](#9-defect-handling--regression-policy)
10. [Test Environments & Data](#10-test-environments--data)
11. [References](#11-references)

## 1. Purpose & Scope

This plan defines how the Agent V3 system (LOYALLIA-DOC-AGENT-V3-ARCH-001) is verified, at every test level, from unit to load. It is the verification input to LOYALLIA-DOC-MAINT-PLAN-001 gates G3–G9.

**System under test (SUT):** the agent layer — `backend/apps/tenants/services/ai_proxy.py`, `/api/v1/tenants/me/ai-chat/`, `AIChatSession`/`AIQueryLog`, `backend/apps/ai/` design endpoints, `backend/apps/agent_api/` data plane, and `services/agent-zero/` behind the contract of LOYALLIA-DOC-AGENT-V3-ARCH-001 §4.

Out of scope: general platform regression (covered by the existing 55-file E2E suite and `LOYALLIA-DOC-TESTING-QA-STRATEGY.md`), and visual design quality of Wallet Studio prompts.

**Evidence rule (AGENTS.md):** no test level may be reported as passing without actual passing command output. Mocks are permitted only inside unit tests; integration and E2E MUST exercise real code paths.

## 2. Test Strategy Overview

| Level | Tooling | Scope | Environment | Runs on | Gate |
|-------|---------|-------|-------------|---------|------|
| L1 Unit | pytest, vitest | Functions/units in isolation; contracts of `resolve_for_tenant`/`bind`; `put_secret` fallback | `loyallia-api` container (backend), Node (frontend) | Every change | G3, G6 |
| L2 Integration | pytest (`--ds=loyallia.settings.test` / `test_integration`) | Django pipeline: gates, quota, session binding, `ai_proxy` transport, agent contract | `docker exec loyallia-api` (Docker ONLY) | Every change | G3, G4 |
| L3 E2E | Playwright (human-like flows) | Characterization T1–T5 end-to-end through the real stack | Local stack or production (`--workers=1`, `e2e-production-tenant`) | Agent-layer changes | G8 |
| L4 Load/Soak | k6 | Throughput, latency, quota accuracy, isolation under load, millions of transactions | Staging/load env with seeded data | Scale-affecting changes & phase gates | G9 |
| L5 Acceptance | Mixed + review | Phase criteria (§7), doc consistency | — | Phase gate | G10 + §7 |

Traceability: every requirement R-LC-*, R-BD-*, R-TI-*, R-API-*, R-PLAN-* of LOYALLIA-DOC-AGENT-V3-ARCH-001 maps to at least one test case in §3–§6. Uncovered requirements block the exit gate (§8).

## 3. Level 1 — Unit Tests

| Area | Cases (representative) | Suite |
|------|------------------------|-------|
| Session binding | `resolve_for_tenant`: missing / foreign / inactive / expired context → `None`; valid → row. `bind()`: create; refresh expiry + counter; cross-tenant adoption refused + logged; `IntegrityError` adopt-winner path | `backend/tests/` |
| Quota & metering | `check_plan_limit` limits ≤ 0 denied; `record_cost`/`discard_cost`/`finalize_cost` ledger invariants | `backend/apps/tenants` + `backend/tests/` |
| `put_secret` fallback | PATCH 403/404/405/415 → merge-write; genuine write-denied fails closed | `backend/tests/test_vault_put_secret.py` (4 tests) |
| `ai_proxy` | URL join (`/api/api_message`), payload shape, error normalisation (timeout/transport → `AIProxyRequestError`), PII re-mask applied before egress, fresh-session retry once | `backend/apps/tenants/tests/` |
| agent_api auth | Key prefix logging only (never token bytes); `require_tenant()` on all 5 GETs | `backend/apps/agent_api/` |
| Frontend chat path | Chatbot masker (advisory), request shape, `Authorization` header attached, size cap | vitest |

Acceptance: `pytest --ds=loyallia.settings.test` ≥ 983 passed / 0 failed; `npm run test:unit` ≥ 798 passed / 0 failed (floors from the 2026-10-15 baseline).

## 4. Level 2 — Integration Tests

Execution (mandatory form — Docker only):

```bash
docker exec loyallia-api pytest --ds=loyallia.settings.test --reuse-db -q          # unit + integration
docker exec loyallia-api pytest --ds=loyallia.settings.test_integration -q         # via PgBouncer (when touched)
```

| ID | Scenario | Expected |
|----|----------|----------|
| I1 | `POST /api/v1/tenants/me/ai-chat/` happy path (Enterprise tenant, `ai_assistant` on) | 200 `{response, context_id}`; `AIQueryLog(endpoint=chat)` row created; `AIChatSession` bound |
| I2 | Quota exhaustion | 403 `PLAN_LIMIT_EXCEEDED`; usage row discarded (not charged) |
| I3 | Feature off / plan without `ai_assistant` | 402/403 at feature gate (D-14 behaviour per approved decision) |
| I4 | Foreign `context_id` presented | Fresh session; no error/noise revealing existence (R-LC-07) |
| I5 | Expired `context_id` presented | Fresh session (R-LC-03) |
| I6 | Agent contract: `POST /api/api_message` no key / wrong key / correct key | 401 `API key required` / 401 `Invalid API key` / 200 |
| I7 | Agent unreachable | 503 `AI_ASSISTANT_UNAVAILABLE`; no fabricated answer |
| I8 | `api_terminate_chat` (V3) | Context → ENDED; subsequent message with same `context_id` starts fresh |
| I9 | `agent_profiles` (V3) | Catalogue returned; unknown configured profile fails closed at startup |
| I10 | Vendored contract re-verification after vendor-sync (MAINT §6 V4) | All of I6–I9 green against the new pinned SHA |

## 5. Level 3 — E2E Playwright Characterization Suite

Human-like characterization: real user pacing (per-step think-time, realistic typing), real browser, real stack — no API shortcuts. Suites live under `frontend/e2e/tests/` as agent suite files; production runs follow `LOYALLIA-DOC-PRODUCTION_E2E_TESTING.md` (`--workers=1`, `e2e-production-tenant`, uniquely-prefixed records, cleanup only own records).

| ID | Suite | Characterizes | Core steps | Pass criterion |
|----|-------|---------------|-----------|----------------|
| **T1** | Continuity | Conversation **continuity** across messages and page navigation | Open chatbot → send M1 (establish topic/seed fact) → navigate away/back → send M2 referencing M1 | Answer M2 reflects M1 context; same `context_id` returned; no reset |
| **T2** | Lifecycle | State machine active → idle-expired → ended | (a) active reuse works; (b) force expiry (`lifetime_hours=1` clamp or clock manipulation in test env) → next message behaves as fresh conversation; (c) V3 terminate → same | (b) fresh session semantics; (c) ENDED never resumes; both indistinguishable from "no context" client-side |
| **T3** | Message-size robustness | Edge caps and graceful degradation | Send message at 8000-char cap; attempt > cap; rapid burst near rate limit | At-cap message handled (200); over-cap rejected cleanly by C2 (no 5xx); burst → 429s, no queue collapse |
| **T4** | Tenant isolation | `project = tenant` isolation | Tenant A starts chat (seed distinctive fact) → Tenant B starts chat presenting A's `context_id`; both tenants query `agent_api` with own keys | B never sees A's content; B's context resolves only to B's binding; agent_api data filtered by owner; 0 leakage assertions |
| **T5** | Role→profile gating | Server-derived profile per role/plan | MANAGER+ chats → profile from plan matrix (e.g. `loyallia-help`); STAFF denied; client-sent `agent_profile` in body ignored | Profile recorded in `AIQueryLog` metadata matches plan; body override has zero effect; role denials hold |

Suite-level requirements: each spec asserts on **behaviour visible to a user or to the audit/usage ledger** (no brittle implementation details); failures capture trace + screenshot; suite runs green twice consecutively before an exit gate (flake check).

## 6. Level 4 — Load & Soak (k6)

Target (LOYALLIA-DOC-AGENT-V3-ARCH-001 §8.2): **millions of transactions per billing period**; analytics P95 ≤ 500 ms at 10⁶ transactions/tenant.

| Scenario | Profile | Data | Pass thresholds |
|----------|---------|------|-----------------|
| L-CHAT | Ramp-arrival-rate: 0 → 50 msg/s over 10 min, hold 20 min | ≥ 500 synthetic sessions across ≥ 5 tenants | P50 ≤ 2.5 s; P95 ≤ 8 s; error rate < 0.5% (excl. quota 403s) |
| L-INGEST | Spike: 50 → 150 msg/s for 5 min | As above | Backpressure (429) instead of 5xx; recovery ≤ 2 min after spike |
| L-ANALYTICS | Constant 20 rps to `/agent/analytics/overview/` + `/agent/transactions/recent/` | Seeded 10⁶ transactions/tenant (rollup tables refreshed) | Rollup endpoint P95 ≤ 500 ms; "recent" endpoint P95 ≤ 1 s |
| L-ISO | Mixed multi-tenant chat under L-CHAT load | Distinctive per-tenant seed facts | **0** cross-tenant content assertions (automated leakage checks) |
| S-SOAK | 25 msg/s sustained 6 h (soak) | Rolling sessions | No memory leak trend (replica RSS stable ±10%); no context-store growth anomaly; quota ledger exact |
| L-QUOTA | Burst exceeding per-tenant quota mid-load | Quota-bound tenant | Exactly-once metering (no TOCTOU double-charge); 403 after exhaustion; no charge for failed upstream calls |

k6 artefacts: `docs/06-planning/quality/` result summaries (JSON + markdown digest) attached to the phase gate record. Threshold breaches are D-xx defects (usually perfective/corrective per MAINT §2).

## 7. Acceptance Criteria per Phase

| Phase | Scope | Acceptance criteria |
|-------|-------|---------------------|
| **Phase 0 — Baseline** | Characterize as-built V2 | T1–T4 green against current stack; I1–I7 green; baseline floors recorded (pytest 983+, vitest 798+); D-register current |
| **Phase 1 — Vendoring** | `services/agent-zero/` vendored, pinned, contract locked | I10 green; `VENDOR.md` complete with real SHA (no placeholder); MIT license in-tree; all L1/L2 gates green |
| **Phase 2 — Lifecycle & isolation V3** | `api_terminate_chat`, `agent_profiles`, `project = tenant` enforcement | T2(c)/T5 green; T4 green with 0 violations; R-TI-01…05 all covered by ≥ 1 test each |
| **Phase 3 — Scale** | K1–K5 (context store, async ingress, rollups, sticky routing, replicas) | L-CHAT/L-INGEST/L-ANALYTICS/L-ISO thresholds met at 10⁶ seeded txns/tenant; S-SOAK 6 h clean; L-QUOTA exact |
| **Phase 4 — Release** | Candidate release | All gates G1–G10 green; exit gate (§8) passed; documents updated to as-built; approval block signed |

## 8. Entry & Exit Gates

| Gate | Entry criteria | Exit criteria |
|------|----------------|---------------|
| **Entry (per test level)** | Requirements allocated to the level are baselined; test env healthy (all `loyallia-*` containers healthy); data seeds ready; no open **Critical** defect in the SUT paths under test | — |
| **Exit (per level)** | — | 100% of allocated requirements covered ≥ 1 passing test; suites green twice consecutively (flake check); 0 failing tests; evidence recorded (command output) |
| **Exit (per phase)** | — | Level exits passed for all levels in scope; no open Critical/High defect without an accepted-risk approval (approver: Product Owner + Security Officer); gate evidence attached; LOYALLIA-DOC-AGENT-V3-ARCH-001 acceptance criteria (§12) mapped to results |
| **Release exit** | — | G1–G10 green (MAINT §9); D-register reviewed (no **Open** Critical); docs consistent (G10); DOCUMENT APPROVAL signed |

Blocking rule: a failed exit gate stops the release train; waivers follow MAINT §9 (G1–G3, G5–G7 non-waivable).

## 9. Defect Handling & Regression Policy

| Policy | Statement |
|--------|-----------|
| Intake | Every test failure is registered as a D-xx defect in the owning register (MAINT §7) with reproduction evidence |
| Severity | Isolation/leakage failures = **Critical** always; quota/metering errors = **High** minimum |
| Regression tests | Every fixed defect ships with a regression test at the **lowest level that reproduces it** (unit preferred); characterization suites T1–T5 are permanent regression assets |
| Suite maintenance | Suite changes require QA Lead review; characterization specs may only change when intended behaviour changes (recorded in the parent architecture doc) |
| Flakes | A suite failing intermittently is a defect (P2); quarantine requires QA Lead approval and a D-xx |

## 10. Test Environments & Data

| Environment | Use | Constraints |
|-------------|-----|-------------|
| Local Docker stack | L1/L2, L3 local runs | Backend tests ONLY inside `loyallia-api` container; never standalone PG/SQLite/host venv |
| Production | L3 verification only | `--workers=1`; `e2e-production-tenant` (Enterprise); no Vault mutation, no factory reset, no seed-demo; uniquely-prefixed records, cleanup only own |
| Load env | L4 | Seeded 10⁶ transactions/tenant; synthetic tenants only; rollup refresh per K3 |
| Data rules | All levels | No real PII; synthetic facts per tenant designed to make leakage **detectable** (distinctive seed strings per tenant for T4/L-ISO) |

## 11. References

**Documents**

| ID | Relevance |
|----|-----------|
| LOYALLIA-DOC-AGENT-V3-ARCH-001 | SUT requirements (R-API-*, R-LC-*, R-BD-*, R-TI-*), capacity targets |
| LOYALLIA-DOC-MAINT-PLAN-001 | Verification gates G1–G10; defect workflow D-xx |
| LOYALLIA-DOC-AGENT_ARCHITECTURE.MD | As-built behaviour, live evidence 2026-10-15, defect register |
| LOYALLIA-DOC-PRODUCTION_E2E_TESTING.md / LOYALLIA-DOC-E2E_TESTING_RUNBOOK.md | Production E2E execution discipline |
| LOYALLIA-DOC-TESTING-QA-STRATEGY.md | Platform-wide testing strategy |
| LOYALLIA-AGENTS-001 / LOYALLIA-RULES-001 | Test execution commands and constraints |

**Code**

| Path | Relevance |
|------|-----------|
| `services/agent-zero/` | Vendored runtime under contract tests I6–I10 |
| `backend/apps/tenants/services/ai_proxy.py`, `backend/apps/tenants/api.py` | SUT pipeline (L1–L3) |
| `backend/apps/ai/models.py`, `backend/tests/` | Session binding unit tests |
| `backend/apps/agent_api/` | Data plane (T4, L-ANALYTICS) |
| `backend/tests/test_vault_put_secret.py` | Secret-write fallback tests |
| `frontend/src/components/chat/Chatbot.tsx`, `frontend/src/app/api/chat/route.ts` | E2E T1–T5 surface |
| `frontend/e2e/tests/` | Playwright suites (characterization files T1–T5) |
