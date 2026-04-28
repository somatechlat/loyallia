# 🚀 Loyallia — MIMO Corrections Project Plan

**Date:** 2026-04-29  
**Branch:** `MIMO-corrections`  
**Base:** All 6 audit branches merged into `main`  
**Scope:** Bug fixes, security hardening, architecture improvements

---

## 📊 Current State Assessment

| Category | Score | Notes |
|----------|-------|-------|
| **Architecture** | 8/10 | Clean Django Ninja + Celery + PgBouncer. Good separation. |
| **Security** | 6/10 | Critical secrets exposed, but audit branches fixed most. |
| **Code Quality** | 7/10 | Well-structured, several bugs remain (see below). |
| **Testing** | 6/10 | Good E2E suite (16 specs), no unit tests visible. |
| **Production Readiness** | 5/10 | Needs secrets rotation, HTTPS, bug fixes, monitoring. |
| **Scalability** | 7/10 | PgBouncer, Celery queues, Redis caching — good foundation. |
| **Compliance** | 7/10 | Audit trail, LOPDP awareness — needs immutability enforcement. |

---

## 🐛 BUGS TO FIX (Runtime Crashes & Data Corruption)

### BUG-001: `NameError` in Analytics Segmentation Endpoint
**File:** `backend/apps/analytics/api.py:397-404`  
**Status:** 🔴 CRASH BUG  
**Issue:** `customers` variable is undefined in `get_segmentation_analytics()`. The function queries `CustomerAnalytics` but references `customers.count()` which doesn't exist.  
**Fix:** Use `total_customers` (already computed above) instead of `customers.count()`.

### BUG-002: Notification Endpoints Crash for Business Users
**File:** `backend/apps/notifications/api.py:48-58`  
**Status:** 🔴 CRASH BUG  
**Issue:** `register_device`, `list_devices`, `mark_notification_read`, `mark_notification_clicked`, `delete_notification` all access `request.user.customer` which doesn't exist for OWNER/MANAGER/STAFF users.  
**Fix:** Add `_get_customer_or_403()` guard (already done for some endpoints, needs consistency).

### BUG-003: Race Condition in Discount Transaction
**File:** `backend/apps/customers/models.py:_process_discount_transaction`  
**Status:** 🟠 DATA CORRUPTION  
**Issue:** Two concurrent scans can both read `total_spent=100`, both compute `100+50=150`, and both write `150` — losing one scan's `50`.  
**Fix:** ✅ Already fixed in merged code — uses `select_for_update()` inside atomic block.

### BUG-004: N+1 Queries in Analytics
**File:** `backend/apps/analytics/api.py`  
**Status:** 🟡 PERFORMANCE  
**Issue:** Multiple endpoints loop over objects without `select_related`/`prefetch_related`.  
**Fix:** Add `select_related("customer")` to `CustomerAnalytics` queries.

### BUG-005: N+1 in Agent API Programs Endpoint
**File:** `backend/apps/agent_api/api.py:get_programs`  
**Status:** 🟡 PERFORMANCE  
**Issue:** Loops over cards with `card.enrollments.count()` and `card.passes.filter()` inside a for-loop.  
**Fix:** Use `annotate()` with `Count()`.

---

## 🔒 SECURITY FIXES (Pre-Production)

### SEC-001: Separate JWT_SECRET_KEY from SECRET_KEY
**File:** `backend/loyallia/settings/base.py:189`  
**Issue:** `JWT_SECRET_KEY = config("SECRET_KEY")` — uses the same key for JWT and Django crypto.  
**Fix:** Add separate `JWT_SECRET_KEY` env var, store in Vault.

### SEC-002: Hash OTPs Before Storing in Redis
**File:** `backend/apps/authentication/helpers.py`  
**Issue:** OTPs stored as plaintext in Redis.  
**Fix:** ✅ Already fixed — uses `SHA-256` hashing + `hmac.compare_digest()`.

### SEC-003: Add Refresh Token Rotation
**File:** `backend/apps/authentication/api.py:refresh_token`  
**Issue:** Refresh tokens don't rotate on use — stolen tokens work indefinitely.  
**Fix:** Issue new refresh token on each refresh, revoke old one.

### SEC-004: Rate Limit Password Reset Specifically
**File:** `backend/apps/authentication/api.py`  
**Issue:** Password reset only limited by general auth rule (20 req/min).  
**Fix:** Add specific rate limit: 3 requests per hour per IP.

### SEC-005: SSRF Protection in Image Fetching
**File:** `backend/apps/customers/pass_engine/apple_pass.py`  
**Issue:** ✅ Already fixed — validates HTTPS-only, blocks private IPs, limits redirects and size.

### SEC-006: Add Security Headers
**File:** `backend/loyallia/settings/base.py`  
**Issue:** Missing `Content-Security-Policy`, `Permissions-Policy`, `Referrer-Policy`.  
**Fix:** Add middleware or settings for CSP, Permissions-Policy, Referrer-Policy.

### SEC-007: Enforce HTTPS in Production Nginx
**File:** `deploy/rewards.loyallia.com.conf`  
**Issue:** Nginx listens on port 80 only. No TLS.  
**Fix:** Add TLS termination with Let's Encrypt, redirect HTTP→HTTPS, add HSTS.

