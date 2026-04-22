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

# Foundry VTT + Vite Development Rules

Companion to `.claude/rules/typescript.md`. All TypeScript rules apply; this file adds
Foundry-specific and Vite-specific rules on top.

## Foundry Globals and Types

Foundry VTT runs in-browser and populates globals (`game`, `CONFIG`, `Hooks`, `ui`, etc.) at
runtime. This project uses `fvtt-types` — never cast Foundry globals to `any`. Narrow types using
the generated typings:

```typescript
// Bad
const actor = (game as any).actors?.get(id);

// Good
const actor = game.actors?.get(id);
// actor is typed as StoredDocument<Actor> | undefined — handle undefined explicitly
```

Never suppress type errors from `fvtt-types` with `@ts-ignore`; fix the type usage instead.
`skipLibCheck: true` in tsconfig is intentional (the library types have known issues), but your
own code must be clean.

### Filling fvtt-types Gaps

`fvtt-types` trails Foundry releases — V2 APIs (`ApplicationV2`, `DialogV2`, V2 hook signatures)
may be missing or incomplete. **Never use `unknown` as a workaround for missing types.** Instead:

1. Check `src/types/foundry-v2.d.ts` — project-local ambient declarations for V2 APIs not yet
   in fvtt-types.
2. If what you need isn't there, add it. Use Foundry's API docs and the reference systems
   (`reference/dnd5e/`, `reference/pf2e/`) to determine the accurate shape.
3. When fvtt-types eventually gains the type, delete it from `foundry-v2.d.ts`.

```typescript
// Bad — loses type safety on the app parameter
Hooks.on("renderDialogV2", function (_app: unknown, html: HTMLElement) { ... });

// Good — ApplicationV2 declared in src/types/foundry-v2.d.ts
Hooks.on("renderDialogV2", function (_app, html: HTMLElement) { ... });
// (fvtt-types resolves _app to its own type; use RenderDialogV2Callback cast if you need
//  the parameter typed as foundry.applications.api.ApplicationV2)
```

**V2 vs V1 hooks:** As of Foundry V13, all new dialogs and sheets use `ApplicationV2`. The old
`renderDialog` / `renderActorSheet` hooks fire only for V1 `Application` subclasses (now in
`foundry.appv1.*`). When writing hooks, check which API the target uses — inspect the DOM
(`<div class="app">` = V1, `<dialog>` or `<section>` element = V2) and use the matching hook
(`renderDialog` vs `renderDialogV2`, `renderActorSheet` vs `renderActorSheetV2`).

### actor.system casting and fvtt-types v13 limitations

**fvtt-types v13 cannot statically resolve `actor.system` to `AgentData` or `FranchiseData`**
when the project uses `template.json` rather than `TypeDataModel` subclasses.

In fvtt-types v13, `Actor.system` resolves to `SystemOfType<"base" | ModuleSubType>` — a union
of `EmptyObject` and `UnknownSystem`. The subtypes `"agent"` and `"franchise"` are only registered
at runtime via `CONFIG.Actor.typeLabels`; there is no compile-time hook that promotes them into
the `SubType` union unless you use `DataModelConfig` (TypeDataModel) or `SourceConfig` (which only
affects `ConfiguredSubTypeOf`, not the system union itself).

**Consequence:** `actor.system as AgentData` is a compile-time error because `AgentData` and
`UnknownSystem` don't overlap. The double-cast `actor.system as unknown as AgentData` is
unavoidable for template.json systems. These casts are legitimate and must be documented with
justification comments — they are not shortcuts around the type system, they are explicit
acknowledgments that the type boundary exists.

**Configuration hooks summary (fvtt-types v13):**

| Hook | Used for | Effect on `actor.system` |
|------|----------|--------------------------|
| `DataModelConfig.Actor` | TypeDataModel class constructors | Makes subtypes known; eliminates `as unknown` |
| `SourceConfig.Actor` | template.json raw shapes | Adds keys to `ConfiguredSubTypeOf`; does NOT add them to the SubType union |
| `DataConfig.Actor` | Initialized runtime shapes | Used in SystemMap once subtypes are in SubType |
| `SystemConfig.Actor.discriminate` | Union narrowing mode | Does not help without TypeDataModel |

