> **Estado del documento (2026-06-11):** Revisión basada en el código y documentación vigente.
> **Snapshot as of 2026-06-11:** Settings claims and file line counts reflect the codebase at this date; verify against current HEAD before acting.
> Algunos hallazgos pueden haber cambiado; verificar siempre contra el código fuente.

# Loyallia Django Settings Completeness Audit

> **Audit Date:** 2026-06-11 (snapshot; original audit 2026-01-19)
> **Auditor:** Senior Django Configuration Specialist
> **Server:** 140.82.15.48 (rewards.loyallia.com) — historical reference only
> **Project Root:** `/opt/loyallia/backend/` — historical reference only

---

## Executive Summary

| Category | Status | Score |
|----------|--------|-------|
| Security Headers | GOOD | 8/10 |
| Secret Management | GOOD | 8/10 |
| Database Configuration | GOOD | 8/10 |
| Celery Configuration | GOOD | 7/10 |
| Email/SMS Configuration | GOOD | 7/10 |
| Storage (MinIO) | GOOD | 7/10 |
| Payment Gateway | PARTIAL | 5/10 |
| Push Notifications | GOOD | 7/10 |
| Wallets (Apple/Google) | GOOD | 7/10 |
| Logging/Monitoring | GOOD | 7/10 |
| Environment Separation | GOOD | 8/10 |
| Health Checks | GOOD | 7/10 |
| CORS Configuration | GOOD | 7/10 |
| Rate Limiting | GOOD | 6/10 |
| **Overall** | **PARTIAL** | **6.9/10** |

### Critical Findings (3 Found)
1. **No `development_mode` setting exists** -- The project does NOT implement a `development_mode` toggle. PLATFORM_MODE is seeded as a PlatformSetting but is NOT consumed by payment/webhook logic.
2. **No Stripe integration implemented** -- Payment gateway uses "manual" provider only. Stripe keys/settings are completely absent.
3. **CELERY_WORKERS and GUNICORN_THREADS not configurable via env** -- Hardcoded worker defaults.

---

## 1. Settings Files Inventory

| File | Lines | Status | Purpose |
|------|-------|--------|---------|
| `loyallia/settings/base.py` | 475 | EXISTS | Base settings, all environments inherit |
| `loyallia/settings/production.py` | 103 | EXISTS | Production overrides, Vault strict mode |
| `loyallia/settings/development.py` | 45 | EXISTS | Dev overrides, DEBUG=True, relaxed CORS |
| `loyallia/settings/test.py` | 67 | EXISTS | Test overrides, in-memory caches |
| `loyallia/settings/local.py` | N/A | NOT FOUND | Local developer overrides (optional) |
| `loyallia/settings/__init__.py` | 1 | EXISTS | Package marker (empty docstring) |
| `loyallia/settings/provision.py` | N/A | NOT FOUND | Provisioning settings (optional) |
| `loyallia/settings/celery_config.py` | ~100 | EXISTS | Celery broker, routing, beat schedule |
| `loyallia/celery.py` | 20 | EXISTS | Celery app factory |
| `loyallia/__init__.py` | 6 | EXISTS | Loads celery app at startup |
| `loyallia/wsgi.py` | 16 | EXISTS | WSGI entry point (production settings) |
| `loyallia/asgi.py` | 10 | EXISTS | ASGI entry point (production settings) |
| `manage.py` | 23 | EXISTS | Management entry (production settings default) |

### Settings Module Selection Chain

```
manage.py          -> DJANGO_SETTINGS_MODULE="loyallia.settings.production" (default)
wsgi.py            -> DJANGO_SETTINGS_MODULE="loyallia.settings.production"
asgi.py            -> DJANGO_SETTINGS_MODULE="loyallia.settings.production"
celery.py          -> DJANGO_SETTINGS_MODULE="loyallia.settings.production"
```

**NOTE:** There is NO runtime mechanism to auto-select settings based on environment. The `.env` file or Docker compose must explicitly set `DJANGO_SETTINGS_MODULE` for non-production environments.

---

## 2. Settings Completeness Matrix

