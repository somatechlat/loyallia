# 🔒 Loyallia Backend — Security Audit Report

**Audit Date:** 2026-04-29  
**Auditor:** Automated Security Analysis (Subagent)  
**Scope:** Full backend codebase at `/root/.openclaw/workspace/loyallia/backend`  
**Methodology:** Line-by-line code review of all security-critical files  

---

## Executive Summary

The Loyallia backend demonstrates **above-average security awareness** for a Django application — JWT with refresh token rotation, Argon2 password hashing, OTP rate limiting, HMAC webhook verification, and Vault integration are all present. However, several **CRITICAL and HIGH severity issues** were identified that could lead to account takeover, brute-force attacks, or data exposure.

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 3 |
| 🟠 HIGH | 7 |
| 🟡 MEDIUM | 8 |
| 🔵 LOW | 5 |
| **Total** | **23** |

---

## 🔴 CRITICAL Findings

### C-01: OTP Brute-Force via Weak Entropy + Parallel Rate Limit Bypass

**File:** `apps/authentication/api.py:97` and `apps/authentication/helpers.py:45-46`

```python
# api.py:97
otp = secrets.token_hex(3).upper()  # 6 hex chars = 16,777,216 possibilities

# helpers.py:45-46
def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()
```

**Issue:** A 6-character hex OTP (`token_hex(3)`) has only **16,777,216** possible values. The OTP verification rate limit is **5 attempts per 15 minutes per email** (in `helpers.py:verify_otp`), but the **password reset request endpoint** has its own separate rate limit (3/hour) that generates a *new* OTP each time. An attacker can:

1. Request a password reset (3/hour allowed)
2. Each request generates a new OTP
3. The OTP verification allows 5 attempts per 15 min

The *effective* security is **not** 16M attempts, but rather the verification rate limit window. With 5 attempts per 15 min, it would take ~35,000 hours to brute-force — but the OTP expires in 15 minutes, so the attacker only gets **5 shots per OTP**. However, the `store_otp` function uses Django's cache (Redis), and the cache key includes the email+purpose. If an attacker sends many reset requests rapidly (before rate limiting kicks in), they can generate many valid OTPs simultaneously.

**More critically:** The rate limit counter for `otp_attempts:password_reset:{email}` in `password_reset_confirm` (line ~168) is checked *before* calling `verify_otp`, but `verify_otp` also has its own internal attempt tracking. This creates a **double-counting** confusion where the rate limit could be bypassed by alternating between the two check paths.

**Remediation:**
- Increase OTP entropy to at least 8 alphanumeric characters (`secrets.token_urlsafe(6)`)
- Use a single, centralized rate limit check (not duplicated in both endpoint and helper)
- Ensure OTP is invalidated after the first successful verification (already done)
- Consider time-based OTP (TOTP) for higher security

---

### C-02: Rate Limiter Fails Open — Complete Bypass When Redis Unavailable

**File:** `common/rate_limit.py:68-72, 82-83`

```python
def _get_redis(self):
    if self._redis_available is False:
        return None
    try:
        from django_redis import get_redis_connection
        conn = get_redis_connection("default")
        self._redis_available = True
        return conn
    except Exception:
        self._redis_available = False
        logger.warning("Rate limiter: Redis unavailable. Failing open.")
        return None

# In __call__:
if redis is None:
    # Fail open — no Redis, no rate limiting
    return self.get_response(request)
```

**Issue:** When Redis is unavailable (connection failure, crash, network partition), **all rate limiting is completely disabled**. This means:
- Login brute-force attacks become unlimited
- Registration spam becomes unlimited
- OTP request flooding becomes unlimited (SMS cost attack)

A Redis crash during an active attack would immediately remove all protection.

**Remediation:**
- **Fail closed** for security-critical endpoints (login, register, OTP)
- Implement in-memory fallback rate limiting (e.g., `collections.deque` sliding window per-process)
- At minimum, fail closed for `/api/v1/auth/` paths and fail open for non-auth paths
- Add monitoring/alerting for Redis unavailability

---

### C-03: Webhook Signature Verification — No Replay Protection

**File:** `apps/billing/payment_gateway.py:110-117`

