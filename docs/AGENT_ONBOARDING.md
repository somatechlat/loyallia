# Loyallia — Agent Onboarding Guide

> **Single source of truth for any coding agent joining this project.**
> Updated: 2026-05-06
> Status: Verify locally before claiming readiness

---

## 1. Project Status at a Glance

| System | Status | Notes |
|--------|--------|-------|
| Backend API | 🟢 Healthy | Django 5 + Ninja, all endpoints operational |
| Frontend | 🟢 Healthy | Next.js 14, SuperAdmin UI functional |
| PostgreSQL | 🟢 Healthy | Primary + replica, migration 0007 applied |
| Redis | 🟢 Healthy | Cache + Celery broker |
| Vault | Verify locally | KV v2; do not print secret values |
| Google Wallet | Verify locally | Service account and issuer live in Vault/local ignored files |
| Apple Wallet | Verify locally | Certificates and private keys live in Vault/local ignored files |
| Google OAuth | Verify locally | Client ID/secret live in Vault/local ignored files |
| Mailjet Email | Verify locally | Mailjet credentials live in Vault |
| Nginx | 🟢 Healthy | Reverse proxy active |

**Test Credentials:** use `PLAYWRIGHT_*` environment variables or a local operator-provided seed password. Do not document passwords in Git.

---

## 2. Architecture Quick Reference

### Stack
| Layer | Technology | Port |
|-------|-----------|------|
| API | Django 5 + Django Ninja | 33905 |
| Frontend | Next.js 14 + React + Tailwind | 33906 |
| Database | PostgreSQL 16 | 33900 |
| Pooler | PgBouncer | 33901 |
| Cache/Queue | Redis 7 | 33902 |
| Storage | MinIO S3 | 33903/33904 |
| Secrets | HashiCorp Vault KV v2 | 33908 |
| Proxy | Nginx | 80 |
| Workers | Celery (default, push_delivery, pass_generation) | — |
| Monitor | Flower | 33907 |
| Metrics | Prometheus + Grafana | 33909/33910 |

### Key Directories
```
backend/           Django project
  apps/            All Django apps
    tenants/       Multi-tenant logic, SuperAdmin API
    authentication/  JWT auth, OAuth
    customers/     Wallet pass engine (apple_pass.py, google_pass.py)
    billing/       Subscription plans, rate limits
    agent_api/     Enterprise AI API, call logging
  common/          Shared utils (vault.py, plan_enforcement.py, messages.py)
  loyallia/        Settings (base.py, development.py, production.py)
frontend/          Next.js 14 app
  src/app/(dashboard)/superadmin/  SuperAdmin pages
  src/components/superadmin/       SuperAdmin components
  src/lib/api.ts                    API client
docs/              All documentation
certs/             Certificate files (real + dev)
```

---

## 3. What Was Changed Recently (Agent Context)

### Backend Changes

| Change | File(s) | Why |
|--------|---------|-----|
| **Rate Limit Fields** | `apps/billing/models.py`, `migrations/0007_add_rate_limit_fields` | 6 new columns on `SubscriptionPlan`: `max_automations`, `max_automation_executions_day`, `max_ai_queries_month`, `max_api_calls_day`, `max_exports_month`, `max_wallet_pushes_month` |
| **Plan Enforcement** | `common/plan_enforcement.py` | Decorators enforce limits; `_count_api_calls_day()` uses `AgentAPICallLog` |
| **Agent API Logging** | `apps/agent_api/models.py`, migration | New `AgentAPICallLog` model logs every API call per tenant |
| **Vault Write** | `common/vault.py` | `write_secret()` + `clear_cache()` for runtime secret updates |
| **Integration Diagnostics** | `apps/tenants/super_admin_api/platform.py` | `platform_integrations()` returns per-service diagnostics with `errors` array |
| **Vault Secret Endpoint** | `apps/tenants/super_admin_api/platform.py` | `PUT /integrations/{key}/secret/` — writes single key to Vault, validates against `ALLOWED_KEYS` |
| **Env Validation Fix** | `common/env_validation.py` | Mailjet + Apple Wallet no longer hard-required. Mailjet only required if `mailjet_api_key` set. Apple only if `apple_wallet_enabled=true` |
| **OAuth in ALLOWED_KEYS** | `apps/tenants/super_admin_api/platform.py` | `google_wallet` ALLOWED_KEYS now includes `google_oauth_client_id` + `google_oauth_client_secret` |

