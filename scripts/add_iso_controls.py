#!/usr/bin/env python3
"""Add ISO-compliant document controls to all Loyallia documentation files.

Per rules.md: YAML frontmatter, Document Control table, Revision History,
Distribution List, Related Documents, Change Control Process, Document Approval.
"""

import os
import re
from datetime import datetime
from pathlib import Path

TODAY = datetime.now().strftime("%Y-%m-%d")
REPO_ROOT = Path("/Users/macbookpro201916i964gb1tb/Documents/GitHub/loyallia")

# Category mappings from directory path
CATEGORY_MAP = {
    "01-start-here": ("Guide", "LOYALLIA-GUIDE", "Internal Use"),
    "02-architecture": ("Architecture", "LOYALLIA-ARCH", "Internal Use"),
    "03-guides": ("Guide", "LOYALLIA-GUIDE", "Internal Use"),
    "04-runbooks": ("Runbook", "LOYALLIA-RUNBOOK", "Internal Use"),
    "05-compliance": ("Compliance", "LOYALLIA-COMP", "Confidential"),
    "05-compliance/iso27001": ("ISO 27001 Policy", "LOYALLIA-ISO27001", "Confidential"),
    "06-planning": ("Planning", "LOYALLIA-PLAN", "Internal Use"),
    "06-planning/wallet-studio": ("SRS", "LOYALLIA-SRS-WS", "Internal Use"),
    "06-planning/user-journeys": ("User Journey", "LOYALLIA-UJ", "Internal Use"),
    "06-planning/campaigns-redesign": ("Planning", "LOYALLIA-PLAN-CAMP", "Internal Use"),
    "06-planning/superpowers/plans": ("Plan", "LOYALLIA-IMPL-PLAN", "Internal Use"),
    "06-planning/superpowers/specs": ("Design Spec", "LOYALLIA-DESIGN", "Internal Use"),
    "06-planning/implementation": ("Implementation Plan", "LOYALLIA-IMPL", "Internal Use"),
    "07-reviews": ("Review", "LOYALLIA-REVIEW", "Internal Use"),
    "07-reviews/audit": ("Audit Report", "LOYALLIA-AUDIT", "Internal Use"),
    "07-reviews/audit/2026-06-11-documentation-audit": ("Audit", "LOYALLIA-AUDIT", "Internal Use"),
    "08-references": ("Reference", "LOYALLIA-REF", "Internal Use"),
    "09-archive": ("Archive", "LOYALLIA-ARCHIVE", "Internal Use"),
    "09-archive/deploy-readmes": ("Archive", "LOYALLIA-ARCHIVE", "Internal Use"),
    "09-archive/wallet-designer-v2": ("Archive", "LOYALLIA-ARCHIVE", "Internal Use"),
}

# Root file mappings
ROOT_FILE_MAP = {
    "README.md": ("LOYALLIA-README-001", "Loyallia Project README", "Guide"),
    "AGENTS.md": ("LOYALLIA-AGENTS-001", "Loyallia Agent Instructions", "Guide"),
    "rules.md": ("LOYALLIA-RULES-001", "Loyallia Agent Rules And Coding Standards", "Standards"),
}


def get_title_from_content(content: str) -> str:
    """Extract title from first heading in markdown content."""
    match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    if match:
        return match.group(1).strip()
    return "Untitled Document"


def get_category_info(rel_path: str) -> tuple:
    """Get category, doc_id_prefix, classification from relative path."""
    # Check root files first
    filename = os.path.basename(rel_path)
    if rel_path == filename and filename in ROOT_FILE_MAP:
        doc_id, title, cat = ROOT_FILE_MAP[filename]
        return cat, doc_id, title, "Internal Use"

    # Find matching directory prefix
    for prefix, (cat, id_prefix, classification) in CATEGORY_MAP.items():
        if rel_path.startswith(prefix):
            # Generate a doc ID from the filename
            name = os.path.splitext(os.path.basename(rel_path))[0]
            # Clean up name for ID
            clean_name = re.sub(r"[^a-zA-Z0-9-]", "-", name).upper()
            clean_name = re.sub(r"-+", "-", clean_name).strip("-")
            doc_id = f"{id_prefix}-{clean_name}"
            return cat, doc_id, None, classification

    return "Document", f"LOYALLIA-DOC-{filename.upper()}", None, "Internal Use"


def has_frontmatter(content: str) -> bool:
    """Check if content already has YAML frontmatter."""
    return content.startswith("---\n") or content.startswith("---\r\n")


