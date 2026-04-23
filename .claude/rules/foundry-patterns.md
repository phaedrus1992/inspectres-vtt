---
paths:
  - "foundry/**/*.ts"
  - "foundry/**/*.hbs"
  - "foundry/**/*.css"
  - "foundry/**/*.scss"
---

# Foundry Patterns

From `reference/dnd5e/`, `reference/pf2e/`. Companion to `foundry-api.md`, `foundry-sheets.md`.

## Custom Elements

Use `AbstractFormInputElement` for interactive widgets (stress, ranks, toggles). Integrates with Foundry form pipeline, not just events.

### Stress Meter Pattern

```typescript
import AbstractFormInputElement = foundry.applications.elements.AbstractFormInputElement;
import AdoptedStyleSheetMixin = foundry.applications.elements.AdoptedStyleSheetMixin;

export class StressMeter extends AdoptedStyleSheetMixin(AbstractFormInputElement<number>) {
  static override tagName = "stress-meter";
  static CSS = `
    :host { display: flex; gap: 4px; }
    .pip { width: 20px; height: 20px; border-radius: 50%;
           border: 2px solid var(--inspectres-primary); cursor: pointer; }
    .pip.filled { background: var(--inspectres-stress-color); }
  `;

  #controller = new AbortController();
  #pips: HTMLElement[] = [];

  protected override _buildElements(): HTMLElement[] {
    this.#pips = Array.from({ length: 6 }, (_, i) => {
      const pip = document.createElement("span");
      pip.className = "pip";
      pip.dataset["index"] = String(i);
      return pip;
    });
    return this.#pips;
  }

  protected override _refresh(): void {
    const current = this.value ?? 0;
    this.#pips.forEach((pip, i) => pip.classList.toggle("filled", i < current));
  }

  protected override _activateListeners(): void {
    const { signal } = this.#controller;
    for (const pip of this.#pips) {
      pip.addEventListener("click", this.#onPipClick.bind(this), { signal });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#controller.abort();
  }

  #onPipClick(event: MouseEvent): void {
    const pip = event.currentTarget as HTMLElement;
    const index = Number(pip.dataset["index"]);
    // Click filled pip = reduce to that level; click empty = set to index+1
    this.value = pip.classList.contains("filled") ? index : index + 1;
    this._refresh();
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

// Register
customElements.define(StressMeter.tagName, StressMeter);
```

### Cyclic value selector (skill ranks, franchise dice)

Pattern from `proficiency-cycle.mjs` — left-click cycles forward, right-click backward:

```typescript
export class SkillRankSelector extends AdoptedStyleSheetMixin(AbstractFormInputElement<number>) {
  static override tagName = "skill-rank";
  readonly #validValues = [0, 1, 2, 3, 4];
  #controller = new AbortController();

  protected override _buildElements(): HTMLElement[] {
    const el = document.createElement("div");
    el.className = "skill-rank-display";
    el.setAttribute("role", "spinbutton");
    el.setAttribute("aria-valuemin", "0");
    el.setAttribute("aria-valuemax", "4");
    return [el];
  }

  protected override _refresh(): void {
    const el = this.querySelector(".skill-rank-display") as HTMLElement;
    if (el) {
      el.dataset["value"] = String(this.value ?? 0);
      el.setAttribute("aria-valuenow", String(this.value ?? 0));
    }
  }

  protected override _activateListeners(): void {
    const { signal } = this.#controller;
    this.addEventListener("click", this.#onStep.bind(this, true), { signal });
    this.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.#onStep(false);
    }, { signal });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#controller.abort();
  }

  #onStep(forward: boolean): void {
    const values = this.#validValues;
    const idx = values.indexOf(this.value ?? 0);
    const next = (idx + (forward ? 1 : -1) + values.length) % values.length;
    this.value = values[next] ?? 0;
    this._refresh();
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
```

### Styles

`AdoptedStyleSheetMixin` auto-caches `static CSS`. Don't manually manage `CSSStyleSheet`.

### Template Usage

```handlebars
<stress-meter name="system.stress" value="{{systemData.stress}}" max="6"></stress-meter>
<skill-rank name="system.skills.investigation" value="{{systemData.skills.investigation}}"></skill-rank>
```

