# IMPLEMENTATION PLAN — Loyallia Production Readiness
**Document ID:** LYL-IMPL-2026-001  
**Version:** 1.0.0  
**Date:** 2026-04-29  
**Parent Audit:** LYL-AUDIT-FULL-2026-001  
**Parent SRS:** LOYALLIA-SRS-001, LOYALLIA-SRS-HARDENING-001  
**Standard:** ISO/IEC/IEEE 29148:2018  
**Status:** PENDING APPROVAL  

---

## DOCUMENT CONTROL

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-04-29 | Engineering Team | Initial implementation plan from audit findings |

---

## TABLE OF CONTENTS

1. Introduction
2. Execution Strategy
3. Phase 1 — Critical (P0) — Weeks 1-2
4. Phase 2 — High (P1) — Weeks 3-4
5. Phase 3 — Medium (P2) — Weeks 5-6
6. Phase 4 — Low (P3) — Weeks 7-9
7. Agent Execution Matrix
8. Resource Requirements
9. Risk Mitigation
10. Quality Gates
11. Rollback Procedures

---

## 1. INTRODUCTION

This implementation plan provides a structured, phased approach to remediating all 167+ findings from the comprehensive audit of the Loyallia platform (LYL-AUDIT-FULL-2026-001). Each phase is designed to be independently deployable and verifiable.

### 1.1 Guiding Principles
- **Safety first**: Backup before any change
- **Incremental delivery**: Each phase produces a deployable artifact
- **Test-driven**: Every fix must have a corresponding test
- **Zero downtime**: Changes must not require service interruption where possible
- **Rollback-ready**: Every change must have a documented rollback procedure

---

## 2. EXECUTION STRATEGY

### 2.1 Agent-Based Execution Model

Each phase can be executed by specialized agents working in parallel:

| Agent Role | Responsibilities | Skills Required |
|-----------|-----------------|----------------|
| Security Agent | Auth fixes, crypto, rate limiting, SSRF | Django security, OWASP |
| Backend Agent | Service layer, models, API fixes | Django, PostgreSQL |
| Frontend Agent | Component refactor, types, a11y | Next.js, TypeScript |
| DevOps Agent | Docker, CI/CD, monitoring | Docker, GitHub Actions |
| QA Agent | Test suite, verification | Playwright, pytest |
| DR Agent | Backup automation, HA | PostgreSQL, Redis, MinIO |

### 2.2 Dependency Graph

```
Phase 1 (P0) ──→ Phase 2 (P1) ──→ Phase 3 (P2) ──→ Phase 4 (P3)
   │                  │                  │                  │
   ├─ Security fixes  ├─ Service layer   ├─ SAST/DAST       ├─ Storybook
   ├─ Backup setup    ├─ Model refactor  ├─ Blue-green       ├─ Analytics
   ├─ Redis auth      ├─ Test suite      ├─ CSP hardening    ├─ PWA manifest
   └─ Vault prod      ├─ Monitoring      └─ Data retention   └─ Code splitting
                      └─ N+1 fixes
```

---

## 3. PHASE 1 — CRITICAL (P0) — WEEKS 1-2

**Goal:** Eliminate all security vulnerabilities that could lead to data loss, account takeover, or financial loss.

### Week 1: Security & Data Protection

#### Day 1-2: Backup Infrastructure
**Agent:** DR Agent  
**Effort:** 2 days

| Task | Command/Change | Verification |
|------|---------------|-------------|
| Enable WAL archiving | Add to docker-compose.yml postgres command: `-c wal_level=replica -c archive_mode=on -c archive_command='cp %p /var/lib/postgresql/data/wal_archive/%f'` | `SHOW wal_level;` returns `replica` |
| Create backup directory | `mkdir -p /var/lib/postgresql/data/wal_archive` | Directory exists |
| Deploy pg_dump script | Copy from AUDIT_6_BACKUP_DR.md, add to cron | `crontab -l` shows entry |
| Deploy pg_basebackup script | Copy from AUDIT_6_BACKUP_DR.md | Script executable |
| Deploy Redis backup script | Copy from AUDIT_6_BACKUP_DR.md | RDB files appearing |
| Deploy MinIO backup script | Copy from AUDIT_6_BACKUP_DR.md | Mirror directory populated |
| Deploy Vault backup script | Copy from AUDIT_6_BACKUP_DR.md | Snapshot files created |
| Verify backups | Run verification script | All checks pass |

**Rollback:** Remove WAL archiving config, remove cron entries.

