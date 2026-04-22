# InSpectres Project Instructions

## Answering Mechanics Questions

Before asking the user about any game mechanics (roll procedures, augmentation rules, chart lookups, stress outcomes, franchise rules, etc.):

1. **Check `reference/inspectres-rules-spec.md`** — complete rules reference derived from the official rulebook. Contains all charts, edge cases, and critical rules interactions.
2. **Query MemPalace** (`mempalace_search` / `mempalace_kg_query`) for prior design decisions and session context.

Only escalate to the user if the rules spec and MemPalace are both silent on a question.

## Issue Tracking

All issue tracking is in GitHub (`gh issue`).

When code review, pre-PR analysis, or any other process surfaces a finding that gets deferred or set aside, **always create a GitHub issue immediately** — do not ask the user first, do not leave it as a task note, do not skip it:

```bash
gh issue create --title "..." --body "..." --label "..."
```

This applies to:
- Deferred pre-pr-review findings (Step 7)
- Security audit items not fixed in the current PR
- Pre-existing bugs found while working on related code
- Simplification opportunities
- Any other actionable work that isn't done right now

After creating the issue, report its URL to the user.

## Sprint (composite) Issues

When creating a sprint/composite issue that groups constituent issues together (as in `dev-sprint`), add each constituent issue as a sub-issue of the composite using the GitHub sub-issues API:

```bash
# After creating the composite issue (number = $PARENT):
gh api repos/:owner/:repo/issues/$PARENT/sub_issues \
  -X POST -f sub_issue_id=$CHILD_ID
```

Where `$CHILD_ID` is the **issue ID** (not number — get it from `gh issue view $NUMBER --json id --jq .id`). Repeat for each constituent issue. This lets them appear and resolve together in GitHub's UI.
