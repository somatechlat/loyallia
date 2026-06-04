# Architecture & Patterns Audit Report

**Project:** Loyallia  
**Date:** 2026-06-04  
**Auditor:** Architecture & Patterns Audit Agent  
**Scope:** `backend/apps/*/*.py`, `backend/common/`, `backend/loyallia/`, `frontend/src/lib/`, `frontend/src/hooks/`, `frontend/src/components/`, `frontend/src/app/`

---

## Executive Summary

- **Files audited:** ~350+ (all backend app Python files, common utilities, settings, and all frontend src directories)
- **Issues found:** 28 (P0: 10, P1: 13, P2: 5)

The codebase demonstrates strong architectural discipline in many areas: centralized API clients, consistent i18n, proper tenant isolation, and service-layer extraction for most business domains. However, several model files and one API file exceed the 650-line limit, and there are a few critical runtime errors (undefined names) detected by static analysis. The most significant architectural concern is the presence of **god classes/god functions** in `apps.customers.models` and `apps.automation.models`, where complex business logic resides in model methods rather than dedicated services.

---

## Critical Issues (P0)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 1 | `backend/apps/customers/models.py` | 1–774 | **File exceeds 650 lines** (774 lines) | Code files should stay under 650 lines | Split into `models/customer.py`, `models/customer_pass.py`, `models/apple_registration.py` |
| 2 | `backend/apps/backup/api.py` | 1–720 | **File exceeds 650 lines** (720 lines) | Code files should stay under 650 lines | Extract settings endpoints to `backup/settings_api.py`; keep jobs in `api.py` |
| 3 | `backend/apps/automation/models.py` | 1–716 | **File exceeds 650 lines** (716 lines) | Code files should stay under 650 lines | Split `Automation` and `AutomationExecution` into separate files under `models/` |
| 4 | `backend/apps/billing/models.py` | 1–660 | **File exceeds 650 lines** (660 lines) | Code files should stay under 650 lines | Extract `SubscriptionPlan` to `models/plan.py` and `Subscription` to `models/subscription.py` |
| 5 | `backend/apps/tenants/models.py` | 1–659 | **File exceeds 650 lines** (659 lines) | Code files should stay under 650 lines | Extract `Location` and `PlatformSetting` to separate model files |
| 6 | `backend/apps/customers/pass_engine/apple_pass_builders.py` | 1–706 | **File exceeds 650 lines** (706 lines) | Code files should stay under 650 lines | Split by card-type builder into `builders/stamp.py`, `builders/cashback.py`, etc. |
| 7 | `frontend/src/components/wallet/constants.ts` | 1–741 | **File exceeds 650 lines** (741 lines) | Code files should stay under 650 lines | Split into `wallet/constants/card-types.ts`, `industries.ts`, `barcodes.ts`, `colors.ts` |
| 8 | `backend/apps/tenants/models.py` | 620 | **Undefined name `logger`** at module level in `PlatformSetting.refresh_cache()` | Do not invent APIs or leave undefined names; runtime will raise `NameError` | Add `import logging; logger = logging.getLogger(__name__)` at top of file after line 516 |
| 9 | `backend/apps/customers/portal_auth.py` | 120 | **Undefined name `logging`** — `logging.getLogger(__name__)` used but `logging` is not imported | Do not lie/guess; this will raise `NameError` at runtime on optional auth failures | Add `import logging` at top of file |
| 10 | `backend/apps/automation/models.py` | 186–648 | **God class** — `Automation` model contains 8 action execution methods (email, SMS, WhatsApp, wallet push, webhook, reward issuance, segment update) mixing framework layers and business logic directly in the model | Business logic extracted from views to services/; Proper separation of concerns; No god classes | Move all `_execute_*` methods to a new `apps/automation/services/executor.py`. Model should only hold data and simple `can_execute` checks. |

---

