# Loyallia Backend -- Comprehensive Architecture & Design Patterns Review

**Reviewer:** Loyallia-K2 (Senior Software Architect)
**Date:** 2025-01-28
**Scope:** Django 5 + Django Ninja Multi-Tenant SaaS Architecture
**Files Reviewed:** 30+ core architectural files

---

## Executive Summary

The Loyallia backend demonstrates a **solid multi-tenant SaaS architecture** with strong security practices, thoughtful performance optimizations, and clean separation of concerns. The project uses Django 5 with Django Ninja for REST APIs, implements JWT-based authentication with refresh token rotation, and enforces tenant isolation at the middleware layer.

**Overall Grade: B+ (Good architecture with some areas for improvement)**

---

## 1. Project Structure Assessment

### Directory Layout

```
loyallia/backend/
|-- apps/                          # Application modules
|   |-- agent_api/                 # External API for agents
|   |-- analytics/                 # Dashboard analytics
|   |-- api/                       # Central API router (Django Ninja)
|   |-- audit/                     # Audit logging (LOPDP compliance)
|   |-- authentication/            # JWT auth, users, OAuth
|   |-- automation/                # Business automation rules
|   |-- billing/                   # Subscriptions & payments
|   |-- cards/                     # Loyalty programs ("cards")
|   |-- customers/                 # Customer CRM + segments
|   |-- notifications/             # Multi-channel notifications
|   |-- tenants/                   # Multi-tenant core + superadmin
|   |-- transactions/              # Transaction engine + scanner
|-- common/                        # Shared utilities (cross-cutting)
|-- loyallia/                      # Django project settings
|-- tests/                         # Comprehensive test suite
|-- scripts/                       # Operational scripts
```

### Strengths

1. **Modular app structure** following Django conventions with `apps/` package.
2. **Centralized cross-cutting concerns** in `common/` (permissions, messages, rate limiting, vault, etc.).
3. **Consistent naming convention** -- each app follows `models.py`, `api.py`, `schemas.py`, `apps.py` pattern.
4. **Environment-separated settings** (`base.py`, `development.py`, `production.py`, `test.py`).
5. **PgBouncer database router** (`common/db_routers.py`) properly separates migration connections from app queries.

### Anti-Patterns Found

#### A. Duplicate Role Check Implementation
- **Files:** `common/permissions.py:121-148` and `common/role_check.py:13-36`
- **Issue:** Two nearly identical `require_role()` decorators exist. The one in `role_check.py` lacks the `as_tenant_request()` type-safety cast and imports `HttpError` inline (performance cost). `permissions.py` has the more robust version with proper typing.
- **Recommendation:** Remove `common/role_check.py` entirely and consolidate on `common/permissions.py`. Update all imports.

