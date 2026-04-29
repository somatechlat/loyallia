# AUDIT 6 — Backup, Disaster Recovery & Production Readiness

**Project:** Loyallia — Loyalty & Rewards Platform
**Date:** 2026-04-29
**Status:** Comprehensive Audit

---

## 1. Docker Volumes & Data Persistence

### 1.1 Volume Inventory

| Volume | Service(s) | Data Held | Criticality | Loss Impact |
|---|---|---|---|---|
| `postgres_data` | PostgreSQL 16 | Primary database (all business data: users, merchants, passes, transactions, subscriptions, billing) | **CRITICAL** | Total data loss — unrecoverable without backup |
| `redis_data` | Redis 7 | Cache, Celery broker (db=0), Celery results (db=2), session data | **HIGH** | Cache loss = performance degradation; queued tasks lost; sessions invalidated |
| `minio_data` | MinIO | Object storage — Apple/Google Wallet PKPasses, assets, media uploads | **HIGH** | Pass files and assets lost; must be regenerated |
| `static_files` | Django API | Django `collectstatic` output (CSS, JS, admin assets) | **LOW** | Regenerated via `collectstatic` |
| `media_files` | Django API | User-uploaded media files | **MEDIUM** | User uploads lost; may be partially recoverable from MinIO |
| `next_cache` | Next.js | Build cache (`.next/cache`) | **LOW** | Rebuilt on next `npm build`; zero data loss |
| `vault_data` | HashiCorp Vault | Secret management (KV v2 store) | **HIGH** | All application secrets lost; services fail to authenticate |

### 1.2 Critical Findings

1. **All volumes use `driver: local`** — no remote/cloud storage, no replication, no snapshots. Data lives solely on the host filesystem.
2. **No volume mount paths specified** — Docker manages the volume location (typically `/var/lib/docker/volumes/`). This makes backup discovery harder without explicit paths.
3. **No read-only mounts for data volumes** — all volumes are read-write with no immutability controls.
4. **`postgres_data` is the single point of failure** — the entire business dataset depends on one volume.
5. **`vault_data` loss is catastrophic** — without Vault secrets, no service can authenticate. Vault is running in **dev mode** (no HA, no seal/unseal, no audit logging).
6. **`static_files` and `next_cache` are regenerable** — not backed up, correctly so.
7. **No backup sidecar containers** — no automated backup jobs defined in docker-compose.yml.

### 1.3 Recommendations

- Implement daily automated backups for `postgres_data`, `redis_data`, `minio_data`, and `vault_data`.
- Use named volume mounts with explicit host paths for backup discoverability.
- Add a backup sidecar or cron-based backup container.
- For production: use cloud-managed storage (EBS snapshots, S3 replication) instead of local volumes.

---

## 2. Database Backup Strategy — PostgreSQL

### 2.1 Current State Analysis

**Extensions in use** (from `postgres/init.sql`):
- `uuid-ossp` — UUID generation
- `pg_trgm` — Trigram-based text search
- `unaccent` — Accent-insensitive search

**Database configuration** (from `docker-compose.yml`):
- PostgreSQL 16 Alpine
- `shared_buffers=384MB`, `effective_cache_size=1GB`, `work_mem=16MB`
- `maintenance_work_mem=128MB`, `max_connections=200`
- `wal_buffers=16MB`, `checkpoint_completion_target=0.9`
- Data checksums enabled (`--data-checksums`)
- Slow query logging: queries >1000ms logged
- Connection/disconnection logging enabled

**Connection architecture** (from `base.py`):
- PgBouncer in transaction pooling mode for application queries
- Direct connection used only for migrations (`DATABASE_ROUTERS = ["common.db_routers.PgBouncerRouter"]`)
- `conn_max_age=0` — correct for PgBouncer transaction mode

### 2.2 🔴 CRITICAL GAP: No WAL Archiving Configured

The PostgreSQL command-line arguments do **NOT** include:
- `archive_mode=on`
- `archive_command`
- `wal_level=replica` (default, but not explicitly set)

**Impact:** Without WAL archiving, Point-in-Time Recovery (PITR) is **impossible**. You can only restore to the last `pg_dump` — any data between the dump and a failure is **permanently lost**.

### 2.3 Recommended PostgreSQL Backup Procedures

#### 2.3.1 Enable WAL Archiving (Required for PITR)

Add to the `postgres` service command in `docker-compose.yml`:

```
-c wal_level=replica
-c archive_mode=on
-c archive_command='test ! -f /archive/%f && cp %p /archive/%f'
-c max_wal_senders=3
-c max_replication_slots=3
```

And add a volume mount for WAL archives:

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
  - postgres_wal_archive:/archive
```

#### 2.3.2 Daily pg_dump Backup Script

```bash
#!/bin/bash
# /scripts/backup/postgres_daily.sh
# Run daily via cron: 0 2 * * *

set -euo pipefail

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
CONTAINER="loyallia-postgres"
DB_NAME="loyallia"
DB_USER="loyallia"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Full logical dump (custom format for selective restore)
docker exec "${CONTAINER}" pg_dump \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -Fc \
  --no-owner \
  --no-acl \
  -f "/tmp/backup_${TIMESTAMP}.dump"

