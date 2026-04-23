---
paths:
  - "foundry/**/*.ts"
  - "foundry/**/*.hbs"
---

# Foundry v12 API

See `foundry-vite.md`, `typescript.md`.

## Documents

World: `Actor`, `Item`, `ChatMessage`, `Combat`, `JournalEntry`, `Macro`, `Playlist`, `RollTable`, `Scene`, `Setting`, `User`, `Folder`, `Cards`

Embedded: `ActiveEffect`, `Combatant`, `Token`, `AmbientLight`, `AmbientSound`, `Drawing`, `MeasuredTemplate`, `Note`, `Tile`, `Wall`

Use `createEmbeddedDocuments` / `updateEmbeddedDocuments` / `deleteEmbeddedDocuments` on parent. Never mutate arrays directly.

## DataModel

### TypeDataModel

```typescript
import { fields } from "@league-of-foundry-developers/foundry-vtt-types/...";

class AgentDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema(): foundry.data.fields.DataSchema {
    const { NumberField, StringField, BooleanField, SchemaField, ArrayField } = foundry.data.fields;
    return {
      franchise: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      stress:    new NumberField({ required: true, integer: true, min: 0, max: 6, initial: 0 }),
      specialty: new StringField({ required: true, initial: "" }),
      cooldowns: new ArrayField(new StringField()),
    };
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    // Computed fields — not stored in DB
  }
}
```

Use `TypeDataModel` for Actor/Item type data. `DataModel` for lower-level schema objects.

Data prep order:
1. `prepareBaseData()` — before embedded & effects
2. `applyActiveEffects()` — effect transforms
3. `prepareDerivedData()` — after effects

Override in both document class AND DataModel. DataModel version runs first.

### Fields

| Field | Use |
|-------|-----|
| `StringField` | Text/identifiers |
| `NumberField` | Numbers, `min`/`max`/`integer`/`positive` |
| `BooleanField` | Flags |
| `SchemaField` | Nested object |
| `ArrayField` | Homogeneous array |
| `SetField` | Unique values |
| `ObjectField` | Untyped (avoid) |
| `HTMLField` | Rich text |
| `FilePathField` | Media paths |
| `ForeignDocumentField` | Cross-doc ref |
| `EmbeddedDocumentField` | Single embed |
| `EmbeddedCollectionField` | Collection |

### Registration

```typescript
// system.json
{
  "documentTypes": {
    "Actor": { "agent": {}, "franchise": {} },
    "Item": { "ability": {}, "gear": {} }
  }
}

// init hook
Hooks.once("init", () => {
  CONFIG.Actor.dataModels = { agent: AgentDataModel, franchise: FranchiseDataModel };
  CONFIG.Item.dataModels  = { ability: AbilityDataModel, gear: GearDataModel };
});
```

### Migration

```typescript
static migrateData(source: Record<string, unknown>): Record<string, unknown> {
  // Rename field
  if ("oldField" in source) {
    source["newField"] = source["oldField"];
    delete source["oldField"];
  }
  return super.migrateData(source);
}
```

## Actor & Item

### System data

Never write directly: `actor.system.field = val` bypasses validation.

Use update:
```typescript
await actor.update({ "system.franchise": 3 });
```

### Typed access

```typescript
const data = actor.system as AgentDataModel;
const stress = data.stress;
```

### Lifecycle

```typescript
class SystemActor extends Actor {
  override async _preCreate(
    data: PreDocumentId<foundry.data.ActorData>,
    options: DocumentModificationContext,
    user: User,
  ): Promise<boolean | void> {
    await super._preCreate(data, options, user);
    // set defaults before creation
  }

  override _onUpdate(
    changed: DeepPartial<foundry.data.ActorData>,
    options: DocumentModificationContext,
    userId: string,
  ): void {
    super._onUpdate(changed, options, userId);
    // react to changes on all clients
  }
}
```

Return `false` from `_pre*` to cancel.

### Rolls

Override `getRollData()` to expose system data to formulas.

## Hooks

### Lifecycle

- `init`: Register classes, sheets, CONFIG
- `setup`: Post-init, pre-ready module interaction
- `ready`: Access world data + UI

### Intercept

Return `false` from `Hooks.call` handler to cancel. `Hooks.callAll` ignores return values.

Remove listeners on close to prevent leaks:
```typescript
const id = Hooks.on("updateActor", handler);
Hooks.off("updateActor", id);  // on close
```

## Rolls

### Evaluate

Async required before accessing results. Access: `roll.total`, `roll.dice`, `roll.result`.

### Inline rolls

Use `roll.render()` for HTML table.

### Modes

Respect `game.settings.get("core", "rollMode")` via `ChatMessage.applyRollMode()`.

## Messages

Simple: `await ChatMessage.create({ content: "...", speaker: ... })`

Whisper: `whisper: ChatMessage.getWhisperRecipients("GM")`

## Flags

Optional module-specific data (not schema core):

Use `system.*` for indexed/queryable. Use `flags.*` for optional.

## Settings

Register in `init`, use any time after:

