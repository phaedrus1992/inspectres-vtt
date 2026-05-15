# No Bug Left Behind

Companion to CLAUDE.md's "no bug or feature left behind" principle. Codifies how that principle interacts with PR review workflows.

## Core Rule

If a scanner, linter, type checker, audit agent, or manual review surfaces a finding **in a file the current branch already touches**, fix it in the current branch. Do not defer it under the label "pre-existing."

This applies regardless of whether the finding's root cause predates the branch. The branch is editing the file; the next reviewer is reading the file; the next bug report will land on the file. Fix it now.

## When Deferral Is Legitimate

Deferral via GitHub issue is only legitimate when one of these holds:

1. **Architectural redesign required.** Fix changes the shape of a public API, data model, or cross-cutting abstraction that needs design discussion first.
2. **Out-of-scope file.** Finding is in a file the current branch does NOT touch. (Even then, prefer filing an issue immediately over silently ignoring.)
3. **External dependency blocks fix.** Awaiting upstream library, infra change, or third-party fix.
4. **Genuinely large effort.** Multi-day investigation that would derail the current ticket. Document the effort estimate when deferring.

"This is a pre-existing issue, not introduced by my diff" is **not** a legitimate reason. Neither is "this is out of scope of the original ticket" when the file is in the diff.

## Mandatory Scans

These scans' P1/P2 findings are not advisory — they are gate criteria for any PR that touches the relevant files:

- `npx slop-scan scan . --lint`
- `oxlint` (via `npm run lint`)
- `tsc --noEmit` (via `npm run check`)
- `vitest` (via `npm run test`)
- pre-pr-review subagent findings (security-audit, variant-bug-hunter, code-reviewer, etc.)

If any of these flag a file in the branch's diff, the finding gets fixed before the PR opens, not deferred.

## Workflow Integration

### pre-pr-review Step 6 (fix loop)

For every P1/P2 finding in the consolidated list:

1. Is the file in the branch's diff (`git diff --name-only $BASE...HEAD`)? → **Fix now.**
2. Is the file outside the diff but the finding is small (<30 min)? → **Fix now**, mention in commit message.
3. Otherwise → file a GitHub issue with priority + area + type labels, link from PR body.

### pre-pr-review Step 7 (deferred work)

Before marking anything as deferred, verify: did I call this "pre-existing" or "out of scope" as a shortcut? If yes, move it back to Step 6 and fix it.

The deferred section of the PR body should be empty most of the time. Non-empty deferred lists need explicit justification per item.

### ship-issue Step 5 (implement)

If you discover a bug or smell while implementing the ticket, and the bug is in a file you're editing: fix it in the same branch. Reference it in the commit message but don't open a separate issue unless the user explicitly asked.

## Anti-Patterns

| Never | Do this |
|-------|---------|
| "Deferred as pre-existing" | Fix it; the file is in your diff |
| "Out of scope of the ticket" (file is in diff) | Fix it; scope follows touched files, not the ticket title |
| Filing an issue for a 5-line fix in your diff | Just make the fix; one commit, one PR |
| Silently ignoring a scanner finding | Either fix it or file an issue with rationale |
| Marking a finding "false positive" without justification in PR body | Document why; reviewers should see your reasoning |
| Letting CLAUDE.md "no bug left behind" lose to pre-pr-review's "scope" instinct | CLAUDE.md wins; scope expands to cover the finding |

## Why

The user has corrected this behavior multiple times. The "pre-existing" deferral pattern:
- Inflates issue backlogs with paper cuts that never get prioritized
- Lets known smells calcify in actively edited code
- Sends the wrong signal to future contributors ("we know about it but won't fix it")
- Wastes review cycles re-discovering the same finding on the next PR

Fixing in-branch costs a few extra minutes. Deferring costs forever.
