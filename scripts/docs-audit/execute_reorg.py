#!/usr/bin/env python3
"""Execute documentation reorganization decisions."""
import subprocess
import shutil
from pathlib import Path

ROOT = Path("/Users/macbookpro201916i964gb1tb/Documents/GitHub/loyallia")

# source -> destination (relative to ROOT)
MOVES = {
    # 01-start-here
    "docs/AGENT_ONBOARDING.md": "docs/01-start-here/AGENT_ONBOARDING.md",

    # 02-architecture
    "docs/ARCHITECTURE.md": "docs/02-architecture/ARCHITECTURE.md",
    "docs/BOOTSTRAP_ARCHITECTURE.md": "docs/02-architecture/BOOTSTRAP_ARCHITECTURE.md",
    "docs/BACKUP_ARCHITECTURE.md": "docs/02-architecture/BACKUP_ARCHITECTURE.md",
    "docs/APPLE_WALLET_WEB_PKPASS_NFC.md": "docs/02-architecture/APPLE_WALLET_WEB_PKPASS_NFC.md",

    # 03-guides
    "docs/guides/Authentication.md": "docs/03-guides/Authentication.md",
    "docs/guides/Billing-Payments.md": "docs/03-guides/Billing-Payments.md",
    "docs/guides/Notifications.md": "docs/03-guides/Notifications.md",
    "docs/guides/Redemption-Engine.md": "docs/03-guides/Redemption-Engine.md",
    "docs/BACKUP_TESTING_PLAN.md": "docs/03-guides/BACKUP_TESTING_PLAN.md",

    # 04-runbooks
    "docs/BACKUP_OPERATIONS_RUNBOOK.md": "docs/04-runbooks/BACKUP_OPERATIONS_RUNBOOK.md",
    "docs/DEPLOYMENT_GUIDE.md": "docs/04-runbooks/DEPLOYMENT_GUIDE.md",
    "docs/DISASTER_RECOVERY_PLAYBOOK.md": "docs/04-runbooks/DISASTER_RECOVERY_PLAYBOOK.md",
    "docs/FACTORY_RESET_PROCEDURE.md": "docs/04-runbooks/FACTORY_RESET_PROCEDURE.md",
    "deploy/vault/README.md": "docs/04-runbooks/VAULT.md",
    "deploy/scripts/README.md": "docs/04-runbooks/SCRIPTS.md",
    "deploy/redis/README.md": "docs/04-runbooks/REDIS.md",
    "deploy/postgres/README.md": "docs/04-runbooks/POSTGRES.md",
    "deploy/pgbouncer/README.md": "docs/04-runbooks/PGBOUNCER.md",
    "deploy/grafana/README.md": "docs/04-runbooks/GRAFANA.md",
    "deploy/factory_reset/README.md": "docs/04-runbooks/FACTORY_RESET.md",
    "deploy/alerts/README.md": "docs/04-runbooks/ALERTS.md",
    "deploy/alertmanager/README.md": "docs/04-runbooks/ALERTMANAGER.md",
    "deploy/alerting/ESCALATION.md": "docs/04-runbooks/ESCALATION.md",

    # 05-compliance
    "docs/COMPLIANCE_CHECKLIST.md": "docs/05-compliance/COMPLIANCE_CHECKLIST.md",
    "docs/iso27001/01-ISMS-Scope.md": "docs/05-compliance/iso27001/01-ISMS-Scope.md",
    "docs/iso27001/02-Risk-Assessment.md": "docs/05-compliance/iso27001/02-Risk-Assessment.md",
    "docs/iso27001/03-Statement-of-Applicability.md": "docs/05-compliance/iso27001/03-Statement-of-Applicability.md",
    "docs/iso27001/04-Access-Control-Policy.md": "docs/05-compliance/iso27001/04-Access-Control-Policy.md",
    "docs/iso27001/05-Incident-Management.md": "docs/05-compliance/iso27001/05-Incident-Management.md",
    "docs/iso27001/06-BCP-DR-Policy.md": "docs/05-compliance/iso27001/06-BCP-DR-Policy.md",
    "docs/reviews/REVIEW_RULES_COMPLIANCE.md": "docs/05-compliance/REVIEW_RULES_COMPLIANCE.md",

    # 06-planning
    "docs/implementation/MASTER_SYSADMIN_PLAN.md": "docs/06-planning/implementation/MASTER_SYSADMIN_PLAN.md",
    "docs/SRS_Loyallia_COMPLETE.md": "docs/06-planning/SRS_Loyallia_COMPLETE.md",
    "docs/SRS_Loyallia_HARDENING_v1.0.md": "docs/06-planning/SRS_Loyallia_HARDENING_v1.0.md",
    "docs/srs_user_journeys.md": "docs/06-planning/srs_user_journeys.md",
    "docs/TESTING_AUDIT_PLAN.md": "docs/06-planning/TESTING_AUDIT_PLAN.md",
    "docs/TODO_CURRENT_PRODUCTION_READINESS.md": "docs/06-planning/TODO_CURRENT_PRODUCTION_READINESS.md",
    "docs/WALLET_PUSH_NOTIFICATIONS_PLAN.md": "docs/06-planning/WALLET_PUSH_NOTIFICATIONS_PLAN.md",

    # wallet-studio (keep all active SRS in place, move folder into planning)
    "docs/wallet-studio/README.md": "docs/06-planning/wallet-studio/README.md",
    "docs/wallet-studio/SRS-001-Requirements.md": "docs/06-planning/wallet-studio/SRS-001-Requirements.md",
    "docs/wallet-studio/SRS-002-Architecture.md": "docs/06-planning/wallet-studio/SRS-002-Architecture.md",
    "docs/wallet-studio/SRS-003-UI-Specifications.md": "docs/06-planning/wallet-studio/SRS-003-UI-Specifications.md",
    "docs/wallet-studio/SRS-004-Appendices.md": "docs/06-planning/wallet-studio/SRS-004-Appendices.md",
    "docs/wallet-studio/SRS-005-User-Journeys.md": "docs/06-planning/wallet-studio/SRS-005-User-Journeys.md",
    "docs/wallet-studio/SRS-006-Card-Type-Visual-Customization.md": "docs/06-planning/wallet-studio/SRS-006-Card-Type-Visual-Customization.md",
    "docs/wallet-studio/SRS-007-AI-Integration.md": "docs/06-planning/wallet-studio/SRS-007-AI-Integration.md",
    "docs/wallet-studio/SRS-008-BACK-OF-PASS-DESIGN.md": "docs/06-planning/wallet-studio/SRS-008-BACK-OF-PASS-DESIGN.md",
    "docs/wallet-studio/SRS-009-USER-TEMPLATE-LIBRARY.md": "docs/06-planning/wallet-studio/SRS-009-USER-TEMPLATE-LIBRARY.md",
    "docs/wallet-studio/SRS-010-FIELDS-NOTIFICATIONS.md": "docs/06-planning/wallet-studio/SRS-010-FIELDS-NOTIFICATIONS.md",
    "docs/wallet-studio/SRS-011-PLAN-RATE-LIMITING.md": "docs/06-planning/wallet-studio/SRS-011-PLAN-RATE-LIMITING.md",
    "docs/wallet-studio/COMPLETE-IMPLEMENTATION-GUIDE.md": "docs/06-planning/wallet-studio/COMPLETE-IMPLEMENTATION-GUIDE.md",
    "docs/wallet-studio/TESTING-QA-STRATEGY.md": "docs/06-planning/wallet-studio/TESTING-QA-STRATEGY.md",
    "docs/wallet-studio/UI-FIX-PLAN.md": "docs/06-planning/wallet-studio/UI-FIX-PLAN.md",
    "docs/wallet-studio/DEV-FIX-PLAN.md": "docs/06-planning/wallet-studio/DEV-FIX-PLAN.md",

    # campaigns-redesign
    "docs/campaigns-redesign/01-ANALYSIS.md": "docs/06-planning/campaigns-redesign/01-ANALYSIS.md",
    "docs/campaigns-redesign/02-MOCKS.md": "docs/06-planning/campaigns-redesign/02-MOCKS.md",
    "docs/campaigns-redesign/03-DECISIONS.md": "docs/06-planning/campaigns-redesign/03-DECISIONS.md",

    # 07-reviews
    "docs/SETTINGS_COMPLETENESS_AUDIT.md": "docs/07-reviews/SETTINGS_COMPLETENESS_AUDIT.md",
    "docs/TESTING_AUDIT_REPORT_20260601.md": "docs/07-reviews/TESTING_AUDIT_REPORT_20260601.md",
    "deploy/MIGRATION_ROLLBACK.md": "docs/07-reviews/MIGRATION_ROLLBACK.md",
    "docs/audit/FULL_SYSTEM_AUDIT_REPORT.md": "docs/07-reviews/audit/FULL_SYSTEM_AUDIT_REPORT.md",
    "docs/audit/DATABASE_PERFORMANCE_AUDIT_REPORT.md": "docs/07-reviews/audit/DATABASE_PERFORMANCE_AUDIT_REPORT.md",
    "docs/audit/API_SECURITY_AUDIT_REPORT.md": "docs/07-reviews/audit/API_SECURITY_AUDIT_REPORT.md",
    "docs/audit/QA_TESTING_AUDIT_REPORT.md": "docs/07-reviews/audit/QA_TESTING_AUDIT_REPORT.md",
    "docs/audit/UI_UX_AUDIT_REPORT.md": "docs/07-reviews/audit/UI_UX_AUDIT_REPORT.md",
    "docs/audit/ARCHITECTURE_PATTERNS_AUDIT_REPORT.md": "docs/07-reviews/audit/ARCHITECTURE_PATTERNS_AUDIT_REPORT.md",
    "docs/reviews/REVIEW_VAULT_SETTINGS.md": "docs/07-reviews/REVIEW_VAULT_SETTINGS.md",
    "docs/reviews/REVIEW_SYSADMIN.md": "docs/07-reviews/REVIEW_SYSADMIN.md",
    "docs/reviews/REVIEW_PLAYWRIGHT_COVERAGE.md": "docs/07-reviews/REVIEW_PLAYWRIGHT_COVERAGE.md",
    "docs/reviews/REVIEW_OWNER_DASHBOARD.md": "docs/07-reviews/REVIEW_OWNER_DASHBOARD.md",
    "docs/reviews/REVIEW_MODELS_DB.md": "docs/07-reviews/REVIEW_MODELS_DB.md",
    "docs/reviews/REVIEW_FRONTEND.md": "docs/07-reviews/REVIEW_FRONTEND.md",
    "docs/reviews/REVIEW_CODE_QUALITY.md": "docs/07-reviews/REVIEW_CODE_QUALITY.md",
    "docs/reviews/REVIEW_CARD_WALLET_FLOW.md": "docs/07-reviews/REVIEW_CARD_WALLET_FLOW.md",
    "docs/reviews/REVIEW_CAMPAIGNS_AUTOMATION.md": "docs/07-reviews/REVIEW_CAMPAIGNS_AUTOMATION.md",
    "docs/reviews/REVIEW_ARCHITECTURE.md": "docs/07-reviews/REVIEW_ARCHITECTURE.md",

    # 08-references
    "docs/GOOGLE_SETUP_STEP_BY_STEP.md": "docs/08-references/GOOGLE_SETUP_STEP_BY_STEP.md",
    "docs/PORT_AUTHORITY.md": "docs/08-references/PORT_AUTHORITY.md",
    "docs/WALLET_CREDENTIALS_SETUP.md": "docs/08-references/WALLET_CREDENTIALS_SETUP.md",
    "docs/WALLET_CREDENTIALS_STATUS.md": "docs/08-references/WALLET_CREDENTIALS_STATUS.md",
}