```python
def verify_webhook(self, body: bytes, signature: str) -> bool:
    """Verify PlacetoPay webhook HMAC-SHA256 signature."""
    if not self.webhook_secret:
        logger.warning("Webhook secret not configured, rejecting.")
        return False
    expected = hmac.new(
        self.webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

**Issue:** The HMAC verification implementation is correct (`hmac.new` is a valid alias for `hmac.HMAC`). However:
1. If `PAYMENT_GATEWAY_WEBHOOK_SECRET` is empty string (the default in `base.py:172`), the webhook endpoint **rejects all requests**. While this is secure-by-default, it means the webhook is non-functional until properly configured.
2. There is **no webhook replay protection** — an attacker who captures a valid webhook payload + signature can replay it indefinitely.
3. The webhook endpoint in `payment_api.py:148` does **not validate the timestamp** of the webhook payload.

**Remediation:**
- Add timestamp validation (reject webhooks older than 5 minutes)
- Implement idempotency keys for webhook event processing
- Add nonce/timestamp to the signed payload
- Validate that `PAYMENT_GATEWAY_WEBHOOK_SECRET` is configured at startup (fail loudly)

---

## 🟠 HIGH Findings

### H-01: X-Forwarded-For IP Spoofing Enables Rate Limit Bypass

**File:** `common/rate_limit.py:30-35`

```python
def _get_client_ip(request: HttpRequest) -> str:
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")
```

**Issue:** The `X-Forwarded-For` header is **trivially spoofable** by any client. An attacker can send requests with different `X-Forwarded-For` values to bypass all IP-based rate limits. This completely undermines:
- Login brute-force protection (5/min per IP)
- Registration spam protection (10/min per IP)
- OTP request flooding (3/min per IP)

**Remediation:**
- Use `REMOTE_ADDR` (set by the trusted reverse proxy) instead of `X-Forwarded-For`
- If behind multiple proxies, configure `SECURE_PROXY_SSL_HEADER` and use Django's `request.META['REMOTE_ADDR']` after stripping trusted proxy headers at the Nginx level
- Nginx should set `X-Real-IP` and strip any client-supplied `X-Forwarded-For`

---

### H-02: JWT Token Uses HS256 with Shared Secret — No Asymmetric Verification

**File:** `apps/authentication/tokens.py:29-36`

```python
return jwt.encode(
    payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
)
```

**File:** `loyallia/settings/base.py:227`

```python
JWT_ALGORITHM = "HS256"
JWT_SECRET_KEY = config("JWT_SECRET_KEY", default=config("SECRET_KEY"))  # Falls back to Django SECRET_KEY
```

**Issue:** HS256 uses a **symmetric secret** — the same key signs and verifies tokens. This means:
1. If `SECRET_KEY` is compromised, an attacker can forge arbitrary JWT tokens with any `user_id`, `tenant_id`, and `role`
2. The fallback to Django's `SECRET_KEY` means the JWT signing key may be the same key used for CSRF tokens, session cookies, and password reset tokens
3. Any service that needs to verify tokens must have access to the signing secret (expanding the attack surface)

**Remediation:**
- Use RS256 (asymmetric) — sign with private key, verify with public key
- Ensure `JWT_SECRET_KEY` is always distinct from `SECRET_KEY` (remove the fallback)
- Rotate JWT keys periodically with a key ID (`kid`) in the JWT header

---

### H-03: Google OAuth Client ID Exposed via Unauthenticated Endpoint

**File:** `apps/authentication/api.py:250-258`

```python
@router.get("/google/config/", auth=None, summary="Obtener configuración de Google OAuth")
def google_oauth_config(request):
    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    return {
        "enabled": bool(client_id),
        "client_id": client_id,
    }
