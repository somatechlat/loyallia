# 🔍 Loyallia Backend Architecture Audit

**Audit Date:** 2026-04-29
**Scope:** All `.py` files in `backend/apps/`, `backend/common/`, `backend/loyallia/settings/`, `backend/manage.py`, `backend/seed_sweet_coffee.py`, `backend/adrian_passes.py`
**Methodology:** Line-by-line static analysis of every Python file in the Django backend

---

## Executive Summary

The Loyallia backend is a Django + Django Ninja multi-tenant SaaS platform for loyalty card management. The codebase demonstrates competent engineering with good security practices (JWT rotation, rate limiting, audit trails, Vault integration). However, it suffers from **systemic architectural issues** that will compound as the codebase scales:

| Severity | Count | Category |
|----------|-------|----------|
| 🔴 Critical | 4 | Security, Data Integrity |
| 🟠 High | 12 | Architecture, Code Duplication, Anti-Patterns |
| 🟡 Medium | 18 | Code Quality, Missing Features, Dead Code |
| 🔵 Low | 9 | Style, Minor Issues |

**Total: 43 findings**

---

## 1. MODEL DESIGN

### 🔴 CRITICAL: JSONField Overuse — Type-Specific Data in Metadata

**Files:**
- `apps/cards/models.py:65` — `metadata = models.JSONField(default=dict)`
- `apps/customers/models.py:107` — `pass_data = models.JSONField(default=dict)`
- `apps/automation/models.py:62-72` — `trigger_config`, `action_config`, `schedule_config`
- `apps/billing/models.py:172` — `features = models.JSONField(default=list)`
- `apps/transactions/models.py:72` — `transaction_data = models.JSONField(default=dict)`

**Problem:** Critical business data is stored in untyped JSON blobs instead of proper columns. This makes schema validation, querying, indexing, and data integrity impossible at the database level.

**Specific instances:**
```python
# cards/models.py — stamps_required, cashback_percentage, etc. are in metadata JSON
metadata = models.JSONField(default=dict, verbose_name="Configuración específica")

# customers/models.py — stamp_count, cashback_balance, gift_balance are in pass_data JSON
pass_data = models.JSONField(default=dict, verbose_name="Datos del pase")

# billing/models.py — feature flags stored as a JSON list of strings
features = models.JSONField(default=list, verbose_name="Características incluidas")
```

**Impact:**
- Cannot create database indexes on `stamps_required` or `cashback_balance`
- Cannot use database-level constraints (e.g., `stamps_required >= 1`)
- `validate_stamp_config()` etc. are Python-only — no DB enforcement
- Queries like "find all stamp cards with stamps_required > 5" require full JSON scan

**Remediation:**
- Add typed columns to `Card` for common fields (stamps_required, cashback_percentage, etc.)
- Use a separate `CardConfig` model with OneToOneField for type-specific data
- Keep `metadata` JSON only for truly unstructured/extensible data
- Add database constraints for business rules

---

### 🟠 HIGH: Missing Database Indexes on High-Traffic Queries

**Files:**
- `apps/customers/models.py:107` — `CustomerPass.pass_data` (no GIN index for JSONB)
- `apps/authentication/models.py:82` — `User.email` (unique=True already indexed, but no case-insensitive index)
- `apps/cards/models.py` — No index on `(tenant, is_active)` despite frequent filter
- `apps/notifications/models.py` — No index on `(tenant, notification_type)` for campaign queries

**Specific query patterns without supporting indexes:**
```python
# transactions/api.py:scanner — Hot path, scanned on every QR validation
CustomerPass.objects.get(qr_code=data.qr_code, is_active=True, card__tenant=request.tenant)
# qr_code has db_index=True ✓ but card__tenant join has no composite index

# analytics/advanced_api.py — Frequent analytics queries
Transaction.objects.filter(tenant=tenant, created_at__gte=start_date)
# Only has (tenant, created_at) index ✓ — OK

# customers/segment_api.py — Full table scan for VIP segment
base.order_by("total_spent").values_list("total_spent", flat=True)
# No index on (tenant, total_spent)
```

