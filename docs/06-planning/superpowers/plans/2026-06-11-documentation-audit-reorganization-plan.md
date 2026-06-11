# Documentation Audit and Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit every documentation file in the repository, remove obsolete/duplicate/abandoned files, reorganize the remainder by audience and purpose, and verify the final documentation accurately reflects the actual code and project state.

**Architecture:** A read-only inventory phase identifies every doc, classifies it, and records decisions. A reorganization phase creates the target directory tree, moves files, rewrites links, and deletes approved files. A verification phase audits documentation claims against the actual codebase and project structure.

**Tech Stack:** Markdown, shell, git, Python scripts for inventory/link checking.

---

## Pre-Work: Safety

**Files:**
- Read: `README.md`, `AGENTS.md`, `rules.md` (root)

- [ ] **Step 1: Confirm protected files**
  Verify `README.md`, `AGENTS.md`, and `rules.md` exist in the repository root. These must never be moved, renamed, or deleted.
  Run: `ls -la README.md AGENTS.md rules.md`
  Expected: three files listed.

- [ ] **Step 2: Ensure a clean git baseline**
  Run: `git status --short`
  Expected: empty or only expected changes. If there are unrelated changes, stop and alert the user.

---

## Phase 1: Inventory and Classification

**Files:**
- Create: `docs/_audit/inventory.json`
- Create: `docs/_audit/decisions.md`

- [ ] **Step 3: Generate complete inventory of documentation files**
  Run:
  ```bash
  find . -type f \( -name '*.md' -o -name '*.txt' -o -name '*.rst' \) \
    -not -path './node_modules/*' \
    -not -path './.git/*' \
    -not -path './backend/.pytest_cache/*' \
    -not -path './frontend/.next/*' \
    -not -path './frontend/node_modules/*' \
    -not -path './frontend/playwright-report/*' \
    -not -path './frontend/test-results/*' \
    -not -path './docs/_audit/*' \
    -not -path './.worktrees/*' \
    | sort > docs/_audit/inventory.txt
  ```
  Expected: a sorted list of every documentation file.

- [ ] **Step 4: Build structured inventory JSON**
  Create `docs/_audit/inventory.json` with an entry for each file containing:
  - `path`
  - `size_bytes`
  - `word_count`
  - `title` (first H1)
  - `suggested_action`: `keep`, `move`, `merge`, `delete`, `archive`
  - `target_path` (when `move` or `archive`)
  - `merge_target` (when `merge`)
  - `reason`
  Use a Python script to generate the JSON skeleton.

- [ ] **Step 5: Classify root-level docs**
  Decide for each root doc whether it stays or moves into `docs/`:
  - `HANDOFF.md` → `docs/08-references/HANDOFF.md` if it is historical, or keep root if current.
  - No changes to `README.md`, `AGENTS.md`, `rules.md`.
  Update `inventory.json` with the decisions.

- [ ] **Step 6: Detect duplicate or near-duplicate documents**
  Compare files by content hash and by title/filename similarity. Record duplicates in `inventory.json` with action `merge` or `delete`.
  Candidates to inspect:
  - `docs/audit/FULL_SYSTEM_AUDIT_REPORT.md` vs `docs/reviews/FULL_SYSTEM_AUDIT_2026-06-03.md`
  - `docs/SRS_Loyallia_COMPLETE.md` vs `docs/srs_user_journeys.md`
  - Multiple `wallet-studio` SRS files that may overlap.

- [ ] **Step 7: Identify obsolete or abandoned drafts**
  Mark as `delete` or `archive` documents that:
  - Are empty templates.
  - Contain only TODOs or placeholders.
  - Describe features that were cancelled or superseded.
  - Have dates older than 6 months and are not referenced elsewhere.
  Update `inventory.json`.

- [ ] **Step 8: Write decisions log**
  Create `docs/_audit/decisions.md` summarizing every `delete`, `merge`, `move`, and `archive` decision with rationale.

---

## Phase 2: Create Target Directory Structure

**Files:**
- Create directories under `docs/`