#### Day 3: Redis Authentication
**Agent:** DevOps Agent  
**Effort:** 1 hour

| Task | Change | Verification |
|------|--------|-------------|
| Add Redis password | docker-compose.yml: `--requirepass ${REDIS_PASSWORD}` | `redis-cli -a $PASS ping` returns PONG |
| Update connection strings | All `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` | Services connect |
| Update .env.example | Add `REDIS_PASSWORD=CHANGE_ME` | Placeholder present |
| Test failover | Stop/start Redis, verify reconnection | Services recover |

**Rollback:** Remove `--requirepass` from Redis command.

#### Day 3: Vault Production Mode
**Agent:** DevOps Agent  
**Effort:** 1 day

| Task | Change | Verification |
|------|--------|-------------|
| Switch to production Vault | Replace dev config with production config | Vault requires seal/unseal |
| Enable audit logging | `vault audit enable file file_path=/var/log/vault/audit.log` | Audit log writing |
| Configure auto-unseal | AWS KMS or Shamir seal | Vault starts sealed |
| Seed secrets | Run vault-init with production config | Secrets accessible |
| Test secret rotation | Rotate a test secret | New value returned |

**Rollback:** Revert to dev mode (temporary, for emergency only).

#### Day 4: Rate Limiter Fix
**Agent:** Security Agent  
**Effort:** 4 hours

| Task | File | Change |
|------|------|--------|
| Fail closed for auth | `common/rate_limit.py` | Return 503 when Redis unavailable for `/api/v1/auth/` paths |
| Fix X-Forwarded-For | `common/rate_limit.py` | Use `REMOTE_ADDR`, trust `X-Forwarded-For` only from known proxies |
| Add tests | `tests/test_rate_limit.py` | Verify fail-closed behavior |

```python
# New fail-closed logic:
AUTH_PATHS = ['/api/v1/auth/login/', '/api/v1/auth/register/', '/api/v1/auth/refresh/']

def __call__(self, request):
    redis = self._get_redis()
    if redis is None:
        if any(request.path.startswith(p) for p in AUTH_PATHS):
            return JsonResponse({"error": "Service temporarily unavailable"}, status=503)
        return self.get_response(request)  # Non-auth: still fail open
```

**Rollback:** Revert to fail-open behavior.

#### Day 4: OTP Entropy Fix
**Agent:** Security Agent  
**Effort:** 1 hour

| Task | File | Change |
|------|------|--------|
| Increase OTP entropy | `apps/authentication/helpers.py` | `secrets.token_urlsafe(8)` instead of `secrets.token_hex(3)` |
| Update all OTP generation | `apps/authentication/api.py` | Consistent usage |
| Add test | `tests/test_otp.py` | Verify entropy ≥ 47 bits |

**Rollback:** Revert to `token_hex(3)`.

#### Day 5: SSRF Prevention
**Agent:** Security Agent  
**Effort:** 4 hours

| Task | File | Change |
|------|------|--------|
| Create URL validator | `common/url_validator.py` | Block private IPs, localhost, metadata endpoints |
| Apply to image fetcher | `apps/customers/pass_engine/apple_pass_builders.py` | Validate before fetch |
| Apply to all URL fields | `apps/cards/models.py`, `apps/notifications/models.py` | Validate on save |
| Add tests | `tests/test_url_validator.py` | Verify blocking |

```python
# common/url_validator.py
import ipaddress
from urllib.parse import urlparse

BLOCKED_NETWORKS = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('169.254.0.0/16'),
    ipaddress.ip_network('127.0.0.0/8'),
]

def validate_external_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ('https', 'http'):
        raise ValueError("URL must use http or https")
    # Resolve and check IP...
    return url
```

**Rollback:** Remove URL validation.

### Week 2: Business Logic Critical Fixes

#### Day 6-7: Coupon Race Condition Fix
**Agent:** Backend Agent  
**Effort:** 2 hours

| Task | File | Change |
|------|------|--------|
| Fix _process_coupon_transaction | `apps/customers/models.py` | Move check inside select_for_update block |
| Add concurrent test | `tests/test_coupon_race.py` | Verify no double-redemption |
| Verify other handlers | All _process_* methods | Ensure consistent locking |

