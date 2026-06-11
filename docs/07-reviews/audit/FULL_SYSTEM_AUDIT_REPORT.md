> **Estado del documento (2026-06-11):** Revisión basada en el código y documentación vigente.
> Algunos hallazgos pueden haber cambiado; verificar siempre contra el código fuente.

# Loyallia Enterprise Full-System Audit Report

**Project:** Loyallia  
**Branch:** `main`  
**Audit snapshot date:** 2026-06-11  
**Auditors:** 5 Specialized Agents (QA, Architecture, UI/UX, API/Security, Database)  
**Scope (original audit, 2026-06-04):** 640 files audited line-by-line  
**Current verified counts (as of 2026-06-11):**
- Backend Python: ~456 files (including migrations and tests)  
- Frontend TS/TSX (`frontend/src`): ~249 files  
- E2E tests: 43 files  
- Backend test files: 41 files  
- Frontend unit test files: 28 files  

> ⚠️ **Historical metrics disclaimer:** Findings, severity counts, and line references below reflect the 2026-06-04 audit snapshot unless explicitly updated. Status notes indicate which items have been resolved or remain valid as of 2026-06-11.

---

## Executive Summary

| Domain | Files | P0 | P1 | P2 | Total |
|--------|-------|----|----|----|-------|
| QA & Testing | 62 | 12 | 14 | 11 | **37** |
| Architecture & Patterns | 350+ | 10 | 13 | 5 | **28** *(several P0/P1 items resolved as of 2026-06-11)* |
| UI/UX Design | 68 | 12 | 35 | 40 | **87** |
| API Design & Security | 35 | 2 | 25 | 19 | **46** |
| Database Design & Performance | 36 | 4 | 14 | 10 | **28** |
| **TOTAL** | **551** | **40** | **101** | **85** | **226** |

### Severity Definitions
- **P0 (Critical):** Security vulnerabilities, runtime crashes, data loss risks, compliance violations
- **P1 (Important):** Performance bottlenecks, missing tests, architectural debt, accessibility gaps
- **P2 (Minor):** Code quality, maintainability, minor UX inconsistencies

---

## 🔴 Cross-Cutting Critical Issues (P0)

These issues span multiple domains and require immediate attention:

| # | Issue | Domains Affected | Files | Impact |
|---|-------|-----------------|-------|--------|
| 1 | **OWNER can invite SUPER_ADMIN** — `invite_user` has no role validation | API Security, Architecture | `backend/apps/authentication/users_api.py:122` (role assigned at line 146) | Role hierarchy bypass; SUPER_ADMIN creation by non-SUPER_ADMIN |
| 2 | **Impersonation revocation is broken** — cache key mismatch | API Security, Architecture | `backend/apps/tenants/super_admin_api/impersonation.py:156-163` | Revoked impersonation tokens still valid indefinitely |
| 3 | **Transaction.tenant uses CASCADE** — audit records erased on tenant deletion | Database, Compliance | `backend/apps/transactions/models.py:47` | LOPDP Art. 47 violation; permanent loss of financial audit trail |
| 4 | **N+1 query bomb in Card list endpoint** — 50 extra queries for 50 cards | Database, Performance | `backend/apps/cards/api.py:195` | Hot endpoint degraded; linear query growth |
| 5 | **Hardcoded Spanish strings on ~20+ screens** — i18n severely incomplete | UI/UX, Compliance | Login, Register, Scanner, Portal, Enrollment, Dashboard, Settings, etc. | Cannot support English/FR/DE markets; LOPDP requires accurate language |
| 6 | **No CI/CD exists** — quality gates not automated | QA, Architecture | `.github/workflows/` missing | Manual quality checks; regressions slip through |
| 7 | **Mocked APIs used as production proof** — scanner/wallet tests bypass real code | QA, API Security | `backend/tests/test_scanner.py`, `backend/tests/test_wallet.py` | False confidence in production readiness |
| 8 | ~~3 runtime `NameError` bugs — undefined `logger`/`logging`~~ **RESOLVED** | Architecture, API Security | `tenants/models.py`, `customers/portal_auth.py`, `billing/payment_models.py` | `ruff check --select F821` passes; missing imports added or unused code removed |
| 9 | **`search_customers` has no client-side pagination limit** — capped server-side | API Security, Database | `backend/apps/customers/api.py:77`, `backend/apps/customers/services/__init__.py:101` | Service now slices `[:50]`; API still does not expose `limit`/`offset` parameters |
| 10 | ~~7 backend files exceed 650-line limit~~ **RESOLVED**; frontend files still over limit | Architecture | Backend files now ≤ 649 lines; frontend over limit: `frontend/src/components/wallet/constants.ts` (726), `frontend/src/components/wallet/templates/registry.ts` (926), `frontend/src/components/wallet/AppleWalletPreview.tsx` (664) | Backend refactor complete; frontend wallet modules still need splitting |
| 11 | ~~HSTS/SSL hardening~~ **RESOLVED** | API Security, Architecture | `backend/loyallia/settings/production.py:25-27` | `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS=31536000`, `SECURE_HSTS_INCLUDE_SUBDOMAINS` enforced in production; nginx adds security headers |
| 12 | ~~Router import hygiene / missing imports~~ **RESOLVED** | Architecture | `backend/apps/api/router.py` | All routers imported cleanly at module level; no wildcard or inline fallback imports |
| 13 | ~~Automation engine expansion~~ **RESOLVED** | Architecture, Campaigns | `backend/apps/automation/engine.py`, `tasks.py`, `webhook_executor.py`, `models.py` | `trigger_webhook` action implemented; `points_threshold`, `inactive_reminder`, and `scheduled_time` triggers implemented with daily Celery Beat tasks |