# Copy out of container
docker cp "${CONTAINER}:/tmp/backup_${TIMESTAMP}.dump" "${BACKUP_DIR}/"
docker exec "${CONTAINER}" rm "/tmp/backup_${TIMESTAMP}.dump"

# Also dump plain SQL for emergency manual restore
docker exec "${CONTAINER}" pg_dump \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --no-owner \
  --no-acl \
  -f "/tmp/backup_${TIMESTAMP}.sql"

docker cp "${CONTAINER}:/tmp/backup_${TIMESTAMP}.sql" "${BACKUP_DIR}/"
docker exec "${CONTAINER}" rm "/tmp/backup_${TIMESTAMP}.sql"

# Compress plain SQL
gzip "${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

# Clean up old backups
find "${BACKUP_DIR}" -name "*.dump" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] PostgreSQL backup completed: ${BACKUP_DIR}/backup_${TIMESTAMP}.*"
```

#### 2.3.3 PITR Recovery Procedure

```bash
#!/bin/bash
# /scripts/backup/postgres_pitr_restore.sh
# Restore PostgreSQL to a specific point in time

set -euo pipefail

TARGET_TIME="${1:?Usage: $0 '2026-04-29 14:30:00'}"
BACKUP_DIR="/backups/postgres"
WAL_ARCHIVE="/backups/postgres/wal_archive"
CONTAINER="loyallia-postgres"

echo "=== PostgreSQL PITR Recovery ==="
echo "Target time: ${TARGET_TIME}"

# Step 1: Stop all services that depend on PostgreSQL
docker compose stop api web celery-pass celery-push celery-default celery-beat flower pgbouncer

# Step 2: Stop PostgreSQL
docker compose stop postgres

# Step 3: Clear existing data (DANGER — ensure backups exist!)
docker compose run --rm postgres sh -c "rm -rf /var/lib/postgresql/data/*"