### Frontend Changes

| Change | File | Why |
|--------|------|-----|
| **Settings Page** | `src/app/(dashboard)/superadmin/settings/page.tsx` | Inline Vault editor for ALL integrations (Google Wallet, Apple Wallet, Payment, Email) |
| **Plan Modal** | `src/components/superadmin/plans/PlanModal.tsx` | Full-screen modal, `is_active` toggle, reactivation flow |
| **API Client** | `src/lib/api.ts` | `superAdminApi` object with typed endpoints |

### Database Fix
- Migration `billing.0007_add_rate_limit_fields` was recorded in `django_migrations` but columns were missing.
- Fix: `ALTER TABLE` added 6 columns + CHECK constraints manually.

---

## 4. Credentials — Where Everything Lives

**ALL secrets are in HashiCorp Vault at `secret/data/loyallia/production`.**
**NO secrets in `.env`, NO secrets in code, NO secrets in Git.**

### Vault Access
```bash
# Load root token into a local shell variable only; do not echo or log it.
ROOT_TOKEN="$(docker exec loyallia-vault cat /vault/file/init.json | python3 -c "import sys,json; print(json.load(sys.stdin)['root_token'])")"

# Read a secret
curl -H "X-Vault-Token: <token>" http://localhost:33908/v1/secret/data/loyallia/production

# Write a secret (SUPER_ADMIN only)
curl -X POST -H "X-Vault-Token: <token>" -H "Content-Type: application/json" \
  http://localhost:33908/v1/secret/data/loyallia/production \
  -d '{"data": {"key": "value"}}'
```

### Current Vault Keys

| Key | Value Source | Status |
|-----|--------------|--------|
| `google_wallet_issuer_id` | Vault/local ignored credentials | Required when Google Wallet is enabled |
| `google_service_account_json` | Vault/local ignored credentials | Required when Google Wallet is enabled |
| `google_wallet_enabled` | Vault/platform setting | Controls Google Wallet availability |
| `google_oauth_client_id` | Vault/local ignored credentials | Required for Google OAuth |
| `google_oauth_client_secret` | Vault/local ignored credentials | Required for Google OAuth |
| `apple_pass_type_identifier` | Vault/local ignored credentials | Required when Apple Wallet is enabled |
| `apple_team_identifier` | Vault/local ignored credentials | Required when Apple Wallet is enabled |
| `apple_cert_pem` | Vault/local ignored credentials | Required when Apple Wallet is enabled |
| `apple_cert_key_pem` | Vault/local ignored credentials | Required when Apple Wallet is enabled |
| `apple_wwdr_cert_pem` | Vault/local ignored credentials | Required when Apple Wallet is enabled |
| `apple_wallet_enabled` | Vault/platform setting | Controls Apple Wallet availability |
| `mailjet_api_key` | Vault | Required when Mailjet is enabled |
| `mailjet_secret_key` | Vault | Required when Mailjet is enabled |
| `mailjet_sender_email` | Vault | Required when Mailjet is enabled |
| `jwt_secret_key` | Vault | Required for JWT signing |
| `secret_key` | Vault | Required for Django |

### Certificate Files in `certs/`
```
certs/
  passNew.cer              Local ignored Apple Pass Type ID cert
  apple_pass_new.key       Local ignored Apple private key
  apple_pass_new.csr       Local ignored CSR
  AppleWWDRCAG4.cer        Local ignored Apple WWDR intermediate cert
  client_secret_*.json     Local ignored Google OAuth client secrets
  service-account-*.json   Local ignored Google Wallet service account
  README.md                — Documentation
```

**Removed (were placeholders):**
- `apple_pass.key`, `apple_pass_cert.pem`, `apple_wwdr.pem`, `apple_pass.csr`, `pass.cer`

---

## 5. API Endpoints Every Agent Should Know

### Authentication
```
POST /api/v1/auth/login/          → JWT access + refresh tokens
POST /api/v1/auth/refresh/        → Refresh access token
POST /api/v1/auth/google/callback/ → Google OAuth callback
```