```python
# Fixed implementation:
def _process_coupon_transaction(self) -> dict:
    from apps.transactions.models import TransactionType
    from django.db import transaction as db_transaction

    with db_transaction.atomic():
        locked = CustomerPass.objects.select_for_update().get(pk=self.pk)
        if locked.pass_data.get("coupon_used", False):
            return {"transaction_type": TransactionType.COUPON_REDEEMED, "pass_updated": False}
        locked.pass_data["coupon_used"] = True
        locked.save(update_fields=["pass_data", "last_updated"])

    self.refresh_from_db(fields=["pass_data", "last_updated"])
    reward_description = self.card.get_metadata_field("coupon_description", "Coupon redeemed")
    return {
        "transaction_type": TransactionType.COUPON_REDEEMED,
        "pass_updated": True,
        "reward_earned": True,
        "reward_description": reward_description,
    }
```

**Rollback:** Revert to original implementation.

#### Day 7-8: Plan Enforcement Application
**Agent:** Backend Agent  
**Effort:** 1 day

| Task | File | Change |
|------|------|--------|
| Apply to customers API | `apps/customers/api.py` | Add `@require_active_subscription`, `@enforce_limit("customers")` |
| Apply to cards API | `apps/cards/api.py` | Add `@require_active_subscription`, `@enforce_limit("programs")` |
| Apply to notifications API | `apps/notifications/api.py` | Add `@enforce_limit("notifications_month")` |
| Apply to locations API | `apps/tenants/api.py` | Add `@enforce_limit("locations")` |
| Add integration tests | `tests/test_plan_enforcement.py` | Verify limits enforced |

**Rollback:** Remove decorators.

#### Day 8-9: Enrollment Endpoint Fix
**Agent:** Backend Agent  
**Effort:** 4 hours

| Task | File | Change |
|------|------|--------|
| Add rate limiting | `apps/customers/api.py` | 10 per hour per IP |
| Prevent profile overwrite | `apps/customers/api.py` | Only create pass on existing email |
| Add tests | `tests/test_enrollment.py` | Verify behavior |

**Rollback:** Revert to original enrollment logic.

#### Day 9-10: Webhook Replay Protection
**Agent:** Backend Agent  
**Effort:** 4 hours

| Task | File | Change |
|------|------|--------|
| Add timestamp validation | `apps/billing/payment_api.py` | Reject if > 5 min old |
| Add idempotency store | `apps/billing/models.py` | `WebhookEvent` model with unique idempotency_key |
| Add signature verification | `apps/billing/payment_gateway.py` | Verify HMAC signature |
| Add tests | `tests/test_webhook.py` | Verify replay rejection |

#### Day 10: Pin Docker Images
**Agent:** DevOps Agent  
**Effort:** 1 hour

| Task | File | Change |
|------|------|--------|
| Pin postgres | `docker-compose.yml` | `postgres:16.2-alpine` |
| Pin redis | `docker-compose.yml` | `redis:7.2.4-alpine` |
| Pin minio | `docker-compose.yml` | `minio/minio:RELEASE.2024-03-05T04-48-36Z` |
| Pin vault | `docker-compose.yml` | `hashicorp/vault:1.15.6` |
| Pin pgbouncer | `docker-compose.yml` | `edoburu/pgbouncer:1.23.1` |

**Rollback:** Revert to `latest` tags.

### Phase 1 Quality Gate

- [ ] All automated backups running and verified
- [ ] WAL archiving enabled and PITR tested
- [ ] Redis requires authentication
- [ ] Vault running in production mode with audit logging
- [ ] Rate limiter fails closed for auth endpoints
- [ ] OTP entropy ≥ 47 bits
- [ ] SSRF protection on all URL fields
- [ ] Coupon race condition fixed and verified
- [ ] Plan enforcement applied to all endpoints
- [ ] Enrollment endpoint rate-limited and safe
- [ ] Webhook replay protection active
- [ ] All Docker images pinned
- [ ] All tests passing

---

## 4. PHASE 2 — HIGH (P1) — WEEKS 3-4

**Goal:** Establish proper architecture, fix performance issues, add monitoring.

### Week 3: Architecture Refactor

#### Day 11-13: Service Layer Extraction
**Agent:** Backend Agent  
**Effort:** 3 days

| Service | Endpoints Covered | Methods |
|---------|------------------|---------|
| TransactionService | scanner, enroll, process | scan_qr(), enroll_customer(), process_transaction() |
| BillingService | plans, subscription, usage | get_plans(), subscribe(), check_usage() |
| AutomationService | triggers, actions | fire_trigger(), evaluate_rules() |
| CustomerService | CRUD, import, segments | create(), update(), import_csv(), get_segments() |

