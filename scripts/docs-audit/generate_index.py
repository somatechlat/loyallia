#!/usr/bin/env python3
"""Generate docs/00-index.md master index."""
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path("/Users/macbookpro201916i964gb1tb/Documents/GitHub/loyallia")
DOCS = ROOT / "docs"
EXCLUDE = {"_audit", "superpowers"}

SECTIONS = {
    "01-start-here": "Start Here",
    "02-architecture": "Architecture",
    "03-guides": "Guides",
    "04-runbooks": "Runbooks",
    "05-compliance": "Compliance",
    "06-planning": "Planning",
    "07-reviews": "Reviews & Audits",
    "08-references": "References",
    "09-archive": "Archive",
}


def extract_title(path: Path) -> str:
    content = path.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    if m:
        return m.group(1).strip()
    return path.name


def main():
    files_by_section = defaultdict(list)
    for section_dir in sorted(DOCS.iterdir()):
        if not section_dir.is_dir() or section_dir.name in EXCLUDE:
            continue
        for md in sorted(section_dir.rglob("*.md")):
            rel = md.relative_to(DOCS)
            files_by_section[section_dir.name].append((str(rel), extract_title(md)))

    lines = [
        "# Loyallia Documentation Index",
        "",
        "This is the master index for all project documentation. The code is the only source of truth; documentation here reflects the state of the repository as of the last audit.",
        "",
        "> **Protected entry points:** `README.md`, `AGENTS.md`, and `rules.md` in the repository root remain the primary starting points for humans and agents.",
        "",
        "## Structure",
        "",
    ]

    for key, label in SECTIONS.items():
        if key not in files_by_section:
            continue
        lines.append(f"### {label}")
        lines.append("")
        for rel, title in files_by_section[key]:
            link = rel.replace(" ", "%20")
            lines.append(f"- [{title}]({link})")
        lines.append("")

    # Highlighted key docs
    lines.append("## Key Documents")
    lines.append("")
    lines.append("- [Agent Onboarding](01-start-here/AGENT_ONBOARDING.md) — Rules and conventions for agents working in this repo.")
    lines.append("- [System Architecture](02-architecture/ARCHITECTURE.md) — High-level architecture, sequence, and flow diagrams.")
    lines.append("- [Deployment Guide](04-runbooks/DEPLOYMENT_GUIDE.md) — Production deployment procedures.")
    lines.append("- [Disaster Recovery Playbook](04-runbooks/DISASTER_RECOVERY_PLAYBOOK.md) — Scenario-based DR procedures.")
    lines.append("- [Wallet Studio Complete Guide](06-planning/wallet-studio/COMPLETE-IMPLEMENTATION-GUIDE.md) — Single source of truth for wallet studio implementation.")
    lines.append("- [Full System Audit](07-reviews/audit/FULL_SYSTEM_AUDIT_REPORT.md) — Latest comprehensive audit report.")
    lines.append("")

    lines.append("## How to Update This Index")
    lines.append("")
    lines.append("When adding, moving, or removing documentation, regenerate this index by running `python3 scripts/docs-audit/generate_index.py`.")
    lines.append("")

    index_path = DOCS / "00-index.md"
    index_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {index_path}")


if __name__ == "__main__":
    main()
