#!/usr/bin/env python3
"""
List open issues grouped by milestone for sprint selection.
Usage: gh issue list --state open --json number,title,milestone,body --limit 100 | python3 scripts/list-sprint-issues.py
"""

import json
import sys
from collections import defaultdict

data = json.load(sys.stdin)
by_milestone = defaultdict(list)

for issue in data:
    milestone = issue['milestone']['title'] if issue['milestone'] else 'No Milestone'
    by_milestone[milestone].append(issue)

# Sort milestones alphabetically
for milestone in sorted(by_milestone.keys()):
    issues = sorted(by_milestone[milestone], key=lambda x: x['number'])
    print(f"\n{'='*60}")
    print(f"MILESTONE: {milestone}")
    print(f"{'='*60}")
    print(f"Count: {len(issues)} issue(s)\n")
    for issue in issues:
        body_preview = (issue['body'][:100] + '...') if issue['body'] else '(no description)'
        print(f"  #{issue['number']} — {issue['title']}")
        print(f"      {body_preview}\n")
