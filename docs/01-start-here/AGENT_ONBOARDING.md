# Loyallia — Agent Onboarding Guide

> **Single source of truth for any coding agent joining this project.**
> Updated: 2026-05-21
> Status: Backend 576/576 passing. Frontend E2E in progress.

---

## ⚠️ CRITICAL: Tests Run Against Docker Cluster ONLY

**NEVER** attempt to run tests against a standalone PostgreSQL, SQLite, or local Python virtual environment. The entire Loyallia stack (PostgreSQL, Redis, Vault, MinIO, PgBouncer) is containerized and tests **MUST** execute inside the `loyallia-api` container or against the running Docker cluster.

| Test Suite | Correct Command | Wrong Approach |
|---|---|---|
| Backend | `docker exec loyallia-api pytest --ds=loyallia.settings.test --reuse-db -q` | `cd backend && pytest` (env overrides pytest.ini) |
| Frontend E2E | `cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:33906 npx playwright test` | Against remote production URLs without `E2E_ALLOW_HOSTS` |
| Integration | `docker exec loyallia-api pytest --ds=loyallia.settings.test_integration` | Host-side pytest without Docker env |

**Why:** Settings resolve hostnames like `postgres`, `redis`, `vault` via Docker network. These do not exist on the macOS/Windows host.

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
| **Plan Status** | `apps/billing/models.py`, `migrations/0009_subscriptionplan_status` | `SubscriptionPlan` has `status` field: `draft`/`published`/`archived`. Tenant API filters published only. SuperAdmin archive on delete. |
| **Audit Logging** | `apps/audit/service.py`, `apps/audit/api.py` | `AuditLog` model records actor, action, resource, timestamp. Anonymous actors use nil UUID. OWNER can view tenant-scoped logs. |
| **Account Deletion** | `apps/tenants/security_privacy_api.py`, `apps/authentication/api.py` | `delete_account` sets `is_active=False`, revokes all refresh tokens, schedules cascade delete. Frontend clears cookies before redirect. |
| **MANAGER+ Enforcement** | `apps/customers/api.py`, `apps/cards/api.py`, `apps/automation/api.py`, `apps/api/upload_api.py` | Multiple endpoints now reject STAFF and require MANAGER or OWNER role. |
| **Plan Enforcement** | `common/plan_enforcement.py` | Decorators enforce limits; `_count_api_calls_day()` uses `AgentAPICallLog` |
| **Vault Write** | `common/vault.py` | `write_secret()` + `clear_cache()` for runtime secret updates |
| **Integration Diagnostics** | `apps/tenants/super_admin_api/platform.py` | `platform_integrations()` returns per-service diagnostics with `errors` array |
| **Vault Secret Endpoint** | `apps/tenants/super_admin_api/platform.py` | `PUT /integrations/{key}/secret/` — writes single key to Vault, validates against `ALLOWED_KEYS` |
| **Migration & Seed Remediation** | `apps/*/migrations/`, `apps/billing/fixtures/subscription_plans.json`, `apps/tenants/fixtures/platform_settings.json`, `apps/*/management/commands/seed_*.py` | Data-creating migrations converted to no-ops; canonical JSON fixtures are the single source of truth. Seed commands read from fixtures. `--update-existing` flag supported. No hardcoded default passwords. Production startup no longer auto-runs seeds. |

### Frontend Changes

| Change | File | Why |
|--------|------|-----|
| **Audit Log Viewer** | `src/components/settings/AuditLogSection.tsx` | New settings section showing tenant-scoped audit events with status badges |
| **Data Privacy** | `src/components/settings/DataPrivacySection.tsx` | Account deletion UI with cookie clearing and ZIP export download |
| **Plan Status UI** | `src/components/superadmin/plans/page.tsx`, `PlanModal.tsx` | 3-section layout (Published/Drafts/Archived) with status selector in modal |
| **Password Toggles** | `src/app/(auth)/register/page.tsx`, `src/app/(auth)/reset-password/page.tsx` | Visibility toggle for password fields |
| **Wallet Preview** | `src/components/programs/WalletCardPreview.tsx` | Black phone frames with rounded bezels and gradient styling |
| **Settings Page** | `src/app/(dashboard)/superadmin/settings/page.tsx` | Inline Vault editor for ALL integrations |
| **Plan Modal** | `src/components/superadmin/plans/PlanModal.tsx` | Full-screen modal, `is_active` toggle, reactivation flow |

