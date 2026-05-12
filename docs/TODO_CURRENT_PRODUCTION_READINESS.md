# Current Production Readiness TODO

**Document ID:** LOYALLIA-TODO-CURRENT-PROD-001
**Date:** 2026-05-11
**Status:** ACTIVE
**Source of truth:** Current repository code, `rules.md`, and real local command results from this workspace.

This document is the active production-readiness artifact for Loyallia. It must not claim readiness from old evidence, mocked routes, seeded demo shortcuts, or destructive SysAdmin flows. Mark an item `DONE` only when its evidence command passes in the current codebase or when there is a written accepted-risk decision.

Status values: `OPEN`, `IN_PROGRESS`, `BLOCKED`, `VERIFYING`, `DONE`, `ACCEPTED_RISK`.

## Latest Verified Snapshot

| Gate | Command | Result | Notes |
|---|---|---|---|
| Frontend typecheck | `cd frontend && npm run typecheck` | PASS | Current workspace. |
| Frontend unit tests | `cd frontend && npm run test:unit` | PASS | 1 file, 12 tests. |
| Frontend build | `cd frontend && npm run build` | PASS WITH WARNINGS | Existing warnings remain for `<img>`, hook dependencies, and custom font. |
| Playwright discovery | `cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:80 npx playwright test --list` | PASS | 323 tests discovered. Tests now require explicit base URL. |
| Diff whitespace | `git diff --check` | PASS | No whitespace errors found. |
| Backend Ruff | `cd backend && python3 -m ruff check .` | FAIL | 81 lint errors, mostly import sorting, unused imports, typing upgrades, and datetime UTC modernization. |
| Backend pytest | `cd backend && DEBUG=False python3 -m pytest -q` | FAIL/BLOCKED | PostgreSQL on `localhost:33900` was not reachable and DB password was not supplied. 518 setup/collection errors. |

## P0 Rules Baseline

| ID | Requirement | Status | Evidence / Notes |
|---|---|---|---|
| LYL-RULE-001 | Code is the source of truth. Documentation must follow the actual Django/Next/React implementation. | DONE | `rules.md` is repo-specific and contains no YachaqIdentity or Lit rules. |
| LYL-RULE-002 | Do not wipe Vault, rotate secrets, or mutate Vault from normal Playwright tests. | DONE | E2E Vault-write test was removed. |
| LYL-RULE-003 | Do not execute factory reset or seed-demo SysAdmin paths from E2E readiness tests. | VERIFYING | Search found no E2E references to `factory-reset/confirm` or `seed-demo-data`. Backend protections still need audit. |
| LYL-RULE-004 | No hardcoded default credentials in production-readiness Playwright flows. | DONE | Owner/Admin/SysAdmin E2E flows now use environment-provided credentials. |
| LYL-RULE-005 | No mocked route fulfillment as production-readiness proof. | DONE | Route-mocked WhatsApp E2E tests were removed from readiness suite. |
| LYL-RULE-006 | Do not claim production ready while backend lint or backend tests fail. | OPEN | Backend gates currently fail. |

## P0 E2E Safety And Owner/Admin/SysAdmin Flows

