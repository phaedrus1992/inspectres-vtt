import { type FranchiseData } from "./franchise-schema.js";
import { executeBankRoll, executeClientRoll } from "../rolls/roll-executor.js";
import { MissionTrackerApp } from "../mission/MissionTrackerApp.js";
import { handleActionError } from "../utils/ui-errors.js";
import { activateTabs } from "../utils/sheet-tabs.js";
import { enterDebtMode, attemptLoanRepayment } from "./bankruptcy-handler.js";

// HandlebarsApplicationMixin provides _renderHTML/_replaceHTML required by ApplicationV2 for PARTS-based sheets
export class FranchiseSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static override DEFAULT_OPTIONS = {
    classes: ["inspectres", "sheet", "actor", "franchise"],
    position: { width: 600, height: 600 as number | "auto" },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      bankRoll: FranchiseSheet.onBankRoll,
      clientRoll: FranchiseSheet.onClientRoll,
      openMissionTracker: FranchiseSheet.onOpenMissionTracker,
      enterDebt: FranchiseSheet.onEnterDebt,
      toggleDebtMode: FranchiseSheet.onToggleDebtMode,
      toggleCardsLocked: FranchiseSheet.onToggleCardsLocked,
      attemptRepayment: FranchiseSheet.onAttemptRepayment,
    },
  };

  static override PARTS = {
    sheet: { template: "systems/inspectres/templates/franchise-sheet.hbs" },
  };

  override async _onRender(context: Record<string, unknown>, options: foundry.applications.api.ApplicationV2Options): Promise<void> {
    await super._onRender(context, options);
    activateTabs(this.element, "stats");
  }

  override async _prepareContext(_options: foundry.applications.api.ApplicationV2Options): Promise<Record<string, unknown>> {
    const base = await super._prepareContext(_options);
    // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
    const system = this.actor.system as unknown as FranchiseData;
    const isGm = game.user?.isGM ?? false;
    const missionComplete = system.missionGoal > 0 && system.missionPool >= system.missionGoal;
    return { ...base, system, isGm, missionComplete };
  }

  static async onBankRoll(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
    const system = this.actor.system as unknown as FranchiseData;
    if (system.debtMode) {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnBankRollDebtMode") ?? "Bank rolls are disabled in Debt Mode.");
      return;
    }
    void executeBankRoll(this.actor).catch((err: unknown) => {
      handleActionError(err, "Bank roll failed", "INSPECTRES.ErrorBankRollFailed", "Bank roll failed");
    });
  }

  static async onClientRoll(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
    const system = this.actor.system as unknown as FranchiseData;
    if (system.debtMode) {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnClientRollDebtMode") ?? "Client rolls are disabled in Debt Mode.");
      return;
    }
    void executeClientRoll(this.actor).catch((err: unknown) => {
      handleActionError(err, "Client roll failed", "INSPECTRES.ErrorClientRollFailed", "Client roll failed");
    });
  }

  static onOpenMissionTracker(_event: Event, _target: HTMLElement): void {
    MissionTrackerApp.open();
  }

  static async onEnterDebt(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    const system = this.actor.system as unknown as FranchiseData;
    if (system.bank > 0) {
      ui.notifications?.warn(
        game.i18n?.localize("INSPECTRES.WarnCantEnterDebtWithPositiveBank") ??
          "Franchise must have zero or negative Bank to enter Debt Mode.",
      );
      return;
    }
    const shortfall = Math.abs(system.bank);
    void enterDebtMode(this.actor, shortfall).catch((err: unknown) => {
      handleActionError(err, "Debt mode entry failed", "INSPECTRES.ErrorEnterDebtModeFailed", "Failed to enter debt mode");
    });
  }

  static async onToggleDebtMode(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable || !game.user?.isGM) return;
    const system = this.actor.system as unknown as FranchiseData;
    const updateData = {
      "system.debtMode": !system.debtMode,
    } as unknown as Parameters<typeof this.actor.update>[0];
    await this.actor.update(updateData);
  }

  static async onToggleCardsLocked(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable || !game.user?.isGM) return;
    const system = this.actor.system as unknown as FranchiseData;
    const updateData = {
      "system.cardsLocked": !system.cardsLocked,
    } as unknown as Parameters<typeof this.actor.update>[0];
    await this.actor.update(updateData);
  }

  static async onAttemptRepayment(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    const system = this.actor.system as unknown as FranchiseData;
    if (!system.debtMode) {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.InfoNotInDebt") ?? "Franchise is not in debt.");
      return;
    }
    // Ask GM for earned dice this mission
    const earnedInput = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n?.localize("INSPECTRES.DialogRepaymentTitle") ?? "Loan Repayment" },
      content: `
        <form>
          <div class="form-group">
            <label for="earnedDice">${game.i18n?.localize("INSPECTRES.EarnedDiceThisMission") ?? "Earned Dice This Mission"}</label>
            <input type="number" name="earnedDice" id="earnedDice" min="0" value="0" required />
          </div>
        </form>
      `,
      buttons: [
        {
          action: "repay",
          label: game.i18n?.localize("INSPECTRES.ButtonAttemptRepayment") ?? "Attempt Repayment",
          default: true,
          callback: (_event, _button, dialog) => {
            const form = dialog.querySelector("form") as HTMLFormElement;
            const data = new FormData(form);
            const earned = data.get("earnedDice");
            return Math.max(0, Number(earned ?? 0));
          },
        },
        {
          action: "cancel",
          label: game.i18n?.localize("INSPECTRES.Cancel") ?? "Cancel",
        },
      ],
    });

    if (earnedInput === null || earnedInput === "cancel" || typeof earnedInput !== "number") return;

    void attemptLoanRepayment(this.actor, earnedInput).catch((err: unknown) => {
      handleActionError(
        err,
        "Loan repayment failed",
        "INSPECTRES.ErrorRepaymentFailed",
        "Loan repayment failed",
      );
    });
  }
}
