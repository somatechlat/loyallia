---
title: "Super Admin Journey"
document_id: "LOYALLIA-DOC-SUPER_ADMIN.MD"
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
| **Document ID** | LOYALLIA-DOC-SUPER_ADMIN.MD |
| **Title** | Super Admin Journey |
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
| **Location** | `docs/06-planning/user-journeys/SUPER_ADMIN.md` |

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

# Super Admin Journey

Platform administrator with full system access.

## Entry Points

- `/superadmin` — SaaS Central Command dashboard
- `/superadmin/tenants` — Tenant management
- `/superadmin/plans` — Subscription plan management
- `/superadmin/metrics` — Platform analytics
- `/superadmin/settings` — Global configuration

## Key Flows

### 1. Tenant Creation
1. Navigate to `/superadmin/tenants`
2. Click "Nuevo Tenant" → opens 4-step wizard
3. Step 1: Business info (name, slug, email, phone)
4. Step 2: Plan selection + billing cycle
5. Step 3: Location(s) with map picker
6. Step 4: Review and confirm
7. API: `POST /api/v1/admin/tenants/` → creates Tenant + Subscription + Owner User
8. Email sent to tenant owner with credentials

### 2. Plan Management
1. Navigate to `/superadmin/plans`
2. Create or edit SubscriptionPlan
3. Set limits (customers, programs, locations, notifications, etc.)
4. Toggle active/featured status
5. API: `POST /api/v1/admin/plans/` or `PATCH /api/v1/admin/plans/{id}/`

### 3. Impersonation
1. Find tenant in tenant list
2. Click "Ingresar como OWNER"
3. API: `POST /api/v1/admin/tenants/{tenant_id}/impersonate/` (requires owner PIN and justification)
4. Receives temporary JWT scoped to tenant
5. Redirected to tenant dashboard
6. "Salir de impersonación" restores original session

### 4. System Operations
- **Seed demo data**: `POST /api/v1/admin/reset/platform/seed-demo-data/`
- **Factory reset**: Request OTP → Confirm → `POST /api/v1/admin/reset/platform/factory-reset/confirm/`
- **Broadcast message**: `POST /api/v1/admin/broadcast/` — not currently implemented
- **Platform mode toggle**: Development ↔ Production

## Database State Changes

| Action | Tables Affected |
|--------|----------------|
| Create tenant | `loyallia_tenants`, `loyallia_subscriptions`, `loyallia_users` |
| Update plan | `loyallia_subscription_plans` |
| Impersonate | None (token-only) |
| Factory reset | Truncates most tenant-scoped tables |

## Error Scenarios

- Duplicate owner email → 400 validation error
- Invalid plan limits → 400 Pydantic validation
- Factory reset without OTP → 403 forbidden
