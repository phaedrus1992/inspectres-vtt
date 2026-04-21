/**
 * InSpectres Agent Character Sheet
 */

import { type AgentData, type AgentCharacteristic } from "./agent-schema.js";

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

    // Skill roll implementation deferred to Phase 2

    // Cool toggle
    html.on("change", ".weird-checkbox", (event: JQuery.ChangeEvent) => {
      event.preventDefault();
      const updateData = { "system.isWeird": (event.target as HTMLInputElement).checked } as unknown as Parameters<typeof this.actor.update>[0];
      void this.actor.update(updateData).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to toggle weird status:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorUpdateFailed") || "Failed to update actor data");
      });
    });

    // Cool pip toggle (normal agents)
    html.on("click", ".cool-pip", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const valueStr = (event.currentTarget as HTMLElement).getAttribute("data-value");
      if (valueStr == null) {
        console.error("cool-pip: missing data-value attribute");
        return;
      }
      const value = Number(valueStr);
      if (Number.isNaN(value) || value < 0 || value > 3) {
        console.error("cool-pip: invalid data-value", valueStr);
        return;
      }
      const updateData = { "system.cool": value } as unknown as Parameters<typeof this.actor.update>[0];
      void this.actor.update(updateData).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to set cool dice:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorUpdateFailed") || "Failed to update actor data");
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
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorAddCharacteristic") || "Failed to add characteristic");
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
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorRemoveCharacteristic") || "Failed to remove characteristic");
      });
    });
  }
}