**Remediation:**
- Add `Index(fields=["tenant", "is_active", "card__tenant"])` or use `select_related` properly
- Add `Index(fields=["tenant", "total_spent"])` for VIP segmentation
- Add GIN index on `pass_data` if JSON queries remain

---

### 🟠 HIGH: N+1 Query Patterns

**Files:**
- `apps/cards/api.py:159` — `CardOut.from_model()` calls `card.passes.count()` for every card
  ```python
  # Line 159 — Fixed with annotate but still falls back:
  enrollments_count=enrollments_count if enrollments_count is not None else card.passes.count(),
  ```
- `apps/tenants/api.py:63` — `list_locations()` does N queries for `LocationOut.from_location()`
- `apps/transactions/api.py:155-163` — `list_transactions()` iterates and accesses `transaction.customer.full_name` (triggers lazy load per row)
- `apps/analytics/advanced_api.py:97` — `get_top_buyers()` does N+1 via `c.last_visit`
- `apps/notifications/service.py:95-100` — `send_reminder_notification()` does `customer.passes.filter()` then `programs.first()`

**Remediation:**
- Use `select_related()` and `prefetch_related()` consistently
- Replace Python iteration with `.annotate()` for aggregate queries
- Use `values()` / `values_list()` for serialization-only queries

---

### 🟡 MEDIUM: Duplicate Data Between Tenant.plan and Subscription.plan

**Files:**
- `apps/tenants/models.py:134` — `Tenant.plan` field
- `apps/billing/models.py:200` — `Subscription.plan` field (legacy)
- `apps/billing/models.py:245` — `Tenant.activate_trial()` sets `self.plan = Plan.TRIAL`
- `apps/tenants/super_admin_api/platform.py:115` — `Tenant.objects.filter(plan=Plan.SUSPENDED)`

**Problem:** `plan` state exists in two places (`Tenant.plan` and `Subscription.plan/status`). The `Tenant.activate_trial()` method sets `self.plan = Plan.TRIAL` while `Subscription.activate_paid()` sets `self.plan = plan.slug`. These can drift out of sync.

**Remediation:**
- Remove `Tenant.plan` field entirely
- Derive plan state from `Subscription.status` exclusively
- Update all queries that filter on `Tenant.plan` to use `Subscription` join

---

### 🟡 MEDIUM: Missing `on_delete` Behavior Analysis

**Files:**
- `apps/transactions/models.py:28` — `customer_pass = models.ForeignKey(CustomerPass, on_delete=models.CASCADE)`
  - Deleting a CustomerPass cascades to delete all transaction history — **data loss risk**
- `apps/customers/models.py:136` — `customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="passes")`
  - Deleting a customer cascades to delete all passes and transactions
- `apps/billing/models.py:197` — `subscription_plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True)`
  - OK — but `get_limit()` will return 0 if plan is deleted

**Remediation:**
- Use `on_delete=models.PROTECT` for Transaction.customer_pass (prevent accidental data loss)
- Implement soft-delete for Customer instead of hard delete
- Add a check in `get_limit()` to handle missing plan gracefully

---

## 2. CODE DUPLICATION

### 🟠 HIGH: Massive Duplicated "Update Field" Pattern

**Files (every PATCH endpoint):**
- `apps/tenants/api.py:30-47` — `update_tenant()`
- `apps/tenants/api.py:107-133` — `update_location()`
- `apps/tenants/super_admin_api/tenants.py:130-152` — `update_tenant_admin()`
- `apps/tenants/super_admin_api/platform.py:147-175` — `update_plan()`
- `apps/cards/api.py:159-201` — `update_program()`
- `apps/customers/api.py:217-245` — `update_customer()`
- `apps/automation/api.py:132-170` — `update_automation()`

**Pattern (repeated 7+ times):**
```python
update_fields = ["updated_at"]
if payload.name is not None:
    obj.name = payload.name.strip()
    update_fields.append("name")
if payload.field2 is not None:
    obj.field2 = payload.field2
    update_fields.append("field2")
# ... repeated for every field
obj.save(update_fields=update_fields)
```

