# LOYALLIA — ZERO-TO-HERO BOOTSTRAP REDESIGN PLAN
## Complete rebuild from scratch. No patches. No hardcoded values. Perfection.

**Date:** 2026-06-01  
**Objective:** Design and execute a flawless bootstrap architecture for both DEVELOPMENT and PRODUCTION environments. After bootstrap, only the SUPER_ADMIN user exists. No tenants. No test data. All secrets in Vault. All URLs parameterized.

---

## CURRENT STATE — CRITICAL ISSUES FOUND

### 1. Bootstrap Script (`deploy/bootstrap/bootstrap.sh`)
| Issue | Severity | Details |
|-------|----------|---------|
| E2E tenant created in dev mode | CRITICAL | `seed_development_data --generate` creates `e2e-development-tenant` + 4 E2E users |
| Step count inconsistent | MEDIUM | Functions labeled "1/9" through "10/10" — mismatch |
| `.bootstrap_secrets.json` deleted after bootstrap | HIGH | `cleanup_bootstrap()` calls `secure_delete` on secrets file, making re-bootstrap impossible |
| No self-signed cert generation for Vault TLS | CRITICAL | `docker-compose.yml` mounts Let's Encrypt paths that don't exist on fresh machines |
| Rescue files conflict with fresh bootstrap | MEDIUM | If `.agents/` has rescue files, bootstrap aborts — but rescue files are needed for production |
| Development mode skips `seed_subscription_plans` | MEDIUM | Only production mode seeds plans; dev relies on E2E command which also seeds plans |
| Development mode skips `seed_platform_settings` | MEDIUM | Same as above |

### 2. Docker Compose (`docker-compose.yml` + `docker-compose.prod.yml`)
| Issue | Severity | Details |
|-------|----------|---------|
| Let's Encrypt paths as defaults | CRITICAL | `SSL_CERT_PATH:-/etc/letsencrypt/live/rewards.loyallia.com/fullchain.pem` breaks fresh dev |
| `VAULT_SECRET_PATH` hardcoded to development | MEDIUM | `secret/data/loyallia/development` in dev; prod override exists but base is wrong |
| `frontend/Dockerfile` hardcodes production URL | HIGH | `ARG NEXT_PUBLIC_API_URL=https://rewards.loyallia.com` |
| `next.config.js` hardcodes `rewards.loyallia.com` | MEDIUM | In `allowedOrigins` fallback |
| PgBouncer password in env var | MEDIUM | `REDIS_PASSWORD` visible in `docker inspect` |

### 3. Secrets Management
| Issue | Severity | Details |
|-------|----------|---------|
| `jwt_private_key` empty | HIGH | Referenced in `apps/authentication/tokens.py` for asymmetric JWT |
| `jwt_public_key` empty | HIGH | Same as above |
| `age_public_key` empty | MEDIUM | Used for backup encryption |
| Real Twilio credentials missing from bootstrap | MEDIUM | Empty in `.bootstrap_secrets.env` but exist in rescue snapshot |
| `.bootstrap_secrets.env` contains real credentials in plaintext | HIGH | At project root, not gitignored (shows in git status) |
| `.agents/` directory contains live root token | CRITICAL | `vault_init_rescue.json` has actual Vault root token |

### 4. Django Settings / Code
| Issue | Severity | Details |
|-------|----------|---------|
| `seed_platform_settings.py` has 8 hardcoded localhost URLs | HIGH | `public_base_url`, `api_base_url`, `dashboard_url`, etc. |
| `DEFAULT_FROM_EMAIL = "noreply@loyallia.com"` hardcoded | MEDIUM | In `base.py` line 370 |
| `recover_admin_access.py` hardcodes `admin@loyallia.com` | LOW | Acceptable as default |
| `provision_development_rbac_test_users.py` creates E2E tenant | CRITICAL | Must be removed from bootstrap flow |

### 5. Factory Reset
| Issue | Severity | Details |
|-------|----------|---------|
| `clean_demo_data.py` exists but is Python-only | MEDIUM | Doesn't wipe Docker volumes, containers, networks, or Vault data |
| No shell-based complete factory reset script | HIGH | Need a script that wipes EVERYTHING: containers, volumes, networks, images, rescue files |
| SuperAdmin API has factory reset endpoints | LOW | Exists but requires OTP and doesn't wipe infrastructure |

---

## PROPOSED ARCHITECTURE