**The path to eliminating `as unknown as` casts** is migrating `template.json` schemas to
`TypeDataModel` subclasses and registering them in `CONFIG.Actor.dataModels` + `DataModelConfig`.
Until then, every `actor.system as unknown as AgentData` cast is correct and necessary.

## Module Entry and Hook Registration

All initialization must go through Foundry's lifecycle hooks. Never run setup code at module
top-level — Foundry's globals are not available when the module is first parsed.

```typescript
// Bad — globals not ready yet
CONFIG.inspectres = { ... };

// Good
Hooks.once("init", function () {
  CONFIG.inspectres = { ... };
  // register sheets, document classes, etc.
});

Hooks.once("ready", function () {
  // post-init setup that needs all documents loaded
});
```

Hook handlers are plain `function` declarations, not arrow functions, so `this` binds correctly if
Foundry passes a context (uncommon but possible).

Use `Hooks.on` for repeatable hooks; `Hooks.once` for one-time setup. Keep hook handlers small —
delegate to named functions rather than inlining logic.

## Namespacing — CSS, IDs, and Globals

Every element class, ID, config key, and setting key must be prefixed with the system ID
(`inspectres`). Foundry renders all active systems and modules into a single page; unprefixed names
will collide.

```html
<!-- Bad -->
<div class="sheet agent-sheet">

<!-- Good -->
<div class="inspectres inspectres-sheet inspectres-agent-sheet">
```

```css
/* Bad */
.sheet { ... }

/* Good — nest all rules under the system prefix */
.inspectres {
  .sheet { ... }
  .agent-sheet { ... }
}
```

```typescript
// Bad
game.settings.register("myModule", "difficulty", { ... });

// Good
game.settings.register("inspectres", "difficulty", { ... });
```

This applies to: CSS classes, element IDs, `CONFIG` keys, `game.settings` registrations, socket
event names, and Handlebars partial names.

## Handlebars Templates

Register all partials in the `init` hook before sheets try to render them:

```typescript
Hooks.once("init", async function () {
  await loadTemplates([
    "systems/inspectres/templates/actors/agent-sheet.hbs",
    "systems/inspectres/templates/partials/dice-pool.hbs",
  ]);
});
```

Handlebars template paths are always relative to the Foundry data root (`systems/<id>/...`), not
relative to the source tree. Hard-code path strings or derive from a `SYSTEM_PATH` constant — never
construct paths dynamically from user input.

Templates are plain HTML with Handlebars expressions. Keep logic out of templates: pass
pre-computed values from `_prepareContext()` (V2) or `getData()` (V1 legacy), not raw document
data. Name helper functions with the system prefix:
`Handlebars.registerHelper("inspectres-pluralize", ...)`.

## Actor and Item Sheets

### V13 target: ApplicationV2 / ActorSheetV2

Foundry V13 deprecated `ActorSheet` / `ItemSheet` (now `foundry.appv1.sheets.ActorSheet`).
**New sheets must extend `ActorSheetV2` / `ItemSheetV2`** from `foundry.applications.sheets`.

The existing `AgentSheet` and `FranchiseSheet` still extend the V1 `ActorSheet` and will produce
deprecation warnings in V13. Migrating them is tracked in a GitHub issue — do not add new V1
sheets; use `ActorSheetV2` for any new sheet.

**V2 sheet skeleton:**