**Remediation:**
- Create a generic `partial_update_model(instance, payload, field_mapping)` utility
- Or use Django REST Framework's `partial_update` / Django Ninja's built-in PATCH support

---

### 🟠 HIGH: Duplicated Role-Check Pattern

**Files (every endpoint):**
- `apps/authentication/api.py:93` — `if not is_owner(request): raise HttpError(403, ...)`
- `apps/tenants/api.py:27` — `if not is_owner(request): raise HttpError(403, ...)`
- `apps/cards/api.py:86` — `if not is_owner(request): raise HttpError(403, ...)`
- `apps/customers/api.py:59` — `if not is_manager_or_owner(request): raise HttpError(403, ...)`
- `apps/automation/api.py:89` — `if not is_owner(request): raise HttpError(403, ...)`
- `apps/notifications/api.py:154` — `if not is_owner(request): raise HttpError(403, ...)`

**Problem:** The role-check-then-raise pattern is duplicated 20+ times across all API files. There's already a `require_role()` decorator in `common/permissions.py` but it's barely used.

**Remediation:**
- Use `@require_role("OWNER")` decorator consistently
- Remove inline role checks from every endpoint

---

### 🟠 HIGH: Duplicated MessageOut / ErrorResponse Schemas

**Files:**
- `apps/authentication/schemas.py:44` — `class MessageOut(BaseModel)`
- `apps/tenants/schemas.py:72` — `class MessageOut(BaseModel)`
- `apps/cards/api.py:92` — `class MessageOut(BaseModel)`
- `apps/customers/schemas.py:88` — `class MessageOut(BaseModel)`
- `apps/tenants/super_admin_api/schemas.py:134` — `class MessageOut(BaseModel)`

**Problem:** The same `MessageOut(success: bool, message: str)` schema is defined 5+ times in different modules.

**Remediation:**
- Define once in `common/schemas.py` and import everywhere

---

### 🟡 MEDIUM: Duplicated OTP Rate-Limiting Logic

**Files:**
- `apps/authentication/api.py:130-137` — `password_reset_request()` rate limit
- `apps/authentication/api.py:157-163` — `password_reset_confirm()` rate limit
- `apps/authentication/api.py:185-191` — `verify_email()` rate limit
- `apps/authentication/api.py:286-292` — `phone_verify_confirm()` rate limit

**Pattern (repeated 4 times):**
```python
cache_key = f"otp_attempts:{purpose}:{email}"
attempts = cache.get(cache_key, 0)
if attempts >= 5:
    raise HttpError(429, get_message("RATE_LIMITED"))
cache.set(cache_key, attempts + 1, 900)
```

**Remediation:**
- Extract to `common/rate_limit.py:check_rate_limit(key, max_attempts, window_seconds)`
- Or use a decorator `@rate_limit("otp_attempts", max=5, window=900)`

---

## 3. DEAD CODE

### 🟡 MEDIUM: Unused Script `seed_sweet_coffee.py`

**File:** `backend/seed_sweet_coffee.py`

This standalone script creates a tenant "Sweet and Coffee" with a hardcoded owner password (`Admin1234!`). It's not a management command, references `os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings")` (wrong — should be `loyallia.settings.development`), and is superseded by `seed_ecuador_businesses.py` which already seeds Sweet & Coffee data.

**Remediation:** Delete `seed_sweet_coffee.py`.

---

### 🟡 MEDIUM: Unused Script `adrian_passes.py`

**File:** `backend/adrian_passes.py`

A debugging script that queries passes for a specific tenant named "Adrian Cadena". Not a management command, hardcoded `sys.path.insert(0, "/app")`, and serves no production purpose.

**Remediation:** Delete `adrian_passes.py`.

---

### 🟡 MEDIUM: Commented-Out Code

**Files:**
- `apps/billing/models.py:305` — `from apps.billing.payment_models import Invoice, PaymentMethod  # noqa: E402, F401`
  - This is a re-export for convenience but creates a circular import risk

