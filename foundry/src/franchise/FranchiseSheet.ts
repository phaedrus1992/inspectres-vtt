import { type FranchiseData } from "./franchise-schema.js";
import { executeBankRoll, executeClientRoll } from "../rolls/roll-executor.js";
import { MissionTrackerApp } from "../mission/MissionTrackerApp.js";

export class FranchiseSheet extends foundry.applications.sheets.ActorSheetV2 {
  static override DEFAULT_OPTIONS = {
    classes: ["inspectres", "sheet", "actor", "franchise"],
    position: { width: 600, height: 600 as number | "auto" },
    actions: {
      bankRoll: FranchiseSheet.onBankRoll,
      clientRoll: FranchiseSheet.onClientRoll,
      openMissionTracker: FranchiseSheet.onOpenMissionTracker,
    },
  };

  static override PARTS = {
    sheet: { template: "systems/inspectres/templates/franchise-sheet.hbs" },
  };

  override async _prepareContext(_options: foundry.applications.api.ApplicationV2Options): Promise<Record<string, unknown>> {
    const base = await super._prepareContext(_options);
    const system = this.actor.system as unknown as FranchiseData;
    const isGm = game.user?.isGM ?? false;
    const missionComplete = system.missionGoal > 0 && system.missionPool >= system.missionGoal;
    return { ...base, system, isGm, missionComplete };
  }

  static async onBankRoll(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    const system = this.actor.system as unknown as FranchiseData;
    if (system.debtMode) {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnBankRollDebtMode") ?? "Bank rolls are disabled in Debt Mode.");
      return;
    }
    void executeBankRoll(this.actor).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Bank roll failed:", message);
      ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorRollFailed") ?? "Roll failed");
    });
  }

  static async onClientRoll(this: FranchiseSheet, _event: Event, _target: HTMLElement): Promise<void> {
    const system = this.actor.system as unknown as FranchiseData;
    if (system.debtMode) {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnClientRollDebtMode") ?? "Client rolls are disabled in Debt Mode.");
      return;
    }
    void executeClientRoll(this.actor).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Client roll failed:", message);
      ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorRollFailed") ?? "Roll failed");
    });
  }

  static onOpenMissionTracker(_event: Event, _target: HTMLElement): void {
    MissionTrackerApp.open();
  }
}