## Important Issues (P1)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 11 | `backend/apps/customers/models.py` | 572–707 | **God function** — `CustomerPass.process_transaction()` is a 135-line method with a 10-branch `if/elif` chain handling every card type. Business logic lives in the model, not `services/`. | Business logic extracted to services/; No god functions | Extract to `apps/customers/services/redemption_mapper.py` or delegate entirely to `apps.redemption` engine |
| 12 | `backend/apps/tenants/api.py` | 30–52 | **Module-level imports not at top of file** (E402). `AIChatIn` schema is defined, then multiple `from ... import` statements appear below it. | Import hygiene | Move all imports to the top of the file; define `AIChatIn` after imports or in `schemas.py` |
| 13 | `backend/apps/analytics/api.py` | 101, 172, 223, 296, 403, 451 | **Repeated inline import** — `from ninja.errors import HttpError` imported inside 6 separate view functions instead of once at module level | Import hygiene; no repeated inline imports unless circular-import avoidance | Move to module-level imports (no circular dependency exists here) |
| 14 | `backend/apps/customers/models.py` | 245, 304, 389 | **Runtime imports inside methods** — `import logging`, `import secrets`, `import string` imported inside `generate_referral_code()` and `execute()` | Import hygiene | Move all imports to module level |
| 15 | `backend/apps/automation/models.py` | 265–648 | **Runtime imports inside methods** — `import logging` and framework imports (`django.template.loader`, `apps.notifications.service`, etc.) inside nearly every `_execute_*` method | Import hygiene; no repeated inline imports | Move all stable imports to module level; use lazy imports only for genuine circular-avoidance |
| 16 | `backend/apps/tenants/api.py` | 242–251 | **Manual JSON body parsing** in `update_location` instead of letting Ninja parse the request body automatically | Proper separation of concerns; framework layer mixing | Remove manual `json.loads(request.body)`; use Ninja schema `LocationUpdateIn` as endpoint parameter directly |
| 17 | `backend/apps/cards/api.py` | 19 | **Unused import** — `from apps.transactions.models import Enrollment` is never referenced | Import hygiene | Remove unused import |
| 18 | `backend/apps/customers/api.py` | 7, 19, 194 | **Unused imports** — `typing.Any`, `CustomerPass`, `django.core.cache.cache` imported but unused | Import hygiene | Remove unused imports |
| 19 | `backend/apps/authentication/api.py` | 40 | **Unused import** — `RefreshToken` imported but unused | Import hygiene | Remove unused import |
| 20 | `backend/apps/authentication/services.py` | 16, 23 | **Unused imports** — `issue_tokens` and `hash_token` imported but unused | Import hygiene | Remove unused imports |
| 21 | `backend/apps/billing/services.py` | 10, 17, 21 | **Unused imports** — `django.conf.settings`, `SubscriptionPlan`, `PlatformSetting` imported but unused | Import hygiene | Remove unused imports |
| 22 | `backend/apps/tenants/super_admin_api/tenants.py` | 12 | **Unused import** — `django.conf.settings` imported but unused | Import hygiene | Remove unused import |
| 23 | `backend/apps/notifications/api/inbox.py` | 5, 8 | **Unused imports** — `HttpError` and `get_message` imported but unused | Import hygiene | Remove unused imports |

---

## Minor Issues (P2)

| # | File | Line | Issue | Rule Violated | Suggested Fix |
|---|------|------|-------|---------------|---------------|
| 24 | `backend/apps/transactions/api.py` | 54–66 | **Helper function `_serialize_json_value` defined in API layer** instead of `common/` utilities | Proper separation of concerns | Move to `common/serializers.py` or similar shared utility module |
| 25 | `backend/apps/billing/api.py` | 87–93 | **Tax calculation duplicated inline** in `list_plans` instead of reusing model property or service | DRY / separation of concerns | Reuse `SubscriptionPlan.price_monthly_with_tax` property or a billing service helper |
| 26 | `backend/apps/redemption/api.py` | 150–171 | **Inline audit imports** inside `transact_v2` — `apps.audit.models` and `apps.audit.service` imported inside the function body | Import hygiene | Move to module level (no circular dependency exists) |
| 27 | `backend/apps/backup/api.py` | 239–272 | **Inline imports inside trigger/restore endpoints** — tasks imported inside functions even though they are used at module level elsewhere | Import hygiene | Consolidate imports at module level where no circular risk exists |
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
- **Error handling is consistent** — APIs use `ninja.errors.HttpError` with message codes from `get_message()`, and frontend hooks use `toast` for user-facing errors.

---

## Architectural Recommendations

1. **Enforce the 650-line limit automatically** — Add a CI gate (`wc -l` or similar) so that files exceeding the limit fail the build before merge. The current violations are all in high-churn files (models, APIs, constants).

2. **Move Automation execution logic out of the model** — The `Automation` model is doing the work of a service layer. Create `apps/automation/services/executor.py` with a strategy-pattern dispatcher so each action type (email, SMS, WhatsApp, wallet, webhook) lives in its own module.

3. **Move `CustomerPass.process_transaction` to the Redemption service layer** — The 135-line card-type branching belongs in `apps/redemption/` or `apps/customers/services/`. The model should only expose a thin delegation method.

4. **Fix the three `F821 Undefined name` errors immediately** — `logger` in `tenants/models.py`, `logging` in `customers/portal_auth.py`, and `Tenant` in `billing/payment_models.py` are runtime crash risks.

5. **Standardize on module-level imports** — Many files use inline imports inside functions where no circular dependency exists. This hurts readability and slightly impacts performance. Run `ruff check --select E402,F401,F821` in CI and fix on every PR.

6. **Split frontend wallet constants** — `wallet/constants.ts` is 741 lines of pure data. It is low-risk to split into semantic chunks (card-types, industries, barcodes, color presets) to improve tree-shaking and readability.

7. **Consider splitting large SuperAdmin files** — While under 650 lines, `apps/tenants/super_admin_api/platform.py` (612 lines) and `tenants.py` (625 lines) are approaching the threshold. Proactively extract SysAdmin operations and broadcast endpoints before they grow.
