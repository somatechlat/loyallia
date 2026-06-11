#!/usr/bin/env python3
"""Verify all internal Markdown links in the repository."""
import re
import json
from pathlib import Path
from collections import defaultdict

ROOT = Path("/Users/macbookpro201916i964gb1tb/Documents/GitHub/loyallia")
EXCLUDE_DIRS = {
    "node_modules", ".git", ".pytest_cache", ".next", "playwright-report",
    "test-results", "__pycache__", ".ruff_cache", ".age_keys", ".agents",
    ".worktrees", "SNAPSHOT-20260604-165837"
}

LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def is_excluded(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    for part in rel.parts:
        if part in EXCLUDE_DIRS:
            return True
    return False


def all_docs():
    for path in ROOT.rglob("*.md"):
        if is_excluded(path):
            continue
        yield path


def resolve_link(source: Path, link: str) -> Path | None:
    if link.startswith("http://") or link.startswith("https://") or link.startswith("#"):
        return None
    if link.startswith("/"):
        target = ROOT / link.lstrip("/")
    else:
        target = (source.parent / link).resolve()
    base = target
    if "#" in str(base):
        base = Path(str(base).split("#", 1)[0])
    if base.suffix == ".md":
        return base
    return None


def main():
    broken = []
    for doc in all_docs():
        content = doc.read_text(encoding="utf-8", errors="ignore")
        for match in LINK_RE.finditer(content):
            text, link = match.groups()
            target = resolve_link(doc, link)
            if target is None:
                continue
            if not target.exists():
                broken.append({
                    "source": str(doc.relative_to(ROOT)),
                    "link_text": text,
                    "link": link,
                    "missing_target": str(target.relative_to(ROOT)) if target.is_relative_to(ROOT) else str(target),
                })

    with open(ROOT / "scripts" / "docs-audit" / "all_broken_links.json", "w", encoding="utf-8") as fp:
        json.dump({"broken": broken}, fp, indent=2, ensure_ascii=False)

    print(f"Total broken internal links: {len(broken)}")
    for b in broken:
        print(f"  {b['source']} -> {b['link']}")


if __name__ == "__main__":
    main()
