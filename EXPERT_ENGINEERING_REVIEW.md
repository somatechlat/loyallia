# Loyallia — Expert Engineering Review

**Reviewer:** Senior Full-Stack Architect  
**Date:** 2026-04-29  
**Codebase:** ~150 files, Django 5 + Next.js 14 + PostgreSQL 16 + Redis + Celery + HashiCorp Vault  
**Verdict:** **6.5/10** — Strong foundations, real bugs, production gaps

---

## 1. ARCHITECTURE (8/10)

### What's Good

The overall architecture is **well-designed for a multi-tenant SaaS**. The team clearly thought about this:

- **Django Ninja over DRF** — Good choice. The typed schemas, auto-docs, and fast validation are better than DRF's serializer verbosity for a greenfield project.
- **PgBouncer transaction-mode routing** — The `PgBouncerRouter` that sends migrations to `direct` and app queries to `default` is exactly right. PgBouncer in transaction mode breaks Django migrations (SET statements, advisory locks), and this solves it cleanly.
- **Celery queue separation** — `pass_generation`, `push_delivery`, `default`, `email`, `billing` queues with dedicated workers. This is how you do it at scale. Pass generation is CPU-bound (image processing, PKPass signing), and isolating it prevents it from starving I/O-bound push delivery.
- **Vault integration pattern** — `common/vault.py` with `@lru_cache` and env fallback is pragmatic. The `_fetch_vault_secrets()` call happens once per process lifetime, and the fallback to env vars means the app works in dev without Vault.
- **Centralized message registry** — `common/messages.py` with 4-language support and `get_message()` is excellent. Every user-facing string goes through one place. The `get_message_for_request()` with user→tenant→Accept-Language resolution is the right priority chain.
- **Immutable audit log** — The `AuditLog` model that raises on `save()` (if PK exists) and `delete()` is a good pattern for LOPDP compliance. The Python-level enforcement isn't bulletproof (raw SQL bypasses it), but it's a strong first line.

### What's Not

