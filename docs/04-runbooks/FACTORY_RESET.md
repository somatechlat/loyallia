# Factory Reset

## Purpose

Safe, auditable way to destroy a Loyallia environment and return to clean slate. Three mechanisms exist:

| Mechanism | Level | Destroys | Safety |
|---|---|---|---|
| Dev shell script | Docker infrastructure | Containers, volumes, networks | Type `DESTROY` |
| Prod shell script | Docker infrastructure | Same + 14 named volumes + 3 networks | CLI flag + domain + `DESTROY` |
| API (`platform_reset.py`) | Application data only | DB rows, Redis cache | OTP + `transaction.atomic()` |

## Files

| File | Description |
|---|---|
| `deploy/factory_reset/development/factory_reset.sh` | Dev Docker wipe. Type `DESTROY`. |
| `deploy/factory_reset/production/factory_reset.sh` | Prod Docker wipe. `--i-am-sure-production` + domain + `DESTROY`. |
| `backend/apps/tenants/super_admin_api/platform_reset.py` | API factory reset. SUPER_ADMIN + OTP. Blocks in production. |

## Shell Scripts

### Development

```bash
./deploy/factory_reset/development/factory_reset.sh
```

Destroys: all containers, all volumes (named + dangling with `loyallia`), all networks.

### Production

```bash
./deploy/factory_reset/production/factory_reset.sh --i-am-sure-production
```

Three confirmations:
1. CLI flag `--i-am-sure-production`
2. Type domain `rewards.loyallia.com`
3. Type `DESTROY`

Destroys 14 named volumes: `postgres_data`, `postgres_replica_data`, `redis_data`, `minio_data`, `vault_data`, `vault_runtime`, `static_files`, `media_files`, `next_cache`, `prometheus_data`, `grafana_data`, `loki_data`, `alertmanager-data`, `sentinel-data`.

Destroys 3 networks: `frontend-net`, `backend-net`, `monitoring-net`.

Optionally removes built Docker images.

## API Factory Reset (platform_reset.py)

Two-step process:

### Step 1: Request OTP

```
POST /api/v1/admin/platform/factory-reset/request/
Authorization: Bearer <SUPER_ADMIN_JWT>
```

- Sends OTP via Twilio Verify (if enabled) or local OTP + SMS fallback
- Sends email notification with OTP
- Stores verification SID in Redis (5-min TTL)

### Step 2: Confirm with OTP

```
POST /api/v1/admin/platform/factory-reset/confirm/
Authorization: Bearer <SUPER_ADMIN_JWT>
Body: { "otp": "123456" }
```

- Validates OTP via `check_otp()`
- **Blocks in production** (`PLATFORM_MODE=production` → HTTP 403)
- Writes audit log BEFORE wipe (`AuditAction.FACTORY_RESET`)
- Wipes in `transaction.atomic()` — deepest FK dependencies first:

```
Notification → CampaignDeliveryLog → CampaignRun → AutomationExecution →
Automation → CustomerPass → Enrollment → Transaction → Customer →
Card → Invoice → WebhookEvent → Subscription → RefreshToken →
Location → User (EXCEPT SUPER_ADMIN) → Tenant
```

- Re-seeds: `seed_subscription_plans`, `seed_platform_settings`
- Clears Redis cache

**Preserved:** SUPER_ADMIN users, Vault secrets, subscription plans, platform settings, audit log.

## Seed Demo Data

```
POST /api/v1/admin/platform/seed-demo-data/
Authorization: Bearer <SUPER_ADMIN_JWT>
```

- Blocks in production
- Calls `seed_development_data` + `seed_ecuador_businesses` management commands
- Audit logged (`AuditAction.SEED_DEMO`)

## Safety

- `set -euo pipefail` on all shell scripts
- Production shell: CLI flag + domain + DESTROY
- API: SUPER_ADMIN + OTP + production block + atomic transaction
- All scripts idempotent

## Troubleshooting

| Issue | Fix |
|---|---|
| "DESTROY" not accepted | Type exactly `DESTROY` uppercase, no extra spaces |
| Script exits without destroying | No containers/volumes found. Check `docker compose ps` |
| Permission denied | Add user to `docker` group or use `sudo` |
| Volumes remain | `docker volume prune -f` |
| API reset blocked in production | Expected — `_is_production_environment()` returns True when `PLATFORM_MODE=production` |
| OTP expired | Request new OTP (5-min TTL) |

## Related Docs

- `deploy/bootstrap/` — Re-bootstrap after reset
- `deploy/disaster_recovery/` — Recover from encrypted rescue files
- `deploy/backups/` — Backup before reset
- `docs/02-architecture/BACKUP_ARCHITECTURE.md` — Backup policies
