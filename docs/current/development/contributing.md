---
sidebar_position: 3
---

# Contributing

How to contribute to InSpectres.

## Before You Start

- Open an issue to discuss your feature or bug fix
- Read CLAUDE.md in the repository root for code standards
- Read `.claude/rules/foundry-vite.md` for Foundry-specific patterns
- Set up your development environment: [Development Setup](./setup.md)

## Contribution Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
```

Use `feat/`, `fix/`, `refactor/`, `docs/`, or `chore/` prefixes.

### 2. Write Tests First (TDD)

In `foundry/src/`, create a `.test.ts` file alongside your code:

```typescript
// src/rolls/execute.test.ts
import { describe, it, expect } from "vitest";
import { executeSkillRoll } from "./execute";

describe("executeSkillRoll", () => {
  it("rolls correct number of dice", () => {
    const agent = makeAgent({ skills: { cool: 2 } });
    // Test code...
  });
});
```

See `.claude/rules/foundry-vite.md` for testing patterns.

### 3. Implement to Pass Tests

Write the minimal code to make tests pass. No over-engineering.

```typescript
export async function executeSkillRoll(
  agent: RollActor,
  franchise: RollActor | null,
  skillName: SkillName,
): Promise<void> {
  // Implementation...
}
```

### 4. Update CHANGELOG.md

If your change is user-facing (new mechanics, UI, features):

```markdown
## [Unreleased]

### Added
- Franchise dice pool displays on agent sheets

### Fixed
- Recovery system now correctly clears expired recovery fields
```

For tooling/CI/docs only, skip the changelog entry unless beneficial to document.

### 5. Quality Checks

Before committing:

```bash
npm run check    # Type checking
npm run test     # Run tests
npm run build    # Production build
```

Fix any errors. All warnings must be resolved.

### 6. Commit

```bash
git commit -m "Your clear commit message

Description of what and why (if needed).
Reference any issues: Closes #123"
```

- **Imperative mood** — "Add feature", not "Added feature"
- **Under 72 characters** for subject line
- **No "Co-Authored-By"** — We use git blame for attribution
- **Reference issues** — "Fixes #123" auto-closes the issue on merge

### 7. Push & Open PR

```bash
git push -u origin feat/your-feature-name
```

Then open a PR on GitHub with:
- Clear title (what did you do?)
- Description (why did you do it?)
- Testing notes (how did you verify it works?)

## Code Standards

Read **CLAUDE.md** in the repo root. Key points:

- **TypeScript strict mode** — No `any` without justification
- **Naming** — Clear, consistent, no abbreviations
- **Functions** — Max 100 lines, complexity ≤ 8
- **Testing** — Fail-fast, test behavior not implementation
- **Comments** — Only explain why, not what; refactor instead if unclear

## Foundry-Specific Guidelines

From `.claude/rules/foundry-vite.md`:

- **Use Foundry globals correctly** — No casting to `any`
- **Follow V2 patterns** — ApplicationV2, DialogV2, hooks with `V2` suffix
- **Namespace everything** — CSS, IDs, settings, sockets: prefix with `inspectres`
- **Localization** — All user-visible strings must be i18n keys, not hard-coded
- **Data models** — Prefer DataModel over template.json when possible

## PR Review Process

When you open a PR:

1. **CI runs automatically** — Linting, type checking, tests
2. **Maintainer reviews** — Checks code quality, design, adherence to standards
3. **Iterate if needed** — Address feedback and push updates
4. **Approval** — When CI passes and review is OK, PR can merge
5. **Merge** — PR merges to main; issue closes automatically (if referenced)

## Versioning & Releases

InSpectres uses [Semantic Versioning](https://semver.org/):

| Change | Version |
|--------|---------|
| Backwards-incompatible data/API | MAJOR |
| New actor type, sheet, mechanic | MINOR |
| Bug fix, refactor, docs, CI | PATCH |

Version is in `foundry/system.json`. Maintainers handle versioning and releases.

## Questions?

- **Code standards** → CLAUDE.md
- **Foundry patterns** → `.claude/rules/foundry-vite.md`
- **Testing** → `.claude/rules/foundry-vite.md` (Testing section)
- **Anything else** → Open an issue or PR with questions

---

**Thank you for contributing!** We appreciate your time and effort to improve InSpectres.
