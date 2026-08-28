# E2E Testing Runbook

> **Purpose:** Step-by-step instructions for running Playwright E2E tests against production.
> **Audience:** Agents, developers, DevOps
> **Last updated:** 2026-08-28

## Prerequisites Checklist

- [ ] Node.js 18+ installed locally
- [ ] Playwright browsers installed (`npx playwright install chromium`)
- [ ] SSH access to production server (`root@140.82.15.48`)
- [ ] Vault unsealed (3 of 5 unseal keys)
- [ ] `.auth/e2e-credentials.json` exists on server

## Step 1: Verify Production Server Health

```bash
ssh root@140.82.15.48

# Check all containers are running
docker compose -f /opt/loyallia/docker-compose.yml -f /opt/loyallia/docker-compose.prod.yml ps

# Expected: all containers "Up (healthy)"
# loyallia-api, loyallia-web, loyallia-postgres, loyallia-pgbouncer,
# loyallia-redis, loyallia-celery-worker, loyallia-celery-beat,
# loyallia-minio, loyallia-nginx, loyallia-vault

# Check API health
curl -s https://rewards.loyallia.com/api/v1/health/ | jq .

# Check Vault status
docker exec loyallia-vault vault status -format=json | jq .sealed
# Expected: false (unsealed)
```

## Step 2: Provision E2E Test Users (First Time Only)

```bash
# Run inside the API container
docker exec loyallia-api python manage.py provision_production_e2e_test_users --generate

# Expected output:
# Production E2E users provisioned. Credentials written to ../frontend/.auth/e2e-credentials.json.

# Verify credentials file exists
docker exec loyallia-api cat /app/frontend/.auth/e2e-credentials.json | jq .users
```

## Step 3: Copy Credentials to Local Machine

```bash
# From your local machine
sshpass -p '<password>' scp root@140.82.15.48:/opt/loyallia/frontend/.auth/e2e-credentials.json ./frontend/.auth/e2e-credentials.json

# Or if SSH key is configured
scp root@140.82.15.48:/opt/loyallia/frontend/.auth/e2e-credentials.json ./frontend/.auth/e2e-credentials.json
```

## Step 4: Set Environment Variables

```bash
export PLAYWRIGHT_BASE_URL=https://rewards.loyallia.com
export E2E_ALLOW_HOSTS=rewards.loyallia.com
```

## Step 5: Run Smoke Tests (Safe, Read-Only)

```bash
cd frontend

# Auth + navigation tests only (no data mutations)
npx playwright test --project=auth,role-isolation

# Expected: ~23 tests, all passing
```

## Step 6: Run Full Suite

```bash
# Full suite (creates + deletes test data)
npx playwright test --project=full

# Expected: ~233 tests
# Duration: ~15-20 minutes (production is slower than local)
```

## Step 7: Review Results

```bash
# Open HTML report
npx playwright show-report

# Check for failures
# - Transient: network timeouts, vault token expiry
# - Real bugs: assertion failures, wrong UI behavior
# - Plan limits: 403 on analytics (Starter plan)
```

## Step 8: Cleanup (If Needed)

```bash
# If tests left orphaned data, clean up via API
# Login as superadmin
TOKEN=$(curl -s -X POST https://rewards.loyallia.com/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e-superadmin@loyallia.com","password":"<password>"}' | jq -r .access_token)

# List E2E tenant
curl -s https://rewards.loyallia.com/api/v1/admin/tenants/ \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.slug | startswith("e2e"))'
```

## Common Issues & Fixes

### Issue: "Refusing to run E2E tests against production host"
**Fix:** Set `E2E_ALLOW_HOSTS=rewards.loyallia.com`

### Issue: "No local E2E credential file exists"
**Fix:** Run provisioning command (Step 2)

### Issue: Login returns 503
**Fix:** Unseal Vault (Step 1, Vault status check)

### Issue: Tests timeout on production
**Fix:** Increase timeout: `npx playwright test --timeout=120000`

### Issue: SSL certificate errors
**Fix:** Config already has `ignoreHTTPSErrors: true`. Check cert:
```bash
openssl s_client -connect rewards.loyallia.com:443 -servername rewards.loyallia.com
```

### Issue: Rate limiting (429 responses)
**Fix:** Tests run serially (1 worker). If still hitting limits, add delays:
```bash
npx playwright test --project=full --workers=1
```

## Test Projects Reference

| Project | Role | Tests | Risk Level |
|---------|------|-------|------------|
| `auth` | All | Login, routing, registration | Low |
| `programs` | Owner | Program CRUD, wizard | Medium |
| `customers` | Owner | Customer management | Medium |
| `team` | Owner | Team invites, roles | High |
| `locations` | Owner | Location CRUD | Medium |
| `analytics` | Owner | Dashboard, charts | Low |
| `automation` | Owner | Rule CRUD | Medium |
| `campaigns` | Owner | Wallet/SMS/Email | Medium |
| `scanner` | Staff | Scanner PWA | Low |
| `superadmin` | SuperAdmin | Platform admin | High |
| `role-isolation` | All | RBAC boundaries | Low |
| `wallet` | Owner | Apple/Google Wallet | Medium |
| `whatsapp` | Owner | WhatsApp bridge | High |
| `security` | Owner | Security hardening | Medium |
| `billing` | Owner | Billing page | Low |
| `phone` | Owner | Phone verification | Low |

## Safety Rules

1. **NEVER** run factory reset or seed demo tests on production
2. **NEVER** modify real business data (only E2E tenant data)
3. **ALWAYS** use `--workers=1` (serial execution)
4. **ALWAYS** verify Vault is unsealed before running tests
5. **ALWAYS** check container health before running tests
6. **CLEAN UP** any orphaned test data after test runs
