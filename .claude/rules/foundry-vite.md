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
pre-computed values from `getData()`, not raw document data. Name helper functions with the system
prefix: `Handlebars.registerHelper("inspectres-pluralize", ...)`.

## Actor and Item Sheets

Extend `ActorSheet` / `ItemSheet` (or their Application v2 equivalents). Override `getData()` to
return a plain object — do not return the document itself as template data, as Foundry proxies can
cause serialization issues:

```typescript
class AgentSheet extends ActorSheet {
  override getData(): ActorSheetData & { systemData: AgentData } {
    const base = super.getData();
    return {
      ...base,
      systemData: this.actor.system as AgentData,
    };
  }
}
```

Register sheets in `init`, not at module top-level:

```typescript
Hooks.once("init", function () {
  Actors.registerSheet("inspectres", AgentSheet, {
    types: ["agent"],
    makeDefault: true,
    label: "INSPECTRES.SheetAgent",
  });
});
```

Sheet labels must be localization keys, not raw strings.

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