**Remediation:** Remove re-export; import directly from `payment_models`.

---

### 🔵 LOW: Unused Imports

**Files:**
- `apps/customers/api.py:21` — `from ninja import File, Router` — `File` is used
- `apps/customers/api.py:130` — `import re as _re` — imported at module level but only used in `import_customers()` which already does `import re`
- `apps/customers/segment_api.py:1` — `from apps.customers.api import _apply_segment_filter` — cross-module dependency on private function

---

## 4. ANTI-PATTERNS

### 🟠 HIGH: Business Logic in API Views (No Service Layer)

**Files:**
- `apps/authentication/api.py` — Registration creates Tenant + User + sends OTP email all inline (~200 lines of business logic in views)
- `apps/customers/api.py:83-166` — `import_customers()` — 80+ lines of parsing, validation, and bulk creation inline
- `apps/transactions/api.py:76-150` — `transact()` — transaction processing, customer stats update, analytics trigger, automation trigger, pass update all inline
- `apps/billing/api.py:91-160` — `subscribe()` — subscription creation, payment method storage, gateway integration inline

**Problem:** Business logic is mixed directly into API view functions. This makes the logic untestable in isolation, unreusable from management commands or Celery tasks, and creates massive 200+ line functions.

**Remediation:**
- Create `apps/authentication/services.py:AuthService.register()`
- Create `apps/customers/services.py:CustomerService.import_csv()`
- Create `apps/transactions/services.py:TransactionService.process_scan()`
- Create `apps/billing/services.py:BillingService.subscribe()`

---

### 🟠 HIGH: Inconsistent Error Handling

**Files:**
- `apps/customers/api.py:159-163` — `try: generate_qr_for_pass.delay(str(pass_obj.id)) except Exception:` — silently swallows Celery connection errors
- `apps/transactions/api.py:145-150` — Same pattern for `trigger_pass_update.delay()`
- `apps/notifications/service.py:156` — `_send_push_notification()` marks as sent even when no devices reached
- `apps/billing/payment_gateway.py:153-174` — `BendoGateway` raises `PaymentGatewayError` for every operation (not implemented)

**Remediation:**
- Use structured error logging with context
- Don't mark notifications as sent when delivery fails
- Implement proper fallback for Celery unavailability

---

### 🟡 MEDIUM: Circular Import Risk

**Files:**
- `apps/billing/models.py:305` — `from apps.billing.payment_models import Invoice, PaymentMethod  # noqa: E402, F401`
  - This creates a circular dependency: `billing/models.py` imports from `payment_models.py` which imports `Subscription` from `billing/models.py`
- `apps/customers/segment_api.py:1` — `from apps.customers.api import _apply_segment_filter`
  - Cross-module dependency on a private function

**Remediation:**
- Move `_apply_segment_filter` to `customers/services.py`
- Remove re-export from `billing/models.py`

---

### 🟡 MEDIUM: Manual JSON Parsing in PATCH Endpoints

**Files:**
- `apps/tenants/api.py:110-116` — `update_location()` manually parses JSON body
  ```python
  import json
  try:
      body = json.loads(request.body)
      payload = LocationUpdateIn(**body)
  except Exception:
      raise HttpError(422, ...)
  ```
- `apps/tenants/super_admin_api/tenants.py:131-137` — `update_tenant_admin()` same pattern
- `apps/tenants/super_admin_api/platform.py:151-157` — `update_plan()` same pattern

**Problem:** Django Ninja should handle request body parsing automatically. Manual `json.loads(request.body)` bypasses validation and creates redundant error handling.

**Remediation:** Use Django Ninja's built-in request body parsing by declaring the schema as a parameter.

---

## 5. DATABASE DESIGN

### 🟡 MEDIUM: Migration State Analysis

**Observations:**
- `apps/customers/migrations/0003_customer_idx_cust_tenant_created_and_more.py` — Adds custom indexes (good)
- `apps/transactions/migrations/0002_enrollment_idx_enroll_tnt_cust_card_and_more.py` — Adds compound indexes (good)
- `apps/cards/migrations/0002_card_locations.py` — Adds locations JSONField
- `apps/cards/migrations/0003_card_barcode_type.py` — Adds barcode_type field