### 2.1 Database

| Setting | base.py | production.py | development.py | test.py | Status |
|---------|---------|---------------|----------------|---------|--------|
| ENGINE (PostgreSQL) | via dj_database_url | inherited | inherited | inherited | OK |
| HOST (pgbouncer:6432) | via PGBOUNCER_URL env | inherited | inherited | overridden (direct) | OK |
| HOST (postgres:5432 direct) | via DATABASE_DIRECT_URL env | inherited | inherited | used as default | OK |
| NAME (loyallia/loyallia_dev) | via env URL | inherited | inherited | test_loyallia_dev | OK |
| USER (loyallia) | via env URL | inherited | inherited | inherited | OK |
| PASSWORD | from Vault `postgres_password` | overridden (strict) | inherited | inherited | OK |
| conn_max_age=0 | set (PgBouncer requirement) | inherited | inherited | inherited | OK |
| DATABASE_ROUTERS | PgBouncerRouter | inherited | inherited | cleared | OK |
| environment_guard | called (mode) | called ("production") | called ("development") | not called | OK |

**Verdict:** Database configuration is COMPLETE. PgBouncer transaction pooling is properly configured with `conn_max_age=0`. The environment guard prevents production/dev cross-contamination.

### 2.2 Redis

| Setting | base.py | production.py | development.py | test.py | Status |
|---------|---------|---------------|----------------|---------|--------|
| CACHES LOCATION | from Vault `redis_url` | overridden (strict) | inherited | locmem | OK |
| KEY_PREFIX | "loyallia" | inherited | inherited | inherited | OK |
| TIMEOUT | 300s | inherited | inherited | inherited | OK |
| CLIENT_CLASS | DefaultClient | inherited | inherited | N/A | OK |

