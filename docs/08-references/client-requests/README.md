---
title: "Client Request Source Materials"
document_id: "LOYALLIA-DOC-CLIENT-REQUESTS-001"
version: "1.0"
status: "approved"
last_updated: "2026-09-23"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "LOYALLIA-DOC-00-INDEX.MD"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-DOC-CLIENT-REQUESTS-001 |
| **Title** | Client Request Source Materials |
| **Version** | 1.0 |
| **Date** | 2026-09-23 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | LOYALLIA-DOC-00-INDEX.MD |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/08-references/client-requests/README.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-23 | Engineering Lead | Initial ISO-controlled index for client request source materials |

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
| LOYALLIA-DOC-00-INDEX.MD | Loyallia Documentation Index | Parent |
| LOYALLIA-DOC-GAP-ANALYSIS-001 | GAP ANALYSIS REPORT — Loyallia | Derived analysis |
| LOYALLIA-DOC-REFS-README-001 | References | Sibling index |
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |

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
| Engineering Lead | — | — | 2026-09-23 | Approved |
| Product Owner | — | — | 2026-09-23 | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-23 | Engineering Lead | Initial ISO-controlled folder index |
| Approved | 2026-09-23 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

# Client Request Source Materials

Controlled index of the original client-supplied requirement and status documents. These are source materials (binary and HTML/PDF artifacts preserved as received, with filenames normalized to dashes). They are retained for traceability of client-requested changes and addons; they are not engineering specifications.

| File | Description |
|------|-------------|
| `GAP_ANALYSIS_REPORT.md` | ISO-controlled gap analysis comparing client requests against the current codebase |
| `INFORME_ESTADO_CLIENTE.pdf` | Client status report (PDF export of the customer state informe) |
| `informe_estado.html` | Client status report (HTML source of the customer state informe) |
| `MEJORAS-LOYALLIA-Actualizacion-2-tarjeta-de-sellos.docx` | Client improvement request, update 2 — stamp card (tarjeta de sellos) |
| `MEJORAS-LOYALLIA-Actualizacion-3-tarjeta-de-cupon-de-descuento-1.docx` | Client improvement request, update 3 — discount coupon card (revision copy 1) |
| `MEJORAS-LOYALLIA-Actualizacion-3-tarjeta-de-cupon-de-descuento.docx` | Client improvement request, update 3 — discount coupon card (tarjeta de cupón de descuento) |
| `Mejoras-UX-UI-Seleccion-de-Tipo-de-Programa-de-Fidelizacion.docx` | UX/UI improvement request — loyalty program type selection flow |
| `Requerimientos-Loyallia.docx` | General Loyallia client requirements specification |

**Note:** Original source folder `CHANGES AND ADDONS CLIENT REQUESTED/` (repo root, outside the ISO tree) was retired on 2026-09-23; contents relocated here under ISO document control.