### Principle 1: Environment Parity
Development and Production use the **SAME** bootstrap sequence, the **SAME** Vault structure, the **SAME** secret keys. Only these differ:
- `PUBLIC_BASE_URL` (localhost vs https://rewards.loyallia.com)
- `VAULT_SECRET_PATH` (loyallia/development vs loyallia/production)
- `DJANGO_SETTINGS_MODULE` (development vs production)
- `DEBUG` (True vs False)
- SSL certificates (self-signed vs Let's Encrypt)
- `ADMIN_PASSWORD` (auto-generated vs required)

### Principle 2: Clean Bootstrap Output
After bootstrap completes, the system contains **ONLY**:
1. **SuperAdmin user** (`admin@loyallia.com`) with secure password
2. **4 SubscriptionPlans** (trial, starter, professional, enterprise)
3. **PlatformSettings** (URLs, email config, rate limits — parameterized by mode)
4. **Vault secrets** (all 56 keys seeded)
5. **Runtime files** in `/run/loyallia-vault/` (0640 permissions)
6. **Django migrations applied**
7. **MinIO buckets created**

**NO TENANTS. NO E2E USERS. NO DEMO DATA.**

### Principle 3: Self-Healing Vault TLS
On fresh development machines, Vault TLS certificates are **auto-generated** (self-signed) during `vault-init`. On production, real certificates are mounted. No broken mounts.

### Principle 4: Idempotent Bootstrap
Running bootstrap twice on the same machine should:
1. Detect existing Vault data and ask for confirmation
2. Or skip to "ensure admin password + verify" if user confirms

### Principle 5: Complete Factory Reset
A single command `deploy/bootstrap/factory-reset.sh` must:
1. Stop all containers
2. Remove all containers
3. Remove all volumes (including Vault data)
4. Remove all networks
5. Optionally remove rescue files (with explicit confirmation)
6. Leave the project in pristine state (like `git clone` + `docker system prune`)

---

## IMPLEMENTATION PLAN

### PHASE 0: Pre-Flight (SAVE EVERYTHING)
**BEFORE touching the cluster, save:**

1. **Backup current Vault secrets** to `.agents/vault_export_20260601.json`
2. **Backup current database** via `pg_dump`
3. **Document all 56 secret keys** with their purpose and source
4. **Verify `.bootstrap_secrets.env` completeness** — fill missing keys:
   - `jwt_private_key` — generate RSA private key
   - `jwt_public_key` — generate RSA public key  
   - `age_public_key` — generate age public key for backup encryption
   - `twilio_account_sid` — add if available, otherwise leave empty with comment
   - `twilio_auth_token` — same
5. **Create self-signed certificate generator** in `deploy/vault/generate-dev-certs.sh`

### PHASE 1: Bootstrap Script Redesign

#### 1.1 Fix `bootstrap.sh` Main Sequence
```
main():
  1. check_prerequisites
  2. check_existing_data (warn if Vault already initialized)
  3. generate_or_load_secrets
  4. prepare_bootstrap_volume
  5. start_vault
  6. auto_create_rescue_files
  7. start_stateful_services
  8. migrate_database          ← NEW: only migrations, no seeds
  9. seed_subscription_plans   ← NEW: in BOTH modes
  10. seed_platform_settings   ← NEW: in BOTH modes, parameterized by mode
  11. ensure_admin_password    ← Create/reset super admin ONLY
  12. start_workers_and_proxy
  13. start_redis_sentinel
  14. cleanup_bootstrap        ← FIX: do NOT delete .bootstrap_secrets.json
  15. verify_bootstrap
```

#### 1.2 Remove E2E Data Creation
- **DELETE** from bootstrap: `seed_development_data --generate`
- **KEEP** `provision_development_rbac_test_users.py` as standalone command for E2E testing, but NEVER call it from bootstrap
- **DELETE** `seed_test_data.py` if it creates demo tenants

#### 1.3 Fix `cleanup_bootstrap()`
- Remove `secure_delete "$SECRETS_FILE"` — the secrets file is needed for re-bootstrap
- Keep deletion of temporary Docker volume only

#### 1.4 Fix Step Numbering
- Use consistent numbering: 1/N through N/N
- Or remove numbering entirely and use descriptive step names

### PHASE 2: Docker Compose Fixes

#### 2.1 Fix Vault TLS Mount for Fresh Dev
In `docker-compose.yml`, change:
```yaml
# BEFORE (breaks on fresh machines):
volumes:
  - ${SSL_CERT_PATH:-/etc/letsencrypt/live/rewards.loyallia.com/fullchain.pem}:/vault/certs/vault.crt:ro
  - ${SSL_KEY_PATH:-/etc/letsencrypt/live/rewards.loyallia.com/privkey.pem}:/vault/certs/vault.key:ro

# AFTER (vault-init generates certs if missing):
volumes:
  - ./deploy/vault/certs:/vault/certs  # Empty dir in git; vault-init generates self-signed certs here if empty
```

In `deploy/vault/init.sh`, add at the beginning:
```bash
# Generate self-signed TLS certificate if none exists
if [ ! -f /vault/certs/vault.crt ] || [ ! -f /vault/certs/vault.key ]; then
    log "Generating self-signed TLS certificate for Vault..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /vault/certs/vault.key \
        -out /vault/certs/vault.crt \
        -subj "/CN=vault/O=Loyallia" \
        -addext "subjectAltName=DNS:vault,DNS:localhost,IP:127.0.0.1"
    chmod 0600 /vault/certs/vault.key
    chmod 0644 /vault/certs/vault.crt
    log "Self-signed certificate generated."
fi
```

#### 2.2 Fix `docker-compose.prod.yml`
- Change all hardcoded `https://rewards.loyallia.com` to `${PUBLIC_BASE_URL:-https://rewards.loyallia.com}`
- Parameterize `EMAIL_HOST`, `EMAIL_FROM` with env vars
- Remove hardcoded `in-v3.mailjet.com` fallback — require env var in production

#### 2.3 Fix `frontend/Dockerfile`
```dockerfile
# BEFORE:
ARG NEXT_PUBLIC_API_URL=https://rewards.loyallia.com
ARG NEXT_PUBLIC_APP_URL=https://rewards.loyallia.com

# AFTER:
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
# Build will fail if not provided in production CI
```

#### 2.4 Fix `next.config.js`
```javascript
// BEFORE:
allowedOrigins: (process.env.ALLOWED_ORIGINS || 'localhost,localhost:33906,...,rewards.loyallia.com').split(',')

// AFTER:
allowedOrigins: (process.env.ALLOWED_ORIGINS || 'localhost,localhost:33906,127.0.0.1:33906').split(',')
// rewards.loyallia.com must be explicitly set via ALLOWED_ORIGINS env var
```

### PHASE 3: Secrets Management

#### 3.1 Complete Bootstrap Secrets
Fill these empty keys in `.bootstrap_secrets.env`:
```
jwt_private_key=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
jwt_public_key=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----
age_public_key=age1...
```

Generate them via a script if not present:
```bash
# generate_jwt_keys.sh
openssl genrsa -out /tmp/jwt_private.pem 2048
openssl rsa -in /tmp/jwt_private.pem -pubout -out /tmp/jwt_public.pem
```

#### 3.2 Categorize All 56 Keys
Create `docs/SECRETS_INVENTORY.md` documenting every key:
| Key | Category | Required | Dev Value | Prod Value | Source |
|-----|----------|----------|-----------|------------|--------|
| secret_key | Django | Yes | auto-gen | auto-gen | generate_secrets.sh |
| postgres_password | Database | Yes | auto-gen | auto-gen | generate_secrets.sh |
| ... | ... | ... | ... | ... | ... |

#### 3.3 Protect `.bootstrap_secrets.env`
Ensure `.gitignore` includes:
```
.bootstrap_secrets.env
.bootstrap_secrets.json
.agents/
*.pem
*.key
```

### PHASE 4: Settings Cleanup

#### 4.1 Fix `seed_platform_settings.py`
Remove hardcoded localhost URLs. Instead, read from environment or use mode-specific defaults:
```python
defaults = {
    "public_base_url": os.getenv("PUBLIC_BASE_URL", "http://localhost"),
    "api_base_url": os.getenv("API_BASE_URL", "http://localhost:33905/api/v1/"),
    "dashboard_url": os.getenv("DASHBOARD_URL", "http://localhost:33906"),
    # ... etc
}
```

#### 4.2 Fix `base.py` Hardcoded Email
```python
# BEFORE:
DEFAULT_FROM_EMAIL = "noreply@loyallia.com"

# AFTER:
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@loyallia.com")
```

### PHASE 5: Factory Reset Script

Create `deploy/bootstrap/factory-reset.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  LOYALLIA FACTORY RESET                                              ║"
echo "║  This will DESTROY all data: containers, volumes, networks.         ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

read -r -p "Type 'DESTROY' to confirm complete factory reset: " confirm
if [ "$confirm" != "DESTROY" ]; then
    echo "Aborted."
    exit 0
fi

echo "Stopping all containers..."
docker compose down --remove-orphans

echo "Removing all volumes..."
docker volume rm loyallia_postgres_data loyallia_postgres_replica_data \
    loyallia_redis_data loyallia_minio_data loyallia_vault_data \
    loyallia_vault_runtime loyallia_static_files loyallia_media_files \
    loyallia_next_cache loyallia_prometheus_data loyallia_grafana_data \
    loyallia_loki_data loyallia_alertmanager-data loyallia_sentinel-data \
    2>/dev/null || true

echo "Removing all networks..."
docker network rm loyallia_frontend-net loyallia_backend-net loyallia_monitoring-net 2>/dev/null || true

read -r -p "Also delete rescue files in .agents/? [y/N]: " delete_rescue
if [ "$delete_rescue" = "y" ] || [ "$delete_rescue" = "Y" ]; then
    rm -rf .agents/
    echo "Rescue files deleted."
fi

echo ""
echo "Factory reset complete. System is pristine."
echo "Run ./deploy/bootstrap/bootstrap.sh to rebuild."
```

### PHASE 6: Execution — Wipe and Rebuild

1. Run `deploy/bootstrap/factory-reset.sh`
2. Verify Docker is clean: `docker ps -a`, `docker volume ls`, `docker network ls`
3. Run `LOYALLIA_BOOTSTRAP_MODE=development ./deploy/bootstrap/bootstrap.sh`
4. Verify:
   - Vault initialized and unsealed
   - All 56 secrets in Vault
   - PostgreSQL running with migrations
   - 4 subscription plans exist
   - Platform settings seeded with localhost URLs
   - Only 1 user: admin@loyallia.com
   - 0 tenants
   - API health: 200 OK
   - Frontend accessible
5. Test super admin login
6. Test tenant creation via SuperAdmin wizard
7. Run `clean_demo_data.py` to verify surgical cleanup works
8. Repeat steps 1-7 for production mode (dry-run or staging)

---

## FILES TO MODIFY

| File | Change |
|------|--------|
| `deploy/bootstrap/bootstrap.sh` | Fix sequence, remove E2E creation, fix cleanup, fix step numbers |
| `deploy/bootstrap/factory-reset.sh` | **NEW** — complete wipe script |
| `deploy/bootstrap/generate_secrets.sh` | Add JWT key generation, age key generation |
| `deploy/vault/init.sh` | Add self-signed cert generation, fix policy permissions |
| `docker-compose.yml` | Fix Vault TLS mount, parameterize defaults |
| `docker-compose.prod.yml` | Parameterize all production URLs |
| `frontend/Dockerfile` | Remove hardcoded production URL defaults |
| `frontend/next.config.js` | Remove `rewards.loyallia.com` from allowedOrigins fallback |
| `backend/loyallia/settings/base.py` | Parameterize `DEFAULT_FROM_EMAIL` |
| `backend/apps/tenants/management/commands/seed_platform_settings.py` | Remove hardcoded localhost URLs, use env vars |
| `backend/apps/tenants/management/commands/seed_development_data.py` | Remove call to E2E provisioner |
| `.bootstrap_secrets.env` | Fill `jwt_private_key`, `jwt_public_key`, `age_public_key` |
| `.gitignore` | Ensure bootstrap secrets and agents are ignored |
| `docs/SECRETS_INVENTORY.md` | **NEW** — document all 56 keys |

---

## RISK MITIGATION

| Risk | Mitigation |
|------|------------|
| Accidental production data loss | Factory reset requires typing "DESTROY". Rescue files are preserved by default. |
| Vault init failure on fresh machine | Self-signed cert generation in vault-init entrypoint. |
| Bootstrap secrets file deleted | Remove `secure_delete` from cleanup. Keep file for re-bootstrap. |
| E2E tests break without E2E tenant | E2E provisioner becomes standalone command: `python manage.py provision_development_rbac_test_users --generate` |
| Production bootstrap creates dev data | Both modes use identical seed commands; only URLs and DEBUG differ. |

---

## SUCCESS CRITERIA

After running bootstrap in DEVELOPMENT mode:
- [ ] All 18+ containers healthy
- [ ] Vault initialized, unsealed, with 56 secrets
- [ ] PostgreSQL has all migrations
- [ ] Exactly 4 subscription plans (trial, starter, professional, enterprise)
- [ ] Platform settings have localhost URLs
- [ ] Exactly 1 user: `admin@loyallia.com`
- [ ] Exactly 0 tenants
- [ ] API returns 200 on `/api/v1/health/`
- [ ] SuperAdmin can log in
- [ ] SuperAdmin can create a tenant via wizard
- [ ] Factory reset script returns system to pristine state

After running bootstrap in PRODUCTION mode:
- [ ] Same as above, but with `https://rewards.loyallia.com` URLs
- [ ] `DEBUG=False`
- [ ] Strict Vault mode (missing secrets = fatal error)
- [ ] `ADMIN_PASSWORD` was required (not auto-generated)
