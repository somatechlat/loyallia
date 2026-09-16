---
title: "Production Server State"
document_id: "LOYALLIA-DOC-PRODUCTION_SERVER_STATE.MD"
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
| **Document ID** | LOYALLIA-DOC-PRODUCTION_SERVER_STATE.MD |
| **Title** | Production Server State |
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
| **Location** | `docs/08-references/PRODUCTION_SERVER_STATE.md` |

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

# Production Server State

> **Last updated:** 2026-08-28
> **Server:** `root@140.82.15.48` / hostname `loyallia`
> **OS:** Ubuntu (Docker 29.1.3, Compose 2.40.3)
> **RAM:** 31GB | **CPU:** 4 cores | **Disk:** 94GB

## Container Status

| Container | Port | Status | Purpose |
|-----------|------|--------|---------|
| `loyallia-nginx` | 80, 443 | Running | SSL termination, reverse proxy |
| `loyallia-api` | 33905 | Running (healthy) | Django + Gunicorn |
| `loyallia-web` | 33906 | Running | Next.js frontend |
| `loyallia-postgres` | 33900 | Running (healthy) | PostgreSQL 17 |
| `loyallia-pgbouncer` | 33901 | Running | Connection pooler |
| `loyallia-redis` | 33902 | Running | Cache + message broker |
| `loyallia-celery-worker` | - | Running | Async task processing |
| `loyallia-celery-beat` | - | Running | Periodic task scheduler |
| `loyallia-minio` | 33903, 33904 | Running | Object storage |
| `loyallia-vault` | 33908 | Running (unsealed) | Secrets management |
| `loyallia-prometheus` | 33909 | Running | Metrics collection |
| `loyallia-grafana` | 33910 | Running | Metrics visualization |

## Coexisting Application

**padelapp** at `/opt/padelapp/` on ports 34003 — **DO NOT TOUCH**
- 6 containers running independently
- Completely separate from Loyallia

## Credentials

### SuperAdmin
- **Email:** `admin@loyallia.com`
- **Password:** `SwypxN2DMuYs6tqL86PhqHTG`
- **Role:** SUPER_ADMIN (platform-wide access)

### Owner (Test)
- **Email:** `owner@testloyallia.com`
- **Password:** `AiFKR6ANAk0`
- **Role:** OWNER (business-level access)

### E2E Test Users (Provisioned)
- **Email:** `e2e-{role}@loyallia.com` (role = owner, manager, staff, superadmin)
- **Password:** Generated by `provision_production_e2e_test_users --generate`
- **Tenant:** `e2e-production-tenant` (Enterprise plan)

## SSL Certificate

- **Provider:** Let's Encrypt
- **Domain:** `rewards.loyallia.com`
- **Valid until:** November 2026
- **Auto-renewal:** Working

## Port Authority

| Port | Service | Network Binding |
|------|---------|-----------------|
| 80 | Nginx HTTP | 0.0.0.0 |
| 443 | Nginx HTTPS | 0.0.0.0 |
| 33900 | PostgreSQL | 127.0.0.1 |
| 33901 | PgBouncer | 127.0.0.1 |
| 33902 | Redis | 127.0.0.1 |
| 33903 | MinIO API | 127.0.0.1 |
| 33904 | MinIO Console | 127.0.0.1 |
| 33905 | Django API | 127.0.0.1 |
| 33906 | Next.js Web | 127.0.0.1 |
| 33907 | Flower (Celery) | 127.0.0.1 |
| 33908 | Vault | 127.0.0.1 |
| 33909 | Prometheus | 127.0.0.1 |
| 33910 | Grafana | 127.0.0.1 |

## Vault

- **Path:** `secret/data/loyallia/production`
- **Status:** Unsealed (requires 3 of 5 keys on restart)
- **Auto-unseal:** NOT configured (manual unseal required)

## Git

- **Repository:** `/opt/loyallia/`
- **Branch:** `main`
- **Latest commits:**
  - `93882e6` — fix: backup route order, impersonation revoke, seed demo env guard
  - `b6e2847` — fix: revert uuid converter syntax in backup routes
  - `fd29a02` — fix: impersonation revoke message, seed demo env guard
  - `f8ac6bb` — fix: CardCreateIn/CardUpdateIn, create_program, update_program

## Known Issues

1. **Vault seals on restart** — requires manual unseal with 3 of 5 keys
2. **Apple/Google Wallet certs** — placeholder values in Vault (not real certs)
3. **Git push blocked** — branch protection on `main`, patches applied via SCP
4. **Manager role testing** — blocked by Starter plan user limit (3/3)