#### B. File Naming Inconsistency (`common/exceptions.py`)
- **File:** `common/exceptions.py` (line 1-2 docstring)
- **Issue:** The docstring says "Loyallia Pagination Utilities (common/exceptions.py -- actually pagination)". The file is named `exceptions.py` but contains **pagination utilities**, not exception classes. This is confusing.
- **Recommendation:** Rename to `common/pagination.py` (there's already `common/pagination.py` -- check for duplication). The actual `common/exceptions.py` should contain custom exception classes.

#### C. Schema Duplication
- **Files:** `common/schemas.py:10-15` and `apps/authentication/schemas.py:71-74`
- **Issue:** `MessageOut` schema is defined in both `common/schemas.py` and `apps/authentication/schemas.py`.
- **Recommendation:** Remove the duplicate from `apps/authentication/schemas.py` and import from `common/schemas.py`.

---

## 2. API Router Architecture (`apps/api/router.py`)

### Strengths

1. **Central router registration** (line 113-164) -- All sub-routers are mounted at a single location, making the API topology discoverable.
2. **Health check endpoints** (lines 24-110) with three tiers: liveness (`/health/`), readiness (`/health/ready/`), and Celery worker health (`/health/celery/`).
3. **Global exception handlers** (lines 212-225) for `ValidationError` and `HttpError` with consistent JSON response format.
4. **Backward-compatible aliases** (lines 186-208) for legacy `/cards/` and `/automations/` paths show migration-awareness.

### Anti-Patterns Found

#### A. Import Placement Inside Router File
- **File:** `apps/api/router.py`, lines 114-139
- **Issue:** All router imports are placed at the **bottom** of the file (after health check endpoint definitions), mixed with router mounting code. This violates PEP 8 (imports at top) and makes the file harder to read.
- **Recommendation:** Move all imports to the top of the file, below the `api` object creation.

#### B. Router Mounting Path Collision Risk
- **File:** `apps/api/router.py`, lines 141-163
- **Issue:** Multiple routers share the same mounting prefix:
  - `/auth/` has 3 routers (`auth_router`, `phone_verify_router`, `users_router`)
  - `/tenants/` has 2 routers (`tenants_router`, `tenant_security_privacy_router`)
  - `/billing/` has 2 routers (`billing_router`, `billing_payment_router`)
  - `/admin/` has 3 routers (`super_admin_router`, `platform_plans_router`, `platform_reset_router`)
- **Impact:** If two routers define the same endpoint path (e.g., both have a `GET /` handler), Django Ninja will raise an error at startup or silently override. This is a maintenance risk.
- **Recommendation:** Add integration tests that verify no URL collisions exist. Document which router owns which sub-paths.

#### C. Direct Endpoint Registration vs. Router Mounting
- **File:** `apps/api/router.py`, lines 186-208
- **Issue:** Backward-compatible endpoints are registered directly on the `api` object instead of being part of a router. This mixes two architectural patterns (router-based and direct registration).
- **Recommendation:** Move legacy aliases to a dedicated `legacy_router` and mount it appropriately. Add deprecation timeline.

#### D. Webhook Endpoint in Central Router
- **File:** `apps/api/router.py`, lines 167-182
- **Issue:** The Mailjet webhook handler is defined inline in the router file instead of being in a dedicated webhooks module. This bloats the router file with business logic.
- **Recommendation:** Move the webhook to `apps/notifications/api/webhooks.py` and import just the router.

---

## 3. URL Routing (`loyallia/urls.py`)

### Strengths

1. **Clean URL configuration** -- Only 3 paths: Django Admin, Ninja API v1, and Apple Wallet Web Service.
2. **Apple Wallet separation** (lines 22-37) -- Separate `NinjaAPI` instance with no docs, no auth (per Apple PassKit spec). This is architecturally correct.
3. **Development static/media serving** properly guarded by `settings.DEBUG`.

### Anti-Patterns Found

#### A. Apple Wallet API Instance Shares No Error Handlers
- **File:** `loyallia/urls.py`, lines 22-37
- **Issue:** The `apple_wallet_api` instance has no global exception handlers, meaning unhandled exceptions will return HTML (Django's default 500 page) instead of JSON.
- **Recommendation:** Add `exception_handler` decorators to `apple_wallet_api` or have it share the same error handlers from the main API.

---

## 4. Middleware Stack

### Common Middleware (`common/middleware.py`)

#### Strengths

1. **RequestIDMiddleware** (lines 25-52): Distributed tracing with `X-Request-ID`. Reuses upstream IDs if present. Zero DB queries. Excellent for log correlation.
2. **CSPNonceMiddleware** (lines 55-92): Per-request CSP nonce with 128-bit entropy. Covers Google Identity Services domains. Properly sets `Content-Security-Policy` header.
3. **CSRFExemptAPIMiddleware** (lines 95-114): Correctly exempts `/api/` paths from CSRF since JWT Bearer tokens are inherently CSRF-immune.
4. **Performance documentation** in comments -- every middleware notes its O(1) complexity.

#### Anti-Patterns Found

#### A. CSPNonceMiddleware Sets Header on ALL Responses
- **File:** `common/middleware.py`, lines 69-92
- **Issue:** The CSP header is set on every response, including API JSON responses (where it serves no purpose) and static file responses. This adds ~500 bytes to every response unnecessarily.
- **Recommendation:** Only set CSP headers on HTML/template responses. Skip for `/api/`, `/static/`, and `/media/` paths.

#### B. Duplicate JsonResponse Import
- **File:** `apps/api/router.py`, lines 9, 80, 103, 108
- **Issue:** `JsonResponse` is imported at the module level (line 9) AND re-imported locally inside functions (lines 80, 103, 108).
- **Recommendation:** Use the module-level import consistently. Remove local re-imports.

### Tenant Middleware (`apps/tenants/middleware.py`)

#### Strengths

1. **Zero-query tenant resolution** -- Tenant is derived from the already-loaded `user.tenant` (set by JWTAuth's `select_related("tenant")`).
2. **Security comment** (line 59): "Tenant derived from User FK, not from request headers" -- prevents tenant spoofing.
3. **Handles all auth states**: authenticated user, SUPER_ADMIN (tenant=None), unauthenticated (public endpoints).
4. **Uses `as_tenant_request()`** type cast for type-safe attribute access.

#### Anti-Patterns Found

#### A. None
- This file is well-architected and follows best practices.

---

## 5. Plan Enforcement Architecture (`common/plan_enforcement.py`)

### Strengths

1. **Three decorator patterns** clearly documented: `@require_active_subscription`, `@enforce_limit("customers")`, `@require_feature("ai_assistant")`.
2. **TOCTOU race condition prevention** (line 295): `select_for_update()` on Subscription row prevents concurrent limit breaches.
3. **Lazy lambda dispatch** (line 122-138): `get_current_usage()` uses a dispatch map with lazy lambdas to avoid counting unused models.
4. **Dynamic imports** (line 147-157): `_count_monthly()` uses `importlib` to avoid circular imports between `common/` and `apps/`.
5. **Comprehensive resource coverage**: 15 resource types mapped (customers, programs, locations, users, notifications, transactions, WhatsApp, SMS, emails, etc.).
6. **Trial limit defaults** (lines 70-86): Hard limits for trial tenants prevent resource exhaustion attacks.

### Anti-Patterns Found

#### A. N+1 Query Risk in `get_tenant_limits()`
- **File:** `common/plan_enforcement.py`, lines 54-107
- **Issue:** `get_tenant_limits()` does a `Subscription.objects.filter(tenant=tenant).first()` followed by `subscription.subscription_plan` (FK follow). If called multiple times per request (e.g., with stacked decorators), this can become N+1.
- **Recommendation:** Add `select_related("subscription_plan")` to the query. Consider caching the result on `request` for the duration of the request.

#### B. `check_plan_limit()` Always Acquires Row Lock
- **File:** `common/plan_enforcement.py`, lines 294-295
- **Issue:** `select_for_update()` is used even for read-only checks (e.g., listing customers where you just want to know if they can create more). This creates unnecessary lock contention.
- **Recommendation:** Split into `check_plan_limit_read()` (no lock) and `check_plan_limit_write()` (with lock). The decorators should accept a parameter to control locking behavior.

#### C. Decorators Stack in Wrong Order Risk
- **File:** `common/plan_enforcement.py`, lines 337-390
- **Issue:** The decorators don't use Django Ninja's `@decorate` mechanism. If a developer writes:
  ```python
  @enforce_limit("customers")
  @require_active_subscription
  def create_customer(...):
  ```
  The `enforce_limit` runs before `require_active_subscription`, which means it tries to check limits on a tenant that might not have a subscription.
- **Recommendation:** Document decorator ordering requirements clearly. Consider making `enforce_limit` internally call `require_active_subscription` logic first.

#### D. Magic Numbers for Trial Limits
- **File:** `common/plan_enforcement.py`, lines 71-85
- **Issue:** Trial limits (500 customers, 50 programs, etc.) are hardcoded magic numbers.
- **Recommendation:** Extract to a `TRIAL_LIMITS` constant at module level or make them PlatformSetting-driven.

---

## 6. Authentication Architecture

### Authentication API (`apps/authentication/api.py`)

#### Strengths

1. **Complete auth lifecycle** (612 lines): registration, login, refresh, logout, password reset, email verification, Google OAuth 2.0.
2. **Atomic transactions**: Tenant + User creation wrapped in `transaction.atomic()` (lines 121-137, 594-609).
3. **Email enumeration prevention** (line 91-101): Returns success for existing emails during registration (LYL-M-SEC-016).
4. **Refresh token rotation** (lines 238-240): Old token revoked atomically, new pair issued (B-002).
5. **Account lockout** (lines 168-172): 5 failed attempts = 15-minute lock with email notification.
6. **Rate limiting**: `@rate_limit` decorator on password reset and forgot-password endpoints.
7. **Phone verification** via Twilio Verify with server-side validation (lines 104-119).
8. **`update_fields` used everywhere** (e.g., line 351) to avoid full-row writes.
9. **Audit logging** (lines 181-191, 196-210) with try/except to never fail the main operation.
10. **All strings through `get_message()`** (Rule #11 compliance).

#### Anti-Patterns Found

#### A. Local Imports Scattered Throughout
- **File:** `apps/authentication/api.py`, multiple locations (lines 89, 107, 178, 197, 289, 302, 402, 451, 492, 519, 530, 534)
- **Issue:** Heavy use of local/inline imports (`from django.db import transaction`, `from apps.audit.models import AuditAction`, etc.). While some are for avoiding circular imports, many (like `transaction`) should be at module level.
- **Recommendation:** Move stable imports (Django stdlib: `transaction`, `cache`, `send_mail`) to the top. Only keep app-level imports local if they genuinely cause circular import issues.

#### B. Duplicate Password Reset Flow
- **File:** `apps/authentication/api.py`, lines 276-316 and 388-441
- **Issue:** Two separate password reset flows exist:
  - `/password-reset/request/` + `/password-reset/confirm/` (OTP-based)
  - `/forgot-password/` + `/reset-password/` (token-based via Django's `default_token_generator`)
- **Impact:** Code duplication, maintenance burden, potential for inconsistent behavior.
- **Recommendation:** Deprecate one flow. Document which is the canonical flow. The OTP-based one is more modern and doesn't require email delivery.

#### C. Audit Logging Wrapped in Bare `except Exception: pass`
- **File:** `apps/authentication/api.py`, lines 190-191, 209-210, 270-272
- **Issue:** Audit logging failures are silently swallowed. This could mask issues where the audit system is broken.
- **Recommendation:** At minimum, log the exception with `logger.exception()`. Consider whether audit logging failures should be silent (current behavior) or noisy (recommended for compliance systems).

#### D. Password Reset Body Built with f-string
- **File:** `apps/authentication/api.py`, lines 305-310, 427-432
- **Issue:** Email body constructed with f-strings containing hardcoded Spanish text. This bypasses the i18n system (Rule #11).
- **Recommendation:** Use `get_message()` for all email body templates.

### Token Management (`apps/authentication/tokens.py`)

#### Strengths

1. **Dual algorithm support**: HS256 (default) and RS256 (asymmetric) with automatic fallback (LYL-H-SEC-005).
2. **Cached key material** (lines 30-32): Keys loaded once per process, avoiding repeated file I/O or Vault calls.
3. **Secure token generation**: `secrets.token_urlsafe(64)` for refresh tokens, SHA-256 for storage.
4. **`decode_access_token()` returns None on all failures** -- no exceptions leak to callers.

#### Anti-Patterns Found

#### A. Global Mutable State for Key Caching
- **File:** `apps/authentication/tokens.py`, lines 30-32
- **Issue:** Module-level globals `_signing_key`, `_verification_key`, `_keys_loaded` are mutable state. While acceptable for a single-process deployment, this pattern doesn't work well with multiple workers or key rotation scenarios.
- **Recommendation:** Use Django's cache framework for cross-process key sharing. Add a TTL-based refresh mechanism.

#### B. Silent Fallback from RS256 to HS256
- **File:** `apps/authentication/tokens.py`, lines 64-68, 85-88
- **Issue:** If RS256 is configured but keys can't be loaded, the system silently falls back to HS256 with the JWT_SECRET_KEY. This could create a false sense of security ("I configured RS256 but it's actually using HS256").
- **Recommendation:** Log a **warning** (done) but also consider failing hard in production mode when RS256 is explicitly configured but unavailable.

#### C. No Token Type Validation in Refresh Flow
- **File:** `apps/authentication/tokens.py`, lines 151-170
- **Issue:** `decode_access_token()` checks `payload.get("type") == "access"` but there's no corresponding `decode_refresh_token()` function for the refresh token validation.
- **Recommendation:** The refresh token is a DB-stored hash (not a JWT), which is actually the correct pattern. Add a comment explaining this architectural decision.

### Permissions (`common/permissions.py`)

#### Strengths

1. **JWTAuth extends HttpBearer** -- standard Django Ninja auth pattern.
2. **`select_related("tenant")`** (line 57): Single JOIN for User+Tenant, saving ~1ms per request.
3. **`OptionalJWTAuth`** (lines 70-95): Allows public endpoints while still enriching the request if a token is present.
4. **Singleton instances** (lines 99-100): `jwt_auth` and `optional_jwt_auth` created once, not per-endpoint.
5. **Role helpers** (`is_owner`, `is_manager_or_owner`, `is_staff_or_above`, `is_super_admin`) use simple string comparison.

#### Anti-Patterns Found

#### A. `OptionalJWTAuth` Code Duplication
- **File:** `common/permissions.py`, lines 77-95
- **Issue:** `OptionalJWTAuth.authenticate()` duplicates ~90% of `JWTAuth.authenticate()` (lines 45-67). Only difference is handling missing token.
- **Recommendation:** Refactor to share the core logic. Make `JWTAuth` the base and have `OptionalJWTAuth` wrap it.

#### B. No `request.auth` Set (Django Ninja Convention)
- **File:** `common/permissions.py`, lines 45-67
- **Issue:** Django Ninja convention sets `request.auth` to the authenticated user/object. The code sets `request.user` and `request.tenant` directly instead. While this works (the custom `TenantRequest` pattern), it deviates from Django Ninja conventions and may confuse developers familiar with the framework.
- **Recommendation:** Set `request.auth = user` as well, or document why this convention is intentionally deviated from.

---

## 7. Cross-Cutting Concerns

### Rate Limiting (`common/rate_limit.py`)

#### Strengths

1. **Redis-backed sliding window** with atomic INCR + EXPIRE.
2. **Path-specific rules** with most-specific-first matching (14 rules covering auth, scanner, analytics, uploads, etc.).
3. **Fail-closed for auth endpoints** (LYL-C-SEC-002): Returns 503 when Redis is unavailable for auth paths.
4. **Decorator-based endpoint rate limiting** (`@rate_limit`) separate from middleware.

#### Anti-Patterns Found

#### A. RateLimitMiddleware Uses Django Cache Instead of Redis
- **File:** `common/rate_limit.py`, lines 239-332
- **Issue:** The middleware uses Django's cache abstraction (which goes through `django_redis`) instead of the raw Redis client available in `_check_rate_limit_redis()`. This adds overhead.
- **Recommendation:** Use the Redis client directly in the middleware, same as the decorator does.

### Vault Integration (`common/vault.py`)

#### Strengths

1. **HashiCorp Vault KV v2** with local caching (5-min TTL).
2. **Cross-process cache invalidation** via Django cache version key.
3. **Fails gracefully**: Returns default values or stale cache on Vault unavailability.
4. **Test override system** (`set_test_override()`, `clear_test_overrides()`) for unit testing without Vault.

#### Anti-Patterns Found

#### A. urllib Instead of requests/httpx
- **File:** `common/vault.py`, lines 101-126
- **Issue:** Uses `urllib.request` directly instead of `httpx` (used elsewhere in the codebase). Inconsistent HTTP client usage.
- **Recommendation:** Standardize on `httpx` throughout the codebase.

### Environment Guard (`common/environment_guard.py`)

#### Strengths

1. **Prevents dev/prod cross-contamination** at startup.
2. **Checks Vault path, database names, and E2E user presence**.
3. **Raises `EnvironmentGuardError`** on violation (fails hard).

#### Anti-Patterns Found

#### A. None -- well-designed safety mechanism.

---

## 8. Multi-Tenant Architecture Assessment

### Tenant Isolation Model: **Shared Database, Tenant-Scoped Queries**

| Aspect | Assessment | Grade |
|--------|-----------|-------|
| Tenant identification | Derived from JWT payload → User FK | A |
| Tenant middleware | Zero-query, runs after auth | A |
| Data isolation | `tenant=` filter on every query | B+ |
| Cross-tenant leak prevention | `require_tenant()` guard | A |
| SUPER_ADMIN platform access | `tenant=None` pattern | B+ |

### Concerns

1. **No database-level tenant isolation**: All tenants share the same tables. A missing `.filter(tenant=tenant)` in any query creates a data leak. This is mitigated by the `require_tenant()` pattern but relies on developer discipline.
2. **No query audit for tenant scoping**: There's no automated check that all queries include tenant filtering.

### Recommendations

1. **Consider django-tenants** or **pg_row_level_security** for database-level isolation if the tenant count grows beyond 1,000.
2. **Add a custom QuerySet mixin** that automatically applies `tenant=` filtering, reducing the risk of developer error:
   ```python
   class TenantQuerySet(models.QuerySet):
       def for_tenant(self, tenant):
           return self.filter(tenant=tenant)
   ```
3. **Add integration tests** that verify no cross-tenant data leakage for every endpoint.

---

## 9. Production-Readiness Assessment

### Security (Grade: A-)

| Control | Status |
|---------|--------|
| JWT with refresh token rotation | Implemented |
| Account lockout (5 failures) | Implemented |
| Rate limiting (Redis-backed) | Implemented |
| CSRF exemption for API (correct) | Implemented |
| CSP nonce generation | Implemented |
| Argon2 password hashing | Implemented |
| Password validation (12+ chars) | Implemented |
| Tenant isolation (middleware) | Implemented |
| Audit logging (LOPDP) | Implemented |
| Environment guards (dev/prod) | Implemented |
| Vault secret management | Implemented |
| Select-for-update on plan limits | Implemented |

### Missing/Recommended

1. **HSTS header**: ✅ Now implemented in `loyallia/settings/production.py` (`SECURE_HSTS_SECONDS`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, `SECURE_HSTS_PRELOAD`).
2. **SSL redirect**: ✅ Now implemented in `loyallia/settings/production.py` (`SECURE_SSL_REDIRECT`).
3. **No automatic tenant query filtering**: Relies on developer discipline (see above).

### Performance (Grade: B+)

| Optimization | Status |
|-------------|--------|
| PgBouncer connection pooling | Implemented |
| `select_related()` on hot paths | Implemented |
| `update_fields` on saves | Implemented |
| Redis caching | Implemented |
| Rate limiting (sliding window) | Implemented |
| Lazy imports in plan enforcement | Implemented |
| Zero-query tenant resolution | Implemented |

### Missing/Recommended

1. **No query result caching**: Hot endpoints (plan features, tenant config) could benefit from short-term Redis caching.
2. **`select_related` missing in some plan enforcement queries**: Could cause N+1 (see above).
3. **No connection pool tuning**: `conn_max_age=0` disables persistent connections (required for PgBouncer). Consider statement-level caching.

### Observability (Grade: B+)

| Feature | Status |
|---------|--------|
| Request ID tracing | Implemented |
| Structured JSON logging | Implemented |
| Sentry integration | Implemented |
| Health checks (3-tier) | Implemented |
| Audit logging | Implemented |

### Missing/Recommended

1. **No OpenTelemetry/Distributed tracing**: For microservice migration planning.
2. **No performance metrics endpoint**: `/api/v1/metrics/` for Prometheus scraping.

---

## 10. Critical Findings Summary

### Critical (Fix Before Production)

| # | Finding | File | Line |
|---|---------|------|------|
| 1 | Duplicate `require_role()` decorators create maintenance risk | `common/role_check.py` | 13-36 |
| 2 | `select_for_update()` used for read-only plan checks (lock contention) | `common/plan_enforcement.py` | 295 |
| 3 | File named `exceptions.py` contains pagination code | `common/exceptions.py` | 1-2 |
| 4 | Two separate password reset flows (duplicated logic) | `apps/authentication/api.py` | 276-468 |

### High Priority (Fix Soon)

| # | Finding | File | Line |
|---|---------|------|------|
| 5 | All router imports at bottom of file (PEP 8 violation) | `apps/api/router.py` | 114-139 |
| 6 | Router path collision risk (multiple routers per prefix) | `apps/api/router.py` | 141-163 |
| 7 | Local imports scattered throughout auth API | `apps/authentication/api.py` | 89, 178, 197, etc. |
| 8 | CSP header set on API responses (unnecessary overhead) | `common/middleware.py` | 91 |
| 9 | No `select_related("subscription_plan")` in plan limits | `common/plan_enforcement.py` | 62 |
| 10 | `OptionalJWTAuth` duplicates 90% of `JWTAuth` | `common/permissions.py` | 77-95 |
| 11 | `MessageOut` schema duplicated in auth schemas | `apps/authentication/schemas.py` | 71-74 |

### Medium Priority (Nice to Have)

| # | Finding | File | Line |
|---|---------|------|------|
| 12 | Magic numbers for trial limits | `common/plan_enforcement.py` | 71-85 |
| 13 | Inconsistent HTTP client (urllib vs httpx) | `common/vault.py` | 101-126 |
| 14 | Apple Wallet API has no exception handlers | `loyallia/urls.py` | 22-37 |
| 15 | Email body built with f-strings (i18n bypass) | `apps/authentication/api.py` | 305-310 |
| 16 | Audit logging failures silently swallowed | `apps/authentication/api.py` | 190-191 |
| 17 | No `request.auth` set (Django Ninja convention) | `common/permissions.py` | 65-66 |

---

## 11. Design Patterns Summary

### Patterns Used Well

| Pattern | Implementation | Grade |
|---------|---------------|-------|
| **Layered Architecture** | `common/` (cross-cutting) + `apps/` (business) + `loyallia/` (framework) | A |
| **Middleware Chain** | RequestID → CSP → RateLimit → CSRF → Auth → Tenant | A |
| **Decorator Pattern** | `@enforce_limit`, `@require_feature`, `@require_active_subscription`, `@rate_limit` | A |
| **Strategy Pattern** | Payment gateway (pluggable), JWT algorithm (HS256/RS256) | A |
| **Repository Pattern** | Each app has models + api + schemas (thin controllers) | B+ |
| **Singleton Pattern** | `jwt_auth`, `optional_jwt_auth` instances | A |
| **Factory Pattern** | `UserManager.create_user()`, `slugify_business()` | B+ |
| **Template Method** | `JWTAuth.authenticate()` → `decode_access_token()` → DB lookup | A |

### Patterns Missing

| Pattern | Recommendation |
|---------|---------------|
| **Unit of Work** | Wrap multi-model operations in explicit UoW |
| **CQRS** | Consider separating read/write models if analytics grow |
| **Event-Driven** | Use Django signals or message bus for cross-domain events |
| **API Versioning** | `/api/v1/` is hardcoded; plan for v2 |

---

## 12. Final Recommendations

### Immediate Actions (Next Sprint)

1. **Consolidate `require_role()`**: Remove `common/role_check.py`, update all imports to use `common/permissions.py`.
2. **Fix `select_related` in plan enforcement**: Add `.select_related("subscription_plan")` to `get_tenant_limits()`.
3. **Move router imports to top** of `apps/api/router.py`.
4. **Add `select_related` for read-only plan checks**: Split `check_plan_limit()` into read/write variants.

### Short-Term (Next Month)

5. **Deprecate duplicate password reset flow**: Pick one (OTP-based recommended), add deprecation headers.
6. **Rename `common/exceptions.py`**: Rename to `common/pagination.py` or merge with existing `common/pagination.py`.
7. **Add Apple Wallet exception handlers**: Mirror the main API's error handlers.
8. **Standardize on `httpx`**: Replace `urllib` in vault client with `httpx`.
9. **Add HSTS/SSL settings** to production settings file.

### Long-Term (Next Quarter)

10. **Evaluate django-tenants** for database-level tenant isolation.
11. **Add automatic tenant query filtering** via custom Manager/QuerySet.
12. **Implement API versioning strategy** for v2 preparation.
13. **Add Prometheus metrics endpoint** for production monitoring.
14. **Consider CQRS** for analytics/aggregation queries.

---

*End of Review*