---

## 📊 Module-by-Module Breakdown

### Authentication & Authorization
| Issue | Severity | Count | Key Problems |
|-------|----------|-------|-------------|
| Role validation gaps | P0 | 2 | `invite_user` bypasses hierarchy; `notify_top_buyers` allows MANAGER |
| Impersonation broken | P0 | 1 | Revocation cache key mismatch |
| Missing audit logging | P1/P2 | 8 | Register, email verify, password reset, Google login, phone verify still unaudited; login/logout now audited |
| Token TTL too long | P1 | 1 | Impersonation tokens = 60 min (should be ≤15) |

### Billing & Payments
| Issue | Severity | Count | Key Problems |
|-------|----------|-------|-------------|
| Mutation endpoints untested | P0/P1 | 4 | Subscribe, cancel, reactivate, update have zero tests |
| `invoice_data` leaks secrets | P1 | 1 | Raw gateway responses in API |
| Missing audit logging | P1 | 4 | Subscription changes, payment method changes |
| CASCADE on Invoice.tenant | P1 | 1 | SRI tax document loss risk |

### Customers & Portal
| Issue | Severity | Count | Key Problems |
|-------|----------|-------|-------------|
| Portal entirely untested | P0/P1 | 1 | Zero tests for portal endpoints |
| `process_transaction` god function | P0/P1 | 1 | 135-line method in model layer |
| Hardcoded Spanish strings | P0/P1 | 6 | Portal login, dashboard, enrollment, pass page |
| N+1 in customer queries | P1 | 1 | `search_customers` capped at 50 server-side; API still lacks `limit`/`offset` params |

### Scanner & Wallet
| Issue | Severity | Count | Key Problems |
|-------|----------|-------|-------------|
| Mocked APIs in tests | P0 | 2 | `RedemptionGateway` and `CustomerPass` mocked |
| Hardcoded Spanish strings | P0 | 1 | Entire scanner page |
| Wallet endpoints may bypass rate limiting | P1 | 1 | `/api/v1/wallet/` covered; `/wallet/apple/` mounted outside `/api/` prefix bypasses `RateLimitMiddleware` |
| No Apple Wallet Web Service tests | P1 | 1 | Completely untested |

### Campaigns & Automation
| Issue | Severity | Count | Key Problems |
|-------|----------|-------|-------------|
| ~~God class `Automation` model~~ **RESOLVED** | — | — | Execution methods moved to `apps/automation/engine.py`; model now only holds data and `can_execute`/`execute` entry points |
| N+1 in automation engine | P0/P1 | 1 | `can_execute_for_customer` still queries `CustomerAnalytics` and `customer.passes` per customer; `fire_trigger` prefetches `target_programs` but not analytics/passes |
| No pagination on list endpoints | P0 | 2 | `list_automations`, `list_team` |
| Missing audit logging | P1 | 4 | Automation CRUD, toggle, execute |