### SuperAdmin (requires SUPER_ADMIN role)
```
GET  /api/v1/admin/plans/                    → List all plans
POST /api/v1/admin/plans/                    → Create plan
PUT  /api/v1/admin/plans/{id}/               → Update plan
DELETE /api/v1/admin/plans/{id}/             → Deactivate (blocked if active subs)
GET  /api/v1/admin/platform/integrations/    → Integration status + diagnostics
PUT  /api/v1/admin/platform/integrations/{key}/secret/  → Write Vault secret
POST /api/v1/admin/broadcast/                → Email all owners
```

### Public Billing
```
GET /api/v1/billing/plans/         → Public plan listing (all rate limits included)
```

### Health
```
GET /api/v1/health/                → {status: "ok", version: "1.0.0"}
```

---

## 6. How to Verify Integration Status

```bash
# 1. Get token
TOKEN=$(curl -s -X POST http://localhost:33905/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"<superadmin-email>","password":"<local-password-from-env-or-vault>"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Check all integrations
curl -s http://localhost:33905/api/v1/admin/platform/integrations/ \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected output: all integrations show `configured` with empty `errors` arrays.

---

## 7. Common Issues & Fixes

### Issue: 500 on `/superadmin/plans/`
**Root cause:** Migration `0007` columns missing from DB table.
**Fix:**
```bash
docker exec loyallia-postgres psql -U loyallia -d loyallia -c "
ALTER TABLE loyallia_subscription_plans
  ADD COLUMN IF NOT EXISTS max_automations integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_automation_executions_day integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_ai_queries_month integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_api_calls_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_exports_month integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_wallet_pushes_month integer NOT NULL DEFAULT 0;
"
```

### Issue: Env validation fails on startup
**Root cause:** `PRODUCTION_REQUIRED_VAULT_KEYS` too strict.
**Fix:** Already applied — email/apple wallet are now optional unless configured.

### Issue: Vault secret write fails (403)
**Root cause:** Vault policy missing `create`/`update`.
**Fix:**
```bash
docker exec loyallia-vault vault policy write loyallia-app - <<EOF
path "secret/data/loyallia/production" {
  capabilities = ["read", "create", "update"]
}
EOF
```

### Issue: Integration shows "missing_credentials"
**Diagnose:** Check diagnostics object — it lists exactly which Vault key is missing.
**Fix:** Use SuperAdmin settings UI or `scripts/inject_wallet_credentials.py`.

---

## 8. Development Workflow

```bash
# Start everything
docker compose up -d

# Check all containers healthy
docker ps --format "table {{.Names}}\t{{.Status}}"

# Backend logs
docker logs -f loyallia-api

# Run migrations
docker exec loyallia-api python manage.py migrate

# Run backend tests
docker exec loyallia-api python manage.py test

# Frontend dev server (hot reload)
cd frontend && npm run dev

# Lint backend
cd backend && ruff check .
```

---

## 9. Rules & Constraints

- **File size limit:** 600 lines per `.py`/`.tsx` file
- **No FastAPI:** Django Ninja only
- **No SQLAlchemy:** Django ORM + migrations only
- **No hardcoded strings:** Use `common/messages.py` + `get_message()`
- **No secrets in Git:** `.env`, `certs/*.pem`, `certs/*.key` are gitignored
- **Tenant isolation:** ALL queries must filter by `tenant_id`
- **Rate limits:** Enforced via `common/plan_enforcement.py` decorators
- **No placeholders:** Real implementations only (see `rules.md`)

---

## 10. References

| Document | Purpose |
|----------|---------|
| `rules.md` | Vibe Coding Rules — MUST READ before any code change |
| `docs/ARCHITECTURE.md` | Full system diagrams (Mermaid) |
| `docs/WALLET_CREDENTIALS_STATUS.md` | Current credential audit |
| `docs/GOOGLE_SETUP_STEP_BY_STEP.md` | How to obtain Google credentials |
| `docs/SRS_Loyallia_COMPLETE.md` | Full requirements spec |
| `docs/COMPLIANCE_CHECKLIST.md` | LOPDP/GDPR compliance checklist |
| `docs/TODO_CURRENT_PRODUCTION_READINESS.md` | Remaining production tasks |
