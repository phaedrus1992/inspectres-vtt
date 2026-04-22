/**
 * InSpectres Agent Character Sheet
 */

import { type AgentData, type AgentCharacteristic } from "./agent-schema.js";
import { executeSkillRoll, executeStressRoll, type SkillName } from "../rolls/roll-executor.js";
import { findFranchiseActor, franchiseSystemData } from "../franchise/franchise-utils.js";
import { handleActionError } from "../utils/ui-errors.js";

const SKILL_NAMES = ["academics", "athletics", "technology", "contact"] as const;

function isSkillName(value: string | null): value is SkillName {
  return SKILL_NAMES.includes(value as SkillName);
}

async function buildStressRollDialog(agent: Actor): Promise<void> {
  // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
  const system = agent.system as unknown as AgentData;
  const maxCool = system.cool;

  const i18n = game.i18n;
  const stressDiceLabel = i18n?.localize("INSPECTRES.DialogStressDice") ?? "Stress Dice (1–5)";
  const coolIgnoreLabel = i18n?.format("INSPECTRES.DialogCoolIgnore", { max: String(maxCool) }) ?? `Cool dice to ignore lowest (0–${maxCool})`;

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: i18n?.localize("INSPECTRES.StressRoll") ?? "Stress Roll" },
    rejectClose: false,
    content: `
      <form class="inspectres-roll-dialog">
        <label>${stressDiceLabel}: <input type="number" name="stressDice" min="1" max="5" value="1"></label>
        ${maxCool > 0 ? `<label>${coolIgnoreLabel}: <input type="number" name="coolIgnore" min="0" max="${maxCool}" value="0"></label>` : ""}
      </form>
    `,
    buttons: [
      {
        action: "roll",
        label: i18n?.localize("INSPECTRES.DialogRoll") ?? "Roll",
        default: true,
        callback: (_event: Event, _button: HTMLButtonElement, dialog: HTMLDialogElement) => {
          const form = dialog.querySelector("form") as HTMLFormElement | null;
          if (!form) {
            console.error("buildStressRollDialog: form element not found in dialog");
            return null;
          }
          const data = new FormData(form);
          const stressDiceCount = Math.max(1, Math.min(5, Number(data.get("stressDice") ?? 1)));
          const coolDiceUsed = Math.max(0, Math.min(maxCool, Number(data.get("coolIgnore") ?? 0)));
          return {
            stressDiceCount: isNaN(stressDiceCount) ? 1 : stressDiceCount,
            coolDiceUsed: isNaN(coolDiceUsed) ? 0 : coolDiceUsed,
          };
        },
      },
      {
        action: "cancel",
        label: i18n?.localize("INSPECTRES.DialogCancel") ?? "Cancel",
        callback: () => null,
      },
    ],
  });

  if (result === null || result === undefined) return;
  const params = result as { stressDiceCount: number; coolDiceUsed: number };
  await executeStressRoll(agent, params);
}

