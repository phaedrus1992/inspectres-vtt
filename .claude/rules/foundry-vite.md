---
paths:
  - "foundry/**/*.ts"
  - "foundry/**/*.hbs"
  - "foundry/**/*.css"
  - "foundry/vite.config*.ts"
  - "foundry/tsconfig.json"
  - "foundry/system.json"
  - "foundry/template.json"
---

# Foundry VTT + Vite Rules

Companion to `typescript.md`. All TS rules apply; adds Foundry + Vite specifics.

## Foundry Globals

Never cast Foundry globals to `any`. Use fvtt-types:
```typescript
const actor = game.actors?.get(id); // typed as StoredDocument<Actor> | undefined
```

`skipLibCheck: true` intentional (library types have issues). Your code must be clean.

### Filling fvtt-types Gaps

V2 APIs (`ApplicationV2`, `DialogV2`, V2 hooks) may be missing. Never use `unknown` as workaround:

1. Check `src/types/foundry-v2.d.ts` (project ambient declarations)
2. Add missing types using Foundry API docs + reference systems (`reference/dnd5e/`, `reference/pf2e/`)
3. Delete from `foundry-v2.d.ts` once fvtt-types gains type

```typescript
// Good — ApplicationV2 in foundry-v2.d.ts
Hooks.on("renderDialogV2", function (_app, html: HTMLElement) { ... });
```

### V2 vs V1 Hooks

V13: all new dialogs/sheets use `ApplicationV2`. Old `renderDialog`/`renderActorSheet` fire for V1 only.
- Check DOM: `<div class="app">` = V1, `<dialog>` = V2
- Use matching hook: `renderDialog` vs `renderDialogV2`, `renderActorSheet` vs `renderActorSheetV2`

### actor.system Casting

**fvtt-types v13 cannot resolve `actor.system` to `AgentData` with `template.json`** (needs TypeDataModel registration).

Result: `actor.system as AgentData` = compile error. Double-cast required:
```typescript
this.actor.system as unknown as AgentData // correct + necessary until TypeDataModel migration
```

Use justification comment. This is a legitimate boundary cast, not a type-system workaround.

## Module Entry + Hooks

All init via Foundry lifecycle hooks. No top-level setup (globals not ready):
```typescript
Hooks.once("init", function () {
  CONFIG.inspectres = { ... };
  // register sheets, etc
});
Hooks.once("ready", function () {
  // post-init after docs loaded
});
```

Use `function`, not arrow (binds correctly). Use `Hooks.once` for one-time, `Hooks.on` for repeatable. Keep handlers small.

## Namespacing

Prefix all: CSS classes, IDs, CONFIG keys, settings, socket events, Handlebars partials.

```html
<div class="inspectres inspectres-sheet inspectres-agent-sheet">
```

```css
.inspectres { .sheet { ... } }
```

```typescript
game.settings.register("inspectres", "setting", { ... });
```

Foundry loads all systems on one page; unprefixed names collide.

## Handlebars

Register partials in `init`:
```typescript
Hooks.once("init", async function () {
  await loadTemplates([
    "systems/inspectres/templates/actors/agent-sheet.hbs",
  ]);
});
```

Paths relative to data root (`systems/<id>/...`). Hard-code or constant. Never dynamic from user input.

Keep logic out of templates. Pre-compute in `_prepareContext()` (V2) or `getData()` (V1).
Name helpers with prefix: `Handlebars.registerHelper("inspectres-foo", ...)`.

## Sheets

### V13 Target: ApplicationV2

**New sheets extend `ActorSheetV2` / `ItemSheetV2`** from `foundry.applications.sheets`.

V1 (`ActorSheet` / `ItemSheet`) deprecated in V13, removed in V15. Existing sheets produce warnings; don't add new V1.

**V2 skeleton:**
```typescript
export class AgentSheet extends foundry.applications.sheets.ActorSheetV2 {
  static override DEFAULT_OPTIONS = {
    classes: ["inspectres", "sheet", "actor", "agent"],
    position: { width: 600, height: 700 },
    actions: { skillRoll: AgentSheet.onSkillRoll },
  };
  static override PARTS = {
    sheet: { template: "systems/inspectres/templates/agent-sheet.hbs" },
  };
  override async _prepareContext(_options): Promise<Record<string, unknown>> {
    const base = await super._prepareContext(_options);
    const system = this.actor.system as unknown as AgentData;
    return { ...base, system: foundry.utils.deepClone(system) };
  }
  override async _onRender(_context, _options): Promise<void> {
    await super._onRender(_context, _options);
    // non-action listeners
  }
  static async onSkillRoll(this: AgentSheet, _event: Event, target: HTMLElement): Promise<void> {
    // ...
  }
}
```

Register in `init`:
```typescript
Hooks.once("init", function () {
  Actors.registerSheet("inspectres", AgentSheet, {
    types: ["agent"],
    makeDefault: true,
    label: "INSPECTRES.SheetAgent", // localization key
  });
});
```

### Dialogs

Use `foundry.applications.api.DialogV2` (V1 `Dialog` deprecated V13):
```typescript
const result = await foundry.applications.api.DialogV2.wait({
  window: { title: game.i18n.localize("INSPECTRES.RollTitle") },
  content: `<form>...</form>`,
  buttons: [
    {
      action: "roll",
      label: game.i18n.localize("INSPECTRES.Roll"),
      default: true,
      callback: (_event, _button, dialog) => {
        const form = dialog.querySelector("form") as HTMLFormElement;
        return Object.fromEntries(new FormData(form));
      },
    },
    { action: "cancel", label: game.i18n.localize("INSPECTRES.Cancel") },
  ],
});
if (!result || result === "cancel") return;
```

