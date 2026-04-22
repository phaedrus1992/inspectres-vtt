---
paths:
  - "e2e/**"
  - "**/*.spec.ts"
  - "/tmp/inspect-*.js"
---

# Playwright + Foundry VTT Testing

Use Playwright (`playwright` v1.59+ is installed globally) for browser-based inspection and
end-to-end testing of the Foundry system. **Prefer this over the agent browser** — it runs
headless, produces structured output, and is far faster.

## Login boilerplate

Every script starts the same way. Foundry takes ~6 seconds to finish loading after the join
redirect:

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

Run with `node /tmp/my-script.js`. No build step needed — `playwright` is a CommonJS require.

## Accessing Foundry globals inside `page.evaluate`

Everything inside `page.evaluate(() => { ... })` runs in the browser context and has full access
to Foundry globals: `game`, `CONFIG`, `Hooks`, `ui`, `foundry`, `Actor`, etc.

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

Anything returned from `page.evaluate` must be JSON-serializable. Wrap errors:

```js
const result = await page.evaluate(() => {
  try {
    // ...
  } catch (e) {
    return { error: e.message };
  }
});
```

## V13 ActorSheetV2 DOM structure

Foundry V13's `ApplicationV2` renders actor sheets with this nesting:

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

Key facts:
- The **outer element is `<form>`**, not `<section>` — `.application.sheet` is the outer form.
- `section.window-content` clips at the sheet's configured `height` with `overflow: hidden` by
  default. Set `overflow-y: auto` on it to enable scrolling.
- Classes in `DEFAULT_OPTIONS.classes` land on the outer `form.application`, not the inner form.
- Foundry's dark theme sets `--color-text-primary` to a cream color — it bleeds into any element
  without an explicit `color`. Always set `color` explicitly on inner sheet forms.

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

## Interaction patterns

### Open an actor sheet

```js
await page.evaluate(async () => {
  const actor = game.actors.getName('My Actor') ?? game.actors.contents[0];
  actor.sheet.render(true);
  await new Promise(r => setTimeout(r, 1500));
});
```

### Click buttons inside the sheet

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

## Temporary scripts

Write one-off inspection scripts to `/tmp/inspect-<thing>.js` and run with `node`. Previous
scripts in `/tmp/inspect-dialog*.js` have working login boilerplate — copy and adapt.

Do not commit these scratch scripts. If a pattern proves durable, move it to `e2e/`.

## Timing notes

| Action | Wait |
|--------|------|
| Page load after join | 6000ms |
| Sheet render | 1500ms |
| Dialog open | 1000–2000ms |
| Actor update propagation | 500ms |
| CSS change (after build + browser refresh) | — (manual) |

Avoid `waitForSelector` on Foundry UI elements unless you know the exact selector — Foundry's
dynamic rendering makes selectors fragile. Prefer a fixed timeout after triggering an action.
