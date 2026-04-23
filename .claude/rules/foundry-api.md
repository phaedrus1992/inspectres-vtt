---
paths:
  - "foundry/**/*.ts"
  - "foundry/**/*.hbs"
---

# Foundry v12 API

Companion to `foundry-vite.md` (build) and `typescript.md` (types).

## Documents

**World-level:** `Actor`, `Item`, `ChatMessage`, `Combat`, `JournalEntry`, `Macro`, `Playlist`, `RollTable`, `Scene`, `Setting`, `User`, `Folder`, `Cards`

**Embedded:** `ActiveEffect` (Actor/Item), `Combatant` (Combat), `Token`, `AmbientLight`, `AmbientSound`, `Drawing`, `MeasuredTemplate`, `Note`, `Tile`, `Wall` (Scene)

Always use `createEmbeddedDocuments` / `updateEmbeddedDocuments` / `deleteEmbeddedDocuments` on parent. Never manipulate arrays directly.

## DataModel

### TypeDataModel for System Data

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

`TypeDataModel` vs `DataModel`: always use `TypeDataModel` for Actor/Item type data.
`DataModel` is for lower-level schema objects not tied to a document type.

### Data preparation order

1. `prepareBaseData()` — before embedded documents and ActiveEffects
2. `applyActiveEffects()` — effect transformations applied
3. `prepareDerivedData()` — after effects; compute derived values here

Override `prepareDerivedData()` in both the document class AND the DataModel class.
The DataModel's version runs first within each step.

### Field types quick reference

| Field | Use for |
|-------|---------|
| `StringField` | Text, identifiers |
| `NumberField` | Numbers (options: `min`, `max`, `integer`, `positive`) |
| `BooleanField` | True/false flags |
| `SchemaField({...})` | Nested object with typed fields |
| `ArrayField(elementField)` | Homogeneous array |
| `SetField(elementField)` | Unique-value set |
| `ObjectField` | Untyped free-form object (avoid when possible) |
| `HTMLField` | Rich text / HTML content |
| `FilePathField` | Image/audio/video paths |
| `ForeignDocumentField` | Reference to another document |
| `EmbeddedDocumentField` | Single embedded document |
| `EmbeddedCollectionField` | Collection of embedded documents |

### Registration pattern

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

### Migrations

Use `static migrateData(source)` for schema version changes:

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

## Actor and Item

### Never write directly to system fields

```typescript
// Bad — bypasses validation and won't persist
actor.system.franchise = 3;

// Good
await actor.update({ "system.franchise": 3 });

// Good — for multiple fields
await actor.update({
  "system.franchise": 3,
  "system.stress": 1,
});
```

### Accessing system data (typed)

```typescript
// Cast through your DataModel type
const data = actor.system as AgentDataModel;
const stress = data.stress;
```

### Lifecycle hooks (call super)

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

Return `false` from `_preCreate` / `_preUpdate` / `_preDelete` to cancel the operation.

### Roll data

Override `getRollData()` to expose system data to dice formulas:

```typescript
override getRollData(): Record<string, unknown> {
  const base = super.getRollData();
  return { ...base, ...this.system };
}
```

## Hooks

### System lifecycle

```typescript
// Register document classes, sheets, data models, CONFIG, settings
Hooks.once("init", () => { ... });

// Interact with other modules/systems (post-init, pre-ready)
Hooks.once("setup", () => { ... });

// Access game world data, UI elements
Hooks.once("ready", () => { ... });
```

### Intercept and cancel

Any handler registered via `Hooks.call` that returns `false` stops execution and cancels the action:

```typescript
Hooks.on("preCreateActor", (actor, data, options, userId) => {
  if (someCondition) return false; // cancel creation
});
```

`Hooks.callAll` ignores return values — use when you want all handlers to always run.

### Remove listeners

```typescript
const id = Hooks.on("updateActor", handler);
// later:
Hooks.off("updateActor", id);
```

Always remove listeners registered on document-level hooks when the document/sheet is closed,
to prevent memory leaks and duplicate handler accumulation.

## Rolls and Dice

### Basic evaluation

```typescript
// Async evaluate (required before accessing results)
const roll = await new Roll("2d6 + @franchise", rollData).evaluate();

// Access results
roll.total;          // number
roll.dice;           // DiceTerm[]
roll.result;         // formula string with values

// Create chat message with roll
await roll.toMessage({
  speaker: ChatMessage.getSpeaker({ actor }),
  flavor: game.i18n.localize("INSPECTRES.RollFlavor"),
});
```

### Inline rolls in ChatMessage

```typescript
const roll = await new Roll(formula).evaluate();
await ChatMessage.create({
  content: await roll.render(),   // HTML dice table
  rolls: [roll],
  speaker: ChatMessage.getSpeaker({ actor }),
  type: CONST.CHAT_MESSAGE_TYPES.ROLL,
});
```

