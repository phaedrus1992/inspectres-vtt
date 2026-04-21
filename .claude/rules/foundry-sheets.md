---
paths:
  - "foundry/**/*.ts"
  - "foundry/**/*.hbs"
  - "foundry/**/*.css"
---

# Foundry VTT Sheet Development

Patterns for building Actor and Item sheets. Companion to `foundry-api.md` and `foundry-vite.md`.

## Choosing Application Version

**ApplicationV1** (`ActorSheet`, `ItemSheet`): stable, widely documented, required for most
system-level sheets today. Use for all current InSpectres sheets.

**ApplicationV2** (`ActorSheetV2`, `DocumentSheetV2`): newer API, cleaner TypeScript, but less
community tooling. Consider for new sheets once fvtt-types v13 types stabilize.

When in doubt, use ApplicationV1.

## ActorSheet Pattern

```typescript
export class AgentSheet extends ActorSheet {
  static override get defaultOptions(): ActorSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["inspectres", "sheet", "actor", "agent"],
      template: "systems/inspectres/templates/actors/agent-sheet.hbs",
      width: 680,
      height: 520,
      tabs: [{
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-body",
        initial: "stats",
      }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }],
    });
  }

  override getData(): ActorSheet.Data & { systemData: AgentData; enrichedBio: string } {
    const base = super.getData();
    return {
      ...base,
      systemData: this.actor.system as AgentData,
      // Pre-enrich HTML fields so templates receive safe HTML, not raw markdown
      enrichedBio: "",  // await TextEditor.enrichHTML(this.actor.system.bio, { async: false })
    };
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);
    if (!this.isEditable) return;

    // Use event delegation on the html root, not document.body
    html.find("[data-action='roll-dice']").on("click", this.#onRollDice.bind(this));
    html.find("[data-action='item-create']").on("click", this.#onItemCreate.bind(this));
    html.find("[data-action='item-delete']").on("click", this.#onItemDelete.bind(this));
    html.find("[data-action='item-edit']").on("click", this.#onItemEdit.bind(this));
  }

  async #onRollDice(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const rollType = target.dataset["rollType"] ?? "";
    // ... roll logic
  }

  async #onItemCreate(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("INSPECTRES.NewItem"),
      type: "ability",
    }]);
  }

  async #onItemDelete(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const itemId = target.closest("[data-item-id]")?.dataset["itemId"];
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    await item?.delete();
  }

  async #onItemEdit(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const itemId = target.closest("[data-item-id]")?.dataset["itemId"];
    if (!itemId) return;
    this.actor.items.get(itemId)?.sheet?.render(true);
  }

  // Drag and drop support
  override _canDragStart(_selector: string): boolean {
    return this.isEditable;
  }

  override _onDragStart(event: DragEvent): void {
    const target = event.currentTarget as HTMLElement;
    const itemId = target.dataset["itemId"];
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    event.dataTransfer?.setData("text/plain", JSON.stringify(item?.toDragData()));
  }
}
```

## ItemSheet Pattern

```typescript
export class AbilitySheet extends ItemSheet {
  static override get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["inspectres", "sheet", "item", "ability"],
      template: "systems/inspectres/templates/items/ability-sheet.hbs",
      width: 520,
      height: 380,
    });
  }

  override getData(): ItemSheet.Data & { systemData: AbilityData } {
    const base = super.getData();
    return {
      ...base,
      systemData: this.item.system as AbilityData,
    };
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);
    if (!this.isEditable) return;
    // handlers
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

```typescript
// Simple confirmation
const confirmed = await Dialog.confirm({
  title: game.i18n.localize("INSPECTRES.DeleteTitle"),
  content: `<p>${game.i18n.localize("INSPECTRES.DeleteConfirm")}</p>`,
});
if (!confirmed) return;

// Custom dialog with form
const result = await new Promise<number | null>((resolve) => {
  new Dialog({
    title: game.i18n.localize("INSPECTRES.DicePool"),
    content: `<form>
      <label>${game.i18n.localize("INSPECTRES.DiceCount")}</label>
      <input type="number" name="count" value="2" min="1" max="6">
    </form>`,
    buttons: {
      roll: {
        icon: '<i class="fas fa-dice-d6"></i>',
        label: game.i18n.localize("INSPECTRES.Roll"),
        callback: (html: JQuery) => {
          resolve(Number((html.find('[name="count"]').val())));
        },
      },
      cancel: {
        label: game.i18n.localize("INSPECTRES.Cancel"),
        callback: () => resolve(null),
      },
    },
    default: "roll",
  }).render(true);
});
```

## Anti-Patterns

| Never do this | Do this instead |
|---------------|-----------------|
| Return `this.actor` from `getData()` | Spread `super.getData()`, pass `system` separately |
| `html.find(".roll").click(...)` | Use `data-action` + event delegation |
| Hard-coded strings in templates | `{{localize "INSPECTRES.Key"}}` |
| `document.querySelector` in sheets | `html.find(selector)` (scoped to sheet) |
| CSS without `.inspectres` root selector | Nest under `.inspectres.sheet { ... }` |
| Hardcoded pixel colors | `var(--color-border-light-primary)` |
| `new Dialog(...)` without `render(true)` | Always call `.render(true)` to display |
| Registering sheets outside `init` hook | Always register in `Hooks.once("init", ...)` |
