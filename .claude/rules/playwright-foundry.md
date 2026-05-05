---
paths:
  - "e2e/**"
  - "**/*.spec.ts"
  - "/tmp/inspect-*.js"
---

# Playwright + Foundry

Browser-based inspection + E2E testing (Playwright v1.59+). Prefer over agent browser: headless, structured output, fast.

## Login Boilerplate

6sec load after join redirect:

```js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto('http://127.0.0.1:30000/join');
  await page.selectOption('select[name="userid"]', { label: 'Gamemaster' }).catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(6000);   // Foundry's init hooks need time to fire

  // ... your inspection or interaction code ...

  await browser.close();
})();
```

Run with `node /tmp/my-script.js`. No build step — `playwright` is CommonJS require.

## Foundry Globals

`page.evaluate()` = browser context. Full access to `game`, `CONFIG`, `Hooks`, `ui`, `foundry`, `Actor`.

```js
const result = await page.evaluate(async () => {
  // Open first actor sheet
  const actor = game.actors.contents[0];
  actor.sheet.render(true);
  await new Promise(r => setTimeout(r, 1500));   // wait for render

  const el = document.querySelector('.application.sheet.inspectres');
  const style = window.getComputedStyle(el);
  return {
    tag: el?.tagName,
    classes: el?.className,
    color: style.color,
    bg: style.backgroundColor,
    height: style.height,
    overflow: style.overflow,
    outerHTML: el?.outerHTML.slice(0, 800),
  };
});
console.log(JSON.stringify(result, null, 2));
```

Must return JSON-serializable. Wrap errors:

```js
const result = await page.evaluate(() => {
  try {
    // ...
  } catch (e) {
    return { error: e.message };
  }
});
```

## V13 Sheet DOM

```
form.application.sheet.inspectres.actor.<type>   ← outer app wrapper (Foundry-managed)
  header.window-header                            ← title bar + close button
  section.window-content                          ← scrollable content area (overflow:hidden by default)
    form.inspectres.inspectres-sheet              ← our Handlebars template
      header.inspectres-header
      div.sheet-body
        section.inspectres-section
        ...
```

- Outer: `<form>` (not `<section>`). Classes land here
- `section.window-content` clips at `height`, default `overflow: hidden`
- Set `overflow-y: auto` for scrolling
- Dark theme `--color-text-primary` = cream. Always set `color` explicitly

## CSS inspection patterns

### Ancestor walk — understand inheritance chain

```js
const ancestors = [];
let el = document.querySelector('your-element');
while (el && el !== document.body) {
  const s = window.getComputedStyle(el);
  ancestors.push({ tag: el.tagName, classes: el.className, color: s.color, bg: s.backgroundColor, overflow: s.overflow });
  el = el.parentElement;
}
return ancestors;
```

### CSS variable resolution

```js
const style = window.getComputedStyle(document.documentElement);
const val = style.getPropertyValue('--color-text-primary');
// Returns resolved value or empty string if undefined
```

### Test `:has()` selectors

```js
const tests = ['dialog:has(form.dialog-form)', '.application:has(form)'];
return Object.fromEntries(tests.map(sel => [sel, !!document.querySelector(sel)]));
```

## Test Interaction Discipline

Tests interact through UI same way real user does. Test that bypasses UI gate passes even when gate broken.

**Rule: user must take action to reach state → test takes that action too.**

| Scenario | Wrong | Right |
|----------|-------|-------|
| Field hidden until button clicked | `page.evaluate(() => actor.update(...))` or direct DOM access | Click button first, then interact with revealed field |
| Dialog opened by roll button | `page.evaluate(() => new MyDialog().render(true))` | Click roll button, wait for dialog |
| Tab panel content not visible | `document.querySelector('.tab-content input')` (tab inactive) | Click tab, query now-visible content |
| Stat updated via form submit | Patch actor via `game.actors...update()` | Fill form field, submit form |
| Dropdown reveals sub-options | Access sub-options directly | Change dropdown, wait for sub-options |

**Assert visible state, not data model.** Check what user sees (visible text, element presence, CSS classes). Read `game.actors` only when UI gives no observable confirmation.

### Waiting after interaction

**Never use `waitForSelector` for elements that can race with ApplicationV2 re-renders.**
ApplicationV2 re-renders detach and re-attach elements. `waitForSelector` sees the element, then the element detaches during a re-render cycle, and the wait times out — even on retry.

**Rule:** Any selector rooted at `.inspectres` (the sheet container) or any Foundry ApplicationV2 element must use `waitForFunction + getBoundingClientRect`:

```js
// Wrong — races with ApplicationV2 re-renders; fails even when element is logically visible
await page.waitForSelector('.inspectres', { timeout: 10000 });

// Right — polls until element is present AND has non-zero size
await page.waitForFunction(
  () => {
    const el = document.querySelector('.inspectres');
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  },
  undefined,
  { timeout: 15_000 },
);
```

Use `waitForSelector` only for elements revealed by user interaction (clicks, form submits) that don't re-render the entire sheet — e.g., a newly-opened dropdown or a revealed textarea after a tab click.

```js
// OK — textarea appears after tab click; no full re-render
await page.click('.inspectres [role="tab"][aria-controls="tab-notes"]');
await page.waitForSelector('.inspectres textarea', { timeout: 5000 });
```

## Interaction patterns

### Open an actor sheet