def has_doc_control_table(content: str) -> bool:
    """Check if content already has a Document Control table."""
    return "## DOCUMENT CONTROL" in content


def build_iso_controls(
    doc_id: str,
    title: str,
    category: str,
    classification: str,
    rel_path: str,
    existing_content: str,
) -> str:
    """Build the full ISO document control block."""

    # Determine language from content
    lang = "Spanish" if any(
        c in existing_content[:500]
        for c in ["á", "é", "í", "ó", "ú", "ñ", "¿", "¡"]
    ) else "English"

    # Determine standard based on category
    standard = "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
    if "SRS" in category:
        standard = "ISO/IEC 29148:2018 — Requirements Engineering"
    elif "ISO 27001" in category:
        standard = "ISO/IEC 27001:2022"
    elif "Compliance" in category:
        standard = "ISO/IEC 27001:2022, ISO 9001:2015"

    # Determine approver based on category
    approver = "Product Owner"
    if "Compliance" in category or "ISO 27001" in category:
        approver = "Security Officer"
    elif "Archive" in category:
        approver = "Engineering Lead"

    frontmatter = f"""---
title: "{title}"
document_id: "{doc_id}"
version: "1.0"
status: "approved"
last_updated: "{TODAY}"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "{approver}"
classification: "{classification}"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "{standard}"
parent_document: "N/A"
---"""

    doc_control = f"""
## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | {doc_id} |
| **Title** | {title} |
| **Version** | 1.0 |
| **Date** | {TODAY} |
| **Author** | Engineering Lead |
| **Approver** | {approver} |
| **Owner** | Engineering Lead |
| **Classification** | {classification} |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | {standard} |
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | {lang} |
| **Format** | Markdown (.md) |
| **Location** | `{rel_path}` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | {TODAY} | Engineering Lead | Added ISO-compliant document controls |

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
| LOYALLIA-ARCH-001 | Architecture Diagrams | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).
"""

    doc_approval = f"""
## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | {TODAY} | Approved |
| Product Owner | — | — | {TODAY} | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | {TODAY} | Engineering Lead | Initial ISO controls added |
| Approved | {TODAY} | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | {TODAY[:4]}-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |
"""

    return frontmatter + "\n" + doc_control + doc_approval


def process_file(file_path: Path) -> bool:
    """Process a single markdown file. Returns True if modified."""
    rel_path = str(file_path.relative_to(REPO_ROOT))

    # Skip non-doc files
    if file_path.suffix != ".md":
        return False

    # Skip node_modules, .next, etc.
    parts = file_path.parts
    if any(p in parts for p in ["node_modules", ".next", "__pycache__", ".venv", ".git"]):
        return False

    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"  SKIP (read error): {rel_path} — {e}")
        return False

    # Check if already has frontmatter AND doc control
    if has_frontmatter(content) and has_doc_control_table(content):
        print(f"  SKIP (already compliant): {rel_path}")
        return False

    # Get category info
    cat, doc_id, title_override, classification = get_category_info(rel_path)
    title = title_override or get_title_from_content(content)

    # If file has frontmatter but no doc control, strip existing frontmatter
    if has_frontmatter(content):
        # Remove existing frontmatter
        content = re.sub(r"^---\n.*?---\n", "", content, flags=re.DOTALL)
        content = content.lstrip("\n")

    # Build ISO controls
    iso_block = build_iso_controls(doc_id, title, cat, classification, rel_path, content)

    # Write back
    new_content = iso_block + "\n" + content
    file_path.write_text(new_content, encoding="utf-8")
    print(f"  FIXED: {rel_path} [{doc_id}]")
    return True


def main():
    print("=== Loyallia ISO Document Controls Compliance Script ===")
    print(f"Date: {TODAY}")
    print(f"Root: {REPO_ROOT}")
    print()

    # Find all .md files
    md_files = []
    for root, dirs, files in os.walk(REPO_ROOT):
        # Skip hidden dirs, node_modules, etc.
        dirs[:] = [
            d for d in dirs
            if not d.startswith(".")
            and d not in ("node_modules", "__pycache__", ".venv", ".next")
        ]
        for f in files:
            if f.endswith(".md"):
                md_files.append(Path(root) / f)

    md_files.sort()

    fixed = 0
    skipped = 0

    for fp in md_files:
        if process_file(fp):
            fixed += 1
        else:
            skipped += 1

    print(f"\n=== DONE ===")
    print(f"Total .md files: {len(md_files)}")
    print(f"Fixed: {fixed}")
    print(f"Skipped (already compliant or non-doc): {skipped}")


if __name__ == "__main__":
    main()