# source -> archive destination
ARCHIVES = {
    "docs/BACKUP_DISASTER_RECOVERY.md": "docs/09-archive/BACKUP_DISASTER_RECOVERY.md",
    "docs/reviews/FULL_SYSTEM_AUDIT_2026-06-03.md": "docs/09-archive/FULL_SYSTEM_AUDIT_2026-06-03.md",
    "docs/wallet-studio/SRS-MASTER-EXECUTIVE-SUMMARY.md": "docs/09-archive/wallet-designer-v2/SRS-MASTER-EXECUTIVE-SUMMARY.md",
    "docs/implementation/WALLET_DESIGNER_ROADMAP.md": "docs/09-archive/wallet-designer-v2/WALLET_DESIGNER_ROADMAP.md",
    "docs/implementation/WALLET_DESIGNER_V2_UIUX_ARCHITECTURE.md": "docs/09-archive/wallet-designer-v2/WALLET_DESIGNER_V2_UIUX_ARCHITECTURE.md",
    "deploy/disaster_recovery/README.md": "docs/09-archive/deploy-readmes/DISASTER_RECOVERY.md",
    "deploy/bootstrap/README.md": "docs/09-archive/deploy-readmes/BOOTSTRAP.md",
    "deploy/backups/README.md": "docs/09-archive/deploy-readmes/BACKUPS.md",
    "HANDOFF.md": "docs/09-archive/HANDOFF.md",
}

