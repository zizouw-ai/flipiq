script = """#!/usr/bin/env python3
# update_brief.py — FlipIQ Living Brief Updater
# Drop this in your flipiq/ project root.
# Run: python update_brief.py
# Choose an action: log a session, add a bug, or resolve a bug.

import re
import os
from datetime import date

BRIEF_PATH = os.path.join(os.path.dirname(__file__), "FLIPIQ_BRIEF.md")


def read_brief():
    with open(BRIEF_PATH, "r", encoding="utf-8") as f:
        return f.read()


def write_brief(content):
    with open(BRIEF_PATH, "w", encoding="utf-8") as f:
        f.write(content)


def add_session_log(version, summary, tool):
    content = read_brief()
    today = date.today().strftime("%Y-%m-%d")
    new_row = f"| {today} | {version} | {summary} | {tool} |"
    # Insert after the table header separator line in SESSION LOG
    pattern = r"(\\| Date.*?\\n\\|[-| ]+\\|\\n)"
    match = re.search(pattern, content)
    if match:
        pos = match.end()
        content = content[:pos] + new_row + "\\n" + content[pos:]
        write_brief(content)
        print(f"Session logged: {new_row}")
    else:
        print("Could not find Session Log table — add the row manually.")


def add_bug(bug_id, description, files, notes=""):
    content = read_brief()
    today = date.today().strftime("%Y-%m-%d")
    entry = f"- [ ] {bug_id} | {description} | Affected: {files} | Discovered: {today}"
    if notes:
        entry += f" | Notes: {notes}"
    entry += "\\n"
    marker = "None at this time. Log new bugs here as they are found."
    if marker in content:
        content = content.replace(marker, entry + marker)
    else:
        content = content.replace("### Resolved Bugs", entry + "\\n### Resolved Bugs")
    write_brief(content)
    print(f"Bug added: {bug_id}")


def resolve_bug(bug_id, fix_date, commit_ref):
    content = read_brief()
    pattern = rf"- \\[ \\] {re.escape(bug_id)}.*?(?=\\n- |\\nNone|\\n\\n### Resolved)"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        bug_text = match.group()
        parts = bug_text.split("|")
        description = parts[1].strip() if len(parts) > 1 else "See changelog"
        content = content[:match.start()] + content[match.end():]
        resolved_row = f"| {bug_id} | {description} | {fix_date} | {commit_ref} |"
        content = content.replace(
            "| —   | None yet    | —          | —      |",
            resolved_row
        )
        write_brief(content)
        print(f"Bug {bug_id} marked resolved.")
    else:
        print(f"Bug {bug_id} not found in open bugs.")


def check_milestone(milestone_id):
    content = read_brief()
    pattern = rf"- \\[ \\] ({re.escape(milestone_id)}.*)"
    match = re.search(pattern, content)
    if match:
        old = f"- [ ] {match.group(1)}"
        new = f"- [x] {match.group(1)}"
        content = content.replace(old, new, 1)
        write_brief(content)
        print(f"Milestone checked: {milestone_id}")
    else:
        print(f"Milestone {milestone_id} not found or already checked.")


if __name__ == "__main__":
    print("FlipIQ Brief Updater")
    print("Actions: log | bug | resolve | milestone")
    action = input("Action: ").strip().lower()

    if action == "log":
        v = input("Version (e.g. v1.4.0): ").strip()
        s = input("Session summary (one line): ").strip()
        t = input("Tool used (e.g. Antigravity): ").strip()
        add_session_log(v, s, t)

    elif action == "bug":
        bid  = input("Bug ID (e.g. BUG-001): ").strip()
        desc = input("Description: ").strip()
        fils = input("Affected file(s): ").strip()
        note = input("Notes (optional, press Enter to skip): ").strip()
        add_bug(bid, desc, fils, note)

    elif action == "resolve":
        bid    = input("Bug ID to resolve: ").strip()
        fdate  = input("Fix date (YYYY-MM-DD): ").strip()
        commit = input("Commit ref (e.g. abc1234): ").strip()
        resolve_bug(bid, fdate, commit)

    elif action == "milestone":
        mid = input("Milestone ID (e.g. 1.3): ").strip()
        check_milestone(mid)

    else:
        print("Unknown action. Use: log / bug / resolve / milestone")
"""

with open("output/update_brief.py", "w", encoding="utf-8") as f:
    f.write(script)

print(f"update_brief.py written: {len(script)} chars")

# Verify both files exist
for fname in ["FLIPIQ_BRIEF.md", "update_brief.py"]:
    path = f"output/{fname}"
    size = os.path.getsize(path)
    print(f"{fname}: {size} bytes — OK")