### Roll modes

Respect the user's preferred roll mode:

```typescript
const rollMode = game.settings.get("core", "rollMode");
const messageData = ChatMessage.applyRollMode({}, rollMode);
await ChatMessage.create({ ...messageData, rolls: [roll], content: ... });
```

## Chat Messages

```typescript
// Simple
await ChatMessage.create({
  content: `<p>${game.i18n.localize("INSPECTRES.SomeMessage")}</p>`,
  speaker: ChatMessage.getSpeaker({ actor }),
});

// Whisper to GM
await ChatMessage.create({
  content: "Private info",
  whisper: ChatMessage.getWhisperRecipients("GM"),
});
```

## Flags

Use flags for optional, module/system-specific data that isn't part of the core schema:

```typescript
// Store
await actor.setFlag("inspectres", "someKey", value);

// Read
const value = actor.getFlag("inspectres", "someKey");

// Remove
await actor.unsetFlag("inspectres", "someKey");
```

Use `system.*` data (DataModel) for data that must be indexed, queried, or validated.
Use `flags.*` for optional extension data.

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

```typescript
Hooks.once("init", () => {
  game.settings.register("inspectres", "myKey", {
    name: "INSPECTRES.SettingName",
    hint: "INSPECTRES.SettingHint",
    scope: "world",          // "world" = GM-controlled; "client" = per-user
    config: true,
    type: Number,
    default: 0,
    choices: { 0: "Low", 1: "High" },   // renders as <select>
    requiresReload: false,
    onChange: (value) => { /* react immediately */ },
  });
});

const val = game.settings.get("inspectres", "myKey");
await game.settings.set("inspectres", "myKey", newValue);
```

## Notifications

```typescript
// Always use localization keys; always use ?. (may be null during early init)
ui.notifications?.info(game.i18n.localize("INSPECTRES.SomeInfo"));
ui.notifications?.warn(game.i18n.localize("INSPECTRES.SomeWarning"));
ui.notifications?.error(game.i18n.localize("INSPECTRES.SomeError"));

// Remove a specific notification
const id = ui.notifications?.info("Loading...");
ui.notifications?.remove(id);
```

## Compendium Packs

```typescript
const pack = game.packs.get("inspectres.abilities"); // "system.packname"
const docs  = await pack.getDocuments();
const weapons = await pack.getDocuments({ type: "weapon" });
const doc   = await pack.getDocument(id);

// Lightweight index (no full data load)
const index = await pack.getIndex({ fields: ["name", "img", "system.type"] });
for (const entry of index) { /* entry.name, entry.img */ }

// Import into world
await pack.importDocument(doc);
```

## TokenDocument

```typescript
// Tokens for an actor
const tokens = actor.getActiveTokens(true); // true = linked only

// Linked vs synthetic
token.isLinked;    // true = shares actor data; false = independent copy
token.actor;       // synthetic or linked Actor
token.baseActor;   // always the world-level Actor

// Update token appearance
await token.update({ img: "path/to/img.png" });

// Toggle into combat
await token.toggleCombatant();

// Status effect check
token.hasStatusEffect("dead");
token.inCombat;
```

## RollTable

```typescript
const table = game.tables.getName("Weird Occurrences");

// Draw one result (posts to chat by default)
const { roll, results } = await table.draw();

// Draw without chat
const { roll, results } = await table.draw({ displayChat: false });

// Draw multiple
const { roll, results } = await table.drawMany(3);

// Reset all drawn items
await table.resetResults();
```

## Common Gotchas

| Gotcha | Correct pattern |
|--------|-----------------|
| `actor.system.field = value` | `await actor.update({ "system.field": value })` |
| Returning document instance from `getData()` | Return plain object: `{ ...super.getData(), systemData: this.actor.system }` |
| `Hooks.on` for one-time setup | `Hooks.once` |
| `Roll.evaluate()` without `await` | Always `await new Roll(formula).evaluate()` |
| Accessing `game.*` at module parse time | Wrap in `Hooks.once("init", ...)` |
| Forgetting `super._onUpdate()` etc. | Always call `super` in lifecycle overrides |
| Hardcoded actor/item types as strings | Define as string enum constants |
| `TextEditor.enrichHTML` without `await` | Always `await`; make `getData()` async |
| `ui.notifications.info(...)` | Use `ui.notifications?.info(...)` — may be null early |
| `foundry.utils.mergeObject` mutates first arg | Pass `{inplace: false}` or use it for `defaultOptions` only |
| Roll class URL | `foundry.dice.Roll`, not `client.Roll` |
| `new Roll(...).total` before evaluate | `total` is only defined after `await roll.evaluate()` |
| Combat turn hooks on every client | `_onStartTurn` etc. only execute on one GM client |
