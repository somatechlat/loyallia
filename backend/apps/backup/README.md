# Backup

Automated disaster recovery: PostgreSQL, Redis, Vault, and media asset backups.

## Services

- `services/postgres.py` — `pg_dump` and basebackup
- `services/redis.py` — RDB snapshot
- `services/vault.py` — Vault secrets export
- `services/media.py` — MinIO asset sync
- `services/verification.py` — Backup integrity checks
- `services/restore.py` — Point-in-time restore
- `services/cleanup.py` — Retention policy enforcement

## Celery Tasks

- `run_full_backup` — Orchestrates all backup types
- `backup_postgresql`, `backup_redis`, `backup_vault`, `backup_media`
- `verify_backup` — Checksum validation
- `cleanup_old_backups` — Remove expired backups
- `restore_from_backup_task` — Async restore

## Dependencies

- PostgreSQL, Redis, HashiCorp Vault, MinIO

## Called By

- Celery beat scheduler (daily)
- Super admin backup panel