| ID | Requirement | Status | Primary Files | Evidence | Notes |
|---|---|---|---|---|---|
| LYL-E2E-001 | Add shared E2E safety helper for base URL, role credentials, production-host refusal, mutation guard, and external-service guard. | DONE | `frontend/tests/e2e/helpers/e2e-safety.ts` | Typecheck and Playwright list pass. | `PLAYWRIGHT_BASE_URL` is mandatory. |
| LYL-E2E-002 | Remove `http://localhost:80` fallback defaults from E2E suites. | DONE | `frontend/tests/e2e/helpers/auth.setup.ts`, suites | `rg` search found no remaining hardcoded fallback. | Tests must be explicit about target environment. |
| LYL-E2E-003 | Replace hardcoded owner, manager, staff, and superadmin passwords with environment credentials. | DONE | E2E suites 01, 11, 13-18, 20-25 | `rg` search found no default credential matches in E2E. | Required env vars are documented by helper names. |
| LYL-E2E-004 | Gate mutating Owner/Admin/SysAdmin flows behind `PLAYWRIGHT_ALLOW_MUTATING_E2E=true`. | DONE | Suites 02, 09, 11, 14, 16, 18, 20, 21, 22, 23, 24 | Playwright list pass. | Prevents accidental mutation against shared/prod systems. |
| LYL-E2E-005 | Gate external SMS verification behind `PLAYWRIGHT_ALLOW_EXTERNAL_E2E=true`. | DONE | `frontend/tests/e2e/suite/15-phone-verification.spec.ts` | Playwright list pass. | Avoids accidental provider calls. |
| LYL-E2E-006 | Remove readiness tests that write Vault secrets. | DONE | `frontend/tests/e2e/suite/11-superadmin.spec.ts` | Search found no `writes Vault secret` match. | Replaced with read-only integration response secret-exposure check. |
| LYL-E2E-007 | Remove mocked WhatsApp UI tests from readiness proof. | DONE | `frontend/tests/e2e/suite/09-settings-billing.spec.ts` | Search found no `page.route` or `route.fulfill` in E2E. | Real behavior still needs staged E2E execution. |
| LYL-E2E-008 | Execute guarded Playwright flows against a disposable/staging environment. | OPEN | E2E suite | Pending command | Requires real `PLAYWRIGHT_*` credentials and explicit mutation flag only for disposable/staging. |

## P0 Backend Quality Gates

| ID | Requirement | Status | Primary Files | Evidence | Notes |
|---|---|---|---|---|---|
| LYL-BE-001 | Fix backend Ruff errors without changing behavior. | OPEN | `backend/` | `python3 -m ruff check .` failed with 81 errors. | Mostly mechanical cleanup; inspect before editing. |
| LYL-BE-002 | Re-run backend formatting check after Ruff fixes. | OPEN | `backend/` | Pending | Use the project formatter only after understanding current config. |
| LYL-BE-003 | Re-run backend type checks if configured. | OPEN | `backend/` | Pending | Confirm actual command from repo config before claiming. |
| LYL-BE-004 | Bring up the real backend test dependencies. | BLOCKED | Docker/PostgreSQL/Vault/env | Pytest failed because PostgreSQL `localhost:33900` was unavailable and DB password was empty. | Do not replace this with mocks. |
| LYL-BE-005 | Run full backend pytest against real test services. | BLOCKED | `backend/` | Pending after DB/Vault environment is available. | Current result is not a code-pass. |

## P0 Authorization And Tenant Isolation Audit

| ID | Requirement | Status | Primary Files | Evidence | Notes |
|---|---|---|---|---|---|
| LYL-AUTHZ-001 | Audit Owner APIs for tenant scoping on every list/detail/mutation. | OPEN | Backend owner/admin APIs | Pending source review and tests. | Must prove no cross-tenant reads/writes. |
| LYL-AUTHZ-002 | Audit Manager and Staff role restrictions against Owner-only capabilities. | OPEN | Backend APIs and frontend menus | Pending source review and tests. | UI hiding is not sufficient; backend enforcement required. |
| LYL-AUTHZ-003 | Audit SuperAdmin APIs for platform-scope access and explicit guardrails. | OPEN | SuperAdmin backend APIs | Pending source review and tests. | Destructive actions require extra confirmation and audit. |
| LYL-AUTHZ-004 | Add or verify negative authorization tests for cross-tenant access. | OPEN | Backend tests and Playwright where applicable | Pending. | Use real users/tenants; no mocked authorization. |

## P0 SysAdmin Destructive-Action Safety

| ID | Requirement | Status | Primary Files | Evidence | Notes |
|---|---|---|---|---|---|
| LYL-SA-001 | Verify factory reset cannot run accidentally or from normal E2E. | VERIFYING | Backend SysAdmin routes, frontend SysAdmin UI | E2E search is clean; backend audit pending. | Must inspect actual endpoint implementation. |
| LYL-SA-002 | Verify seed-demo paths cannot run in production/shared environments. | VERIFYING | Backend SysAdmin routes/scripts | E2E search is clean; backend audit pending. | Must confirm server-side environment guard. |
| LYL-SA-003 | Verify every SysAdmin mutation writes immutable audit evidence. | OPEN | Audit model/API/middleware | Pending. | Include actor, role, IP/device where available. |
| LYL-SA-004 | Confirm SysAdmin UI cannot expose secret values. | VERIFYING | SuperAdmin integration API/UI | Read-only E2E secret-exposure assertion added. | Backend and UI source audit still pending. |

