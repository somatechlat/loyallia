---
title: "Billing"
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
| **Title** | Billing |
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
| **Location** | `backend/apps/billing/README.md` |

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

# Billing

Subscription management, plan enforcement, and payment processing (Stripe-ready architecture).

## Models

- `SubscriptionPlan` — DB-driven plan definitions with limits and features
- `Subscription` — tenant subscription with trial, active, past_due, suspended states
- `Invoice` — generated invoices
- `PaymentMethod` — stored payment methods (PCI-compliant tokens)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/billing/plans/` | Available plans |
| GET | `/api/v1/billing/subscription/` | Current subscription |
| POST | `/api/v1/billing/subscribe/` | Subscribe to plan |
| GET | `/api/v1/billing/usage/` | Resource usage vs limits |
| GET | `/api/v1/billing/invoices/` | Invoice history |
| POST | `/api/v1/billing/webhook/` | Stripe webhook |

## Plan Enforcement

- `common/plan_enforcement.py` — `@enforce_limit`, `@require_feature`, `@require_active_subscription` decorators
- `Subscription.get_limit()` — resolves plan or trial limits
- `SubscriptionPlan.TRIAL_LIMITS` — centralized trial limits

## Payment Gateway

- `payment_gateway.py` — Pluggable gateway interface
- `payment_api.py` — Payment method management

## Dependencies

- `apps.tenants` (Tenant)
- Stripe (webhook-ready)

## Called By

- Dashboard billing page
- Plan selection modal
- All plan-gated endpoints (via decorators)