// HandlebarsApplicationMixin provides _renderHTML/_replaceHTML required by ApplicationV2 for PARTS-based sheets
export class AgentSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static override DEFAULT_OPTIONS = {
    classes: ["inspectres", "sheet", "actor", "agent"],
    position: { width: 600, height: 700 as number | "auto" },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      skillRoll: AgentSheet.onSkillRoll,
      stressRoll: AgentSheet.onStressRoll,
      skillIncrease: AgentSheet.onSkillStep,
      skillDecrease: AgentSheet.onSkillStep,
      toggleCool: AgentSheet.onToggleCool,
      addCharacteristic: AgentSheet.onAddCharacteristic,
      removeCharacteristic: AgentSheet.onRemoveCharacteristic,
    },
  };

  static override PARTS = {
    sheet: { template: "systems/inspectres/templates/agent-sheet.hbs" },
  };

  override async _prepareContext(_options: foundry.applications.api.ApplicationV2Options): Promise<Record<string, unknown>> {
    const base = await super._prepareContext(_options);
    // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
    const system = this.actor.system as unknown as AgentData;
    return { ...base, system };
  }

  override async _onRender(context: Record<string, unknown>, options: foundry.applications.api.ApplicationV2Options): Promise<void> {
    await super._onRender(context, options);
    if (!this.isEditable) return;

    // weird-checkbox: change event not covered by DEFAULT_OPTIONS.actions
    for (const el of this.element.querySelectorAll<HTMLInputElement>(".weird-checkbox")) {
      el.addEventListener("change", (event: Event) => {
        // fvtt-types expects full document data shape for actor.update; partial update path is safe at runtime
        const updateData = { "system.isWeird": (event.target as HTMLInputElement).checked } as unknown as Parameters<typeof this.actor.update>[0];
        void this.actor.update(updateData).catch((err: unknown) => {
          handleActionError(err, "Failed to toggle weird status", "INSPECTRES.ErrorUpdateFailed", "Failed to update actor data");
        });
      });
    }
  }

  static async onSkillRoll(this: AgentSheet, _event: Event, target: HTMLElement): Promise<void> {
    const skillAttr = target.getAttribute("data-skill");
    if (!isSkillName(skillAttr)) {
      console.error("onSkillRoll: missing or invalid data-skill attribute", { skillAttr });
      return;
    }
    const franchise = findFranchiseActor();
    if (franchise && franchiseSystemData(franchise).debtMode) {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnSkillRollDebtMode") ?? "Skill rolls are blocked while in Debt Mode.");
      return;
    }
    void executeSkillRoll(this.actor, franchise, skillAttr).catch((err: unknown) => {
      handleActionError(err, "Skill roll failed", "INSPECTRES.ErrorSkillRollFailed", "Skill roll failed");
    });
  }

  static async onStressRoll(this: AgentSheet, _event: Event, _target: HTMLElement): Promise<void> {
    const franchise = findFranchiseActor();
    if (franchise && franchiseSystemData(franchise).debtMode) {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnStressRollDebtMode") ?? "Stress rolls are blocked while in Debt Mode.");
      return;
    }
    void buildStressRollDialog(this.actor).catch((err: unknown) => {
      handleActionError(err, "Stress roll failed", "INSPECTRES.ErrorStressRollFailed", "Stress roll failed");
    });
  }

  static async onSkillStep(this: AgentSheet, _event: Event, target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    const skillAttr = target.getAttribute("data-skill");
    if (!isSkillName(skillAttr)) {
      console.error("onSkillStep: missing or invalid data-skill attribute", { skillAttr });
      return;
    }
    // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
    const system = this.actor.system as unknown as AgentData;
    const skillData = system.skills[skillAttr];
    if (!skillData) {
      console.error("onSkillStep: skill data missing", { skillAttr, actorId: this.actor.id });
      return;
    }
    const current = skillData.base;
    const delta = target.getAttribute("data-action") === "skillIncrease" ? 1 : -1;
    const next = Math.min(4, Math.max(0, current + delta));
    if (next === current) return;
    // fvtt-types expects full document data shape for actor.update; partial update path is safe at runtime
    const updateData = { [`system.skills.${skillAttr}.base`]: next } as unknown as Parameters<typeof this.actor.update>[0];
    void this.actor.update(updateData).catch((err: unknown) => {
      handleActionError(err, "Failed to update skill", "INSPECTRES.ErrorUpdateFailed", "Failed to update actor data");
    });
  }

  static async onToggleCool(this: AgentSheet, _event: Event, target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    const valueStr = target.getAttribute("data-value");
    if (valueStr == null) {
      console.error("onToggleCool: missing data-value attribute");
      return;
    }
    const pipValue = Number(valueStr);
    if (Number.isNaN(pipValue) || pipValue < 1 || pipValue > 3) {
      console.error("onToggleCool: invalid data-value", { valueStr });
      return;
    }
    // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
    const currentCool = (this.actor.system as unknown as AgentData).cool;
    const newCool = currentCool >= pipValue ? pipValue - 1 : pipValue;
    // fvtt-types expects full document data shape for actor.update; partial update path is safe at runtime
    const updateData = { "system.cool": newCool } as unknown as Parameters<typeof this.actor.update>[0];
    void this.actor.update(updateData).catch((err: unknown) => {
      handleActionError(err, "Failed to set cool dice", "INSPECTRES.ErrorUpdateFailed", "Failed to update actor data");
    });
  }

  static async onAddCharacteristic(this: AgentSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
    const currentSystem = this.actor.system as unknown as AgentData;
    const characteristics = (currentSystem.characteristics ?? []) as AgentCharacteristic[];
    // fvtt-types expects full document data shape for actor.update; partial update path is safe at runtime
    const updateData = { "system.characteristics": [...characteristics, { text: "", used: false }] } as unknown as Parameters<typeof this.actor.update>[0];
    void this.actor.update(updateData).catch((err: unknown) => {
      handleActionError(err, "Failed to add characteristic", "INSPECTRES.ErrorAddCharacteristic", "Failed to add characteristic");
    });
  }

  static async onRemoveCharacteristic(this: AgentSheet, _event: Event, target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    const idxStr = target.getAttribute("data-idx");
    if (idxStr == null) {
      console.error("onRemoveCharacteristic: missing data-idx attribute");
      return;
    }
    const idx = Number(idxStr);
    if (Number.isNaN(idx) || idx < 0) {
      console.error("onRemoveCharacteristic: invalid data-idx value", { idxStr });
      return;
    }
    // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
    const currentSystem = this.actor.system as unknown as AgentData;
    const characteristics = (currentSystem.characteristics ?? []) as AgentCharacteristic[];
    // fvtt-types expects full document data shape for actor.update; partial update path is safe at runtime
    const updateData = { "system.characteristics": characteristics.filter((_: AgentCharacteristic, i: number) => i !== idx) } as unknown as Parameters<typeof this.actor.update>[0];
    void this.actor.update(updateData).catch((err: unknown) => {
      handleActionError(err, "Failed to remove characteristic", "INSPECTRES.ErrorRemoveCharacteristic", "Failed to remove characteristic");
    });
  }
}