## P0 Secret And Vault Handling

| ID | Requirement | Status | Primary Files | Evidence | Notes |
|---|---|---|---|---|---|
| LYL-SEC-001 | Verify no committed secrets in code, docs, scripts, or cert folders. | OPEN | Full repo | Pending secret-pattern audit. | Do not print secret values in reports. |
| LYL-SEC-002 | Verify runtime secrets come from Vault or approved local-dev files only. | OPEN | Settings, compose, Vault helpers | Pending. | Production path must be Vault-backed. |
| LYL-SEC-003 | Verify APIs never return secret values in integration previews. | VERIFYING | SuperAdmin integration APIs | Read-only Playwright assertion added. | Backend source audit still required. |
| LYL-SEC-004 | Verify logs mask PII and secrets. | OPEN | Logging, middleware, service clients | Pending. | Must include error paths. |

## P1 Frontend Cleanup

| ID | Requirement | Status | Primary Files | Evidence | Notes |
|---|---|---|---|---|---|
| LYL-FE-001 | Resolve production-relevant Next build warnings. | OPEN | Frontend app/components | `npm run build` passes with warnings. | Warnings include `<img>`, hook deps, and font declaration. |
| LYL-FE-002 | Run real guarded Playwright Owner flow on staging. | OPEN | Playwright suites | Pending. | Requires `PLAYWRIGHT_OWNER_EMAIL/PASSWORD`. |
| LYL-FE-003 | Run real guarded Playwright SysAdmin flow on staging. | OPEN | Playwright suites | Pending. | Requires `PLAYWRIGHT_SUPERADMIN_EMAIL/PASSWORD`; mutation flag only on disposable/staging. |
| LYL-FE-004 | Confirm frontend menus match backend permissions. | OPEN | Next routes/components and backend permissions | Pending. | Do not rely only on client-side guards. |

## P1 Dependency And Security Audit

| ID | Requirement | Status | Primary Files | Evidence | Notes |
|---|---|---|---|---|---|
| LYL-DEP-001 | Run frontend production dependency audit. | OPEN | `frontend/package-lock.json` | Pending current command. | Record real advisories only. |
| LYL-DEP-002 | Run Python dependency audit with installed tool. | OPEN | `backend/requirements*.txt` | Pending. | Install/use approved project tooling only. |
| LYL-DEP-003 | Run backend security scanner if configured. | OPEN | Backend | Pending. | Do not invent a configured gate. |

## Current Implementation Delta

| Area | Files |
|---|---|
| Rules artifact | `rules.md` |
| E2E safety helper | `frontend/tests/e2e/helpers/e2e-safety.ts` |
| E2E suites changed | `frontend/tests/e2e/helpers/auth.setup.ts`, `frontend/tests/e2e/suite/01-auth.spec.ts`, `02-programs.spec.ts`, `09-settings-billing.spec.ts`, `11-superadmin.spec.ts`, `13-dashboard-kpis.spec.ts`, `14-program-crud-full.spec.ts`, `15-phone-verification.spec.ts`, `16-srs-hardening.spec.ts`, `17-whatsapp-campaigns.spec.ts`, `18-whatsapp-bridge-e2e.spec.ts`, `20-plan-rate-limits.spec.ts`, `21-sms-campaigns.spec.ts`, `22-wallet-flows.spec.ts`, `23-email-campaigns.spec.ts`, `24-whatsapp-campaigns.spec.ts`, `25-owner-full-menu.spec.ts`, `26-superadmin-full-menu.spec.ts` |
| Existing dirty file not owned by this TODO slice | `backend/apps/authentication/otp_service.py` |

## Execution Order From Here

1. Fix backend Ruff errors with minimal behavior-preserving edits.
2. Re-run backend Ruff and formatting gates.
3. Inspect backend test configuration and start the real required Postgres/Vault test services.
4. Run backend pytest against real services and fix real failures.
5. Audit backend Owner/Admin/SysAdmin authorization and tenant isolation.
6. Audit SysAdmin destructive endpoints and server-side environment guards.
7. Audit secret handling in Vault, APIs, UI previews, and logs.
8. Run guarded Playwright flows against a disposable/staging environment with real credentials.
9. Run dependency/security audits.
10. Update this document with only current command evidence.