```

**Issue:** The Google OAuth Client ID is exposed to unauthenticated users. While the Client ID is not a secret per se, exposing it allows attackers to:
1. Create phishing pages that impersonate the application's OAuth flow
2. Enumerate whether Google OAuth is configured (reconnaissance)
3. Use the client ID in social engineering attacks

More importantly, there's **no `auth=None` annotation on the `forgot_password` and `reset_password` endpoints** — they're missing the explicit `auth=None` decorator, relying on Django Ninja's default behavior.

**Remediation:**
- This is acceptable for Client ID (it's meant to be public), but document it explicitly
- Ensure `GOOGLE_OAUTH_CLIENT_SECRET` is never exposed (currently safe)
- Add explicit `auth=None` to all unauthenticated endpoints for clarity

---

### H-04: Development Settings Allow Wildcard Hosts and CORS

**File:** `loyallia/settings/development.py:7-8`

```python
DEBUG = True
ALLOWED_HOSTS = ["*"]
```

**File:** `loyallia/settings/development.py:11`

```python
CORS_ALLOW_ALL_ORIGINS = True
```

**Issue:** If development settings are accidentally used in production (e.g., wrong `DJANGO_SETTINGS_MODULE`), the application becomes vulnerable to:
- Host header injection attacks
- Cross-origin request forgery from any domain
- Debug information exposure (stack traces, SQL queries)

**Remediation:**
- Add a startup check that prevents running with `ALLOWED_HOSTS = ["*"]` in production
- Use environment variable validation (e.g., `assert not DEBUG or ENVIRONMENT == 'development'`)
- Consider removing `development.py` from the production Docker image entirely

---

### H-05: Hardcoded Database Credentials in Base Settings

**File:** `loyallia/settings/base.py:79-86`

```python
DATABASES = {
    "default": dj_database_url.config(
        env="PGBOUNCER_URL",
        default="postgres://loyallia:loyallia_dev_password@pgbouncer:6432/loyallia",
        conn_max_age=0,
    ),
    "direct": dj_database_url.config(
        env="DATABASE_DIRECT_URL",
        default="postgres://loyallia:loyallia_dev_password@postgres:5432/loyallia",
    ),
}
```

**Issue:** Default credentials `loyallia:loyallia_dev_password` are hardcoded. If environment variables are not set (e.g., misconfigured deployment), the application connects with these known credentials. This is a **credential exposure** risk in containerized environments where env vars may not propagate correctly.

**Remediation:**
- Remove hardcoded defaults entirely — fail loudly if `PGBOUNCER_URL` is not set
- Use Vault for database credentials (already partially implemented in production.py)
- Add a startup check that validates database credentials are not the development defaults

---

### H-06: Invitation Token Stored in Plaintext in Database

**File:** `apps/authentication/api.py:208`

```python
invitation_token = secrets.token_urlsafe(32)
# ...
User.objects.create_user(
    # ...
    invitation_token=invitation_token,
)
```

**File:** `apps/authentication/api.py:219`

```python
invite_url = f"{settings.APP_URL}/invite/accept/?token={invitation_token}"
```

**Issue:** The invitation token is:
1. Stored in **plaintext** in the database (not hashed)
2. Sent in a URL via email (acceptable)
3. Never expires (no TTL on the invitation)

If the database is compromised, all pending invitation tokens can be used to create accounts. Unlike refresh tokens (which are hashed with SHA-256), invitation tokens are stored raw.

**Remediation:**
- Hash invitation tokens before storage (same pattern as refresh tokens)
- Add an expiry timestamp (e.g., 7 days)
- Invalidate invitation tokens when the inviting user is deactivated

---

### H-07: No Replay Protection on Payment Webhooks

**File:** `apps/billing/payment_api.py:148-165`

```python
@router.post("/webhook/", summary="Payment Gateway Webhook")
def payment_webhook(request: HttpRequest):
    signature = request.headers.get("X-Payment-Signature", "")
    gateway = get_payment_gateway()
    if not gateway.verify_webhook(request.body, signature):
        raise HttpError(401, get_message("BILLING_INVALID_SIGNATURE"))
    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        raise HttpError(400, get_message("BILLING_INVALID_PAYLOAD"))
    event_type = payload.get("event", "")
    event_data = payload.get("data", {})
    gateway.process_webhook(event_type, event_data)
    return {"received": True}