```typescript
// foundry.applications.sheets.ActorSheetV2 — available as global in V13+
export class AgentSheet extends foundry.applications.sheets.ActorSheetV2 {
  static override DEFAULT_OPTIONS = {
    classes: ["inspectres", "sheet", "actor", "agent"],
    position: { width: 600, height: 700 },
    // Static action handlers replace activateListeners event delegation
    actions: {
      skillRoll: AgentSheet.onSkillRoll,
      stressRoll: AgentSheet.onStressRoll,
    },
  };

  static override PARTS = {
    sheet: { template: "systems/inspectres/templates/agent-sheet.hbs" },
  };

  // Replaces getData() — return plain object, never the document itself
  override async _prepareContext(_options: unknown): Promise<Record<string, unknown>> {
    const base = await super._prepareContext(_options);
    // fvtt-types v13 + template.json: system is UnknownSystem without TypeDataModel registration;
    // as unknown as AgentData is the required cast until migration to TypeDataModel.
    return { ...base, system: this.actor.system as unknown as AgentData };
  }

  // Replaces activateListeners() for non-action event handling
  override async _onRender(_context: unknown, _options: unknown): Promise<void> {
    await super._onRender(_context, _options);
    // attach listeners not covered by DEFAULT_OPTIONS.actions
  }

  // Static action handler — Foundry binds `this` to the sheet instance
  static async onSkillRoll(this: AgentSheet, _event: Event, target: HTMLElement): Promise<void> {
    const skill = target.dataset["skill"] ?? "";
    await executeSkillRoll(this.actor, findFranchiseActor(), skill as SkillName);
  }
}
```

**V1 legacy pattern** (existing sheets only — do not write new V1 sheets):

```typescript
// Still works in V13 via foundry.appv1.sheets.ActorSheet compat shim.
// Will break in V15 when appv1 is removed.
export class AgentSheet extends ActorSheet {
  override async getData() {
    const context = await super.getData();
    // fvtt-types v13 + template.json requires double-cast; see foundry-vite.md for explanation.
    return { ...context, system: this.actor.system as unknown as AgentData };
  }
  override activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);
    // event handlers
  }
}
```

**Registration** (unchanged for both V1 and V2):

```typescript
Hooks.once("init", function () {
  Actors.registerSheet("inspectres", AgentSheet, {
    types: ["agent"],
    makeDefault: true,
    label: "INSPECTRES.SheetAgent",  // always a localization key, never a raw string
  });
});
```

### Dialogs

`Dialog` is deprecated in V13 (`foundry.appv1.api.Dialog`). Use `foundry.applications.api.DialogV2`:

```typescript
// Bad — deprecated V1 Dialog
const result = await Dialog.wait({ buttons: { ok: { callback: () => 42 } } });

// Good — V2 DialogV2
const result = await foundry.applications.api.DialogV2.wait({
  window: { title: game.i18n.localize("INSPECTRES.RollTitle") },
  content: `<form>...</form>`,
  buttons: [
    {
      action: "roll",
      label: game.i18n.localize("INSPECTRES.DialogRoll"),
      default: true,
      callback: (_event, _button, dialog) => {
        const form = dialog.querySelector("form") as HTMLFormElement;
        return Object.fromEntries(new FormData(form));
      },
    },
    { action: "cancel", label: game.i18n.localize("INSPECTRES.DialogCancel") },
  ],
});
if (!result || result === "cancel") return;
```

The key difference: V2 `buttons` is an array (not an object), each button has an `action` string,
and the `callback` receives `(event, button, dialogElement)` — not `(html: JQuery)`.

### Application lifecycle comparison

| Concern | V1 (deprecated) | V2 (target) |
|---------|----------------|-------------|
| Data for template | `getData()` | `_prepareContext()` |
| Attach listeners | `activateListeners(html: JQuery)` | `_onRender(context, options)` + `DEFAULT_OPTIONS.actions` |
| Form submit | `_updateObject(event, data)` | `_onSubmitForm(formData, event)` |
| DOM element | `this.element` (jQuery) | `this.element` (HTMLElement) |
| Render hook | `renderActorSheet(app, html, data)` | `renderActorSheetV2(app, context, options)` |
| Dialog create | `Dialog.wait(config)` | `DialogV2.wait(config)` |

## Data Models (DataModel / TypeDataModel)

