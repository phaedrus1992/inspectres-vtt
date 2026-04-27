/**
 * InSpectres Agent Character Sheet
 */

import { type AgentCharacteristic } from "./agent-schema.js";
import { executeSkillRoll, executeStressRoll, type SkillName } from "../rolls/roll-executor.js";
import { agentSystemData } from "./agent-system-data.js";
import { findFranchiseActor, franchiseSystemData } from "../franchise/franchise-utils.js";
import { handleActionError } from "../utils/ui-errors.js";
import { activateTabs } from "../utils/sheet-tabs.js";
import { getOrCreateListenerController } from "../utils/listener-cleanup.js";
import { computeRecoveryStatus, getCurrentDay } from "./recovery-utils.js";
import { buildVacationDialog } from "./vacation-dialog.js";
import { type FranchiseData } from "../franchise/franchise-schema.js";

const SKILL_NAMES = ["academics", "athletics", "technology", "contact"] as const;

function isSkillName(value: string | null): value is SkillName {
  return SKILL_NAMES.includes(value as SkillName);
}

function getRecoveryBannerText(recoveryStatus: ReturnType<typeof computeRecoveryStatus>): string | null {
  switch (recoveryStatus.status) {
    case "dead":
      return game.i18n?.localize("INSPECTRES.RecoveryStatusDead") ?? "Dead";
    case "recovering": {
      const i18n = game.i18n?.localize("INSPECTRES.RecoveryStatusRecovering") ?? "Recovering";
      const days = recoveryStatus.daysRemaining;
      const dayLabel = days === 1 ? "day" : "days";
      return `${i18n} (${days} ${dayLabel} left)`;
    }
    case "returned":
    case "active":
      return null;
    default:
      return null;
  }
}

// Store AbortController for each sheet instance to manage checkbox listeners
const checkboxControllers = new WeakMap<AgentSheet, AbortController>();