# Files to delete (path relative to ROOT)
DELETIONS = [
    "docs/AVENDER_MINIO_S3_DEPLOYMENT.md",
    "docs/wallet-studio/IMPLEMENTATION-PLAN.md",
    "deploy/alerting/README.md",
]

# Empty directories to remove after moves
EMPTY_DIRS = [
    "docs/guides",
    "docs/implementation",
    "docs/campaigns-redesign",
    "docs/wallet-studio",
    "docs/audit",
    "docs/reviews",
    "docs/iso27001",
    "deploy/vault",
    "deploy/scripts",
    "deploy/redis",
    "deploy/postgres",
    "deploy/pgbouncer",
    "deploy/grafana",
    "deploy/factory_reset",
    "deploy/alerts",
    "deploy/alertmanager",
    "deploy/alerting",
    "deploy/disaster_recovery",
    "deploy/bootstrap",
    "deploy/backups",
]


def git_tracked(path: Path) -> bool:
    result = subprocess.run(
        ["git", "ls-files", "--error-unmatch", str(path)],
        cwd=ROOT,
        capture_output=True,
    )
    return result.returncode == 0


def move_file(src: str, dst: str) -> None:
    src_path = ROOT / src
    dst_path = ROOT / dst
    if not src_path.exists():
        print(f"SKIP (missing): {src}")
        return
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    if git_tracked(src_path):
        subprocess.run(["git", "mv", src, dst], cwd=ROOT, check=True)
        print(f"git mv: {src} -> {dst}")
    else:
        shutil.move(str(src_path), str(dst_path))
        print(f"mv: {src} -> {dst}")


def delete_file(path: str) -> None:
    p = ROOT / path
    if not p.exists():
        print(f"SKIP delete (missing): {path}")
        return
    if git_tracked(p):
        subprocess.run(["git", "rm", path], cwd=ROOT, check=True)
        print(f"git rm: {path}")
    else:
        p.unlink()
        print(f"rm: {path}")


def remove_empty_dirs() -> None:
    for d in EMPTY_DIRS:
        p = ROOT / d
        if p.exists() and p.is_dir() and not any(p.iterdir()):
            p.rmdir()
            print(f"rmdir: {d}")


def main():
    for src, dst in MOVES.items():
        move_file(src, dst)
    for src, dst in ARCHIVES.items():
        move_file(src, dst)
    for path in DELETIONS:
        delete_file(path)
    remove_empty_dirs()


if __name__ == "__main__":
    main()