- **No service layer** — Business logic lives in API view functions. `transact()` in `transactions/api.py` is 80+ lines of mixed validation, business logic, side effects, and response formatting. This should be a `TransactionService.process_scan()` method that's testable independently.
- **No dependency injection** — Everything imports directly. `NotificationService`, `PaymentGateway`, `AutomationEngine` are all imported inline. This makes testing painful (you can't mock the payment gateway without monkey-patching).
- **Tight coupling between apps** — `customers/api.py` imports from `transactions.models`, `automation.engine`, `customers.tasks`, `audit.service`. The `notifications/tasks.py` imports from `customers.api._apply_segment_filter`. That's a circular dependency waiting to happen.

---

## 2. DATA MODEL (7/10)

### What's Good

- **UUID primary keys everywhere** — Correct for multi-tenant SaaS. Sequential IDs leak tenant count and are guessable.
- **Proper indexing strategy** — The `Customer` model has 4 targeted indexes: `(tenant, created_at)`, `(tenant, is_active, created_at)`, `(tenant, date_of_birth)`, `(tenant, last_name, first_name)`. These cover the main query patterns (dashboard, search, demographics).
- **JSONField for extensible config** — `Card.metadata`, `Automation.trigger_config`, `CustomerPass.pass_data` use JSONB. This is the right call for user-configurable card types without schema migrations.
- **`select_for_update` in `update_pass_data`** — Correct pessimistic locking for concurrent scan handling.

### What's Not

- **`CustomerPass.pass_data` is a schemaless dumping ground** — Stamp count, cashback balance, coupon status, gift balance, membership expiry, discount tier, referral count, multipass remaining — all stored as arbitrary keys in a JSON blob. There's no schema validation, no migration path, and querying across pass states requires JSON extraction. This should be normalized into typed fields or at minimum have a Pydantic schema that validates on write.

- **`total_spent` and `total_visits` on `Customer` are denormalized** — These are updated via `F()` expressions in `transact()`, which is correct for atomicity. But `CustomerAnalytics.update_metrics()` reads from `self.customer.total_visits` (the denormalized field) instead of computing from transactions. If the F() update and analytics update race, the analytics will be stale. The denormalized fields and the analytics model are two sources of truth that can diverge.

- **`Automation.can_execute_for_customer()` queries `CustomerAnalytics` for segment** — But `CustomerAnalytics.segment` is only updated when `update_metrics()` is called (via Celery task). If a customer's behavior changes but analytics haven't been recalculated, automation targeting will be wrong.

- **`unique_together = ["tenant", "email"]` on `Customer`** — This is correct but the `enroll_customer_public` endpoint uses `get_or_create` which will return the existing customer. However, it then tries to update the existing customer's fields and saves, which is a write on every duplicate enrollment attempt. Should check existence first and return early.

---

## 3. SECURITY (5/10)

### Critical

1. **`backend/auth.json`** — Live JWT tokens committed to git. Not in `.gitignore`. The access token gives full OWNER access to tenant `7bdc4106-b442-4aa0-87d2-2593649d6d1d`. The refresh token allows indefinite access renewal. This is a **breach-level finding**.

2. **Hardcoded API key** — `frontend/src/app/api/chat/route.ts:24` has `'X-API-KEY': 'C5ZfFYI-QOxHsMuJ'` for `agente.ingelsi.com.ec`. This is in client-pushed source code.

3. **Vault dev mode** — `docker-compose.yml` runs Vault with `VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_TOKEN:-loyallia-vault-root-token}`. Dev mode means no persistence, no audit log, no seal/unseal. The root token is in the `.env.example`.

### High

4. **SSRF in image fetching** — `apple_pass.py:fetch_image_bytes()` calls `requests.get(url)` on user-provided URLs (card `logo_url`, `icon_url`, `strip_image_url`). No URL validation, no private IP blocking, no size limit. An attacker with a card configuration can probe internal services.

5. **No HTTPS** — Nginx config (`deploy/rewards.loyallia.com.conf`) listens on port 80 only. No TLS, no HSTS redirect.

6. **`DEBUG=True` and `ALLOWED_HOSTS=*` as defaults** — Both in `docker-compose.yml` x-common-env. If someone deploys with default `.env`, they get a debug-mode, host-header-injectable, stack-trace-leaking production server.

7. **Temp password in API response** — `tenants/api.py:add_team_member()` returns `temp_password` in JSON. Also sent via email. API access logs will capture it.

8. **SSRF/Injection in scanner** — `scanner/transact/` takes `qr_code` as a query parameter in the URL: `/api/v1/scanner/transact/?qr_code=${encodeURIComponent(qrCode)}&amount=${amount}`. This is a GET-style parameter on a POST endpoint. While Django Ninja parses it correctly, the QR code value ends up in URL access logs.

### Medium

9. **OTP stored as plaintext in Redis** — `store_otp()` sets `cache.set(f"otp:{purpose}:{email}", otp, timeout=900)`. If Redis is compromised, all pending OTPs are readable.

10. **JWT_SECRET_KEY = SECRET_KEY** — Same key for JWT signing and Django's crypto. Should be separate.

11. **No refresh token rotation** — A stolen refresh token works until expiry (30 days). No reuse detection.

12. **`CORS_ALLOW_ALL_ORIGINS = True` in development** — Easy to accidentally deploy.

13. **`AWS_S3_VERIFY = False` in base settings** — Disables TLS verification for MinIO connections.

---

## 4. CODE QUALITY (6/10)

### Bugs

**BUG 1: `NameError` in `get_segmentation_analytics()`**

```python
# backend/apps/analytics/api.py:397
return {
    "total_customers": customers.count(),  # ← 'customers' is undefined
```

The variable `customers` is never defined. This function will crash every time it's called. The fix is to define `customers = Customer.objects.filter(tenant=tenant)` before using it.

**BUG 2: `AttributeError` in notification device registration**

```python
# backend/apps/notifications/api.py:48
def register_device(request, data: PushDeviceSchema):
    customer = request.user.customer  # ← AttributeError for OWNER/MANAGER/STAFF
```

Business users don't have a `.customer` reverse relation. This endpoint only works for customer-role users, but it's behind `auth=jwt_auth` which allows any authenticated user.

**BUG 3: Race condition in `_process_discount_transaction()`**

```python
# backend/apps/customers/models.py
def _process_discount_transaction(self, amount: Decimal) -> dict:
    total_spent = self.get_pass_field("total_spent_at_business", 0)  # ← stale read
    new_total = float(total_spent) + float(amount)
    self.set_pass_field("total_spent_at_business", new_total)  # ← separate save, not in select_for_update
```

This reads and writes `pass_data` outside the atomic `update_pass_data()` method. Two concurrent scans can both read `100`, both compute `150`, and both write `150` — losing one scan's `50`.

**BUG 4: `_execute_send_notification` passes wrong arguments**

```python
# backend/apps/automation/models.py
def _execute_send_notification(self, customer, context) -> bool:
    notification = NotificationService.send_notification(
        customer=customer,      # ← send_notification() takes a Notification object, not kwargs
        title=title,
        ...
    )
```

`NotificationService.send_notification()` expects a `Notification` model instance, but this passes keyword arguments. The method signature is `send_notification(notification: Notification) -> bool`. This will crash at runtime.

**BUG 5: Impersonation mutates global settings**

```python
# backend/apps/tenants/super_admin_api/tenants.py:278
original_lifetime = settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES
settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES = 5
access = create_access_token(...)
settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES = original_lifetime
```

This modifies the global `settings` object. Under concurrent requests, another request could read `JWT_ACCESS_TOKEN_LIFETIME_MINUTES = 5` between the set and restore. Use a local variable or pass the lifetime as a parameter.

### Style Issues

- **Inconsistent error handling** — Some endpoints raise `HttpError`, others return error dicts. The `create_campaign` endpoint returns `{"success": True, "message": ...}` while `subscribe` raises `HttpError(402, ...)`.
- **f-strings in logging** — `logger.error(f"Automation execution failed: {str(e)}")` should be `logger.error("Automation execution failed: %s", exc)` for structured logging.
- **`import` inside functions** — Dozens of imports are done inside view functions (e.g., `from apps.transactions.models import Transaction`). This is done to avoid circular imports, but it's a symptom of the tight coupling problem. It also makes the import graph invisible.
- **Magic numbers** — `500` in `bulk_create(batch_size=500)`, `50` in `iterator(chunk_size=50)`, `999999` as "unlimited" in plan limits. These should be named constants.
- **No type hints on many functions** — `fire_trigger()`, `paginate_queryset()`, most view functions lack return type annotations.

---

## 5. PERFORMANCE (6/10)

### N+1 Query Problems

1. **`agent_api/api.py:get_programs()`** — Loops over cards with `card.enrollments.count()` and `card.passes.filter(is_active=True).count()` inside a for-loop. For 50 programs, that's 100 extra queries.

2. **`analytics/api.py:get_segmentation_analytics()`** — Accesses `a.customer.full_name` in the list comprehension without `select_related("customer")`.

3. **`notifications/api.py:list_campaigns()`** — Groups notifications by title+date in Python. This should be a SQL GROUP BY.

4. **`cards/api.py:CardOut.from_model()`** — Calls `card.passes.count()` for every card in the list. For a list of 20 programs, that's 20 extra queries.

### What's Good

- **Redis caching on analytics** — 5-minute TTL on revenue breakdown, visits, demographics, program type analysis. Correct invalidation strategy (cache.delete_pattern on transaction creation would cause thundering herd, so they deliberately don't do it).
- **`select_related` / `prefetch_related` used in key paths** — `JWTAuth.authenticate()` uses `select_related("tenant")`, `transact()` uses `select_related("customer", "card", "card__tenant")`.
- **`F()` expressions for atomic updates** — `Customer.objects.filter(pk=...).update(total_visits=F("total_visits") + 1)` prevents lost updates.
- **Celery `max_retries` and `default_retry_delay`** — All tasks have retry logic with exponential-ish backoff.
- **`max-tasks-per-child=500`** — Prevents memory leaks in long-running workers.

### Missing

- **No database connection pooling monitoring** — PgBouncer is configured but there's no visibility into pool exhaustion.
- **No query count middleware** — No way to detect N+1 queries in production.
- **No pagination on most list endpoints** — `list_transactions`, `list_campaigns`, `list_automations` return all records. Should use cursor pagination.

---

## 6. FRONTEND (7/10)

### What's Good

- **Auth flow with silent refresh** — `auth.tsx` schedules token refresh 5 minutes before expiry, uses `setTimeout` with cleanup. Correct `sameSite: 'strict'` and `secure: isProd` cookie settings.
- **RBAC in the layout** — `DashboardLayout` checks role and redirects STAFF to `/scanner/scan`, isolates SUPER_ADMIN to `/superadmin`, and blocks MANAGER from OWNER-only routes. Client-side enforcement, but correctly done.
- **Typed API helpers** — `api.ts` exports `authApi`, `analyticsApi`, `customersApi`, etc. with proper TypeScript types. The 401 interceptor handles token refresh transparently.
- **Dashboard with real data** — The dashboard page fetches 8 API endpoints in parallel with `Promise.all()`, handles loading/error states, and renders charts with Recharts.
- **E2E test coverage** — 16 Playwright specs covering auth, programs, customers, team, locations, analytics, automation, campaigns, settings, billing, scanner, superadmin, role isolation, KPIs, program CRUD, phone verification, and SRS hardening.

### What's Not

- **No error boundaries** — A React error in any component crashes the entire app. Need `ErrorBoundary` wrappers.
- **`window.location.replace()` for routing** — The layout uses `window.location.replace('/scanner/scan')` instead of `router.replace()`. This causes a full page reload instead of a client-side navigation. Should use Next.js router.
- **No loading states on mutations** — `handleSubmit` in login sets `loading`, but most other mutation handlers (create program, update customer, etc.) don't have loading states.
- **Hardcoded Spanish strings** — Despite having i18n on the backend, the frontend has hardcoded Spanish: `'Sesión cerrada'`, `'Completa todos los campos'`, `'Error de conexión con el servidor'`. Should use a frontend i18n library (next-intl or similar).
- **No `key` prop on some `.map()` calls** — Some chart rendering uses index as key.
- **Scanner uses GET-style params on POST** — `api.post(\`/api/v1/scanner/transact/?qr_code=...&amount=...\`)`. Should be POST body.
- **No optimistic updates** — All mutations wait for server response before updating UI.

---

## 7. TESTING (5/10)

### What Exists

- **16 Playwright E2E specs** — Good coverage of major flows: auth, CRUD, RBAC, scanner, billing.
- **`cards/tests.py`** exists but is empty (just the file).

### What's Missing

- **Zero unit tests** — No `tests.py` in any Django app has actual test functions. The `cards/tests.py` file exists but is empty.
- **No integration tests** — No Django `TestCase` classes testing API endpoints, models, or services.
- **No test fixtures or factories** — `seed_sweet_coffee.py` and `seed_test_data.py` are management commands, not test fixtures.
- **No test coverage reporting** — No `.coveragerc`, no CI coverage gates.
- **No contract tests for payment gateway** — The `BendoGateway` is a stub that raises `PaymentGatewayError("pending credentials")`. No mock tests for the webhook flow.

---

## 8. DEVOPS (6/10)

### What's Good

- **Multi-stage Docker builds** — Both frontend and backend use multi-stage builds. Backend copies only `/install` from builder stage. Frontend uses Next.js standalone output (~200MB vs 1.5GB dev).
- **Non-root containers** — Backend creates `loyallia` user, frontend creates `nextjs:nodejs`. Both `USER` switch before CMD.
- **Resource limits on all services** — Every container has `deploy.resources.limits.memory` and `cpus`. Total budget is ~10GB.
- **Health checks** — PostgreSQL, Redis, MinIO, Vault, API all have health checks with retries and start periods.
- **`docker-compose.prod.yml` override** — Clean separation: prod uses Gunicorn, pre-built Next.js, no source mounts, no seed data.

### What's Not

- **No CI/CD pipeline** — No `.github/workflows/`, no GitLab CI, no build/test/deploy automation.
- **No infrastructure as code** — No Terraform, no CloudFormation, no Ansible. The deployment is "run docker-compose on a server."
- **No log aggregation** — JSON logging is configured but there's no ELK/Loki/CloudWatch setup.
- **No monitoring/alerting** — No Prometheus, no Grafana, no Sentry. The `/health/` endpoint exists but nothing scrapes it.
- **No backup automation** — No pg_dump cron, no MinIO replication.
- **`certs/` directory in gitignore but mounted as `./certs:/app/certs:ro`** — Where do the certs come from in production? No documentation.

---

## 9. SCALABILITY CONCERNS

### Will Break at ~1000 Concurrent Tenants

1. **`CustomerAnalytics.update_metrics()` does 6 SQL queries per customer** — Called after every transaction. For a busy tenant with 100 transactions/hour, that's 600 extra queries/hour just for analytics.

2. **`evaluate_scheduled_automations` iterates ALL customers for ALL scheduled automations** — For a tenant with 10,000 customers and 5 automations, that's 50,000 `can_execute_for_customer()` calls per day, each doing 2-3 queries.

3. **`send_email_campaign` sends emails sequentially** — No batching, no rate limiting on the SMTP side. For 10,000 customers, this will take hours and may hit SMTP rate limits.

4. **`_apply_segment_filter` for "vip" loads ALL customer spend values into memory** — `list(base.order_by("total_spent").values_list("total_spent", flat=True))` for 100K customers = 100K floats in a Python list.

5. **No database read replicas** — All reads and writes go through PgBouncer → single PostgreSQL instance.

---

## 10. WHAT TO FIX, IN ORDER

### This Week (Blocking Production)

1. Revoke exposed tokens, rotate SECRET_KEY, purge `auth.json` from git history
2. Move hardcoded API key to env/Vault
3. Fix `NameError` in `get_segmentation_analytics()`
4. Fix `AttributeError` in notification device endpoints
5. Fix race condition in `_process_discount_transaction()`
6. Fix `_execute_send_notification()` wrong arguments
7. Fix impersonation global settings mutation
8. Enable HTTPS on Nginx
9. Set `DEBUG=False` and `ALLOWED_HOSTS` to specific domains as defaults
10. Switch Vault to production mode

### This Month (Before Launch)

11. Add SSRF protection on image URL fetching
12. Add rate limiting on public enrollment and password reset
13. Hash OTPs before storing in Redis
14. Separate `JWT_SECRET_KEY` from `SECRET_KEY`
15. Add refresh token rotation
16. Add Sentry error tracking
17. Add unit tests for critical paths (auth, transactions, billing)
18. Fix N+1 queries in agent API and card listing
19. Add `select_related` / `prefetch_related` where needed
20. Add database backup automation

### This Quarter (Scale & Polish)

21. Extract business logic into service layer
22. Add integration tests with pytest-django
23. Add CI/CD pipeline (GitHub Actions)
24. Add Prometheus + Grafana monitoring
25. Implement proper frontend i18n
26. Add error boundaries to React components
27. Add API rate limiting per tenant/plan
28. Normalize `CustomerPass.pass_data` into typed fields
29. Add database read replicas
30. Add infrastructure as code (Terraform)

---

## FINAL VERDICT

This is a **well-architected codebase written by someone who understands Django, multi-tenancy, and SaaS patterns**. The PgBouncer routing, Celery queue separation, Vault integration, and audit trail show production awareness.

But it has **real bugs that will crash in production** (the analytics NameError, the notification AttributeError, the automation wrong arguments), **critical security gaps** (exposed tokens, no HTTPS, SSRF), and **performance problems that will surface at scale** (N+1 queries, sequential email sending, in-memory VIP segmentation).

The path to production is clear: fix the 10 blocking items, add the 10 pre-launch items, and you have a solid MVP. The architecture supports the growth path — the foundations are right.

**Honest assessment:** This is a strong **MVP-stage codebase** that needs 2-4 weeks of hardening before real customers. The engineering is above average for a startup codebase, but the security hygiene needs immediate attention.
