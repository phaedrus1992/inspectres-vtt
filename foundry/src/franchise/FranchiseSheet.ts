/**
 * InSpectres Franchise Sheet
 */

import { type FranchiseData } from "./franchise-schema.js";
import { executeBankRoll, executeClientRoll } from "../rolls/roll-executor.js";

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
    return {
      ...context,
      system,
    };
  }

  override activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);

    html.on("click", "[data-action='bankRoll']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      void executeBankRoll(this.actor).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Bank roll failed:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorRollFailed") ?? "Roll failed");
      });
    });

    html.on("click", "[data-action='clientRoll']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      void executeClientRoll(this.actor).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Client roll failed:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorRollFailed") ?? "Roll failed");
      });
    });
  }
}
