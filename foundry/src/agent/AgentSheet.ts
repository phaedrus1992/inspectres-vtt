/**
 * InSpectres Agent Character Sheet
 */

import { InSpectresAgent } from "./InSpectresAgent.js";

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
    return {
      ...context,
      system: (this.actor as any).system,
    };
  }

  override activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);

    // Roll buttons
    html.on("click", "[data-action='skillRoll']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const skill = (event.currentTarget as HTMLElement).getAttribute("data-skill");
      if (skill) {
        console.log("Skill roll requested:", skill);
      }
    });

    // Cool toggle
    html.on("change", ".weird-checkbox", (event: JQuery.ChangeEvent) => {
      event.preventDefault();
      (this.actor as any).update({
        "system.isWeird": (event.target as HTMLInputElement).checked,
      });
    });

    // Cool pip toggle (normal agents)
    html.on("click", ".cool-pip", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const value = parseInt((event.currentTarget as HTMLElement).getAttribute("data-value") || "0");
      (this.actor as any).update({
        "system.cool": value,
      });
    });

    // Add characteristic
    html.on("click", "[data-action='addCharacteristic']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const system = (this.actor as any).system;
      const characteristics = (system.characteristics || []) as Array<{ text: string; used: boolean }>;
      (this.actor as any).update({
        "system.characteristics": [...characteristics, { text: "", used: false }],
      });
    });

    // Remove characteristic
    html.on("click", "[data-action='removeCharacteristic']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      const idx = parseInt((event.currentTarget as HTMLElement).getAttribute("data-idx") || "-1");
      if (idx >= 0) {
        const system = (this.actor as any).system;
        const characteristics = (system.characteristics || []) as Array<unknown>;
        (this.actor as any).update({
          "system.characteristics": characteristics.filter((_: unknown, i: number) => i !== idx),
        });
      }
    });
  }
}
