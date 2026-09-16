---
title: "Manager Journey"
document_id: "LOYALLIA-DOC-MANAGER.MD"
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
| **Document ID** | LOYALLIA-DOC-MANAGER.MD |
| **Title** | Manager Journey |
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
| **Location** | `docs/06-planning/user-journeys/MANAGER.md` |

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

# Manager Journey

Tenant manager. Can manage programs, customers, and locations. Cannot manage billing or team.

## Entry Points

- `/` — Dashboard home
- `/programs` — Program management (view/edit)
- `/customers` — Customer CRUD
- `/locations` — Location management
- `/campaigns` — Campaign creation and monitoring
- `/analytics` — Analytics view

## Key Flows

### 1. Customer Enrollment
1. Navigate to `/customers`
2. View existing customers (create new customer is OWNER-only)
3. Select customer and program to enroll
4. API: `POST /api/v1/customers/{id}/enroll/?card_id={cardId}` → creates CustomerPass
5. QR code and wallet links generated

### 2. Transaction Processing (via Scanner)
1. Open `/scanner/scan` on mobile device
2. Scan customer QR code
3. Select action (stamp, redeem, add points)
4. Confirm transaction
5. API: `POST /api/v1/scanner/transact/`
6. Customer pass updated in real-time

### 3. Location Management
1. Navigate to `/locations`
2. View existing locations (create new location is OWNER-only)
3. Set primary location flag

### 4. Campaign Monitoring
1. Navigate to `/campaigns`
2. View sent campaigns and delivery stats
3. Click campaign for detailed results
4. Export recipient list

## Database State Changes

| Action | Tables Affected |
|--------|----------------|
| Enroll customer | `loyallia_customer_passes` |
| Process transaction | `loyallia_transactions`, `loyallia_customer_passes` |

## Error Scenarios

- Customer already enrolled → 400 duplicate error
- Invalid QR code → 404 not found
- Plan limit (customers/locations) → 403
