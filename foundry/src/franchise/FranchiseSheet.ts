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
      ui.notifications?.warn(FranchiseSheet.localize("INSPECTRES.WarnBankRollDebtMode", "Bank rolls are disabled in Debt Mode."));
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
      ui.notifications?.warn(FranchiseSheet.localize("INSPECTRES.WarnClientRollDebtMode", "Client rolls are disabled in Debt Mode."));
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
        FranchiseSheet.localize("INSPECTRES.WarnCantEnterDebtWithPositiveBank", "Franchise must have zero or negative Bank to enter Debt Mode."),
      );
      return;
    }
    const shortfall = Math.abs(system.bank);
    void enterDebtMode(this.actor, shortfall).catch((err: unknown) => {
      handleActionError(err, "Debt mode entry failed", "INSPECTRES.ErrorEnterDebtModeFailed", "Failed to enter debt mode");
    });
  }

  static async onToggleDebtMode(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    const system = this.actor.system as unknown as FranchiseData;
    await FranchiseSheet.toggleFlag(this, "system.debtMode", system.debtMode);
  }

  static async onToggleCardsLocked(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    const system = this.actor.system as unknown as FranchiseData;
    await FranchiseSheet.toggleFlag(this, "system.cardsLocked", system.cardsLocked);
  }

  static async onAttemptRepayment(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    const system = this.actor.system as unknown as FranchiseData;
    if (!system.debtMode) {
      ui.notifications?.warn(FranchiseSheet.localize("INSPECTRES.InfoNotInDebt", "Franchise is not in debt."));
      return;
    }

    const earnedInput = await FranchiseSheet.promptNumberInput({
      titleKey: "INSPECTRES.DialogRepaymentTitle",
      titleFallback: "Loan Repayment",
      labelKey: "INSPECTRES.EarnedDiceThisMission",
      labelFallback: "Earned Dice This Mission",
      fieldName: "earnedDice",
      confirmKey: "INSPECTRES.ButtonAttemptRepayment",
      confirmFallback: "Attempt Repayment",
      cancelKey: "INSPECTRES.Cancel",
      cancelFallback: "Cancel",
    });

    if (earnedInput === null) return;

    void attemptLoanRepayment(this.actor, earnedInput).catch((err: unknown) => {
      handleActionError(err, "Loan repayment failed", "INSPECTRES.ErrorRepaymentFailed", "Loan repayment failed");
    });
  }

  private static localize(key: string, fallback: string): string {
    return game.i18n?.localize(key) ?? fallback;
  }

  private static async toggleFlag(sheet: FranchiseSheet, field: string, current: boolean): Promise<void> {
    if (!sheet.isEditable || !game.user?.isGM) return;
    const updateData = { [field]: !current } as unknown as Parameters<typeof sheet.actor.update>[0];
    await sheet.actor.update(updateData);
  }

  private static async promptNumberInput(opts: {
    titleKey: string;
    titleFallback: string;
    labelKey: string;
    labelFallback: string;
    fieldName: string;
    confirmKey: string;
    confirmFallback: string;
    cancelKey: string;
    cancelFallback: string;
  }): Promise<number | null> {
    const label = FranchiseSheet.localize(opts.labelKey, opts.labelFallback);
    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: FranchiseSheet.localize(opts.titleKey, opts.titleFallback) },
      content: `
        <form>
          <div class="form-group">
            <label for="${opts.fieldName}">${label}</label>
            <input type="number" name="${opts.fieldName}" id="${opts.fieldName}" min="0" value="0" required />
          </div>
        </form>
      `,
      buttons: [
        {
          action: "confirm",
          label: FranchiseSheet.localize(opts.confirmKey, opts.confirmFallback),
          default: true,
          callback: (_event, _button, dialog) => {
            const form = dialog.querySelector("form") as HTMLFormElement;
            return Math.max(0, Number(new FormData(form).get(opts.fieldName) ?? 0));
          },
        },
        {
          action: "cancel",
          label: FranchiseSheet.localize(opts.cancelKey, opts.cancelFallback),
        },
      ],
    });
    if (result === null || result === "cancel" || typeof result !== "number") return null;
    return result;
  }
}