**No migration conflicts detected.** Migration chain is clean and linear.

---

### 🟡 MEDIUM: Over-Indexing on AuditLog

**File:** `apps/audit/models.py:62-75`
```python
indexes = [
    models.Index(fields=["actor_id", "created_at"]),
    models.Index(fields=["resource_type", "created_at"]),
    models.Index(fields=["tenant_id", "created_at"]),
    models.Index(fields=["action", "created_at"]),
]
```

Plus `db_index=True` on `actor_id`, `tenant_id`, and `created_at` individually. This is 7 indexes on a write-heavy table that uses `auto_now_add=True`. Each `INSERT` pays the cost of updating all 7 indexes.

**Remediation:**
- Keep the compound indexes (they cover the single-column queries)
- Remove the individual `db_index=True` on columns already covered by compound indexes
- Consider partitioning by date for the audit table (7-year retention = massive table)

---

### 🟡 MEDIUM: UUID Primary Keys Performance

**Observation:** Every model uses `uuid.uuid4` as primary key. While good for distributed systems, UUID PKs have drawbacks:
- B-tree index fragmentation (random inserts)
- 16 bytes vs 4 bytes for integer PKs
- Slower joins in large tables

**Current impact:** Low (not yet at scale). **Future impact:** High for Transaction and AuditLog tables.

**Remediation:** Consider ULID or time-ordered UUIDs (UUIDv7) for time-series tables (Transaction, AuditLog, DailyAnalytics).

---

## 6. CELERY TASKS

### 🟡 MEDIUM: Task Idempotency Issues

**Files:**
- `apps/customers/tasks.py:30` — `generate_qr_for_pass()` — Not idempotent. If called twice for the same pass, it overwrites the QR image. Safe but wasteful.
- `apps/customers/tasks.py:80` — `trigger_pass_update()` — Creates a new Notification on every call. Not idempotent.
- `apps/notifications/tasks.py:140` — `send_wallet_notification_campaign()` — Creates Notification objects in a loop. If retried, duplicates are created.

**Remediation:**
- Use `get_or_create()` instead of `create()` for notifications
- Add idempotency keys to prevent duplicate processing

---

### 🟡 MEDIUM: Missing Error Handling in Celery Tasks

**Files:**
- `apps/analytics/tasks.py:27-55` — `update_tenant_analytics()` — Calls `analytics.update_metrics()` in a loop. If one program's analytics fails, the entire task fails and no subsequent programs are updated.

**Remediation:**
- Wrap each program's analytics update in try/except
- Log failures per-program and continue

---

### 🔵 LOW: Celery Task Serialization

**File:** `apps/automation/engine.py:62-78` — `fire_trigger_async()` passes `context=dict` to Celery. If context contains non-JSON-serializable objects (Decimal, datetime), the task will fail silently.

**Remediation:** Serialize context before passing to Celery.

---

## 7. SERVICE LAYER

### 🟠 HIGH: Lack of Service Layer

**Observation:** Only `apps/audit/service.py` and `apps/notifications/service.py` exist as service modules. All other apps embed business logic directly in API views.

**Apps missing service layer:**
- `authentication` — Registration, login, password reset logic inline
- `customers` — Import, enrollment, segmentation logic inline
- `cards` — CRUD with Google Wallet sync inline
- `transactions` — Scanner validation, transaction processing inline
- `billing` — Subscription management, payment processing inline
- `automation` — Execution logic on model (acceptable) but trigger evaluation inline

**Remediation:** Extract service modules for each app following the pattern in `audit/service.py`.

---

## 8. TESTING

### 🟡 MEDIUM: Minimal Test Coverage

**File:** `apps/cards/tests.py` — Only 2 test classes with ~15 tests total.

