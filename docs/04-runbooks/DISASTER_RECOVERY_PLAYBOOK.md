# Loyallia — Disaster Recovery Playbook

**Document ID:** LYL-C-DR-MASTER-v2  
**Classification:** INTERNAL — SRE ONLY  
**Last Updated:** 2026-06-03  
**Owner:** SRE On-Call  
**Review Cycle:** Quarterly

---

## Table of Contents

1. [RTO/RPO Matrix](#1-rtorpo-matrix)
2. [Scenario Matrix](#2-scenario-matrix)
3. [Step-by-Step Recovery Procedures](#3-step-by-step-recovery-procedures)
4. [Escalation Contacts](#4-escalation-contacts)
5. [Post-Incident Checklist](#5-post-incident-checklist)

---

## 1. RTO/RPO Matrix

| Component | RTO | RPO | Recovery Mechanism |
|-----------|-----|-----|-------------------|
| **PostgreSQL primary** | 2 hours | 1 hour | Restore from `pg_dump` backup (local or offsite) |
| **Redis** | 30 minutes | 6 hours | Restore from RDB snapshot (local or offsite) |
| **Vault** | 1 hour | 0 | Restore from Raft snapshot + `init.json` + KV secrets |
| **MinIO** | 1 hour | 24 hours | Restore from `mc mirror` backup (local or offsite) |
| **Total cluster loss** | 4 hours | 24 hours | Full DR rescue package recovery on new hardware |
| **Configuration error** | 30 minutes | 0 | Snapshot restore (containers, volumes, configs) |

### Definitions

- **RTO (Recovery Time Objective):** Maximum acceptable time to restore service after an incident.
- **RPO (Recovery Point Objective):** Maximum acceptable data loss measured in time.
- **Vault RPO = 0:** Vault secrets are fully captured in the weekly rescue package; no secret data is ever lost if rescue files are maintained.

---

## 2. Scenario Matrix

### "What happens if X fails?"

| Failure Scenario | Severity | Immediate Action | Recovery Method | Estimated Time |
|-----------------|----------|-----------------|-----------------|----------------|
| **Single container crash** | P3 | `docker compose restart <service>` | Automatic restart policy handles most cases; manual restart if stuck | < 5 min |
| **Volume corruption (PostgreSQL)** | P1 | Stop API/Celery; assess corruption | Restore from `pg_dump` backup (`./deploy/backups/restore --postgres`) | 1–2 h |
| **Volume corruption (Redis)** | P2 | Stop Redis; backup corrupt RDB | Restore from RDB snapshot (`./deploy/backups/restore --redis`) | 15–30 min |
| **Config error (nginx, .env)** | P2 | Identify bad change | Restore from snapshot (`./deploy/backups/restore --snapshot`) | 15–30 min |
| **Server hardware failure** | P1 | Provision new VPS | DR rescue package recovery on new server | 2–4 h |
| **Datacenter loss** | P1 | Provision new VPS in alternate region | DR rescue recovery + offsite backup download | 3–4 h |
| **Vault sealed (restart)** | P2 | Check seal status | Unseal with keys from `init.json`; restart dependent services | 10–15 min |
| **Vault data corruption** | P1 | Isolate Vault container | Restore from rescue Raft snapshot + re-import secrets | 45–60 min |
| **Accidental data deletion** | P1 | Stop writes immediately | Point-in-time restore from latest `pg_dump` | 1–2 h |

### Decision Tree

```
INCIDENT DETECTED
        │
        ▼
┌───────────────────┐
│ Single container  │──NO──▶ Is data corrupted?
│ crash?            │         │
└───────────────────┘         ▼
        │              ┌───────────────────┐
       YES             │ Volume corruption │──NO──▶ Is server accessible?
        │              │ or config error?  │       │
        ▼              └───────────────────┘       ▼
docker compose           YES              ┌───────────────────┐
restart <svc>             │               │ Server dead or    │
                          ▼               │ datacenter lost?  │
              ┌─────────────────────┐     └───────────────────┘
              │ Config error?       │              │
              │ (nginx, .env)       │             YES
              └─────────────────────┘              │
                    │    │                         ▼
                   YES  NO              DR rescue recovery
                    │    │              on new hardware
                    ▼    ▼
           Snapshot      Component
           restore       backup restore
```

---

## 3. Step-by-Step Recovery Procedures

### 3.1 Development Environment Recovery

Development recovery uses `docker compose` commands and stores data in project-relative paths.

#### Prerequisites

- Docker and Docker Compose installed
- Repository cloned locally
- Bootstrap secrets file (`.bootstrap_secrets.{development,production}.env`) and/or `.env` if your environment uses one
- `age` private key available (`AGE_PRIVATE_KEY_FILE` set or key in `~/.config/age/`)

#### Full DR Recovery (Development)

```bash
# Step 1: Navigate to project root
cd /path/to/loyallia

# Step 2: Verify rescue files exist
ls -la .agents/rescue/
# Expected: vault_init_rescue.json.age, vault_secrets_rescue.json.age,
#           vault_raft_snapshot.snap.age, postgres_rescue_*.dump.age,
#           redis_rescue_*.rdb.age, certs_rescue_*.tar.gz.age,
#           runtime_rescue_*.tar.gz.age, rescue_manifest.json

# Step 3: Run the automated recovery script
bash deploy/disaster_recovery/development/recover.sh
```

**The script performs:**
1. Manifest verification + decryption of all rescue files
2. `docker compose down` (stop all containers)
3. `docker compose down -v` (destroy volumes — requires typing `DESTROY`)
4. Vault restore (init.json → container, Raft snapshot restore, unseal)
5. Vault secrets re-import via API
6. PostgreSQL restore (drop, recreate, `pg_restore`)
7. Redis restore (copy RDB into container)
8. Certs and runtime files extraction
9. `docker compose up -d` (start all services)
10. Health checks (API 200, DB ready, Vault unsealed, Redis PING)

#### Component Restore (Development)

```bash
# Restore only PostgreSQL from local backup
./deploy/backups/restore --postgres

# Restore only PostgreSQL from offsite
# ./deploy/backups/restore --postgres --offsite --date=2026-06-02 (not yet implemented)

# Restore only Redis
./deploy/backups/restore --redis

# Restore only Vault
./deploy/backups/restore --vault

# Restore only MinIO
./deploy/backups/restore --minio

# Restore full cluster snapshot
./deploy/backups/restore --snapshot
```

#### Factory Reset (Development)

```bash
# Destroy all Docker resources, then re-bootstrap
bash deploy/factory_reset/development/factory_reset.sh

# Type DESTROY when prompted

# Re-bootstrap from zero
./deploy/bootstrap/bootstrap-development.sh
```

---

### 3.2 Production Environment Recovery

Production recovery uses host binaries (`pg_dump`, `redis-cli`, `vault`, `mc`) and absolute host paths.

#### Prerequisites

- Ubuntu 24.04 LTS server
- Docker and Docker Compose v2 installed
- Host binaries installed: `pg_dump`, `redis-cli`, `vault`, `age`
- `age` private key available
- Offsite MinIO endpoint and credentials are configured in `deploy/backups/lib/minio-client.sh`

#### Full DR Recovery (Production) — New Hardware

```bash
# Step 1: Provision new server
# Minimum: 4 vCPU, 16 GB RAM, 100 GB SSD

# Step 2: Install prerequisites
apt-get update
apt-get install -y docker.io docker-compose-plugin age postgresql-client redis-tools

# Step 3: Clone repository
git clone <repo-url> /opt/loyallia
cd /opt/loyallia

# Step 4: Copy age private key to server
mkdir -p /root/.config/age/
cp loyallia_age_private_key.txt /root/.config/age/

# Step 5: Copy .env file (contains production config)
cp /secure/backup/.env /opt/loyallia/.env

# Step 6: Download rescue files from offsite MinIO
mkdir -p /var/backups/loyallia/rescue
DATE_PREFIX="loyallia/production/YYYY/MM/DD"

# List the daily prefix, then download each file by its exact object key.
./deploy/backups/lib/minio-client.sh list "${DATE_PREFIX}/"

# Example downloads (replace YYYY/MM/DD and timestamps with actual values):
# Offsite keys use the `rescue/` prefix because the encrypted rescue package
# is uploaded from `/var/backups/loyallia/rescue/`.
./deploy/backups/lib/minio-client.sh download \
    "${DATE_PREFIX}/rescue/vault_init_rescue.json.age" \
    /var/backups/loyallia/rescue/vault_init_rescue.json.age

./deploy/backups/lib/minio-client.sh download \
    "${DATE_PREFIX}/rescue/vault_secrets_rescue.json.age" \
    /var/backups/loyallia/rescue/vault_secrets_rescue.json.age

./deploy/backups/lib/minio-client.sh download \
    "${DATE_PREFIX}/rescue/vault_raft_snapshot.snap.age" \
    /var/backups/loyallia/rescue/vault_raft_snapshot.snap.age

./deploy/backups/lib/minio-client.sh download \
    "${DATE_PREFIX}/rescue/postgres_rescue_YYYYMMDD_HHMMSS.dump.age" \
    /var/backups/loyallia/rescue/postgres_rescue_YYYYMMDD_HHMMSS.dump.age

./deploy/backups/lib/minio-client.sh download \
    "${DATE_PREFIX}/rescue/redis_rescue_YYYYMMDD_HHMMSS.rdb.age" \
    /var/backups/loyallia/rescue/redis_rescue_YYYYMMDD_HHMMSS.rdb.age

./deploy/backups/lib/minio-client.sh download \
    "${DATE_PREFIX}/rescue/certs_rescue_YYYYMMDD_HHMMSS.tar.gz.age" \
    /var/backups/loyallia/rescue/certs_rescue_YYYYMMDD_HHMMSS.tar.gz.age

./deploy/backups/lib/minio-client.sh download \
    "${DATE_PREFIX}/rescue/runtime_rescue_YYYYMMDD_HHMMSS.tar.gz.age" \
    /var/backups/loyallia/rescue/runtime_rescue_YYYYMMDD_HHMMSS.tar.gz.age

./deploy/backups/lib/minio-client.sh download \
    "${DATE_PREFIX}/rescue/nginx_rescue_YYYYMMDD_HHMMSS.tar.gz.age" \
    /var/backups/loyallia/rescue/nginx_rescue_YYYYMMDD_HHMMSS.tar.gz.age

# The manifest is stored unencrypted alongside the rescue package
./deploy/backups/lib/minio-client.sh download \
    "${DATE_PREFIX}/rescue/rescue_manifest.json" \
    /var/backups/loyallia/rescue/rescue_manifest.json

# Step 7: Run automated production recovery
bash deploy/disaster_recovery/production/recover.sh
```

**The script performs:**
1. Manifest verification + decryption
2. `docker compose -f docker-compose.yml -f docker-compose.prod.yml down`
3. Volume destruction (requires typing `RECOVER` then `DESTROY`)
4. Vault restore (init.json, Raft snapshot, unseal)
5. Vault secrets re-import
6. PostgreSQL restore (`pg_restore`)
7. Redis restore (RDB replacement)
8. Certs, runtime, and **nginx config** restoration (copies to `/etc/nginx/`)
9. Start all services
10. Health checks + nginx reload test

#### Component Restore (Production)

```bash
# Restore only PostgreSQL from local backup
./deploy/backups/restore --postgres

# Restore from offsite
# ./deploy/backups/restore --postgres --offsite --date=2026-06-02 (not yet implemented)

# Restore Redis
./deploy/backups/restore --redis

# Restore Vault
./deploy/backups/restore --vault

# Restore MinIO
./deploy/backups/restore --minio

# Restore full snapshot
./deploy/backups/restore --snapshot
```

#### Factory Reset (Production)

> **WARNING:** Irreversible. Destroys all production data.

```bash
bash deploy/factory_reset/production/factory_reset.sh --i-am-sure-production
```

**Confirmations required:**
1. Flag `--i-am-sure-production` must be present
2. Type the domain: `rewards.loyallia.com`
3. Type `DESTROY`

#### Post-Recovery Verification (Production)

```bash
# 1. Container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.State}}"

# 2. API liveness
curl -sf http://127.0.0.1:33905/api/v1/health/ && echo "API liveness: OK"

# 3. API readiness (includes DB check)
curl -sf http://127.0.0.1:33905/api/v1/health/ready/ && echo "API readiness: OK"

# 4. Database connectivity
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    exec -T postgres pg_isready -U loyallia -d loyallia

# 5. Vault seal status
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    exec -T vault wget -qO- --no-check-certificate \
    https://127.0.0.1:8200/v1/sys/seal-status | grep '"sealed":false'

# 6. Redis PING
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    exec -T redis sh -c \
    'redis-cli -a "$(cat /run/loyallia-vault/redis_password)" PING' | grep PONG

# 7. Nginx config test
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    exec nginx nginx -t

# 8. HTTPS external check
curl -sfI https://rewards.loyallia.com && echo "External HTTPS: OK"

# 9. Reinstall systemd timers
systemctl enable --now loyallia-backup.timer
systemctl enable --now loyallia-rescue.timer
systemctl enable --now loyallia-verify.timer
```

---

## 4. Escalation Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| **Primary On-Call SRE** | *(TBD)* | *(TBD)* | 24/7 |
| **Secondary On-Call** | *(TBD)* | *(TBD)* | 24/7 |
| **Infrastructure Lead** | *(TBD)* | *(TBD)* | Business hours |
| **Security Lead** | *(TBD)* | *(TBD)* | Business hours |
| **MinIO Offsite Provider** | Avender Support | *(TBD)* | Business hours |
| **Cloud Provider** | *(TBD)* | *(TBD)* | 24/7 |

### Escalation Path

```
P4 (Low)        → Log ticket, resolve within 24h
     │
P3 (Medium)     → Primary On-Call, resolve within 4h
     │
P2 (High)       → Primary + Secondary On-Call, resolve within 1h
     │
P1 (Critical)   → All On-Call + Infrastructure Lead + Security Lead
                  Bridge call within 15 minutes
```

### Communication Channels

| Channel | Purpose |
|---------|---------|
| `#incidents` (Slack) | Real-time incident coordination |
| `ops@loyallia.com` | Automated alerts, post-mortems |
| `security@loyallia.com` | Security-related incidents |
| PagerDuty / OpsGenie | P1/P2 paging (recommended future integration) |

---

## 5. Post-Incident Checklist

After any incident requiring backup restore or DR recovery, complete the following:

### Immediate (Within 1 Hour)

- [ ] Incident is contained — no further data loss or service degradation
- [ ] All services are healthy (API, DB, Redis, Vault, MinIO, Nginx)
- [ ] Monitoring and alerting are functional (Prometheus, Grafana, Alertmanager)
- [ ] Root cause is documented in incident channel/ticket
- [ ] Rescue files are valid and up to date (run `verify_rescue.sh`)

### Short-Term (Within 24 Hours)

- [ ] Full post-incident review scheduled
- [ ] Backup integrity confirmed (`./deploy/backups/backup --verify`)
- [ ] Offsite sync confirmed (`./deploy/backups/lib/minio-client.sh list ...`)
- [ ] Any rotated credentials or certificates are documented
- [ ] Customer impact assessment completed (if applicable)
- [ ] Regulatory notification sent if required (LOPDP Ecuador)

### Medium-Term (Within 1 Week)

- [ ] Post-mortem document written and shared
- [ ] Action items assigned with owners and deadlines
- [ ] Backup/DR gaps identified during recovery are remediated
- [ ] Rescue files regenerated after any infrastructure changes
- [ ] systemd timers verified active and producing healthy backups

### Long-Term (Within 1 Month)

- [ ] DR drill scheduled to validate fixes
- [ ] Documentation updated (this playbook, architecture, runbook)
- [ ] Runbook gaps closed (new scenarios, improved commands)
- [ ] On-call team trained on any new procedures
- [ ] Offsite restore tested end-to-end

### Post-Mortem Template

```markdown
# Incident Post-Mortem: YYYY-MM-DD — <Title>

## Summary
- **Started:** YYYY-MM-DD HH:MM UTC
- **Resolved:** YYYY-MM-DD HH:MM UTC
- **Duration:** X hours Y minutes
- **Severity:** P1 / P2 / P3 / P4
- **Affected:** PostgreSQL / Redis / Vault / MinIO / Full cluster

## Root Cause
<What failed and why>

## Timeline
- HH:MM — Detection (how?)
- HH:MM — Initial response (what was done?)
- HH:MM — Recovery started
- HH:MM — Service restored

## What Went Well
-

## What Went Poorly
-

## Action Items
| # | Action | Owner | Due Date |
|---|--------|-------|----------|
| 1 | | | |
```

---

*End of document*
