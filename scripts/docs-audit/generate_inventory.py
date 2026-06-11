#!/usr/bin/env python3
"""Generate an inventory of all documentation files in the repository."""
import json
import hashlib
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path("/Users/macbookpro201916i964gb1tb/Documents/GitHub/loyallia")
AUDIT_DIR = ROOT / "docs" / "_audit"
AUDIT_DIR.mkdir(parents=True, exist_ok=True)

EXCLUDE_DIRS = {
    "node_modules", ".git", ".pytest_cache", ".next", "playwright-report",
    "test-results", "__pycache__", ".ruff_cache", ".age_keys", ".agents",
    ".worktrees", "SNAPSHOT-20260604-165837", "scripts/docs-audit"
}

EXCLUDE_FILES = {"COMMIT_EDITMSG", "description"}


def is_excluded(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    for part in rel.parts:
        if part in EXCLUDE_DIRS:
            return True
    if path.name in EXCLUDE_FILES:
        return True
    return False


def extract_title(content: str) -> str | None:
    m = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    return m.group(1).strip() if m else None


def classify(path: Path, content: str, title: str | None) -> dict:
    text_lower = content.lower()
    name_lower = path.name.lower()
    action = "keep"
    target = None
    merge_target = None
    reason = []

    # Empty or tiny
    if len(content.strip()) < 100:
        action = "delete"
        reason.append("too short or empty")

    # Placeholder detection
    placeholder_terms = ["todo", "tbd", "placeholder", "lorem ipsum", "stub", "fixme"]
    if any(term in text_lower for term in placeholder_terms) and len(content.strip()) < 500:
        action = "delete"
        reason.append("placeholder content")

    # Drafts
    if "draft" in name_lower or "wip" in name_lower:
        action = "archive"
        reason.append("draft/WIP file")

    # Decide target folder based on path/name content
    if action in ("keep", "move"):
        if any(k in text_lower for k in ["onboard", "agent", "start here", "getting started"]):
            target = "docs/01-start-here/"
        elif any(k in text_lower for k in ["architecture", "pattern", "bootstrap", "backup architecture"]):
            target = "docs/02-architecture/"
        elif path.parent.name == "guides" or any(k in text_lower for k in ["guide", "how to", "authentication", "billing", "notification", "redemption"]):
            target = "docs/03-guides/"
        elif any(k in text_lower for k in ["runbook", "deployment", "disaster recovery", "factory reset", "backup operations", "operations"]):
            target = "docs/04-runbooks/"
        elif path.parent.name == "iso27001" or any(k in text_lower for k in ["compliance", "iso27001", "audit", "isms", "risk assessment"]):
            target = "docs/05-compliance/"
        elif any(k in text_lower for k in ["roadmap", "srs", "implementation plan", "testing plan", "todo", "wallet studio", "campaigns redesign"]):
            target = "docs/06-planning/"
        elif any(k in text_lower for k in ["review", "audit report", "code quality", "frontend review"]):
            target = "docs/07-reviews/"
        elif any(k in text_lower for k in ["setup", "step by step", "credentials", "status", "port authority", "handoff", "reference"]):
            target = "docs/08-references/"

    return {
        "action": action,
        "target_path": target,
        "merge_target": merge_target,
        "reason": "; ".join(reason) if reason else "keep in current location or target folder",
    }


def main():
    files = []
    for ext in ("*.md", "*.txt", "*.rst"):
        for path in ROOT.rglob(ext):
            if is_excluded(path):
                continue
            content = path.read_text(encoding="utf-8", errors="ignore")
            title = extract_title(content)
            classification = classify(path, content, title)
            h = hashlib.sha256(content.encode("utf-8")).hexdigest()
            files.append({
                "path": str(path.relative_to(ROOT)),
                "size_bytes": path.stat().st_size,
                "word_count": len(content.split()),
                "title": title,
                "sha256": h,
                "suggested_action": classification["action"],
                "target_path": classification["target_path"],
                "merge_target": classification["merge_target"],
                "reason": classification["reason"],
            })

    files.sort(key=lambda x: x["path"])

    # Detect duplicates by hash
    by_hash = defaultdict(list)
    for f in files:
        by_hash[f["sha256"]].append(f["path"])
    duplicates = {h: paths for h, paths in by_hash.items() if len(paths) > 1}

    inventory = {
        "generated_at": "2026-06-11T15:24:00Z",
        "count": len(files),
        "duplicates_by_hash": duplicates,
        "files": files,
    }

    with open(AUDIT_DIR / "inventory.json", "w", encoding="utf-8") as fp:
        json.dump(inventory, fp, indent=2, ensure_ascii=False)

    print(f"Inventory generated: {len(files)} files")
    print(f"Duplicate groups: {len(duplicates)}")
    for h, paths in duplicates.items():
        print(f"  {paths}")


if __name__ == "__main__":
    main()
