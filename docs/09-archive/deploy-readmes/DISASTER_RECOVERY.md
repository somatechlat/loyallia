---
title: "Disaster Recovery"
document_id: "LOYALLIA-DOC-DISASTER_RECOVERY.MD"
version: "1.0"
status: "approved"
last_updated: "2026-09-16"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "N/A"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-DOC-DISASTER_RECOVERY.MD |
| **Title** | Disaster Recovery |
| **Version** | 1.0 |
| **Date** | 2026-09-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/09-archive/deploy-readmes/DISASTER_RECOVERY.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-16 | Engineering Lead | Added ISO-compliant document controls |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation |
| Security Officer | Reviewer | Security requirements validation |
| QA Lead | Reviewer | Quality assurance validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-ARCH-001 | Architecture Diagrams | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-16 | Approved |
| Product Owner | — | — | 2026-09-16 | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-16 | Engineering Lead | Initial ISO controls added |
| Approved | 2026-09-16 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

# Disaster Recovery

## Purpose

The disaster recovery subsystem provides **automated, step-by-step recovery** of the entire Loyallia stack from encrypted "rescue" files. It is designed to restore a completely destroyed environment — including Vault state, application secrets, database data, and container configurations — to a known-good state.

There are two independent recovery tracks:
- **Development** — Fast recovery for local dev environments.
- **Production** — Hardened recovery with additional verification and safety checks.

## Files

### Development (`development/`)

| File | Description |
|------|-------------|
| `create_rescue.sh` | Generates encrypted rescue files from the current dev environment. |
| `recover.sh` | Full recovery from rescue files: stops containers, destroys volumes, decrypts, restores Vault, DB, and restarts stack. |
| `verify_rescue.sh` | Validates rescue manifest and file integrity without performing recovery. |

### Production (`production/`)

| File | Description |
|------|-------------|
| `create_rescue.sh` | Generates encrypted production rescue files. |
| `recover.sh` | Production recovery with stricter verification and coordination steps. |
| `verify_rescue.sh` | Validates production rescue manifest and encrypted file integrity. |

## Configuration

### Rescue File Location

Rescue files are expected in:

```
$PROJECT_ROOT/.agents/rescue/
```

Typical contents:
- `rescue_manifest.json` — Index of all rescue files with checksums
- `vault_init_rescue.json.age` — Encrypted Vault init data
- `vault_secrets_rescue.json.age` — Encrypted Vault secrets snapshot
- Database backups (`.age` encrypted)

### Encryption

Rescue files are encrypted with **Age** using the public key generated by `deploy/bootstrap/generate_secrets.sh`. The private key must be stored offline.

### Environment Variables

Scripts source shared libraries from `deploy/backups/lib/` and environment configs from `deploy/backups/development/env.sh` or `deploy/backups/production/env.sh`.

## Usage

### Creating Rescue Files

**Development:**
```bash
./deploy/disaster_recovery/development/create_rescue.sh
```

**Production:**
```bash
./deploy/disaster_recovery/production/create_rescue.sh
```

### Verifying Rescue Files

```bash
./deploy/disaster_recovery/development/verify_rescue.sh
# or
./deploy/disaster_recovery/production/verify_rescue.sh
```

### Performing Recovery

> ⚠️ **WARNING:** Recovery DESTROYS all existing Docker volumes and data. Requires typing `DESTROY` to confirm.

**Development:**
```bash
./deploy/disaster_recovery/development/recover.sh
```

**Production:**
```bash
./deploy/disaster_recovery/production/recover.sh
```

The recovery script will:
1. Stop all running containers
2. Destroy all Docker volumes
3. Decrypt rescue files to a temp directory
4. Restore Vault initialization and secrets
5. Restore PostgreSQL data
6. Restart the full stack
7. Verify health endpoints

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `rescue_manifest.json` not found | Run `create_rescue.sh` first to generate rescue files. |
| Decryption fails | Ensure the Age private key is available at `~/.config/age/loyallia.key` or the path configured in `env.sh`. |
| Vault restore fails | Check that `vault_init_rescue.json` is present and valid. Verify Vault container is running before restore. |
| Database restore fails | Verify PostgreSQL container is healthy before running recovery. Check `pg_hba.conf` allows local connections. |
| Recovery aborts mid-way | The script uses `set -e`; fix the reported error and re-run. Most steps are idempotent on re-run. |
| Manifest validation fails | Re-run `create_rescue.sh` to regenerate the manifest and re-encrypt files. |

## Related Docs

- [`deploy/backups/`](../backups/) — Daily backup scheduling and retention policies
- [`deploy/bootstrap/`](../bootstrap/) — Full deployment orchestrator (used after recovery)
- [`deploy/factory_reset/`](../factory_reset/) — Destroy development environment (opposite of recovery)
- [`deploy/vault/`](../vault/) — Vault initialization and secret management
- [`../../docs/02-architecture/BACKUP_ARCHITECTURE.md`](../../02-architecture/BACKUP_ARCHITECTURE.md) — Backup and encryption architecture
- [`../../docs/09-archive/BACKUP_DISASTER_RECOVERY.md`](../BACKUP_DISASTER_RECOVERY.md) — Detailed recovery runbook
