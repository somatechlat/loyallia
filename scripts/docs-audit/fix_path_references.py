#!/usr/bin/env python3
"""Replace stale path references after documentation reorganization."""
import re
from pathlib import Path

ROOT = Path("/Users/macbookpro201916i964gb1tb/Documents/GitHub/loyallia")
DOCS = ROOT / "docs"
EXCLUDE = {"scripts/docs-audit", "docs/superpowers"}

REPLACEMENTS = [
    ("docs/ARCHITECTURE.md", "docs/02-architecture/ARCHITECTURE.md"),
    ("docs/BOOTSTRAP_ARCHITECTURE.md", "docs/02-architecture/BOOTSTRAP_ARCHITECTURE.md"),
    ("docs/BACKUP_ARCHITECTURE.md", "docs/02-architecture/BACKUP_ARCHITECTURE.md"),
    ("docs/APPLE_WALLET_WEB_PKPASS_NFC.md", "docs/02-architecture/APPLE_WALLET_WEB_PKPASS_NFC.md"),
    ("docs/AGENT_ONBOARDING.md", "docs/01-start-here/AGENT_ONBOARDING.md"),
    ("docs/guides/", "docs/03-guides/"),
    ("docs/BACKUP_TESTING_PLAN.md", "docs/03-guides/BACKUP_TESTING_PLAN.md"),
    ("docs/BACKUP_OPERATIONS_RUNBOOK.md", "docs/04-runbooks/BACKUP_OPERATIONS_RUNBOOK.md"),
    ("docs/DEPLOYMENT_GUIDE.md", "docs/04-runbooks/DEPLOYMENT_GUIDE.md"),
    ("docs/DISASTER_RECOVERY_PLAYBOOK.md", "docs/04-runbooks/DISASTER_RECOVERY_PLAYBOOK.md"),
    ("docs/FACTORY_RESET_PROCEDURE.md", "docs/04-runbooks/FACTORY_RESET_PROCEDURE.md"),
    ("docs/COMPLIANCE_CHECKLIST.md", "docs/05-compliance/COMPLIANCE_CHECKLIST.md"),
    ("docs/iso27001/", "docs/05-compliance/iso27001/"),
    ("docs/SRS_Loyallia_COMPLETE.md", "docs/06-planning/SRS_Loyallia_COMPLETE.md"),
    ("docs/SRS_Loyallia_HARDENING_v1.0.md", "docs/06-planning/SRS_Loyallia_HARDENING_v1.0.md"),
    ("docs/srs_user_journeys.md", "docs/06-planning/srs_user_journeys.md"),
    ("docs/TESTING_AUDIT_PLAN.md", "docs/06-planning/TESTING_AUDIT_PLAN.md"),
    ("docs/TODO_CURRENT_PRODUCTION_READINESS.md", "docs/06-planning/TODO_CURRENT_PRODUCTION_READINESS.md"),
    ("docs/WALLET_PUSH_NOTIFICATIONS_PLAN.md", "docs/06-planning/WALLET_PUSH_NOTIFICATIONS_PLAN.md"),
    ("docs/implementation/", "docs/06-planning/implementation/"),
    ("docs/wallet-studio/", "docs/06-planning/wallet-studio/"),
    ("docs/campaigns-redesign/", "docs/06-planning/campaigns-redesign/"),
    ("docs/reviews/", "docs/07-reviews/"),
    ("docs/audit/", "docs/07-reviews/audit/"),
    ("docs/SETTINGS_COMPLETENESS_AUDIT.md", "docs/07-reviews/SETTINGS_COMPLETENESS_AUDIT.md"),
    ("docs/TESTING_AUDIT_REPORT_20260601.md", "docs/07-reviews/TESTING_AUDIT_REPORT_20260601.md"),
    ("docs/GOOGLE_SETUP_STEP_BY_STEP.md", "docs/08-references/GOOGLE_SETUP_STEP_BY_STEP.md"),
    ("docs/PORT_AUTHORITY.md", "docs/08-references/PORT_AUTHORITY.md"),
    ("docs/WALLET_CREDENTIALS_SETUP.md", "docs/08-references/WALLET_CREDENTIALS_SETUP.md"),
    ("docs/WALLET_CREDENTIALS_STATUS.md", "docs/08-references/WALLET_CREDENTIALS_STATUS.md"),
    ("docs/BACKUP_DISASTER_RECOVERY.md", "docs/09-archive/BACKUP_DISASTER_RECOVERY.md"),
    ("HANDOFF.md", "docs/09-archive/HANDOFF.md"),
]


def is_excluded(path: Path) -> bool:
    rel = str(path.relative_to(ROOT))
    return any(rel.startswith(ex) for ex in EXCLUDE)


def main():
    changed = 0
    for md in DOCS.rglob("*.md"):
        if is_excluded(md):
            continue
        content = md.read_text(encoding="utf-8", errors="ignore")
        new_content = content
        for old, new in REPLACEMENTS:
            new_content = new_content.replace(old, new)
        if new_content != content:
            md.write_text(new_content, encoding="utf-8")
            changed += 1
            print(f"Updated: {md.relative_to(ROOT)}")

    # Also update root README and AGENTS/rules if needed
    for root_md in [ROOT / "README.md", ROOT / "AGENTS.md", ROOT / "rules.md"]:
        if not root_md.exists():
            continue
        content = root_md.read_text(encoding="utf-8", errors="ignore")
        new_content = content
        for old, new in REPLACEMENTS:
            new_content = new_content.replace(old, new)
        if new_content != content:
            root_md.write_text(new_content, encoding="utf-8")
            changed += 1
            print(f"Updated: {root_md.relative_to(ROOT)}")

    print(f"Total files updated: {changed}")


if __name__ == "__main__":
    main()
