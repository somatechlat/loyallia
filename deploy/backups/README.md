# Loyallia Backup & Disaster Recovery

## Backup Schedule

| Service | Script | Schedule | Retention | Type |
|---------|--------|----------|-----------|------|
| PostgreSQL (logical) | `pg_dump_backup.sh` | Daily at 02:00 | 30 days | pg_dump custom format |
| PostgreSQL (physical) | `pg_basebackup.sh` | Weekly (Sunday 03:00) | 4 weeks | pg_basebackup tar+gzip |
| Redis | `redis_backup.sh` | Every 6 hours | 7 days | BGSAVE + RDB copy |
| MinIO | `minio_backup.sh` | Daily at 04:00 | 30 days | mc mirror (passes, assets) |
| Vault | `vault_backup.sh` | Daily at 05:00 | 30 days | Raft snapshot |
| Verification | `verify_backups.sh` | Daily at 06:00 | — | Checks all backups exist |

## Cron Configuration

```cron
0 2 * * * /deploy/backups/pg_dump_backup.sh >> /var/log/backups/pg_dump.log 2>&1
0 3 * * 0 /deploy/backups/pg_basebackup.sh >> /var/log/backups/pg_basebackup.log 2>&1
0 */6 * * * /deploy/backups/redis_backup.sh >> /var/log/backups/redis.log 2>&1
0 4 * * * /deploy/backups/minio_backup.sh >> /var/log/backups/minio.log 2>&1
0 5 * * * /deploy/backups/vault_backup.sh >> /var/log/backups/vault.log 2>&1
0 6 * * * /deploy/backups/verify_backups.sh >> /var/log/backups/verify.log 2>&1
```

## Recovery Procedures

### PostgreSQL — Logical Restore (pg_dump)

```bash
# List available backups
ls -lh /var/backups/postgresql/daily/pg_dump_*.dump

# Restore full database
pg_restore -h postgres -U loyallia -d loyallia \
  --clean --if-exists \
  /var/backups/postgresql/daily/pg_dump_20260429_020000.dump

# Restore specific table only
pg_restore -h postgres -U loyallia -d loyallia \
  --table=members \
  /var/backups/postgresql/daily/pg_dump_20260429_020000.dump
```

### PostgreSQL — Physical Restore (pg_basebackup)

```bash
# Stop PostgreSQL
pg_ctl stop -D /var/lib/postgresql/data

# Replace data directory
rm -rf /var/lib/postgresql/data/*
tar xzf /var/backups/postgresql/weekly/base_20260427_030000/base.tar.gz \
  -C /var/lib/postgresql/data/

# Create recovery signal and restart
touch /var/lib/postgresql/data/recovery.signal
pg_ctl start -D /var/lib/postgresql/data
```

### Redis Restore

```bash
# Stop Redis
redis-cli shutdown

# Replace dump file
cp /var/backups/redis/dump_20260429_060000.rdb.gz /var/lib/redis/
gunzip /var/lib/redis/dump_20260429_060000.rdb.gz
mv /var/lib/redis/dump_20260429_060000.rdb /var/lib/redis/dump.rdb

# Start Redis
redis-server /etc/redis/redis.conf
```

### MinIO Restore

```bash
# Set alias
mc alias set local http://minio:9000 minioadmin minioadmin

# Mirror bucket back
mc mirror /var/backups/minio/passes/20260429_040000/ local/passes/
mc mirror /var/backups/minio/assets/20260429_040000/ local/assets/
```

### Vault Restore

```bash
# Restore Raft snapshot
curl -X PUT \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @/var/backups/vault/vault_20260429_050000.snap.gz \
  http://vault:8200/v1/sys/storage/raft/snapshot
```

## Verification

Run manually:

```bash
/deploy/backups/verify_backups.sh
cat /var/backups/verification_report.txt
```

The verification script checks:
- PostgreSQL backup exists and is < 25 hours old
- Redis backup exists
- MinIO backup directory is non-empty
- Vault backup exists

Returns exit code 1 if any issues found.

## Offsite / S3 Replication (Recommended)

For production, add S3 sync after each backup:

```bash
aws s3 sync /var/backups/ s3://loyallia-backups/ \
  --storage-class STANDARD_IA \
  --sse AES256
```

## Disaster Recovery RTO/RPO Targets

| Service | RPO | RTO |
|---------|-----|-----|
| PostgreSQL | 24h (logical) / 7d (physical) | 30 min |
| Redis | 6h | 5 min |
| MinIO | 24h | 15 min |
| Vault | 24h | 10 min |
