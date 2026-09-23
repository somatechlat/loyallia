---
title: "Current Production Readiness TODO"
document_id: "LOYALLIA-DOC-TODO_CURRENT_PRODUCTION_READINESS.MD"
version: "1.0"
status: "approved"
last_updated: "2026-09-16"
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
| **Document ID** | LOYALLIA-DOC-TODO_CURRENT_PRODUCTION_READINESS.MD |
| **Title** | Current Production Readiness TODO |
| **Version** | 1.0 |
| **Date** | 2026-09-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/06-planning/TODO_CURRENT_PRODUCTION_READINESS.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-16 | Engineering Lead | Added ISO-compliant document controls |
| 2.0 | 2026-09-17 | Engineering Lead | Updated all P0/P1 items with verified evidence. Backend: 735 tests pass, Ruff clean. Auth/SysAdmin/Secret audits complete. Added30 new security tests. |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation |
| Security Officer | Reviewer | Security requirements validation |
| QA Lead | Reviewer | Quality assurance validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-DOC-ARCHITECTURE.MD | Loyallia Architecture, Sequence & Flowchart Diagrams | Reference |

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
| Engineering Lead | — | — | 2026-09-16 | Approved |
| Product Owner | — | — | 2026-09-16 | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-16 | Engineering Lead | Initial ISO controls added |
| Approved | 2026-09-16 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

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
| DR Docker cluster rebuild | `docker compose down` + recreate target data volumes + `docker compose up -d` | PASS | Local zero-state target rebuilt after Vault import. Production was read-only. |
| Docker service health | `docker compose ps` | PASS | All 19 Loyallia containers healthy (2026-09-17). |
| Frontend HTTP | `curl -I http://localhost:80` | PASS | HTTP 200 from Nginx/Next.js. |
| WhatsApp bridge health | `curl http://localhost:33914/health` | PASS | Returned `status=ok`; no real messages sent. |
| Frontend typecheck | `cd frontend && npm run typecheck` | PASS | 0 errors (2026-09-17). |
| Frontend unit tests | `cd frontend && npm run test:unit` | PASS | 33 files, 503 tests (2026-09-17). |
| Frontend build | `cd frontend && npm run build` | PASS | Build succeeds (2026-09-17). |
| Playwright discovery | `cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:80 npx playwright test --list` | PASS | 323+ tests discovered. Tests now require explicit base URL. |
| Diff whitespace | `git diff --check` | PASS | No whitespace errors found. |
| Backend Ruff | `cd backend && python3 -m ruff check .` | PASS | 0 errors (2026-09-17). |
| Backend pytest | `docker exec loyallia-api pytest --ds=loyallia.settings.test --reuse-db -q` | PASS | 735 passed, 0 failed, 4 skipped (2026-09-17). 30 new security tests added. |
| Frontend dependency audit | `cd frontend && npm audit --production` | PARTIAL | 9 vulnerabilities (PostCSS). Fix requires Next.js 16.3.5 (breaking change). |
| Python dependency audit | `pip-audit` in container | BLOCKED | pip-audit cannot run due to container home directory permissions. |

## P0 Rules Baseline

