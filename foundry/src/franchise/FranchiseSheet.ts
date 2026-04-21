/**
 * InSpectres Franchise Sheet
 */

import type { FranchiseData } from "./franchise-schema.js";

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

    // Bank roll button
    html.on("click", "[data-action='bankRoll']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      // Bank roll implementation deferred to Phase 2
    });

    // Mission tracker button
    html.on("click", "[data-action='openMissionTracker']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      // Mission tracker implementation deferred to Phase 2
    });
  }
}
