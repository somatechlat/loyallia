# 🔥 LOYALLIA — MASTER PRODUCTION AUDIT REPORT

**Date:** 2026-04-29  
**Codebase:** https://github.com/somatechlat/loyallia  
**Stack:** Django 5 + Django Ninja (Backend) | Next.js 14 (Frontend) | PostgreSQL 16 | Redis 7 | MinIO | HashiCorp Vault  
**Total Code:** ~53,000 lines across 307 files  
**Methodology:** 6 specialized agents performing line-by-line analysis of every source file  

---

## EXECUTIVE SUMMARY

Loyallia is a multi-tenant SaaS loyalty platform targeting Ecuadorian businesses. The codebase demonstrates **competent security awareness** (JWT rotation, Argon2, rate limiting, Vault integration) but suffers from **systemic architectural debt** that makes it **NOT production-ready** in its current state.

### Total Findings: 167 issues across 6 domains

| Domain | 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🔵 LOW | TOTAL |
|--------|-------------|---------|-----------|--------|-------|
| 1. Security | 3 | 7 | 8 | 5 | **23** |
| 2. Backend Architecture | 4 | 12 | 18 | 9 | **43** |
| 3. API & Business Logic | 4 | 12 | 9 | 1 | **26** |
| 4. Frontend | 2 | 14 | 18 | 10 | **44** |
| 5. Infrastructure | 4 | 12 | 14 | 6 | **36** |
| 6. Backup & DR | 7 | — | — | — | **7+** |
| **TOTAL** | **24** | **57** | **67** | **31** | **167+** |

### Verdict: 🔴 NOT PRODUCTION-READY

The system has **24 critical issues** that must be resolved before any production deployment. The most dangerous are:

1. **Zero automated backups** — all data is one disk failure away from permanent loss
2. **Plan enforcement is dead code** — tenants can exceed all limits freely
3. **Coupon double-spending race condition** — financial loss under concurrent scans
4. **Rate limiter fails open** — when Redis goes down, all rate limiting silently disappears
5. **Vault in dev mode with hardcoded token** — all secrets accessible without authentication
6. **Redis has no authentication** — any container on the network can inject malicious Celery tasks

---

## 🔴 TOP 10 CRITICAL ISSUES (Must Fix Before Production)

### 1. Zero Automated Backups — All Data One Disk Failure Away
**Domain:** Backup & DR | **File:** docker-compose.yml

All 7 Docker volumes use `driver: local` with zero backup automation. WAL archiving is not configured on PostgreSQL, making point-in-time recovery impossible. The existing `docs/BACKUP_DISASTER_RECOVERY.md` is well-written but **none of it is actually implemented**.

**Fix:** Implement the backup scripts provided in `AUDIT_6_BACKUP_DR.md`. Enable WAL archiving. Set up daily pg_dump + weekly pg_basebackup.

---

### 2. Plan Enforcement Decorators Exist But Are Never Applied
**Domain:** API & Business Logic | **File:** common/plan_enforcement.py

```python
# These decorators exist:
@require_active_subscription
@enforce_limit("customers")
@require_feature("ai_assistant")

# But NOT A SINGLE ENDPOINT uses them.
```

Every tenant can create unlimited customers, programs, locations, and send unlimited notifications regardless of their subscription plan. The entire billing/plan system is decorative.

**Fix:** Apply `@require_active_subscription` and `@enforce_limit(resource)` to all relevant endpoints in customers/api.py, cards/api.py, notifications/api.py, etc.

---

### 3. Coupon Double-Redemption Race Condition
**Domain:** API & Business Logic | **File:** apps/customers/models.py:238-251

```python
def _process_coupon_transaction(self) -> dict:
    if not self.coupon_used:  # ← Check happens OUTSIDE the lock
        self.set_pass_field("coupon_used", True)  # ← Lock acquired inside here
```

Two concurrent scans both see `coupon_used == False` before either acquires the lock. Both proceed to redeem. Financial loss for the merchant.

**Fix:** Move the check inside a `select_for_update` block (like all other card type handlers already do).

---

### 4. Rate Limiter Fails Open — Redis Down = No Rate Limiting
**Domain:** Security | **File:** common/rate_limit.py:68-72

```python
if self._redis_available is False:
    return None  # ← Returns None = no rate limiting
# ...
if redis is None:
    return self.get_response(request)  # ← FAILS OPEN
```

When Redis is unavailable, the rate limiter silently disables itself. For auth endpoints, this means unlimited login attempts, unlimited password reset requests, unlimited OTP generation.

**Fix:** Fail closed for auth endpoints. Return 503 for rate-limited endpoints when Redis is down.

---

### 5. Redis Has Zero Authentication
**Domain:** Infrastructure | **File:** docker-compose.yml:117-135

Redis runs with no password. Any container on `loyallia-net` can connect and read/write Celery task queues, inject malicious tasks, or exfiltrate cached data.

**Fix:** Add `--requirepass ${REDIS_PASSWORD}` to Redis command. Update all `REDIS_URL` and `CELERY_BROKER_URL` references.

---