**Files to create:**
- `apps/transactions/service.py`
- `apps/billing/service.py`
- `apps/automation/service.py`
- `apps/customers/service.py`

**Rollback:** Inline service methods back into API views.

#### Day 13-14: Database Indexes
**Agent:** Backend Agent  
**Effort:** 1 day

| Index | Table | Columns | Justification |
|-------|-------|---------|---------------|
| idx_card_tenant_active | loyallia_cards | (tenant_id, is_active) | Card listing queries |
| idx_notif_tenant_type | loyallia_notifications | (tenant_id, notification_type) | Campaign queries |
| idx_pass_card_active | loyallia_customer_passes | (card_id, is_active) | Scanner lookups |
| idx_txn_tenant_type_date | loyallia_transactions | (tenant_id, transaction_type, created_at) | Analytics queries |

**Rollback:** Drop indexes.

#### Day 14-15: N+1 Query Fixes
**Agent:** Backend Agent  
**Effort:** 1 day

| Endpoint | Fix | Expected Improvement |
|----------|-----|---------------------|
| agent_api/get_programs() | prefetch_related("enrollments", "passes") | 90% fewer queries |
| analytics/get_segmentation() | select_related("customer") | 80% fewer queries |
| cards/list() | Annotate with Count("passes") | 70% fewer queries |
| customers/list() | select_related("tenant") | 50% fewer queries |

**Verification:** Django Debug Toolbar query count before/after.

### Week 4: Testing & Monitoring

#### Day 16-19: Comprehensive Test Suite
**Agent:** QA Agent  
**Effort:** 4 days

| Test Category | Files | Target Coverage |
|--------------|-------|----------------|
| Unit tests — Models | test_models.py (each app) | 90% |
| Unit tests — Services | test_services.py (each app) | 90% |
| Integration tests — API | test_api.py (each app) | 80% |
| Race condition tests | test_concurrency.py | Critical paths |
| Plan enforcement tests | test_plan_enforcement.py | All limits |

**Target:** From ~15 tests to 500+ tests, 80% code coverage.

#### Day 19-20: Monitoring Stack
**Agent:** DevOps Agent  
**Effort:** 2 days

| Component | Purpose | Port |
|-----------|---------|------|
| Prometheus | Metrics collection | 33909 |
| Grafana | Dashboards | 33910 |
| Node Exporter | Host metrics | 33911 |
| Postgres Exporter | DB metrics | 33912 |
| Redis Exporter | Cache metrics | 33913 |

**Dashboards to create:**
- API response times (p50, p95, p99)
- Database connections and query times
- Redis memory and hit rate
- Celery task queue depth and success rate
- Error rates by endpoint

**Rollback:** Remove monitoring containers.

#### Day 20: Bind to 127.0.0.1
**Agent:** DevOps Agent  
**Effort:** 4 hours

| Service | Change |
|---------|--------|
| API | Bind to 127.0.0.1:33905 |
| Web | Bind to 127.0.0.1:33906 |
| Nginx | Add reverse proxy for both |

**Rollback:** Rebind to 0.0.0.0.

### Phase 2 Quality Gate

- [ ] Service layer extracted for all major domains
- [ ] All N+1 queries fixed
- [ ] Database indexes added for hot paths
- [ ] Test coverage ≥ 80%
- [ ] 500+ tests passing
- [ ] Monitoring stack operational
- [ ] API/web bound to 127.0.0.1
- [ ] All tests passing

---

## 5. PHASE 3 — MEDIUM (P2) — WEEKS 5-6

**Goal:** Compliance, security hardening, frontend improvements.

### Week 5: Security Hardening

| Task | Effort | Agent |
|------|--------|-------|
| Add SAST/DAST to CI | 1 day | DevOps |
| Implement CSP without unsafe-inline | 1 day | Frontend |
| Add CSRF protection | 4 hours | Backend |
| Implement data retention policies | 2 days | Backend |
| Add backup encryption | 4 hours | DevOps |
| Implement secret rotation | 1 day | DevOps |
| Add container network segmentation | 4 hours | DevOps |

### Week 6: Frontend Improvements

| Task | Effort | Agent |
|------|--------|-------|
| Add shared TypeScript types | 2 days | Frontend |
| Integrate react-hook-form + zod | 2 days | Frontend |
| Add error boundaries | 1 day | Frontend |
| Break up mega-components | 2 days | Frontend |

### Phase 3 Quality Gate