```

**Issue:** No protection against:
1. **Replay attacks** — A captured valid webhook can be resent indefinitely
2. **Duplicate processing** — No idempotency check on event IDs
3. **Timestamp validation** — No check on when the webhook was generated
4. **No `auth=None`** — The endpoint doesn't explicitly declare it's unauthenticated (relies on default)

**Remediation:**
- Add `timestamp` to the HMAC-signed payload and reject webhooks older than 5 minutes
- Implement idempotency: store processed event IDs and reject duplicates
- Add explicit `auth=None` decorator

---

## 🟡 MEDIUM Findings

### M-01: CSP Allows `unsafe-inline` for Scripts

**File:** `loyallia/settings/base.py:262`

```python
CSP_SCRIPT_SRC = "'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com"
```

**Issue:** `'unsafe-inline'` in `script-src` significantly weakens XSS protection. If an attacker can inject HTML (e.g., via a stored XSS in customer names or program descriptions), inline scripts will execute.

**Remediation:**
- Use nonce-based CSP (`'nonce-{random}'`) or `'strict-dynamic'`
- Remove `'unsafe-inline'` from script sources
- Keep `'unsafe-inline'` only for `style-src` if needed for CSS-in-JS

---

### M-02: Password Validation Missing Complexity Requirements

**File:** `loyallia/settings/base.py:110-121`

```python
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
```

**Issue:** Minimum length is only 8 characters with no complexity requirements (uppercase, lowercase, digits, special characters). The `CommonPasswordValidator` helps but isn't sufficient.

**Remediation:**
- Increase minimum length to 12+ characters
- Consider adding a custom validator for complexity requirements
- Check against HaveIBeenPwned API for breached passwords

---

### M-03: OTP Hashed with SHA-256 — Vulnerable to GPU Brute-Force

**File:** `apps/authentication/helpers.py:45-47`

```python
def _hash_otp(otp: str) -> str:
    """Hash an OTP using SHA-256 for secure storage."""
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()
```

**Issue:** SHA-256 is a fast hash. For a 6-character hex OTP (16M possibilities), a modern GPU can compute all possible hashes in **under 1 second**. If an attacker gains read access to the Redis cache, they can instantly recover all active OTPs.

**Remediation:**
- Use a slow hash like Argon2 or PBKDF2 for OTP storage
- Since OTPs are short-lived (15 min), even a fast hash is *acceptable* with proper cache isolation, but Argon2 is the gold standard

---

### M-04: Rate Limit Key Uses MD5 Hash of Auth Token

**File:** `common/rate_limit.py:91-93`

```python
import hashlib
token_hash = hashlib.md5(auth_header.encode()).hexdigest()[:12]
rate_key = f"rl:{rule_path}:user:{token_hash}"
```

**Issue:** MD5 is cryptographically broken, and the hash is truncated to 12 characters. While this is only used as a rate limit key (not for security), it means:
1. Two different users could collide in the same rate limit bucket
2. An attacker could craft tokens that hash to the same 12-char prefix as a victim

**Remediation:**
- Use SHA-256 (or even SHA-1) instead of MD5
- Don't truncate — use the full hash or at least 16+ characters

---

### M-05: `is_owner()` Check Not Atomic — TOCTOU Race Condition

**File:** `common/permissions.py:79-81`

```python
def is_owner(request: HttpRequest) -> bool:
    return hasattr(request, "user") and request.user.role == "OWNER"
```

**File:** `apps/authentication/api.py:199`

```python
if not is_owner(request):
    raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
```

**Issue:** The `is_owner()` function checks the role from the JWT token payload, which was set at token creation time. If a user's role is downgraded (e.g., from OWNER to STAFF), their existing JWT token still contains `role: "OWNER"` until it expires (60 minutes). This is a **privilege escalation window**.

**Remediation:**
- Fetch the user's current role from the database on each request (already done in `JWTAuth.authenticate` which loads the user from DB)
- Use `request.user.role` (fresh from DB) instead of the JWT payload role
- The current code in `permissions.py` line 26 loads the user from DB, so `request.user.role` is fresh — but `is_owner()` checks `request.user.role`, which *should* be the DB value. Verify this is consistent.

**Note:** Upon review, this is actually **partially mitigated** because `JWTAuth.authenticate()` loads the user from DB and sets `request.user`. However, the role in the JWT payload itself is not re-validated against the DB. If someone bypasses `JWTAuth` and reads the JWT directly, they'd see stale data.

---

### M-06: Phone Verification OTP Logged in Development Mode

**File:** `apps/authentication/api.py:292-297`

```python
if settings.DEBUG:
    logger.info(
        "📱 PHONE VERIFY OTP for %s: %s (DEV MODE — not sent via SMS)",
        payload.phone_number,
        otp,
    )
    return MessageOut(
        success=True,
        message=f"[DEV] Código: {otp} — "
        + get_message("AUTH_PHONE_OTP_SENT", phone=masked_phone),
    )