Prefer `DataModel`-based system data over `template.json` plain objects. `DataModel` provides
server-side validation, typed access, and schema enforcement:

```typescript
import { fields } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/fields.mjs";

class AgentDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema(): foundry.data.fields.DataSchema {
    return {
      franchise: new fields.NumberField({ required: true, initial: 0, min: 0 }),
      stress: new fields.NumberField({ required: true, initial: 0, min: 0, max: 6 }),
    };
  }
}
```

When using `template.json`, keep it minimal — only fields that genuinely need default values. Do
not use `template.json` to document the schema; that belongs in TypeScript types.

## Testing Patterns — Avoiding Full Actor Fixtures

**Never use `as unknown as Actor` in tests.** Full `Actor` has 130+ properties; creating a fixture
that satisfies it is impractical and brittle. Instead, define a structural interface with only the
properties the code under test actually uses:

```typescript
// In the module being tested — exported so tests can use it directly
export interface RollActor {
  readonly id: string | null;
  readonly name: string;
  readonly system: object;
  update(data: Record<string, unknown>): Promise<unknown>;
}

// Function signatures use the interface, not Actor
export async function executeSkillRoll(
  agent: RollActor,
  franchise: RollActor | null,
  skillName: SkillName,
): Promise<void> { ... }
```

```typescript
// In tests — fixtures satisfy RollActor without casting
function makeAgent(overrides: Record<string, unknown> = {}): RollActor {
  return {
    id: "test-agent-id",
    name: "Test Agent",
    system: { cool: 1, skills: { ... }, ...overrides },
    async update(_data) {},
  };
}
```

Calling `actor.system` in tests still requires a cast since `system: object` has no index
signature. Use bracket notation with a cast for clarity: `(agent.system as Record<string, unknown>)["cool"]`.

**For production code that must call Foundry APIs accepting `Actor`**, cast at the boundary
with a justification comment:

```typescript
// ChatMessage.getSpeaker requires the full Actor type — boundary cast from RollActor
const speaker = ChatMessage.getSpeaker({ actor: agent as Actor });
```

## Flags vs System Data

Use `system` data (defined in `template.json` or `DataModel`) for data that is core to the system
and needs to be queried or indexed. Use `flags` for optional, module-specific data that doesn't
belong in the core schema:

```typescript
// System data — appears in all agents, part of schema
actor.system.franchise;

// Flag — optional data added by a module
actor.getFlag("inspectres", "customNote");
```

Never write to `actor.data` directly. Always use `actor.update()` or `actor.system.update()` to
persist changes.

## Localization

All user-visible strings must be localization keys. Never hard-code English strings in TypeScript or
Handlebars:

```typescript
// Bad
ui.notifications?.warn("Not enough franchise dice.");

// Good
ui.notifications?.warn(game.i18n.localize("INSPECTRES.WarnInsufficientFranchise"));
```

Key naming convention: `SYSTEMID.Context.Description` in `UPPER_CAMEL_CASE` segments:
- `INSPECTRES.ActorAgent.LabelFranchise`
- `INSPECTRES.WarnInsufficientFranchise`
- `INSPECTRES.SheetAgent`

Define all keys in `lang/en.json`. Never use `format()` with user-supplied values — only use it
with developer-controlled substitution keys.

## Vite Build Configuration

### Output Format

The build must produce a single ES module file that Foundry can load. Do not use library mode
(`build.lib`) for a system — it wraps output in ways that conflict with Foundry's script loader.
Use `rollupOptions` directly:

```typescript
rollupOptions: {
  input: "src/init.ts",
  output: {
    dir: "../dist",     // relative to root, or absolute
    entryFileNames: "inspectres.js",
    format: "es",
  },
},
```

### No Code Splitting

Foundry loads the system as a single `<script type="module">`. Do not enable code splitting or
dynamic `import()` at the module top level — Foundry's server may not serve the additional chunks
under the expected path. Keep the output as a single file.

### Asset Handling