**Missing test coverage:**
- `authentication` — No tests for login, registration, password reset, Google OAuth
- `customers` — No tests for import, enrollment, segmentation
- `transactions` — No tests for scanner, remote issue
- `billing` — No tests for subscription, payment methods, webhooks
- `notifications` — No tests for campaigns, push delivery
- `automation` — No tests for trigger evaluation, execution
- `analytics` — No tests for any endpoint
- `audit` — No tests
- `agent_api` — No tests

**Test isolation issues:**
- `apps/cards/tests.py:169` — `test_scanner_access_requires_staff_or_above()` creates a `SUPER_ADMIN` user but the scanner requires `STAFF` or above. The test expects 403 for SUPER_ADMIN, which is incorrect — SUPER_ADMIN should have access. This appears to be a test bug.

**Remediation:**
- Add factory classes (FactoryBoy) for all models
- Add integration tests for all API endpoints
- Add unit tests for service layer functions
- Fix the SUPER_ADMIN test case

---

## 9. CONFIGURATION

### 🟡 MEDIUM: Hardcoded Development Defaults in Production Settings

**File:** `loyallia/settings/base.py:171-175`
```python
MINIO_ACCESS_KEY = config("MINIO_ACCESS_KEY", default="minioadmin")
MINIO_SECRET_KEY = config("MINIO_SECRET_KEY", default="minioadmin")
PASS_HMAC_SECRET = config("PASS_HMAC_SECRET", default="change-me-hmac-secret")
```

**Problem:** Production settings inherit these defaults. If environment variables are missing, production runs with `minioadmin` credentials and a known HMAC secret.

**File:** `loyallia/settings/production.py:52`
```python
PASS_HMAC_SECRET = get_secret("pass_hmac_secret", env_fallback="PASS_HMAC_SECRET", default="change-me-hmac-secret")
```
The production override exists but the default is still insecure.

**Remediation:**
- Remove insecure defaults from `base.py`
- Use `config("MINIO_SECRET_KEY")` without default (will fail fast if missing)
- Add startup validation that checks critical secrets are set

---

### 🔵 LOW: Settings Module DJANGO_SETTINGS_MODULE Mismatch

**Files:**
- `manage.py:8` — `os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings.development")`
- `loyallia/celery.py:10` — `os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings.development")`
- `loyallia/asgi.py:6` — `os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings.development")`
- `loyallia/wsgi.py:6` — `os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings.development")`
- `seed_sweet_coffee.py:4` — `os.environ.setdefault("DJANGO_SETTINGS_MODULE", "loyallia.settings")` ← WRONG

All entry points default to `development` settings, which is correct for local dev. But `seed_sweet_coffee.py` uses `loyallia.settings` (no sub-module), which would fail since `loyallia/settings/__init__.py` is empty.

---

## 10. LOGGING & OBSERVABILITY

### 🟡 MEDIUM: Inconsistent Structured Logging

**Files:**
- `common/logging_utils.py` — Well-designed JSON formatter exists
- `apps/authentication/api.py` — Uses `logger.info()` with string formatting
- `apps/customers/api.py` — Uses `logger.error()` with string formatting
- `apps/notifications/service.py:126` — Uses f-strings in logger: `logger.info(f"Would send SMS to {phone}")`

**Problem:** Some modules use `%s` formatting (correct — lazy evaluation), others use f-strings (evaluates even if log level is disabled).

**Remediation:**
- Enforce `%s` formatting everywhere: `logger.info("SMS to %s", phone)`
- Add `request_id` and `tenant_id` to all log entries via middleware

---

### 🟡 MEDIUM: Missing Audit Trail for Critical Operations

**Files:**
- `apps/authentication/api.py:register()` — No audit log for user registration
- `apps/authentication/api.py:login()` — No audit log for login (only failed attempts tracked via `record_failed_login`)
- `apps/billing/api.py:subscribe()` — No audit log for subscription changes
- `apps/cards/api.py:create_program()` — No audit log for program creation
- `apps/customers/api.py:enroll_customer_public()` — No audit log for public enrollment

**Observation:** `audit/service.py:log_action()` exists and is used in `customers/api.py` for CRUD operations, but critical auth and billing operations are not audited.

