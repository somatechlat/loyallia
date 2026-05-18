# Loyallia Production -- Disaster Recovery Playbook

**Document ID:** LYL-C-DR-MASTER  
**Classification:** INTERNAL -- SRE ONLY  
**Last Updated:** 2026-05-18  
**Owner:** SRE On-Call  
**Review Cycle:** Quarterly  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Resilience Assessment](#2-current-resilience-assessment)
3. [Single Points of Failure](#3-single-points-of-failure)
4. [Incident Classification](#4-incident-classification)
5. [DR Procedures](#5-dr-procedures)
   - 5.1 Vault Sealed / Unavailable
   - 5.2 PostgreSQL Failure
   - 5.3 Redis Failure
   - 5.4 Complete Server Loss
   - 5.5 Code Deployment Failure / Rollback
   - 5.6 SSL Certificate Expiry
   - 5.7 Secret Compromise / Rotation
   - 5.8 API / Celery Crash Loop
   - 5.9 PostgreSQL Replica Recovery
   - 5.10 MinIO Object Storage Failure
6. [Backup Verification & Testing](#6-backup-verification--testing)
7. [Monitoring & Alerting Reference](#7-monitoring--alerting-reference)
8. [Recommendations](#8-recommendations)
9. [Appendices](#9-appendices)

---

## 1. Executive Summary

| Item | Status |
|------|--------|
| Server | `140.82.15.48` (rewards.loyallia.com) |
| Environment | Single-server Docker Compose deployment |
| Data Classification | PII (customer phone numbers, emails, financial) -- Ecuador LOPDP regulated |
| RTO Target | 4 hours (current capability: 2-8 hours depending on failure mode) |
| RPO Target | 24 hours (daily backups) -- **CURRENTLY NOT OPERATIONAL** |
| Last Verified Backup | **NEVER** -- backup cron is not installed |

### Critical Findings at a Glance

> **CRITICAL: The automated backup system is NOT running.**
> The `cron_setup.sh` references `deploy/disaster_recovery/backup.sh` which exists,
> but no `/etc/cron.d/loyallia*` cron file is installed and `/var/backups/loyallia`
> does not exist. The system has **never had a scheduled backup run**.

> **CRITICAL: API and all Celery workers are in a crash-restart loop.**
> The Vault secret path `loyallia/production` is missing `redis_url` and other
> required secrets. Only 4 of ~48 expected keys exist in Vault.

> **CRITICAL: PostgreSQL streaming replica is broken.**
> WAL segment `000000010000000000000005` has been removed from the primary's
> wal_archive. The replica has been failing WAL streaming for ~4 days.

> **CRITICAL: Secrets are stored in plaintext `.env` file.**
> The `.env` file contains VAULT_TOKEN, POSTGRES_PASSWORD, SECRET_KEY,
> MINIO_PASSWORD, and GOOGLE_OAUTH_CLIENT_SECRET in plaintext.

> **HIGH: No disaster recovery rescue files exist.**
> The `.agents/` directory containing `vault_init_rescue.json`,
> `vault_secrets_rescue.json`, and other rescue files does not exist.
> A complete data-loss scenario would require manual secret reconstruction.

---

## 2. Current Resilience Assessment

### 2.1 Component Health Matrix

| Component | Health Check | Restart Policy | Backup | DR Script | Current Status | Rating |
|-----------|-------------|----------------|--------|-----------|----------------|--------|
| **PostgreSQL** | `pg_isready` (10s/5retries) | `unless-stopped` | `pg_dump` daily script exists | `recover_from_rescue.sh` | Healthy | YELLOW |
| **PostgreSQL Replica** | `pg_isready` (10s/5retries) | `unless-stopped` | Same as primary | `recover_from_rescue.sh` | **Broken** -- WAL gap | RED |
| **Redis** | `redis-cli ping` (10s/5retries) | `unless-stopped` | `redis_backup.sh` (every 6h) | Manual RDB restore | Healthy | YELLOW |
| **Redis Sentinel** | None configured | `unless-stopped` | N/A | N/A | **Crash loop** -- missing `envsubst` | RED |
| **Vault** | HTTP /sys/health (10s/10retries) | `unless-stopped` | `vault_backup.sh` daily | `recover_from_rescue.sh` | Unsealed, healthy | YELLOW |
| **API** | `/api/v1/health/` (30s/5retries) | `unless-stopped` | N/A (stateless) | Rolling deploy/rollback | **Crash loop** -- missing secrets | RED |
| **Celery Workers** | `celery inspect ping` (30s/3retries) | `unless-stopped` | N/A (stateless) | Rolling deploy/rollback | **Crash loop** | RED |
| **Celery Beat** | `celery inspect ping` (30s/3retries) | `unless-stopped` | N/A (stateless) | Rolling deploy/rollback | **Crash loop** | RED |
| **Nginx** | None configured | `unless-stopped` | N/A (config in git) | Re-deploy container | Healthy | GREEN |
| **MinIO** | HTTP /minio/health/live (30s/3retries) | `unless-stopped` | `minio_backup.sh` daily | Mirror restore | Healthy | YELLOW |
| **Grafana** | None | `unless-stopped` | N/A | Re-deploy | **Crash loop** | RED |
| **Prometheus** | None | `unless-stopped` | N/A (metrics ephemeral) | Re-deploy | Healthy | GREEN |
| **Alertmanager** | None | `unless-stopped` | N/A | Re-deploy | Healthy | GREEN |
| **WhatsApp Bridge** | HTTP /health (30s/3retries) | `unless-stopped` | N/A | Re-deploy | Unhealthy (but running) | YELLOW |
| **Flower** | HTTP :5555 (30s/3retries) | `unless-stopped` | N/A | Re-deploy | **Crash loop** | RED |

### 2.2 Rating Legend

| Rating | Meaning |
|--------|---------|
| GREEN | Healthy, no immediate action needed |
| YELLOW | Functional but has gaps or concerns |
| RED | Broken, impaired, or requires immediate remediation |
| BLACK | Catastrophic failure -- full DR required |

---

## 3. Single Points of Failure

### Confirmed SPOFs

| # | SPOF | Impact | Severity | Mitigation Status |
|---|------|--------|----------|-------------------|
| 1 | **Single server** (`140.82.15.48`) | Complete outage if server fails (hardware, network, provider) | CRITICAL | None -- single VPS |
| 2 | **Vault single node** (file storage) | Vault auto-unseals from init.json, but if volume corrupts, all secrets lost | CRITICAL | Backup script exists but NOT scheduled |
| 3 | **Vault secrets** | Only 4/48 keys in `loyallia/production`. Missing `redis_url` causes API/Celery crash | CRITICAL | `.env` file has hardcoded fallbacks |
| 4 | **PostgreSQL primary** | No working replica (WAL gap). If primary fails, data loss from last backup | CRITICAL | Replica broken; pg_basebackup script exists |
| 5 | **Redis single node** | Sentinel configured but crash-looping. No auto-failover | HIGH | Redis restart recovers; data in AOF |
| 6 | **Nginx single instance** | No load balancer or second proxy | MEDIUM | Container restart is fast |
| 7 | **SSL cert expiry** | Cert expires 2026-07-21; auto-renewal via certbot.timer is enabled | LOW | Mitigated |
| 8 | **No rescue files** | If all volumes lost, cannot recover Vault secrets | CRITICAL | `.env` file has partial secrets |
| 9 | **No offsite backups** | All backups would be on same disk (/var/backups) | HIGH | No S3/offsite target configured |
| 10 | **Backup cron not installed** | No automated backups ever run | CRITICAL | Scripts exist; cron never configured |

---

## 4. Incident Classification

| Severity | Response Time | Examples |
|----------|---------------|----------|
| **P1 -- Critical** | 15 minutes | Complete outage, data loss, security breach, Vault sealed |
| **P2 -- High** | 1 hour | Component failure (PostgreSQL primary, Redis), replica broken, SSL expiry <7d |
| **P3 -- Medium** | 4 hours | Single container crash (Celery, Flower), monitoring down, non-critical health check fail |
| **P4 -- Low** | 24 hours | Log rotation, metrics gaps, non-essential monitoring |

---

## 5. DR Procedures

### 5.1 Vault Sealed / Unavailable

#### Detection
- Prometheus alert: `vault_up == 0` (if exporter configured)
- Health check: `docker inspect loyallia-vault --format '{{.State.Health.Status}}'`
- API logs show: `Vault key '<key>' missing` or connection refused

#### Severity: P1

#### Procedure

```bash
# 1. SSH to the server
ssh root@140.82.15.48

# 2. Check Vault status
docker exec loyallia-vault vault status

# 3. If Vault is SEALED, unseal it
cd /opt/loyallia

# Method A: Auto-unseal from init.json (Vault init script handles this)
docker compose restart vault vault-init

# Method B: Manual unseal with key from init.json
UNSEAL_KEY=$(docker exec loyallia-vault cat /vault/file/init.json | \
    python3 -c "import json,sys; print(json.load(sys.stdin)['unseal_keys_b64'][0])")
docker exec loyallia-vault vault operator unseal "$UNSEAL_KEY"

# 4. Verify unseal
docker exec loyallia-vault vault status
# Expected: Seal Type: shamir, Sealed: false

# 5. Check vault-init completed
docker compose logs vault-init --tail=5

# 6. Restart dependent services
docker compose restart api celery-pass celery-push celery-default celery-beat flower

# 7. Verify API health
curl -sf http://127.0.0.1:33905/api/v1/health/ && echo "API OK"
```

#### Root Cause Analysis
- Vault seals automatically after restart if `disable_mlock` is not set
- Server reboot causes Vault to seal
- The init.json exists in the vault_data Docker volume and contains the unseal key
- The `vault-init` container auto-unseals on startup

#### Prevention
- [ ] Enable Vault auto-unseal with cloud KMS (AWS KMS, GCP KMS) or Shamir with auto-unseal script
- [ ] Store init.json encrypted offsite
- [ ] Monitor Vault seal status continuously
- [ ] Consider Vault HA with Raft backend (requires 3 nodes)

---

### 5.2 PostgreSQL Failure

#### 5.2.1 Primary PostgreSQL Down

##### Detection
- Prometheus: `pg_up == 0`
- API health check: `/api/v1/health/ready/` returns 503, database check fails
- Container status: `docker ps` shows postgres restarting

##### Severity: P1

##### Procedure

```bash
# 1. Check PostgreSQL container logs
docker logs --tail 50 loyallia-postgres

# 2. Check disk space -- PostgreSQL refuses to start when disk is full
df -h /
# If >95% full: free space immediately (old logs, temp files)

# 3. If container is restarting, try explicit restart
docker compose restart postgres
sleep 10

# 4. Check if PostgreSQL is accepting connections
docker exec loyallia-postgres pg_isready -U loyallia -d loyallia

# 5. If corrupted data directory, restore from backup:
#    WARNING: This assumes you have a working backup.
#    CURRENTLY NO BACKUPS EXIST. This is a gap.

# Emergency: If data directory is corrupt, the ONLY recovery option
# currently is to use pg_basebackup from the replica (if it's caught up)
# or accept data loss and re-bootstrap.

# To check replica status:
docker logs --tail 20 loyallia-postgres-replica
```

##### 5.2.2 Restore from pg_dump Backup (Logical Restore)

```bash
# NOTE: As of 2026-05-18, NO BACKUPS HAVE EVER BEEN CREATED.
# This procedure is for AFTER the backup cron is fixed.

# 1. List available backups
ls -lt /var/backups/loyallia/pg/*.age 2>/dev/null || \
ls -lt /var/backups/postgresql/daily/*.dump 2>/dev/null

# 2. If encrypted, decrypt first
age -d -o /tmp/restore.dump /var/backups/loyallia/pg/loyallia_pg_YYYYMMDD_HHMMSS.dump.age

# 3. Stop the API and Celery workers to prevent writes
docker compose stop api celery-pass celery-push celery-default celery-beat

# 4. Restore the database
docker exec -i loyallia-postgres pg_restore \
    -U loyallia -d loyallia \
    --clean --if-exists \
    < /tmp/restore.dump

# 5. Restart services
docker compose start api celery-pass celery-push celery-default celery-beat

# 6. Verify
curl -sf http://127.0.0.1:33905/api/v1/health/ready/
```

##### 5.2.3 Restore from pg_basebackup (Physical Restore)

```bash
# 1. Stop PostgreSQL
docker compose stop postgres

# 2. Backup current data (in case we need to investigate)
docker run --rm -v loyallia_postgres_data:/data -v /tmp:/backup alpine \
    tar czf /backup/postgres_data_emergency_$(date +%Y%m%d).tar.gz -C /data .

# 3. Remove corrupted data
docker run --rm -v loyallia_postgres_data:/data alpine rm -rf /data/*

# 4. Restore from base backup
docker run --rm -v loyallia_postgres_data:/data -v /var/backups/postgresql/weekly:/backup alpine \
    sh -c 'cd /data && tar xzf /backup/base_YYYYMMDD_HHMMSS/base.tar.gz'

# 5. Create recovery signal
docker run --rm -v loyallia_postgres_data:/data alpine \
    touch /data/recovery.signal

# 6. Start PostgreSQL
docker compose start postgres
```

---

### 5.3 Redis Failure

#### Detection
- Prometheus: `redis_up == 0`
- API health: `/api/v1/health/ready/` shows cache check error
- Celery workers: will show broker connection errors

#### Severity: P2

#### Procedure

```bash
# 1. Check Redis container
docker logs --tail 30 loyallia-redis
docker exec loyallia-redis redis-cli -a "$(cat /run/loyallia-vault/redis_password)" ping

# 2. Restart Redis (data persists via AOF)
docker compose restart redis

# 3. If data directory is corrupt:
#    Backup then restore from RDB backup
docker compose stop redis

# Backup corrupt data
docker run --rm -v loyallia_redis_data:/data -v /tmp:/backup alpine \
    cp /data/appendonly.aof /backup/appendonly.aof.corrupt.$(date +%Y%m%d)

# Restore from backup
docker run --rm -v loyallia_redis_data:/data -v /var/backups/redis:/backup alpine \
    sh -c 'rm -f /data/appendonly.aof /data/dump.rdb && \
           gunzip -c /backup/dump_YYYYMMDD_HHMMSS.rdb.gz > /data/dump.rdb'

docker compose start redis
```

---

### 5.4 Complete Server Loss -- Rebuild from Zero

#### Severity: P1 -- Catastrophic

#### Prerequisites
- Access to server root password or SSH key
- `.env` file backup (contains critical secrets)
- Docker and Docker Compose installed on new server
- DNS A record pointing to new server IP

#### Procedure

```bash
# =============================================================================
# STEP 1: Provision New Server
# =============================================================================
# - Create VPS with >= 4 vCPU, 16GB RAM, 100GB SSD (matches current: 15GB RAM, 94GB disk)
# - Install Ubuntu 22.04 LTS
# - Install Docker: https://docs.docker.com/engine/install/ubuntu/
# - Install Docker Compose v2

# =============================================================================
# STEP 2: Clone Repository
# =============================================================================
git clone <repo-url> /opt/loyallia
cd /opt/loyallia

# =============================================================================
# STEP 3: Restore .env file (CRITICAL -- contains secrets)
# =============================================================================
# Option A: From backup
cp /secure/backup/.env /opt/loyallia/.env

# Option B: From password manager / offline storage
# Manually recreate using the 12 sections from the original

# =============================================================================
# STEP 4: Restore SSL Certificates
# =============================================================================
# Option A: Restore from Let's Encrypt backup
# The certs are at /etc/letsencrypt/live/rewards.loyallia.com/
# Run: certbot --nginx -d rewards.loyallia.com (fresh issuance)

# Option B: Copy from backup
mkdir -p /etc/letsencrypt/live/rewards.loyallia.com
cp /backup/cert.pem /etc/letsencrypt/live/rewards.loyallia.com/
cp /backup/privkey.pem /etc/letsencrypt/live/rewards.loyallia.com/
cp /backup/fullchain.pem /etc/letsencrypt/live/rewards.loyallia.com/
cp /backup/chain.pem /etc/letsencrypt/live/rewards.loyallia.com/

# =============================================================================
# STEP 5: Bootstrap Vault (Fresh -- ALL DATA LOST)
# =============================================================================
# If NO rescue files exist (current situation):
./deploy/bootstrap/bootstrap.sh
# This will:
#   - Generate new secrets
#   - Initialize Vault
#   - Create new init.json with new unseal keys
#   - Start all services

# IMMEDIATELY after bootstrap, create rescue files:
mkdir -p /opt/loyallia/.agents
chmod 0700 /opt/loyallia/.agents

# Extract init.json
docker cp loyallia-vault:/vault/file/init.json \
    /opt/loyallia/.agents/vault_init_rescue.json
chmod 0600 /opt/loyallia/.agents/vault_init_rescue.json

# Extract secrets
ROOT_TOKEN=$(cat /opt/loyallia/.agents/vault_init_rescue.json | \
    python3 -c "import json,sys; print(json.load(sys.stdin)['root_token'])")
docker exec -e VAULT_TOKEN="$ROOT_TOKEN" loyallia-vault \
    vault kv get -mount=secret -format=json loyallia/production \
    > /opt/loyallia/.agents/vault_secrets_rescue.json
chmod 0600 /opt/loyallia/.agents/vault_secrets_rescue.json

# =============================================================================
# STEP 6: If Rescue Files EXIST (from proper backup)
# =============================================================================
# Place rescue files in /opt/loyallia/.agents/ then:
./deploy/disaster_recovery/recover_from_rescue.sh

# =============================================================================
# STEP 7: Restore PostgreSQL from Backup
# =============================================================================
# If pg_dump backup exists:
docker compose stop api celery-pass celery-push celery-default celery-beat
docker exec -i loyallia-postgres pg_restore -U loyallia -d loyallia \
    --clean --if-exists < /backup/loyallia_pg_YYYYMMDD.dump
docker compose start api celery-pass celery-push celery-default celery-beat

# =============================================================================
# STEP 8: Restore MinIO Objects
# =============================================================================
# If MinIO backup exists:
docker run --rm --network loyallia_backend-net \
    -v /var/backups/minio/backup_TIMESTAMP:/backup \
    minio/mc:latest \
    sh -c "mc alias set local http://minio:9000 MINIO_USER MINIO_PASS && \
           mc mirror /backup/passes local/passes && \
           mc mirror /backup/assets local/assets"

# =============================================================================
# STEP 9: Verify
# =============================================================================
curl -sf http://127.0.0.1:33905/api/v1/health/          # Liveness
curl -sf http://127.0.0.1:33905/api/v1/health/ready/     # Readiness (200 or 503)
curl -sf http://127.0.0.1:33905/api/v1/health/celery/    # Celery workers

# Check all containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.State}}"

# =============================================================================
# STEP 10: Configure Backups (MUST DO)
# =============================================================================
# Create backup directory
mkdir -p /var/backups/loyallia/{pg,redis,minio,vault,certs,env,verify}
mkdir -p /var/log/loyallia/backups

# Install cron
./deploy/bootstrap/cron_setup.sh production

# Verify cron installed
cat /etc/cron.d/loyallia-backups
crontab -l | grep loyallia

# =============================================================================
# STEP 11: Configure Offsite Backup (RECOMMENDED)
# =============================================================================
# Set up S3 sync for backup directory
# aws s3 sync /var/backups/loyallia/ s3://loyallia-backups-$(date +%Y%m%d)/
```

---

### 5.5 Code Deployment Failure -- Rollback Procedure

#### Detection
- API health check fails after deployment
- Error rate alert fires: `HighApiErrorRate`
- Container shows `Restarting` status

#### Severity: P1 (if production down), P2 (if degraded)

#### Procedure

```bash
cd /opt/loyallia

# 1. Identify last known good commit
git log --oneline -10

# 2. Rollback to previous commit
git checkout <last-good-commit-hash>

# 3. Rebuild and redeploy with zero-downtime
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 4. Monitor the rolling update
docker compose logs -f api --tail=20

# 5. Verify health (poll until 200)
for i in {1..30}; do
    curl -sf http://127.0.0.1:33905/api/v1/health/ && echo "OK" && break
    sleep 5
done

# 6. If rollback fails, full restart:
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### Docker Compose Rolling Update Config (Already Configured)

All services have `update_config` with `order: start-first`, meaning the new
container starts before the old one stops, providing zero-downtime deployment.

```yaml
update_config:
  parallelism: 1
  delay: 30s
  order: start-first          # Zero-downtime
  failure_action: rollback     # Auto-rollback on failure
  monitor: 60s
  max_failure_ratio: 0.2
```

---

### 5.6 SSL Certificate Expiry

#### Detection
- Certbot auto-renewal: runs twice daily via `certbot.timer`
- Current cert expires: **2026-07-21 11:55:08 UTC**
- Prometheus: custom exporter can be added for `ssl_cert_expiry_timestamp`

#### Severity: P2 (if <7 days), P1 (if expired)

#### Procedure

```bash
# 1. Check current cert expiry
openssl x509 -in /etc/letsencrypt/live/rewards.loyallia.com/cert.pem \
    -noout -dates -subject

# 2. Manual renewal (if auto-renewal fails)
certbot renew --force-renewal

# 3. Verify renewal
openssl x509 -in /etc/letsencrypt/live/rewards.loyallia.com/cert.pem \
    -noout -dates

# 4. Nginx does NOT need restart (uses bind mount to host certs)
# The container reads /etc/letsencrypt via host mount
docker exec loyallia-nginx nginx -s reload

# 5. Verify HTTPS
curl -vI https://rewards.loyallia.com 2>&1 | grep -E "(SSL|subject|expire)"
```

#### Current Status
- `certbot.timer` is **active (enabled)** -- auto-renewal working
- Next trigger: ~9 hours from now
- No action needed unless certbot fails

---

### 5.7 Secret Compromise -- Rotate All Secrets

#### Trigger
- Suspected credential leak
- Employee departure with secret access
- Security incident / breach notification

#### Severity: P1

#### Procedure

```bash
cd /opt/loyallia

# =============================================================================
# STEP 1: Incident Report
# =============================================================================
python3 deploy/backups/breach_notification.py \
    --type secret_compromise \
    --severity critical \
    --description "Manual secret rotation triggered" \
    --affected-count 0

# =============================================================================
# STEP 2: Access Vault
# =============================================================================
ROOT_TOKEN=$(docker exec loyallia-vault cat /vault/file/init.json | \
    python3 -c "import json,sys; print(json.load(sys.stdin)['root_token'])")

# =============================================================================
# STEP 3: Rotate PostgreSQL Password
# =============================================================================
NEW_PG_PASS=$(openssl rand -base64 32)
docker exec -e VAULT_TOKEN="$ROOT_TOKEN" loyallia-vault \
    vault kv patch -mount=secret loyallia/production \
    database_password="$NEW_PG_PASS"

# Update PostgreSQL
docker exec loyallia-postgres psql -U loyallia -c \
    "ALTER USER loyallia WITH PASSWORD '$NEW_PG_PASS';"

# Update runtime file
docker exec loyallia-vault sh -c \
    "echo '$NEW_PG_PASS' > /run/loyallia-vault/postgres_password"

# =============================================================================
# STEP 4: Rotate Redis Password
# =============================================================================
NEW_REDIS_PASS=$(openssl rand -base64 32)
docker exec -e VAULT_TOKEN="$ROOT_TOKEN" loyallia-vault \
    vault kv patch -mount=secret loyallia/production \
    redis_url="redis://:$NEW_REDIS_PASS@redis:6379/0"

# Update Redis
docker exec loyallia-redis redis-cli -a "$(cat /run/loyallia-vault/redis_password)" \
    CONFIG SET requirepass "$NEW_REDIS_PASS"
docker exec loyallia-redis redis-cli -a "$NEW_REDIS_PASS" \
    CONFIG REWRITE

# Update runtime
docker exec loyallia-vault sh -c \
    "echo '$NEW_REDIS_PASS' > /run/loyallia-vault/redis_password"

# =============================================================================
# STEP 5: Rotate Django Secret Key
# =============================================================================
NEW_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
docker exec -e VAULT_TOKEN="$ROOT_TOKEN" loyallia-vault \
    vault kv patch -mount=secret loyallia/production \
    secret_key="$NEW_SECRET"

# =============================================================================
# STEP 6: Rotate MinIO Credentials
# =============================================================================
NEW_MINIO_USER="minioadmin-$(openssl rand -hex 4)"
NEW_MINIO_PASS=$(openssl rand -base64 32)
docker exec -e VAULT_TOKEN="$ROOT_TOKEN" loyallia-vault \
    vault kv patch -mount=secret loyallia/production \
    minio_root_user="$NEW_MINIO_USER" \
    minio_root_password="$NEW_MINIO_PASS"

# Update runtime
docker exec loyallia-vault sh -c \
    "echo '$NEW_MINIO_USER' > /run/loyallia-vault/minio_root_user && \
     echo '$NEW_MINIO_PASS' > /run/loyallia-vault/minio_root_password"

# Update MinIO (requires restart)
docker compose restart minio minio-init

# =============================================================================
# STEP 7: Restart All Services
# =============================================================================
docker compose restart api celery-pass celery-push celery-default celery-beat \
    flower pgbouncer redis

# =============================================================================
# STEP 8: Verify
# =============================================================================
curl -sf http://127.0.0.1:33905/api/v1/health/ready/
docker ps --format "table {{.Names}}\t{{.Status}}"

# =============================================================================
# STEP 9: Update .env file (it has stale secrets!)
# =============================================================================
# IMPORTANT: The .env file contains hardcoded secrets.
# After rotation, these values are STALE but still present.
# Secure the file:
chmod 0600 /opt/loyallia/.env
# Consider regenerating with new values or removing sensitive keys.
```

---

### 5.8 API / Celery Crash Loop

#### Current State (as of 2026-05-18)
- **API**: `Restarting (1) 7 seconds ago` -- missing `redis_url` secret
- **Celery workers**: All restarting -- same root cause
- **Flower**: Restarting -- same root cause
- **Grafana**: Restarting -- likely missing Vault secret for admin password

#### Root Cause
- Vault path `secret/loyallia/production` contains only 4 keys:
  - `database_password`, `minio_root_password`, `minio_root_user`, `secret_key`
- Missing: `redis_url`, `postgres_password`, `flower_basic_auth`, `google_oauth_client_id`, etc.
- The `.env` file contains the secrets, but API is configured to read from Vault

#### Immediate Fix

```bash
cd /opt/loyallia

# 1. Get root token
ROOT_TOKEN=$(docker exec loyallia-vault cat /vault/file/init.json | \
    python3 -c "import json,sys; print(json.load(sys.stdin)['root_token'])")

# 2. Check what's missing
VAULT_TOKEN=$ROOT_TOKEN docker exec -e VAULT_TOKEN="$ROOT_TOKEN" loyallia-vault \
    vault kv get -mount=secret -format=json loyallia/production | \
    python3 -c "import json,sys; d=json.load(sys.stdin); print(list(d.get('data',{}).get('data',{}).keys()))"

# 3. Populate missing secrets from .env (temporary fix)
# Extract values from .env and write to Vault
REDIS_PASS=$(grep POSTGRES_PASSWORD /opt/loyallia/.env | cut -d= -f2)  # .env has no redis_url
# Actually .env has no redis_url either -- need to construct it:

# The .env has:
# POSTGRES_PASSWORD=[REDACTED]
# SECRET_KEY=[REDACTED]
# MINIO_ROOT_USER=minioadmin
# MINIO_ROOT_PASSWORD=[REDACTED]
# FLOWER_BASIC_AUTH=admin:[REDACTED]
# GOOGLE_OAUTH_CLIENT_ID=REDACTED_SET_IN_DOT_ENV
# GOOGLE_OAUTH_CLIENT_SECRET=REDACTED_SET_IN_DOT_ENV

# Populate Vault with ALL missing secrets
docker exec -e VAULT_TOKEN="$ROOT_TOKEN" loyallia-vault \
    vault kv patch -mount=secret loyallia/production \
    postgres_password="[REDACTED]" \
    redis_url="redis://:[REDACTED]@redis:6379/0" \
    flower_basic_auth="admin:[REDACTED]" \
    google_oauth_client_id="${GOOGLE_OAUTH_CLIENT_ID}" \
    google_oauth_client_secret="${GOOGLE_OAUTH_CLIENT_SECRET}" \
    sentry_dsn="" \
    payment_gateway_base_url="https://checkout.placetopay.com" \
    payment_gateway_provider="bendo"

# 4. Also update runtime files
docker exec loyallia-vault sh -c '
    mkdir -p /vault/runtime /run/loyallia-vault
    echo "[REDACTED]" > /run/loyallia-vault/postgres_password
    echo "[REDACTED]" > /run/loyallia-vault/redis_password
    echo "minioadmin" > /run/loyallia-vault/minio_root_user
    echo "[REDACTED]" > /run/loyallia-vault/minio_root_password
'

# 5. Restart all affected services
docker compose restart api celery-pass celery-push celery-default celery-beat flower

# 6. Verify
sleep 15
docker ps --format "table {{.Names}}\t{{.Status}}"
curl -sf http://127.0.0.1:33905/api/v1/health/ && echo "API LIVENESS: OK"
curl -sf http://127.0.0.1:33905/api/v1/health/ready/ && echo "API READINESS: OK" || echo "API READINESS: DEGRADED"
```

---

### 5.9 PostgreSQL Replica Recovery

#### Current State (as of 2026-05-18)
- Replica is healthy per Docker but replication is broken
- WAL segment `000000010000000000000005` was removed from primary
- Replica logs: `FATAL: could not receive data from WAL stream`

#### Procedure -- Rebuild Replica from Scratch

```bash
cd /opt/loyallia

# 1. Stop the replica
docker compose stop postgres-replica

# 2. Remove old replica data
docker run --rm -v loyallia_postgres_replica_data:/data alpine rm -rf /data/*

# 3. Restart replica -- it will re-run pg_basebackup from entrypoint
docker compose up -d postgres-replica

# 4. Monitor replication startup
docker logs -f loyallia-postgres-replica

# 5. Verify replication
sleep 30
docker exec loyallia-postgres psql -U loyallia -d loyallia -c \
    "SELECT client_addr, state, sync_state, sent_lsn, flush_lsn FROM pg_stat_replication;"
# Should show the replica IP with state = 'streaming'

# 6. Verify replica is in hot standby
docker exec loyallia-postgres-replica psql -U loyallia -d loyallia -c \
    "SELECT pg_is_in_recovery();"  # Should return 't' (true)
```

---

### 5.10 MinIO Object Storage Failure

#### Detection
- Health check: `curl -f http://localhost:9000/minio/health/live`
- API errors: `MinIOException` when generating passes
- Prometheus: minio exporter (if configured)

#### Procedure

```bash
# 1. Check MinIO
docker logs --tail 20 loyallia-minio
docker exec loyallia-minio mc ready local

# 2. Restart
docker compose restart minio minio-init

# 3. If data corrupt -- restore from backup
docker compose stop minio

# Backup current (potentially corrupt)
docker run --rm -v loyallia_minio_data:/data -v /tmp:/backup alpine \
    tar czf /backup/minio_emergency_$(date +%Y%m%d).tar.gz -C /data .

# Restore from backup
docker run --rm -v loyallia_minio_data:/data -v /var/backups/minio:/backup alpine \
    sh -c 'rm -rf /data/* && cp -r /backup/passes /data/ && cp -r /backup/assets /data/'

docker compose start minio minio-init
```

---

## 6. Backup Verification & Testing

### 6.1 Current Backup Schedule (DESIGNED but NOT ACTIVE)

| Service | Script | Schedule | Retention | Status |
|---------|--------|----------|-----------|--------|
| PostgreSQL (logical) | `pg_dump_backup.sh` | Daily 02:00 | 30 days | **NOT RUNNING** |
| PostgreSQL (physical) | `pg_basebackup.sh` | Weekly Sun 03:00 | 4 weeks | **NOT RUNNING** |
| Redis | `redis_backup.sh` | Every 6 hours | 7 days | **NOT RUNNING** |
| MinIO | `minio_backup.sh` | Daily 04:00 | 30 days | **NOT RUNNING** |
| Vault | `vault_backup.sh` | Daily 05:00 | 31 days | **NOT RUNNING** |
| Verification | `verify_backups.sh` | Daily 06:00 | -- | **NOT RUNNING** |
| Unified | `disaster_recovery/backup.sh` | Daily 02:00 | 31 days | **NOT RUNNING** |

### 6.2 Fix Backup System (CRITICAL -- DO IMMEDIATELY)

```bash
cd /opt/loyallia

# 1. Create backup directories
mkdir -p /var/backups/loyallia/{pg,redis,minio,vault,certs,env,verify}
mkdir -p /var/backups/postgresql/{daily,weekly}
mkdir -p /var/backups/redis
mkdir -p /var/backups/minio
mkdir -p /var/backups/vault
mkdir -p /var/log/loyallia/backups
chmod 0750 /var/backups/loyallia
chmod 0750 /var/log/loyallia

# 2. Install cron
./deploy/bootstrap/cron_setup.sh production

# 3. Verify
ls -la /etc/cron.d/loyallia-backups
crontab -l

# 4. Run first backup manually
./deploy/disaster_recovery/backup.sh

# 5. Verify backup output
ls -laR /var/backups/loyallia/
```

### 6.3 Backup Verification Checklist

Run weekly:

```bash
# PostgreSQL
docker exec -i loyallia-postgres pg_restore --list \
    /var/backups/loyallia/pg/loyallia_pg_YYYYMMDD.dump > /dev/null && echo "PG backup OK"

# Redis
docker run --rm -v /var/backups/redis:/backup alpine \
    sh -c 'gunzip -t /backup/dump_YYYYMMDD.rdb.gz' && echo "Redis backup OK"

# Vault
docker exec loyallia-vault vault kv get -mount=secret loyallia/production \
    > /dev/null && echo "Vault backup OK"

# MinIO
docker run --rm -v /var/backups/minio:/backup alpine \
    ls -R /backup/loyallia_minio_YYYYMMDD/ && echo "MinIO backup OK"
```

---

## 7. Monitoring & Alerting Reference

### 7.1 Prometheus Targets

| Job | Target | Port | Endpoint |
|-----|--------|------|----------|
| postgres | postgres-exporter | 9187 | /metrics |
| redis | redis-exporter | 9121 | /metrics |
| api | api | 8000 | /api/v1/metrics/ |
| loki | loki | 3100 | /metrics |
| node | node-exporter | 9100 | /metrics |

### 7.2 Alert Rules (deploy/alerts/loyallia.yml)

| Alert | Expression | Severity | Action |
|-------|-----------|----------|--------|
| DiskSpaceLow | disk < 15% free | warning | Free disk space |
| DiskSpaceCritical | disk < 5% free | critical | Emergency cleanup |
| ContainerDown | up == 0 | critical | Restart container |
| HighCpuUsage | CPU > 85% for 10m | warning | Scale or investigate |
| HighMemoryUsage | Memory > 90% for 5m | warning | Investigate memory leak |
| HighApiErrorRate | 5xx rate > 5% for 5m | critical | Rollback deployment |
| SlowApiResponse | p95 > 2s for 5m | warning | Performance investigation |
| PostgreSQLDown | pg_up == 0 | critical | Section 5.2 |
| PostgreSQLHighConnections | > 80 connections | warning | Check connection pool |
| RedisDown | redis_up == 0 | critical | Section 5.3 |
| RedisHighMemory | > 90% of max | warning | Expire keys or scale |
| CeleryQueueBacklog | > 100 tasks for 10m | warning | Scale workers |
| BackupAgeStale | Backup > 48h old | critical | Section 6.2 |

### 7.3 Alertmanager Routing

| Severity | Receiver | Destination | Repeat |
|----------|----------|-------------|--------|
| default | default | admin@loyallia.com | 4h |
| warning | warning | admin@loyallia.com | 4h |
| critical | critical | admin@loyallia.com | 4h |

### 7.4 Grafana Dashboards

| URL | Purpose |
|-----|---------|
| http://localhost:33910 | Grafana UI (admin password in Vault) |
| http://localhost:33907 | Flower (Celery monitor, basic auth) |
| http://localhost:33909 | Prometheus UI |

---

## 8. Recommendations

### 8.1 CRITICAL -- Fix Immediately (This Week)

| # | Issue | Action | Effort |
|---|-------|--------|--------|
| 1 | **No backups running** | Run `cron_setup.sh production`, verify `/etc/cron.d/loyallia-backups` | 30 min |
| 2 | **Missing Vault secrets** | Populate all 48 secrets into `loyallia/production` using `.env` as source | 1 hour |
| 3 | **API/Celery crash loop** | After fixing secrets, restart all services | 15 min |
| 4 | **PostgreSQL replica broken** | Rebuild replica from scratch (Section 5.9) | 30 min |
| 5 | **No rescue files** | Run bootstrap rescue creation, store `.agents/` OFFSITE | 15 min |
| 6 | **`.env` has plaintext secrets** | chmod 0600, consider removing or encrypting | 15 min |
| 7 | **Redis Sentinel crash loop** | Install `envsubst` (gettext package) in sentinel image | 30 min |

### 8.2 HIGH -- Fix Within 2 Weeks

| # | Issue | Action | Effort |
|---|-------|--------|--------|
| 8 | **No offsite backups** | Configure S3 sync for `/var/backups/loyallia/` to AWS S3 / B2 / Wasabi | 2 hours |
| 9 | **Single server** | Evaluate multi-region or at least a hot standby server | 1-2 days |
| 10 | **Vault single node** | Deploy Vault with integrated Raft storage (3 nodes) for HA | 1 day |
| 11 | **No SSL cert expiry alert** | Add `ssl_cert_expiry_timestamp` metric to Prometheus | 1 hour |
| 12 | **Nginx has no health check** | Add HTTP health endpoint or TCP check to nginx container | 30 min |
| 13 | **Backup verification not automated** | Run `verify_backups.sh` after each backup, alert on failure | 30 min |
| 14 | **WAL archive disk usage** | Monitor `/var/lib/postgresql/data/wal_archive/` growth | 30 min |

### 8.3 MEDIUM -- Fix Within 1 Month

| # | Issue | Action | Effort |
|---|-------|--------|--------|
| 15 | **No automated replica failover** | Set up Patroni or repmgr for PostgreSQL auto-failover | 2 days |
| 16 | **Redis Sentinel not functional** | Fix Sentinel, configure automatic promotion | 4 hours |
| 17 | **Alertmanager only emails** | Add PagerDuty/OpsGenie webhook for critical alerts | 2 hours |
| 18 | **No load balancer** | Add a second Nginx or use a cloud LB for redundancy | 1 day |
| 19 | **Missing secret rotation procedure** | Automate periodic secret rotation (90-day policy) | 1 day |
| 20 | **No chaos engineering** | Run `docker kill` tests quarterly to validate recovery | Ongoing |

### 8.4 LOW -- Fix Within 3 Months

| # | Issue | Action | Effort |
|---|-------|--------|--------|
| 21 | **Vault auto-unseal** | Integrate with cloud KMS for true auto-unseal | 1 day |
| 22 | **PostgreSQL read replica** | Fix and use replica for read-heavy queries | 1 day |
| 23 | **Metrics for WhatsApp Bridge** | Add exporter for queue depth, connection status | 2 hours |
| 24 | **Log retention policy** | Automate Loki log rotation and archival | 2 hours |
| 25 | **Disaster recovery drill** | Schedule quarterly DR drill with full restore | 1 day |

---

## 9. Appendices

### Appendix A: Quick Reference -- On-Call Runbook

```
SERVER:     140.82.15.48 (root / see Bitwarden)
DOMAIN:     rewards.loyallia.com
REPO:       /opt/loyallia (git main)

HEALTH:
  curl http://127.0.0.1:33905/api/v1/health/         # Liveness
  curl http://127.0.0.1:33905/api/v1/health/ready/     # Readiness
  curl http://127.0.0.1:33905/api/v1/health/celery/    # Celery

VAULT:
  docker exec loyallia-vault vault status
  docker exec loyallia-vault vault kv list secret/
  docker exec loyallia-vault cat /vault/file/init.json  # Has root_token + unseal_keys

POSTGRESQL:
  docker exec loyallia-postgres pg_isready -U loyallia -d loyallia
  docker exec loyallia-postgres psql -U loyallia -c "SELECT count(*) FROM pg_stat_activity;"

REDIS:
  docker exec loyallia-redis redis-cli -a "$(cat /run/loyallia-vault/redis_password)" ping

LOGS:
  docker compose logs -f api --tail=20
  docker compose logs -f postgres --tail=20

RESTART:
  docker compose restart <service>
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Appendix B: Contact Information

| Role | Contact | Purpose |
|------|---------|---------|
| SRE On-Call | admin@loyallia.com | Infrastructure incidents |
| DPO | dpo@loyallia.com | Data breach, privacy incidents |
| Legal | legal@loyallia.com | Regulatory issues, LOPDP compliance |
| CTO | cto@loyallia.com | Escalation, architecture decisions |
| Incident Response | incident@loyallia.com | Security incidents |

### Appendix C: Regulatory Requirements (LOPDP)

Ecuador's LOPDP requires:
- **72-hour breach notification** to authorities (handled by `breach_notification.py`)
- Data encryption at rest and in transit
- Access logging and audit trails
- Data retention limits
- Right to erasure

### Appendix D: Resource Limits

| Service | Memory Limit | CPU Limit | Actual (current) |
|---------|-------------|-----------|-----------------|
| postgres | 1536M | 1.5 | Healthy |
| postgres-replica | 512M | 0.5 | Healthy (but replication broken) |
| redis | 512M | 0.5 | Healthy |
| api | 2048M | 2.0 | **Crash loop** |
| web | 2048M | 1.5 | Healthy |
| celery-pass | 384M | 0.5 | **Crash loop** |
| celery-push | 384M | 0.5 | **Crash loop** |
| celery-default | 384M | 0.5 | **Crash loop** |
| celery-beat | 192M | 0.25 | **Crash loop** |
| vault | 256M | 0.25 | Healthy |
| nginx | 256M | 0.5 | Healthy |
| minio | 512M | 0.5 | Healthy |
| prometheus | 512M | 0.5 | Healthy |
| grafana | 512M | 0.5 | **Crash loop** |
| loki | 256M | 0.25 | Healthy |

Total allocated: ~9.4GB of 12GB cluster limit (per docs)  
Actual server: 15GB RAM, 6.8GB free available

### Appendix E: File Locations

```
/opt/loyallia/
  docker-compose.yml              # Main compose file
  docker-compose.prod.yml         # Production overrides
  .env                            # Environment (PLAINTEXT SECRETS!)
  deploy/
    bootstrap/
      bootstrap.sh                # Full bootstrap
      cron_setup.sh               # Install backup cron
      generate_secrets.sh         # Generate .bootstrap_secrets.json
    backups/                      # Individual backup scripts
      pg_dump_backup.sh
      pg_basebackup.sh
      redis_backup.sh
      minio_backup.sh
      vault_backup.sh
      verify_backups.sh
      encrypt_backup.sh
      breach_notification.py
    disaster_recovery/            # Unified DR scripts
      backup.sh                   # Orchestrated all-in-one backup
      recover_from_rescue.sh      # Full recovery from .agents/
      verify_backups.sh
    alerts/
      loyallia.yml                # Prometheus alert rules
    alertmanager/
      alertmanager.yml            # Alert routing
    prometheus.yml                # Prometheus config
    vault.hcl                     # Vault server config
    nginx.conf                    # Nginx reverse proxy
    postgres/
      pg_hba.conf                 # PostgreSQL auth
      replica-entrypoint.sh       # Replica initialization
    redis/
      sentinel.conf               # Sentinel config (4 lines)
  certs/                          # Apple Wallet certs, Google SA JSON
  .agents/                        # RESCUE FILES (does NOT exist yet!)
    vault_init_rescue.json        ***REMOVED*** + root token
    vault_secrets_rescue.json     # All production secrets
```

### Appendix F: Secret Inventory

#### In Vault (`secret/loyallia/production`) -- Current State (2026-05-18)

| Key | Status | Notes |
|-----|--------|-------|
| database_password | Present |  |
| minio_root_password | Present |  |
| minio_root_user | Present |  |
| secret_key | Present |  |
| postgres_password | **MISSING** | Needed by runtime files |
| redis_url | **MISSING** | **Causes API/Celery crash** |
| flower_basic_auth | **MISSING** | Causes Flower crash |
| sentry_dsn | **MISSING** |  |
| google_oauth_client_id | **MISSING** |  |
| google_oauth_client_secret | **MISSING** |  |
| apple_cert_pem | **MISSING** |  |
| apple_cert_key_pem | **MISSING** |  |
| apple_wwdr_cert_pem | **MISSING** |  |
| google_service_account_json | **MISSING** |  |
| redis_password | **MISSING** | Needed by runtime |
| payment_gateway_base_url | **MISSING** |  |
| payment_gateway_provider | **MISSING** |  |

#### In `.env` (Plaintext -- 14 keys)

All secrets currently needed by the application are in `.env` but NOT in Vault.
This is why the API container starts (Django falls back to `.env`?) but then
crashes when trying to read from Vault.

---

*END OF DISASTER RECOVERY PLAYBOOK*

*This document should be reviewed quarterly and after every incident.*
*Store a printed copy in a secure offsite location.*
