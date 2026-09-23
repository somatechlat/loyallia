---
title: "Loyallia Backup System"
document_id: "LOYALLIA-DOC-BACKUPS.MD"
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
| **Document ID** | LOYALLIA-DOC-BACKUPS.MD |
| **Title** | Loyallia Backup System |
| **Version** | 1.0 |
| **Date** | 2026-09-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/09-archive/deploy-readmes/BACKUPS.md` |

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
| LOYALLIA-DOC-ARCHITECTURE.MD | Loyallia Architecture, Sequence & Flowchart Diagrams | Reference |

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