V2: `buttons` is array, each has `action` string, callback gets `(event, button, dialogElement)`.

### Lifecycle

| Concern | V1 | V2 |
|---------|----|----|
| Data | `getData()` | `_prepareContext()` |
| Listeners | `activateListeners(html: JQuery)` | `_onRender()` + `DEFAULT_OPTIONS.actions` |
| Form submit | `_updateObject(event, data)` | `_onSubmitForm(formData, event)` |
| DOM | `this.element` (jQuery) | `this.element` (HTMLElement) |
| Render hook | `renderActorSheet` | `renderActorSheetV2` |
| Dialog | `Dialog.wait(config)` | `DialogV2.wait(config)` |

## Data Models

Prefer `DataModel` over `template.json`:
```typescript
class AgentDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema(): foundry.data.fields.DataSchema {
    return {
      franchise: new fields.NumberField({ required: true, initial: 0, min: 0 }),
      stress: new fields.NumberField({ required: true, initial: 0, min: 0, max: 6 }),
    };
  }
}
```

If using `template.json`, keep minimal (defaults only). Don't use as schema docs; that's TS types.

## Testing

Never `as unknown as Actor` in tests. Full `Actor` has 130+ properties. Define structural interface:

```typescript
export interface RollActor {
  readonly id: string | null;
  readonly name: string;
  readonly system: object;
  update(data: Record<string, unknown>): Promise<unknown>;
}
export async function executeSkillRoll(agent: RollActor, franchise: RollActor | null, skillName: SkillName): Promise<void> {}
```

Test fixtures satisfy interface without cast:
```typescript
function makeAgent(overrides: Record<string, unknown> = {}): RollActor {
  return {
    id: "test-id",
    name: "Test",
    system: { cool: 1, ...overrides },
    async update(_data) {},
  };
}
```

For production needing Foundry API: cast at boundary with comment:
```typescript
const speaker = ChatMessage.getSpeaker({ actor: agent as Actor }); // getSpeaker requires full Actor
```

## Flags vs System Data

`system`: core, queryable, indexed.
`flags`: optional, module-specific.

```typescript
actor.system.franchise;                    // system
actor.getFlag("inspectres", "customNote"); // flag
```

Never write to `actor.data`. Use `actor.update({ "system.field": value })`.

## Localization

All user strings = localization keys. Never hard-code English:
```typescript
ui.notifications?.warn(game.i18n.localize("INSPECTRES.WarnInsufficientFranchise"));
```

Key format: `INSPECTRES.Context.Description` (UPPER_CAMEL_CASE segments). Define in `lang/en.json`. Never `format()` with user-supplied values.

## Vite Build

### Output

Single ES module file. No library mode (`build.lib`):
```typescript
rollupOptions: {
  input: "src/init.ts",
  output: { dir: "../dist", entryFileNames: "inspectres.js", format: "es" },
},
```

### No Code Splitting

Single file only. No `import()` at module top level. Foundry loads `<script type="module">`.

### Assets

No Vite asset imports. Foundry serves from own browser:
```typescript
const logoUrl = "systems/inspectres/assets/logo.png"; // Good
// Bad: import logoUrl from "./assets/logo.png"; (Vite hashes)
```

Static assets: exclude from Vite, copy to `dist/`.

### Config

- `base: ""` (Foundry loads from `/systems/inspectres/inspectres.js`)
- `target: "esnext"` (match Foundry browser)
- dev: enable sourcemaps, prod: disable

```typescript
// vite.config.prod.ts
export default defineConfig({
  ...baseConfig,
  build: { ...baseConfig.build, sourcemap: false, minify: true },
});
```

### Assets via Rollup

Use Rollup `generateBundle` hook (existing approach) not `vite-plugin-static-copy`. Fewer deps.
Use `for...of`, not `forEach` in plugin.

## tsconfig

Add `"verbatimModuleSyntax": true` (required by TS rules). Combined with `"isolatedModules": true`, ensures type-only imports stripped, prevents accidental value imports.
`allowImportingTsExtensions: true` requires `noEmit: true`.
`moduleResolution: "bundler"` correct for Vite.

## Anti-Patterns

| Never | Use |
|-------|-----|
| Top-level `game`, `CONFIG`, `Hooks` | `Hooks.once("init", ...)` |
| Unprefixed CSS/IDs | Prefix all with `inspectres` |
| Hard-coded strings in TS/HBS | `game.i18n.localize("INSPECTRES.Key")` |
| Direct `actor.data.system.field = value` | `actor.update({ "system.field": value })` |
| Dynamic `import()` in system | Static imports only |
| Vite asset imports | Path strings `systems/inspectres/...` |
| `import type` on used constructors | Regular `import` |
| `forEach` in plugin | `for...of` |
| Raw string sheet labels | Localization keys |
| `template.json` as schema docs | TS `DataModel` classes |
| `unknown` for missing fvtt-types | Add to `src/types/foundry-v2.d.ts` |
| `renderDialog` for V2 | `renderDialogV2` |
| New `ActorSheet` / `ItemSheet` (V1) | `ActorSheetV2` / `ItemSheetV2` |
| `Dialog.wait()` (V1) | `DialogV2.wait()` |
| `extends Application` (V1) | `ApplicationV2` |
| `getData()` in V2 sheets | `_prepareContext()` |
| `activateListeners(html: JQuery)` in V2 | `_onRender()` + actions |