### Analytics & Reporting
| Issue | Severity | Count | Key Problems |
|-------|----------|-------|-------------|
| Zero indexes on analytics tables | P1 | 2 | `CustomerAnalytics`, `ProgramAnalytics` |
| O(N) query recomputation | P1 | 2 | `update_metrics()` methods |
| Unbounded `days` parameter | P1 | 2 | `get_overview_analytics`, `get_revenue_breakdown` |
| Hardcoded Spanish chart labels | P0/P1 | 10+ | DashboardInsights entire file |

### SuperAdmin & Platform
| Issue | Severity | Count | Key Problems |
|-------|----------|-------|-------------|
| Missing audit logging | P1 | 6 | Tenant suspend/reactivate, plan CRUD, platform settings |
| Manual JSON parsing | P1 | 2 | Bypasses Ninja schema validation |
| No positive-path tests for factory reset | P1 | 1 | Only guardrail tests exist |

### Backup & Restore
| Issue | Severity | Count | Key Problems |
|-------|----------|-------|-------------|
| Monolithic `backup/api.py` removed | — | — | Split into `backend/apps/backup/api/` package (`core.py`, `jobs.py`, `restores.py`, `settings.py`, `offsite.py`) |
| Missing audit logging | P1 | 0 | Backup trigger, verify, restore, and cleanup endpoints now audited via `_audit()` helper |

---

## 🟢 Positive Findings (What the Codebase Does Well)

1. **Service layer extraction** — Business logic is largely extracted from API views to dedicated `services/` packages
2. **Tenant isolation** — Consistently enforced across nearly every API endpoint
3. **No circular imports** — All major Django app modules import cleanly
4. **No wildcard imports** — Clean import hygiene across Python codebase
5. **Centralized API client** — Frontend `api.ts` has JWT injection, token refresh, retry, deduplication, offline detection
6. **i18n infrastructure exists** — Backend `common/messages/` and frontend `lib/i18n/` are well-architected
7. **CheckConstraints on financial data** — `Transaction`, `Invoice`, `SubscriptionPlan` enforce non-negative values at DB level
8. **`select_related`/`prefetch_related` widely used** — 40+ instances across APIs
9. **Security tests exist** — OTP entropy, password complexity, SSRF blocking, rate limiting, cross-tenant isolation
10. **Concurrency tests** — Stamp races, coupon double-redemption, gift certificate overdraft tested with real threads
11. **Plan enforcement tested** — 402/403 responses for missing features and exceeded limits
12. **Soft delete patterns** — `is_active` flags widespread across models
13. **Every model sets `db_table`** — All 30 concrete models explicitly define table names
14. **Idempotency keys** — Scanner transactions use `idempotency_key` with `db_index=True`
15. **E2E safety guardrails** — Production host blocking, real API login, no hardcoded passwords
16. **HSTS/SSL hardening** — Production settings enforce `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS=31536000`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, secure cookies; nginx adds security headers
17. **Automation engine expanded** — `trigger_webhook` action implemented; `points_threshold`, `inactive_reminder`, and `scheduled_time` triggers implemented with a daily Celery Beat task
18. **Backend line-limit compliance** — All backend Python files are now ≤ 649 lines; oversized backend models/APIs were split or refactored
19. **No undefined-name errors** — `ruff check --select F821` passes across `backend/`
20. **Backup API modularized** — Monolithic `backup/api.py` split into `backup/api/` package (`core.py`, `jobs.py`, `restores.py`, `settings.py`, `offsite.py`)
21. **Router imports cleaned** — `backend/apps/api/router.py` imports all routers at module level with no wildcard or inline fallback imports

---

## 🛠️ Recommended Remediation Roadmap

### Week 1 — Critical Fixes (P0)
- [ ] Fix `invite_user` role validation (block OWNER from creating SUPER_ADMIN) — **still open**
- [ ] Fix impersonation revocation cache key mismatch — **still open**
- [x] ~~Fix 3 runtime `NameError` bugs (`logger` in tenants/models.py, `logging` in portal_auth.py)~~ **RESOLVED**
- [x] ~~HSTS/SSL hardening and router import cleanup~~ **RESOLVED**
- [x] ~~Automation triggers/actions (`trigger_webhook`, `points_threshold`, `inactive_reminder`, `scheduled_time`)~~ **RESOLVED**
- [ ] Change `Transaction.tenant` from CASCADE to PROTECT — **still open**
- [ ] Fix N+1 in `CardOut.from_model` (hot list endpoint) — **still open**
- [ ] Add pagination to `list_automations` and `list_team` — **still open**
- [ ] Cap `limit` and `days` parameters on all list/analytics endpoints — **still open**

