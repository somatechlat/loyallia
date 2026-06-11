#!/usr/bin/env python3
"""Find and fix broken internal Markdown links after reorganization."""
import re
import json
from pathlib import Path
from collections import defaultdict

ROOT = Path("/Users/macbookpro201916i964gb1tb/Documents/GitHub/loyallia")
DOCS_ROOT = ROOT / "docs"
EXCLUDE = {"scripts/docs-audit", "docs/superpowers"}

LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def all_docs():
    for path in DOCS_ROOT.rglob("*.md"):
        rel = str(path.relative_to(ROOT))
        if any(rel.startswith(ex) for ex in EXCLUDE):
            continue
        yield path


def resolve_link(source: Path, link: str) -> Path | None:
    """Resolve a relative markdown link from a source file."""
    if link.startswith("http://") or link.startswith("https://") or link.startswith("#"):
        return None
    if link.startswith("/"):
        target = ROOT / link.lstrip("/")
    else:
        target = (source.parent / link).resolve()
    # Only consider .md links and anchors
    base = target
    if "#" in str(base):
        base = Path(str(base).split("#", 1)[0])
    if base.suffix == ".md":
        return base
    return None


def find_files_by_name(name: str) -> list[Path]:
    results = []
    for path in DOCS_ROOT.rglob(name):
        rel = str(path.relative_to(ROOT))
        if any(rel.startswith(ex) for ex in EXCLUDE):
            continue
        results.append(path)
    return results


def relative_to(source: Path, target: Path) -> str:
    import os
    return os.path.relpath(target, source.parent)


def main():
    broken = []
    fixes = []

    for doc in all_docs():
        content = doc.read_text(encoding="utf-8", errors="ignore")
        new_content = content
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
                # Try to fix: find file by basename anywhere in docs/
                candidates = find_files_by_name(target.name)
                if len(candidates) == 1:
                    new_link = relative_to(doc, candidates[0])
                    new_content = new_content.replace(match.group(0), f"[{text}]({new_link})", 1)
                    fixes.append({
                        "source": str(doc.relative_to(ROOT)),
                        "old": link,
                        "new": new_link,
                    })
                elif len(candidates) > 1:
                    print(f"AMBIGUOUS {target.name} in {doc.relative_to(ROOT)}: {[str(c.relative_to(ROOT)) for c in candidates]}")
        if new_content != content:
            doc.write_text(new_content, encoding="utf-8")

    with open(DOCS_ROOT / "_audit" / "broken_links.json", "w", encoding="utf-8") as fp:
        json.dump({"broken": broken, "fixes": fixes}, fp, indent=2, ensure_ascii=False)

    print(f"Broken links found: {len(broken)}")
    print(f"Fixed automatically: {len(fixes)}")
    for b in broken:
        print(f"  {b['source']} -> {b['link']} (missing: {b['missing_target']})")


if __name__ == "__main__":
    main()
