# Operational Scripts

## Purpose

This directory contains **ad-hoc operational and maintenance scripts** that are run outside the normal deployment flow. These scripts perform sensitive or infrequent tasks such as secret rotation, security hardening, and one-off data migrations.

Scripts here are intended to be run manually by operators with appropriate credentials and environment access.

## Files

| File | Description |
|------|-------------|
| `rotate_secrets.sh` | Rotates secrets in HashiCorp Vault KV v2 and restarts affected services. Supports full rotation or single-secret rotation with `--secret`. |

## Configuration

### `rotate_secrets.sh`

#### Prerequisites

- `vault` CLI installed and in `$PATH`
- `docker` CLI available
- Environment variables set:
  ```bash
  export VAULT_ADDR=https://vault:8200
  export VAULT_TOKEN=<app-token-or-root-token>
  ```

#### Secrets Managed

| Secret | Generator | Services Restarted |
|--------|-----------|-------------------|
| `secret_key` | Django `get_random_secret_key()` | API, Celery workers |
| `postgres_password` | `secrets.token_urlsafe(24)` | All services (requires `docker compose down && up -d`) |
| `redis_password` | `secrets.token_urlsafe(24)` | Redis, API, Celery workers, Flower |
| `minio_root_password` | `secrets.token_urlsafe(24)` | MinIO, API |
| `jwt_secret_key` | `secrets.token_urlsafe(32)` | API, Celery workers |
| `pass_hmac_secret` | `secrets.token_urlsafe(32)` | API, `celery-pass` |
| `flower_basic_auth` | `loyallia:<random>` | Flower |

#### Backup Directory

Rotated secrets are backed up to:

```
$PROJECT_ROOT/deploy/backups/secret-snapshots/secrets_YYYYMMDD_HHMMSS.json
```

## Usage

### Rotate All Secrets

```bash
./deploy/scripts/rotate_secrets.sh
```

### Dry Run (preview only)

```bash
./deploy/scripts/rotate_secrets.sh --dry-run
```

### Rotate a Single Secret

```bash
./deploy/scripts/rotate_secrets.sh --secret redis_password
```

### Post-Rotation Checklist

The script prints a checklist on completion:

1. Verify services are healthy: `docker compose ps`
2. Test API: `curl http://localhost:33905/api/v1/health/`
3. Update `.env` file with new values (for local dev)
4. Clean up old backups: `find deploy/backups/secret-snapshots -mtime +30 -delete`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `vault CLI not found` | Install HashiCorp Vault CLI: `brew install vault` (macOS) or download from releases page. |
| `VAULT_ADDR not set` | Export `VAULT_ADDR` pointing to the running Vault instance. |
| `VAULT_TOKEN not set` | Export a valid token. Use the app token from `/vault/runtime/app-token` or a root token. |
| Service fails after rotation | Check the service logs: `docker compose logs <service>`. Ensure the new secret was written correctly to Vault. |
| PostgreSQL password rotated but app won't start | PostgreSQL password rotation requires a **full stack restart** (`docker compose down && docker compose up -d`). This causes downtime — schedule during a maintenance window. |
| Backup file is empty | The script attempts to back up before rotation. If Vault is unreachable, the backup may fail but rotation continues. Verify Vault status before running. |

## Related Docs

- [`deploy/vault/`](../vault/) — Vault initialization, policies, and token management
- [`deploy/bootstrap/`](../bootstrap/) — Deployment orchestrator and `generate_secrets.sh`
- [`deploy/backups/`](../backups/) — Backup and restore procedures
- [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — Security architecture and secret lifecycle