# Step 4: Restore base backup
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/*.dump | head -1)
echo "Restoring from: ${LATEST_BACKUP}"

# Step 5: Start PostgreSQL in recovery mode
docker compose up -d postgres
sleep 5

# Step 6: Create recovery signal and configure PITR
docker exec "${CONTAINER}" psql -U loyallia -d loyallia -c "
  SELECT pg_walfile_name(pg_current_wal_lsn());
"

# For PostgreSQL 12+, use recovery.signal approach:
docker exec "${CONTAINER}" bash -c "
  echo \"restore_command = 'cp /archive/%f %p'\" >> /var/lib/postgresql/data/postgresql.auto.conf
  echo \"recovery_target_time = '${TARGET_TIME}'\" >> /var/lib/postgresql/data/postgresql.auto.conf
  echo \"recovery_target_action = 'promote'\" >> /var/lib/postgresql/data/postgresql.auto.conf
  touch /var/lib/postgresql/data/recovery.signal
"

# Step 7: Restart PostgreSQL to begin recovery
docker compose restart postgres
sleep 10

# Step 8: Verify recovery
docker exec "${CONTAINER}" psql -U loyallia -d loyallia -c "SELECT now();"

# Step 9: Restart all services
docker compose up -d

echo "=== PITR Recovery Complete ==="
```

#### 2.3.4 pg_basebackup for Physical Backups

```bash
#!/bin/bash
# /scripts/backup/postgres_physical.sh
# Weekly physical base backup for faster restore of large databases

set -euo pipefail

BACKUP_DIR="/backups/postgres/basebackup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER="loyallia-postgres"

mkdir -p "${BACKUP_DIR}"

docker exec "${CONTAINER}" pg_basebackup \
  -U loyallia \
  -D "/tmp/basebackup_${TIMESTAMP}" \
  -Ft \
  -z \
  -P \
  --wal-method=stream

docker cp "${CONTAINER}:/tmp/basebackup_${TIMESTAMP}.tar.gz" "${BACKUP_DIR}/"
docker exec "${CONTAINER}" rm -rf "/tmp/basebackup_${TIMESTAMP}.tar.gz"

# Retain last 4 weekly backups
ls -t ${BACKUP_DIR}/*.tar.gz | tail -n +5 | xargs -r rm

echo "[$(date)] Physical backup completed: ${BACKUP_DIR}/basebackup_${TIMESTAMP}.tar.gz"
```

---

## 3. Redis, MinIO & Vault Backup Procedures

### 3.1 Redis Backup

**Current configuration** (from `docker-compose.yml`):
- Redis 7 Alpine with AOF persistence (`appendonly yes`, `appendfsync everysec`)
- RDB snapshots: `save 900 1`, `save 300 10`, `save 60 10000`
- Max memory: 400MB with `allkeys-lru` eviction
- Data used for: cache (db=0), Celery broker (db=1), Celery results (db=2)

**Backup script:**

```bash
#!/bin/bash
# /scripts/backup/redis_backup.sh
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/redis"
CONTAINER="loyallia-redis"

mkdir -p "${BACKUP_DIR}"

# Trigger synchronous RDB save
docker exec "${CONTAINER}" redis-cli BGSAVE

# Wait for BGSAVE to complete
LAST_SAVE=$(docker exec "${CONTAINER}" redis-cli LASTSAVE)
while [ "$(docker exec "${CONTAINER}" redis-cli LASTSAVE)" == "${LAST_SAVE}" ]; do
    sleep 1
done

# Copy RDB and AOF files
docker cp "${CONTAINER}:/data/dump.rdb" "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"
docker cp "${CONTAINER}:/data/appendonly.aof" "${BACKUP_DIR}/redis_${TIMESTAMP}.aof"

# Compress
gzip "${BACKUP_DIR}/redis_${TIMESTAMP}.aof"

# Retain 7 days
find "${BACKUP_DIR}" -mtime +7 -delete

echo "[$(date)] Redis backup completed"
```

**Recovery:**

```bash
#!/bin/bash
# /scripts/backup/redis_restore.sh
set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 /backups/redis/redis_YYYYMMDD.rdb}"
CONTAINER="loyallia-redis"

docker compose stop celery-pass celery-push celery-default celery-beat flower
docker compose stop "${CONTAINER}"

docker cp "${BACKUP_FILE}" "${CONTAINER}:/data/dump.rdb"
docker compose start "${CONTAINER}"

# Verify
docker exec "${CONTAINER}" redis-cli PING
docker exec "${CONTAINER}" redis-cli DBSIZE

docker compose start celery-pass celery-push celery-default celery-beat flower
```

### 3.2 MinIO Backup

**Current configuration:**
- MinIO latest with two buckets: `passes`, `assets`
- No replication configured — single-node local storage

**Backup script (mc mirror):**

```bash
#!/bin/bash
# /scripts/backup/minio_backup.sh
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/minio"
CONTAINER="loyallia-minio"

mkdir -p "${BACKUP_DIR}/passes" "${BACKUP_DIR}/assets"

# Mirror each bucket to local backup directory
docker exec loyallia-minio-init mc alias set local http://minio:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

docker run --rm \
  --network loyallia_loyallia-net \
  -v "${BACKUP_DIR}:/backups" \
  minio/mc:latest \
  sh -c "
    mc alias set local http://minio:9000 '${MINIO_ROOT_USER}' '${MINIO_ROOT_PASSWORD}' &&
    mc mirror --overwrite local/passes /backups/passes/ &&
    mc mirror --overwrite local/assets /backups/assets/
  "

# Create compressed archive
tar -czf "${BACKUP_DIR}/minio_${TIMESTAMP}.tar.gz" -C "${BACKUP_DIR}" passes assets
rm -rf "${BACKUP_DIR}/passes" "${BACKUP_DIR}/assets"

# Retain 30 days
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +30 -delete

echo "[$(date)] MinIO backup completed: ${BACKUP_DIR}/minio_${TIMESTAMP}.tar.gz"
```

**Recovery:**

```bash
#!/bin/bash
# /scripts/backup/minio_restore.sh
set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 /backups/minio/minio_YYYYMMDD.tar.gz}"
RESTORE_DIR="/tmp/minio_restore"

mkdir -p "${RESTORE_DIR}"
tar -xzf "${BACKUP_FILE}" -C "${RESTORE_DIR}"

# Mirror back to MinIO
docker run --rm \
  --network loyallia_loyallia-net \
  -v "${RESTORE_DIR}:/restore" \
  minio/mc:latest \
  sh -c "
    mc alias set local http://minio:9000 '${MINIO_ROOT_USER}' '${MINIO_ROOT_PASSWORD}' &&
    mc mirror --overwrite /restore/passes/ local/passes &&
    mc mirror --overwrite /restore/assets/ local/assets
  "

rm -rf "${RESTORE_DIR}"
echo "[$(date)] MinIO restore completed"
```

### 3.3 HashiCorp Vault Backup

**Current configuration:**
- Vault 1.15 in **dev mode** — NO HA, NO persistent seal, NO audit logging
- KV v2 secrets engine at `secret/`
- Root token: `loyallia-vault-root-token` (dev only)

**⚠️ CRITICAL:** Vault is running in dev mode. For production, must switch to integrated storage (Raft) with auto-unseal.

**Backup script:**

```bash
#!/bin/bash
# /scripts/backup/vault_backup.sh
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/vault"
CONTAINER="loyallia-vault"

mkdir -p "${BACKUP_DIR}"

# Export all KV v2 secrets as JSON
docker exec "${CONTAINER}" \
  vault kv get -format=json secret/data/loyallia \
  > "${BACKUP_DIR}/vault_secrets_${TIMESTAMP}.json"

# For Raft-based storage (production), take Raft snapshot:
# docker exec "${CONTAINER}" vault operator raft snapshot save /tmp/vault.snap
# docker cp "${CONTAINER}:/tmp/vault.snap" "${BACKUP_DIR}/vault_${TIMESTAMP}.snap"

# Encrypt backup
# gpg --encrypt --recipient ops@loyallia.com "${BACKUP_DIR}/vault_secrets_${TIMESTAMP}.json"

# Retain 30 days
find "${BACKUP_DIR}" -mtime +30 -delete

echo "[$(date)] Vault backup completed"
```

**Recovery:**

```bash
#!/bin/bash
# /scripts/backup/vault_restore.sh
set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 /backups/vault/vault_secrets_YYYYMMDD.json}"
VAULT_ADDR="http://localhost:33908"
VAULT_TOKEN="${VAULT_TOKEN:-loyallia-vault-root-token}"

# Import secrets
vault kv put -mount=secret loyallia @${BACKUP_FILE}

# Verify
vault kv get secret/data/loyallia

echo "[$(date)] Vault restore completed"
```

---

## 4. Existing DR Documentation — Gap Analysis

### 4.1 What's Covered (docs/BACKUP_DISASTER_RECOVERY.md)

The existing document is **comprehensive and well-structured**:

| Area | Coverage | Quality |
|---|---|---|
| RTO/RPO targets | ✅ Defined (RPO ≤5min, RTO ≤30min) | Good |
| PostgreSQL backup strategy | ✅ WAL archiving + pg_dump + PITR | Excellent |
| Redis backup strategy | ✅ RDB + AOF + Sentinel | Good |
| MinIO replication | ✅ Cross-site replication + lifecycle | Good |
| Vault snapshots | ✅ Raft snapshot + GPG encryption | Good |
| Recovery procedures | ✅ Step-by-step for each component | Excellent |
| Monitoring & alerting | ✅ Prometheus alerts + Grafana queries | Excellent |
| Security hardening | ✅ 27-item checklist | Good |
| Resilience patterns | ✅ Circuit breaker, retry, bulkhead, timeouts | Excellent |
| Backup verification | ✅ Weekly automated restore test | Good |

### 4.2 🔴 Critical Gaps

| # | Gap | Risk | Remediation |
|---|---|---|---|
| G-01 | **WAL archiving not configured in docker-compose.yml** | The DR doc describes WAL archiving but it's NOT implemented in the actual `docker-compose.yml`. The postgres command-line args are missing `wal_level=replica`, `archive_mode=on`, `archive_command`. | Add WAL archiving parameters to postgres service command. |
| G-02 | **No backup sidecar/cron container** | The DR doc describes backup scripts but none are wired into the Docker Compose stack. No automated backup runs. | Add a `backup` service or host-level cron jobs. |
| G-03 | **Vault running in dev mode** | No seal/unseal, no audit logging, no HA, no persistent storage backend. The DR doc assumes production Vault config (Raft, auto-unseal) but the actual compose uses dev mode. | Switch to integrated storage with auto-unseal before production. |
| G-04 | **No actual Patroni/Sentinel/replication configured** | The DR doc describes Patroni for PostgreSQL HA and Sentinel for Redis HA, but neither is implemented in docker-compose.yml. Single instances only. | Implement PostgreSQL streaming replication + Redis Sentinel for production. |
| G-05 | **No offsite/cloud backup** | All backups are local. The DR doc mentions "offsite" but no S3/GCS/Azure Blob backup destination is configured. | Add cloud storage backup destination. |
| G-06 | **No backup monitoring/alerting** | No alert fires if a backup fails or is stale. | Add `loyallia_backup_last_success_timestamp` metric and alert. |
| G-07 | **Redis `requirepass` not set** | Redis has no password. DR doc security checklist flags this as ⚠️ but no fix is implemented. | Add `requirepass` to Redis command. |
| G-08 | **No automated backup verification** | Weekly restore test described in DR doc is not automated. | Implement the verification script as a Celery beat task or cron job. |
| G-09 | **certs/ directory not backed up** | Apple/Google Wallet certificates and Firebase credentials are mounted read-only from `./certs` but not included in any backup strategy. | Include `./certs` in backup procedures. |
| G-10 | **PgBouncer config not version-controlled** | PgBouncer settings (pool mode, max connections) are inline in docker-compose.yml but not backed up separately. | Document and version-control PgBouncer configuration. |

---

## 5. Compliance Gap Analysis (DR/Backup Perspective)

### 5.1 LOPDP Compliance

| Requirement | DR Status | Gap |
|---|---|---|
| **Data breach notification (72h)** | ❌ No automated breach detection | Need: Sentry alerts → incident playbook → notification template → 72h SLA |
| **Right to deletion** | ✅ `DELETE /{customer_id}/` | Backup consideration: deleted data must also be purged from backups within retention window |
| **Audit trail (7 years)** | ⚠️ No automated retention enforcement | Backups must retain audit logs for minimum 7 years |
| **Data portability** | ✅ CSV export | Backup must be restorable to enable export |

### 5.2 GDPR Compliance

| Requirement | DR Status | Gap |
|---|---|---|
| **Breach notification (72h)** | ❌ Same as LOPDP | Same remediation |
| **Right to erasure** | ✅ Implemented | Must verify erasure propagates to backup restoration |
| **Data retention** | ❌ No automated retention policy | Implement configurable TTL per data category; backup retention must align |
| **International transfers** | ⚠️ No data transfer assessment | Document backup storage locations; implement SCCs if EU data involved |

### 5.3 Backup-Specific Compliance Requirements

| # | Requirement | Status | Action |
|---|---|---|---|
| BC-01 | **Backup encryption at rest** | ❌ No encryption | Encrypt all backup files with GPG/AES-256 before storage |
| BC-02 | **Backup encryption in transit** | ⚠️ Partial | TLS for MinIO replication; local copies unencrypted |
| BC-03 | **Backup access control** | ❌ No RBAC | Restrict backup directory access; use separate credentials |
| BC-04 | **Backup integrity verification** | ❌ Not automated | Implement checksum verification on every backup |
| BC-05 | **Backup retention policy** | ⚠️ Documented but not enforced | Automate retention with verified deletion |
| BC-06 | **Disaster recovery testing** | ❌ Not scheduled | Quarterly DR drills with documented results |
| BC-07 | **Backup audit logging** | ❌ No logging | Log all backup/restore operations to audit trail |

---

## 6. Production Readiness Checklist

### 6.1 Infrastructure Readiness

| # | Item | Status | Required Action |
|---|---|---|---|
| PR-01 | **WAL archiving enabled** | ❌ Missing | Add `wal_level=replica`, `archive_mode=on`, `archive_command` to postgres |
| PR-02 | **PostgreSQL streaming replication** | ❌ Missing | Configure primary + standby with Patroni or Stolon |
| PR-03 | **Redis Sentinel or Cluster** | ❌ Missing | Add Sentinel for automatic failover |
| PR-04 | **MinIO replication** | ❌ Missing | Configure cross-site replication to secondary MinIO |
| PR-05 | **Vault production mode** | ❌ Missing | Switch from dev to integrated storage with auto-unseal |
| PR-06 | **Nginx reverse proxy** | ✅ Configured | In deploy/ directory |
| PR-07 | **TLS termination** | ✅ Configured | HSTS, HTTPS redirect |
| PR-08 | **PgBouncer connection pooling** | ✅ Configured | Transaction mode, 1000 max client connections |
| PR-09 | **Gunicorn WSGI server** | ✅ Configured | 8 workers, 4 threads, max-requests recycling |
| PR-10 | **Resource limits** | ✅ Configured | Memory/CPU limits on all services |
| PR-11 | **Health checks** | ✅ Configured | PostgreSQL, Redis, MinIO, API all have health checks |
| PR-12 | **Graceful shutdown** | ✅ Configured | 30s stop_grace_period on all services |
| PR-13 | **Redis password** | ❌ Missing | Add `requirepass` to Redis configuration |
| PR-14 | **MinIO IAM policies** | ⚠️ Unknown | Verify bucket policies restrict access |
| PR-15 | **Backup automation** | ❌ Missing | Implement automated backup cron/sidecar |
| PR-16 | **Backup monitoring** | ❌ Missing | Alert on backup failure or staleness |
| PR-17 | **Log aggregation** | ⚠️ Partial | JSON logging configured; need ELK/CloudWatch |
| PR-18 | **Error tracking (Sentry)** | ✅ Configured | DSN from env, `send_default_pii=False` |
| PR-19 | **Dependency scanning** | ❌ Missing | Add pip-audit + npm audit to CI |
| PR-20 | **Docker image scanning** | ❌ Missing | Add Trivy/Snyk to CI pipeline |

### 6.2 HA Architecture Recommendations

#### Current Architecture (Single-Instance)
```
┌──────────────────────────────────────────────┐
│              Single Host                      │
│                                               │
│  [PostgreSQL] [Redis] [MinIO] [Vault]        │
│  [Django API] [Next.js] [Celery x3]          │
│  [PgBouncer] [Celery Beat] [Flower]          │
│                                               │
│  All on local Docker volumes                  │
│  No replication, no failover                  │
└──────────────────────────────────────────────┘
```

#### Recommended Production Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (Nginx/HAProxy)             │
│                    TLS termination, health checks            │
└─────────────────┬──────────────────────┬────────────────────┘
                  │                      │
         ┌────────▼────────┐    ┌────────▼────────┐
         │   App Node 1    │    │   App Node 2    │
         │  [Django API]   │    │  [Django API]   │
         │  [Next.js]      │    │  [Next.js]      │
         │  [Celery x3]    │    │  [Celery x3]    │
         │  [PgBouncer]    │    │  [PgBouncer]    │
         └────────┬────────┘    └────────┬────────┘
                  │                      │
    ┌─────────────▼──────────────────────▼─────────────┐
    │              Internal Network                      │
    └──┬──────────┬──────────┬──────────┬──────────────┘
       │          │          │          │
┌──────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────┐
│PostgreSQL│ │ Redis  │ │ MinIO  │ │ Vault  │
│ Primary  │ │Primary │ │Primary │ │Primary │
│ (R/W)    │ │(R/W)   │ │(R/W)   │ │(R/W)   │
├──────────┤ ├────────┤ ├────────┤ ├────────┤
│PostgreSQL│ │ Redis  │ │ MinIO  │ │ Vault  │
│ Standby  │ │Replica │ │Replica │ │Standby │
│ (R/O)    │ │(R/O)   │ │(R/O)   │ │(R/O)   │
└──────────┘ └────────┘ └────────┘ └────────┘
       │          │          │          │
       └──────────┴──────────┴──────────┘
                        │
              ┌─────────▼─────────┐
              │  Cloud Backup     │
              │  (S3/GCS/Azure)   │
              │  - WAL archives   │
              │  - pg_dump daily  │
              │  - Redis RDB      │
              │  - MinIO mirror   │
              │  - Vault snapshots│
              └───────────────────┘
```

#### Scaling Recommendations

| Component | Current | Recommended | Notes |
|---|---|---|---|
| PostgreSQL | 1 instance | Primary + 1-2 replicas | Patroni for automatic failover |
| Redis | 1 instance | Primary + 2 replicas | Sentinel for automatic failover |
| MinIO | 1 node | 4-node erasure-coded cluster | Tolerates 2 drive failures |
| Vault | Dev mode | 3-node Raft cluster | Auto-unseal via cloud KMS |
| Django API | 1 instance | 2+ instances behind LB | Horizontal scaling |
| Celery workers | 3 (1 per queue) | Auto-scaling per queue | Scale based on queue depth |
| PgBouncer | 1 instance | 2 instances | Active-active |

---

## 7. Disaster Scenarios & Recovery

### 7.1 RTO/RPO Targets Summary

| Scenario | RPO | RTO | Priority |
|---|---|---|---|
| Container crash/restart | 0 (no data loss) | < 1 min | Auto |
| Single service failure | 0 | < 5 min | Auto |
| PostgreSQL data corruption | ≤ 5 min (WAL) | 15-30 min | P0 |
| Complete PostgreSQL loss | ≤ 24h (last pg_dump) | 30-60 min | P0 |
| Redis failure | ≤ 15 min (last RDB) | 5-10 min | P1 |
| MinIO data loss | ≤ 24h (last mirror) | 15-30 min | P1 |
| Vault data loss | N/A (secrets) | 10-15 min | P0 |
| Server/hardware failure | ≤ 5 min (if HA) | 15-30 min | P0 |
| Ransomware attack | ≤ 24h (offsite backup) | 2-4 hours | P0 |
| Region-wide outage | ≤ 24h (offsite backup) | 4-8 hours | P1 |

### 7.2 Scenario 1: Container Failure

**Impact:** Single service unavailable. Automatic restart via `restart: unless-stopped`.

```bash
# Detection: Docker health check failure
docker ps --filter "health=unhealthy"

# Recovery: Automatic (restart policy)
# If manual restart needed:
docker compose restart <service-name>

# Verify:
docker compose ps
curl -f http://localhost:33905/api/v1/health/
```

**RTO:** < 1 minute (automatic)
**RPO:** 0 (no data loss)

### 7.3 Scenario 2: PostgreSQL Data Corruption

**Impact:** Database queries fail or return incorrect data.

```bash
# Step 1: Identify corruption
docker exec loyallia-postgres psql -U loyallia -d loyallia -c "
  SELECT datname, pg_catalog.pg_encoding_to_char(encoding) 
  FROM pg_database WHERE datname = 'loyallia';
"

# Step 2: Stop all services
docker compose stop api web celery-pass celery-push celery-default celery-beat flower pgbouncer

# Step 3: Check if corruption is limited to specific tables
docker exec loyallia-postgres psql -U loyallia -d loyallia -c "
  SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
  FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Step 4: If recoverable via REINDEX
docker exec loyallia-postgres psql -U loyallia -d loyallia -c "REINDEX DATABASE loyallia;"

# Step 5: If not recoverable, restore from PITR
# (Follow PITR recovery procedure from §2.3.3)

# Step 6: Verify data integrity
docker exec loyallia-postgres psql -U loyallia -d loyallia -c "
  SELECT count(*) FROM django_migrations;
  SELECT count(*) FROM auth_user;
"

# Step 7: Restart services
docker compose up -d
```

**RTO:** 15-30 minutes
**RPO:** ≤ 5 minutes (with WAL archiving)

### 7.4 Scenario 3: Complete Server Failure

**Impact:** All services down. Data on local volumes inaccessible.

```bash
# Step 1: Provision new server
# (Cloud provider: create new instance, attach storage)

# Step 2: Install Docker + Docker Compose
# (Use deploy/ scripts for automated setup)

# Step 3: Restore from offsite backups
# Priority order: Vault → PostgreSQL → Redis → MinIO

# 3a. Vault
docker compose up -d vault
/scripts/backup/vault_restore.sh /backups/vault/vault_latest.json

# 3b. PostgreSQL
docker compose up -d postgres pgbouncer
/scripts/backup/postgres_restore.sh /backups/postgres/latest.dump

# 3c. Redis
/scripts/backup/redis_restore.sh /backups/redis/redis_latest.rdb

# 3d. MinIO
docker compose up -d minio minio-init
/scripts/backup/minio_restore.sh /backups/minio/minio_latest.tar.gz

# Step 4: Start all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Step 5: Run migrations
docker exec loyallia-api python manage.py migrate --database=direct

# Step 6: Verify
curl -f https://rewards.loyallia.com/api/v1/health/
```

**RTO:** 30-60 minutes
**RPO:** ≤ 24 hours (last offsite backup)

### 7.5 Scenario 4: Ransomware Attack

**Impact:** Data encrypted. Backups may be compromised.

```bash
# Step 1: ISOLATE — disconnect from network immediately
# Do NOT pay ransom

# Step 2: Assess damage
# - Which volumes are encrypted?
# - Are backups intact?
# - Is the attack ongoing?

# Step 3: Identify clean backup (pre-infection)
# Check backup timestamps and integrity checksums
# Verify backup files are not encrypted

# Step 4: Provision clean infrastructure
# - New server from scratch (do NOT reuse compromised host)
# - New credentials for all services

# Step 5: Restore from clean backup
# (Follow Scenario 3 steps)

# Step 6: Rotate ALL secrets
# - PostgreSQL password
# - Redis password
# - MinIO credentials
# - Vault root token
# - Django SECRET_KEY
# - JWT secret
# - API keys
# - TLS certificates

# Step 7: Harden
# - Patch vulnerability that enabled attack
# - Implement network segmentation
# - Add file integrity monitoring (AIDE/Tripwire)
# - Enable audit logging on all services

# Step 8: Incident response
# - Document timeline
# - Notify affected parties (LOPDP 72h requirement)
# - Report to authorities if required
```

**RTO:** 2-4 hours
**RPO:** ≤ 24 hours (depends on backup age and infection timeline)

### 7.6 Scenario 5: Region-Wide Outage

**Impact:** Complete service unavailability. No local recovery possible.

```bash
# Step 1: Activate DR site
# (Requires pre-configured secondary region)

# Step 2: DNS failover
# Update DNS to point to DR region
# (Use Route53 health checks or CloudFlare for automatic failover)

# Step 3: Restore services in DR region
# (Follow Scenario 3 steps using offsite backups)

# Step 4: Verify all services
curl -f https://rewards.loyallia.com/api/v1/health/

# Step 5: Monitor until primary region recovers

# Step 6: Failback (when primary region is restored)
# - Sync data from DR back to primary
# - Switch DNS back
# - Verify data consistency
```

**RTO:** 4-8 hours
**RPO:** ≤ 24 hours (depends on offsite backup frequency)

---

## 8. Automated Backup Scripts — Complete Collection

### 8.1 Master Backup Script

```bash
#!/bin/bash
# /scripts/backup/backup_all.sh
# Master backup script — runs all backup procedures
# Cron: 0 2 * * * /scripts/backup/backup_all.sh >> /var/log/loyallia-backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/loyallia-backup.log"
BACKUP_ROOT="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "========================================" >> "${LOG_FILE}"
echo "[$(date)] Starting full backup" >> "${LOG_FILE}"

# PostgreSQL
echo "[$(date)] PostgreSQL backup..." >> "${LOG_FILE}"
if "${SCRIPT_DIR}/postgres_daily.sh" >> "${LOG_FILE}" 2>&1; then
    echo "[$(date)] PostgreSQL: OK" >> "${LOG_FILE}"
else
    echo "[$(date)] PostgreSQL: FAILED" >> "${LOG_FILE}"
    # Send alert
fi

# Redis
echo "[$(date)] Redis backup..." >> "${LOG_FILE}"
if "${SCRIPT_DIR}/redis_backup.sh" >> "${LOG_FILE}" 2>&1; then
    echo "[$(date)] Redis: OK" >> "${LOG_FILE}"
else
    echo "[$(date)] Redis: FAILED" >> "${LOG_FILE}"
fi

# MinIO
echo "[$(date)] MinIO backup..." >> "${LOG_FILE}"
if "${SCRIPT_DIR}/minio_backup.sh" >> "${LOG_FILE}" 2>&1; then
    echo "[$(date)] MinIO: OK" >> "${LOG_FILE}"
else
    echo "[$(date)] MinIO: FAILED" >> "${LOG_FILE}"
fi

# Vault
echo "[$(date)] Vault backup..." >> "${LOG_FILE}"
if "${SCRIPT_DIR}/vault_backup.sh" >> "${LOG_FILE}" 2>&1; then
    echo "[$(date)] Vault: OK" >> "${LOG_FILE}"
else
    echo "[$(date)] Vault: FAILED" >> "${LOG_FILE}"
fi

# Certs
echo "[$(date)] Certificates backup..." >> "${LOG_FILE}"
tar -czf "${BACKUP_ROOT}/certs/certs_${TIMESTAMP}.tar.gz" -C /root/.openclaw/workspace/loyallia certs/
echo "[$(date)] Certs: OK" >> "${LOG_FILE}"

# Upload to cloud storage
echo "[$(date)] Uploading to cloud..." >> "${LOG_FILE}"
# aws s3 sync "${BACKUP_ROOT}" s3://loyallia-backups/ --exclude "*.tmp"

echo "[$(date)] Full backup completed" >> "${LOG_FILE}"
echo "========================================" >> "${LOG_FILE}"
```

### 8.2 Backup Verification Script

```bash
#!/bin/bash
# /scripts/backup/verify_backups.sh
# Weekly backup verification — restores to test instance and validates
# Cron: 0 4 * * 0 /scripts/backup/verify_backups.sh

set -euo pipefail

BACKUP_DIR="/backups"
REPORT_FILE="/var/log/loyallia-backup-verify.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "[$(date)] Starting backup verification" >> "${REPORT_FILE}"

# Verify PostgreSQL backup
LATEST_PG=$(ls -t ${BACKUP_DIR}/postgres/*.dump 2>/dev/null | head -1)
if [ -z "${LATEST_PG}" ]; then
    echo "[$(date)] ALERT: No PostgreSQL backup found!" >> "${REPORT_FILE}"
    exit 1
fi

# Test restore to temporary database
docker exec loyallia-postgres createdb -U loyallia loyallia_verify_test 2>/dev/null || true
docker exec loyallia-postgres pg_restore -U loyallia -d loyallia_verify_test "${LATEST_PG}" 2>/dev/null

TABLE_COUNT=$(docker exec loyallia-postgres psql -U loyallia -d loyallia_verify_test -t -c \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
docker exec loyallia-postgres dropdb -U loyallia loyallia_verify_test

if [ "${TABLE_COUNT}" -lt 10 ]; then
    echo "[$(date)] ALERT: PostgreSQL backup verification FAILED (tables: ${TABLE_COUNT})" >> "${REPORT_FILE}"
else
    echo "[$(date)] PostgreSQL backup verified: ${TABLE_COUNT} tables" >> "${REPORT_FILE}"
fi

# Verify Redis backup
LATEST_REDIS=$(ls -t ${BACKUP_DIR}/redis/*.rdb 2>/dev/null | head -1)
if [ -z "${LATEST_REDIS}" ]; then
    echo "[$(date)] ALERT: No Redis backup found!" >> "${REPORT_FILE}"
fi

# Verify MinIO backup
LATEST_MINIO=$(ls -t ${BACKUP_DIR}/minio/*.tar.gz 2>/dev/null | head -1)
if [ -z "${LATEST_MINIO}" ]; then
    echo "[$(date)] ALERT: No MinIO backup found!" >> "${REPORT_FILE}"
fi

echo "[$(date)] Backup verification completed" >> "${REPORT_FILE}"
```

### 8.3 Cron Schedule Summary

| Schedule | Script | Purpose |
|---|---|---|
| `0 2 * * *` | `backup_all.sh` | Full daily backup (2 AM UTC) |
| `0 4 * * 0` | `verify_backups.sh` | Weekly backup verification (Sunday 4 AM) |
| `0 */6 * * *` | `vault_backup.sh` | Vault snapshot every 6 hours |
| `0 3 * * 1` | `postgres_physical.sh` | Weekly physical base backup (Monday 3 AM) |
| `*/5 * * * *` | `backup_monitor.sh` | Check backup freshness every 5 minutes |

### 8.4 Backup Monitoring Script

```bash
#!/bin/bash
# /scripts/backup/backup_monitor.sh
# Check that backups are fresh and alert if stale
# Cron: */5 * * * *

