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
