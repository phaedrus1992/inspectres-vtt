/**
 * InSpectres Franchise Sheet
 */

import { InSpectresFranchise } from "./InSpectresFranchise.js";

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
    return {
      ...context,
      system: (this.actor as any).system,
    };
  }

  override activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);

    // Bank roll button
    html.on("click", "[data-action='bankRoll']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      console.log("Bank roll requested");
    });

    // Mission tracker button
    html.on("click", "[data-action='openMissionTracker']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      console.log("Mission tracker requested");
    });
  }
}
