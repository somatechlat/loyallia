# Secret Rotation Procedures — LYL-H-INFRA-016

## Overview

All production secrets are stored in HashiCorp Vault KV v2. This document describes the rotation schedule, procedures, and automation.

## Rotation Schedule

| Secret | Rotation Interval | Impact | Downtime |
|--------|-------------------|--------|----------|
| `SECRET_KEY` (Django) | 90 days | Sessions invalidated | Rolling restart |
| `JWT_SECRET_KEY` | 90 days | All users re-login | Rolling restart |
| `POSTGRES_PASSWORD` | 180 days | All DB connections | Coordinated restart |
| `REDIS_PASSWORD` | 180 days | All cache/broker connections | Coordinated restart |
| `MINIO_ROOT_PASSWORD` | 180 days | Object storage access | Service restart |
| `PASS_HMAC_SECRET` | 365 days | Wallet pass signatures | Rolling restart |
| `FLOWER_BASIC_AUTH` | 90 days | Monitoring UI access | Service restart |

## Quick Rotation

```bash
# Rotate all secrets (with dry-run first)
./deploy/scripts/rotate_secrets.sh --dry-run
./deploy/scripts/rotate_secrets.sh

# Rotate a specific secret
./deploy/scripts/rotate_secrets.sh --secret jwt_secret_key
```

## Manual Rotation Steps

### 1. Generate New Secret

```bash
# Python (preferred for Django SECRET_KEY)
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Generic
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. Update Vault

```bash
export VAULT_ADDR=http://localhost:33908
export VAULT_TOKEN=<your-token>

vault kv patch secret/data/loyallia secret_key="new-value-here"
```

### 3. Restart Services

```bash
cd /path/to/loyallia

# For non-disruptive secrets (JWT, SECRET_KEY, FLOWER):
docker compose restart api celery-pass celery-push celery-default celery-beat flower

# For database password (requires downtime):
docker compose down
# Update POSTGRES_PASSWORD in .env
docker compose up -d
```

### 4. Verify

```bash
# Check all services are healthy
docker compose ps

# Test API
curl -s http://localhost:33905/api/v1/health/ | jq .

# Check logs for auth errors
docker compose logs api --tail=50 | grep -i "error\|auth\|denied"
```

## Emergency Rotation (Suspected Compromise)

1. **Immediately** rotate the compromised secret
2. Restart all dependent services
3. Check audit logs: `docker compose logs api | grep -i "unauthorized\|forbidden"`
4. Invalidate all sessions if SECRET_KEY was compromised: `python manage.py clearsessions`
5. Force re-authentication for all users if JWT_SECRET_KEY was compromised
6. Document the incident in `docs/incidents/`

## Backup Snapshots

Before each rotation, the script saves a snapshot to:
```
deploy/backups/secret-snapshots/secrets_YYYYMMDD_HHMMSS.json
```

These are encrypted at rest (file permissions 600) and should be cleaned up after 30 days.

## Monitoring

Alert `backup-pg-stale` in Grafana monitors backup freshness. Add similar alerts for secret age using the `loyallia_secret_last_rotation_timestamp` metric (when available).
