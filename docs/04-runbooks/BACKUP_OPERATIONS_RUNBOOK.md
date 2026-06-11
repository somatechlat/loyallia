# Loyallia — Backup Operations Runbook

**Document Version:** 2.0  
**Last Updated:** 2026-06-03  
**Owner:** Infrastructure & SRE Team  
**Classification:** Internal — Operational

---

## Table of Contents

1. [Daily Operations](#1-daily-operations)
2. [Weekly Operations](#2-weekly-operations)
3. [Monthly DR Drill](#3-monthly-dr-drill)
4. [Quarterly Operations](#4-quarterly-operations)
5. [Incident Response](#5-incident-response)
6. [Command Reference](#6-command-reference)

---

## 1. Daily Operations

### 1.1 Verify Backup Succeeded

Run the unified verification command:

```bash
./deploy/backups/backup --verify
```

**Expected output (development):**
```
════════════════════════════════════════════════════════════
  Backup Verification
════════════════════════════════════════════════════════════

postgres: OK (loyallia_20260603_020000.sql.age, 2h old)
redis: OK (dump_20260603_020000.rdb.age, 2h old)
vault: OK (vault_20260603_020000.tar.gz.age, 2h old)
minio: OK (minio_20260603_020000.tar.gz.age, 2h old)

Age decryption test: OK

All backups verified OK
```

**Expected output (production):**
```
════════════════════════════════════════════════════════════
  BACKUP VERIFICATION
════════════════════════════════════════════════════════════

PostgreSQL: OK (loyallia_20260603_020000.sql.age, 2h old)
Redis: OK (dump_20260603_020000.rdb.age, 2h old)
Vault: OK (vault_20260603_020000.tar.gz.age, 2h old)
MinIO: OK (minio_20260603_020000.tar.gz.age, 2h old)

Decryption test: PASS

All backups verified OK
```

**On failure:**
- Check systemd timer status: `systemctl status loyallia-backup.timer`
- Review logs: `journalctl -u loyallia-backup --since today`
- Re-run backup manually: `./deploy/backups/backup --full --offsite`

### 1.2 Check Offsite Sync Status

Verify that backups reached the offsite MinIO server:

```bash
# List today's offsite backups (recursively under the daily prefix)
./deploy/backups/lib/minio-client.sh list loyallia/production/2026/06/03/
```

**Expected:** Encrypted files appear under component subdirectories (e.g., `postgres/`, `redis/`, `vault/`, `minio/`) with non-zero sizes.

**Connectivity test:**
```bash
./deploy/backups/lib/minio-client.sh check
```

**Expected:** `MinIO connectivity OK (http://149.28.50.169:9100)`

---

## 2. Weekly Operations

### 2.1 Verify Rescue Files Exist and Are Recent

Rescue files are created weekly by the `loyallia-rescue` systemd timer. Verify they exist:

**Production:**
```bash
ls -la /var/backups/loyallia/rescue/
```

**Development:**
```bash
ls -la ./.agents/rescue/
```

**Expected files:**
- `vault_init_rescue.json.age`
- `vault_secrets_rescue.json.age`
- `vault_raft_snapshot.snap.age`
- `postgres_rescue_YYYYMMDD_HHMMSS.dump.age`
- `redis_rescue_YYYYMMDD_HHMMSS.rdb.age`
- `certs_rescue_YYYYMMDD_HHMMSS.tar.gz.age`
- `runtime_rescue_YYYYMMDD_HHMMSS.tar.gz.age`
- `nginx_rescue_YYYYMMDD_HHMMSS.tar.gz.age` (production only)
- `rescue_manifest.json`

**Verify rescue integrity:**

```bash
# Development
bash deploy/disaster_recovery/development/verify_rescue.sh

# Production
bash deploy/disaster_recovery/production/verify_rescue.sh
```

**Expected:** `Verification passed`

### 2.2 Run Full Cluster Snapshot

Create a snapshot and push it offsite:

```bash
./deploy/backups/backup --snapshot --offsite
```

**What this captures:**
- Docker Compose configuration
- Container metadata (`docker inspect`)
- All Docker volume contents
- All Docker network configurations
- Host configs (`.env`, `nginx.conf`, `certs/`)
- Runtime files from `/run/loyallia-vault/`

**Time estimate:** 5–15 minutes depending on volume sizes.

---

## 3. Monthly DR Drill

Perform a full disaster recovery drill on a **non-production** environment (or a dedicated DR test instance) to validate rescue file completeness and recovery procedures.

> **WARNING:** Do NOT run the factory reset on production without explicit authorization.

### Step 1: Create Rescue Files

```bash
# Development (safe for local testing)
bash deploy/disaster_recovery/development/create_rescue.sh

# Production (only if testing on a dedicated DR instance)
bash deploy/disaster_recovery/production/create_rescue.sh
```

**Validate:**
```bash
bash deploy/disaster_recovery/development/verify_rescue.sh
```

### Step 2: Factory Reset

```bash
# Development
bash deploy/factory_reset/development/factory_reset.sh

# Production (requires extra confirmations)
bash deploy/factory_reset/production/factory_reset.sh --i-am-sure-production
```

**Confirmations required:**
- Type `DESTROY` to confirm permanent data destruction
- Production additionally requires typing the domain (`rewards.loyallia.com`)

**What is destroyed:**
- All Docker containers, volumes, and networks
- All persistent data (PostgreSQL, Redis, Vault, MinIO)

### Step 3: Recover from Rescue

```bash
# Development
bash deploy/disaster_recovery/development/recover.sh

# Production
bash deploy/disaster_recovery/production/recover.sh
```

**Recovery steps (automated):**
1. Verify rescue manifest and decrypt files
2. Stop all containers
3. Destroy Docker volumes (requires `DESTROY` confirmation)
4. Restore Vault (init.json + Raft snapshot + secrets)
5. Restore PostgreSQL (drop, recreate, `pg_restore`)
6. Restore Redis (replace `dump.rdb`)
7. Restore certs, runtime files, and nginx config
8. Start all services
9. Run health checks (API 200, DB connect, Vault unsealed, Redis PING)

### Step 4: Verify All Services

```bash
# API health
curl -sf http://127.0.0.1:33905/api/v1/health/ && echo "API: OK"

# Database (DR verification uses `loyallia`; the development app database is `loyallia_dev`)
docker compose exec -T postgres pg_isready -U loyallia -d loyallia

# Vault
docker compose exec -T vault wget -qO- --no-check-certificate \
    https://127.0.0.1:8200/v1/sys/seal-status | grep '"sealed":false'

# Redis
docker compose exec -T redis sh -c \
    'redis-cli -a "$(cat /run/loyallia-vault/redis_password)" PING' | grep PONG
```

**Post-drill checklist:**
- [ ] All health checks pass
- [ ] No data loss (spot-check critical tables)
- [ ] Offsite sync still functional
- [ ] Document any issues or timing observations

---

## 4. Quarterly Operations

### 4.1 Test Offsite Restore

Validate that backups stored on the offsite MinIO server can be downloaded and decrypted.

```bash
# 1. List available offsite backups
bash ./deploy/backups/restore --list

# 2. Download and restore a component from offsite
# bash ./deploy/backups/restore --postgres --offsite --date=2026-06-01
# NOTE: --offsite and --date are parsed but not yet implemented by the component restore scripts.
# Use the offsite sync scripts directly or restore from the latest local .age backup.

# 3. Verify the restored data (development dumps are plain SQL; production dumps use pg_restore custom format)
head -n 20 ./backups/postgres/loyallia_20260601_020000.sql | grep -q 'PostgreSQL database dump' && echo "Restore file: OK"
```

**Alternative: Manual offsite download test**

```bash
# List the offsite prefix to discover the actual object key
./deploy/backups/lib/minio-client.sh list \
    loyallia/production/2026/06/01/postgres/ | head

# Download a specific file from offsite (replace with the real object key)
./deploy/backups/lib/minio-client.sh download \
    loyallia/production/2026/06/01/postgres/loyallia_20260601_020000.sql.age \
    /tmp/test_download.age

# Decrypt
age -d -i ~/.config/age/loyallia_key.txt -o /tmp/test_download.sql /tmp/test_download.age

# Validate (development dumps are plain SQL; production dumps use custom format)
head -n 20 /tmp/test_download.sql | grep -q 'PostgreSQL database dump' && echo "Offsite restore: OK"
# For production custom-format dumps use: pg_restore --list /tmp/test_download.dump >/dev/null
```

**Clean up test files:**
```bash
rm -f /tmp/test_download.age /tmp/test_download.sql /tmp/test_download.dump
```

---

## 5. Incident Response

### 5.1 "PostgreSQL is corrupted" → Restore from Backup

**Severity:** P1 — Data loss  
**RTO:** 2 hours  
**RPO:** 1 hour

```bash
# 1. Stop API and Celery workers to prevent writes
docker compose stop api celery-pass celery-push celery-default celery-beat

# 2. Restore PostgreSQL from the latest local backup
bash ./deploy/backups/restore --postgres

# 3. If local backup is also corrupted, restore from offsite
bash ./deploy/backups/restore --postgres --offsite --date=2026-06-02

# 4. Restart services
docker compose start api celery-pass celery-push celery-default celery-beat

# 5. Verify
curl -sf http://127.0.0.1:33905/api/v1/health/
```

### 5.2 "Nginx config broken" → Restore from Snapshot

**Severity:** P2 — Service degraded  
**RTO:** 30 minutes

```bash
# 1. Restore the latest snapshot (includes nginx configs)
bash ./deploy/backups/restore --snapshot

# 2. Reload nginx
docker compose exec nginx nginx -s reload

# 3. Verify HTTPS
curl -sfI https://rewards.loyallia.com
```

### 5.3 "Server died" → DR Recover on New Hardware

**Severity:** P1 — Catastrophic  
**RTO:** 4 hours  
**RPO:** 24 hours

```bash
# 1. Provision new server (Ubuntu 24.04 LTS, Docker, Docker Compose)
# 2. Clone repository
git clone <repo-url> /opt/loyallia
cd /opt/loyallia

# 3. Copy the age private key to the new server
#    (stored offline in password manager / USB)
mkdir -p ~/.config/age/
cp loyallia_age_private_key.txt ~/.config/age/

# 4. Download rescue files from offsite MinIO
mkdir -p /var/backups/loyallia/rescue
./deploy/backups/lib/minio-client.sh download \
    loyallia/production/YYYY/MM/DD/vault_init_rescue.json.age \
    /var/backups/loyallia/rescue/vault_init_rescue.json.age
# ... repeat for all rescue files ...

# 5. Run full disaster recovery
bash deploy/disaster_recovery/production/recover.sh

# 6. Verify all services
curl -sf http://127.0.0.1:33905/api/v1/health/
```

---

## 6. Command Reference

### `./deploy/backups/backup` Options

| Flag | Description | Example |
|------|-------------|---------|
| `--full` | Backup all data components (postgres, redis, vault, minio) | `./deploy/backups/backup --full` |
| `--snapshot` | Full cluster snapshot (containers, volumes, configs, networks) | `./deploy/backups/backup --snapshot` |
| `--postgres` | Backup PostgreSQL only | `./deploy/backups/backup --postgres` |
| `--redis` | Backup Redis only | `./deploy/backups/backup --redis` |
| `--vault` | Backup Vault only | `./deploy/backups/backup --vault` |
| `--minio` | Backup MinIO only | `./deploy/backups/backup --minio` |
| `--offsite` | Upload encrypted backups to offsite MinIO after backup | `./deploy/backups/backup --full --offsite` |
| `--verify` | Verify all local backups (age, recency, non-empty) | `./deploy/backups/backup --verify` |
| `--dry-run` | Show what would happen without executing | `./deploy/backups/backup --full --dry-run` |

**Common combinations:**

```bash
# Daily automated backup (production systemd)
./deploy/backups/backup --full --offsite

# Weekly snapshot
./deploy/backups/backup --snapshot --offsite

# Emergency single-component backup
./deploy/backups/backup --postgres --offsite

# Verify before leaving on vacation
./deploy/backups/backup --verify
```

### `./deploy/backups/restore` Options

| Flag | Description | Example |
|------|-------------|---------|
| `--full` | Restore all data components | `bash ./deploy/backups/restore --full` |
| `--snapshot` | Restore full cluster snapshot | `bash ./deploy/backups/restore --snapshot` |
| `--postgres` | Restore PostgreSQL | `bash ./deploy/backups/restore --postgres` |
| `--redis` | Restore Redis | `bash ./deploy/backups/restore --redis` |
| `--vault` | Restore Vault | `bash ./deploy/backups/restore --vault` |
| `--minio` | Restore MinIO | `bash ./deploy/backups/restore --minio` |
| `--offsite` | Download from offsite MinIO before restoring | `bash ./deploy/backups/restore --postgres --offsite` |
| `--date=YYYY-MM-DD` | Parsed for future use; not yet implemented by component restore scripts | `bash ./deploy/backups/restore --postgres --offsite --date=2026-06-02` (not functional) |
| `--list` | List available local and offsite backups | `bash ./deploy/backups/restore --list` |
| `--dry-run` | Show what would happen without executing | `bash ./deploy/backups/restore --full --dry-run` |

**Common combinations:**

```bash
# List available backups
bash ./deploy/backups/restore --list

# Restore latest local PostgreSQL backup
bash ./deploy/backups/restore --postgres

# Restore PostgreSQL from offsite (specific date)
# bash ./deploy/backups/restore --postgres --offsite --date=2026-06-01
# NOTE: --offsite and --date are parsed but not yet implemented by the component restore scripts.
# Use the offsite sync scripts directly or restore from the latest local .age backup.

# Full restore from offsite (disaster scenario)
bash ./deploy/backups/restore --full --offsite

# Dry run to preview a restore
bash ./deploy/backups/restore --full --dry-run
```

### Systemd Timer Reference (Production)

| Timer | Service | Schedule | Purpose |
|-------|---------|----------|---------|
| `loyallia-backup.timer` | `loyallia-backup.service` | Daily 02:00 (+5m random delay) | Full backup + offsite sync |
| `loyallia-rescue.timer` | `loyallia-rescue.service` | Sundays 03:00 | Create encrypted rescue package |
| `loyallia-verify.timer` | `loyallia-verify.service` | Daily 06:00 | Verify backup integrity |

**Management commands:**

```bash
# Check timer status
systemctl list-timers loyallia-*

# View logs
journalctl -u loyallia-backup --since today
journalctl -u loyallia-rescue --since "7 days ago"
journalctl -u loyallia-verify --since today

# Trigger manually
systemctl start loyallia-backup
systemctl start loyallia-rescue
systemctl start loyallia-verify

# Enable/disable timers
systemctl enable loyallia-backup.timer
systemctl disable loyallia-backup.timer
```

### Rescue & DR Commands

| Operation | Development | Production |
|-----------|-------------|------------|
| **Create rescue** | `bash deploy/disaster_recovery/development/create_rescue.sh` | `bash deploy/disaster_recovery/production/create_rescue.sh` |
| **Verify rescue** | `bash deploy/disaster_recovery/development/verify_rescue.sh` | `bash deploy/disaster_recovery/production/verify_rescue.sh` |
| **Recover** | `bash deploy/disaster_recovery/development/recover.sh` | `bash deploy/disaster_recovery/production/recover.sh` |
| **Factory reset** | `bash deploy/factory_reset/development/factory_reset.sh` | `bash deploy/factory_reset/production/factory_reset.sh --i-am-sure-production` |

---

*End of document*
