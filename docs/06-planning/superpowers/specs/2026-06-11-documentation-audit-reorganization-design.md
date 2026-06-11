# Documentation Audit and Reorganization

## Context
The repository contains approximately 90 documentation files spread across `docs/`, root, `deploy/`, `backend/`, `frontend/`, `services/`, and other directories. The documentation has grown organically and is now hard to navigate, contains potential duplicates, and may not reflect the current codebase accurately.

## Goal
Audit every documentation file in the repository, remove obsolete/duplicate/abandoned files, reorganize the remaining documentation by audience and purpose, and verify that the final documentation reflects the actual code and project state. The code is the only source of truth.

## Scope
- **Included**: All `.md`, `.txt`, and `.rst` files in the repository, excluding `node_modules/`, `.git/`, caches, and binary artifacts.
- **Protected**: `README.md`, `AGENTS.md`, and `rules.md` in the repository root must not be moved, renamed, or deleted.

## Target Structure

```
docs/
  00-index.md                          # Master index / map of all documentation
  01-start-here/
    AGENT_ONBOARDING.md
    README.md (if not root)
  02-architecture/
    ARCHITECTURE.md
    BOOTSTRAP_ARCHITECTURE.md
    BACKUP_ARCHITECTURE.md
  03-guides/
    Authentication.md
    Billing-Payments.md
    Notifications.md
    Redemption-Engine.md
  04-runbooks/
    DEPLOYMENT_GUIDE.md
    BACKUP_OPERATIONS_RUNBOOK.md
    DISASTER_RECOVERY_PLAYBOOK.md
    FACTORY_RESET_PROCEDURE.md
  05-compliance/
    COMPLIANCE_CHECKLIST.md
    iso27001/
  06-planning/
    implementation/
    wallet-studio/
    campaigns-redesign/
  07-reviews/
    reviews/
    audit/
  08-references/
    GOOGLE_SETUP_STEP_BY_STEP.md
    WALLET_CREDENTIALS_SETUP.md
    WALLET_CREDENTIALS_STATUS.md
    PORT_AUTHORITY.md
  09-archive/
    # Obsolete but historically valuable documents
```

## Deletion Criteria
A document may be deleted only if it meets one or more of the following:
- Exact or near-exact duplicate of another document.
- Draft or placeholder with no usable content.
- Directly contradicts the current codebase with no historical value.
- Temporary planning artifact whose decisions are already implemented and documented elsewhere.

## Verification Criteria
After reorganization, the documentation must:
- Have no broken internal links.
- Not contradict other documents.
- Accurately describe code paths, settings, and architecture found in the actual source.
- Have a clear purpose and correct audience.
- Pass a final audit against the repository code.

## Approach
Use a conservative approach: reorganize by audience and purpose, delete only clearly obsolete/duplicate documents, and create a master index. After implementation, perform a verification audit comparing documentation against the actual code and project structure.