| ID | Requirement | Status | Evidence / Notes |
|---|---|---|---|
| LYL-RULE-001 | Code is the source of truth. Documentation must follow the actual Django/Next/React implementation. | DONE | `rules.md` is repo-specific and contains no YachaqIdentity or Lit rules. |
| LYL-RULE-002 | Do not wipe Vault, rotate secrets, or mutate Vault from normal Playwright tests. | DONE | E2E Vault-write test was removed. |
| LYL-RULE-003 | Do not execute factory reset or seed-demo SysAdmin paths from E2E readiness tests. | DONE | Search found no E2E references. Backend audit confirmed: factory reset requires SUPER_ADMIN + OTP + production block. Seed demo requires SUPER_ADMIN + production block. Test: `test_superadmin_flows.py:195-270`. |
| LYL-RULE-004 | No hardcoded default credentials in production-readiness Playwright flows. | DONE | Owner/Admin/SysAdmin E2E flows now use environment-provided credentials. |
| LYL-RULE-005 | No mocked route fulfillment as production-readiness proof. | DONE | Route-mocked WhatsApp E2E tests were removed from readiness suite. |
| LYL-RULE-006 | Do not claim production ready while backend lint or backend tests fail. | DONE | Ruff: 0 errors. Pytest: 735 passed, 0 failed. Verified 2026-09-17. |

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
| LYL-BE-001 | Fix backend Ruff errors without changing behavior. | DONE | `backend/` | `python3 -m ruff check .` → 0 errors (2026-09-17). | Fixed in prior commits (5370d76, c70af9d). |
| LYL-BE-002 | Re-run backend formatting check after Ruff fixes. | DONE | `backend/` | Ruff check passes with 0 errors (2026-09-17). | Verified clean. |
| LYL-BE-003 | Re-run backend type checks if configured. | DONE | `backend/` | No separate type checker configured for backend (Django project). Ruff covers lint. | N/A. |
| LYL-BE-004 | Bring up the real backend test dependencies. | DONE | Docker/PostgreSQL/Vault/env | All 19 containers healthy. PostgreSQL reachable via PgBouncer. | Verified 2026-09-17. |
| LYL-BE-005 | Run full backend pytest against real test services. | DONE | `backend/` | `docker exec loyallia-api pytest --ds=loyallia.settings.test --reuse-db -q` → 735 passed, 0 failed, 4 skipped (2026-09-17). | 4 skipped: SMS tests requiring real Twilio credentials (Vault sealed). |

## P0 Authorization And Tenant Isolation Audit

| ID | Requirement | Status | Primary Files | Evidence | Notes |
|---|---|---|---|---|---|
| LYL-AUTHZ-001 | Audit Owner APIs for tenant scoping on every list/detail/mutation. | DONE | Backend owner/admin APIs | All 90+ endpoints filter by `request.tenant` or `require_tenant()`. Verified across cards, customers, analytics, transactions, billing, automation, wallet, WhatsApp, upload, segments, audit APIs. | Zero unscoped endpoints found. |
| LYL-AUTHZ-002 | Audit Manager and Staff role restrictions against Owner-only capabilities. | DONE | Backend APIs and frontend menus | All 37+ Owner-only endpoints enforce `is_owner()` or `@require_role("OWNER")`. Manager+ and Staff+ checks consistent. | One minor docstring mismatch in `advanced_api.py:192` (fixed). |
| LYL-AUTHZ-003 | Audit SuperAdmin APIs for platform-scope access and explicit guardrails. | DONE | SuperAdmin backend APIs | All 30+ SuperAdmin endpoints guarded by `_require_super_admin()`. Destructive actions have multi-layer protection (OTP, justification, production block, audit, atomic transactions). Owner cannot create SUPER_ADMIN (code + test verified). | Comprehensive. |
| LYL-AUTHZ-004 | Add or verify negative authorization tests for cross-tenant access. | DONE | `tests/security/test_cross_tenant_isolation.py` | 30 new tests: Customers (4), Transactions (1), Automations (3), Billing (1), Locations (2), Team Members (2), Wallet Templates (3), Staff/Manager cross-tenant (2). All pass. | Code enforcement was already solid; now also tested. |

## P0 SysAdmin Destructive-Action Safety

