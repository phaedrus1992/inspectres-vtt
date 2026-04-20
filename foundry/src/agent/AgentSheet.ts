/**
 * InSpectres Agent Character Sheet
 */

import type { AgentData, AgentCharacteristic } from "./agent-schema.js";

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
    const system = this.actor.system as unknown as AgentData;

    // Roll buttons
    html.on("click", "[data-action='skillRoll']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const skill = (event.currentTarget as HTMLElement).getAttribute("data-skill");
      if (skill) {
        // Skill roll implementation deferred to Phase 2
      }
    });

    // Cool toggle
    html.on("change", ".weird-checkbox", (event: JQuery.ChangeEvent) => {
      event.preventDefault();
      const updateData = { "system.isWeird": (event.target as HTMLInputElement).checked } as unknown as Parameters<typeof this.actor.update>[0];
      void this.actor.update(updateData);
    });

    // Cool pip toggle (normal agents)
    html.on("click", ".cool-pip", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const value = parseInt((event.currentTarget as HTMLElement).getAttribute("data-value") || "0");
      const updateData = { "system.cool": value } as unknown as Parameters<typeof this.actor.update>[0];
      void this.actor.update(updateData);
    });

    // Add characteristic
    html.on("click", "[data-action='addCharacteristic']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const characteristics = (system.characteristics || []) as AgentCharacteristic[];
      const updateData = { "system.characteristics": [...characteristics, { text: "", used: false }] } as unknown as Parameters<typeof this.actor.update>[0];
      void this.actor.update(updateData);
    });

    // Remove characteristic
    html.on("click", "[data-action='removeCharacteristic']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const idx = parseInt((event.currentTarget as HTMLElement).getAttribute("data-idx") || "-1");
      if (idx >= 0) {
        const characteristics = (system.characteristics || []) as AgentCharacteristic[];
        const updateData = { "system.characteristics": characteristics.filter((_: AgentCharacteristic, i: number) => i !== idx) } as unknown as Parameters<typeof this.actor.update>[0];
        void this.actor.update(updateData);
      }
    });
  }
}
