# SOFTWARE REQUIREMENTS SPECIFICATION
## Loyallia Plan B — Production Recovery

**Document ID:** LOYALLIA-SRS-PLAN-B-001  
**Version:** 1.0.0  
**Status:** ACTIVE RECOVERY BASELINE  
**Date:** 2026-05-01  
**Standard:** ISO/IEC 29148:2018 style requirements  
**Parent Documents:** `docs/SRS_Loyallia_COMPLETE.md`, `docs/SRS_Loyallia_HARDENING_v1.0.md`  
**Traceability TODO:** `docs/TODO_PLAN_B_TRACEABILITY.md`

---

## 1. Purpose

This SRS supersedes prior production-ready claims for launch readiness. Loyallia SHALL NOT be treated as production-ready until all P0 and P1 Plan B requirements are implemented, tested, and recorded with evidence in the traceability TODO.

## 2. Scope

Plan B covers the latest verified blockers in build, backend gates, billing, security, infrastructure, dependency audit, and test workbench setup. Full product re-baselining is out of scope unless a Plan B fix requires it.

## 3. Requirement Classification

| Priority | Meaning | Production Rule |
|---|---|---|
| P0 | Deployment blocker, security-critical, or payment/data integrity failure | Must be fixed before any launch |
| P1 | High production risk or missing required gate | Must be fixed before real customer traffic |
| P2 | Important hardening, compliance, or maintainability item | Must be scheduled before launch sign-off |
| P3 | Quality improvement | May be deferred with accepted risk |

Requirement IDs use `LYL-PB-{AREA}-{NNN}`.

## 4. Plan B Requirements

