---
title: "Owner Journey"
document_id: "LOYALLIA-DOC-OWNER.MD"
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
| **Document ID** | LOYALLIA-DOC-OWNER.MD |
| **Title** | Owner Journey |
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
| **Location** | `docs/06-planning/user-journeys/OWNER.md` |

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

# Owner Journey

Tenant owner. Full access to all tenant features including billing and team management.

## Entry Points

- `/` — Dashboard home
- `/programs` — Loyalty program management
- `/customers` — Customer database
- `/campaigns` — Marketing campaigns
- `/analytics` — Business analytics
- `/automation` — Rule-based automation
- `/settings` — Tenant settings
- `/billing` — Subscription and invoices
- `/team` — Team management

## Key Flows

### 1. Program Creation
1. Navigate to `/programs/new`
2. Select card type (stamp, points, cashback, etc.)
3. Configure basic fields (name, description, colors)
4. Design wallet pass (Apple/Google) via WalletDesigner
5. Set rewards and rules
6. Publish program
7. API: `POST /api/v1/programs/` → creates Card with metadata

### 2. Campaign Launch
1. Navigate to `/campaigns`
2. Click "Nueva campaña"
3. Select channel (email, SMS, WhatsApp, push)
4. Compose message with variable substitution
5. Select audience (all, segment, or specific customers)
6. Schedule or send immediately
7. API: `POST /api/v1/notifications/campaigns/` → creates CampaignRun
8. Celery dispatches to channel workers

### 3. Billing & Subscription
1. Navigate to `/billing`
2. View current usage vs plan limits
3. Select upgrade plan
4. Choose billing cycle (monthly/annual)
5. Add payment method
6. API: `POST /api/v1/billing/subscribe/` → returns invoice with `manual_verification_required: true`
7. SuperAdmin manually confirms payment via `POST /api/v1/admin/billing/confirm-payment/{invoice_id}/`

### 4. Team Management
1. Navigate to `/team`
2. Invite member by email
3. Select role (MANAGER or STAFF)
4. API: `POST /api/v1/tenants/team/`
5. Invitation email sent with signup link

## Database State Changes

| Action | Tables Affected |
|--------|----------------|
| Create program | `loyallia_cards` |
| Launch campaign | `loyallia_campaign_runs`, `loyallia_campaign_delivery_logs` |
| Subscribe | `loyallia_subscriptions`, `loyallia_payment_methods` |
| Invite team | `loyallia_users` |

## Error Scenarios

- Plan limit exceeded → 403 with `PLAN_LIMIT_EXCEEDED`
- Feature not in plan → 403 with `PLAN_FEATURE_UNAVAILABLE`
- Subscription expired → 402 `BILLING_PLAN_REQUIRED`