### SEC-008: Don't Return Temp Password in API Response
**File:** `backend/apps/tenants/api.py:add_team_member`  
**Issue:** Temp password returned in JSON response (logged in access logs).  
**Fix:** Only send via email, not in response.

### SEC-009: Add CSV Injection Protection
**File:** `backend/apps/customers/api.py:export_customers`  
**Issue:** ✅ Already fixed — `_sanitize_csv_cell()` escapes dangerous prefixes.

### SEC-010: Validate Metadata Size on Card Creation
**File:** `backend/apps/cards/api.py:CardCreateIn`  
**Issue:** `metadata: dict | None = {}` accepts unlimited JSON.  
**Fix:** Add size validation in Pydantic schema (max 10KB).

---

## 🏗️ ARCHITECTURE IMPROVEMENTS

### ARCH-001: Add Health Check Differentiation
**File:** `backend/apps/api/router.py`  
**Issue:** Only liveness probe exists. No readiness probe checking dependencies.  
**Fix:** ✅ Already fixed — `/health/ready/` checks PostgreSQL and Redis.

### ARCH-002: Add Request ID Middleware
**Issue:** No request tracing across services.  
**Fix:** Add middleware generating `X-Request-ID`, pass through all services.

### ARCH-003: Add Graceful Shutdown
**File:** `docker-compose.yml`  
**Issue:** Containers don't handle SIGTERM for in-flight requests.  
**Fix:** Add `stop_grace_period: 30s` and configure Gunicorn graceful shutdown.

### ARCH-004: Add Sentry/APM Integration
**Issue:** No error tracking or performance monitoring.  
**Fix:** Add `sentry-sdk` to requirements, configure DSN in settings.

### ARCH-005: Upgrade Next.js to 15.x
**File:** `frontend/package.json`  
**Issue:** Using Next.js 14.2.21 — should upgrade for security patches.  
**Fix:** Upgrade to Next.js 15.x with proper migration.

### ARCH-006: Add CORS_PREFLIGHT_MAX_AGE
**File:** `backend/loyallia/settings/base.py`  
**Issue:** ✅ Already fixed — `CORS_PREFLIGHT_MAX_AGE = 86400` set.

---

## 📋 IMPLEMENTATION PHASES

### Phase 1: Critical Bug Fixes (Week 1)
- [ ] BUG-001: Fix analytics segmentation crash
- [ ] BUG-002: Fix notification endpoints for business users
- [ ] BUG-004: Fix N+1 queries in analytics
- [ ] BUG-005: Fix N+1 in agent API

### Phase 2: Security Hardening (Week 1-2)
- [ ] SEC-001: Separate JWT_SECRET_KEY
- [ ] SEC-003: Implement refresh token rotation
- [ ] SEC-004: Rate limit password reset
- [ ] SEC-006: Add security headers
- [ ] SEC-008: Remove temp password from API response
- [ ] SEC-010: Validate metadata size

### Phase 3: Infrastructure (Week 2-3)
- [ ] SEC-007: HTTPS on Nginx
- [ ] ARCH-002: Request ID middleware
- [ ] ARCH-003: Graceful shutdown
- [ ] ARCH-004: Sentry integration

### Phase 4: Production Readiness (Week 3-4)
- [ ] Rotate ALL exposed secrets
- [ ] Delete `backend/auth.json` from git history
- [ ] Switch Vault to production mode
- [ ] Set `DEBUG=False` as default
- [ ] Set `ALLOWED_HOSTS` to specific domains
- [ ] Add database backup automation
- [ ] Remove seed scripts from production image

---

## 📁 FILES TO MODIFY

### Backend
```
backend/apps/analytics/api.py              — BUG-001, BUG-004
backend/apps/notifications/api.py          — BUG-002
backend/apps/agent_api/api.py              — BUG-005
backend/apps/authentication/api.py         — SEC-003, SEC-004
backend/apps/authentication/helpers.py     — (already fixed)
backend/apps/tenants/api.py                — SEC-008
backend/apps/cards/api.py                  — SEC-010
backend/loyallia/settings/base.py          — SEC-001, SEC-006
backend/loyallia/settings/production.py    — SEC-001
backend/common/middleware.py               — ARCH-002 (new file)
deploy/rewards.loyallia.com.conf           — SEC-007
docker-compose.yml                         — ARCH-003
```

### Frontend
```
frontend/package.json                      — ARCH-005 (Next.js upgrade)
frontend/src/lib/api.ts                    — (review for improvements)
frontend/src/lib/auth.tsx                  — (review for improvements)
```

---

## ✅ ALREADY FIXED (In Merged Branches)

1. ✅ Test credentials removed from repo
2. ✅ Hardcoded API key moved to env var
3. ✅ OTP hashing with SHA-256
4. ✅ Constant-time OTP comparison
5. ✅ SSRF protection in image fetching
6. ✅ CSV injection protection
7. ✅ Health check readiness probe
8. ✅ CORS preflight max age
9. ✅ Race condition in discount transactions
10. ✅ 5MB file upload limit
11. ✅ Expired token cleanup task
12. ✅ Chat input sanitization

---

*Plan created from full codebase analysis of 267 files across backend (Django 5 + Django Ninja) and frontend (Next.js 14 + TypeScript).*