| ID | Requirement | Priority | Verification |
|---|---|---:|---|
| LYL-PB-DOC-001 | The project SHALL contain this ISO-style Plan B SRS. | P0 | File exists and references current blockers |
| LYL-PB-DOC-002 | The project SHALL contain a traceable TODO with implementation status, tests, evidence, and notes. | P0 | `docs/TODO_PLAN_B_TRACEABILITY.md` exists |
| LYL-PB-DOC-003 | Every Plan B item SHALL have at least one verification method or accepted-risk note. | P0 | Traceability matrix complete |
| LYL-PB-FE-001 | The frontend SHALL compile without the `FormBuilder` swap syntax failure. | P0 | `npm run build` |
| LYL-PB-FE-002 | Superadmin metrics types SHALL match rendered fields. | P0 | `npm run typecheck` |
| LYL-PB-FE-003 | Superadmin tenant location editing SHALL not assign partial undefined objects to required location state. | P0 | `npm run typecheck` |
| LYL-PB-FE-004 | `LocationPicker` SHALL not pass possibly undefined values to strict state setters. | P0 | `npm run typecheck` |
| LYL-PB-FE-005 | Frontend rate limiter SHALL handle empty timestamp arrays safely. | P0 | `npm run typecheck` and unit tests |
| LYL-PB-FE-006 | Token manager SHALL decode JWT payloads without possible undefined access. | P0 | `npm run typecheck` and unit tests |
| LYL-PB-FE-007 | Frontend lint SHALL run non-interactively in CI. | P1 | `npm run lint` exits without prompt |
| LYL-PB-BE-001 | Backend ruff checks SHALL pass. | P0 | `ruff check .` |
| LYL-PB-BE-002 | Backend formatting check SHALL pass. | P1 | `black --check .` |
| LYL-PB-BE-003 | Backend tests SHALL import all shared factories they reference. | P0 | `pytest` collection succeeds |
| LYL-PB-BE-004 | Django deploy checks and tests SHALL be runnable in the documented workbench. | P0 | `python manage.py check --deploy` |
| LYL-PB-DB-001 | Card typed configuration fields SHALL have a Django migration. | P0 | `makemigrations --check --dry-run` |
| LYL-PB-DB-006 | Invoice number generation SHALL be concurrency-safe. | P1 | concurrency test |
| LYL-PB-BILL-001 | Subscribe SHALL NOT activate paid subscriptions without payment gateway confirmation. | P0 | billing API tests |
| LYL-PB-BILL-002 | If a real gateway is unavailable, paid activation SHALL be explicitly disabled with a controlled response. | P0 | billing API tests |
| LYL-PB-BILL-004 | Payment webhooks SHALL require a timestamp. | P0 | webhook tests |
| LYL-PB-BILL-005 | Payment webhooks SHALL reject malformed or stale timestamps. | P0 | webhook tests |
| LYL-PB-BILL-006 | Webhook idempotency SHALL be transactional and retry-safe. | P0 | duplicate/failure retry tests |
| LYL-PB-BILL-007 | Webhook processing SHALL update payment/subscription state or return a controlled unsupported-event result. | P1 | webhook tests |
| LYL-PB-BILL-009 | Trial extensions SHALL be bounded in model and superadmin flows. | P1 | billing model/API tests |
| LYL-PB-SEC-001 | Refresh-token rotation SHALL be atomic with row locking. | P0 | auth concurrency tests |
| LYL-PB-SEC-003 | Google OAuth rate limiting SHALL not trust raw `X-Forwarded-For`. | P1 | security tests |
| LYL-PB-SEC-004 | Public enrollment rate limiting SHALL not trust raw `X-Forwarded-For`. | P1 | security tests |
| LYL-PB-SEC-008 | Rate-limit token hashing SHALL avoid weak-hash scanner findings. | P1 | Bandit |
| LYL-PB-CUST-001 | Customer imports SHALL enforce the documented import file-size limit. | P1 | import tests |
| LYL-PB-CUST-002 | Customer imports SHALL enforce a 50,000-row maximum. | P1 | import tests |
| LYL-PB-CUST-004 | Customer imports SHALL enforce remaining plan capacity before bulk create. | P0 | import plan-limit tests |
| LYL-PB-UPLOAD-001 | Uploads SHALL validate content type and image bytes, not only extension. | P1 | upload tests |
| LYL-PB-UPLOAD-002 | SVG uploads SHALL be rejected unless sanitized. | P1 | upload tests |
| LYL-PB-INFRA-001 | Production Redis URLs SHALL include Redis password authentication. | P0 | production compose smoke |
| LYL-PB-INFRA-003 | CI deploy checks SHALL not be masked with `|| true`. | P0 | workflow grep |
| LYL-PB-INFRA-007 | CI SHALL include a DAST baseline scan. | P1 | workflow grep |
| LYL-PB-INFRA-008 | CI SHALL include Playwright E2E or a documented E2E gate. | P1 | workflow grep |
| LYL-PB-DEP-001 | Critical Next.js/PostCSS audit findings SHALL be resolved. | P0 | `npm audit --omit=dev --audit-level=high` |
| LYL-PB-DEP-002 | Python dependency audit tooling SHALL be available. | P1 | `pip-audit -r requirements.txt` |
| LYL-PB-TWB-BE-001 | Backend pytest configuration SHALL define Django settings, discovery, and markers. | P0 | `pytest --markers` |
| LYL-PB-TWB-FE-001 | Frontend unit tests SHALL have a real runner. | P0 | `npm run test:unit` |
| LYL-PB-TWB-E2E-001 | E2E credentials SHALL be environment-driven, not hardcoded in tests. | P1 | source grep |

## 5. Acceptance Gates

| Gate | Command |
|---|---|
| Backend lint | `cd backend && ruff check .` |
| Backend format | `cd backend && black --check .` |
| Backend tests | `cd backend && pytest` |
| Django deploy check | `cd backend && python manage.py check --deploy` |
| Migration drift | `cd backend && python manage.py makemigrations --check --dry-run` |
| Frontend typecheck | `cd frontend && npm run typecheck` |
| Frontend unit | `cd frontend && npm run test:unit` |
| Frontend build | `cd frontend && npm run build` |
| Frontend audit | `cd frontend && npm audit --omit=dev --audit-level=high` |
| Python audit | `cd backend && pip-audit -r requirements.txt` |

## 6. Traceability Rule

No Plan B item may be marked `DONE` unless its traceability row includes a passing evidence command, a committed test, or an explicit `ACCEPTED_RISK` status with rationale.