---

## Roll Workflow

Three stages (from dnd5e):

```typescript
export class SkillRoll {
  static async prompt(actor: SystemActor, skillKey: string): Promise<void> {
    // Stage 1: Configure (show dialog, fire pre-roll hooks)
    const config = await SkillRollDialog.prompt(actor, skillKey);
    if (!config) return; // cancelled

    // Stage 2: Evaluate
    const formula = `${config.diceCount}d6`;
    const roll = await new Roll(formula, actor.getRollData()).evaluate();

    // Stage 3: Post to chat
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: game.i18n.format("INSPECTRES.RollFlavor", {
        skill: game.i18n.localize(`INSPECTRES.Skill.${skillKey}`),
      }),
      flags: {
        inspectres: {
          rollType: "skill",
          skill: skillKey,
          outcome: SkillRoll.#getOutcome(roll.total ?? 0),
        },
      },
    }, { rollMode: game.settings.get("core", "rollMode") });
  }

  static #getOutcome(total: number): "bad" | "partial" | "good" {
    if (total <= 2) return "bad";
    if (total <= 4) return "partial";
    return "good";
  }
}
```

### Roll result chat card

Store outcome in `flags.inspectres` so the chat template renders the correct result tier:

```handlebars
{{!-- templates/chat/skill-roll.hbs --}}
<div class="skill-roll-card {{flags.inspectres.outcome}}" data-message-id="{{id}}">
  <header class="card-header">
    <img src="{{actor.img}}" class="actor-portrait" alt="">
    <div class="card-title">
      <h3>{{actor.name}}</h3>
      <span class="skill-label">{{localize (concat "INSPECTRES.Skill." flags.inspectres.skill)}}</span>
    </div>
  </header>
  <div class="card-body">
    <div class="outcome-badge {{flags.inspectres.outcome}}">
      {{localize (concat "INSPECTRES.Outcome." flags.inspectres.outcome)}}
    </div>
    <div class="dice-breakdown">
      {{{tooltip}}}
    </div>
  </div>
</div>
```

---

## parseInputDelta — Resource Inputs

Let users type `+1`, `-2`, or `=4` into numeric resource fields (stress, franchise, skills).
Pattern from dnd5e `utils.mjs`:

```typescript
export function parseInputDelta(
  input: string,
  current: number,
  min: number,
  max: number,
): number | null {
  const match = String(input).match(/^([+\-=])?(\d+)$/);
  if (!match) return null;
  const [, op, raw] = match;
  const amount = parseInt(raw, 10);
  switch (op) {
    case "+": return Math.min(max, current + amount);
    case "-": return Math.max(min, current - amount);
    case "=": return Math.max(min, Math.min(max, amount));
    default:  return Math.max(min, Math.min(max, amount));
  }
}
```

Wire it up in `activateListeners`:

```typescript
html.find("[data-delta-input]").on("change", async (event) => {
  const el = event.currentTarget as HTMLInputElement;
  const fieldPath = el.name;                  // e.g. "system.stress"
  const current = foundry.utils.getProperty(this.actor, fieldPath) as number;
  const min = Number(el.dataset["min"] ?? 0);
  const max = Number(el.dataset["max"] ?? 999);
  const next = parseInputDelta(el.value, current, min, max);
  if (next !== null) await this.actor.update({ [fieldPath]: next });
});
```

---

## DOM Helper

From pf2e `dom.ts` — typed element construction. Avoids direct string manipulation of HTML:

```typescript
export function createHTMLElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    id?: string;
    classes?: string[];
    dataset?: Record<string, string | number | boolean | null | undefined>;
    aria?: Record<string, string>;
    children?: (HTMLElement | string)[];
  } = {},
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (options.id) el.id = options.id;
  if (options.classes?.length) el.classList.add(...options.classes);
  for (const [k, v] of Object.entries(options.dataset ?? {})) {
    if (v == null || v === false) continue;
    el.dataset[k] = v === true ? "" : String(v);
  }
  for (const [k, v] of Object.entries(options.aria ?? {})) {
    el.setAttribute(`aria-${k}`, v);
  }
  for (const child of options.children ?? []) {
    el.appendChild(child instanceof HTMLElement ? child : document.createTextNode(child));
  }
  return el;
}
```

