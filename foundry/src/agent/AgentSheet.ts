/**
 * InSpectres Agent Character Sheet
 */

import { type AgentData, type AgentCharacteristic } from "./agent-schema.js";
import { executeSkillRoll, executeStressRoll, type SkillName } from "../rolls/roll-executor.js";
import { findFranchiseActor, franchiseSystemData } from "../franchise/franchise-utils.js";

const SKILL_NAMES = ["academics", "athletics", "technology", "contact"] as const;

function isSkillName(value: string | null): value is SkillName {
  return SKILL_NAMES.includes(value as SkillName);
}

async function buildStressRollDialog(agent: Actor): Promise<void> {
  const system = agent.system as unknown as AgentData;
  const maxCool = system.cool;

  const i18n = game.i18n;
  const stressDiceLabel = i18n?.localize("INSPECTRES.DialogStressDice") ?? "Stress Dice (1–5)";
  const coolIgnoreLabel = i18n?.format("INSPECTRES.DialogCoolIgnore", { max: String(maxCool) }) ?? `Cool dice to ignore lowest (0–${maxCool})`;

  // Dialog.wait<T> is constrained by fvtt-types; cast through unknown to avoid the constraint
  const result = await (Dialog.wait as (config: unknown) => Promise<unknown>)({
    title: i18n?.localize("INSPECTRES.StressRoll") ?? "Stress Roll",
    content: `
      <form class="inspectres-roll-dialog">
        <label>${stressDiceLabel}: <input type="number" name="stressDice" min="1" max="5" value="1"></label>
        ${maxCool > 0 ? `<label>${coolIgnoreLabel}: <input type="number" name="coolIgnore" min="0" max="${maxCool}" value="0"></label>` : ""}
      </form>
    `,
    buttons: {
      roll: {
        label: i18n?.localize("INSPECTRES.DialogRoll") ?? "Roll",
        callback: (html: JQuery) => {
          const form = html.find("form")[0] as HTMLFormElement | undefined;
          if (!form) return { stressDiceCount: 1, coolDiceUsed: 0 };
          const data = new FormData(form);
          const stressDiceCount = Math.max(1, Math.min(5, Number(data.get("stressDice") ?? 1)));
          const coolDiceUsed = Math.max(0, Math.min(maxCool, Number(data.get("coolIgnore") ?? 0)));
          return {
            stressDiceCount: isNaN(stressDiceCount) ? 1 : stressDiceCount,
            coolDiceUsed: isNaN(coolDiceUsed) ? 0 : coolDiceUsed,
          };
        },
      },
      cancel: {
        label: i18n?.localize("INSPECTRES.DialogCancel") ?? "Cancel",
        callback: () => null,
      },
    },
    default: "roll",
  });

  if (result === null || result === undefined) return;
  const params = result as { stressDiceCount: number; coolDiceUsed: number };
  await executeStressRoll(agent, params);
}