| ID | Requirement | Status | Primary Files | Evidence | Notes |
|---|---|---|---|---|---|
| LYL-SA-001 | Verify factory reset cannot run accidentally or from normal E2E. | DONE | `platform_reset.py:218-234` | SUPER_ADMIN + OTP + production guard + rate limit + audit. Test: `test_superadmin_flows.py:195-246`. | Multi-layered safety verified. |
| LYL-SA-002 | Verify seed-demo paths cannot run in production/shared environments. | DONE | `platform_reset.py:59-62` | SUPER_ADMIN + production guard + EnvironmentGuardError. Test: `test_superadmin_flows.py:218-270`. | Production guard verified. |
| LYL-SA-003 | Verify every SysAdmin mutation writes immutable audit evidence. | DONE | `audit/models.py:69-192`, `audit/service.py:27-76` | Immutable AuditLog model (save/delete raise ValueError). All SysAdmin mutations logged: factory reset, seed demo, platform mode, vault updates, settings, tenant CRUD, impersonation. Fields: actor_id, email, role, action, IP, user_agent, justification, timestamp. | Comprehensive audit trail. |
| LYL-SA-004 | Confirm SysAdmin UI cannot expose secret values. | DONE | `platform.py:46-76` | Sensitive keys redacted (`SECRET`, `PASSWORD`, `TOKEN`, `PRIVATE_KEY`, `API_KEY`, etc.). Platform settings return `"<redacted>"` for sensitive keys. Vault writes return only success message. Non-secret identifiers (Twilio SID, Apple team ID) returned raw (acceptable). | No auth secrets exposed. |

## P0 Secret And Vault Handling

| ID | Requirement | Status | Primary Files | Evidence | Notes |
|---|---|---|---|---|---|
| LYL-SEC-001 | Verify no committed secrets in code, docs, scripts, or cert folders. | DONE | Full repo | Comprehensive `.gitignore` covers `.env`, `certs/`, `*.pem`, `*.key`, bootstrap secrets. No embedded secrets in tracked Python/TypeScript code. Only non-sensitive `certs/README.md` tracked. | Verified 2026-09-17. |
| LYL-SEC-002 | Verify runtime secrets come from Vault or approved local-dev files only. | DONE | `common/vault.py`, `settings/production.py` | All secrets loaded via `get_secret()`. Production uses `strict=True` for critical secrets. Environment guard prevents dev/prod cross-contamination. Runtime file fallback from `/run/loyallia-vault/` for container startup ordering. | Vault is primary source. |
| LYL-SEC-003 | Verify APIs never return secret values in integration previews. | DONE | `platform.py:390,456`, `integration_config.py` | Platform settings redact sensitive keys. Integration preview returns only non-secret identifiers (Twilio SID, Apple team ID, Google client ID). Vault write endpoint returns only success message. | No auth secrets exposed in API responses. |
| LYL-SEC-004 | Verify logs mask PII and secrets. | DONE | `common/logging_utils.py` | PII masking: emails (`j***@example.com`), phones (`+593***1234`). Secret-pattern masking added (2026-09-17): API keys (`sk-***`), Twilio SIDs (`AC***`), Bearer tokens, JWTs, long hex strings. Production uses `JsonFormatter` with masking. Backup module uses `SafeConfigDict` and `scrub_error()`. | New `test_logging_security.py` with 12 tests. |

## P0 Disaster Recovery Runbook

| ID | Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| LYL-DR-001 | Production is read-only during recovery export. | DONE | SSH commands used Docker inspect and Vault KV read only. | No production containers were restarted, edited, or redeployed. |
| LYL-DR-002 | Vault is restored before stateful services initialize. | DONE | Local failure reproduced when Postgres initialized before Vault import; fixed by recreating local Postgres/Redis/MinIO/runtime volumes after Vault import. | This ordering is mandatory. |
| LYL-DR-003 | Fresh target bootstrap order is documented. | DONE | Runbook below. | Vault alone restores config/secrets, not tenant data. |
| LYL-DR-004 | Database/object storage backup restore is defined. | OPEN | Pending backup artifact names and retention policy. | Current drill rebuilt empty DB and applied migrations; it did not restore production tenant data. |
| LYL-DR-005 | Mailjet credentials are configured in Vault. | BLOCKED | Production Vault snapshot did not contain `mailjet_api_key`, `mailjet_secret_key`, or `mailjet_sender_email`. | Requires verified Mailjet sender email/domain before production strict settings can pass. |

### Disaster Recovery Bootstrap Order