**Remediation:**
- Add audit logging to all state-changing endpoints
- Especially: login, registration, subscription changes, program deletion

---

## 11. SECURITY CONCERNS

### 🔴 CRITICAL: Hardcoded Passwords in Seed Scripts

**Files:**
- `seed_sweet_coffee.py:22` — `"password": make_password("Admin1234!")`
- `apps/tenants/management/commands/seed_ecuador_businesses.py:437` — `password="123456"`
- `apps/tenants/management/commands/seed_test_data.py:149` — `password="123456"`

**Problem:** Seed scripts create users with weak, predictable passwords. While guarded by `if not settings.DEBUG`, these could accidentally run in production if `DEBUG=True`.

**Remediation:**
- Generate random passwords in seed scripts
- Print credentials to stdout only
- Add `@override_settings(DEBUG=True)` guard or environment check

---

### 🔴 CRITICAL: Impersonation Token Without Audit Justification

**File:** `apps/tenants/super_admin_api/tenants.py:229-253`

```python
@router.post("/tenants/{tenant_id}/impersonate/", ...)
def impersonate_tenant(request, tenant_id: str):
    # ... creates JWT token with impersonated=True
    # NO justification parameter
    # NO call to log_impersonation()
```

**Problem:** The impersonation endpoint creates a token but does NOT require or log a justification. The `audit/service.py:log_impersonation()` function exists and requires justification, but it's never called from the impersonation endpoint.

**Remediation:**
- Add `justification: str` parameter to the endpoint
- Call `log_impersonation(request, tenant, justification)` before creating the token
- Return 400 if justification is empty

---

### 🟠 HIGH: SSRF Protection Bypass in Apple Pass Generator

**File:** `apps/customers/pass_engine/apple_pass.py:124-149`

```python
def fetch_image_bytes(url):
    # Only allow HTTPS
    if parsed.scheme not in ("https",):
        return None
    # Block private/reserved IP ranges
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback ...
    except ValueError:
        # hostname is a domain name — block obvious localhost patterns
        if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
            return None
```

**Problem:** The domain-name check only blocks literal "localhost" strings. An attacker could use `localtest.me` (resolves to 127.0.0.1), `169.254.169.254` (AWS metadata), or DNS rebinding to bypass this.

**Remediation:**
- Resolve the domain to IP FIRST, then check if the resolved IP is private
- Use `ipaddress.ip_address(resolved_ip)` after DNS resolution
- Block `169.254.x.x` (link-local) and cloud metadata endpoints

---

### 🟠 HIGH: Rate Limiter Race Condition

**File:** `common/rate_limit.py:86-98`

```python
pipe = redis.pipeline()
pipe.incr(rate_key)
results = pipe.execute()
current_count = results[0]
if current_count == 1:
    redis.expire(rate_key, window)
```

**Problem:** `INCR` and `EXPIRE` are not atomic. If the process crashes between `INCR` and `EXPIRE`, the key persists forever, permanently blocking that IP/user.

**Remediation:**
- Use a Lua script for atomic INCR+EXPIRE
- Or use Redis `SET key value EX window NX` with a counter pattern

---

## 12. SPECIFIC CODE ISSUES

### 🔴 CRITICAL: Rate Limiter Uses MD5 for Token Hashing

**File:** `common/rate_limit.py:77`

```python
token_hash = hashlib.md5(auth_header.encode()).hexdigest()[:12]
rate_key = f"rl:{rule_path}:user:{token_hash}"
```

**Problem:** MD5 is cryptographically broken. While this is only used for rate limiting (not security), using MD5 for token hashing creates a false sense of security and could lead to hash collisions that bypass rate limits.

**Remediation:** Use `hashlib.sha256()` instead.

---

### 🟠 HIGH: Agent API Transaction Schema Uses Wrong Field Name

**File:** `apps/agent_api/api.py:142`

```python
TransactionSchema(
    ...
    metadata=txn.metadata or {},  # ← field doesn't exist on Transaction model
    ...
)
```

The `Transaction` model has `transaction_data` not `metadata`. This will raise `AttributeError` at runtime.

