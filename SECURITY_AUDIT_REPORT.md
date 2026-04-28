# 🔒 Loyallia — Full Architecture & Security Audit Report

**Date:** 2026-04-29  
**Auditor:** AI Security Review  
**Repo:** https://github.com/somatechlat/loyallia  
**Scope:** Full codebase review — architecture, secrets, configuration, production readiness

---

## 🚨 EXECUTIVE SUMMARY

Loyallia is a **multi-tenant SaaS loyalty platform** (Django 5 + Next.js 14 + PostgreSQL 16 + Redis + Celery + HashiCorp Vault) targeting the Ecuadorian market. The architecture is **well-structured** with good separation of concerns, but has **several critical security issues** that must be resolved before production deployment.

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 CRITICAL | 4 | Must fix NOW |
| 🟠 HIGH | 8 | Fix before production |
| 🟡 MEDIUM | 12 | Fix before launch |
| 🔵 LOW | 6 | Improve post-launch |

---

## 🔴 CRITICAL ISSUES (Fix Immediately)

### C1. LIVE JWT TOKENS COMMITTED TO GIT
**File:** `backend/auth.json`  
**Risk:** Full account takeover. Anyone with repo access can impersonate the OWNER user.

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "ZBa-mIhgRNB6IxlQql8MguWAyNcia4X4YX9-ZYQISmnReMasFHBr...",
  "user_id": "55ac4da4-e61e-466c-9ae3-8e2a2e570372",
  "tenant_id": "7bdc4106-b442-4aa0-87d2-2593649d6d1d",
  "role": "OWNER"
}
```

**Fix:**
1. **Immediately revoke** these tokens (delete the RefreshToken DB entry)
2. Rotate the SECRET_KEY used to sign JWTs
3. Delete `backend/auth.json` from repo: `git rm --cached backend/auth.json`
4. Add `backend/auth.json` to `.gitignore`
5. Rewrite git history to purge the file: `git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch backend/auth.json' --prune-empty -- --all`

---

### C2. HARDCODED API KEY IN SOURCE CODE
**File:** `frontend/src/app/api/chat/route.ts:24`  
**Risk:** API key `C5ZfFYI-QOxHsMuJ` for external AI agent service (`agente.ingelsi.com.ec`) is hardcoded in source.

```typescript
'X-API-KEY': 'C5ZfFYI-QOxHsMuJ',
```

**Fix:**
1. Move to environment variable: `process.env.AI_AGENT_API_KEY`
2. Rotate the exposed key immediately
3. Add to Vault or `.env` (not in source)

---

### C3. VAULT DEV MODE IN PRODUCTION
**File:** `docker-compose.yml` (vault service)  
**Risk:** Vault runs in **dev mode** (`VAULT_DEV_ROOT_TOKEN_ID`) with a hardcoded root token `loyallia-vault-root-token`. Dev mode means:
- No encryption at rest
- No audit logging
- Root token never expires
- Data is in-memory only (lost on restart)

```yaml
vault:
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_TOKEN:-loyallia-vault-root-token}
```

**Fix:**
1. Switch to Vault production mode with proper initialization
2. Enable Vault audit logging
3. Use auto-unseal (AWS KMS / GCP KMS / Azure Key Vault)
4. Never use a static root token — use AppRole or Kubernetes auth
5. The `.env.example` also ships `VAULT_TOKEN=loyallia-vault-root-token` as a default

---

### C4. TEST CREDENTIALS IN COMMITTED FILES
**Files:**
- `frontend/test-api.js` — hardcoded `email: "test_owner@loyallia.com", password: "123456"`
- `frontend/test-campaign.js` — same credentials
- `backend/seed_sweet_coffee.py` — hardcoded `Admin1234!` password

**Risk:** Credential exposure. Even test credentials can be used for reconnaissance.

**Fix:**
1. Move test credentials to `.env.test` (gitignored)
2. Use factory patterns or fixtures instead of hardcoded values
3. Add `test-api.js` and `test-campaign.js` to `.gitignore` or move to a `tests/` directory with proper env loading

---

## 🟠 HIGH ISSUES (Fix Before Production)

### H1. NGINX REVERSE PROXY — NO HTTPS
**File:** `deploy/rewards.loyallia.com.conf`  
**Risk:** Nginx listens on port 80 (HTTP) only. No TLS termination, no HSTS, no cert config.