- [ ] SAST passing in CI
- [ ] CSP without unsafe-inline
- [ ] Data retention policies documented and enforced
- [ ] Shared types eliminate all duplicates
- [ ] All mega-components decomposed

---

## 6. PHASE 4 — LOW (P3) — WEEKS 7-9

**Goal:** Developer experience, documentation, optimization.

| Task | Effort | Agent |
|------|--------|-------|
| Add Storybook for components | 1 week | Frontend |
| Implement code splitting | 2 days | Frontend |
| Add PWA manifest for scanner | 1 day | Frontend |
| Add analytics event tracking | 2 days | Frontend |
| Implement blue-green deployment | 1 week | DevOps |
| Add container resource monitoring | 1 day | DevOps |
| Complete i18n coverage | 2 days | Frontend |
| Add JSDoc documentation | 2 days | Backend |
| Optimize Docker layers | 1 day | DevOps |

---

## 7. AGENT EXECUTION MATRIX

| Phase | Security | Backend | Frontend | DevOps | QA | DR |
|-------|----------|---------|----------|--------|-----|-----|
| P0 W1 | Rate limiter, OTP, SSRF | — | — | Redis, Vault, Images | — | Backups |
| P0 W2 | — | Coupon, Plan, Enrollment, Webhook | — | Pin images | — | — |
| P1 W3 | — | Service layer, Indexes, N+1 | — | — | — | — |
| P1 W4 | — | — | — | Monitoring, Bind | Tests | — |
| P2 W5 | SAST/DAST | CSRF, Retention | CSP | Encryption, Rotation | — | — |
| P2 W6 | — | — | Types, Forms, Components | — | — | — |
| P3 W7-9 | — | Docs | Storybook, PWA, i18n | Blue-green, Monitoring | — | — |

---

## 8. RESOURCE REQUIREMENTS

### 8.1 Team Composition

| Role | Headcount | Duration |
|------|-----------|----------|
| Senior Backend Developer | 1 | 9 weeks |
| Mid Backend Developer | 1 | 6 weeks |
| Frontend Developer | 1 | 6 weeks |
| DevOps Engineer | 1 | 4 weeks |
| QA Engineer | 1 | 3 weeks |
| **Total** | **2-5 FTE** | **~9 weeks** |

### 8.2 Infrastructure

| Resource | Purpose | Cost Estimate |
|----------|---------|---------------|
| Production server | 4 vCPU, 16GB RAM, 500GB SSD | ~$80/month |
| Backup storage | S3-compatible, 100GB | ~$5/month |
| Monitoring server | 2 vCPU, 4GB RAM | ~$20/month |
| Domain + SSL | rewards.loyallia.com | ~$15/year |
| **Total** | | **~$105/month** |

---

## 9. RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Service layer refactor breaks API | Medium | High | Feature flags, gradual rollout |
| Backup automation fails silently | Low | Critical | Monitoring + alerting on backup failures |
| Test suite takes too long | Medium | Medium | Parallel test execution, selective runs |
| Monitoring adds overhead | Low | Low | Lightweight exporters, sampling |
| Migration conflicts | Medium | Medium | Test migrations on staging first |

---

## 10. QUALITY GATES

### Phase Transition Criteria

Each phase must meet ALL criteria before proceeding:

| Criterion | P0 | P1 | P2 | P3 |
|-----------|-----|-----|-----|-----|
| All tests passing | ✅ | ✅ | ✅ | ✅ |
| No CRITICAL findings open | ✅ | ✅ | ✅ | ✅ |
| No HIGH findings open | — | ✅ | ✅ | ✅ |
| Code coverage ≥ 80% | — | ✅ | ✅ | ✅ |
| Security scan clean | — | — | ✅ | ✅ |
| Performance benchmarks met | — | — | — | ✅ |

---

## 11. ROLLBACK PROCEDURES

### 11.1 Database Rollback
```bash
# Restore from pg_dump
pg_dump -h localhost -U loyallia loyallia > backup_pre_phase.sql
# If rollback needed:
psql -h localhost -U loyallia loyallia < backup_pre_phase.sql
```

### 11.2 Application Rollback
```bash
# Git revert
git log --oneline -10  # Find commit before phase
git revert <commit-hash>
docker compose up -d --build
```

### 11.3 Infrastructure Rollback
```bash
# Revert docker-compose changes
git checkout HEAD~1 -- docker-compose.yml
docker compose down
docker compose up -d
```

---

**END OF DOCUMENT**

**Document ID:** LYL-IMPL-2026-001  
**Status:** PENDING APPROVAL