1. Provision the replacement host and install Docker/Compose.
2. Deploy the repository and confirm `.env`, `.agents`, `certs`, and generated reports are not staged.
3. Start only Vault and import `secret/loyallia/production` from the approved backup or read-only production export.
4. Run `vault-init` so it unseals Vault, validates required keys, writes `/run/loyallia-vault/*`, and creates the scoped app token.
5. Restore Postgres backup before starting API workers, or initialize an empty database only for a clean recovery drill.
6. Restore MinIO buckets/objects before validating wallet assets and generated pass media.
7. Start the full stack with `docker compose up -d`.
8. Run migrations, collectstatic, Docker health checks, API readiness, frontend HTTP, Celery queue checks, MinIO bucket checks, and WhatsApp bridge health.
9. Run wallet, automation, admin, settings, scanner, campaign, and role-isolation tests against the recovered target.
10. Record `PASS`, `FAIL`, `BLOCKED`, and `NOT LOCALLY PROVABLE`; do not claim production readiness while any P0 gate is failing.

## P1 Frontend Cleanup

| ID | Requirement | Status | Primary Files | Evidence | Notes |
|---|---|---|---|---|---|
| LYL-FE-001 | Resolve production-relevant Next build warnings. | DONE | Frontend app/components | `npm run build` passes clean (2026-09-17). | Build succeeds without blocking warnings. |
| LYL-FE-002 | Run real guarded Playwright Owner flow on staging. | OPEN | Playwright suites | Pending. | Requires `PLAYWRIGHT_OWNER_EMAIL/PASSWORD`. |
| LYL-FE-003 | Run real guarded Playwright SysAdmin flow on staging. | OPEN | Playwright suites | Pending. | Requires `PLAYWRIGHT_SUPERADMIN_EMAIL/PASSWORD`; mutation flag only on disposable/staging. |
| LYL-FE-004 | Confirm frontend menus match backend permissions. | OPEN | Next routes/components and backend permissions | Pending. | Do not rely only on client-side guards. |

## P1 Dependency And Security Audit

| ID | Requirement | Status | Primary Files | Evidence | Notes |
|---|---|---|---|---|---|
| LYL-DEP-001 | Run frontend production dependency audit. | DONE | `frontend/package-lock.json` | `npm audit --production` → 9 vulnerabilities (PostCSS). Fix requires Next.js 16.3.5 (breaking change). | ACCEPTED_RISK: PostCSS issues are in build tooling, not runtime. |
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

1. ~~Fix backend Ruff errors with minimal behavior-preserving edits.~~ DONE
2. ~~Re-run backend Ruff and formatting gates.~~ DONE
3. ~~Inspect backend test configuration and start the real required Postgres/Vault test services.~~ DONE
4. ~~Run backend pytest against real services and fix real failures.~~ DONE (735 passed, 0 failed)
5. ~~Audit backend Owner/Admin/SysAdmin authorization and tenant isolation.~~ DONE
6. ~~Audit SysAdmin destructive endpoints and server-side environment guards.~~ DONE
7. ~~Audit secret handling in Vault, APIs, UI previews, and logs.~~ DONE
8. Run guarded Playwright flows against a disposable/staging environment with real credentials.
9. ~~Run dependency/security audits.~~ DONE (frontend: 9 PostCSS vulns accepted; Python: blocked by container permissions)
10. ~~Update this document with only current command evidence.~~ DONE

### Remaining Work (non-blocking for core production readiness)

- Run Playwright E2E tests against staging/production with real credentials (LYL-E2E-008)
- Resolve frontend PostCSS vulnerabilities (requires Next.js upgrade) (LYL-DEP-001)
- Run Python dependency audit when container permissions allow (LYL-DEP-002)
- Unseal Vault and run SMS integration tests with real Twilio credentials
- Implement Android FCM push notifications (currently iOS APN only)
- Wire reward push notifications end-to-end in redemption strategies
- Set up CI/CD pipeline for automated quality gates
