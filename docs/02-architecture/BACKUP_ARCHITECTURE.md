# Loyallia — Backup & Disaster Recovery Architecture

**Document Version:** 2.0  
**Last Updated:** 2026-06-03  
**Owner:** Infrastructure & SRE Team  
**Classification:** Internal — Confidential

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [3-2-1 Backup Rule Compliance](#2-3-2-1-backup-rule-compliance)
3. [File Structure & Environment Isolation](#3-file-structure--environment-isolation)
4. [Unified CLI Design](#4-unified-cli-design)
5. [Encryption Methodology (`age`)](#5-encryption-methodology-age)
6. [Offsite MinIO Architecture](#6-offsite-minio-architecture)
7. [Environment Isolation Guarantee](#7-environment-isolation-guarantee)
8. [Sysadmin UI Integration](#8-sysadmin-ui-integration)
9. [Snapshot vs Backup vs DR](#9-snapshot-vs-backup-vs-dr)

---

## 1. System Overview

The Loyallia backup and disaster recovery (DR) system provides automated, encrypted, and verifiable protection for all persistent data across both development and production environments. It is built on a **unified CLI** (`backup` / `restore`), uses **age encryption** for all data at rest, replicates backups to an **offsite MinIO server**, and supports full-stack recovery via **rescue packages** and **factory reset** procedures.

### Core Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Data Backups** | `pg_dump`, `redis-cli BGSAVE`, `vault kv export`, `mc mirror` | Logical backups of PostgreSQL, Redis, Vault, and MinIO |
| **Cluster Snapshots** | Docker volume + container + network capture | Full system state for rapid clone/restore |
| **Disaster Recovery** | Rescue packages (encrypted tarballs) | Complete stack rebuild from rescue files |
| **Offsite Replication** | Avender MinIO S3 (`boto3`) | Geographic separation of encrypted backups |
| **Scheduling** | Systemd timers (production) | Automated daily backup, weekly rescue, daily verification |
| **Encryption** | `age` (FiloSottile) | Modern, simple, post-quantum-resistant encryption |

### Recovery Priority Order

```
Vault → PostgreSQL → Redis → MinIO → Application
```

Vault is always restored first because all other services depend on its secrets.

---

## 2. 3-2-1 Backup Rule Compliance

The Loyallia backup system adheres to the **3-2-1 rule**:

- **3** copies of data (primary + local backup + offsite)
- **2** different media types (local disk + S3-compatible object store)
- **1** offsite copy (Avender MinIO server)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         3-2-1 BACKUP COMPLIANCE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PRIMARY DATA                    LOCAL BACKUPS              OFFSITE        │
│   ┌─────────────┐                ┌─────────────┐          ┌─────────────┐   │
│   │ PostgreSQL  │──pg_dump──────▶│  .age file  │─────────▶│  MinIO S3   │   │
│   │ Redis       │──BGSAVE/RDB───▶│  .age file  │─────────▶│  MinIO S3   │   │
│   │ Vault       │──kv export────▶│  .age file  │─────────▶│  MinIO S3   │   │
│   │ MinIO       │──mc mirror────▶│  .age file  │─────────▶│  MinIO S3   │   │
│   └─────────────┘                └─────────────┘          └─────────────┘   │
│                                                                             │
│   COPY 1 (primary)               COPY 2 (local disk)      COPY 3 (offsite)  │
│                                                                             │
│   MEDIA: Docker volumes          MEDIA: ext4/XFS          MEDIA: S3 object  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Compliance Matrix

| Rule | Implementation | Location |
|------|---------------|----------|
| **3 copies** | Primary data + local `.age` backup + offsite MinIO | Local disk + Avender S3 |
| **2 media types** | Local filesystem (ext4/XFS) + S3 object storage | Host disk + MinIO bucket |
| **1 offsite** | Avender MinIO server (`149.28.50.169:9100`) | Remote datacenter — credentials are currently hardcoded in `deploy/backups/lib/minio-client.sh`; rotate and move to Vault |
| **Encryption at rest** | `age` public-key encryption on all backups | All backup files |
| **Encryption in transit** | HTTPS/TLS for MinIO upload/download | Network layer |
| **Integrity verification** | SHA-256 checksums in rescue manifests | Rescue packages |
| **Access control** | `0600` permissions on all backup files | Filesystem ACLs |

---

## 3. File Structure & Environment Isolation

The entire backup system is **strictly isolated by environment**. There is no shared code path that could accidentally cause a development script to write to production paths, or vice versa.

```
deploy/
├── backups/
│   ├── backup                    ← Unified backup CLI (env-auto-detect)
│   ├── restore                   ← Unified restore CLI (env-auto-detect)
│   ├── README.md
│   ├── lib/
│   │   ├── common.sh             ← Shared utilities (logging, timestamps)
│   │   ├── encrypt.sh            ← age encrypt/decrypt wrapper
│   │   └── minio-client.sh       ← boto3-based MinIO client
│   │
│   ├── development/              ← DEV ONLY
│   │   ├── env.sh                ← Dev paths & compose config
│   │   ├── postgres.sh           ← docker compose exec pg_dump
│   │   ├── redis.sh              ← docker compose exec BGSAVE
│   │   ├── vault.sh              ← docker compose exec kv export
│   │   ├── minio.sh              ← docker compose exec mc mirror
│   │   ├── snapshot.sh           ← Full cluster snapshot
│   │   ├── offsite-sync.sh       ← Upload to MinIO
│   │   ├── verify.sh             ← Backup integrity check
│   │   ├── restore-postgres.sh   ← Restore PostgreSQL
│   │   ├── restore-redis.sh      ← Restore Redis
│   │   ├── restore-vault.sh      ← Restore Vault
│   │   ├── restore-minio.sh      ← Restore MinIO
│   │   └── restore-snapshot.sh   ← Restore full snapshot
│   │
│   └── production/               ← PROD ONLY
│       ├── env.sh                ← Prod paths & compose config
│       ├── postgres.sh           ← Host pg_dump (port 33900)
│       ├── redis.sh              ← Host redis-cli BGSAVE (port 33902)
│       ├── vault.sh              ← Host vault kv export + Raft snapshot
│       ├── minio.sh              ← Host mc mirror (port 33903)
│       ├── snapshot.sh           ← Full cluster snapshot
│       ├── offsite-sync.sh       ← Upload to MinIO
│       ├── verify.sh             ← Backup integrity check
│       ├── restore-postgres.sh   ← Restore PostgreSQL
│       ├── restore-redis.sh      ← Restore Redis
│       ├── restore-vault.sh      ← Restore Vault
│       ├── restore-minio.sh      ← Restore MinIO
│       ├── restore-snapshot.sh   ← Restore full snapshot
│       └── systemd/              ← Systemd timers & services
│           ├── install.sh
│           ├── loyallia-backup.service
│           ├── loyallia-backup.timer
│           ├── loyallia-rescue.service
│           ├── loyallia-rescue.timer
│           ├── loyallia-verify.service
│           └── loyallia-verify.timer
│
├── disaster_recovery/
│   ├── development/
│   │   ├── create_rescue.sh      ← Generate encrypted rescue package
│   │   ├── recover.sh            ← Full stack recovery from rescue
│   │   └── verify_rescue.sh      ← Validate rescue integrity
│   └── production/
│       ├── create_rescue.sh      ← Generate encrypted rescue package
│       ├── recover.sh            ← Full stack recovery from rescue
│       └── verify_rescue.sh      ← Validate rescue integrity
│
└── factory_reset/
    ├── development/
    │   └── factory_reset.sh      ← Destroy all dev Docker resources
    └── production/
        └── factory_reset.sh      ← Destroy all prod Docker resources
```

### Backup Output Paths

| Environment | Local Backup Directory | Rescue Directory | Offsite Prefix |
|-------------|----------------------|------------------|----------------|
| **Development** | `./backups/` | `./.agents/rescue/` | `loyallia/development/YYYY/MM/DD/` |
| **Production** | `/var/backups/loyallia/` | `/var/backups/loyallia/rescue/` | `loyallia/production/YYYY/MM/DD/` |

---

## 4. Unified CLI Design

The `backup` and `restore` commands are the **single entry points** for all backup and restore operations. They auto-detect the environment from `.env` and delegate to the correct per-environment scripts.

### Environment Detection

The CLI inspects `.env` for production indicators:

```bash
# Detected automatically — never pass --env manually
if grep -qE '^\s*COMPOSE_FILE.*prod' .env; then
    DEPLOY_ENV="production"
elif grep -qE '^\s*DJANGO_SETTINGS_MODULE.*production' .env; then
    DEPLOY_ENV="production"
else
    DEPLOY_ENV="development"
fi
```

### `./deploy/backups/backup`

```bash
# Full data backup (all components)
./deploy/backups/backup --full

# Full backup + offsite upload
./deploy/backups/backup --full --offsite

# Component-specific backups
./deploy/backups/backup --postgres
./deploy/backups/backup --redis
./deploy/backups/backup --vault
./deploy/backups/backup --minio

# Full cluster snapshot (containers, volumes, configs)
./deploy/backups/backup --snapshot

# Snapshot + offsite
./deploy/backups/backup --snapshot --offsite

# Verify local backups
./deploy/backups/backup --verify

# Dry run (show what would happen)
./deploy/backups/backup --full --dry-run
```

### `./deploy/backups/restore`

```bash
# Restore all data components from local backups
./deploy/backups/restore --full

# Restore from offsite MinIO
./deploy/backups/restore --postgres --offsite
./deploy/backups/restore --full --offsite

# Restore specific date
./deploy/backups/restore --postgres --offsite --date=2026-06-02

# Restore full cluster snapshot
./deploy/backups/restore --snapshot

# List available backups
./deploy/backups/restore --list

# Dry run
./deploy/backups/restore --full --dry-run
```

### Safety Features

| Feature | Implementation |
|---------|---------------|
| **Interactive confirmation** | Restore requires typing `RESTORE` to proceed |
| **Dry run mode** | `--dry-run` prints actions without executing |
| **Component validation** | Fails fast if a backup script is missing |
| **Offsite date selection** | `--date=YYYY-MM-DD` fetches specific offsite backup |
| **Auto-abort on failure** | If any component fails, the entire operation stops |

---

## 5. Encryption Methodology (`age`)

All backups are encrypted with **[`age`](https://github.com/FiloSottile/age)** — a modern, simple, and secure file encryption tool designed by Filippo Valsorda.

### Why `age`?

| Property | `age` | Legacy GPG |
|----------|-------|------------|
| Key format | Short, copy-pasteable strings | Long, complex keyrings |
| Post-quantum | X25519 + scrypt (future-proof) | RSA/DSA (legacy) |
| CLI UX | `age -r pubkey -o file.age file` | Complex trust web |
| File size | Minimal overhead | Significant overhead |
| Dependencies | Single static binary | Full GPG suite |

### Key Storage

```
.age_keys/
└── loyallia_age_public_key.txt    ← Public recipient key (can be in repo)

# Private key stored OFFLINE, never committed:
# ~/.config/age/loyallia_age_private_key.txt
# or $AGE_PRIVATE_KEY_FILE
```

### Encryption Flow

```
┌──────────────┐     age -r <pubkey>     ┌──────────────┐
│ plaintext    │ ───────────────────────▶ │  .age file   │
│ backup file  │                          │  (encrypted) │
└──────────────┘                          └──────────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │ rm plaintext     │
                                    │ chmod 0600 .age  │
                                    └──────────────────┘
```

### Decryption Flow

```bash
# Decrypt a file to stdout
age -d -i ~/.config/age/loyallia_key.txt file.age

# Decrypt to a file
age -d -i ~/.config/age/loyallia_key.txt -o file file.age
```

### Library Functions

The `deploy/backups/lib/encrypt.sh` library provides reusable functions:

| Function | Purpose |
|----------|---------|
| `encrypt_file <input> [output]` | Encrypt a single file |
| `decrypt_file <input> [output]` | Decrypt a single file |
| `encrypt_directory <dir>` | Encrypt all non-`.age` files in a directory |
| `decrypt_directory <dir>` | Decrypt all `.age` files in a directory |
| `verify_key` | Test encrypt/decrypt round-trip with keys |

---

## 6. Offsite MinIO Architecture

Encrypted backups are replicated to an **offsite MinIO server** hosted on Avender infrastructure for geographic redundancy.

### Server Details

| Property | Value |
|----------|-------|
| **Endpoint** | `http://149.28.50.169:9100` |
| **Bucket** | `backups` |
| **Region** | `us-east-1` |
| **Protocol** | HTTP (internal network) |
| **Client** | Python `boto3` (via `deploy/backups/lib/minio-client.sh`) |
| **Signature** | AWS Signature Version 4 (`s3v4`) |

### Upload Path Structure

```
s3://backups/
├── loyallia/
│   ├── development/
│   │   └── 2026/06/03/
│   │       ├── postgres/loyallia_20260603_020000.sql.age
│   │       ├── redis/dump_20260603_020000.rdb.age
│   │       ├── vault/vault_20260603_020000.tar.gz.age
│   │       ├── minio/minio_20260603_020000.tar.age
│   │       └── snapshot/loyallia_snapshot_20260603_020000.tar.gz.age
│   └── production/
│       └── 2026/06/03/
│           ├── postgres/loyallia_20260603_020000.dump.age
│           ├── redis/dump_20260603_020000.rdb.age
│           ├── vault/vault_20260603_020000.tar.age
│           ├── minio/minio_20260603_020000.tar.age
│           └── snapshot/loyallia_snapshot_20260603_020000.tar.gz.age
```

### Upload Verification

Every upload is verified with a `HEAD` request:

1. Upload file via `boto3` `upload_file()`
2. Call `head_object()` to confirm object exists
3. Log success or fail the sync

### MinIO Client API

| Operation | Command | Purpose |
|-----------|---------|---------|
| `check` | `./deploy/backups/lib/minio-client.sh check` | Test connectivity |
| `upload` | `... upload <local> <remote_key>` | Upload a file |
| `download` | `... download <remote_key> <local>` | Download a file |
| `list` | `... list <prefix>` | List objects |
| `delete` | `... delete <remote_key>` | Delete an object |

---

## 7. Environment Isolation Guarantee

The backup system guarantees **absolute isolation** between development and production environments through multiple enforcement layers.

### Enforcement Layers

| Layer | Mechanism |
|-------|-----------|
| **Directory separation** | `deploy/backups/development/` and `deploy/backups/production/` are distinct directories with no shared execution path |
| **Hardcoded paths** | `env.sh` files contain hardcoded `BACKUP_DIR` values — no runtime override |
| **Compose file binding** | Dev uses `docker-compose.yml`; Prod uses `docker-compose.yml` + `docker-compose.prod.yml` |
| **No `--env` flag** | Scripts do not accept an environment override flag |
| **Auto-detection only** | The unified CLI detects environment from `.env` contents; cannot be forced |
| **Filesystem barriers** | Dev writes to `./backups/` (project-relative); Prod writes to `/var/backups/loyallia/` (absolute host path) |

### Safety Consequences

- A development script **cannot** accidentally write to `/var/backups/loyallia/`
- A production script **cannot** accidentally execute `docker compose exec` against a dev stack
- The unified CLI **always** loads the correct `env.sh` before executing any backup logic
- There is **no global fallback** — if environment detection fails, the script exits with an error

---

## 8. Sysadmin UI Integration

The backup system integrates with the **Loyallia Sysadmin UI** for operational visibility and control.

### UI Capabilities

| Feature | Location | Description |
|---------|----------|-------------|
| **Factory Reset** | Settings → "Restaurar de Fábrica" | Wipes all tenant data while preserving platform infrastructure |
| **OTP Verification** | Factory Reset dialog | Requires email/SMS OTP before destructive action |
| **Health Dashboard** | `/api/v1/health/` | Returns JSON with `postgres`, `redis`, `minio` status |
| **Admin Recovery** | CLI only | `python manage.py recover_admin_access` resets superadmin password |

### Factory Reset Behavior (UI)

**Preserved:**
- SUPER_ADMIN user (`admin@loyallia.com`)
- 4 canonical subscription plans (Trial, Starter, Professional, Enterprise)
- Platform settings (`TRIAL_DAYS`, `TAX_RATE_ECUADOR`, `DEFAULT_TIMEZONE`, etc.)

**Destroyed:**
- All tenants and their data
- All customers, transactions, cards, passes
- All campaigns, notifications, delivery logs
- All automations, analytics, audit logs
- All subscriptions, invoices, payment methods

> **Note:** The UI factory reset is a **data-only** reset. It does NOT affect Vault secrets, Docker volumes, or backup files. For infrastructure-level reset, use `deploy/factory_reset/` scripts.

---

## 9. Snapshot vs Backup vs DR

Three distinct recovery mechanisms serve different failure modes and recovery speeds.

| Dimension | **Snapshot** | **Backup** | **Disaster Recovery (Rescue)** |
|-----------|-------------|------------|-------------------------------|
| **What is captured** | Full cluster state: containers, volumes, networks, configs, runtime files | Per-component logical data: PostgreSQL dump, Redis RDB, Vault KV export, MinIO bucket mirror | Complete stack rebuild package: Vault init + secrets + Raft snapshot + PostgreSQL + Redis + certs + runtime + nginx |
| **Use case** | "I broke the config" — rapid rollback of entire system state | "The database is corrupted" — restore single component from specific point in time | "The server is dead" — rebuild entire environment on new hardware |
| **Granularity** | Entire cluster | Component-level (postgres, redis, vault, minio) | Full stack (all components + infrastructure) |
| **Recovery speed** | Fastest — single tarball extraction | Medium — per-component restore | Slowest — sequential multi-step recovery |
| **Storage size** | Large (multi-GB, includes all volumes) | Medium (compressed dumps) | Medium-Large (compressed + encrypted) |
| **Encryption** | `age` | `age` | `age` |
| **Offsite support** | Yes (`--offsite`) | Yes (`--offsite`) | Manual copy recommended |
| **Automation** | Weekly (systemd timer) | Daily (systemd timer) | Weekly (systemd timer) |
| **Command** | `./deploy/backups/backup --snapshot` | `./deploy/backups/backup --full` | `./deploy/disaster_recovery/production/create_rescue.sh` |
| **Restore command** | `./deploy/backups/restore --snapshot` | `./deploy/backups/restore --postgres` | `./deploy/disaster_recovery/production/recover.sh` |

### When to Use What

| Incident | Recommended Mechanism | Reason |
|----------|----------------------|--------|
| Nginx config broken | **Snapshot** | Restores host configs in one step |
| PostgreSQL table deleted | **Backup** (`--postgres`) | Targeted restore, minimal disruption |
| Redis cache corrupted | **Backup** (`--redis`) | Fast RDB replacement |
| Vault sealed, data intact | **Backup** (`--vault`) | KV re-import or Raft snapshot restore |
| Server hardware failure | **DR Rescue** | Complete rebuild on new hardware |
| Datacenter loss | **DR Rescue + Offsite** | Download rescue from offsite, rebuild |
| "I want a clean slate" | **Factory Reset** | Destroys data, keeps infrastructure |

---

*End of document*
