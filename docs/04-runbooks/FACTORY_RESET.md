---
title: "Factory Reset"
document_id: "LOYALLIA-DOC-FACTORY_RESET.MD"
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
| **Document ID** | LOYALLIA-DOC-FACTORY_RESET.MD |
| **Title** | Factory Reset |
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
| **Location** | `docs/04-runbooks/FACTORY_RESET.md` |

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

# Factory Reset

## Purpose

Safe, auditable way to destroy a Loyallia environment and return to clean slate. Three mechanisms exist:

| Mechanism | Level | Destroys | Safety |
|---|---|---|---|
| Dev shell script | Docker infrastructure | Containers, volumes, networks | Type `DESTROY` |
| Prod shell script | Docker infrastructure | Same + 14 named volumes + 3 networks | CLI flag + domain + `DESTROY` |
| API (`platform_reset.py`) | Application data only | DB rows, Redis cache | OTP + `transaction.atomic()` |

## Files

| File | Description |
|---|---|
| `deploy/factory_reset/development/factory_reset.sh` | Dev Docker wipe. Type `DESTROY`. |
| `deploy/factory_reset/production/factory_reset.sh` | Prod Docker wipe. `--i-am-sure-production` + domain + `DESTROY`. |
| `backend/apps/tenants/super_admin_api/platform_reset.py` | API factory reset. SUPER_ADMIN + OTP. Blocks in production. |

## Shell Scripts

### Development

```bash
./deploy/factory_reset/development/factory_reset.sh
```

Destroys: all containers, all volumes (named + dangling with `loyallia`), all networks.

### Production

```bash
./deploy/factory_reset/production/factory_reset.sh --i-am-sure-production
```

Three confirmations:
1. CLI flag `--i-am-sure-production`
2. Type domain `rewards.loyallia.com`
3. Type `DESTROY`

Destroys 14 named volumes: `postgres_data`, `postgres_replica_data`, `redis_data`, `minio_data`, `vault_data`, `vault_runtime`, `static_files`, `media_files`, `next_cache`, `prometheus_data`, `grafana_data`, `loki_data`, `alertmanager-data`, `sentinel-data`.

Destroys 3 networks: `frontend-net`, `backend-net`, `monitoring-net`.

Optionally removes built Docker images.

## API Factory Reset (platform_reset.py)

Two-step process:

### Step 1: Request OTP

```
POST /api/v1/admin/platform/factory-reset/request/
Authorization: Bearer <SUPER_ADMIN_JWT>
```

- Sends OTP via Twilio Verify (if enabled) or local OTP + SMS fallback
- Sends email notification with OTP
- Stores verification SID in Redis (5-min TTL)

### Step 2: Confirm with OTP

```
POST /api/v1/admin/platform/factory-reset/confirm/
Authorization: Bearer <SUPER_ADMIN_JWT>
Body: { "otp": "123456" }
```

- Validates OTP via `check_otp()`
- **Blocks in production** (`PLATFORM_MODE=production` → HTTP 403)
- Writes audit log BEFORE wipe (`AuditAction.FACTORY_RESET`)
- Wipes in `transaction.atomic()` — deepest FK dependencies first:

```
Notification → CampaignDeliveryLog → CampaignRun → AutomationExecution →
Automation → CustomerPass → Enrollment → Transaction → Customer →
Card → Invoice → WebhookEvent → Subscription → RefreshToken →
Location → User (EXCEPT SUPER_ADMIN) → Tenant
```

- Re-seeds: `seed_subscription_plans`, `seed_platform_settings`
- Clears Redis cache

**Preserved:** SUPER_ADMIN users, Vault secrets, subscription plans, platform settings, audit log.

## Seed Demo Data

```
POST /api/v1/admin/platform/seed-demo-data/
Authorization: Bearer <SUPER_ADMIN_JWT>
```

- Blocks in production
- Calls `seed_development_data` + `seed_ecuador_businesses` management commands
- Audit logged (`AuditAction.SEED_DEMO`)

## Safety

- `set -euo pipefail` on all shell scripts
- Production shell: CLI flag + domain + DESTROY
- API: SUPER_ADMIN + OTP + production block + atomic transaction
- All scripts idempotent

## Troubleshooting

| Issue | Fix |
|---|---|
| "DESTROY" not accepted | Type exactly `DESTROY` uppercase, no extra spaces |
| Script exits without destroying | No containers/volumes found. Check `docker compose ps` |
| Permission denied | Add user to `docker` group or use `sudo` |
| Volumes remain | `docker volume prune -f` |
| API reset blocked in production | Expected — `_is_production_environment()` returns True when `PLATFORM_MODE=production` |
| OTP expired | Request new OTP (5-min TTL) |

## Related Docs

- `deploy/bootstrap/` — Re-bootstrap after reset
- `deploy/disaster_recovery/` — Recover from encrypted rescue files
- `deploy/backups/` — Backup before reset
- `docs/02-architecture/BACKUP_ARCHITECTURE.md` — Backup policies
