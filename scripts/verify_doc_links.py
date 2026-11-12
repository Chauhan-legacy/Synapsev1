#!/usr/bin/env python3
"""
Verify that all relative file links and image references in Markdown documents resolve.
"""

import re
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

DOCS_TO_CHECK = [
    ROOT_DIR / "README.md",
    ROOT_DIR / "BENCHMARKS.md",
    ROOT_DIR / "CHANGELOG.md",
]


def check_markdown_file(md_path: Path) -> int:
    if not md_path.exists():
        print(f"Error: {md_path} does not exist")
        return 1

    content = md_path.read_text(encoding="utf-8")
    # Match [text](link) and ![text](image)
    matches = re.findall(r'!?\[.*?\]\((?!https?://|mailto:|#)(.*?)\)', content)
    errors = 0

    for link in matches:
        # Strip anchor if present
        clean_link = link.split("#")[0]
        if not clean_link:
            continue
        target_path = (md_path.parent / clean_link).resolve()
        if not target_path.exists():
            print(f"[BROKEN LINK] In {md_path.relative_to(ROOT_DIR)}: {link} -> {target_path} not found")
            errors += 1
        else:
            print(f"[OK] In {md_path.relative_to(ROOT_DIR)}: {link}")

    return errors


def main():
    total_errors = 0
    # Also check any .md in docs/
    for md_file in DOCS_TO_CHECK + list((ROOT_DIR / "docs").glob("*.md")):
        if md_file.exists():
            total_errors += check_markdown_file(md_file)

    if total_errors > 0:
        print(f"\nFailed: Found {total_errors} broken links in documentation.")
        sys.exit(1)
    else:
        print("\nAll documentation links verified successfully.")
        sys.exit(0)


if __name__ == "__main__":
    main()

