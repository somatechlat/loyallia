# Loyallia — Backup & Disaster Recovery Plan

**Document Version:** 1.0
**Last Updated:** 2026-04-29
**Owner:** Infrastructure & SRE Team
**Classification:** Internal — Confidential

---

## Table of Contents

1. [RTO/RPO Targets](#1-rtorpo-targets)
2. [PostgreSQL Backup Strategy](#2-postgresql-backup-strategy)
3. [Redis Backup Strategy](#3-redis-backup-strategy)
4. [MinIO Bucket Replication](#4-minio-bucket-replication)
5. [Vault Snapshot Automation](#5-vault-snapshot-automation)
6. [Step-by-Step Recovery Procedures](#6-step-by-step-recovery-procedures)
7. [Monitoring & Alerting Setup](#7-monitoring--alerting-setup)
8. [Security Hardening Checklist](#8-security-hardening-checklist)
9. [Resilience Patterns](#9-resilience-patterns)

---

## 1. RTO/RPO Targets

| Metric | Target | Justification |
|--------|--------|---------------|
| **RPO (Recovery Point Objective)** | **≤ 5 minutes** | WAL archiving provides point-in-time recovery to any second within the last 5 minutes. |
| **RTO (Recovery Time Objective)** | **≤ 30 minutes** | Automated failover for PostgreSQL (Patroni/Stolon). Manual recovery for Redis/MinIO. |
| **MTTR (Mean Time To Recover)** | **≤ 15 minutes** | For single-component failures with hot standby available. |
| **Data Durability** | **99.9999%** (six nines) | Multi-layer backups: WAL + daily pg_dump + weekly offsite. |
| **Availability Target** | **99.9%** (8.76 hours/year downtime) | Aligned with SaaS SLA tier. |

### Failure Scenarios & Recovery Times

| Scenario | Impact | Recovery Method | Est. Time |
|----------|--------|-----------------|-----------|
| Single PostgreSQL node failure | Read/write degraded | Patroni automatic failover | < 30s |
| PostgreSQL data corruption | Data loss | PITR from WAL archive | 10-15 min |
| Complete PostgreSQL cluster loss | Full outage | Restore from pg_dump + WAL | 20-30 min |
| Redis primary failure | Cache loss, session drop | Redis Sentinel failover | < 10s |
| Redis data corruption | Cache inconsistency | Restore RDB snapshot | 5-10 min |
| MinIO node failure | File storage degraded | MinIO erasure coding heals | Automatic |
| MinIO full cluster loss | Files unavailable | Restore from replication bucket | 15-30 min |
| Vault unsealed failure | Secrets inaccessible | Restore from snapshot + unseal | 10-15 min |
| Full region outage | Complete outage | Restore from offsite backups | 2-4 hours |

---

## 2. PostgreSQL Backup Strategy

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   PostgreSQL Cluster                      │
│                                                          │
│  ┌──────────┐    Streaming     ┌──────────┐             │
│  │ Primary  │ ──Replication──→ │ Standby  │             │
│  │ (R/W)    │    (sync/async)  │ (R/O)    │             │
│  └────┬─────┘                  └──────────┘             │
│       │                                                  │
│       │ WAL Archive                                      │
│       ▼                                                  │
│  ┌──────────────┐                                        │
│  │ WAL Archive  │  (S3/MinIO or local disk)              │
│  │ (continuous) │                                        │
│  └──────┬───────┘                                        │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐    ┌──────────────┐                    │
│  │ pg_dump      │    │ Offsite Copy │                    │
│  │ (daily)      │───→│ (weekly)     │                    │
│  └──────────────┘    └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 WAL Archiving (Continuous)

**Configuration in `postgresql.conf`:**

```ini
# WAL archiving — enables PITR (Point-in-Time Recovery)
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
archive_timeout = 60                    # Force WAL switch every 60s (max 60s data loss)

# Replication
max_wal_senders = 5
wal_keep_size = 2GB                     # Retain WAL for standby catch-up
hot_standby = on

# Recovery
restore_command = 'cp /archive/%f %p'   # For standby/recovery
```

**Archive destination:** MinIO bucket `pg-wal-archive` with lifecycle policy:
- Retain WAL segments for 7 days
- Transition to cold storage after 7 days
- Delete after 30 days

**Monitoring:**
```bash
# Check archive status
SELECT * FROM pg_stat_archiver;

# Verify no WAL segments are stuck
SELECT count(*) FROM pg_ls_waldir() WHERE modification < now() - interval '5 minutes';
```

### 2.3 pg_dump (Daily Logical Backup)

**Cron schedule: Daily at 2:00 AM UTC**

```bash
#!/bin/bash
# /opt/loyallia/scripts/pg_dump_daily.sh
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
BACKUP_FILE="${BACKUP_DIR}/loyallia_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

# Full logical dump with compression
pg_dump \
  --host="${PGHOST}" \
  --port="${PGPORT}" \
  --username="${PGUSER}" \
  --dbname="loyallia" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="${BACKUP_FILE}"

# Verify backup integrity
pg_restore --list "${BACKUP_FILE}" > /dev/null 2>&1

# Upload to MinIO offsite
mc cp "${BACKUP_FILE}" "minio/pg-backups/daily/$(basename ${BACKUP_FILE})"

# Cleanup local files older than retention
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[OK] PostgreSQL backup completed: ${BACKUP_FILE} ($(du -h ${BACKUP_FILE} | cut -f1))"
```

**Celery beat alternative (in Django):**

```python
# apps/infrastructure/tasks.py
from celery import shared_task
from django.core.management import call_command
import subprocess, os

@shared_task
def daily_pg_dump():
    """Daily PostgreSQL logical backup."""
    timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"/backups/postgres/loyallia_{timestamp}.dump"

    result = subprocess.run(
        [
            "pg_dump",
            "--host", os.environ["PGHOST"],
            "--username", os.environ["PGUSER"],
            "--dbname", "loyallia",
            "--format=custom",
            "--compress=9",
            "--file", backup_file,
        ],
        capture_output=True, text=True, timeout=3600,
    )

    if result.returncode != 0:
        raise RuntimeError(f"pg_dump failed: {result.stderr}")

    # Upload to MinIO
    from minio import Minio
    client = Minio(...)
    client.fput_object("pg-backups", f"daily/loyallia_{timestamp}.dump", backup_file)
```

### 2.4 Point-in-Time Recovery (PITR)

**To restore to a specific point in time:**

```bash
# 1. Stop PostgreSQL
systemctl stop postgresql

# 2. Move corrupted data directory
mv /var/lib/postgresql/15/main /var/lib/postgresql/15/main.corrupted

# 3. Restore base backup
pg_basebackup -h backup-host -D /var/lib/postgresql/15/main -X stream

# 4. Create recovery.signal
touch /var/lib/postgresql/15/main/recovery.signal

# 5. Configure recovery target in postgresql.conf
cat >> /var/lib/postgresql/15/main/postgresql.conf << EOF
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2026-04-29 07:30:00+00'
recovery_target_action = 'promote'
EOF

# 6. Start PostgreSQL (will replay WAL to target time)
systemctl start postgresql

# 7. Verify data integrity
psql -d loyallia -c "SELECT count(*) FROM loyallia_audit_log;"
```

### 2.5 Backup Verification

**Automated weekly restore test (every Sunday at 4:00 AM):**

```bash
#!/bin/bash
# /opt/loyallia/scripts/verify_pg_backup.sh
set -euo pipefail

LATEST_BACKUP=$(mc ls minio/pg-backups/daily/ | sort | tail -1 | awk '{print $NF}')
TEST_DB="loyallia_restore_test"

mc cp "minio/pg-backups/daily/${LATEST_BACKUP}" /tmp/verify.dump

# Restore to test database
createdb "${TEST_DB}"
pg_restore --dbname="${TEST_DB}" --verbose /tmp/verify.dump

# Verify critical tables
TABLE_COUNT=$(psql -d "${TEST_DB}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
AUDIT_COUNT=$(psql -d "${TEST_DB}" -t -c "SELECT count(*) FROM loyallia_audit_log;")

echo "[VERIFY] Tables: ${TABLE_COUNT}, Audit entries: ${AUDIT_COUNT}"

# Cleanup
dropdb "${TEST_DB}"
rm /tmp/verify.dump

# Alert if verification fails
if [ "${TABLE_COUNT}" -lt 10 ]; then
    echo "[ALERT] Backup verification failed: too few tables" | mail -s "BACKUP VERIFY FAILED" ops@loyallia.com
fi
```

---

## 3. Redis Backup Strategy

### 3.1 RDB Snapshots (Point-in-Time)

**Configuration in `redis.conf`:**

```ini
# RDB snapshots — periodic full snapshots
save 900 1       # Save if at least 1 key changed in 900 seconds (15 min)
save 300 10      # Save if at least 10 keys changed in 300 seconds (5 min)
save 60 10000    # Save if at least 10000 keys changed in 60 seconds (1 min)

dbfilename dump.rdb
dir /var/lib/redis

# Compression
rdbcompression yes
rdbchecksum yes
```

### 3.2 AOF (Append-Only File) — Durability

```ini
# AOF — logs every write operation for durability
appendonly yes
appendfsync everysec              # fsync every second (max 1s data loss)
auto-aof-rewrite-percentage 100   # Auto-rewrite when AOF doubles in size
auto-aof-rewrite-min-size 64mb

# Mixed persistence (RDB preamble + AOF tail)
aof-use-rdb-preamble yes
```

### 3.3 Backup Script

```bash
#!/bin/bash
# /opt/loyallia/scripts/redis_backup.sh
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/redis"

mkdir -p "${BACKUP_DIR}"

# Trigger a synchronous RDB save
redis-cli BGSAVE

# Wait for save to complete
while [ "$(redis-cli LASTSAVE)" == "${LAST_SAVE}" ]; do
    sleep 1
done

# Copy RDB file
cp /var/lib/redis/dump.rdb "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

# Copy AOF file
cp /var/lib/redis/appendonly.aof "${BACKUP_DIR}/redis_${TIMESTAMP}.aof"

# Upload to MinIO
mc cp "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb" "minio/redis-backups/rdb/"
mc cp "${BACKUP_DIR}/redis_${TIMESTAMP}.aof" "minio/redis-backups/aof/"

# Cleanup local files older than 7 days
find "${BACKUP_DIR}" -mtime +7 -delete

echo "[OK] Redis backup completed"
```

### 3.4 Redis Sentinel (High Availability)

```ini
# sentinel.conf
sentinel monitor loyallia-master 127.0.0.1 6379 2
sentinel down-after-milliseconds loyallia-master 5000
sentinel failover-timeout loyallia-master 10000
sentinel parallel-syncs loyallia-master 1
```

**Failover behavior:**
- Sentinel detects primary failure after 5 seconds
- Automatic failover to replica in ~10 seconds
- Django reconnects via `django-redis` automatically

---

## 4. MinIO Bucket Replication

### 4.1 Bucket Structure

```
minio/
├── passes/              # Wallet pass files (PKPass, Google Wallet)
├── assets/              # Uploaded assets (images, logos)
├── pg-backups/          # PostgreSQL backup archives
│   ├── daily/
│   └── weekly/
├── redis-backups/       # Redis RDB + AOF snapshots
│   ├── rdb/
│   └── aof/
└── pg-wal-archive/      # PostgreSQL WAL segments
```

### 4.2 Cross-Site Replication

```bash
# Set up remote MinIO as replication target
mc alias set primary http://minio-primary:9000 minioadmin minioadmin
mc alias set secondary http://minio-secondary:9000 minioadmin minioadmin

# Create replication rule for each bucket
mc replicate add primary/passes \
  --remote-bucket secondary/passes \
  --priority 1 \
  --storage-class STANDARD

mc replicate add primary/assets \
  --remote-bucket secondary/assets \
  --priority 1 \
  --storage-class STANDARD

mc replicate add primary/pg-backups \
  --remote-bucket secondary/pg-backups \
  --priority 1 \
  --storage-class STANDARD
```

### 4.3 Lifecycle Policies

```json
{
  "Rules": [
    {
      "ID": "pg-backup-lifecycle",
      "Status": "Enabled",
      "Filter": { "Prefix": "daily/" },
      "Expiration": { "Days": 30 }
    },
    {
      "ID": "pg-backup-transition",
      "Status": "Enabled",
      "Filter": { "Prefix": "daily/" },
      "Transition": { "Days": 7, "StorageClass": "GLACIER" }
    },
    {
      "ID": "wal-archive-cleanup",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "Expiration": { "Days": 30 }
    },
    {
      "ID": "redis-backup-cleanup",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "Expiration": { "Days": 14 }
    }
  ]
}
```

### 4.4 MinIO Erasure Coding

MinIO uses erasure coding by default (data split across drives with parity):
- Tolerates up to N/2 drive failures (where N = total drives)
- No separate RAID needed
- Automatic bit-rot detection and healing

---

## 5. Vault Snapshot Automation

### 5.1 Snapshot Schedule

```bash
#!/bin/bash
# /opt/loyallia/scripts/vault_snapshot.sh
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_FILE="/backups/vault/vault_${TIMESTAMP}.snap"

mkdir -p /backups/vault

# Take Raft snapshot (works for integrated storage backend)
vault operator raft snapshot save "${SNAPSHOT_FILE}"

# Encrypt snapshot with GPG
gpg --encrypt --recipient ops@loyallia.com "${SNAPSHOT_FILE}"
rm "${SNAPSHOT_FILE}"

# Upload encrypted snapshot to MinIO
mc cp "${SNAPSHOT_FILE}.gpg" "minio/vault-backups/"

# Cleanup local files older than 30 days
find /backups/vault -name "*.gpg" -mtime +30 -delete

echo "[OK] Vault snapshot completed: ${SNAPSHOT_FILE}.gpg"
```

**Cron schedule:** Every 6 hours (`0 */6 * * *`)

### 5.2 Vault HA Configuration

```hcl
# vault.hcl
storage "raft" {
  path    = "/vault/data"
  node_id = "vault-node-1"
}

listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/vault/tls/tls.crt"
  tls_key_file  = "/vault/tls/tls.key"
}

api_addr = "https://vault-1.loyallia.internal:8200"
cluster_addr = "https://vault-1.loyallia.internal:8201"

seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "alias/vault-unseal"
}
```

### 5.3 Vault Recovery

```bash
# 1. Install Vault on new host
# 2. Initialize with same key shares/threshold (or use auto-unseal)
# 3. Restore Raft snapshot
vault operator raft snapshot restore /backups/vault/vault_latest.snap.gpg

# 4. Verify secrets accessible
vault kv get secret/data/loyallia
```

---

## 6. Step-by-Step Recovery Procedures

### 6.1 PostgreSQL Recovery (Full Loss)

**Time estimate: 20-30 minutes**

```bash
# STEP 1: Assess the situation
# - Can the primary be recovered?
# - Is the standby intact?
# - Last successful backup timestamp?

# STEP 2: If standby exists, promote it
pg_ctlcluster 15 main promote

# STEP 3: If no standby, restore from backup
# 3a. Stop PostgreSQL
systemctl stop postgresql

# 3b. Download latest base backup
mc cp "minio/pg-backups/daily/loyallia_latest.dump" /tmp/restore.dump

# 3c. Create fresh data directory
pg_ctlcluster 15 main initdb

# 3d. Restore base backup
pg_restore --dbname=loyallia --verbose /tmp/restore.dump

# 3e. Apply WAL archives for PITR
# Configure restore_command in postgresql.conf

# 3f. Start PostgreSQL
systemctl start postgresql

# STEP 4: Verify data integrity
psql -d loyallia -c "SELECT count(*) FROM loyallia_audit_log;"
psql -d loyallia -c "SELECT max(created_at) FROM loyallia_audit_log;"

# STEP 5: Rebuild indexes if needed
psql -d loyallia -c "REINDEX DATABASE loyallia;"

# STEP 6: Update application connection strings
# Point PgBouncer to new primary

# STEP 7: Monitor for 30 minutes
watch -n 5 'psql -d loyallia -c "SELECT count(*) FROM pg_stat_activity;"'
```

### 6.2 Redis Recovery

**Time estimate: 5-10 minutes**

```bash
# STEP 1: If Sentinel is configured, automatic failover handles this
# Check sentinel status
redis-cli -p 26379 SENTINEL master loyallia-master

# STEP 2: If manual recovery needed
systemctl stop redis

# STEP 3: Restore RDB snapshot
mc cp "minio/redis-backups/rdb/redis_latest.rdb" /var/lib/redis/dump.rdb
chown redis:redis /var/lib/redis/dump.rdb

# STEP 4: Start Redis
systemctl start redis

# STEP 5: Verify
redis-cli DBSIZE
redis-cli PING

# STEP 6: Warm cache (optional)
# Django will repopulate cache on first requests
```

### 6.3 MinIO Recovery

**Time estimate: 15-30 minutes**

```bash
# STEP 1: If erasure-coded cluster, drives auto-heal
# Check cluster status
mc admin info primary

# STEP 2: If full cluster loss, restore from secondary
# 2a. Deploy new MinIO cluster
# 2b. Copy from secondary replication bucket
mc mirror secondary/passes primary/passes
mc mirror secondary/assets primary/assets
mc mirror secondary/pg-backups primary/pg-backups

# STEP 3: Verify file integrity
mc ls primary/passes/ | wc -l
mc ls primary/assets/ | wc -l

# STEP 4: Update application MINIO_ENDPOINT if changed
```

### 6.4 Vault Recovery

**Time estimate: 10-15 minutes**

```bash
# STEP 1: Deploy new Vault instance
# STEP 2: Initialize (if new cluster)
vault operator init -key-shares=5 -key-threshold=3

# STEP 3: Unseal
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>

# STEP 4: Restore snapshot
vault login <root-token>
vault operator raft snapshot restore /backups/vault/latest.snap.gpg

# STEP 5: Verify
vault kv get secret/data/loyallia
vault status

# STEP 6: Update VAULT_ADDR and VAULT_TOKEN in environment
```

### 6.5 Full Stack Recovery (Region Outage)

**Time estimate: 2-4 hours**

```bash
# PRIORITY ORDER: Vault → PostgreSQL → Redis → MinIO → Application

# 1. VAULT — Restore secrets first (other services depend on them)
# [Follow §6.4]

# 2. POSTGRESQL — Restore database
# [Follow §6.1]

# 3. REDIS — Restore cache/sessions
# [Follow §6.2]

# 4. MINIO — Restore file storage
# [Follow §6.3]

# 5. APPLICATION — Deploy and configure
# 5a. Deploy Docker containers
docker compose -f docker-compose.prod.yml up -d

# 5b. Run migrations (against direct DB, not PgBouncer)
python manage.py migrate --database=direct

# 5c. Verify health
curl -f https://rewards.loyallia.com/api/v1/health/

# 5d. Clear Celery task queues (prevent stale tasks)
celery -A loyallia purge -f

# 5e. Monitor logs
docker compose logs -f --tail=100
```

---

## 7. Monitoring & Alerting Setup

### 7.1 Health Check Endpoints

```python
# apps/api/health.py
from django.http import JsonResponse
from django.db import connection
from django_redis import get_redis_connection

def health_check(request):
    """Comprehensive health check for load balancers and monitoring."""
    checks = {}

    # PostgreSQL
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["postgres"] = "ok"
    except Exception as e:
        checks["postgres"] = f"error: {e}"

    # Redis
    try:
        redis = get_redis_connection("default")
        redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"

    # MinIO
    try:
        from storages.backends.s3boto3 import S3Boto3Storage
        storage = S3Boto3Storage()
        storage.exists("health-check-probe")
        checks["minio"] = "ok"
    except Exception as e:
        checks["minio"] = f"error: {e}"

    status = "healthy" if all(v == "ok" for v in checks.values()) else "degraded"
    http_status = 200 if status == "healthy" else 503

    return JsonResponse({
        "status": status,
        "checks": checks,
        "version": settings.APP_VERSION,
    }, status=http_status)
```

### 7.2 Prometheus Metrics

```yaml
# prometheus/alerts.yml
groups:
  - name: loyallia-database
    rules:
      - alert: PostgreSQLDown
        expr: pg_up == 0
        for: 30s
        labels: { severity: critical }
        annotations:
          summary: "PostgreSQL is DOWN"

      - alert: PostgreSQLReplicationLag
        expr: pg_replication_lag > 30
        for: 2m
        labels: { severity: warning }
        annotations:
          summary: "Replication lag > 30 seconds"

      - alert: PostgreSQLConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "PostgreSQL connections > 80% of max"

      - alert: RedisDown
        expr: redis_up == 0
        for: 30s
        labels: { severity: critical }
        annotations:
          summary: "Redis is DOWN"

      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Redis memory usage > 85%"

      - alert: MinIODown
        expr: minio_cluster_nodes_offline_total > 0
        for: 1m
        labels: { severity: critical }
        annotations:
          summary: "MinIO node(s) offline"

      - alert: BackupFailed
        expr: loyallia_backup_last_success_timestamp < (time() - 86400)
        for: 1h
        labels: { severity: critical }
        annotations:
          summary: "No successful backup in > 24 hours"

      - alert: WALArchiveStuck
        expr: pg_stat_archiver_failed_count > 0
        for: 5m
        labels: { severity: critical }
        annotations:
          summary: "WAL archiving has failures"

  - name: loyallia-application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Error rate > 5%"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "P95 latency > 2 seconds"

      - alert: CeleryQueueBacklog
        expr: celery_tasks_pending > 1000
        for: 10m
        labels: { severity: warning }
        annotations:
          summary: "Celery queue backlog > 1000 tasks"

      - alert: RateLimitHitsHigh
        expr: rate(rate_limit_exceeded_total[5m]) > 10
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "High rate of rate limit violations (possible attack)"
```

### 7.3 Grafana Dashboard Queries

```promql
# Request rate by endpoint
sum(rate(http_requests_total[5m])) by (path)

# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# P50/P95/P99 latency
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Database connections
pg_stat_activity_count

# Redis hit rate
redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) * 100

# Backup age (seconds since last success)
time() - loyallia_backup_last_success_timestamp
```

### 7.4 Alert Routing

| Severity | Channel | Response Time |
|----------|---------|---------------|
| **Critical** (service down) | PagerDuty + Slack #incidents | 5 minutes |
| **Warning** (degraded) | Slack #alerts | 30 minutes |
| **Info** (metrics) | Grafana dashboard | Next business day |

---

## 8. Security Hardening Checklist

### 8.1 Infrastructure

| # | Item | Status | Notes |
|---|------|--------|-------|
| H-01 | All services behind Nginx reverse proxy | ✅ | No direct access to Django/Next.js |
| H-02 | TLS 1.2/1.3 only | ✅ | Configured in `rewards.loyallia.com.conf` |
| H-03 | HSTS with preload | ✅ | `max-age=63072000; includeSubDomains` |
| H-04 | HTTP → HTTPS redirect | ✅ | Port 80 returns 301 |
| H-05 | Security headers (CSP, X-Frame, etc.) | ✅ | All configured in Nginx |
| H-06 | Secrets in Vault (not env files) | ✅ | `common/vault.py` with env fallback |
| H-07 | DEBUG=False in production | ✅ | Enforced in `production.py` |
| H-08 | Database not publicly accessible | ⚠️ | Verify firewall rules |
| H-09 | Redis password protected | ⚠️ | Verify `requirepass` in redis.conf |
| H-10 | MinIO with IAM policies | ⚠️ | Verify bucket policies restrict public access |

### 8.2 Application

| # | Item | Status | Notes |
|---|------|--------|-------|
| H-11 | Argon2 password hashing | ✅ | `PASSWORD_HASHERS` configured |
| H-12 | JWT secret separate from Django SECRET_KEY | ✅ | `JWT_SECRET_KEY` separate config |
| H-13 | Refresh token rotation | ✅ | B-002: Single-use, revoked after use |
| H-14 | Account lockout after failed attempts | ✅ | `record_failed_login()` with lockout |
| H-15 | Rate limiting on all endpoints | ✅ | Redis-backed middleware |
| H-16 | CSRF protection | ✅ | Django middleware + secure cookie |
| H-17 | CORS restricted origins | ✅ | `CORS_ALLOWED_ORIGINS` from env |
| H-18 | No raw SQL queries | ✅ | ORM-only throughout |
| H-19 | File upload size limits | ✅ | 5MB limit enforced |
| H-20 | Webhook signature verification | ✅ | HMAC on payment webhook |

### 8.3 Operational

| # | Item | Status | Notes |
|---|------|--------|-------|
| H-21 | Automated security updates | ⚠️ | Verify unattended-upgrades configured |
| H-22 | Log rotation | ⚠️ | Verify logrotate for all log files |
| H-23 | SSH key-only access | ⚠️ | Verify PasswordAuthentication no |
| H-24 | Firewall (UFW/iptables) | ⚠️ | Verify only 22, 80, 443 open |
| H-25 | Docker image scanning | ⚠️ | Add Trivy/Snyk to CI |
| H-26 | Dependency vulnerability scanning | ⚠️ | Add pip-audit / npm audit to CI |
| H-27 | Regular penetration testing | ⚠️ | Schedule quarterly pen tests |

---

## 9. Resilience Patterns

### 9.1 Circuit Breaker (External Services)

**Implementation for payment gateway and external API calls:**

```python
# common/circuit_breaker.py
import time
from enum import Enum
from django.core.cache import cache

class CircuitState(Enum):
    CLOSED = "closed"       # Normal operation
    OPEN = "open"           # Failing, reject requests
    HALF_OPEN = "half_open" # Testing recovery

class CircuitBreaker:
    def __init__(self, name, failure_threshold=5, recovery_timeout=60):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.cache_key = f"circuit:{name}"

    def _get_state(self):
        data = cache.get(self.cache_key)
        if data is None:
            return CircuitState.CLOSED, 0, 0
        return CircuitState(data["state"]), data["failures"], data["last_failure"]

    def can_execute(self):
        state, failures, last_failure = self._get_state()
        if state == CircuitState.CLOSED:
            return True
        if state == CircuitState.OPEN:
            if time.time() - last_failure > self.recovery_timeout:
                # Transition to half-open
                cache.set(self.cache_key, {
                    "state": CircuitState.HALF_OPEN.value,
                    "failures": failures,
                    "last_failure": last_failure,
                }, self.recovery_timeout * 2)
                return True
            return False
        return True  # HALF_OPEN: allow one test request

    def record_success(self):
        cache.delete(self.cache_key)

    def record_failure(self):
        state, failures, _ = self._get_state()
        failures += 1
        new_state = CircuitState.OPEN if failures >= self.failure_threshold else CircuitState.CLOSED
        cache.set(self.cache_key, {
            "state": new_state.value,
            "failures": failures,
            "last_failure": time.time(),
        }, self.recovery_timeout * 2)
```

**Usage in payment gateway:**

```python
# apps/billing/payment_gateway.py
from common.circuit_breaker import CircuitBreaker

payment_circuit = CircuitBreaker("payment_gateway", failure_threshold=3, recovery_timeout=120)

def process_payment(amount, token):
    if not payment_circuit.can_execute():
        raise ServiceUnavailableError("Payment gateway temporarily unavailable")

    try:
        result = gateway.charge(amount, token)
        payment_circuit.record_success()
        return result
    except GatewayError:
        payment_circuit.record_failure()
        raise
```

### 9.2 Retry with Exponential Backoff

**For transient failures (network timeouts, 503s):**

```python
# common/retry.py
import time
import random
from functools import wraps

def retry_with_backoff(max_retries=3, base_delay=1.0, max_delay=30.0, exceptions=(Exception,)):
    """Decorator for retry with exponential backoff and jitter."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_retries:
                        delay = min(base_delay * (2 ** attempt) + random.uniform(0, 1), max_delay)
                        time.sleep(delay)
            raise last_exception
        return wrapper
    return decorator

# Usage
@retry_with_backoff(max_retries=3, base_delay=2.0, exceptions=(ConnectionError, TimeoutError))
def send_email(to, subject, body):
    # SMTP connection with retry
    pass
```

**For Celery tasks:**

```python
@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def send_notification_task(self, notification_id):
    # Task with automatic retry
    pass
```

### 9.3 Bulkhead Pattern (Resource Isolation)

**Celery queue isolation (already implemented):**

```python
# In base.py — CELERY_TASK_ROUTES
CELERY_TASK_ROUTES = {
    "apps.customers.tasks.*": {"queue": "pass_generation"},     # Isolated queue
    "apps.notifications.tasks.*": {"queue": "push_delivery"},   # Isolated queue
    "apps.automation.tasks.*": {"queue": "default"},
    "*": {"queue": "default"},
}
```

**Database connection pool isolation:**

```python
# PgBouncer pool configuration
# Separate pools for different workloads
DATABASES = {
    "default": {  # Transaction pool for API requests
        "CONN_MAX_AGE": 0,       # Required for PgBouncer transaction mode
        "POOL_SIZE": 20,
    },
    "direct": {   # Direct connection for migrations/long-running queries
        "CONN_MAX_AGE": 0,
    },
}
```

**Process-level isolation (Docker):**

```yaml
# docker-compose.prod.yml
services:
  django-api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  celery-worker-default:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  celery-worker-pass-generation:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  celery-worker-push-delivery:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### 9.4 Timeout Configuration

| Component | Timeout | Notes |
|-----------|---------|-------|
| Nginx → Django | 30s | `proxy_read_timeout` |
| Django request | 30s | Gunicorn `--timeout 30` |
| Celery hard limit | 300s (5 min) | `CELERY_TASK_TIME_LIMIT` |
| Celery soft limit | 240s (4 min) | Triggers `SoftTimeLimitExceeded` |
| PostgreSQL query | 30s | `statement_timeout` |
| Redis operation | 5s | `socket_timeout` |
| External HTTP (payment) | 10s | `httpx.timeout(10.0)` |
| Vault API | 5s | `urllib.request.urlopen(req, timeout=5)` |
| Google OAuth | 10s | `httpx.get(..., timeout=10.0)` |

### 9.5 Graceful Degradation

| Dependency | Degradation Strategy |
|------------|---------------------|
| **Redis down** | Rate limiter fails open (allows requests). Cache misses hit PostgreSQL. Sessions use JWT (stateless). |
| **MinIO down** | Existing wallet passes still work (cached on device). New pass generation queued for retry. |
| **Payment gateway down** | Circuit breaker rejects requests. Subscription changes queued. Existing subscriptions continue. |
| **Email/SMS down** | OTPs stored in Redis (retrievable via API). Notifications queued for retry. |
| **Celery broker down** | Tasks lost (non-critical: QR generation, analytics). Critical paths (auth) are synchronous. |
| **Vault down** | Secrets cached in process memory (`@lru_cache`). Services continue with cached secrets until restart. |

---

## Appendix: Backup Verification Schedule

| Backup Type | Frequency | Verification | Retention |
|-------------|-----------|--------------|-----------|
| PostgreSQL WAL | Continuous | Monitor `pg_stat_archiver` | 30 days |
| PostgreSQL pg_dump | Daily 2:00 AM | Weekly restore test | 30 days local, 90 days offsite |
| Redis RDB | Every 15 min | Redis `BGSAVE` success | 7 days |
| Redis AOF | Every second | AOF rewrite monitoring | 7 days |
| MinIO replication | Continuous | `mc replicate status` | Match source |
| Vault snapshot | Every 6 hours | Restore test quarterly | 30 days |

---

*This document should be reviewed quarterly and after any infrastructure change.*
*Next review: 2026-07-29*
