import { type FranchiseData } from "./franchise-schema.js";
import { executeBankRoll, executeClientRoll } from "../rolls/roll-executor.js";
import { MissionTrackerApp } from "../mission/MissionTrackerApp.js";

export class FranchiseSheet extends ActorSheet {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["inspectres", "sheet", "actor", "franchise"],
      template: "systems/inspectres/templates/franchise-sheet.hbs",
      width: 600,
      height: 600,
    });
  }

  override async getData() {
    const context = await super.getData();
    const system = this.actor.system as unknown as FranchiseData;
    const isGm = game.user?.isGM ?? false;
    const missionComplete = system.missionGoal > 0 && system.missionPool >= system.missionGoal;
    return {
      ...context,
      system,
      isGm,
      missionComplete,
    };
  }

  override activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);

    html.on("click", "[data-action='bankRoll']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
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
    });

    html.on("click", "[data-action='clientRoll']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const clientSystem = this.actor.system as unknown as FranchiseData;
      if (clientSystem.debtMode) {
        ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnClientRollDebtMode") ?? "Client rolls are disabled in Debt Mode.");
        return;
      }
      void executeClientRoll(this.actor).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Client roll failed:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorRollFailed") ?? "Roll failed");
      });
    });

    html.on("click", "[data-action='openMissionTracker']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      MissionTrackerApp.open();
    });
  }
}
