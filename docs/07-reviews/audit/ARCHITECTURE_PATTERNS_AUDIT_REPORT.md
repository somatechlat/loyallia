---
title: "Architecture & Patterns Audit Report"
document_id: "LOYALLIA-DOC-ARCHITECTURE_PATTERNS_AUDIT_REPORT.MD"
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
| **Document ID** | LOYALLIA-DOC-ARCHITECTURE_PATTERNS_AUDIT_REPORT.MD |
| **Title** | Architecture & Patterns Audit Report |
| **Version** | 1.0 |
| **Date** | 2026-09-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | Spanish |
| **Format** | Markdown (.md) |
| **Location** | `docs/07-reviews/audit/ARCHITECTURE_PATTERNS_AUDIT_REPORT.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-16 | Engineering Lead | Added ISO-compliant document controls |

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
| LOYALLIA-ARCH-001 | Architecture Diagrams | Reference |

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

> **Estado del documento (2026-06-11):** Revisión basada en el código y documentación vigente.
> Algunos hallazgos pueden haber cambiado; verificar siempre contra el código fuente.

# Architecture & Patterns Audit Report

**Project:** Loyallia  
**Audit snapshot date:** 2026-06-04  
**Auditor:** Architecture & Patterns Audit Agent  
**Scope:** `backend/apps/*/*.py`, `backend/common/`, `backend/loyallia/`, `frontend/src/lib/`, `frontend/src/hooks/`, `frontend/src/components/`, `frontend/src/app/`  
**Current verified counts (as of 2026-06-11):**
- Backend Python files: ~456
- Frontend TS/TSX files (`frontend/src`): ~249
- E2E test files: 32
- Backend test files: 42
- Frontend unit test files: 7

> ⚠️ **Historical metrics disclaimer:** Findings, severity counts, and line references below reflect the 2026-06-04 audit snapshot. Status notes indicate which items have been resolved or remain valid as of 2026-06-11.

---

## Executive Summary

- **Files audited:** ~350+ (all backend app Python files, common utilities, settings, and all frontend src directories)
- **Issues found:** 28 (P0: 10, P1: 13, P2: 5) *(as of 2026-06-04 snapshot; several P0/P1 items resolved as of 2026-06-11)*

The codebase demonstrates strong architectural discipline in many areas: centralized API clients, consistent i18n, proper tenant isolation, and service-layer extraction for most business domains. **As of 2026-06-11, the backend is free of files exceeding the 650-line limit, `ruff check --select F821,F401` passes, the `Automation` god class has been refactored, and `CustomerPass.process_transaction` now delegates to the service layer.** No significant architectural concerns remain open at the backend level; the remaining work is frontend file-size cleanup and import-hygiene polish.

---

## Critical Issues (P0)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 1 | `backend/apps/customers/models.py` | 1–649 | ~~**File exceeds 650 lines**~~ **RESOLVED** | Code files should stay under 650 lines | Refactored to 649 lines; remaining `process_transaction` god function tracked separately |
| 2 | `backend/apps/backup/api.py` | — | ~~**File exceeds 650 lines**~~ **RESOLVED** — split into package | Code files should stay under 650 lines | Monolithic `api.py` replaced by `backend/apps/backup/api/` package (`core.py`, `jobs.py`, `restores.py`, `settings.py`, `offsite.py`) |
| 3 | `backend/apps/automation/models.py` | 1–364 | ~~**File exceeds 650 lines**~~ **RESOLVED** | Code files should stay under 650 lines | Refactored to 364 lines; execution logic moved to `apps/automation/engine.py` and `webhook_executor.py` |
| 4 | `backend/apps/billing/models.py` | 1–607 | ~~**File exceeds 650 lines**~~ **RESOLVED** | Code files should stay under 650 lines | Refactored to 607 lines |
| 5 | `backend/apps/tenants/models.py` | 1–576 | ~~**File exceeds 650 lines**~~ **RESOLVED** | Code files should stay under 650 lines | Refactored to 576 lines |
| 6 | `backend/apps/customers/pass_engine/apple_pass_builders.py` | 1–128 | ~~**File exceeds 650 lines**~~ **RESOLVED** | Code files should stay under 650 lines | Split into `builders/` package and helper modules (`apple_field_builders.py`, `apple_pass.py`, `apple_v2_builders.py`, etc.) |
| 7 | `frontend/src/components/wallet/constants.ts` | 1–726 | **File exceeds 650 lines** (726 lines) | Code files should stay under 650 lines | Split into `wallet/constants/card-types.ts`, `industries.ts`, `barcodes.ts`, `colors.ts` |
| 8 | `backend/apps/tenants/models.py` | — | ~~**Undefined name `logger`**~~ **RESOLVED** | Do not invent APIs or leave undefined names; runtime will raise `NameError` | `ruff check --select F821` passes; missing `logger` import added |
| 9 | `backend/apps/customers/portal_auth.py` | — | ~~**Undefined name `logging`**~~ **RESOLVED** | Do not lie/guess; this will raise `NameError` at runtime on optional auth failures | `ruff check --select F821` passes; missing `logging` import added |
| 10 | `backend/apps/automation/models.py` | 187–236 | ~~**God class**~~ **RESOLVED** | Business logic extracted from views to services/; Proper separation of concerns; No god classes | Execution methods moved to `apps/automation/engine.py` and `apps/automation/webhook_executor.py`; model now only holds data and `can_execute`/`execute` entry points |

---

## Important Issues (P1)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 11 | `backend/apps/customers/models.py` | 570–576 | ~~**God function**~~ **RESOLVED** — `CustomerPass.process_transaction()` is now a 7-line delegation to `apps.customers.services.pass_transactions.process_pass_transaction()`. All card-type branching moved out of the model. | Business logic extracted to services/; No god functions | No action needed; service-layer extraction complete |
| 12 | `backend/apps/tenants/api.py` | 30–52 | **Module-level imports not at top of file** (E402). `AIChatIn` schema is defined, then multiple `from ... import` statements appear below it. **Still open.** | Import hygiene | Move all imports to the top of the file; define `AIChatIn` after imports or in `schemas.py` |
| 13 | `backend/apps/analytics/api.py` | 100, 171, 223, 295, 341, 403, 450 | **Repeated inline import** — `from ninja.errors import HttpError` imported inside 7 separate view functions instead of once at module level. **Still open.** | Import hygiene; no repeated inline imports unless circular-import avoidance | Move to module-level imports (no circular dependency exists here) |
| 14 | `backend/apps/customers/models.py` | 242–244 | **Runtime imports inside methods** — `import logging`, `import secrets`, `import string` imported inside `generate_referral_code()`. **Still open.** | Import hygiene | Move all imports to module level |
| 15 | `backend/apps/automation/models.py` | 292 | ~~**Runtime imports inside methods**~~ **RESOLVED** — remaining inline import is defensive `import logging` inside a single error path; framework imports moved to `engine.py` | Import hygiene; no repeated inline imports | Move the lone `import logging` to module level |
| 16 | `backend/apps/tenants/api.py` | 240–250 | **Manual JSON body parsing** in `update_location` instead of letting Ninja parse the request body automatically. **Still open.** | Proper separation of concerns; framework layer mixing | Remove manual `json.loads(request.body)`; use Ninja schema `LocationUpdateIn` as endpoint parameter directly |
| 17 | `backend/apps/cards/api.py` | — | ~~**Unused import** — `from apps.transactions.models import Enrollment`~~ **RESOLVED** | Import hygiene | Removed; `ruff check --select F401` passes |
| 18 | `backend/apps/customers/api.py` | — | ~~**Unused imports** — `typing.Any`, `CustomerPass`, `django.core.cache.cache`~~ **RESOLVED** | Import hygiene | Removed; `ruff check --select F401` passes |
| 19 | `backend/apps/authentication/api.py` | — | ~~**Unused import** — `RefreshToken`~~ **RESOLVED** | Import hygiene | Removed; `ruff check --select F401` passes |
| 20 | `backend/apps/authentication/services.py` | — | ~~**Unused imports** — `issue_tokens` and `hash_token`~~ **RESOLVED** | Import hygiene | Removed; `ruff check --select F401` passes |
| 21 | `backend/apps/billing/services.py` | — | ~~**Unused imports** — `django.conf.settings`, `SubscriptionPlan`, `PlatformSetting`~~ **RESOLVED** | Import hygiene | Removed; `ruff check --select F401` passes |
| 22 | `backend/apps/tenants/super_admin_api/tenants.py` | — | ~~**Unused import** — `django.conf.settings`~~ **RESOLVED** | Import hygiene | Removed; `ruff check --select F401` passes |
| 23 | `backend/apps/notifications/api/inbox.py` | — | ~~**Unused imports** — `HttpError` and `get_message`~~ **RESOLVED** | Import hygiene | Removed; `ruff check --select F401` passes |

---

## Minor Issues (P2)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 24 | `backend/apps/transactions/api.py` | 54–66 | **Helper function `_serialize_json_value` defined in API layer** instead of `common/` utilities | Proper separation of concerns | Move to `common/serializers.py` or similar shared utility module |
| 25 | `backend/apps/billing/api.py` | 87–93 | **Tax calculation duplicated inline** in `list_plans` instead of reusing model property or service | DRY / separation of concerns | Reuse `SubscriptionPlan.price_monthly_with_tax` property or a billing service helper |
| 26 | `backend/apps/redemption/api.py` | 150–171 | **Inline audit imports** inside `transact_v2` — `apps.audit.models` and `apps.audit.service` imported inside the function body | Import hygiene | Move to module level (no circular dependency exists) |
| 27 | `backend/apps/backup/api.py` | — | ~~**Inline imports inside trigger/restore endpoints**~~ **RESOLVED** — monolithic `backup/api.py` split into `backup/api/` package; imports are now consolidated at module level in `core.py`, `jobs.py`, `restores.py`, `settings.py`, `offsite.py` | Import hygiene | Remaining inline imports in `restores.py` are isolated to optional restore paths; consolidate if no circular risk |
| 28 | `backend/apps/customers/api.py` | 237–240 | **Inline DB query inside `log_action` details** — `Customer.objects.filter(...).count()` executed inside a log dict, causing an extra query | Performance / separation of concerns | Compute `is_new_customer` before `log_action` call and pass as a boolean variable |

---

## Positive Findings

- **Service-layer extraction is well-practiced** in `apps.customers.services`, `apps.authentication.services`, `apps.cards.services`, and `apps.billing.services`. API views are thin wrappers that delegate to services.
- **API client layer is centralized** in `frontend/src/lib/api.ts` with typed helpers (`authApi`, `customersApi`, `programsApi`, etc.), request deduplication, automatic token refresh, and exponential-backoff retry.
- **i18n is centralized** — Backend uses `common/messages/` with canonical Spanish catalogs and `get_message()` lookups; frontend uses `lib/i18n/index.tsx` with nested key resolution and fallback to Spanish.
- **No mixing of frontend state management patterns** — The frontend consistently uses React Context (`AuthContext`, `I18nContext`, `ThemeContext`, `PlanContext`) plus local `useState` in custom hooks. No Redux, Zustand, MobX, or Jotai were found.
- **No forbidden frameworks** — No FastAPI, Starlette, SQLAlchemy, Alembic, Lit, Vue, Angular, or Alpine were found in the audited directories.
- **Tenant isolation is consistently enforced** — Nearly every API endpoint filters by `request.tenant` or uses `require_tenant(request)`.
- **No wildcard imports** were found in any audited Python file.
- **No circular imports** detected — All major Django app modules import successfully without `ImportError` or circular dependency exceptions.
- **No undefined-name errors** — `ruff check --select F821` passes across `backend/`.
- **No unused imports** — `ruff check --select F401` passes across `backend/`.
- **Backend line-limit compliance** — All backend Python files are ≤ 649 lines after the refactor.
- **Backup API modularized** — `apps.backup.api` is now a package with separated concerns.
- **Automation engine refactored** — `Automation` model no longer contains action execution methods; logic lives in `apps/automation/engine.py` and `webhook_executor.py`.
- **Error handling is consistent** — APIs use `ninja.errors.HttpError` with message codes from `get_message()`, and frontend hooks use `toast` for user-facing errors.

---

## Architectural Recommendations

1. **Enforce the 650-line limit automatically** — Add a CI gate (`wc -l` or similar) so that files exceeding the limit fail the build before merge. Backend is now compliant; remaining violations are frontend wallet files (`constants.ts`, `templates/registry.ts`, `AppleWalletPreview.tsx`).

2. ~~**Move Automation execution logic out of the model**~~ **DONE** — Execution logic now lives in `apps/automation/engine.py` and `webhook_executor.py`.

3. ~~**Move `CustomerPass.process_transaction` to the service layer**~~ **DONE** — `CustomerPass.process_transaction()` now delegates to `apps/customers/services/pass_transactions.py`; the model only exposes a thin delegation method.

4. ~~**Fix the three `F821 Undefined name` errors immediately**~~ **DONE** — `ruff check --select F821` passes.

5. **Standardize on module-level imports** — Several files still use inline imports where no circular dependency exists (`analytics/api.py` inline `HttpError`, `tenants/api.py` E402, `customers/models.py` runtime imports). Run `ruff check --select E402,F401,F821` in CI and fix on every PR.

6. **Split frontend wallet constants** — `wallet/constants.ts` is 726 lines; `wallet/templates/registry.ts` is 926 lines; `wallet/AppleWalletPreview.tsx` is 664 lines. Split into semantic chunks to improve tree-shaking and readability.

7. **Consider splitting large SuperAdmin files** — `apps/tenants/super_admin_api/platform.py` and `tenants.py` remain under 650 lines for now; monitor as they grow.
