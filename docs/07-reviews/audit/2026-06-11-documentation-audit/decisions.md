---
title: "Documentation Reorganization Decisions"
document_id: "LOYALLIA-DOC-DECISIONS.MD"
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
| **Document ID** | LOYALLIA-DOC-DECISIONS.MD |
| **Title** | Documentation Reorganization Decisions |
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
| **Language** | Spanish |
| **Format** | Markdown (.md) |
| **Location** | `docs/07-reviews/audit/2026-06-11-documentation-audit/decisions.md` |

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

> **Estado del documento (2026-06-11):** Revisión basada en el código y documentación vigente.
> Algunos hallazgos pueden haber cambiado; verificar siempre contra el código fuente.

# Documentation Reorganization Decisions

## Deletions

| File | Reason |
|------|--------|
| `docs/AVENDER_MINIO_S3_DEPLOYMENT.md` | Contained plaintext production credentials; violated no-secrets policy. Functionality covered elsewhere. |
| `docs/wallet-studio/IMPLEMENTATION-PLAN.md` | Functional duplicate of `COMPLETE-IMPLEMENTATION-GUIDE.md`. |
| `deploy/alerting/README.md` | Near-duplicate of `ESCALATION.md`. |

## Archives

| File | Reason |
|------|--------|
| `docs/BACKUP_DISASTER_RECOVERY.md` | Superseded by newer backup/DR/runbook docs. |
| `docs/reviews/FULL_SYSTEM_AUDIT_2026-06-03.md` | Superseded by 2026-06-04 full-system audit. |
| `docs/wallet-studio/SRS-MASTER-EXECUTIVE-SUMMARY.md` | Superseded by README and Complete Implementation Guide. |
| `docs/implementation/WALLET_DESIGNER_ROADMAP.md` | Pre-PASS-DESIGNER proposal. |
| `docs/implementation/WALLET_DESIGNER_V2_UIUX_ARCHITECTURE.md` | Pre-PASS-DESIGNER proposal. |
| `deploy/disaster_recovery/README.md` | Superseded by `DISASTER_RECOVERY_PLAYBOOK.md`. |
| `deploy/bootstrap/README.md` | Superseded by architecture and deployment docs. |
| `deploy/backups/README.md` | Superseded by backup runbooks and architecture docs. |
| `HANDOFF.md` | Historical session handoff. |

## Moves

See `inventory.json` for the complete list of moved files and target paths.

## Link Updates

All internal Markdown links were scanned and repaired after the moves. See `verification_report.md` for the final link-check result.

## Corrections to Audit Reports (post-reorganization)

Los siguientes reportes de audit fueron corregidos para reflejar el estado actual del repositorio y añadir disclaimers de snapshot:

- `docs/07-reviews/audit/QA_TESTING_AUDIT_REPORT.md`: conteos actualizados a 42 archivos de test backend, 7 archivos de test unitario frontend y 32 archivos E2E; se añadieron disclaimers de snapshot y se marcó la tabla de brechas de cobertura como fotografía del audit.
- `docs/07-reviews/audit/UI_UX_AUDIT_REPORT.md`: se actualizaron referencias de línea para cadenas hardcodeadas, emojis/símbolos, `<a>` vs `next/link` en `CustomerTable` y la lista screen-by-screen; se marcaron como resueltos los hallazgos que ya fueron corregidos en el código.

Estas correcciones no introducen cambios de código; solo actualizan la documentación de auditoría.