```nginx
server {
    listen 80;
    server_name rewards.loyallia.com;
```

**Fix:**
1. Add TLS termination (Let's Encrypt / AWS ACM)
2. Redirect HTTP → HTTPS
3. Add HSTS headers
4. Add rate limiting at Nginx layer (defense in depth)
5. Add `proxy_read_timeout` and `proxy_connect_timeout`

---

### H2. CORS ALLOW_ALL IN DEVELOPMENT SETTINGS
**File:** `backend/loyallia/settings/development.py`  
**Risk:** `CORS_ALLOW_ALL_ORIGINS = True` — if accidentally used in production, any origin can make authenticated requests.

**Fix:**
1. Ensure `DJANGO_SETTINGS_MODULE=loyallia.settings.production` is always set in prod
2. Add a startup check that fails if `CORS_ALLOW_ALL_ORIGINS=True` in production

---

### H3. `DEBUG=True` AS DEFAULT IN DOCKER-COMPOSE
**File:** `docker-compose.yml` (x-common-env)  
**Risk:** `DEBUG: "${DEBUG:-True}"` — defaults to True. Combined with development settings, this leaks stack traces.

**Fix:**
1. Default to `False` in the base docker-compose
2. Override to `True` only in a `docker-compose.dev.yml`

---

### H4. `ALLOWED_HOSTS=*` AS DEFAULT
**File:** `docker-compose.yml`  
**Risk:** `ALLOWED_HOSTS: "${ALLOWED_HOSTS:-*}"` allows Host header injection.

**Fix:**
1. Default to specific domains: `"rewards.loyallia.com,localhost"`
2. Never use `*` even in development

---

### H5. NO CSRF PROTECTION ON WEBHOOK ENDPOINT
**File:** `backend/apps/billing/payment_api.py`  
**Risk:** The `/webhook/` endpoint uses `@csrf_exempt` behavior (no auth decorator) but relies solely on HMAC signature verification. If webhook secret is weak/missing, any POST is accepted.

**Fix:**
1. Add IP allowlisting for webhook sources
2. Add request timestamp validation (prevent replay)
3. Log all webhook attempts with IP

---

### H6. FLOWER MONITOR EXPOSED WITH WEAK AUTH
**File:** `docker-compose.yml`  
**Risk:** Flower (Celery monitor) uses basic auth from env: `FLOWER_BASIC_AUTH=admin:change_this_flower_password`. Exposes task details, worker info, and ability to revoke/terminate tasks.

**Fix:**
1. Don't expose Flower externally (use internal network only)
2. If needed, use strong credentials from Vault
3. Add IP allowlisting

---

### H7. `requests` LIBRARY USED INSTEAD OF `httpx` (INCONSISTENCY)
**Files:**
- `backend/apps/customers/pass_engine/apple_pass.py` — uses `requests.get()`
- `backend/apps/customers/pass_engine/google_pass.py` — uses `requests.post()`

**Risk:** `requests` is not in `requirements.txt` (only `httpx` is listed). If `requests` comes via a transitive dependency, it could break on version updates. Also inconsistent HTTP client usage.

**Fix:**
1. Replace all `requests` calls with `httpx` (already a dependency)
2. Or explicitly add `requests` to requirements.txt

---

### H8. NO DATABASE BACKUP STRATEGY
**Risk:** No backup configuration for PostgreSQL, MinIO, or Vault data.

**Fix:**
1. Add `pg_dump` cron job or WAL archiving to S3
2. MinIO bucket replication
3. Vault snapshot automation

---

## 🟡 MEDIUM ISSUES (Fix Before Launch)

### M1. JWT SECRET KEY = DJANGO SECRET KEY
**File:** `backend/loyallia/settings/base.py:189`  
**Risk:** `JWT_SECRET_KEY = config("SECRET_KEY")` — uses the same key for JWT signing and Django's internal crypto. If one is compromised, both are.

**Fix:**
1. Use a separate `JWT_SECRET_KEY` environment variable
2. Store separately in Vault

---

### M2. NO TOKEN FAMILY / REUSE DETECTION
**Risk:** Refresh tokens don't implement rotation with reuse detection. If a refresh token is stolen, it can be used indefinitely until expiry.

**Fix:**
1. Implement refresh token rotation (new refresh token on each refresh)
2. Add token family tracking — if a rotated token is reused, revoke the entire family
3. Add device fingerprinting to refresh tokens

---

### M3. OTP STORED IN REDIS WITHOUT ENCRYPTION
**File:** `backend/apps/authentication/helpers.py`  
**Risk:** OTPs are stored as plaintext in Redis. If Redis is compromised, all pending OTPs are exposed.

**Fix:**
1. Hash OTPs before storing (bcrypt or SHA-256 with salt)
2. Compare hashes during verification

---

### M4. NO REQUEST ID / CORRELATION ID
**Risk:** No request tracing across services. Makes debugging production issues very difficult.

**Fix:**
1. Add middleware that generates `X-Request-ID` and passes through all services
2. Include in all log entries and error responses

---

### M5. MISSING SECURITY HEADERS
**Risk:** Missing headers: `Content-Security-Policy`, `Permissions-Policy`, `Referrer-Policy`.

**Fix:**
1. Add CSP header (at least `default-src 'self'`)
2. Add `Permissions-Policy: camera=(), microphone=(), geolocation=()`
3. Add `Referrer-Policy: strict-origin-when-cross-origin`

---

### M6. NO INPUT SANITIZATION ON TENANT SLUG
**File:** `backend/apps/authentication/api.py:register()`  
**Risk:** `slugify_business()` may not handle all edge cases (unicode, very long names, reserved words).

**Fix:**
1. Add slug collision detection with retry
2. Block reserved slugs (api, admin, www, etc.)
3. Validate max length

---

### M7. SEED SCRIPTS IN PRODUCTION IMAGE
**Files:**
- `backend/seed_sweet_coffee.py`
- `backend/adrian_passes.py`

**Risk:** These are copied into the Docker image and contain test data creation logic.

**Fix:**
1. Add to `.dockerignore`
2. Move to a `scripts/` directory excluded from production builds

---

### M8. NO RATE LIMITING ON PASSWORD RESET
**Risk:** `/auth/password-reset/request/` and `/auth/forgot-password/` are only rate-limited by the general auth rule (20 req/min). An attacker can enumerate valid emails or spam users.

**Fix:**
1. Add specific rate limit: 3 requests per hour per IP for password reset
2. Add CAPTCHA after 2 attempts

---

### M9. EMAIL VERIFICATION OTP = 6 HEX CHARS
**Risk:** `secrets.token_hex(3).upper()` = 6 hex characters = 16^6 = ~16.7M possibilities. Brute-forceable with the current 20 req/min rate limit.

**Fix:**
1. Use 8+ character OTPs
2. Add exponential backoff on failed verification attempts
3. Lock OTP after 5 failed attempts

---

### M10. NO HEALTH CHECK DIFFERENTIATION
**Risk:** Health endpoint returns 200 even if critical dependencies (DB, Redis, Vault) are down.

**Fix:**
1. Add `/api/v1/health/ready` — checks all dependencies
2. Add `/api/v1/health/live` — simple liveness probe
3. Return degraded status with details

---

### M11. HARDCODED DEV PASSWORD IN BASE SETTINGS
**File:** `backend/loyallia/settings/base.py:82`  
```python
default="postgres://loyallia:loyallia_dev_password@pgbouncer:6432/loyallia",
```
**Risk:** If env vars aren't set, this default password is used.

**Fix:**
1. Remove default passwords — force configuration
2. Or use Vault for all default lookups

---

### M12. `AWS_S3_VERIFY = False` IN BASE SETTINGS
**File:** `backend/loyallia/settings/base.py:183`  
**Risk:** Disables TLS certificate verification for MinIO/S3 connections.

**Fix:**
1. Set `True` in production
2. Only `False` for local development with self-signed certs

---

## 🔵 LOW ISSUES (Improve Post-Launch)

### L1. NO OPENAPI/SWAGGER AUTH DOCUMENTATION
The auto-generated docs at `/api/v1/docs` expose all endpoints without authentication context documentation.

### L2. NO API VERSIONING STRATEGY
Only `/api/v1/` exists. Plan for versioning strategy (URL path vs header).

### L3. NO GRACEFUL SHUTDOWN
Docker containers don't handle SIGTERM properly for in-flight requests.

### L4. CELERY WORKER CONCURRENCY FIXED
Workers use `-c 2` — should be tuned per worker type (CPU-bound pass generation vs I/O-bound push).

### L5. NO SENTRY/APM INTEGRATION
No error tracking or application performance monitoring configured.

### L6. FRONTEND NEXT.JS VERSION
Using Next.js 14.2.21 — should upgrade to 15.x for latest security patches and performance improvements.

---

## ✅ WHAT'S DONE WELL

1. **Vault integration pattern** — `common/vault.py` with env fallback is solid
2. **Multi-tenant isolation** — Tenant-scoped queries throughout
3. **PgBouncer router** — Correct separation of migrations vs app queries
4. **Rate limiting middleware** — Redis-backed, fails open, per-IP and per-user
5. **Argon2 password hashing** — Best-in-class
6. **Account lockout** — 5 failed attempts → 15 min lock
7. **Audit trail** — Immutable audit log with LOPDP/GDPR compliance
8. **Structured JSON logging** — Production-ready for ELK/CloudWatch
9. **Celery task routing** — Dedicated queues for pass generation, push, default
10. **Docker multi-stage builds** — Minimal production images
11. **Plan enforcement** — Decorator-based limit checking
12. **Apple/Google Wallet** — Full PKPass and Google Wallet JWT generation
13. **E2E test suite** — 16 Playwright test specs covering auth, RBAC, SRS hardening
14. **i18n support** — ES, EN, FR, DE with per-tenant/per-user language preference

---

## 📋 PRODUCTION READINESS CHECKLIST

### Must Do Before Launch
- [ ] **Rotate ALL exposed secrets** (JWT tokens, API keys, passwords)
- [ ] **Delete `backend/auth.json`** from git history
- [ ] **Remove hardcoded API key** from `chat/route.ts`
- [ ] **Switch Vault to production mode** with auto-unseal
- [ ] **Enable HTTPS** on Nginx with proper TLS
- [ ] **Set `DEBUG=False`** as default everywhere
- [ ] **Set `ALLOWED_HOSTS`** to specific domains
- [ ] **Add CSP and security headers**
- [ ] **Hash OTPs** before storing in Redis
- [ ] **Add refresh token rotation**
- [ ] **Separate JWT_SECRET_KEY** from SECRET_KEY
- [ ] **Add database backup automation**
- [ ] **Set up Sentry/error tracking**
- [ ] **Add request ID middleware**
- [ ] **Rate limit password reset** specifically

### Should Do Before Launch
- [ ] Add API rate limiting per tenant/plan
- [ ] Implement graceful shutdown
- [ ] Add readiness/liveness probes
- [ ] Remove seed scripts from production image
- [ ] Add IP allowlisting for webhooks
- [ ] Upgrade Next.js to 15.x
- [ ] Add CSP reporting endpoint
- [ ] Implement refresh token family detection

### Nice to Have
- [ ] Add OpenTelemetry tracing
- [ ] Implement circuit breakers for external services
- [ ] Add API versioning strategy
- [ ] Add canary deployment support
- [ ] Implement feature flags system

---

## 📊 ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                        NGINX (port 80)                      │
│                  rewards.loyallia.com                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  /api/* ──→ Django API (Gunicorn, port 33905)               │
│  /*     ──→ Next.js (standalone, port 33906)                │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │  Redis   │  │  MinIO   │  │  Vault   │   │
│  │  (5432)  │  │  (6379)  │  │  (9000)  │  │  (8200)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Celery Workers                           │   │
│  │  pass_generation │ push_delivery │ default/email      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────┐  ┌──────────┐                                │
│  │  Flower  │  │ PgBouncer│                                │
│  │  (5555)  │  │  (6432)  │                                │
│  └──────────┘  └──────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

---

---

## 🔍 DEEP CODE REVIEW — ADDITIONAL FINDINGS

### D1. 🔴 CRASH BUG: `NameError` in Analytics Segmentation Endpoint
**File:** `backend/apps/analytics/api.py:397-404`

```python
def get_segmentation_analytics(request):
    ...
    segments = CustomerAnalytics.objects.filter(tenant=tenant).values("segment")...
    
    return {
        "total_customers": customers.count(),  # ← BUG: 'customers' is undefined!
        "segments": [
            {
                ...
                "percentage": (s["count"] / customers.count() * 100)  # ← Same bug
```

The variable `customers` is **never defined** in this function. It should be `Customer.objects.filter(tenant=tenant).count()` or the result of the `segments` query. This endpoint will **always crash** with `NameError: name 'customers' is not defined`.

**Fix:** Replace `customers.count()` with `total` (computed from the segments query or a separate count).

---

### D2. 🟠 BROKEN ENDPOINT: Notification Device Registration
**File:** `backend/apps/notifications/api.py:48-58`

```python
def register_device(request, data: PushDeviceSchema):
    customer = request.user.customer  # ← Will crash for business OWNER users
```

The `register_device` endpoint assumes `request.user` has a `.customer` attribute (reverse OneToOne relation). But OWNER/MANAGER/STAFF users are **not** Customer objects — they're business team members. This will throw `AttributeError` for any authenticated non-customer user.

**Same issue in:** `list_devices`, `mark_notification_read`, `mark_notification_clicked`, `delete_notification` — all access `request.user.customer` without checking if it exists.

**Fix:** Add `hasattr(request.user, 'customer')` guard or use a separate auth flow for customer-facing vs business-facing endpoints.

---

### D3. 🟠 RACE CONDITION: `update_pass_data` Double-Save
**File:** `backend/apps/customers/models.py:CustomerPass.update_pass_data`

```python
def update_pass_data(self, updates: dict) -> None:
    with transaction.atomic():
        locked = CustomerPass.objects.select_for_update().get(pk=self.pk)
        for k, v in updates.items():
            locked.pass_data[k] = v
        locked.save(update_fields=["pass_data", "last_updated"])
    self.refresh_from_db(fields=["pass_data", "last_updated"])
```

Then in `_process_stamp_transaction`:
```python
self.update_pass_data(updates)  # Saves pass_data
# ...
# Then the caller (transact endpoint) does NOT re-read pass_data
# before creating the Transaction record — stale data risk
```

The `process_transaction` method calls `update_pass_data` which saves to DB, but the calling code in `transactions/api.py:transact()` reads `result` from the return value (which is fine), but the `pass_obj.pass_data` in memory may be stale if multiple scans happen concurrently. The `select_for_update` lock is released after `update_pass_data` returns, so a concurrent scan could overwrite the first scan's stamp count.

**Fix:** The current approach is actually correct for the atomic update itself. But the `result` dict returned by `process_transaction` should read from the locked instance, not the in-memory one. Currently it returns computed values which is OK, but `_process_discount_transaction` reads `self.get_pass_field("total_spent_at_business")` **before** the atomic update — this is the real race condition:

```python
total_spent = self.get_pass_field("total_spent_at_business", 0)  # ← stale read
new_total = float(total_spent) + float(amount)
self.set_pass_field("total_spent_at_business", new_total)  # ← overwrites concurrent
```

This uses `set_pass_field` which does a **separate** save, not the atomic `select_for_update`. Two concurrent scans could both read `total_spent=100`, both compute `100+50=150`, and both write `150` — losing one scan's `50`.

**Fix:** Move all pass_data reads/writes inside the `select_for_update` block in `update_pass_data`.

---

### D4. 🟠 NO INPUT VALIDATION ON `metadata` JSONFIELD
**File:** `backend/apps/cards/api.py:CardCreateIn`

```python
class CardCreateIn(BaseModel):
    metadata: dict | None = {}
```

The `metadata` field accepts **any** arbitrary JSON dict. While `Card.clean()` validates type-specific fields, it's only called on `save()` without `update_fields`. An attacker could inject:
- Extremely large JSON payloads (DoS)
- Unexpected keys that break card processing logic
- Nested objects hundreds of levels deep

**Fix:**
1. Add `metadata` size limit in the Pydantic schema (e.g., max 10KB)
2. Validate that only known keys are present per card type
3. Add `MAX_METADATA_DEPTH` check

---

### D5. 🟠 SSRF RISK IN APPLE PASS IMAGE FETCHING
**File:** `backend/apps/customers/pass_engine/apple_pass.py:156-161`

```python
def fetch_image_bytes(url):
    if not url: return None
    try:
        import requests
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            return resp.content
    except Exception as exc:
        logger.warning("Failed to fetch image from %s: %s", url, exc)
    return None
```

The `logo_url`, `icon_url`, and `strip_image_url` are user-provided URLs (from Card metadata). An attacker could set these to:
- `http://169.254.169.254/latest/meta-data/` (AWS metadata)
- `http://localhost:8000/admin/` (internal services)
- `file:///etc/passwd` (local file read)

**Fix:**
1. Validate URL scheme (only `https://`)
2. Block private IP ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x, localhost)
3. Use `httpx` with `follow_redirects=False` or limit redirects
4. Set max response size (e.g., 5MB)

---

### D6. 🟠 NO TENANT ISOLATION ON `enroll_customer_public`
**File:** `backend/apps/customers/api.py:enroll_customer_public`

```python
@router.post("/enroll/", response=CustomerPassOut, summary="Auto-inscripcion de cliente")
def enroll_customer_public(request, card_id: str, customer_data: CustomerCreateIn):
```

This is a **public** endpoint (no auth). While it correctly looks up the card by ID and creates the customer under the card's tenant, there's no rate limiting specific to this endpoint. An attacker could:
- Spam enrollment with fake emails
- Enumerate valid card IDs
- Create thousands of fake customers

**Fix:**
1. Add per-IP rate limit (e.g., 5 enrollments per hour)
2. Add CAPTCHA for public enrollment
3. Consider requiring email verification before creating the CustomerPass

---

### D7. 🟠 TEMP PASSWORD RETURNED IN API RESPONSE
**File:** `backend/apps/tenants/api.py:add_team_member`

```python
return {
    "success": True,
    "message": get_message("TEAM_MEMBER_ADDED"),
    "user_id": str(user.id),
    "temp_password": temp_password,  # ← Returned in JSON response
}
```

The temporary password is returned in the API response AND sent via email. If the API response is logged (access logs, browser history, CDN logs), the password is exposed.

**Fix:**
1. Only send temp password via email, not in the API response
2. Or use a one-time invitation link instead of a password

---

### D8. 🟠 CSV EXPORT MISSING SECURITY HEADERS
**File:** `backend/apps/customers/api.py:export_customers` and `backend/apps/customers/segment_api.py:export_segment`

CSV exports use `HttpResponse` / `StreamingHttpResponse` without:
- `Content-Security-Policy` header (CSV injection risk)
- Rate limiting on export endpoints
- Row count limits (could export millions of rows)

**Fix:**
1. Add `Content-Security-Policy: sandbox` header
2. Sanitize CSV data (escape `=`, `+`, `-`, `@` prefixes to prevent CSV injection)
3. Add max row limit (e.g., 100K rows)
4. Add rate limit (1 export per 5 minutes)

---

### D9. 🟡 `CustomerCreateIn` ALLOWS EXTRA FIELDS
**File:** `backend/apps/customers/schemas.py`

```python
class CustomerCreateIn(BaseModel):
    ...
    model_config = {
        "extra": "allow"  # ← Accepts ANY extra fields
    }
```

This is intentional (for form builder custom fields), but it means the schema accepts unlimited extra data that gets stored in `pass_data["enrollment_data"]`. An attacker could send megabytes of JSON in extra fields.

**Fix:**
1. Limit total request body size
2. Validate extra field names (alphanumeric, max 50 chars)
3. Limit extra field values (max 500 chars each)

---

### D10. 🟡 `Card.clean()` NOT CALLED ON PARTIAL UPDATES
**File:** `backend/apps/cards/models.py:Card.save`

```python
def save(self, *args, **kwargs) -> None:
    if not kwargs.get("update_fields"):
        self.clean()
    super().save(*args, **kwargs)
```

This means `set_metadata_field` (which uses `update_fields`) bypasses validation. An admin could set invalid metadata values that would crash `process_transaction` later.

**Fix:** Validate the specific field being set in `set_metadata_field`, or run `clean()` on the affected field subset.

---

### D11. 🟡 MISSING `select_related` CAUSING N+1 QUERIES
**Files:**
- `backend/apps/analytics/api.py:get_segmentation_analytics` — `CustomerAnalytics` queried without `select_related("customer")`, then `a.customer.full_name` accessed in list comprehension
- `backend/apps/notifications/api.py:list_campaigns` — N queries on each notification for related objects
- `backend/apps/agent_api/api.py:get_programs` — loops over cards with `card.enrollments.count()` and `card.passes.filter()` inside a for-loop (N+1)

**Fix:** Add `select_related()` and `prefetch_related()` to prevent N+1 query storms.

---

### D12. 🟡 `verify_otp` TIMING ATTACK
**File:** `backend/apps/authentication/helpers.py`

```python
def verify_otp(email: str, otp: str, purpose: str) -> bool:
    stored = cache.get(key)
    if stored and stored == otp:  # ← Direct string comparison
        cache.delete(key)
        return True
    return False
```

Direct string comparison is vulnerable to timing attacks. While the impact is low (OTP is short-lived), it's a best practice issue.

**Fix:** Use `hmac.compare_digest(stored, otp)` for constant-time comparison.

---

### D13. 🟡 REFRESH TOKEN NOT CLEANED UP ON EXPIRY
**File:** `backend/apps/authentication/models.py:RefreshToken`

Expired refresh tokens remain in the database forever. No cleanup task exists.

**Fix:** Add a Celery Beat task to delete expired refresh tokens daily:
```python
@shared_task
def cleanup_expired_tokens():
    RefreshToken.objects.filter(expires_at__lt=timezone.now()).delete()
```

---

### D14. 🟡 `ALLOWED_HOSTS=*` IN DEVELOPMENT DOCKER-COMPOSE
The `docker-compose.yml` defaults `ALLOWED_HOSTS` to `*` which allows Host header injection attacks. While this is "development", developers often test with production-like data.

---

### D15. 🟡 NO CORS PREFLIGHT CACHE
**File:** `backend/loyallia/settings/base.py`

No `CORS_PREFLIGHT_MAX_AGE` setting. Browsers will send preflight OPTIONS requests on every cross-origin request, adding latency.

**Fix:** Add `CORS_PREFLIGHT_MAX_AGE = 86400` (24 hours).

---

### D16. 🔵 `enroll_customer_public` CREATES CUSTOMER WITHOUT EMAIL VERIFICATION
A customer can enroll with any email (including someone else's) without verification. This could be used for:
- Harassment (enroll someone's email without consent)
- Data pollution (fake customers with real emails)

**Fix:** Add email verification step before creating the CustomerPass (or at least before allowing wallet pass generation).

---

### D17. 🔵 NO `Content-Disposition` ON CSV EXPORTS PREVENTS INLINE RENDERING
Modern browsers may try to render CSV inline, which can execute embedded JavaScript.

**Fix:** Already present on `export_customers` but missing on `export_segment`. Add consistently.

---

### D18. 🔵 LOGGING POTENTIAL PII
**File:** `backend/apps/authentication/api.py:283`

```python
logger.info("Password reset requested for %s", payload.email)
```

Logging user emails in plaintext may violate LOPDP/GDPR depending on log retention policies.

**Fix:** Mask emails in logs: `u***@d***.com`

---

### D19. 🔵 `AUDIT LOG` IMMUTABILITY BYPASSED VIA DJANGO ADMIN
The `AuditLog.save()` and `delete()` methods enforce immutability at the Python level, but Django admin and raw SQL can still modify/delete entries.

**Fix:** Use PostgreSQL row-level security or a separate read-only DB user for audit logs.

---

### D20. 🔵 NO OPENAPI RATE LIMIT DOCUMENTATION
The API docs at `/api/v1/docs/` don't document rate limits, which makes it harder for API consumers to handle 429 responses properly.

---

## 📊 FINAL ARCHITECTURE ASSESSMENT

| Category | Score | Notes |
|----------|-------|-------|
| **Architecture** | 8/10 | Clean Django Ninja + Celery + PgBouncer. Good separation. |
| **Security** | 5/10 | Critical secrets exposed. Vault in dev mode. No HTTPS. |
| **Code Quality** | 7/10 | Well-structured, but several bugs (analytics crash, N+1 queries) |
| **Testing** | 6/10 | Good E2E suite (16 specs), but no unit tests visible |
| **Production Readiness** | 4/10 | Needs secrets rotation, HTTPS, bug fixes, monitoring |
| **Scalability** | 7/10 | PgBouncer, Celery queues, Redis caching — good foundation |
| **Compliance** | 7/10 | Audit trail, LOPDP awareness — needs immutability enforcement |

**Overall: The codebase shows strong engineering fundamentals but has critical security gaps and several runtime bugs that must be fixed before any production deployment.**

---

*Report generated from full file-by-file analysis of the Loyallia codebase (~150 files reviewed).*
