---
title: "Factory Reset Procedure"
document_id: "LOYALLIA-DOC-FACTORY_RESET_PROCEDURE.MD"
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
| **Document ID** | LOYALLIA-DOC-FACTORY_RESET_PROCEDURE.MD |
| **Title** | Factory Reset Procedure |
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
| **Location** | `docs/04-runbooks/FACTORY_RESET_PROCEDURE.md` |

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

# Factory Reset Procedure

**Document ID:** LYL-OPS-FACTORY-RESET-001
**Classification:** Internal — Destructive Operation

---

## CRITICAL WARNINGS

1. **NEVER run shell scripts on production without backups.**
2. **Shell scripts destroy EVERYTHING** — containers, volumes, networks, Vault, database.
3. **API factory reset destroys data only** — preserves Vault, SuperAdmin, plans, settings.
4. **Ensure `.agents/` rescue files exist BEFORE running shell reset.**

---

## Pre-Reset Checklist

- [ ] Confirm environment (dev disposable or prod with backups)
- [ ] Confirm `.agents/vault_init_rescue.json` exists
- [ ] Confirm `.agents/vault_secrets_rescue.json` exists
- [ ] Confirm postgres dump exists (if data matters)
- [ ] Notify other developers
- [ ] Export data you need to keep

---

## Option A: Shell Factory Reset (Docker-level)

### Development

```bash
./deploy/factory_reset/development/factory_reset.sh
# Type DESTROY when prompted
```

### Production

```bash
./deploy/factory_reset/production/factory_reset.sh --i-am-sure-production
# Type rewards.loyallia.com when prompted
# Type DESTROY when prompted
```

**Destroys:** All containers, 14 named volumes (postgres_data, vault_data, redis_data, minio_data, etc.), 3 networks.

**After:** Run `./deploy/bootstrap/bootstrap-{development,production}.sh` to rebuild.

---

## Option B: API Factory Reset (Data-level)

Preserves Vault secrets, SuperAdmin user, subscription plans, platform settings.

### Step 1 — Request OTP

```bash
curl -X POST https://rewards.loyallia.com/api/v1/admin/platform/factory-reset/request/ \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>"
```

OTP sent via SMS + email. Expires in 5 minutes.

### Step 2 — Confirm

```bash
curl -X POST https://rewards.loyallia.com/api/v1/admin/platform/factory-reset/confirm/ \
  -H "Authorization: Bearer <SUPER_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"otp": "123456"}'
```

**Blocks in production** when `PLATFORM_MODE=production` (HTTP 403).

**Wipe order** (from `platform_reset.py:264-280`):
1. Notification
2. CampaignDeliveryLog
3. CampaignRun
4. AutomationExecution
5. Automation
6. CustomerPass
7. Enrollment
8. Transaction
9. Customer
10. Card
11. Invoice
12. WebhookEvent
13. Subscription
14. RefreshToken
15. Location
16. User (EXCEPT `role=SUPER_ADMIN`)
17. Tenant

**Post-wipe** (from `platform_reset.py:282-286`):
- `seed_subscription_plans` — recreates Trial, Starter, Professional, Enterprise
- `seed_platform_settings` — recreates all default settings
- `cache.clear()` — flushes Redis

**Audit:** `AuditAction.FACTORY_RESET` logged BEFORE wipe (line 241).

---

## Post-Reset Verification

```bash
# API health
curl -sf http://localhost:33905/api/v1/health/

# All containers healthy
docker compose ps

# Vault unsealed
curl -sf "http://localhost:33908/v1/sys/health?standbyok=true"

# Seeds idempotent
docker compose exec -T api python manage.py seed_platform_settings --mode=development
docker compose exec -T api python manage.py seed_subscription_plans
```

---

## Rescue File Creation

```bash
# Development
bash deploy/disaster_recovery/development/create_rescue.sh

# Production
bash deploy/disaster_recovery/production/create_rescue.sh
```

Creates encrypted `.age` files in `.agents/`.

---

*Last updated: 2026-09-11*
*Source of truth: `deploy/factory_reset/` scripts + `backend/apps/tenants/super_admin_api/platform_reset.py`*
