import { type FranchiseData } from "./franchise-schema.js";
import { executeBankRoll, executeClientRoll } from "../rolls/roll-executor.js";
import { MissionTrackerApp } from "../mission/MissionTrackerApp.js";
import { handleActionError } from "../utils/ui-errors.js";
import { activateTabs } from "../utils/sheet-tabs.js";
import { enterDebtMode, attemptLoanRepayment } from "./bankruptcy-handler.js";
import { emitMissionPoolUpdated } from "../mission/socket.js";
import { getCurrentDaySetting, setCurrentDaySetting } from "../utils/settings-utils.js";
import { applyEndOfSessionBonuses, initiateBankruptcyRestart, type EndOfSessionContext } from "./vacation-automation.js";

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
      advanceDay: FranchiseSheet.onAdvanceDay,
      regressDay: FranchiseSheet.onRegressDay,
      beginVacation: FranchiseSheet.onBeginVacation,
      applyHazardPay: FranchiseSheet.onApplyHazardPay,
      restartBankruptcy: FranchiseSheet.onRestartBankruptcy,
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
    const currentDay = getCurrentDaySetting();
    return { ...base, system, isGm, missionComplete, currentDay };
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
    void FranchiseSheet.toggleFlag.call(this, "system.debtMode", system.debtMode).catch((err: unknown) => {
      handleActionError(err, "Toggle debt mode failed", "INSPECTRES.ErrorToggleDebtModeFailed", "Failed to toggle debt mode");
    });
  }

  static async onToggleCardsLocked(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    const system = this.actor.system as unknown as FranchiseData;
    void FranchiseSheet.toggleFlag.call(this, "system.cardsLocked", system.cardsLocked).catch((err: unknown) => {
      handleActionError(err, "Toggle cards locked failed", "INSPECTRES.ErrorToggleCardsLockedFailed", "Failed to toggle cards locked");
    });
  }

  static async onAttemptRepayment(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable) return;
    const system = this.actor.system as unknown as FranchiseData;
    if (!system.debtMode) {
      ui.notifications?.warn(FranchiseSheet.localize("INSPECTRES.InfoNotInDebt", "Franchise is not in debt."));
      return;
    }

    const earnedInput = await FranchiseSheet.promptNumberInput({
      title: FranchiseSheet.localize("INSPECTRES.DialogRepaymentTitle", "Loan Repayment"),
      label: FranchiseSheet.localize("INSPECTRES.EarnedDiceThisMission", "Earned Dice This Mission"),
      fieldName: "earnedDice",
      confirmLabel: FranchiseSheet.localize("INSPECTRES.ButtonAttemptRepayment", "Attempt Repayment"),
      cancelLabel: FranchiseSheet.localize("INSPECTRES.Cancel", "Cancel"),
    });

    if (earnedInput === null) return;

    void attemptLoanRepayment(this.actor, earnedInput).catch((err: unknown) => {
      handleActionError(err, "Loan repayment failed", "INSPECTRES.ErrorRepaymentFailed", "Loan repayment failed");
    });
  }

  static async onAdvanceDay(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable || !(game.user?.isGM ?? false)) return;
    const currentDay = getCurrentDaySetting();
    const nextDay = currentDay + 1;
    void setCurrentDaySetting(nextDay).catch((err: unknown) => {
      handleActionError(err, "Day advance failed", "INSPECTRES.ErrorDayAdvanceFailed", "Failed to advance day");
    });
  }

  static async onRegressDay(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable || !(game.user?.isGM ?? false)) return;
    const currentDay = getCurrentDaySetting();
    const prevDay = Math.max(1, currentDay - 1);
    void setCurrentDaySetting(prevDay).catch((err: unknown) => {
      handleActionError(err, "Day regress failed", "INSPECTRES.ErrorDayRegressFailed", "Failed to revert day");
    });
  }

  static async onBeginVacation(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable || !(game.user?.isGM ?? false)) return;
    const system = this.actor.system as unknown as FranchiseData;
    if (system.missionPool === 0) {
      ui.notifications?.warn(FranchiseSheet.localize("INSPECTRES.WarnNoMissionPool", "No mission pool to distribute."));
      return;
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: FranchiseSheet.localize("INSPECTRES.ConfirmVacationTitle", "Begin Vacation") },
      content: FranchiseSheet.localize("INSPECTRES.ConfirmVacationBody", "End mission and begin vacation? This will open the distribution dialog."),
    });

    if (!confirmed) return;

    void FranchiseSheet.openDistributionDialog.call(this).catch((err: unknown) => {
      handleActionError(err, "Distribution dialog failed", "INSPECTRES.ErrorUpdateFailed", "Failed to open distribution dialog");
    });
  }

  private static async openDistributionDialog(this: FranchiseSheet): Promise<void> {
    const system = this.actor.system as unknown as FranchiseData;
    const total = system.missionPool;
    const players = game.users?.filter((u) => u.active && !u.isGM) ?? [];

    const playerInputs = players
      .map((u) => `<label>${u.name ?? u.id}: <input type="number" name="player-${u.id}" min="0" value="0" /></label>`)
      .join("\n");

    const instruction = game.i18n?.format("INSPECTRES.DistributeDialogInstruction", { total: String(total) })
      ?? `Assign ${total} franchise dice among players.`;

    const content = `
      <form class="inspectres-distribute-dialog">
        <p>${instruction}</p>
        ${playerInputs || "<p>No active players.</p>"}
      </form>
    `;

    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n?.localize("INSPECTRES.DistributeDialogTitle") ?? "Distribute Mission Dice" },
      rejectClose: false,
      content,
      buttons: [
        {
          action: "confirm",
          label: game.i18n?.localize("INSPECTRES.DistributeDialogConfirm") ?? "Confirm",
          default: true,
          callback: (_event: Event, _button: HTMLButtonElement, dialog: HTMLDialogElement) => {
            const form = dialog.querySelector("form") as HTMLFormElement | null;
            if (!form) return null;
            const data = new FormData(form);
            const distribution: Record<string, number> = {};
            for (const user of players) {
              const raw = Number(data.get(`player-${user.id}`) ?? 0);
              distribution[user.id] = isNaN(raw) ? 0 : Math.max(0, raw);
            }
            return distribution;
          },
        },
        {
          action: "cancel",
          label: game.i18n?.localize("INSPECTRES.DistributeDialogCancel") ?? "Cancel",
          callback: () => null,
        },
      ],
    });

    if (result === null || result === undefined) return;
    const distribution = result as Record<string, number>;

    const refreshedSystem = this.actor.system as unknown as FranchiseData;
    const refreshedTotal = refreshedSystem.missionPool;
    const distributedTotal = Object.values(distribution).reduce((sum, v) => sum + v, 0);

    if (distributedTotal !== refreshedTotal) {
      const msg = game.i18n?.format("INSPECTRES.DistributeDialogTotalMismatch", { total: String(refreshedTotal) })
        ?? `Total must equal ${refreshedTotal} dice.`;
      ui.notifications?.warn(msg);
      return;
    }

    const updateData = { "system.missionPool": 0, "system.missionGoal": 0, "system.missionStartDay": 0 } as unknown as Parameters<typeof this.actor.update>[0];
    await this.actor.update(updateData);

    emitMissionPoolUpdated(this.actor.id ?? "");

    const lines = Object.entries(distribution)
      .filter(([, v]) => v > 0)
      .map(([userId, count]) => {
        const user = game.users?.get(userId);
        const name = user?.name ?? userId;
        return `${name}: ${count} ${count === 1 ? (game.i18n?.localize("INSPECTRES.DieSingular") ?? "die") : (game.i18n?.localize("INSPECTRES.DiePlural") ?? "dice")}`;
      });

    const baseMsg = game.i18n?.localize("INSPECTRES.MissionCompleteAnnounce") ?? "The mission is complete! Franchise dice have been distributed.";
    const content2 = `<p>${baseMsg}</p><ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
    await ChatMessage.create({ content: content2 } as unknown as Parameters<typeof ChatMessage.create>[0]);
  }

  static async onApplyHazardPay(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable || !(game.user?.isGM ?? false)) return;
    const allActors = Array.from(game.actors ?? []);
    const agentActors: Actor[] = [];
    const nonWeirdAgents: Actor[] = [];
    for (const actor of allActors) {
      if ((actor as unknown as Record<string, unknown>)["type"] === "agent") {
        agentActors.push(actor);
        const sys = actor.system as unknown as Record<string, unknown>;
        if (!(sys["isWeird"] ?? false)) {
          nonWeirdAgents.push(actor);
        }
      }
    }
    const context = {
      franchiseActor: this.actor,
      deathMode: (this.actor.system as unknown as FranchiseData).deathMode,
      agentCount: agentActors.length,
      nonWeirdAgentCount: nonWeirdAgents.length,
    };
    void applyEndOfSessionBonuses(context).catch((err: unknown) => {
      handleActionError(err, "Hazard pay failed", "INSPECTRES.ErrorApplyHazardPayFailed", "Failed to apply hazard pay");
    });
  }

  static async onRestartBankruptcy(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    if (!this.isEditable || !(game.user?.isGM ?? false)) return;
    void initiateBankruptcyRestart(this.actor).catch((err: unknown) => {
      handleActionError(err, "Bankruptcy restart failed", "INSPECTRES.ErrorRestartBankruptcyFailed", "Failed to restart bankruptcy");
    });
  }

  private static localize(key: string, fallback: string): string {
    return game.i18n?.localize(key) ?? fallback;
  }

  private static async toggleFlag(this: FranchiseSheet, field: string, current: boolean): Promise<void> {
    if (!this.isEditable || !game.user?.isGM) return;
    const updateData = { [field]: !current } as unknown as Parameters<typeof this.actor.update>[0];
    await this.actor.update(updateData);
  }

  private static async promptNumberInput(opts: {
    title: string;
    label: string;
    fieldName: string;
    confirmLabel: string;
    cancelLabel: string;
  }): Promise<number | null> {
    try {
      const result = await foundry.applications.api.DialogV2.wait({
        window: { title: opts.title },
        content: `
          <form>
            <div class="form-group">
              <label for="${opts.fieldName}">${opts.label}</label>
              <input type="number" name="${opts.fieldName}" id="${opts.fieldName}" min="0" value="0" required />
            </div>
          </form>
        `,
        buttons: [
          {
            action: "confirm",
            label: opts.confirmLabel,
            default: true,
            callback: (_event, _button, dialog) => {
              const form = dialog.querySelector("form");
              return Math.max(0, Number(new FormData(form ?? undefined).get(opts.fieldName) ?? 0));
            },
          },
          { action: "cancel", label: opts.cancelLabel },
        ],
      });
      if (result === null || result === "cancel" || typeof result !== "number") return null;
      return result;
    } catch (err: unknown) {
      handleActionError(err, "Repayment dialog failed", "INSPECTRES.ErrorRepaymentDialogFailed", "Repayment dialog failed");
      return null;
    }
  }
}