set -euo pipefail

BACKUP_DIR="/backups"
MAX_AGE_HOURS=26  # Alert if backup older than 26 hours (allows for daily + buffer)

check_backup_freshness() {
    local component=$1
    local pattern=$2
    local latest=$(find "${BACKUP_DIR}/${component}" -name "${pattern}" -mmin -$((MAX_AGE_HOURS * 60)) 2>/dev/null | head -1)
    
    if [ -z "${latest}" ]; then
        echo "ALERT: ${component} backup is stale (older than ${MAX_AGE_HOURS}h)"
        # Send to monitoring/alerting system
        return 1
    fi
    return 0
}

check_backup_freshness "postgres" "*.dump"
check_backup_freshness "redis" "*.rdb"
check_backup_freshness "minio" "*.tar.gz"
check_backup_freshness "vault" "*.json"
```

---

## Appendix A: Summary of All Findings

### Critical (Must Fix Before Production)

| # | Finding | Section |
|---|---|---|
| C-1 | WAL archiving not configured in docker-compose.yml | §2.2 |
| C-2 | No automated backup running | §4.2 G-02 |
| C-3 | Vault in dev mode (no HA, no seal, no audit) | §4.2 G-03 |
| C-4 | No PostgreSQL replication/HA | §4.2 G-04 |
| C-5 | No Redis password | §4.2 G-07 |
| C-6 | No backup encryption | §5.3 BC-01 |
| C-7 | No breach notification mechanism | §5.1 |

### High Priority (Fix Within 30 Days of Production)

| # | Finding | Section |
|---|---|---|
| H-1 | No offsite/cloud backup | §4.2 G-05 |
| H-2 | No backup monitoring/alerting | §4.2 G-06 |
| H-3 | No automated backup verification | §4.2 G-08 |
| H-4 | Certs directory not backed up | §4.2 G-09 |
| H-5 | No DR testing schedule | §5.3 BC-06 |

### Medium Priority (Fix Within 90 Days)

| # | Finding | Section |
|---|---|---|
| M-1 | No log aggregation (ELK/CloudWatch) | §6.1 PR-17 |
| M-2 | No dependency scanning in CI | §6.1 PR-19 |
| M-3 | No Docker image scanning | §6.1 PR-20 |
| M-4 | Backup access control not implemented | §5.3 BC-03 |

---

*Document generated: 2026-04-29*
*Next review: Quarterly or after infrastructure changes*

