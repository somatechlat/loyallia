# Loyallia Backup System

## Directory Structure (Isolated by Environment)

```
deploy/backups/
├── README.md                          # This file
├── breach_notification.py             # Security incident notification (env-agnostic)
├── encrypt_backup.sh                  # Encryption utility (env-agnostic)
├── restore.sh                         # Full restore orchestrator (both envs via --env=)
│
├── production/                        # PRODUCTION ONLY — run on server host
│   ├── pg_dump.sh                     # Daily logical backup (cron 02:00)
│   ├── pg_basebackup.sh               # Weekly physical backup (cron 03:00 Sun)
│   ├── redis.sh                       # Every 6 hours (cron 00 */6 * * *)
│   ├── vault.sh                       # Daily Vault backup (cron 05:00)
│   ├── minio.sh                       # Daily MinIO mirror (cron 04:00)
│   ├── orchestrator.sh                # Full stack backup (calls all above)
│   └── verify.sh                      # Daily verification (cron 06:00)
│
└── development/                       # DEVELOPMENT ONLY — run from project root
    ├── pg_dump.sh                     # PostgreSQL logical backup
    ├── redis.sh                       # Redis RDB backup
    ├── vault.sh                       # Vault KV backup
    ├── orchestrator.sh                # Runs all dev backups
    └── verify.sh                      # Verifies dev backups
```

## Usage

### Development
```bash
# Run all dev backups
bash deploy/backups/development/orchestrator.sh

# Or individually
bash deploy/backups/development/pg_dump.sh
bash deploy/backups/development/redis.sh
bash deploy/backups/development/vault.sh

# Verify
bash deploy/backups/development/verify.sh
```

Backups land in `./.agents/backups/` (relative to project root).

### Production
```bash
# Run a single backup
bash deploy/backups/production/pg_dump.sh

# Or the full orchestrator
bash deploy/backups/production/orchestrator.sh

# Verify
bash deploy/backups/production/verify.sh
```

Backups land in `/var/backups/loyallia/`.

## Safety Guardrails

- All production scripts reject `--env=development` with a clear error.
- All development scripts use `docker compose exec` (no host binaries required).
- Production scripts run `pg_dump` / `redis-cli` / `mc` directly on the host (assumes installed binaries).