- [ ] **Step 9: Create new documentation tree**
  Run:
  ```bash
  mkdir -p docs/01-start-here \
           docs/02-architecture \
           docs/03-guides \
           docs/04-runbooks \
           docs/05-compliance/iso27001 \
           docs/06-planning/implementation \
           docs/06-planning/wallet-studio \
           docs/06-planning/campaigns-redesign \
           docs/07-reviews/audit \
           docs/08-references \
           docs/09-archive
  ```
  Expected: all directories exist.

---

## Phase 3: Move and Merge Documents

**Files:**
- Modify: many files under `docs/`, root, `deploy/`, `backend/`, `frontend/`, `services/`
- Delete: obsolete files identified in Phase 1

- [ ] **Step 10: Move start-here documents**
  Move onboarding and introductory docs into `docs/01-start-here/`.
  Example: `docs/AGENT_ONBOARDING.md` → `docs/01-start-here/AGENT_ONBOARDING.md`.
  Use `git mv` for tracked files.

- [ ] **Step 11: Move architecture documents**
  Move `docs/ARCHITECTURE.md`, `docs/BOOTSTRAP_ARCHITECTURE.md`, `docs/BACKUP_ARCHITECTURE.md`, and related files into `docs/02-architecture/`.

- [ ] **Step 12: Move guides**
  Move `docs/guides/*.md` into `docs/03-guides/`.

- [ ] **Step 13: Move runbooks**
  Move operational docs into `docs/04-runbooks/`:
  - `docs/DEPLOYMENT_GUIDE.md`
  - `docs/BACKUP_OPERATIONS_RUNBOOK.md`
  - `docs/DISASTER_RECOVERY_PLAYBOOK.md`
  - `docs/FACTORY_RESET_PROCEDURE.md`
  - `deploy/` READMEs that are operational (backups, bootstrap, DR, factory_reset, pgbouncer, postgres, redis, vault, alerting, alertmanager, alerts, grafana, scripts).

- [ ] **Step 14: Move compliance documents**
  Move `docs/COMPLIANCE_CHECKLIST.md` and `docs/iso27001/` into `docs/05-compliance/`.

- [ ] **Step 15: Move planning documents**
  Move into `docs/06-planning/`:
  - `docs/implementation/*` → `docs/06-planning/implementation/`
  - `docs/wallet-studio/*` → `docs/06-planning/wallet-studio/`
  - `docs/campaigns-redesign/*` → `docs/06-planning/campaigns-redesign/`
  - `docs/SRS_Loyallia_COMPLETE.md`
  - `docs/SRS_Loyallia_HARDENING_v1.0.md`
  - `docs/srs_user_journeys.md`
  - `docs/TESTING_AUDIT_PLAN.md`
  - `docs/TESTING_AUDIT_REPORT_20260601.md`
  - `docs/TODO_CURRENT_PRODUCTION_READINESS.md`
  - `docs/WALLET_PUSH_NOTIFICATIONS_PLAN.md`

- [ ] **Step 16: Move reviews and audits**
  Move into `docs/07-reviews/`:
  - `docs/reviews/*` → `docs/07-reviews/`
  - `docs/audit/*` → `docs/07-reviews/audit/`
  - `docs/SETTINGS_COMPLETENESS_AUDIT.md`

- [ ] **Step 17: Move reference documents**
  Move into `docs/08-references/`:
  - `docs/GOOGLE_SETUP_STEP_BY_STEP.md`
  - `docs/APPLE_WALLET_WEB_PKPASS_NFC.md`
  - `docs/WALLET_CREDENTIALS_SETUP.md`
  - `docs/WALLET_CREDENTIALS_STATUS.md`
  - `docs/PORT_AUTHORITY.md`
  - `docs/BACKUP_DISASTER_RECOVERY.md` (if not already a runbook)
  - `docs/BACKUP_TESTING_PLAN.md`
  - Root `HANDOFF.md`
  - `frontend/ARCHITECTURE.md`
  - `services/whatsapp-bridge/README.md`
  - `certs/README.md`

- [ ] **Step 18: Merge duplicate documents**
  For each `merge` decision in `inventory.json`:
  1. Read the source and target.
  2. Append unique content from the source into the target.
  3. Delete the source.
  4. Record the merge in `docs/_audit/decisions.md`.

- [ ] **Step 19: Move obsolete documents to archive**
  For each `archive` decision, move the file into `docs/09-archive/` and prefix the filename with the original path for traceability.