### 6. Vault Running in Dev Mode with Hardcoded Root Token
**Domain:** Infrastructure | **File:** docker-compose.yml:280-300

```yaml
VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_TOKEN:-loyallia-vault-root-token}
```

Vault dev mode = no seal/unseal, no audit logging, in-memory storage, all secrets accessible with a known token.

**Fix:** Switch to production Vault mode with proper seal/unseal, audit logging, and persistent storage.

---

### 7. OTP Brute-Force Risk — Only 16M Possibilities
**Domain:** Security | **File:** apps/authentication/api.py:97

```python
otp = secrets.token_hex(3).upper()  # 6 hex chars = 16,777,216 possibilities
```

Combined with rate limiter fail-open behavior, this becomes exploitable.

**Fix:** Use `secrets.token_urlsafe(8)` for 8+ alphanumeric characters (~281 trillion possibilities).

---

### 8. Public Enrollment Endpoint Can Overwrite Customer Profiles
**Domain:** API & Business Logic | **File:** apps/customers/api.py

The enrollment endpoint is unauthenticated, has no rate limit, and can overwrite existing customer profile data (name, email, phone) when enrolling with an existing email.

**Fix:** Add rate limiting. On existing email, only create the pass — don't overwrite profile fields.

---

### 9. X-Forwarded-For Spoofing Bypasses Rate Limits
**Domain:** Security | **File:** common/rate_limit.py

Rate limit keys use `X-Forwarded-For` header which is trivially spoofable. Attackers can generate unlimited IPs to bypass per-IP rate limits.

**Fix:** Use `REMOTE_ADDR` for rate limiting. Only trust `X-Forwarded-For` from known reverse proxy IPs.

---

### 10. SSRF Risk in Apple Pass Image Fetcher
**Domain:** Backend Architecture | **File:** apps/customers/pass_engine/apple_pass_builders.py

The pass builder fetches external images (logo, strip, icon) from user-supplied URLs without validating the target. An attacker could supply `http://169.254.169.254/latest/meta-data/` to access cloud metadata endpoints.

**Fix:** Validate URLs against a blocklist of internal/private IP ranges. Use a URL allowlist for image sources.

---

## 📊 DETAILED REPORTS BY DOMAIN

Each domain has a comprehensive report with file:line references, code snippets, and remediation:

| # | Report | Lines | File |
|---|--------|-------|------|
| 1 | Security Audit | 695 | `AUDIT_1_SECURITY.md` |
| 2 | Backend Architecture | 777 | `AUDIT_2_BACKEND_ARCHITECTURE.md` |
| 3 | API & Business Logic | 635 | `AUDIT_3_API_LOGIC.md` |
| 4 | Frontend Architecture | 1,309 | `AUDIT_4_FRONTEND.md` |
| 5 | Infrastructure & DevOps | 1,116 | `AUDIT_5_INFRASTRUCTURE.md` |
| 6 | Backup & Disaster Recovery | 1,009 | `AUDIT_6_BACKUP_DR.md` |
| | **TOTAL** | **5,541** | |

---

## 🏗️ ARCHITECTURAL FLAWS SUMMARY

### 1. No Service Layer — Business Logic in Views
Every API file (authentication, customers, cards, transactions, billing, notifications) has 200+ line view functions with business logic mixed in. There's no service layer — validation, business rules, database operations, and response formatting are all interleaved in the same function.

**Impact:** Untestable, duplicated logic, hard to refactor.

### 2. JSONField Overuse — Business Data in Untyped Blobs
Critical data like `stamp_count`, `cashback_balance`, `gift_balance`, `stamps_required`, `cashback_percentage` are stored in JSON fields instead of typed columns. No database-level validation, no indexing, no constraints.

**Impact:** Cannot query efficiently, cannot enforce data integrity at DB level.

### 3. Massive Code Duplication
- Update-field pattern: copy-pasted 7 times across models
- Role-check logic: duplicated 20+ times across API endpoints
- `MessageOut` schema: defined 5 separate times
- Token refresh logic: implemented independently in both `auth.tsx` and `api.ts`
- Modal patterns: 5+ inline implementations instead of using existing `ConfirmModal`

### 4. Duplicate Plan State
`Tenant.plan` and `Subscription.plan` both track plan status independently. No synchronization mechanism. They can diverge, causing inconsistent enforcement.

### 5. ~15 Tests for the Entire Backend
The backend has approximately 15 unit tests for a codebase with 43+ API endpoints, 10 card types, complex transaction processing, and multi-tenant isolation. Dangerously low coverage.

### 6. Frontend Mega-Components
- Dashboard page: 400+ lines, 14 `useState` hooks
- Locations page: 500+ lines
- TypeConfig: 480+ lines with 8 config sub-components in one file

### 7. Installed Libraries Not Used
`react-hook-form`, `zod`, `swr`, `date-fns`, `clsx` are in `package.json` but never imported. All forms use manual `useState`, all data fetching uses `Promise.all` in `useEffect`.

---

## 🛡️ WHAT'S ACTUALLY GOOD

Credit where it's due — the codebase has several production-grade patterns:

- ✅ JWT refresh token rotation (one-time use)
- ✅ Argon2 password hashing (most secure algorithm)
- ✅ Account lockout after 5 failed logins
- ✅ Tenant isolation enforced at query level
- ✅ PgBouncer connection pooling with correct `conn_max_age=0`
- ✅ Multi-stage Dockerfiles with non-root users
- ✅ Container resource limits
- ✅ PostgreSQL tuning (shared_buffers, work_mem, etc.)
- ✅ Celery task routing with max-tasks-per-child
- ✅ Graceful shutdown on all containers
- ✅ Trivy security scanning in CI
- ✅ i18n support (ES/EN/FR/DE)
- ✅ Structured JSON logging
- ✅ Request ID tracing middleware

---

## 🚀 PRODUCTION READINESS CHECKLIST

### P0 — Must Fix (Blocking)

| # | Issue | Domain | Effort |
|---|-------|--------|--------|
| 1 | Implement automated backups (PostgreSQL, Redis, MinIO, Vault) | DR | 2 days |
| 2 | Enable PostgreSQL WAL archiving | DR | 2 hours |
| 3 | Apply plan enforcement decorators to all endpoints | API | 1 day |
| 4 | Fix coupon double-redemption race condition | API | 2 hours |
| 5 | Fix rate limiter fail-open → fail closed for auth | Security | 4 hours |
| 6 | Add Redis authentication | Infra | 1 hour |
| 7 | Switch Vault to production mode | Infra | 1 day |
| 8 | Increase OTP entropy to 8+ alphanumeric | Security | 1 hour |
| 9 | Fix enrollment endpoint (rate limit + no overwrite) | API | 4 hours |
| 10 | Fix X-Forwarded-For spoofing | Security | 2 hours |
| 11 | Fix SSRF in image fetcher | Security | 4 hours |
| 12 | Pin all Docker image versions | Infra | 1 hour |

### P1 — Should Fix (High Priority)

| # | Issue | Domain | Effort |
|---|-------|--------|--------|
| 13 | Extract service layer from API views | Architecture | 1 week |
| 14 | Replace JSONField with typed columns for business data | Architecture | 1 week |
| 15 | Deduplicate MessageOut, role checks, update patterns | Architecture | 2 days |
| 16 | Add database indexes for hot-path queries | Architecture | 1 day |
| 17 | Fix N+1 queries (select_related/prefetch_related) | Architecture | 1 day |
| 18 | Add comprehensive test suite (target: 80% coverage) | Testing | 2 weeks |
| 19 | Consolidate token refresh logic (single TokenManager) | Frontend | 1 day |
| 20 | Break up mega-components (dashboard, locations, TypeConfig) | Frontend | 1 week |
| 21 | Add monitoring stack (Prometheus + Grafana + Loki) | Infra | 2 days |
| 22 | Bind API/web to 127.0.0.1, front with Nginx | Infra | 4 hours |
| 23 | Implement database replication (primary/replica) | Infra | 1 day |
| 24 | Add webhook replay protection (timestamp + idempotency) | Security | 4 hours |
| 25 | Hash invitation tokens in DB, add expiry | Security | 2 hours |

### P2 — Nice to Have

| # | Issue | Domain | Effort |
|---|-------|--------|--------|
| 26 | Add shared TypeScript types (eliminate 15+ duplicates) | Frontend | 2 days |
| 27 | Use installed libraries (react-hook-form, zod, swr) | Frontend | 1 week |
| 28 | Add CSRF protection for non-API routes | Security | 4 hours |
| 29 | Implement blue-green deployment | Infra | 1 week |
| 30 | Add SAST/DAST to CI pipeline | Security | 1 day |
| 31 | Implement data retention policies | Compliance | 2 days |
| 32 | Add backup encryption | DR | 4 hours |
| 33 | Implement secret rotation procedures | Infra | 1 day |
| 34 | Add container network segmentation | Infra | 4 hours |
| 35 | Implement CSP without unsafe-inline | Security | 1 day |

---

## 📋 ESTIMATED REMEDIATION EFFORT

| Priority | Issues | Effort |
|----------|--------|--------|
| P0 (Blocking) | 12 | ~2 weeks |
| P1 (High) | 13 | ~4 weeks |
| P2 (Nice to have) | 10 | ~3 weeks |
| **Total** | **35** | **~9 weeks** |

---

## 📁 REPORT FILES

All detailed findings with exact file:line references, code snippets, and remediation code:

```
loyallia/
├── AUDIT_1_SECURITY.md          (695 lines — 23 findings)
├── AUDIT_2_BACKEND_ARCHITECTURE.md (777 lines — 43 findings)
├── AUDIT_3_API_LOGIC.md         (635 lines — 26 findings)
├── AUDIT_4_FRONTEND.md          (1,309 lines — 44 findings)
├── AUDIT_5_INFRASTRUCTURE.md    (1,116 lines — 36 findings)
├── AUDIT_6_BACKUP_DR.md         (1,009 lines — backup procedures + scripts)
└── MASTER_AUDIT_REPORT.md       (this file)
```

**Total audit documentation: 5,541+ lines**

---

*Generated by 6 specialized audit agents performing line-by-line analysis of the entire Loyallia codebase.*