```typescript
Hooks.once("init", () => {
  game.settings.register("inspectres", "settingKey", {
    name: "INSPECTRES.SettingName",
    hint: "INSPECTRES.SettingHint",
    scope: "world",   // "world" (GM) or "client" (per-user)
    config: true,     // show in settings UI
    type: Number,
    default: 0,
    onChange: (value) => { /* react */ },
  });
});

// Read
const value = game.settings.get("inspectres", "settingKey");
// Write
await game.settings.set("inspectres", "settingKey", newValue);
```

## Compendium Packs

```typescript
// Get a pack
const pack = game.packs.get("inspectres.abilities");
await pack.getDocuments();

// Import from compendium
const doc = await pack.getDocument(id);
await doc.clone({}, { save: true });
```

## ActiveEffects

Effects modify actor/item fields automatically. Each effect has a `changes` array:

```typescript
await ActiveEffect.create({
  name: "Burning",
  img: "icons/fire.svg",
  changes: [{
    key: "system.health.value",
    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
    value: "-1",
  }],
  duration: { rounds: 3 },
  origin: item.uuid,
  transfer: true,          // apply to actor when item is owned
  statuses: ["burning"],
}, { parent: actor });
```

Change modes: `ADD`, `MULTIPLY`, `OVERRIDE`, `UPGRADE`, `DOWNGRADE`, `CUSTOM`.

Override `isSuppressed` in your DataModel to gate effect eligibility system-wide.

Create from a status definition: `ActiveEffect.fromStatusEffect(statusId)`.

## Combat and Initiative

```typescript
// Get active combat
const combat = game.combats.active;

// Navigate turns
await combat.nextTurn();
await combat.nextRound();

// Roll initiative for specific combatants
await combat.rollInitiative([combatant.id]);
await combat.rollNPC();
await combat.rollAll();
await combat.setInitiative(combatant.id, 15);

// Find combatants
const cs = combat.getCombatantsByActor(actor);

// Custom initiative formula — override in your Actor or system CONFIG
CONFIG.Combat.initiative = { formula: "1d6 + @franchise", decimals: 0 };
```

Override `_onStartTurn(combatant)` / `_onEndTurn(combatant)` on your Combat subclass to trigger per-turn effects (stress, duration tracking, etc.). These only execute on one GM client.

## foundry.utils

```typescript
// Deep merge (preferred over spread for Foundry option objects)
const opts = foundry.utils.mergeObject(super.defaultOptions, { width: 680 });

// Dot-notation property access/set
foundry.utils.getProperty(actor, "system.resources.health.value"); // → number
foundry.utils.setProperty(data, "system.franchise", 3);            // → true if changed
foundry.utils.hasProperty(obj, "system.stress");                   // → boolean

// Flatten/expand for update paths
foundry.utils.flattenObject({ system: { franchise: 3 } }); // → {"system.franchise": 3}

// Deep clone before mutation
const copy = foundry.utils.deepClone(actor.system);

// Debounce expensive operations
const save = foundry.utils.debounce(this._save.bind(this), 300);

// Random IDs
const id = foundry.utils.randomID(); // 16-char alphanumeric

// Version comparison
if (foundry.utils.isNewerVersion(game.version, "12.0")) { ... }
```

## TextEditor

Always `await` `enrichHTML` — it resolves `@UUID` links and inline rolls asynchronously.
Make `getData()` async when enriching:

```typescript
override async getData(): Promise<SheetData> {
  const base = await super.getData();
  return {
    ...base,
    enrichedDescription: await TextEditor.enrichHTML(
      this.item.system.description ?? "",
      { async: true, rollData: this.item.getRollData(), relativeTo: this.item },
    ),
  };
}
```

Other utilities:
- `TextEditor.previewHTML(html, 150)` — plain text preview truncated to N chars
- `TextEditor.truncateHTML(html)` — remove non-paragraph elements
- `TextEditor.decodeHTML(str)` — decode HTML entities safely

## Settings

Register in `init`: `scope: "world"` (GM) or `"client"` (per-user).

Read: `game.settings.get()`, Write: `game.settings.set()`.

## Notifications

Always use `ui.notifications?.info()` — may be null early.

## Compendium

Get: `game.packs.get()`, index: `pack.getIndex()`, import: `pack.importDocument()`.

## Token

Active tokens: `actor.getActiveTokens(true)` (linked only). Properties: `isLinked`, `baseActor`. Update: `token.update()`. Combat: `toggleCombatant()`.

## RollTable

Get: `game.tables.getName()`, draw: `table.draw()`, many: `table.drawMany()`, reset: `table.resetResults()`.

## Gotchas

| Gotcha | Fix |
|--------|-----|
| `actor.system.field = val` | `await actor.update({ "system.field": val })` |
| `Hooks.on` one-time | Use `Hooks.once` |
| `Roll.evaluate()` no await | Always await |
| `game.*` at parse time | Wrap in `Hooks.once("init", ...)` |
| Forget `super._onUpdate()` | Always call super |
| `ui.notifications.info()` | Use `ui.notifications?.info()` |
| `Roll.total` before eval | Total only after `await evaluate()` |
| Combat hooks every client | `_onStartTurn` = GM client only |
| `mergeObject` mutates | Pass `{inplace: false}` |