Note: no `innerHTML` option — use `children` with trusted `HTMLElement` values or `textContent`
for text. This avoids XSS when building elements programmatically.

---

## Text Enrichers

Register custom `[[syntax]]` patterns for journal entries and descriptions:

```typescript
Hooks.once("init", () => {
  CONFIG.TextEditor.enrichers.push({
    id: "inspectres-confessional",
    // [[confess Turns out the ghost was actually the client's father]]
    pattern: /\[\[confess (?<effect>[^\]]+)]]/gi,
    enricher: async (match) => {
      const { effect } = match.groups as { effect: string };
      const btn = createHTMLElement("button", {
        classes: ["inspectres-confessional-trigger"],
        dataset: { effect },
      });
      const icon = createHTMLElement("i", { classes: ["fas", "fa-comment-alt"] });
      btn.appendChild(icon);
      btn.appendChild(document.createTextNode(` ${game.i18n.localize("INSPECTRES.Confessional")}`));
      return btn;
    },
  });
});
```

---

## CSS Patterns

### Reset helpers (from dnd5e `forms.less`)

```css
.inspectres {
  /* Input that looks like text — remove all chrome */
  input.uninput {
    border: none;
    box-shadow: none;
    outline: none;
    color: inherit;
    font-weight: inherit;
    height: unset;
    background: transparent;
  }

  /* Fieldset that's invisible to layout */
  fieldset.unfieldset {
    display: contents;
    border: none;
    margin: 0;
    padding: 0;
  }

  /* Button transition */
  button {
    transition: all 250ms ease;

    &:hover:not(:disabled) { box-shadow: 0 0 5px var(--color-shadow-primary); }
    &:disabled { cursor: default; opacity: 0.5; }
  }
}
```

### CSS custom properties for theming

```css
.inspectres {
  /* Brand */
  --inspectres-primary: #1a472a;
  --inspectres-accent:  #c41e3a;
  --inspectres-bg:      #f5e6d3;

  /* Stress progression colors */
  --inspectres-stress-calm:      #e8f5e9;
  --inspectres-stress-uneasy:    #fff9c4;
  --inspectres-stress-shaken:    #ffe0b2;
  --inspectres-stress-terrified: #ffcdd2;

  /* Roll outcome colors */
  --inspectres-outcome-good:    #c8e6c9;
  --inspectres-outcome-partial: #fff9c4;
  --inspectres-outcome-bad:     #ffcdd2;

  /* Franchise dice */
  --inspectres-dice-active:   #1a472a;
  --inspectres-dice-inactive: #e0e0e0;

  /* Component sizing */
  --inspectres-pip-size:  20px;
  --inspectres-rank-size: 22px;
}
```

### Chat card outcome coloring

```css
.inspectres .skill-roll-card {
  border-radius: 4px;
  overflow: hidden;

  &.good    { border-left: 4px solid var(--inspectres-outcome-good); }
  &.partial { border-left: 4px solid var(--inspectres-outcome-partial); }
  &.bad     { border-left: 4px solid var(--inspectres-outcome-bad); }

  .outcome-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: bold;
    font-size: 0.85em;

    &.good    { background: var(--inspectres-outcome-good); }
    &.partial { background: var(--inspectres-outcome-partial); }
    &.bad     { background: var(--inspectres-outcome-bad); }
  }
}
```

---

## Handlebars Helpers to Register

```typescript
Hooks.once("init", () => {
  // Convert JS object to data-* attribute string
  Handlebars.registerHelper("dataset", (obj: Record<string, unknown>) => {
    const parts = Object.entries(obj ?? {}).map(([k, v]) => {
      const attr = k.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (a, b) =>
        (b ? "-" : "") + a.toLowerCase(),
      );
      return `data-${attr}="${Handlebars.escapeExpression(String(v))}"`;
    });
    return new Handlebars.SafeString(parts.join(" "));
  });

  // Concatenate strings (useful for dynamic localization keys)
  Handlebars.registerHelper("concat", (...args: unknown[]) =>
    args.slice(0, -1).join(""),
  );

  // Build a range array: {{#each (range 6)}} iterates 0..5
  Handlebars.registerHelper("range", (n: number) =>
    Array.from({ length: n }, (_, i) => i),
  );
});
```