### Week 2 — Security Hardening (P0/P1)
- [ ] Add audit logging to all untested mutations (billing, tenant, SuperAdmin, auth)
- [ ] Redact `invoice_data` from API responses
- [ ] Reduce impersonation token TTL to 15 minutes
- [ ] Fix `notify_top_buyers` role check (OWNER only)
- [ ] Add rate limiting rule for `/wallet/` prefix (including `/wallet/apple/`)
- [ ] Change CASCADE to PROTECT on audit-critical models (Invoice, Enrollment, CampaignRun, BackupJob, Location)

### Week 3 — i18n Blitz (P0/P1)
- [ ] Extract all hardcoded Spanish strings from auth screens (login, register, forgot/reset password)
- [ ] Extract all hardcoded Spanish strings from scanner page
- [ ] Extract all hardcoded Spanish strings from portal pages
- [ ] Extract all hardcoded Spanish strings from enrollment page
- [ ] Extract all hardcoded Spanish strings from dashboard insights
- [ ] Extract all hardcoded Spanish strings from settings pages
- [ ] Add portal-specific i18n namespace

### Week 4 — Testing & CI/CD (P0/P1)
- [ ] Create `.github/workflows/ci.yml` with all 5 quality gates
- [ ] Rewrite scanner tests with real JWT auth (no mocks)
- [ ] Rewrite wallet tests with real DB objects (no mocks)
- [ ] Add integration tests for billing mutations (subscribe, cancel, reactivate)
- [ ] Add tests for backup/restore endpoints
- [ ] Add tests for portal endpoints
- [ ] Add tests for upload endpoints
- [ ] Fix E2E test data leaks (programs, tenants, campaigns)

### Week 5 — Architecture Cleanup (P1/P2)
- [x] ~~Extract `Automation` execution methods to `services/executor.py`~~ **RESOLVED** — execution logic moved to `apps/automation/engine.py` and `webhook_executor.py`
- [ ] Extract `CustomerPass.process_transaction` to `services/redemption_mapper.py` — **still open**
- [x] ~~Split backend files exceeding 650 lines~~ **RESOLVED** — all backend Python files ≤ 649 lines; frontend wallet files (`constants.ts`, `templates/registry.ts`, `AppleWalletPreview.tsx`) still over limit
- [ ] Replace legacy `unique_together` with `UniqueConstraint` (8 models) — **still open**
- [ ] Add DB indexes on `CustomerAnalytics` and `ProgramAnalytics` — **still open**
- [ ] Standardize module-level imports (remove inline imports where no circular risk) — **still open**
- [ ] Fix `update_location` and `update_tenant_admin` manual JSON parsing — **still open**

### Week 6 — Performance & Polish (P1/P2)
- [ ] Fix N+1 in automation engine (`can_execute_for_customer`)
- [ ] Cache `Tenant.effective_plan` property
- [ ] Add `created_by`/`updated_by` to high-risk models (PlatformSetting, Enrollment, BackupJob, PaymentMethod)
- [ ] Add focus traps to modals missing them (ProfileModal, ImportModal, enrollment modal)
- [ ] Replace native `confirm()` with `<ConfirmModal>` on Team and Portal pages
- [ ] Fix dashboard sidebar responsive behavior below 1024px

---

## Appendix: Per-Agent Report Locations

| Agent | Report Path |
|-------|-------------|
| QA & Testing | `docs/07-reviews/audit/QA_TESTING_AUDIT_REPORT.md` |
| Architecture & Patterns | `docs/07-reviews/audit/ARCHITECTURE_PATTERNS_AUDIT_REPORT.md` |
| UI/UX Design | `docs/07-reviews/audit/UI_UX_AUDIT_REPORT.md` |
| API Design & Security | `docs/07-reviews/audit/API_SECURITY_AUDIT_REPORT.md` |
| Database Design & Performance | `docs/07-reviews/audit/DATABASE_PERFORMANCE_AUDIT_REPORT.md` |

---

*End of Full-System Audit Report*
