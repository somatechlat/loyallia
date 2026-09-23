---
title: "Customer Journey"
document_id: "LOYALLIA-DOC-CUSTOMER.MD"
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
| **Document ID** | LOYALLIA-DOC-CUSTOMER.MD |
| **Title** | Customer Journey |
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
| **Location** | `docs/06-planning/user-journeys/CUSTOMER.md` |

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

# Customer Journey

End customer enrolling in loyalty programs and using digital wallet passes.

## Entry Points

- `/enroll/{slug}` — Public enrollment page
- `/pass/{id}` — Digital pass display
- `/portal` — Customer self-service portal

## Key Flows

### 1. Enrollment
1. Receive enrollment link (QR scan, WhatsApp, email, or social)
2. Open `/enroll/{card_slug}`
3. View program details and rewards
4. Fill registration form (name, email, phone)
5. API: `POST /api/v1/customers/enroll/?card_id={cardId}`
6. System creates Customer + CustomerPass
7. Display success with wallet save options:
   - **Apple Wallet** — Download .pkpass file
   - **Google Wallet** — Save to Google Wallet button
   - **QR Code** — Display pass QR for manual scanning

### 2. Wallet Pass Usage
1. Open Apple/Google Wallet app
2. Present pass QR code at point of sale
3. Staff scans QR code
4. Stamp/points added or reward redeemed
5. Push notification confirms transaction

### 3. Portal Access
1. Visit `/portal`
2. Enter email → receives temporary password by email
3. Log in with email + temporary password at `/portal/login`
4. View:
   - Active passes and balances
   - Transaction history
   - Available rewards
   - Personal QR code

## Database State Changes

| Action | Tables Affected |
|--------|----------------|
| Enroll | `loyallia_customers`, `loyallia_customer_passes` |
| Wallet save | Updates `loyallia_customer_passes.apple_pass_id` / `google_pass_id` |
| Portal login | None (token-based) |

## Error Scenarios

- Program not published → "Programa no disponible"
- Already enrolled → "Ya estás inscrito"
- Invalid card slug → 404
- Wallet push fails → Pass still valid, retry later