### Infrastructure Changes

| Change | File | Why |
|--------|------|-----|
| **Configurable Ports** | `docker-compose.yml` | All port bindings use `${DOCKER_BIND_HOST:-127.0.0.1}`. Set `DOCKER_BIND_HOST=0.0.0.0` for LAN/mobile testing. |
| **SuperAdmin Hard Delete** | `apps/tenants/super_admin_api/tenants.py`, `apps/tenants/tasks.py` | Synchronous tenant hard-delete with justification requirement (min 10 chars) and audit logging. Extracted `hard_delete_tenant()` for reuse by Celery task and API. |
| **PgBouncer Test Path** | `common/test_runner.py`, `loyallia/settings/test.py`, `loyallia/settings/test_integration.py` | Unit tests exercise `PgBouncerRouter`; integration tests run through real PgBouncer transaction mode. |
| **E2E Modular Tests** | `frontend/tests/e2e/suite/*.spec.ts`, `playwright.config.ts` | 32 spec files tagged with module + role tags. Run any module in isolation (~1-2 min). |

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
# Start everything in correct dependency order
docker compose up -d postgres redis vault
sleep 10
docker compose up -d vault-init pgbouncer minio
sleep 5
docker compose up -d api celery-default celery-push celery-pass celery-beat
sleep 5
docker compose up -d web nginx

# If Vault shows 503 (sealed after restart), unseal it:
# docker exec loyallia-vault vault operator unseal -address=https://127.0.0.1:8200 -tls-skip-verify <key>

# Check all containers healthy
docker ps --format "table {{.Names}}\t{{.Status}}"

# Backend logs
docker logs -f loyallia-api

# Run migrations
docker exec loyallia-api python manage.py migrate

# Seed canonical data (run after migrations)
docker exec loyallia-api python manage.py seed_subscription_plans
docker exec loyallia-api python manage.py seed_platform_settings

# Update existing seed data (optional)
docker exec loyallia-api python manage.py seed_subscription_plans --update-existing
docker exec loyallia-api python manage.py seed_platform_settings --update-existing

# Run backend tests (MUST use --ds because container env overrides pytest.ini)
docker exec loyallia-api pytest --ds=loyallia.settings.test --reuse-db -q

# Run backend integration tests (through PgBouncer)
docker exec loyallia-api pytest --ds=loyallia.settings.test_integration --reuse-db -q

# Frontend dev server (hot reload)
cd frontend && npm run dev

# Lint backend
cd backend && python3 -m ruff check .

# Recover admin access (requires password; use --create to create missing admin)
docker exec loyallia-api python manage.py recover_admin_access --password <password> --create

# Provision E2E test users (required before Playwright)
docker compose exec api python manage.py provision_development_rbac_test_users --generate

# E2E tests by module (instead of full 20-minute suite)
cd frontend && export PLAYWRIGHT_BASE_URL=http://localhost:33906
cd frontend && npx playwright test --project=wallet
cd frontend && npm run test:e2e:smoke
```

### Host-side environment for local pytest (if needed)
When running pytest on the host against the Docker cluster, export these first:
```bash
export PGBOUNCER_URL="postgres://loyallia@localhost:33901/loyallia_dev"
export DATABASE_DIRECT_URL="postgres://loyallia@localhost:33900/loyallia_dev"
export DATABASE_URL="postgres://loyallia@localhost:33900/loyallia_dev"
export VAULT_ADDR="http://localhost:33908"
export VAULT_TOKEN="<root-token-from-.agents/vault_init_rescue.json>"
export VAULT_SECRET_PATH="secret/data/loyallia/development"
export DEBUG="True"
export DJANGO_SETTINGS_MODULE="loyallia.settings.test"
```

### Demo Data
Ecuador business demo data runs **only** from the SysAdmin "Cargar Datos Demo" button or via API:
```bash
curl -s -X POST http://localhost:33905/api/v1/admin/platform/seed-demo-data/ \
  -H "Authorization: Bearer $TOKEN"
```
The endpoint auto-generates a demo password and includes it in the response. `seed_ecuador_businesses` requires `--password` and is for **demo purposes only**.

### Playwright mutating tests
Tests that create or delete data require:
```bash
export PLAYWRIGHT_ALLOW_MUTATING_E2E=true
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
