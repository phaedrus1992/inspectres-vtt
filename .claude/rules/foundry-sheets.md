---
paths:
  - "foundry/**/*.ts"
  - "foundry/**/*.hbs"
  - "foundry/**/*.css"
---

# Foundry VTT Sheet Development

Patterns for building Actor and Item sheets. Companion to `foundry-api.md` and `foundry-vite.md`.

## Application Version

All InSpectres sheets use **ApplicationV2** (`ActorSheetV2` / `ItemSheetV2`), targeting Foundry V13+.
Do not write new sheets extending V1 `ActorSheet` / `ItemSheet` — those are deprecated in V13 and removed in V15.

## ActorSheetV2 Pattern

```typescript
export class AgentSheet extends foundry.applications.sheets.ActorSheetV2 {
  static override DEFAULT_OPTIONS = {
    classes: ["inspectres", "sheet", "actor", "agent"],
    position: { width: 680, height: 520 },
    actions: {
      rollDice: AgentSheet.onRollDice,
      editItem: AgentSheet.onEditItem,
      deleteItem: AgentSheet.onDeleteItem,
    },
  };

  static override PARTS = {
    sheet: { template: "systems/inspectres/templates/actors/agent-sheet.hbs" },
  };

  override async _prepareContext(_options: foundry.applications.api.ApplicationV2Options): Promise<Record<string, unknown>> {
    const base = await super._prepareContext(_options);
    return { ...base, system: this.actor.system as AgentData };
  }

  override async _onRender(context: Record<string, unknown>, options: foundry.applications.api.ApplicationV2Options): Promise<void> {
    await super._onRender(context, options);
    // Attach listeners not covered by DEFAULT_OPTIONS.actions (e.g. change events)
    this.element.querySelectorAll<HTMLInputElement>("[data-some-input]").forEach((el) => {
      el.addEventListener("change", (event) => { /* handler */ });
    });
  }

  // Static action handlers — Foundry binds `this` to the sheet instance
  static async onRollDice(this: AgentSheet, _event: Event, target: HTMLElement): Promise<void> {
    const rollType = target.dataset["rollType"] ?? "";
    // ... roll logic
  }

  static async onEditItem(this: AgentSheet, _event: Event, target: HTMLElement): Promise<void> {
    const itemId = target.closest<HTMLElement>("[data-item-id]")?.dataset["itemId"];
    if (!itemId) return;
    this.actor.items.get(itemId)?.sheet?.render({ force: true });
  }

  static async onDeleteItem(this: AgentSheet, _event: Event, target: HTMLElement): Promise<void> {
    const itemId = target.closest<HTMLElement>("[data-item-id]")?.dataset["itemId"];
    if (!itemId) return;
    await this.actor.items.get(itemId)?.delete();
  }
}
```

## ItemSheetV2 Pattern

```typescript
export class AbilitySheet extends foundry.applications.sheets.ItemSheetV2 {
  static override DEFAULT_OPTIONS = {
    classes: ["inspectres", "sheet", "item", "ability"],
    position: { width: 520, height: 380 },
  };

  static override PARTS = {
    sheet: { template: "systems/inspectres/templates/items/ability-sheet.hbs" },
  };

  override async _prepareContext(_options: foundry.applications.api.ApplicationV2Options): Promise<Record<string, unknown>> {
    const base = await super._prepareContext(_options);
    return { ...base, system: this.item.system as AbilityData };
  }
}
```

## Registration

Register all sheets in the `init` hook:

```typescript
Hooks.once("init", () => {
  Actors.registerSheet("inspectres", AgentSheet, {
    types: ["agent"],
    makeDefault: true,
    label: "INSPECTRES.SheetAgent",
  });
  Actors.registerSheet("inspectres", FranchiseSheet, {
    types: ["franchise"],
    makeDefault: true,
    label: "INSPECTRES.SheetFranchise",
  });
  Items.registerSheet("inspectres", AbilitySheet, {
    types: ["ability"],
    makeDefault: true,
    label: "INSPECTRES.SheetAbility",
  });
});
```

## getData() Rules

- Always call `super.getData()` and spread it
- Never return the document itself — pass pre-computed values
- Pre-process: sort arrays, compute derived display values, format numbers
- Pre-enrich HTML fields with `TextEditor.enrichHTML` before passing to template
- `this.isEditable` is already in `super.getData()` — use it to gate edit-only UI

```typescript
getData() {
  const base = super.getData();
  const system = this.actor.system as AgentData;

  // Pre-sort items by type for template convenience
  const abilities = this.actor.items
    .filter(i => i.type === "ability")
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ...base,
    systemData: system,
    abilities,
    stressArray: Array.from({ length: 6 }, (_, i) => i < system.stress),
  };
}
```

## Handlebars Template Conventions

Templates receive the object returned by `getData()`. Access fields with dot notation.