---

## ApplicationV2 + PARTS (preferred for new sheets)

dnd5e uses `static PARTS` for template composition. Prefer this over ApplicationV1 for new sheets:

```typescript
export class AgentSheet extends foundry.applications.api.ActorSheetV2 {
  static override DEFAULT_OPTIONS = {
    classes: ["inspectres", "sheet", "actor", "agent"],
    position: { width: 700, height: 600 },
    actions: {
      rollSkill:   AgentSheet.#onRollSkill,
      addStress:   AgentSheet.#onAddStress,
      clearStress: AgentSheet.#onClearStress,
      editItem:    AgentSheet.#onEditItem,
      deleteItem:  AgentSheet.#onDeleteItem,
      createItem:  AgentSheet.#onCreateItem,
    },
  };

  static override PARTS = {
    header: {
      template: "systems/inspectres/templates/agent/header.hbs",
    },
    tabs: {
      template: "systems/inspectres/templates/agent/tabs.hbs",
    },
    skills: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/inspectres/templates/agent/tab-skills.hbs",
      scrollable: [""],
    },
    stress: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/inspectres/templates/agent/tab-stress.hbs",
    },
    notes: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/inspectres/templates/agent/tab-notes.hbs",
      scrollable: [""],
    },
  };

  // Static action handlers — Foundry binds `this` to the sheet instance.
  // No memory leak vs calling .bind() in activateListeners.
  static async #onRollSkill(
    this: AgentSheet,
    _event: Event,
    target: HTMLElement,
  ): Promise<void> {
    const skill = target.dataset["skill"] ?? "";
    await SkillRoll.prompt(this.actor, skill);
  }

  static async #onAddStress(this: AgentSheet): Promise<void> {
    const current = (this.actor.system as AgentData).stress;
    await this.actor.update({ "system.stress": Math.min(6, current + 1) });
  }
}
```

---

## Migration System

For schema changes after initial release, implement numbered migration classes:

```typescript
abstract class MigrationBase {
  abstract readonly version: number;
  async updateActor(_source: Record<string, unknown>): Promise<void> {}
  async updateItem(_source: Record<string, unknown>): Promise<void> {}
}

class Migration0001_RenameStressField extends MigrationBase {
  readonly version = 1;
  override async updateActor(source: Record<string, unknown>): Promise<void> {
    const system = source["system"] as Record<string, unknown>;
    if ("stressLevel" in system) {
      system["stress"] = system["stressLevel"];
      delete system["stressLevel"];
    }
  }
}

async function runMigrations(migrations: MigrationBase[]): Promise<void> {
  const currentVersion = game.settings.get("inspectres", "schemaVersion") as number;
  const pending = migrations
    .filter(m => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);
  for (const migration of pending) {
    for (const actor of game.actors) {
      const source = actor.toObject();
      await migration.updateActor(source);
      // apply source back via update
    }
  }
  const latest = pending.at(-1);
  if (latest) await game.settings.set("inspectres", "schemaVersion", latest.version);
}
```

---

## Anti-Patterns Seen in Reference Systems to Avoid

| Anti-pattern | Better approach |
|---|---|
| Svelte in Foundry sheets (pf2e) | Custom elements + Handlebars — simpler, no extra build complexity |
| `forEach` on HTMLCollection | `for...of` or `Array.from()` |
| Inline `onclick` in templates | `data-action` + static action handler in DEFAULT_OPTIONS |
| `this.actor.data.data.field` (v9 pattern) | `this.actor.system.field` (v10+) |
| Single 56KB utils file | Split by concern: `formatters.ts`, `dom.ts`, `roll-utils.ts` |
| No AbortController on element listeners | Always `{ signal }` + abort in `disconnectedCallback` |
| Hard-coding FontAwesome class strings in TS | Keep icon classes in templates/CSS, not TS |
| Setting element content via string concatenation | Use `createHTMLElement` or DOM methods |