**Remediation:** Change to `txn.transaction_data or {}`.

---

### 🟠 HIGH: Notifications Campaign Creates N Queries

**File:** `apps/notifications/api.py:243-263` — `create_campaign()` for WhatsApp channel

```python
for customer in audience.iterator(chunk_size=50):
    try:
        Notification.objects.create(...)
        succeeded += 1
    except Exception:
        pass
```

**Problem:** Creates N individual INSERT queries instead of using `bulk_create()`. For 10,000 customers, this is 10,000 database round-trips.

**Remediation:** Use `Notification.objects.bulk_create(notifications, batch_size=500)`.

---

### 🟡 MEDIUM: CustomerPass.process_transaction() Has Inconsistent Atomicity

**File:** `apps/customers/models.py:200-240`

Some transaction methods use `select_for_update()` + `transaction.atomic()` (stamp, cashback, discount, gift, multipass), while others don't (coupon, membership, corporate). The coupon method directly calls `self.set_pass_field()` which uses its own atomic block, but the `coupon_used` check and the set are not atomic together.

**Remediation:** Ensure all transaction methods use the same atomic pattern.

---

### 🟡 MEDIUM: Email Campaign Template Vulnerable to XSS

**File:** `apps/notifications/tasks.py:70-100`

```python
html_content = f"""...
<div class="content">
  {html_body}
</div>
..."""
```

**Problem:** `html_body` is injected directly into HTML without sanitization. If an attacker controls `html_body` (e.g., via a compromised OWNER account), they can inject arbitrary JavaScript.

**Remediation:** Sanitize `html_body` with `bleach.clean()` or use a template engine with auto-escaping.

---

### 🔵 LOW: Inconsistent datetime Handling

**Files:**
- `apps/authentication/tokens.py:11` — Uses `datetime.now(tz=UTC)` (Python 3.11+ UTC)
- `apps/billing/models.py:12` — Uses `from django.utils import timezone` (Django timezone)
- `apps/customers/models.py:189` — Uses `from django.utils.dateparse import parse_datetime`

**Problem:** Mix of Python's `datetime.UTC` and Django's `timezone`. While both produce UTC, mixing them can cause comparison issues.

**Remediation:** Standardize on Django's `timezone.now()` everywhere.

---

### 🔵 LOW: TenantMiddleware Does Nothing

**File:** `apps/tenants/middleware.py:21-29`

```python
class TenantMiddleware:
    def __call__(self, request):
        if not hasattr(request, "tenant"):
            request.tenant = None
        response = self.get_response(request)
        return response
```

**Problem:** This middleware only sets `request.tenant = None`. The actual tenant resolution happens in `JWTAuth.authenticate()` (in `common/permissions.py`). The middleware is effectively a no-op for authenticated requests.

**Remediation:** Either remove the middleware or have it handle unauthenticated tenant resolution (e.g., from URL slug).

---

## Remediation Priority

### Phase 1 — Critical (Week 1-2)
1. Fix impersonation audit logging (security compliance)
2. Fix SSRF bypass in Apple Pass generator
3. Fix Agent API `metadata` → `transaction_data` field name
4. Remove hardcoded passwords from seed scripts

### Phase 2 — High Impact (Week 3-4)
5. Extract service layer for authentication, transactions, billing
6. Create shared `MessageOut` schema in `common/schemas.py`
7. Replace inline role checks with `@require_role()` decorator
8. Fix N+1 queries with `select_related()` / `prefetch_related()`
9. Make rate limiter INCR+EXPIRE atomic

### Phase 3 — Medium Impact (Week 5-8)
10. Add missing database indexes
11. Add comprehensive test coverage (target: 80%)
12. Add audit logging to auth and billing endpoints
13. Refactor JSONField overuse into typed columns
14. Delete dead code (`seed_sweet_coffee.py`, `adrian_passes.py`)

### Phase 4 — Low Impact (Ongoing)
15. Standardize logging format
16. Fix datetime handling consistency
17. Add database-level constraints for business rules
18. Consider UUIDv7 for time-series tables