```handlebars
{{!-- agent-sheet.hbs --}}
<form class="inspectres inspectres-sheet inspectres-agent-sheet" autocomplete="off">
  <header class="sheet-header">
    <img class="profile-img" src="{{actor.img}}" data-action="edit-image" title="{{actor.name}}">
    <div class="header-fields">
      <h1><input type="text" name="name" value="{{actor.name}}" placeholder="Name"></h1>
      <div class="franchise-dice">
        <label>{{localize "INSPECTRES.Franchise"}}</label>
        <input type="number" name="system.franchise" value="{{systemData.franchise}}" min="0">
      </div>
    </div>
  </header>

  <nav class="sheet-tabs tabs" data-group="primary">
    <a class="item" data-tab="stats">{{localize "INSPECTRES.TabStats"}}</a>
    <a class="item" data-tab="abilities">{{localize "INSPECTRES.TabAbilities"}}</a>
  </nav>

  <section class="sheet-body">
    <div class="tab" data-tab="stats">
      {{!-- stress track --}}
      {{#each stressArray as |checked index|}}
        <input type="checkbox" name="system.stress" value="{{index}}"
               {{#if checked}}checked{{/if}}>
      {{/each}}
    </div>

    <div class="tab" data-tab="abilities">
      <button type="button" data-action="item-create">
        {{localize "INSPECTRES.AddAbility"}}
      </button>
      {{#each abilities as |item|}}
        <div class="item" data-item-id="{{item.id}}">
          <span class="item-name">{{item.name}}</span>
          <a data-action="item-edit"><i class="fas fa-edit"></i></a>
          <a data-action="item-delete"><i class="fas fa-trash"></i></a>
        </div>
      {{/each}}
    </div>
  </section>
</form>
```

### Template rules
- Use `name="system.field"` for fields that auto-bind via `_updateObject`
- Use `data-action="..."` attributes for JS event delegation (not `class` hooks)
- Use `data-item-id="{{item.id}}"` on item rows so handlers can find the document
- Always `autocomplete="off"` on `<form>` — browsers try to fill RPG fields with contacts
- All text through `{{localize "KEY"}}` — no hardcoded English

## CSS Structure

Nest all rules under the system prefix to avoid global collisions:

```css
.inspectres.sheet {
  .sheet-header {
    display: flex;
    gap: 0.5rem;

    .profile-img {
      width: 100px;
      height: 100px;
      border: 1px solid var(--color-border-light-primary);
    }
  }

  .sheet-tabs { border-bottom: 1px solid var(--color-border-light-primary); }

  .tab { display: none; }
  .tab.active { display: block; }

  .item-list {
    .item { display: flex; align-items: center; gap: 0.25rem; }
  }
}
```

Use Foundry CSS variables (`--color-*`, `--font-*`) for theme compatibility.
Never hardcode color values — they break dark mode and user themes.

## Dialog Patterns

Use `foundry.applications.api.DialogV2` (V2 API). `Dialog` is deprecated in V13.

```typescript
// Simple confirmation
const confirmed = await foundry.applications.api.DialogV2.confirm({
  window: { title: game.i18n.localize("INSPECTRES.DeleteTitle") },
  content: `<p>${game.i18n.localize("INSPECTRES.DeleteConfirm")}</p>`,
});
if (!confirmed) return;

// Custom dialog with form — buttons is an array, callback receives native HTMLDialogElement
const result = await foundry.applications.api.DialogV2.wait({
  window: { title: game.i18n.localize("INSPECTRES.DicePool") },
  content: `<form>
    <label>${game.i18n.localize("INSPECTRES.DiceCount")}</label>
    <input type="number" name="count" value="2" min="1" max="6">
  </form>`,
  buttons: [
    {
      action: "roll",
      label: game.i18n.localize("INSPECTRES.Roll"),
      default: true,
      callback: (_event, _button, dialog) => {
        const form = dialog.querySelector("form") as HTMLFormElement | null;
        return form ? Number(new FormData(form).get("count")) : null;
      },
    },
    {
      action: "cancel",
      label: game.i18n.localize("INSPECTRES.Cancel"),
      callback: () => null,
    },
  ],
});
if (result === null || result === undefined) return;
```

## Anti-Patterns

| Never do this | Do this instead |
|---------------|-----------------|
| Return `this.actor` from `_prepareContext()` | Spread `super._prepareContext()`, pass `system` separately |
| `getData()` in V2 sheets | `_prepareContext()` |
| `activateListeners(html: JQuery)` in V2 sheets | `_onRender()` + `DEFAULT_OPTIONS.actions` |
| Hard-coded strings in templates | `{{localize "INSPECTRES.Key"}}` |
| `document.querySelector` in sheets | `this.element.querySelector(selector)` (scoped to sheet) |
| CSS without `.inspectres` root selector | Nest under `.inspectres.sheet { ... }` |
| Hardcoded pixel colors | `var(--color-border-light-primary)` |
| `new Dialog(...)` / `Dialog.wait()` (V1, deprecated V13) | `foundry.applications.api.DialogV2.wait()` |
| Registering sheets outside `init` hook | Always register in `Hooks.once("init", ...)` |
| `extends ActorSheet` / `extends ItemSheet` (V1, deprecated V13) | `foundry.applications.sheets.ActorSheetV2` |
