---
paths:
  - "foundry/**/*.ts"
  - "foundry/**/*.hbs"
  - "foundry/**/*.css"
---

# Foundry Sheets

Actor + Item sheet patterns. Companion to `foundry-api.md` and `foundry-vite.md`.

## ApplicationV2 (V13+)

Use `ActorSheetV2` / `ItemSheetV2`. V1 `ActorSheet` / `ItemSheet` deprecated V13, removed V15. No new V1.

## ActorSheetV2

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
    // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md.
    return { ...base, system: this.actor.system as unknown as AgentData };
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

## ItemSheetV2

```typescript
export class AbilitySheet extends foundry.applications.sheets.ItemSheetV2 {
  static override DEFAULT_OPTIONS = {
    classes: ["inspectres", "sheet", "item", "ability"],
    position: { width: 520, height: 380 },
  };
  static override PARTS = {
    sheet: { template: "systems/inspectres/templates/items/ability-sheet.hbs" },
  };
  override async _prepareContext(_options): Promise<Record<string, unknown>> {
    const base = await super._prepareContext(_options);
    return { ...base, system: this.item.system as AbilityData };
  }
}
```

## Registration

Register in `init`:
```typescript
Hooks.once("init", () => {
  Actors.registerSheet("inspectres", AgentSheet, {
    types: ["agent"],
    makeDefault: true,
    label: "INSPECTRES.SheetAgent",
  });
  Items.registerSheet("inspectres", AbilitySheet, {
    types: ["ability"],
    makeDefault: true,
    label: "INSPECTRES.SheetAbility",
  });
});
```

## Context Preparation

Pre-compute in `_prepareContext()` / `getData()`:
- Sort arrays
- Compute derived values
- Format numbers
- Pre-enrich HTML fields
- Use `this.isEditable` for edit-only UI

```typescript
override async _prepareContext(_options): Promise<Record<string, unknown>> {
  const base = await super._prepareContext(_options);
  const system = this.actor.system as unknown as AgentData;
  const abilities = this.actor.items
    .filter(i => i.type === "ability")
    .sort((a, b) => a.name.localeCompare(b.name));
  return { ...base, system, abilities };
}
```

## Handlebars

- `name="system.field"` auto-binds via form update
- `data-action="..."` for delegation (not classes)
- `data-item-id="{{item.id}}"` for item rows
- `autocomplete="off"` on forms (prevent browser autofill)
- All text via `{{localize "KEY"}}`

## CSS

Nest under system prefix. Use Foundry CSS vars (`--color-*`, `--font-*`), never hardcode colors:
```css
.inspectres.sheet {
  .sheet-header { display: flex; }
  .tab { display: none; }
  .tab.active { display: block; }
}
```

## Dialogs

Use `DialogV2` (V1 deprecated V13):
```typescript
const confirmed = await foundry.applications.api.DialogV2.confirm({
  window: { title: game.i18n.localize("KEY") },
  content: `<p>Message</p>`,
});
if (!confirmed) return;

const result = await foundry.applications.api.DialogV2.wait({
  window: { title: game.i18n.localize("KEY") },
  content: `<form><input type="number" name="count"></form>`,
  buttons: [
    {
      action: "roll",
      label: game.i18n.localize("KEY"),
      callback: (_event, _button, dialog) => {
        const form = dialog.querySelector("form") as HTMLFormElement;
        return Number(new FormData(form).get("count"));
      },
    },
  ],
});
if (!result) return;
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