**Note:** Redis password is embedded in the URL fetched from Vault. No standalone `REDIS_PASSWORD` setting is used in Django settings (it's part of the connection URL).

### 2.3 Vault

| Setting | Value | Status |
|---------|-------|--------|
| VAULT_ADDR | from env (default: `http://vault:8200`) | OK |
| VAULT_TOKEN_FILE | from env | OK |
| VAULT_SECRET_PATH | from env (e.g., `secret/data/loyallia/production`) | OK |
| VAULT_CACHE_TTL | 300s (5 min, env-configurable) | OK |
| Cache invalidation | Cross-process via Django cache | OK |
| Retry logic | **NO retry/backoff** -- single attempt with 5s timeout | GAP |
| Fallback on failure | Returns stale cache or default | PARTIAL |

**Vault Client Behavior:**
- Reads ALL secrets in one request (KV v2, `data` subpath)
- Caches for 5 minutes (configurable via `VAULT_CACHE_TTL`)
- Cross-process cache invalidation via Redis key `vault:secrets:version`
- 5-second HTTP timeout on Vault requests
- Returns stale cache on Vault connection failure (degraded but available)
- **No exponential backoff or retry logic**
- `strict=True` mode raises RuntimeError if secret missing (production)

### 2.4 Email (Mailjet)

| Setting | base.py | production.py | development.py | test.py | Status |
|---------|---------|---------------|----------------|---------|--------|
| BACKEND | smtp.EmailBackend | inherited | console.EmailBackend | locmem.EmailBackend | OK |
| HOST | in-v3.mailjet.com | hardcoded | inherited | inherited | OK |
| PORT | 587 | inherited | inherited | inherited | OK |
| USE_TLS | True | inherited | inherited | inherited | OK |
| HOST_USER | Vault `mailjet_api_key` | overridden (strict) | inherited | inherited | OK |
| HOST_PASSWORD | Vault `mailjet_secret_key` | overridden (strict) | inherited | inherited | OK |
| DEFAULT_FROM_EMAIL | Vault `mailjet_sender_email` | overridden (strict) | inherited | inherited | OK |

### 2.5 SMS (Twilio)

| Setting | base.py | Status |
|---------|---------|--------|
| TWILIO_ACCOUNT_SID | Vault `twilio_account_sid` | OK |
| TWILIO_AUTH_TOKEN | Vault `twilio_auth_token` | OK |
| TWILIO_FROM_NUMBER | Vault `twilio_from_number` | OK |
| TWILIO_MAX_PER_DAY | 200 (env, default) | OK |
| TWILIO_VERIFY_SERVICE_SID | Vault `twilio_verify_service_sid` | OK |
| TWILIO_VERIFY_ENABLED | Vault boolean | OK |
| TWILIO_VERIFY_DEFAULT_CHANNEL | Vault (default "sms") | OK |
| TWILIO_API_KEY_SID | Vault `twilio_api_key_sid` | OK |
| TWILIO_API_KEY_SECRET | Vault `twilio_api_key_secret` | OK |
| TWILIO_TEST_ACCOUNT_SID | Vault `twilio_test_account_sid` | OK |
| TWILIO_TEST_AUTH_TOKEN | Vault `twilio_test_auth_token` | OK |

**Note:** Twilio SMS client has built-in sandbox mode detection using test credentials when `DEBUG=True`.

### 2.6 Payments

| Setting | base.py | production.py | Status |
|---------|---------|---------------|--------|
| PAYMENT_GATEWAY_ENABLED | Vault boolean (default False) | inherited | OK |
| PAYMENT_GATEWAY_PROVIDER | Vault (default "manual") | inherited | OK |
| PAYMENT_GATEWAY_BASE_URL | env (default "") | inherited | OK |
| PAYMENT_GATEWAY_LOGIN | Vault | strict | OK |
| PAYMENT_GATEWAY_TRAN_KEY | Vault | strict | OK |
| PAYMENT_GATEWAY_WEBHOOK_SECRET | Vault | strict | OK |
| **Stripe** | **NOT IMPLEMENTED** | **NOT IMPLEMENTED** | **MISSING** |
| **Stripe publishable key** | **NOT PRESENT** | **NOT PRESENT** | **MISSING** |
| **Stripe secret key** | **NOT PRESENT** | **NOT PRESENT** | **MISSING** |
| **Stripe webhook secret** | **NOT PRESENT** | **NOT PRESENT** | **MISSING** |
| **Stripe sandbox mode** | **NOT PRESENT** | **NOT PRESENT** | **MISSING** |

**CRITICAL GAP:** No Stripe integration exists. The payment gateway only supports "manual" (admin-verified) and "disabled" providers. The billing API docstring mentions "Stripe webhooks" but no Stripe code exists. This is a placeholder/future feature.

### 2.7 Storage (MinIO / S3)

| Setting | base.py | production.py | Status |
|---------|---------|---------------|--------|
| MINIO_ENDPOINT | env (default localhost:9000) | inherited | OK |
| MINIO_ACCESS_KEY | Vault | strict | OK |
| MINIO_SECRET_KEY | Vault | strict | OK |
| MINIO_BUCKET_PASSES | env (default "passes") | inherited | OK |
| MINIO_BUCKET_ASSETS | env (default "assets") | inherited | OK |
| MINIO_USE_SSL | env boolean (default False) | inherited | OK |
| AWS_S3_VERIFY | False | overridden True | OK |
| STORAGES backend | S3Boto3Storage | inherited | OK |

### 2.8 Push Notifications

| Setting | base.py | Status |
|---------|---------|--------|
| APPLE_APNS_KEY_ID | env (default "") | OK |
| APPLE_APNS_AUTH_KEY_PATH | /app/certs/apns_auth_key.p8 | OK |
| APNS sandbox auto-detect | from `settings.DEBUG` | OK |
| FIREBASE_CREDENTIAL_FILE | /app/certs/firebase_service_account.json | OK |

**Note:** APNS sandbox mode auto-detects from `DEBUG` setting (not from a separate `development_mode` flag). When `DEBUG=True`, sandbox APNS host is used.

### 2.9 Wallets (Apple/Google)

| Setting | base.py | production.py | Status |
|---------|---------|---------------|--------|
| APPLE_WALLET_ENABLED | Vault boolean | inherited | OK |
| APPLE_PASS_TYPE_IDENTIFIER | Vault | strict | OK |
| APPLE_TEAM_IDENTIFIER | Vault | strict | OK |
| APPLE_CERT_PATH | /app/certs/apple_pass.pem | inherited | OK |
| APPLE_CERT_KEY_PATH | /app/certs/apple_pass.key | inherited | OK |
| APPLE_WWDR_CERT_PATH | /app/certs/apple_wwdr.pem | inherited | OK |
| PASS_HMAC_SECRET | Vault | strict | OK |
| PASS_WEB_SERVICE_URL | env (computed from APP_URL) | derived from APP_URL | OK |
| GOOGLE_WALLET_ENABLED | Vault boolean (default True) | inherited | OK |
| GOOGLE_SERVICE_ACCOUNT_FILE | /app/certs/...json | inherited | OK |
| GOOGLE_WALLET_ISSUER_ID | Vault | strict | OK |

### 2.10 Security

| Setting | base.py | production.py | development.py | test.py | Status |
|---------|---------|---------------|----------------|---------|--------|
| SECRET_KEY | Vault (default "") | Vault strict | inherited | inherited | OK |
| DEBUG | env (default False) | False | True | False | OK |
| ALLOWED_HOSTS | env CSV | rewards.loyallia.com | ["*"] | inherited | OK |
| SECURE_SSL_REDIRECT | N/A | True | N/A | N/A | OK |
| SECURE_HSTS_SECONDS | N/A | 31536000 (1 year) | N/A | N/A | OK |
| SECURE_HSTS_INCLUDE_SUBDOMAINS | N/A | True | N/A | N/A | OK |
| SECURE_HSTS_PRELOAD | N/A | True | N/A | N/A | OK |
| X_FRAME_OPTIONS | SAMEORIGIN | DENY | SAMEORIGIN | SAMEORIGIN | OK |
| SESSION_COOKIE_SECURE | N/A | True | N/A | N/A | OK |
| SESSION_COOKIE_HTTPONLY | True | True | True | True | OK |
| SESSION_COOKIE_SAMESITE | Lax | Lax | Lax | Lax | OK |
| CSRF_COOKIE_SECURE | N/A | True | N/A | N/A | OK |
| CSRF_COOKIE_HTTPONLY | N/A | True | N/A | N/A | OK |
| SECURE_BROWSER_XSS_FILTER | True | inherited | inherited | inherited | OK |
| SECURE_CONTENT_TYPE_NOSNIFF | True | inherited | inherited | inherited | OK |
| SECURE_REFERRER_POLICY | strict-origin-when-cross-origin | inherited | inherited | inherited | OK |
| SECURE_CROSS_ORIGIN_OPENER_POLICY | same-origin | inherited | inherited | inherited | OK |
| CSP (via middleware) | Nonce-based | inherited | inherited | inherited | OK |
| SECURE_PROXY_SSL_HEADER | N/A | ("HTTP_X_FORWARDED_PROTO", "https") | N/A | N/A | OK |

### 2.11 Celery

| Setting | celery_config.py | production.py | test.py | Status |
|---------|------------------|---------------|---------|--------|
| CELERY_BROKER_URL | Vault (default redis://localhost:6379/1) | overridden strict | inherited | OK |
| CELERY_RESULT_BACKEND | Vault (default redis://localhost:6379/2) | overridden strict | inherited | OK |
| CELERY_ACCEPT_CONTENT | ["json"] | inherited | inherited | OK |
| CELERY_TASK_SERIALIZER | "json" | inherited | inherited | OK |
| CELERY_RESULT_SERIALIZER | "json" | inherited | inherited | OK |
| CELERY_TIMEZONE | "UTC" | inherited | inherited | OK |
| CELERY_TASK_TRACK_STARTED | True | inherited | inherited | OK |
| CELERY_TASK_TIME_LIMIT | 300 (5 min hard) | inherited | inherited | OK |
| CELERY_TASK_SOFT_TIME_LIMIT | 240 (4 min soft) | inherited | inherited | OK |
| CELERY_WORKER_PREFETCH_MULTIPLIER | 1 | inherited | inherited | OK |
| CELERY_ACKS_LATE | True | inherited | inherited | OK |
| CELERY_TASK_ALWAYS_EAGER | sys.argv check | inherited | True (forced) | OK |
| CELERY_TASK_EAGER_PROPAGATES | sys.argv check | inherited | True (forced) | OK |
| CELERY_BEAT_SCHEDULER | DatabaseScheduler | inherited | inherited | OK |
| CELERY_BEAT_SCHEDULE | 7 scheduled tasks | inherited | inherited | OK |

**Celery Queues Defined:**
- `default` -- automation tasks, token cleanup, catch-all
- `pass_generation` -- QR generation, pass updates, customer analytics
- `push_delivery` -- notification sending (single, blast, birthday, inactive)
- `sms_delivery` -- SMS campaign sending

**GAP:** `CELERY_WORKERS` is NOT configurable via environment variable.

### 2.12 Logging

| Setting | base.py | Status |
|---------|---------|--------|
| Formatters | verbose, json (custom JsonFormatter) | OK |
| Handlers | console (StreamHandler) | OK |
| Root level | INFO | OK |
| django logger | WARNING | OK |
| django.db.backends | WARNING | OK |
| celery logger | INFO | OK |
| apps logger | DEBUG | OK |
| common.rate_limit | WARNING | OK |

**GAPS:**
- No file-based logging handler (only console/stdout)
- Log level does not auto-adjust based on DEBUG (uses ternary for formatter only)

### 2.13 Monitoring

| Setting | Status |
|---------|--------|
| Sentry DSN | Configurable via env, initialized in base.py | OK |
| Sentry traces_sample_rate | Configurable via env (default 0.1) | OK |
| Sentry environment | Configurable via env (default "production") | OK |
| **Prometheus metrics** | IMPLEMENTED | OK |
| **Health check endpoint** | IMPLEMENTED (`/api/v1/health/`) | OK |
| **Readiness probe** | IMPLEMENTED (`/api/v1/health/ready/`) | OK |
| **Liveness probe** | IMPLEMENTED (`/api/v1/health/`) | OK |

### 2.14 Development

| Setting | base.py | development.py | Status |
|---------|---------|---------------|--------|
| DEBUG | env (default False) | True | OK |
| django_extensions | not installed | appended | OK |
| SQL query logging | WARNING | DEBUG | OK |
| CORS | env whitelist | CORS_ALLOW_ALL_ORIGINS=True | OK |
| Console email | inherited | console.EmailBackend | OK |

### 2.15 API / Rate Limiting

| Setting | base.py | Status |
|---------|---------|--------|
| RateLimitMiddleware | Enabled (Redis-backed, fails open) | OK |
| Pagination | `common.pagination.StandardPagination` (not in settings) | OK |
| JWT_ACCESS_TOKEN_LIFETIME_MINUTES | 60 (hardcoded) | OK |
| JWT_REFRESH_TOKEN_LIFETIME_DAYS | 30 (hardcoded) | OK |
| JWT_ALGORITHM | env (default "HS256") | OK |

**GAP:** No configurable API timeout setting. No rate limit values in settings (they appear to be in the middleware code).

---

## 3. Critical Checks

### 3.1 Does `development_mode` affect payment sandbox vs production? **NO**

**Finding:** There is NO `development_mode` setting in the Django settings. The concept does not exist.

The payment gateway uses `PAYMENT_GATEWAY_PROVIDER` (from Vault, default "manual"). There is no automatic sandbox/production switching. The "manual" gateway always creates pending-verification invoices regardless of environment.

**Related:** `seed_platform_settings.py` seeds a `PLATFORM_MODE` setting with value "production", but this is a `PlatformSetting` database row -- it is NOT read by any payment or settings code. It appears to be informational only.

### 3.2 Does `development_mode` affect webhook URLs? **N/A**

Since `development_mode` does not exist, webhooks are not affected. The payment gateway webhook secret is configured via Vault uniformly across environments.

### 3.3 Does `development_mode` affect trial enforcement? **N/A**

Trial days are controlled by `TRIAL_DAYS` setting (env/config with default 5) and the `SubscriptionPlan.trial_days` field. No environment-specific trial behavior exists.

### 3.4 Are settings loaded from Vault correctly (retry logic)? **PARTIAL**

The Vault client (`common/vault.py`) has:
- 5-second HTTP timeout
- Process-level caching with 5-minute TTL
- Cross-process cache invalidation via Redis
- Returns stale cache on connection failure (graceful degradation)
- **NO retry/backoff logic** -- fails on first Vault timeout
- In production (`strict=True`), missing secrets raise `RuntimeError`

### 3.5 Are all Celery queues defined in both base and production? **YES**

All 4 queues (`default`, `pass_generation`, `push_delivery`, `sms_delivery`) are defined in `celery_config.py` which is imported by `base.py`. Production inherits these. The beat schedule references all queues correctly.

### 3.6 Is CELERY_WORKERS configurable via env? **NO**

`CELERY_WORKERS` is not present anywhere in the settings. Worker count must be passed via command line: `celery -A loyallia worker -c <num>`.

### 3.7 Is GUNICORN_THREADS configurable via env? **NO**

`GUNICORN_THREADS` is not present anywhere in the settings. Gunicorn configuration is external (likely in Docker compose or systemd).

---

## 4. Environment Variable Validation

The `common/env_validation.py` module validates required environment variables on startup:

### Required Vars (all environments):
- `SECRET_KEY` (min 32 chars)
- `POSTGRES_PASSWORD` (min 8 chars)
- `REDIS_PASSWORD` (min 8 chars)

### Production Extra Vars:
- `MINIO_ROOT_USER` (min 3 chars)
- `MINIO_ROOT_PASSWORD` (min 8 chars)
- `ALLOWED_HOSTS`
- `JWT_SECRET_KEY` (min 16 chars)

### Production Required Vault Keys (28 keys):
```
secret_key, postgres_password, redis_url, celery_broker_url,
celery_result_backend, minio_access_key, minio_secret_key,
jwt_secret_key, pass_hmac_secret, google_oauth_client_id,
google_oauth_secret, google_wallet_issuer_id,
google_service_account_json, google_wallet_enabled,
payment_gateway_enabled, payment_gateway_provider,
apple_pass_type_identifier, apple_team_identifier,
apple_cert_pem, apple_cert_key_pem, apple_wwdr_cert_pem,
payment_gateway_login, payment_gateway_tran_key,
payment_gateway_webhook_secret, mailjet_api_key,
mailjet_secret_key, mailjet_sender_email
```

### Optional Vars:
- `SENTRY_DSN`
- `VAULT_ADDR` (default: http://vault:8200)
- `VAULT_TOKEN`
- `EMAIL_HOST` (default: in-v3.mailjet.com)

---

## 5. Platform Settings Seeding

### 5.1 Platform Settings (`seed_platform_settings.py`)

Seeds 4 runtime-configurable settings:

| Key | Default Value | Category | Consumed By |
|-----|--------------|----------|-------------|
| TRIAL_DAYS | 5 | billing | billing/api.py (with fallback to settings.TRIAL_DAYS) |
| TAX_RATE_ECUADOR | 0.15 | billing | billing/api.py (with fallback to settings.TAX_RATE_ECUADOR) |
| DEFAULT_TIMEZONE | America/Guayaquil | system | Unknown |
| PLATFORM_MODE | production | system | **NOT CONSUMED** (informational only) |

**GAP:** `PLATFORM_MODE` is seeded but never read by any application code.

### 5.2 Subscription Plans (`seed_subscription_plans.py`)

Seeds 4 subscription plans:

| Plan | Monthly | Annual | Max Customers | Max Users | Max Locations |
|------|---------|--------|--------------|-----------|---------------|
| Trial | $0 | $0 | unlimited | unlimited | unlimited |
| Starter | $29 | $290 | 500 | 3 | 1 |
| Professional | $75 | $750 | 10,000 | 10 | 5 |
| Enterprise | $149 | $1490 | unlimited | 50 | 50 |

Plans are also seeded via migration `0008_seed_vital_plans.py` (idempotent, runs on every deploy).

---

## 6. Recommendations

### HIGH Priority

1. **Implement a `development_mode` setting** that can toggle payment sandbox, webhook URLs, and other environment-specific behaviors. Connect it to `PLATFORM_MODE` PlatformSetting or create a new Django setting.

2. **Add Stripe payment gateway provider** -- The billing API mentions Stripe but no implementation exists. Add `StripeGateway` class implementing `BasePaymentGateway`.

3. **Add Vault retry logic** -- Implement exponential backoff (3 retries: 1s, 2s, 4s) for Vault HTTP requests.

4. **Make CELERY_WORKERS and GUNICORN_THREADS configurable** via environment variables.

### MEDIUM Priority

5. **Add Stripe-specific settings** to base.py and production.py (publishable key, secret key, webhook secret, sandbox mode).

6. **Add log file handlers** for persistent logging (not just console stdout).

### LOW Priority

7. **Create `local.py` settings file** template for developer convenience.

8. **Add API timeout configuration** to settings (request timeout, DB query timeout).

9. **Consider adding a `STRIPE_WEBHOOK_SECRET` Vault key** to the production required vault keys list.

---

## 7. Settings Architecture Diagram

```
                    +------------------+
                    |   .env / Vault   |
                    +--------+---------+
                             |
            +----------------+----------------+
            |                                 |
    +-------v--------+               +--------v--------+
    |  base.py       |               |  celery_config  |
    |  (475 lines)   |<--------------+  (queues, beat) |
    +---+------+-----+               +-----------------+
        |      |
   +----v-+  +-v-----+     +----------+
   | prod  |  |  dev  |     |  test    |
   | (103) |  |  (45) |     |  (67)    |
   +-------+  +-------+     +----------+

Settings Selection:
  manage.py/wsgi.py/asgi.py/celery.py
  -> default: loyallia.settings.production
  -> override via DJANGO_SETTINGS_MODULE env var
```

---

## Appendix: File Paths Referenced

| Path | Description |
|------|-------------|
| `/opt/loyallia/backend/loyallia/settings/base.py` | Base Django settings |
| `/opt/loyallia/backend/loyallia/settings/production.py` | Production overrides |
| `/opt/loyallia/backend/loyallia/settings/development.py` | Development overrides |
| `/opt/loyallia/backend/loyallia/settings/test.py` | Test overrides |
| `/opt/loyallia/backend/loyallia/settings/celery_config.py` | Celery configuration |
| `/opt/loyallia/backend/loyallia/celery.py` | Celery app factory |
| `/opt/loyallia/backend/loyallia/wsgi.py` | WSGI entry point |
| `/opt/loyallia/backend/loyallia/asgi.py` | ASGI entry point |
| `/opt/loyallia/backend/manage.py` | Django management |
| `/opt/loyallia/backend/common/vault.py` | Vault secret client |
| `/opt/loyallia/backend/common/env_validation.py` | Env var validation |
| `/opt/loyallia/backend/common/environment_guard.py` | Environment guardrails |
| `/opt/loyallia/backend/common/rate_limit.py` | Rate limiting middleware |
| `/opt/loyallia/backend/common/plan_enforcement.py` | Plan limit enforcement |
| `/opt/loyallia/backend/apps/billing/payment_gateway.py` | Payment gateway abstraction |
| `/opt/loyallia/backend/apps/billing/api.py` | Billing API router |
| `/opt/loyallia/backend/apps/tenants/models.py` | PlatformSetting model |
| `/opt/loyallia/backend/apps/tenants/management/commands/seed_platform_settings.py` | Platform settings seeder |
| `/opt/loyallia/backend/apps/billing/management/commands/seed_subscription_plans.py` | Subscription plan seeder |
| `/opt/loyallia/backend/apps/tenants/super_admin_api/integration_config.py` | SuperAdmin integration config |
