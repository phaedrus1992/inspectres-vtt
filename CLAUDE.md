# InSpectres Project Instructions

## Quick Start

From `foundry/` directory:
```bash
npm install
npm run dev        # Watch build
npm run build      # Production build
npm run check      # Type check
npm run test       # Run tests
npm run test:watch # Watch mode
```

## Game Mechanics Questions

For roll procedures, augmentations, stress, franchises, etc.:
1. Check `reference/inspectres-rules-spec.md` (complete rulebook reference)
2. Query project memory for prior design decisions
3. Escalate to user if both silent

## Domain Rules (`.claude/rules/`)

Patterns split by domain. Each file scoped to specific paths:

| File | Scope | Purpose |
|------|-------|---------|
| `typescript.md` | `**/*.ts` `**/*.tsx` | TS strictness, naming, types, errors |
| `foundry-vite.md` | `foundry/**/*` | Foundry globals, V2 API, data models, tests |
| `foundry-sheets.md` | `foundry/**/*` | Sheets (ApplicationV2, templates, dialogs) |
| `foundry-patterns.md` | `foundry/**/*` | Elements, rolls, enrichers, CSS, migrations |
| `foundry-api.md` | `foundry/**/*` | Document API, hooks, updates |
| `playwright-foundry.md` | `foundry/**/*.test.ts` | Foundry testing |
| `changelog.md` | `CHANGELOG.md` | Semver & changelog format |

Auto-loaded by Claude Code. Supplement main CLAUDE.md.

## Issues

All tracking via GitHub (`gh issue`).

**Create GitHub issue immediately for:**
- Deferred pre-pr-review findings (Step 7)
- Security audit items not fixed in current PR
- Pre-existing bugs found while working on related code
- Simplification opportunities
- Any actionable work not done right now

Use `/github-issues` skill to guide creation + labeling.

### Composite Issues

Add constituent issues as sub-issues via GitHub API:

```bash
gh api repos/:owner/:repo/issues/$PARENT/sub_issues \
  -X POST -f sub_issue_id=$CHILD_ID
```

Where `$CHILD_ID` from `gh issue view $NUMBER --json id --jq .id`.

### Milestones

- **Economy: Vacation & Bankruptcy** — stress recovery, debt, financial mechanics
- **Character: Recovery & Death** — character continuity, death flows, incapacity
- **Content & Variants: Weird Agents** — special powers, archetypes, content expansions
- **Infrastructure: Multiplayer & DevTools** — socket sync, real-time features, developer tooling

## Versioning

Semantic Versioning. Version in `foundry/system.json`.

| Change | Version |
|--------|---------|
| Backwards-incompatible data/API | MAJOR |
| New functionality | MINOR |
| Bug fixes, refactors, docs, CI | PATCH |

**Changelog updates:**
- Every PR with user-facing changes → add to `[Unreleased]` in `CHANGELOG.md`
- Pure tooling/CI/docs → no entry required (unless user-visible)
- Release → move `[Unreleased]` to dated section, bump version

Use `/changelog` skill for guidance.

## Documentation

**Every new feature or fix must include appropriate documentation updates.**

**When to document:**
- **New feature** — Add explanation to `docs/current/` (gameplay, components, or development as appropriate)
- **Mechanic change** — Update the relevant gameplay page
- **Sheet/UI change** — Update component or development docs
- **New public API** — Add to development docs
- **Bug fix affecting users** — If user-facing behavior changed, update docs

**How to document:**
1. Add/update `.md` files in `docs/current/` matching the feature domain
2. Link from relevant index pages and cross-references
3. Include examples and workflows, not just API definitions
4. Update `docs/current/gameplay/mechanics.md` if core mechanics changed

**Why:** InSpectres is a system that users need to understand. Documentation is part of "done."

## Issue Labels

Three-tier system:

**Priority** (pick one):
- P0: Critical blocker
- P1: High priority (default)
- P2: Nice-to-have / tech debt

**Area** (one or more):
- area-core: Mechanics, rolls, stress
- area-sheets: Actor/item sheets, UI
- area-chat: Chat rolls, messaging
- area-missions: Mission tracking
- area-character: Death, recovery, bankruptcy
- area-compendium: Packs, content
- area-multiplayer: Socket sync, real-time
- area-devtools: Dev tooling
- area-testing: Test infrastructure
- area-docs: Docs, comments, i18n, rules

**Type** (for code changes):
- bug, enhancement, refactor, chore

**Phase** (sprint/composite only):
- phase-1: Core foundation (done)
- phase-2: UI polish, missions (in progress)

### Label Commands

```bash
gh issue list --state open --label "area-character"  # All character issues
gh issue list --state open --label "P0" --label "bug" # All P0 bugs
gh issue list --state all --label "P2"                # All tech debt
```

## Workflow & Branching

**NEVER commit directly to `main`** — it's a protected branch. All changes go through feature branches and pull requests.

**Branch workflow:**
1. Create feature branch (`fix/`, `docs/`, `feat/`, etc.) **before** starting work
2. Push to origin and create PR
3. Merge via PR UI only
4. When assigning work to subagents: if currently on main, create feature branch first; subagents will work on the current branch

**Why:** Ensures all changes are reviewed, tested via CI, and have clean commit history.

## Recovery System (Death & Dismemberment)

### Wall-Clock Time, Not Game Time

System uses `currentDay` (Foundry setting), not in-game combat rounds.

**Why:**
- Consistent timing across sessions
- GM explicit control (manual `currentDay` advance)
- Simple state (no Combat/Round tracking)

**State:**
- `recoveryStartedAt`: day number when recovery started
- `daysOutOfAction`: duration in days
- Recovery done when: `currentDay >= recoveryStartedAt + daysOutOfAction`
- Auto-clear: `autoClearRecoveredAgents()` fires on day advance

**Why not game time:** Missions span multiple in-game days with variable pacing. Recovery should be calendar-based, not paused/accelerated by mission events.

### Auto-Clear Mechanism

`currentDay` setting change → auto-clears expired recovery fields.

**Prevents:**
- Agents stuck in recovery (GM forgot to reset)
- Stale `recoveryStartedAt` blocking recovery expiry
