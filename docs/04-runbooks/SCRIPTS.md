---
title: "Operational Scripts"
document_id: "LOYALLIA-DOC-SCRIPTS.MD"
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
| **Document ID** | LOYALLIA-DOC-SCRIPTS.MD |
| **Title** | Operational Scripts |
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
| **Location** | `docs/04-runbooks/SCRIPTS.md` |

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

# Operational Scripts

## Purpose

This directory contains **ad-hoc operational and maintenance scripts** that are run outside the normal deployment flow. These scripts perform sensitive or infrequent tasks such as secret rotation, security hardening, and one-off data migrations.

Scripts here are intended to be run manually by operators with appropriate credentials and environment access.

## Files

| File | Description |
|------|-------------|
| `rotate_secrets.sh` | Rotates secrets in HashiCorp Vault KV v2 and restarts affected services. Supports full rotation or single-secret rotation with `--secret`. |

## Configuration

### `rotate_secrets.sh`

#### Prerequisites

- `vault` CLI installed and in `$PATH`
- `docker` CLI available
- Environment variables set:
  ```bash
  export VAULT_ADDR=https://127.0.0.1:33908
  export VAULT_TOKEN=<app-token-or-root-token>
  ```

#### Secrets Managed

| Secret | Generator | Services Restarted |
|--------|-----------|-------------------|
| `secret_key` | Django `get_random_secret_key()` | API, Celery workers |
| `postgres_password` | `secrets.token_urlsafe(24)` | All services (requires `docker compose down && up -d`) |
| `redis_password` | `secrets.token_urlsafe(24)` | Redis, API, Celery workers, Flower |
| `minio_root_password` | `secrets.token_urlsafe(24)` | MinIO, API |
| `jwt_secret_key` | `secrets.token_urlsafe(32)` | API, Celery workers |
| `pass_hmac_secret` | `secrets.token_urlsafe(32)` | API, `celery-pass` |
| `flower_basic_auth` | `loyallia:<random>` | Flower |

> **Known limitation:** `rotate_secrets.sh` writes rotated values as top-level keys (e.g., `redis_password`, `minio_root_password`). The Loyallia application reads `redis_url` and MinIO credentials (`minio_access_key` / `minio_secret_key`) from Vault, so rotating `redis_password` or `minio_root_password` alone will not update those connection strings. After rotating these secrets, update the corresponding composite keys in Vault manually or via `deploy/vault/init.sh`.

#### Backup Directory

Rotated secrets are backed up to:

```
$PROJECT_ROOT/deploy/backups/secret-snapshots/secrets_YYYYMMDD_HHMMSS.json
```

## Usage

### Rotate All Secrets

```bash
bash ./deploy/scripts/rotate_secrets.sh
```

### Dry Run (preview only)

```bash
bash ./deploy/scripts/rotate_secrets.sh --dry-run
```

### Rotate a Single Secret

```bash
bash ./deploy/scripts/rotate_secrets.sh --secret redis_password
```

### Post-Rotation Checklist

The script prints a checklist on completion:

1. Verify services are healthy: `docker compose ps`
2. Test API: `curl http://localhost:33905/api/v1/health/`
3. Update `.env` file with new values (for local dev)
4. Clean up old backups: `find deploy/backups/secret-snapshots -mtime +30 -delete`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `vault CLI not found` | Install HashiCorp Vault CLI: `brew install vault` (macOS) or download from releases page. |
| `VAULT_ADDR not set` | Export `VAULT_ADDR` pointing to the running Vault instance. |
| `VAULT_TOKEN not set` | Export a valid token. Use the app token from `/vault/runtime/app-token` or a root token. |
| Service fails after rotation | Check the service logs: `docker compose logs <service>`. Ensure the new secret was written correctly to Vault. |
| PostgreSQL password rotated but app won't start | PostgreSQL password rotation requires a **full stack restart** (`docker compose down && docker compose up -d`). This causes downtime — schedule during a maintenance window. |
| Backup file is empty | The script attempts to back up before rotation. If Vault is unreachable, the backup may fail but rotation continues. Verify Vault status before running. |

## Related Docs

- [`deploy/vault/`](../vault/) — Vault initialization, policies, and token management
- [`deploy/bootstrap/`](../bootstrap/) — Deployment orchestrator and `generate_secrets.sh`
- [`deploy/backups/`](../backups/) — Backup and restore procedures
- [`../../docs/02-architecture/ARCHITECTURE.md`](../02-architecture/ARCHITECTURE.md) — Security architecture and secret lifecycle
