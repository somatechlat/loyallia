---
title: "Wallet App Module"
document_id: "LOYALLIA-DOC-WALLET-APP-MD"
version: "1.0"
status: "approved"
last_updated: "2026-10-08"
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
| **Document ID** | LOYALLIA-DOC-WALLET-APP-MD |
| **Title** | Wallet App Module |
| **Version** | 1.0 |
| **Date** | 2026-10-08 |
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
| **Location** | `backend/apps/wallet/README.md` |

### Revision History

| Version | Date | User | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-10-08 | Engineering Lead | Initial module README for code-module documentation index |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-GUIDE-DS-001 | Wallet Design System Guide | Reference |
| LOYALLIA-GUIDE-TPL-001 | Wallet Card Templates Guide | Reference |

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
| Engineering Lead | — | — | 2026-10-08 | Approved |
| Product Owner | — | — | — | Pending Review |

# Wallet App Module (`backend/apps/wallet`)

## Purpose

CRUD for user-saved **Wallet Pass Studio templates** (design presets stored per tenant/owner).

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/wallet/templates/` | List templates (lite — no `design_state`) |
| POST | `/api/v1/wallet/templates/` | Create template |
| GET | `/api/v1/wallet/templates/{id}/` | Template detail (**includes** `design_state`) |
| PATCH | `/api/v1/wallet/templates/{id}/` | Update template |
| DELETE | `/api/v1/wallet/templates/{id}/` | Delete template |

Feature gate: `wallet_pass_studio`. Plan limit: `wallet_templates`.

## Models

- `WalletTemplate` — tenant/owner scoped; `design_state` JSON holds full studio state.
- `WalletPassOperationLog` — audit of template create/update/delete.

## Related code

- Frontend studio: `frontend/src/components/wallet/studio/`
- Design system: `frontend/src/components/wallet/design-system.ts`
- Pass generation: `backend/apps/customers/pass_engine/` (Apple pkpass / Google JWT)

Code is the source of truth. This README is the module map, not a full SRS.
