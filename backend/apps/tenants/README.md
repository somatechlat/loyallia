---
title: "Tenants"
document_id: "LOYALLIA-DOC-README.MD"
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
| **Document ID** | LOYALLIA-DOC-README.MD |
| **Title** | Tenants |
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
| **Location** | `backend/apps/tenants/README.md` |

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

# Tenants

Multi-tenant architecture. Each tenant is an isolated business account with its own users, programs, customers, and data.

## Models

- `Tenant` — business account with subscription, branding, and settings
- `Location` — physical branch/office per tenant
- `PlatformSetting` — global SaaS configuration (tax rates, trial days, feature flags)
- `AIQueryLog` — per-tenant AI assistant usage tracking

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/tenants/me/` | Current tenant profile |
| PUT | `/api/v1/tenants/me/` | Update tenant settings |
| GET | `/api/v1/tenants/me/plan-features/` | Active plan features |
| GET | `/api/v1/tenants/team/` | Team members |
| POST | `/api/v1/tenants/team/` | Invite team member |
| GET | `/api/v1/tenants/locations/` | List locations |
| POST | `/api/v1/tenants/locations/` | Create location |
| GET | `/api/v1/tenants/data-export/` | Export tenant data (GDPR/LOPDP) |
| POST | `/api/v1/tenants/delete-account/` | Schedule account deletion |

## Super Admin API

- `super_admin_api/platform.py` — Platform metrics, broadcast, mode toggle
- `super_admin_api/tenants.py` — Tenant CRUD, impersonation
- `super_admin_api/billing.py` — Plan management

## Middleware

- `TenantMiddleware` — resolves tenant from JWT claim and attaches to request

## Dependencies

- `apps.billing` (subscription status)

## Called By

- All dashboard pages (tenant context)
- Super admin panel
