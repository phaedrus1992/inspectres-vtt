# Accessibility & UI Auditing

Companion to `playwright-foundry.md` and `foundry-theming.md`. Rules for accessibility checks, automated audits, and UI quality gates.

## Tooling Hierarchy

**Always prefer axe-core (even experimental rules) over hand-rolled assertions.**

Axe gets better over time, we don't. Custom contrast math, custom semantic checks, custom focus-order assertions — these freeze coverage in time and accumulate maintenance debt. An experimental axe rule that may improve next release outperforms a custom helper that ages in place.

| Need | Use | Don't use |
|------|-----|-----------|
| Color contrast (text) | axe `color-contrast` rule | Hand-computed WCAG luminance math |
| Non-text contrast | axe with `experimental` tag + future rule when shipped | Hand-rolled border/bg contrast walks |
| Target size | axe `target-size` rule | Manual `getBoundingClientRect` checks |
| ARIA semantics | axe `aria-*` rules | Manual `getAttribute` walks |
| Focus order | axe `focus-order-semantics` (experimental) | Manual `Tab` keypress simulation for ordering |

### When axe genuinely doesn't cover something

Document the gap, then either:
1. **Open an axe-core GitHub issue** (most gaps already tracked).
2. **Wait** — if it's not blocking, defer. Coverage will grow.
3. **Custom helper as a last resort** — only if the UI bug is severe and recurring. Document the rule it replaces and add a TODO to remove the helper when axe ships the equivalent.

## Audit Configuration

Include forward-looking tags so newly-shipped axe rules activate automatically without code changes:

```typescript
const results = await new AxeBuilder({ page })
  .include(`.application[id*="${actorId}"]`)
  .withTags(["wcag2aa", "wcag21aa", "wcag22aa", "experimental"])
  .options({ runOnly: { type: "tag", values: ["color-contrast"] } })
  .analyze();
```

- **`wcag2aa` + `wcag21aa` + `wcag22aa`:** baseline AA coverage across WCAG versions.
- **`experimental`:** opt into rules axe is iterating on. Yes, this can introduce false positives — accept the tradeoff for the wider net.
- **`runOnly`:** narrow to the rule families we care about (color-contrast today). Add more as we want coverage; remove when noise is real.

## Non-text Contrast

WCAG 1.4.11 requires 3:1 contrast for UI components and graphical objects (form-control borders, icon strokes, focus indicators).

**Current axe-core (4.x) status:** no `non-text-contrast` rule. We rely on:
- Manual review of brand color choices against backgrounds.
- The `experimental` tag in audits (will pick up the rule when axe ships it).
- Common sense: if a control's resting border is barely visible, the contrast is wrong — visual distinguishability is the test, not a math formula.

**Practical guideline:** form-control borders, icon strokes, and focus rings should be *clearly distinguishable* against their surrounding background. If you have to look twice to tell whether a checkbox is there, the contrast is too low.

**Known safe pairings in this codebase:**
- `--inspectres-gray-400` (`#666`) on white: 5.7:1 ✓
- `--inspectres-gray-base` (`#9d9e9d`) on white: 2.7:1 ✗ (do not use for borders on white)
- `--inspectres-green-dark` (`#38b44a`) for focus rings: pairs well on white and on green panels.

## CSS Hygiene for Accessibility

- **Never set `border: none` on form controls** without replacing it with a visible alternative (background, outline, ring).
- **Always preserve focus rings** — `:focus-visible` must produce something. The `outline: 2px solid var(--inspectres-green-dark)` pattern in `controls.css` is the canonical version.
- **`appearance: none` requires manual styling** — when we reset native rendering, we own the entire visual state (resting, hover, focus, checked, disabled). Don't leave gaps.
- **Disabled state must remain visible** — `opacity: 0.5` is fine; `display: none` or `color: transparent` is not.

## E2E Accessibility Tests

Every sheet/dialog E2E suite includes one accessibility test that iterates each tab and calls `assertSheetAccessibility(page, actorId)`. See `playwright-foundry.md` § "Accessibility Testing" for the established pattern.

Adding a new sheet without an accessibility test is a pre-pr-review P1 finding.

## Anti-Patterns

| Never | Do this |
|-------|---------|
| Hand-rolled contrast math | axe-core with `experimental` tag |
| Custom focus-order assertions | axe `focus-order-semantics` |
| Custom ARIA presence checks | axe `aria-*` rules |
| Disable axe rules to "make tests pass" | Fix the violation or scope the include narrower |
| `border: none` on form controls | Replace with visible alternative |
| Removing focus indicators | Always preserve `:focus-visible` styling |
| Brand color on similar background without contrast check | Verify against `inspectres-gray-400` etc. or check WCAG ratio |
| Stale custom a11y helpers | Delete when axe ships equivalent; track with TODO |

## When You Find an A11y Bug

1. **Verify axe doesn't already catch it** — check rule list with current tags. Try adding `experimental`.
2. **Fix the underlying CSS/markup** — fix the actual color, label, role, focus indicator.
3. **If axe missed it,** open an axe-core issue and link from the fix commit, but do not add a custom assertion unless the bug is recurring and severe.
4. **Add a regression test** that exercises the fix path through `assertSheetAccessibility` — let axe do the work.