```js
await page.evaluate(async () => {
  const actor = game.actors.getName('My Actor') ?? game.actors.contents[0];
  actor.sheet.render(true);
  await new Promise(r => setTimeout(r, 1500));
});
```

### Click buttons inside sheet

```js
// Use page.click with scoped selectors
await page.click('.application.sheet.inspectres [data-action="skillRoll"]');
await page.waitForTimeout(500);
```

### Trigger Foundry UI actions from JS

```js
await page.evaluate(() => {
  // Click actors tab
  document.querySelector('[data-tab="actors"]')?.click();
});
await page.waitForTimeout(500);
await page.click('#actors .create-entry[data-action="createEntry"]').catch(() => {});
```

### Check for chat messages

```js
const messages = await page.evaluate(() =>
  game.messages.contents.map(m => ({ content: m.content, speaker: m.speaker }))
);
```

## Diagnostics When Investigating E2E Failures

When working on a failing E2E test, add telemetry to the test or fixture before diagnosing. Don't guess — observe.

**Attach browser console log on failure** — the fixture does this automatically via `ConsoleBuffer`. If the test file doesn't use the extended `test` from `fixtures.ts`, it won't have this. Always import from `./fixtures`, not `@playwright/test` directly.

**Add a DOM snapshot when a selector fails:**
```js
// After a waitForFunction/waitForSelector failure, dump what's actually there
const snapshot = await page.evaluate(() => ({
  url: location.href,
  sheets: Array.from(document.querySelectorAll('.inspectres')).map(el => ({
    id: el.id,
    visible: el.getBoundingClientRect().width > 0,
  })),
  gameReady: (globalThis as any).game?.ready,
}));
console.log('DOM snapshot:', JSON.stringify(snapshot));
```

**Screenshot at failure point** — already done via `screenshot: "only-on-failure"` in playwright.config.ts. But for timing-sensitive failures, add mid-test screenshots:
```js
await page.screenshot({ path: 'test-results/e2e-screenshots/debug-step-N.png', timeout: 5000 }).catch(() => {});
```

**Check Foundry game state in evaluate:**
```js
const state = await page.evaluate(() => ({
  gameReady: (globalThis as any).game?.ready,
  actorCount: (globalThis as any).game?.actors?.size,
  userActive: (globalThis as any).game?.user?.active,
}));
```

**When adding new E2E tests**, include at minimum:
- One screenshot per test (for CI artifacts)
- Browser console attached on failure (use `fixtures.ts` `test`)
- `waitForFunction + getBoundingClientRect` instead of bare `waitForSelector` for sheet elements

## Test Granularity

**Goal: minimum number of individual `test()` blocks.** Each actor create/delete cycle costs ~5s. Every extra `test()` within a `describe` that shares the same actor type multiplies wall-clock time.

**Rule: one `test()` per `describe` block unless there is a concrete state conflict.**

Actions belong in the same test when:
- Post-state of step N is a valid pre-state for step N+1 (e.g. advance day → regress day)
- Actions operate on independent fields (e.g. `skills.academics` and `skills.athletics`, `bank` and `missionGoal`)
- An action opens a dialog that can be dismissed without affecting subsequent steps

**Only split into separate tests when:**
- The required pre-state for one test directly conflicts with another (e.g. `bank:5` vs `bank:0`)
- An action opens a dialog whose dismissal is unreliable and would make subsequent steps flaky

**Code smell — flag in review:** a `beforeEach` that creates an actor for a `describe` containing more than one `test()`. Ask: can these be sequenced into one test?

**Pre-pr-review P2 finding:** a new test suite where each test has its own actor lifecycle but the actions could cleanly share one actor.

**When adding a test, ask:** can this step chain onto an existing test in this describe? If the fields are independent and state flows cleanly, it must.

## Local Validation Before Push

**HARD REQUIREMENT — GitHub Actions minutes are limited.**

You MUST run E2E tests locally before pushing ANY change that touches:
- `foundry/src/__tests__/e2e/**` (test files, page objects, fixtures, global-setup)
- `foundry/playwright.config.ts`

Never push E2E changes and rely on CI to catch failures. No exceptions.

```bash
# Full run (fresh Docker data — use before first push)
cd foundry && bash scripts/run-e2e.sh

# Fast iteration (skip data wipe, keep container running for reruns)
cd foundry && KEEP_DATA=1 KEEP_RUNNING=1 bash scripts/run-e2e.sh

# Run a single test by name
cd foundry && bash scripts/run-e2e.sh -- --grep "test name here"
```

The script (`scripts/run-e2e.sh`) handles the full lifecycle: stop container → wipe data → build dist → start Docker → wait for Foundry → run Playwright → teardown. No manual Docker steps needed.

Tests must pass locally before `git push`. If they fail, fix them first.

## Scratch Scripts

Write to `/tmp/inspect-<thing>.js`, run `node`. Copy boilerplate from `/tmp/inspect-dialog*.js`. Don't commit. Move durable patterns to `e2e/`.

## Timing notes

| Action | Wait |
|--------|------|
| Page load after join | 6000ms |
| Sheet render | 1500ms |
| Dialog open | 1000–2000ms |
| Actor update propagation | 500ms |
| CSS change (after build + browser refresh) | — (manual) |

Fixed timeouts for Foundry init only. Use `waitForSelector({ state: 'visible' })` for UI-triggered reveals.
