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
