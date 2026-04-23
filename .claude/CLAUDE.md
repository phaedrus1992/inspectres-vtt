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
gh issue create --title "..." --body "..." --milestone "..." --label "..."
```

This applies to:
- Deferred pre-pr-review findings (Step 7)
- Security audit items not fixed in the current PR
- Pre-existing bugs found while working on related code
- Simplification opportunities
- Any other actionable work that isn't done right now

After creating the issue, report its URL to the user.

### Milestone Assignment

**Every new issue must be assigned to a milestone.** When creating or updating an issue:
- Check if an existing milestone describes the issue's domain (Economy, Character, Content, Infrastructure, etc.)
- If an existing milestone fits, assign the issue to it
- If no existing milestone aligns with the issue's content, create a new milestone first, then assign the issue
- Never leave issues without a milestone — milestones organize work into achievable sprints

Current milestones:
- **Economy: Vacation & Bankruptcy** — stress recovery, debt, financial mechanics
- **Character: Recovery & Death** — character continuity, death flows, incapacity
- **Content & Variants: Weird Agents** — special powers, archetypes, content expansions
- **Infrastructure: Multiplayer & DevTools** — socket sync, real-time features, developer tooling

## Sprint (composite) Issues

When creating a sprint/composite issue that groups constituent issues together (as in `dev-sprint`), add each constituent issue as a sub-issue of the composite using the GitHub sub-issues API:

```bash
# After creating the composite issue (number = $PARENT):
gh api repos/:owner/:repo/issues/$PARENT/sub_issues \
  -X POST -f sub_issue_id=$CHILD_ID
```

Where `$CHILD_ID` is the **issue ID** (not number — get it from `gh issue view $NUMBER --json id --jq .id`). Repeat for each constituent issue. This lets them appear and resolve together in GitHub's UI.

## Issue Labels

All issues use a three-tier label system for searchability and organization:

### Priority Labels (Mutually Exclusive)
- **P0**: Critical blocker — production bug or feature that blocks releases
- **P1**: High priority — important feature or bug affecting UX/correctness (default for new issues without P0/P2)
- **P2**: Nice-to-have / technical debt — code quality, refactoring, i18n, test gaps

### Area Labels (Multiple per issue; prefix: `area-`)
- **area-core**: Core mechanics (actors, franchises, rolls, stress system)
- **area-sheets**: Actor/item sheets and UI components
- **area-chat**: Chat rolls and messaging
- **area-missions**: Mission tracking and mechanics
- **area-character**: Character death, recovery, bankruptcy, vacation
- **area-compendium**: Compendium packs and content
- **area-multiplayer**: Socket sync and real-time features
- **area-devtools**: Developer tooling and debug features
- **area-testing**: Test infrastructure and coverage
- **area-docs**: Documentation, comments, i18n, and rules specs

### Type Labels (Typically One; Convention)
- **bug**: Bug fix or defect remediation
- **enhancement**: New feature or improvement
- **refactor**: Code cleanup, restructuring, or consolidation
- **chore**: Maintenance, automation, or tooling changes

### Phase Labels (Organizational; for milestones)
- **phase-1**: Initial system foundation (completed: core sheets, rolls, error handling, testing)
- **phase-2**: UI polish and mission mechanics (in progress or completed)

### Label Application Rules

When creating or updating issues:
1. **Always assign exactly one priority** (P0, P1, or P2) — if none is specified, treat as P1
2. **Always assign at least one area** — pick the primary subsystem touched
3. **Assign one type label** if the work is a code change (bug, enhancement, refactor, or chore)
4. **Assign phase labels** only for sprint/composite issues that represent major milestones

Example: Issue #21 (Death & Dismemberment mode)
```
Labels: area-character, enhancement, P1
```

Example: Issue #112 (Reduce skill penalty duplication)
```
Labels: area-character, refactor, P2
```

### Searching by Label

Common searches:
```bash
# Find all open character-related issues
gh issue list --state open --label "area-character"

# Find all P0 bugs
gh issue list --state open --label "P0" --label "bug"

# Find all open core mechanics work
gh issue list --state open --label "area-core"

# Find all technical debt
gh issue list --state all --label "P2"
```