export class AgentSheet extends ActorSheet {

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["inspectres", "sheet", "actor", "agent"],
      template: "systems/inspectres/templates/agent-sheet.hbs",
      width: 600,
      height: 700,
    });
  }

  override async getData() {
    const context = await super.getData();
    const system = this.actor.system as unknown as AgentData;
    return {
      ...context,
      system,
    };
  }

  override activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);

    // Skill roll
    html.on("click", "[data-action='skillRoll']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const skillAttr = (event.currentTarget as HTMLElement).getAttribute("data-skill");
      if (!isSkillName(skillAttr)) {
        console.error("skillRoll: missing or invalid data-skill attribute", skillAttr);
        return;
      }
      const franchise = findFranchiseActor();
      if (franchise && franchiseSystemData(franchise).debtMode) {
        ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnSkillRollDebtMode") ?? "Skill rolls are blocked while in Debt Mode.");
        return;
      }
      void executeSkillRoll(this.actor, franchise, skillAttr).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Skill roll failed:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorRollFailed") ?? "Roll failed");
      });
    });

    // Stress roll
    html.on("click", "[data-action='stressRoll']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const franchise = findFranchiseActor();
      if (franchise && franchiseSystemData(franchise).debtMode) {
        ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnStressRollDebtMode") ?? "Stress rolls are blocked while in Debt Mode.");
        return;
      }
      void buildStressRollDialog(this.actor).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Stress roll failed:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorRollFailed") ?? "Roll failed");
      });
    });

    // Skill base increment/decrement
    html.on("click", "[data-action='skillIncrease'],[data-action='skillDecrease']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const el = event.currentTarget as HTMLElement;
      const skillAttr = el.getAttribute("data-skill");
      if (!isSkillName(skillAttr)) {
        console.error("skill step: missing or invalid data-skill", skillAttr);
        return;
      }
      const system = this.actor.system as unknown as AgentData;
      const skillData = system.skills[skillAttr];
      if (!skillData) {
        console.error(`skill step: skills.${skillAttr} missing on actor ${this.actor.id}`);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorUpdateFailed") ?? "Failed to update actor data");
        return;
      }
      const current = skillData.base;
      const delta = el.getAttribute("data-action") === "skillIncrease" ? 1 : -1;
      const next = Math.min(4, Math.max(0, current + delta));
      if (next === current) return;
      const updateData = { [`system.skills.${skillAttr}.base`]: next } as unknown as Parameters<typeof this.actor.update>[0];
      void this.actor.update(updateData).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to update skill:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorUpdateFailed") ?? "Failed to update actor data");
      });
    });

    // Cool toggle
    html.on("change", ".weird-checkbox", (event: JQuery.ChangeEvent) => {
      event.preventDefault();
      const updateData = { "system.isWeird": (event.target as HTMLInputElement).checked } as unknown as Parameters<typeof this.actor.update>[0];
      void this.actor.update(updateData).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to toggle weird status:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorUpdateFailed") ?? "Failed to update actor data");
      });
    });

    // Cool pip toggle (normal agents): clicking active pip toggles it off (cool = pipValue - 1)
    html.on("click", ".cool-pip", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const valueStr = (event.currentTarget as HTMLElement).getAttribute("data-value");
      if (valueStr == null) {
        console.error("cool-pip: missing data-value attribute");
        return;
      }
      const pipValue = Number(valueStr);
      if (Number.isNaN(pipValue) || pipValue < 1 || pipValue > 3) {
        console.error("cool-pip: invalid data-value", valueStr);
        return;
      }
      const currentCool = (this.actor.system as unknown as AgentData).cool;
      const newCool = currentCool >= pipValue ? pipValue - 1 : pipValue;
      const updateData = { "system.cool": newCool } as unknown as Parameters<typeof this.actor.update>[0];
      void this.actor.update(updateData).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to set cool dice:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorUpdateFailed") ?? "Failed to update actor data");
      });
    });

    // Add characteristic
    html.on("click", "[data-action='addCharacteristic']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const currentSystem = this.actor.system as unknown as AgentData;
      const characteristics = (currentSystem.characteristics || []) as AgentCharacteristic[];
      const updateData = { "system.characteristics": [...characteristics, { text: "", used: false }] } as unknown as Parameters<typeof this.actor.update>[0];
      void this.actor.update(updateData).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to add characteristic:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorAddCharacteristic") ?? "Failed to add characteristic");
      });
    });

    // Remove characteristic
    html.on("click", "[data-action='removeCharacteristic']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const idxStr = (event.currentTarget as HTMLElement).getAttribute("data-idx");
      if (idxStr == null) {
        console.error("removeCharacteristic: missing data-idx attribute");
        return;
      }
      const idx = Number(idxStr);
      if (Number.isNaN(idx) || idx < 0) {
        console.error("removeCharacteristic: invalid data-idx value", idxStr);
        return;
      }
      const currentSystem = this.actor.system as unknown as AgentData;
      const characteristics = (currentSystem.characteristics || []) as AgentCharacteristic[];
      const updateData = { "system.characteristics": characteristics.filter((_: AgentCharacteristic, i: number) => i !== idx) } as unknown as Parameters<typeof this.actor.update>[0];
      void this.actor.update(updateData).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to remove characteristic:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorRemoveCharacteristic") ?? "Failed to remove characteristic");
      });
    });
  }
}