- [ ] **Step 20: Delete approved obsolete files**
  For each `delete` decision, remove the file using `git rm` and record the deletion in `docs/_audit/decisions.md`.

---

## Phase 4: Rewrite Internal Links

**Files:**
- Modify: all moved `.md` files
- Create: `docs/_audit/link_fixes.log`

- [ ] **Step 21: Scan for broken internal links**
  Run a script that finds all relative Markdown links (e.g. a link text pointing to `path/file.md`) and reports any that point to paths that no longer exist after reorganization.

- [ ] **Step 22: Update links in moved documents**
  For each broken link, update the target path to the new location. Prefer relative paths from the document's new directory.
  Log every change in `docs/_audit/link_fixes.log`.

- [ ] **Step 23: Update references in root README and protected files**
  If `README.md`, `AGENTS.md`, or `rules.md` contain links to moved docs, update only those links; do not move the protected files.

---

## Phase 5: Create Master Index

**Files:**
- Create: `docs/00-index.md`
- Delete: `docs/_audit/` (after verification, optional)

- [ ] **Step 24: Write master index**
  Create `docs/00-index.md` containing:
  - Overview of the documentation structure.
  - A table mapping each top-level folder to its audience and purpose.
  - A curated list of the most important documents with one-line descriptions.
  - A note that `README.md`, `AGENTS.md`, and `rules.md` in the root remain the primary entry points.

- [ ] **Step 25: Add per-folder READMEs where useful**
  For folders with many files (`06-planning/`, `07-reviews/`, `08-references/`), create a short `README.md` explaining the folder's contents.

---

## Phase 6: Verification Against Code

**Files:**
- Create: `docs/_audit/verification_report.md`

- [ ] **Step 26: Extract architecture claims from docs**
  Read `docs/02-architecture/` and list every concrete claim about:
  - Technology versions (Django, Next.js, PostgreSQL, Redis, Celery, etc.).
  - Service names and ports.
  - Container names.
  - File paths and module names.
  - Environment variables or settings.

- [ ] **Step 27: Verify technology versions**
  Check claims against:
  - `backend/requirements.txt`
  - `frontend/package.json`
  - `docker-compose.yml`
  - `docker-compose.prod.yml`
  Record mismatches in `verification_report.md`.

- [ ] **Step 28: Verify service/container names**
  Check claims against `docker-compose.yml`, `docker-compose.prod.yml`, and `deploy/` configuration.

- [ ] **Step 29: Verify backend module and app names**
  Check claims in architecture and guides against actual directories under `backend/apps/` and `backend/loyallia/`.

- [ ] **Step 30: Verify frontend structure claims**
  Check claims in `frontend/ARCHITECTURE.md` and `docs/03-guides/` against actual `frontend/src/` structure.

- [ ] **Step 31: Verify deployment and operations claims**
  Check claims in `docs/04-runbooks/` against `deploy/` scripts and Docker Compose files.

- [ ] **Step 32: Run link check again**
  Re-run the broken-link scanner and ensure zero broken internal links.

- [ ] **Step 33: Final review of decisions log**
  Ensure `docs/_audit/decisions.md` and `docs/_audit/verification_report.md` are complete and accurate.

---

## Phase 7: Final Audit and Cleanup

- [ ] **Step 34: Review git diff**
  Run: `git status --short` and `git diff --stat`
  Expected: all moves, deletions, and edits are accounted for in the decisions log.

- [ ] **Step 35: Remove temporary audit working files (optional)**
  If the user does not need the raw inventory JSON and working logs, delete `docs/_audit/` after the verification report is finalized. Otherwise keep it as `docs/09-archive/audit-2026-06-11/`.

- [ ] **Step 36: Commit the reorganization**
  Run:
  ```bash
  git add docs/
  git add README.md AGENTS.md rules.md  # if changed
  git commit -m "docs: audit, reorganize, and verify documentation against codebase"
  ```
  Expected: commit succeeds.

---

## Self-Review Checklist

- [ ] Spec coverage: every section of the design spec maps to one or more tasks.
- [ ] No placeholders: every step has a concrete command or file operation.
- [ ] Consistency: target directory names and file paths are consistent throughout.