async function buildStressRollDialog(agent: Actor): Promise<void> {
  const system = agentSystemData(agent);
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
  const franchise = findFranchiseActor();
  await executeStressRoll(agent, params, franchise);
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
      vacation: AgentSheet.onVacation,
      skillIncrease: AgentSheet.onSkillStep,
      skillDecrease: AgentSheet.onSkillStep,
      toggleCool: AgentSheet.onToggleCool,
      activatePower: AgentSheet.onActivatePower,
      addCharacteristic: AgentSheet.onAddCharacteristic,
      removeCharacteristic: AgentSheet.onRemoveCharacteristic,
      editPortrait: AgentSheet.onEditPortrait,
      reviveAgent: AgentSheet.onReviveAgent,
      emergencyRecovery: AgentSheet.onEmergencyRecovery,
      overrideRecoveryDay: AgentSheet.onOverrideRecoveryDay,
    },
  };

  static override PARTS = {
    sheet: { template: "systems/inspectres/templates/agent-sheet.hbs" },
  };

  override async _prepareContext(_options: foundry.applications.api.ApplicationV2Options): Promise<Record<string, unknown>> {
    const base = await super._prepareContext(_options);
    // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
    const system = agentSystemData(this.actor);
    const currentDay = getCurrentDay();
    const recoveryStatus = computeRecoveryStatus(system, currentDay);
    const bannerText = getRecoveryBannerText(recoveryStatus);
    return { ...base, system, recoveryStatus, bannerText };
  }

  override async _onRender(context: Record<string, unknown>, options: foundry.applications.api.ApplicationV2Options): Promise<void> {
    await super._onRender(context, options);

    activateTabs(this.element, "stats");

    if (!this.isEditable) return;

    const controller = getOrCreateListenerController(checkboxControllers, this);

    // weird-checkbox: change event not covered by DEFAULT_OPTIONS.actions
    for (const el of this.element.querySelectorAll<HTMLInputElement>(".weird-checkbox")) {
      el.addEventListener("change", (event: Event) => {
        const target = event.target as HTMLInputElement;
        const system = agentSystemData(this.actor);
        const status = computeRecoveryStatus(system, getCurrentDay());
        if (status.status === "recovering" || status.status === "dead") {
          ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnActionBlockedRecovery") ?? "Cannot act while recovering");
          target.checked = !target.checked;
          return;
        }
        // Issue #219: Group-level gating deferred pending group assignment feature implementation.
        // When groups are modeled in Issue #292, re-enable validation below:
        // if (target.checked) {
        //   const group = ...getFlag("inspectres", "group")...
        //   Prevent >1 weird per group
        // }
        // fvtt-types expects full document data shape for actor.update; partial update path is safe at runtime
        const updateData = { "system.isWeird": target.checked } as unknown as Parameters<typeof this.actor.update>[0];
        void this.actor.update(updateData).catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error("Failed to toggle weird status for agent", {
            actorId: this.actor.id,
            actorName: this.actor.name,
            targetValue: target.checked,
            error: err,
            errorMessage: message,
          });
          handleActionError(err, "Failed to toggle weird status", "INSPECTRES.ErrorUpdateFailed", "Failed to update actor data");
        });
      }, { signal: controller.signal });
    }

    // recovery-day-input: change event for overrideRecoveryDay (not automatic like form inputs with name="...")
    for (const el of this.element.querySelectorAll<HTMLInputElement>(".recovery-day-input")) {
      el.addEventListener("change", (event: Event) => {
        const target = event.target as HTMLInputElement;
        void AgentSheet.onOverrideRecoveryDay.call(this, event, target).catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error("Failed to override recovery day for agent", {
            actorId: this.actor.id,
            actorName: this.actor.name,
            targetValue: target.value,
            error: err,
            errorMessage: message,
          });
          handleActionError(err, "Failed to override recovery day", "INSPECTRES.ErrorUpdateFailed", "Could not update recovery");
        });
      }, { signal: controller.signal });
    }
  }

  static async onSkillRoll(this: AgentSheet, _event: Event, target: HTMLElement): Promise<void> {
    const skillAttr = target.getAttribute("data-skill");
    if (!isSkillName(skillAttr)) {
      console.error("onSkillRoll: missing or invalid data-skill attribute", { skillAttr });
      return;
    }
    const system = agentSystemData(this.actor);
    const currentDay = getCurrentDay();
    const recovery = computeRecoveryStatus(system, currentDay);
    if (recovery.status === "dead") {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnSkillRollDead") ?? "Dead agents cannot roll.");
      return;
    }
    if (recovery.status === "recovering") {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnSkillRollRecovering") ?? "Agents out of action cannot roll.");
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
    const system = agentSystemData(this.actor);
    const currentDay = getCurrentDay();
    const recovery = computeRecoveryStatus(system, currentDay);
    if (recovery.status === "dead") {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnStressRollDead") ?? "Dead agents cannot roll.");
      return;
    }
    if (recovery.status === "recovering") {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnStressRollRecovering") ?? "Agents out of action cannot roll.");
      return;
    }
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
    const system = agentSystemData(this.actor);
    const status = computeRecoveryStatus(system, getCurrentDay());
    if (status.status === "recovering" || status.status === "dead") {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnSkillBlockedRecovery") ?? "Cannot act while recovering");
      return;
    }
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
    const system = agentSystemData(this.actor);
    const status = computeRecoveryStatus(system, getCurrentDay());
    if (status.status === "recovering" || status.status === "dead") {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnSkillBlockedRecovery") ?? "Cannot act while recovering");
      return;
    }
    const currentCool = system.cool;
    const newCool = currentCool >= pipValue ? pipValue - 1 : pipValue;
    // fvtt-types expects full document data shape for actor.update; partial update path is safe at runtime
    const updateData = { "system.cool": newCool } as unknown as Parameters<typeof this.actor.update>[0];
    void this.actor.update(updateData).catch((err: unknown) => {
      handleActionError(err, "Failed to set cool dice", "INSPECTRES.ErrorUpdateFailed", "Failed to update actor data");
    });
  }

  static async onAddCharacteristic(this: AgentSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    const currentSystem = agentSystemData(this.actor);
    const status = computeRecoveryStatus(currentSystem, getCurrentDay());
    if (status.status === "recovering" || status.status === "dead") {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnActionBlockedRecovery") ?? "Cannot act while recovering");
      return;
    }
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
    const currentSystem = agentSystemData(this.actor);
    const status = computeRecoveryStatus(currentSystem, getCurrentDay());
    if (status.status === "recovering" || status.status === "dead") {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnActionBlockedRecovery") ?? "Cannot act while recovering");
      return;
    }
    const characteristics = (currentSystem.characteristics ?? []) as AgentCharacteristic[];
    // fvtt-types expects full document data shape for actor.update; partial update path is safe at runtime
    const updateData = { "system.characteristics": characteristics.filter((_: AgentCharacteristic, i: number) => i !== idx) } as unknown as Parameters<typeof this.actor.update>[0];
    void this.actor.update(updateData).catch((err: unknown) => {
      handleActionError(err, "Failed to remove characteristic", "INSPECTRES.ErrorRemoveCharacteristic", "Failed to remove characteristic");
    });
  }

  static async onEditPortrait(this: AgentSheet, _event: Event, target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    const system = agentSystemData(this.actor);
    const status = computeRecoveryStatus(system, getCurrentDay());
    if (status.status === "recovering" || status.status === "dead") {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnActionBlockedRecovery") ?? "Cannot act while recovering");
      return;
    }
    const type = target.dataset["type"] ?? "image";
    const current = this.actor.img ?? undefined;
    const FilePicker = (foundry.applications.api as unknown as { FilePicker: unknown }).FilePicker as unknown as { new (options: { current?: string | undefined; type: string; callback?: (path: string) => void }): { browse(): void } };
    const picker = new FilePicker({
      current,
      type,
      callback: (path: string) => {
        const updateData = { img: path } as unknown as Parameters<typeof this.actor.update>[0];
        void this.actor.update(updateData).catch((err: unknown) => {
          handleActionError(err, "Failed to update portrait", "INSPECTRES.ErrorUpdateFailed", "Failed to update actor image");
        });
      },
    });
    picker.browse();
  }

  static async onVacation(this: AgentSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    const system = agentSystemData(this.actor);
    const franchise = findFranchiseActor();
    if (!franchise) {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnFranchiseNotFound") ?? "Franchise actor not found.");
      return;
    }
    const franchiseSystem = franchise.system as unknown as FranchiseData;
    const status = computeRecoveryStatus(system, getCurrentDay());
    if (status.status === "recovering" || status.status === "dead") {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnActionBlockedRecovery") ?? "Cannot act while recovering");
      return;
    }
    const result = await buildVacationDialog({
      agentStress: system.stress,
      agentName: this.actor.name ?? "Unknown",
      franchiseBank: franchiseSystem.bank,
      franchiseInDebt: franchiseSystem.debtMode,
      agentCool: system.cool,
      agentIsWeird: system.isWeird,
    });
    if (!result) return;
    if (result.bankDiceSpent === 0) {
      ui.notifications?.info(
        game.i18n?.localize("INSPECTRES.InfoVacationNoSpending") ?? "No Bank dice spent. Agent stress unchanged.",
      );
      return;
    }
    const newStress = Math.max(0, system.stress - result.stressReduction);
    const newCool = system.cool + (result.coolRestored ?? 0);
    const newBank = Math.max(0, franchiseSystem.bank - result.bankDiceSpent);
    const agentUpdateData = { "system.stress": newStress, "system.cool": newCool } as unknown as Parameters<
      typeof this.actor.update
    >[0];
    const franchiseUpdateData = { "system.bank": newBank } as unknown as Parameters<typeof franchise.update>[0];
    try {
      await Promise.all([
        this.actor.update(agentUpdateData),
        franchise.update(franchiseUpdateData),
      ]);
      const coolMessage = (result.coolRestored ?? 0) > 0 ? `, restored ${result.coolRestored} Cool` : "";
      ui.notifications?.info(
        game.i18n?.localize("INSPECTRES.InfoVacationComplete") ??
          `Vacation: spent ${result.bankDiceSpent} dice, reduced stress by ${result.stressReduction}${coolMessage}.`,
      );
    } catch (err: unknown) {
      handleActionError(err, "Vacation failed", "INSPECTRES.ErrorVacationFailed", "Failed to apply vacation");
    }
  }

  static async onActivatePower(this: AgentSheet, _event: Event, _target: HTMLElement): Promise<void> {
    // Like other state-mutating handlers on this sheet, power activation requires:
    // 1. Sheet to be in edit mode (not read-only, e.g., compendium actors)
    // 2. Agent to be alive and not recovering
    // 3. Sufficient cool to pay the cost
    if (!this.isEditable) return;

    try {
      const system = agentSystemData(this.actor);
      const currentDay = getCurrentDay();
      const recoveryStatus = computeRecoveryStatus(system, currentDay);
      if (recoveryStatus.status === "recovering" || recoveryStatus.status === "dead") {
        ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnActionBlockedRecovery") ?? "Cannot act while recovering");
        return;
      }

      if (!system.isWeird || !system.power) {
        ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnNoPower") ?? "No power to activate");
        return;
      }

      const { power } = system;
      if (system.cool < power.coolCost) {
        ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnInsufficientCool") ?? "Insufficient cool to activate power");
        return;
      }

      // Deduct cool cost
      const newCool = system.cool - power.coolCost;
      const updateData: Record<string, number> = {};
      updateData["system.cool"] = newCool;
      await this.actor.update(updateData);

      // Announce power activation in chat
      const flavor = game.i18n?.format("INSPECTRES.PowerActivated", { name: power.name, actor: this.actor.name }) ?? `${this.actor.name} activated ${power.name}`;
      await ChatMessage.create({
        content: `<p>${flavor}</p>`,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      });

      ui.notifications?.info(
        game.i18n?.format("INSPECTRES.InfoPowerActivated", { name: power.name, remaining: String(newCool) }) ?? `${power.name} activated. Cool: ${newCool}`,
      );
    } catch (err: unknown) {
      handleActionError(err, "Power activation failed", "INSPECTRES.ErrorPowerActivationFailed", "Failed to activate power");
    }
  }

  static async onReviveAgent(this: AgentSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    try {
      const updateData = {
        "system.isDead": false,
        "system.daysOutOfAction": 0,
        "system.recoveryStartedAt": 0,
      } as unknown as Parameters<typeof this.actor.update>[0];
      await this.actor.update(updateData);
      ui.notifications?.info(
        game.i18n?.format("INSPECTRES.InfoAgentRevived", { actor: this.actor.name }) ?? `${this.actor.name} has been revived`,
      );
    } catch (err: unknown) {
      handleActionError(err, "Failed to revive agent", "INSPECTRES.ErrorReviveFailed", "Could not update agent status");
    }
  }

  static async onEmergencyRecovery(this: AgentSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    const i18n = game.i18n;
    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: i18n?.localize("INSPECTRES.EmergencyRecovery") ?? "Emergency Recovery" },
      rejectClose: false,
      content: `
        <form class="inspectres-recovery-dialog">
          <label>${i18n?.localize("INSPECTRES.DaysOutOfAction") ?? "Days out of action"}: <input type="number" name="days" min="1" max="10" value="2"></label>
        </form>
      `,
      buttons: [
        {
          action: "set",
          label: i18n?.localize("INSPECTRES.DialogSet") ?? "Set",
          default: true,
          callback: (_event: Event, _button: HTMLButtonElement, dialog: HTMLDialogElement) => {
            const form = dialog.querySelector("form") as HTMLFormElement | null;
            if (!form) return null;
            const days = Math.max(1, Math.min(10, Number(new FormData(form).get("days") ?? 2)));
            return { days: isNaN(days) ? 2 : days };
          },
        },
        { action: "cancel", label: i18n?.localize("INSPECTRES.DialogCancel") ?? "Cancel" },
      ],
    });

    if (result === null || result === undefined || result === "cancel") return;
    const config = result as { days: number };
    const currentDay = getCurrentDay();

    try {
      const updateData = {
        "system.isDead": false,
        "system.daysOutOfAction": config.days,
        "system.recoveryStartedAt": currentDay,
      } as unknown as Parameters<typeof this.actor.update>[0];
      await this.actor.update(updateData);
      ui.notifications?.info(
        game.i18n?.format("INSPECTRES.InfoRecoveryStarted", { actor: this.actor.name, days: String(config.days) }) ?? `${this.actor.name} on emergency recovery for ${config.days} days`,
      );
    } catch (err: unknown) {
      handleActionError(err, "Failed to start recovery", "INSPECTRES.ErrorRecoveryFailed", "Could not update recovery status");
    }
  }

  static async onOverrideRecoveryDay(this: AgentSheet, _event: Event, target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    const input = target as HTMLInputElement;
    const targetDay = Number(input.value);
    const MAX_RECOVERY_DAY = 365;
    if (!Number.isInteger(targetDay) || isNaN(targetDay) || targetDay < 1 || targetDay > MAX_RECOVERY_DAY) {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnInvalidDay") ?? "Invalid day number");
      return;
    }

    try {
      const system = agentSystemData(this.actor);
      const currentDay = getCurrentDay();
      if (targetDay < system.recoveryStartedAt) {
        ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnRecoveryDayBeforeStart") ?? "Target day must be on or after the recovery start day");
        return;
      }
      const daysNeeded = targetDay - system.recoveryStartedAt;

      const updateData = {
        "system.daysOutOfAction": daysNeeded,
      } as unknown as Parameters<typeof this.actor.update>[0];
      await this.actor.update(updateData);

      ui.notifications?.info(
        game.i18n?.format("INSPECTRES.InfoRecoveryDayOverride", { actor: this.actor.name, day: String(targetDay) }) ?? `${this.actor.name} recovery adjusted to day ${targetDay}`,
      );
    } catch (err: unknown) {
      handleActionError(err, "Failed to override recovery day", "INSPECTRES.ErrorOverrideFailed", "Could not update recovery day");
    }
  }
}