Do not use Vite's built-in asset pipeline (`import imgUrl from "./foo.png"`) for game assets.
Foundry serves assets from its own file browser under `systems/inspectres/`. Reference assets with
path strings relative to the data root:

```typescript
// Bad — Vite hashes the filename; Foundry can't find it
import logoUrl from "./assets/logo.png";

// Good — path stable and served by Foundry directly
const logoUrl = "systems/inspectres/assets/logo.png";
```

Static assets (images, fonts) go in a directory excluded from Vite processing and copied verbatim
to `dist/`. CSS and Handlebars templates are handled the same way.

### `base: ""`

Always set `base: ""` in vite config. Foundry loads the system from a URL like
`/systems/inspectres/inspectres.js` — a non-empty base would prepend an incorrect path to all
internal references.

### Build Target

Target `esnext` to match Foundry's minimum supported browser (current Electron + modern Chrome):

```typescript
build: {
  target: "esnext",
}
```

Do not add polyfills or the legacy plugin — Foundry enforces its own minimum browser version.

### Sourcemaps

Enable sourcemaps in development, disable in production. The split is already handled by
`vite.config.ts` (dev) vs `vite.config.prod.ts` (prod). Do not set `sourcemap` in both configs to
the same value — keep prod config as the override:

```typescript
// vite.config.prod.ts
export default defineConfig({
  ...baseConfig,
  build: { ...baseConfig.build, sourcemap: false, minify: true },
});
```

### Copy Plugin vs Rollup Assets

For static Foundry files (`system.json`, `template.json`, `lang/*.json`, `*.hbs`, `*.css`), emit
them via the Rollup `generateBundle` hook (as the existing plugin does) rather than using
`vite-plugin-static-copy`. Fewer dependencies is better; the existing approach is sufficient.

Avoid `fs.readdirSync` + `forEach` in the plugin — use `for...of` per the TypeScript rules, and
avoid nested `forEach` callbacks that suppress errors.

## tsconfig Correctness

The current tsconfig is missing `"verbatimModuleSyntax": true` (required by the TypeScript rules).
Add it. Combined with `"isolatedModules": true` it ensures type-only imports are stripped correctly
and prevents accidental value imports from type-only paths.

`allowImportingTsExtensions: true` requires `noEmit: true` (set) — do not remove either.
`moduleResolution: "bundler"` is correct for Vite; do not change to `node16`.

## Anti-Patterns

| Never do this | Do this instead |
|---------------|-----------------|
| Top-level code touching `game`, `CONFIG`, `Hooks`, `ui` | Wrap in `Hooks.once("init", ...)` |
| Unprefixed CSS classes or element IDs | Prefix everything with `inspectres` |
| Hard-coded English strings in TS or HBS | `game.i18n.localize("INSPECTRES.Key")` |
| `actor.data.system.field = value` direct write | `actor.update({ "system.field": value })` |
| Dynamic `import()` in system code | Static imports only; single output bundle |
| Vite asset imports for game images/fonts | Path strings under `systems/inspectres/` |
| `import type` on Foundry class constructors used as values | Regular `import` |
| `forEach` in vite plugin file-walking code | `for...of` |
| Sheet labels as raw strings | Localization keys |
| `template.json` as the schema documentation | TypeScript `DataModel` classes |
| `unknown` to work around missing fvtt-types types | Add the type to `src/types/foundry-v2.d.ts` |
| `renderDialog` hook for V2 dialogs (`<dialog>` element) | `renderDialogV2` hook |
| New sheet extending `ActorSheet` / `ItemSheet` (V1, deprecated V13) | `ActorSheetV2` / `ItemSheetV2` |
| `Dialog.wait()` / `new Dialog()` (V1, deprecated V13) | `foundry.applications.api.DialogV2.wait()` |
| `extends Application` for new UI apps (V1, deprecated V13) | `foundry.applications.api.ApplicationV2` |
| `getData()` in new V2 sheets | `_prepareContext()` |
| `activateListeners(html: JQuery)` in new V2 sheets | `_onRender()` + `DEFAULT_OPTIONS.actions` |