```

**Issue:** In development mode, the OTP is:
1. Logged to console (acceptable for dev)
2. **Returned in the API response** (dangerous — this is a security bypass)

If `DEBUG=True` is accidentally enabled in production, phone verification is completely bypassed — the OTP is returned directly to the client.

**Remediation:**
- Never return OTP in API responses, even in development
- Use environment variable `DEV_SMS_BYPASS=true` (separate from `DEBUG`)
- Add a startup warning if `DEBUG=True` and `ENVIRONMENT=production`

---

### M-07: Sentry `send_default_pii=False` But Logging May Leak PII

**File:** `loyallia/settings/base.py:242`

```python
sentry_sdk.init(
    dsn=SENTRY_DSN,
    integrations=[DjangoIntegration()],
    traces_sample_rate=config("SENTRY_TRACES_SAMPLE_RATE", default=0.1, cast=float),
    send_default_pii=False,
    environment=config("SENTRY_ENVIRONMENT", default="production"),
)
```

**Issue:** While `send_default_pii=False` is set, the logging configuration includes `apps` at `DEBUG` level. If any logging statement includes user emails, phone numbers, or tokens, these will appear in Sentry breadcrumbs.

**Remediation:**
- Set `apps` logger to `INFO` or `WARNING` in production
- Audit all `logger.debug()` calls for PII leakage
- Use Sentry's `before_send` hook to scrub PII

---

### M-08: `ForgotPassword` and `ResetPassword` Endpoints Missing `auth=None`

**File:** `apps/authentication/api.py:281-283`

```python
@router.post("/forgot-password/", response=MessageOut, summary="...")
def forgot_password(request, payload: ForgotPasswordIn):
```

**File:** `apps/authentication/api.py:318-320`

```python
@router.post("/reset-password/", response=MessageOut, summary="...")
def reset_password(request, payload: ResetPasswordIn):
```

**Issue:** These endpoints don't explicitly specify `auth=None`. Django Ninja's default behavior depends on the router's default auth. If the router has a default auth class, these endpoints may require authentication (breaking the flow) or may not (relying on implicit behavior).

**Remediation:**
- Add explicit `auth=None` to all unauthenticated endpoints
- Document the default auth behavior of the router

---

## 🔵 LOW Findings

### L-01: `lru_cache` on Vault Secrets Prevents Secret Rotation

**File:** `common/vault.py:42`

```python
@lru_cache(maxsize=1)
def _fetch_vault_secrets() -> dict:
```

**Issue:** Vault secrets are cached for the lifetime of the process. If secrets are rotated in Vault, the application continues using stale values until the process restarts (e.g., Gunicorn worker restart).

**Remediation:**
- Implement a TTL-based cache (e.g., re-fetch every 5 minutes)
- Provide a management command or signal to clear the cache
- The `clear_cache()` function exists but is never called automatically

---

### L-02: No CSRF Exemption Documentation for API Endpoints

**File:** `loyallia/settings/base.py:178`

```python
"django.middleware.csrf.CsrfViewMiddleware",
```

**Issue:** Django's CSRF middleware is active. Django Ninja uses `@csrf_exempt` by default for its views, but this is not explicitly documented. If a developer adds a Django view (not Ninja) that accepts POST requests, it may be vulnerable to CSRF.

**Remediation:**
- Document that all API endpoints are CSRF-exempt by design (JWT Bearer auth)
- Ensure non-API Django views (admin, etc.) properly enforce CSRF

---

### L-03: User Enumeration via Registration Endpoint

**File:** `apps/authentication/api.py:68-69`

```python
if User.objects.filter(email=payload.email).exists():
    raise HttpError(409, get_message("AUTH_INVALID_CREDENTIALS"))
```

**Issue:** The registration endpoint returns HTTP 409 (Conflict) when an email already exists, allowing attackers to enumerate registered email addresses.

**Remediation:**
- Return a generic message regardless of whether the email exists
- Consider always returning success but only sending verification email if the user is new

---

### L-04: Password Reset Token Not Invalidated After Use

**File:** `apps/authentication/api.py:333-349`

```python
def reset_password(request, payload: ResetPasswordIn):
    # ...
    if not default_token_generator.check_token(user, payload.token):
        raise HttpError(400, get_message("AUTH_RESET_INVALID"))
    user.set_password(payload.new_password)
    user.save(update_fields=["password", "updated_at"])
```

**Issue:** Django's `default_token_generator.check_token()` marks the token as used (by updating `last_login`), but if the password change fails (e.g., database error), the token remains valid. More importantly, there's no explicit invalidation of the token after successful use.

**Remediation:**
- This is mitigated by Django's built-in token invalidation (which uses `last_login` timestamp)
- Consider adding an explicit token blacklist for extra safety

---

### L-05: `AWS_S3_VERIFY = False` in Base Settings

**File:** `loyallia/settings/base.py:209`

```python
AWS_S3_VERIFY = False  # Set True in production with valid TLS
```

**Issue:** TLS verification is disabled for S3/MinIO connections. This allows MITM attacks on file storage operations.

**Remediation:**
- Set `AWS_S3_VERIFY = True` in production settings
- Add to `production.py` with a comment

---

## 📋 Dependency Security Analysis

**File:** `requirements.txt`

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| `django` | 5.0.6 | ⚠️ Check | LTS branch — verify latest patch |
| `Pillow` | 10.4.0 | ⚠️ Check | Frequently has CVEs — verify latest |
| `cryptography` | 43.0.0 | ⚠️ Check | High-frequency CVE updates |
| `PyJWT` | 2.8.0 | ✅ OK | Current stable |
| `celery` | 5.4.0 | ✅ OK | Current stable |
| `httpx` | 0.27.2 | ✅ OK | Current stable |
| `psycopg2-binary` | 2.9.9 | ✅ OK | Current stable |
| `gunicorn` | 22.0.0 | ✅ OK | Current stable |
| `firebase-admin` | 6.5.0 | ✅ OK | Current stable |
| `flower` | 2.0.1 | ⚠️ Note | No auth by default — must configure |

**Recommendations:**
1. Run `pip-audit` or `safety check` against the requirements
2. Pin dependencies with hashes (`pip install --require-hashes`)
3. Set up automated dependency scanning (GitHub Dependabot, Snyk)
4. **Flower** (Celery monitoring) has no authentication by default — ensure it's not publicly accessible

---

## 🏗️ Architecture-Level Recommendations

### 1. Implement Defense in Depth for Authentication
- Add IP-based account lockout (not just per-email)
- Implement login anomaly detection (new device, new location)
- Add CAPTCHA for unauthenticated endpoints after N failed attempts

### 2. Webhook Security Hardening
- Implement webhook event deduplication (idempotency keys)
- Add timestamp validation (reject events older than 5 minutes)
- Log all webhook events for audit trail

### 3. Secret Management
- Remove all hardcoded default credentials from `base.py`
- Implement automatic secret rotation for JWT keys
- Use Django's `check` framework to validate secrets at startup

### 4. Monitoring & Alerting
- Alert on rate limit violations (potential attack in progress)
- Alert on Redis unavailability (rate limiting disabled)
- Alert on unusual authentication patterns (many failed logins from same IP)

### 5. API Security Headers
- Implement Strict-Transport-Security in Nginx (not just Django)
- Add `X-Content-Type-Options: nosniff` to all responses
- Consider implementing API versioning deprecation headers

---

## ✅ What's Done Well

1. **Refresh token rotation** — Old tokens are revoked after use (B-002)
2. **Argon2 password hashing** — Best-in-class password storage
3. **Constant-time OTP comparison** — Uses `hmac.compare_digest`
4. **OTP attempt tracking** — Lockout after 5 failures
5. **Account lockout** — 5 failed logins → 15-minute lock
6. **Vault integration** — Production secrets via HashiCorp Vault
7. **Tenant isolation** — All queries filtered by `tenant` (via JWT + middleware)
8. **Generic error messages** — "Invalid credentials" (no user enumeration on login)
9. **Refresh token hashing** — SHA-256 before DB storage
10. **Separate JWT secret** — `JWT_SECRET_KEY` distinct from `SECRET_KEY` (when configured)

---

## Summary of Required Actions

| Priority | Action | Effort |
|----------|--------|--------|
| 🔴 P0 | Fix rate limiter fail-open behavior | 2h |
| 🔴 P0 | Increase OTP entropy to 8+ chars | 30m |
| 🔴 P0 | Add webhook replay protection | 2h |
| 🟠 P1 | Fix X-Forwarded-For spoofing | 1h |
| 🟠 P1 | Hash invitation tokens in DB | 1h |
| 🟠 P1 | Remove hardcoded DB credentials | 30m |
| 🟠 P1 | Switch JWT to RS256 | 4h |
| 🟡 P2 | Tighten CSP (remove unsafe-inline) | 2h |
| 🟡 P2 | Increase password minimum to 12 chars | 15m |
| 🟡 P2 | Use Argon2 for OTP hashing | 30m |
| 🟡 P2 | Fix DEBUG OTP leakage | 30m |
| 🔵 P3 | Run dependency audit | 1h |
| 🔵 P3 | Add Vault cache TTL | 30m |

---

*This audit covers the codebase as of the audit date. New vulnerabilities may be introduced by code changes. Regular re-audits are recommended.*
