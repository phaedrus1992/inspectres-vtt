/**
 * InSpectres Foundry VTT System
 * Entry point: register Hooks, CONFIG patches, and system initialization
 */

import { InSpectresAgent } from "./agent/InSpectresAgent.js";
import { AgentSheet } from "./agent/AgentSheet.js";
import { InSpectresFranchise } from "./franchise/InSpectresFranchise.js";
import { FranchiseSheet } from "./franchise/FranchiseSheet.js";
import { registerHandlebarsHelpers } from "./utils/handlebars-helpers.js";
import { MissionTrackerApp } from "./mission/MissionTrackerApp.js";
import { onMissionSocketEvent } from "./mission/socket.js";

Hooks.once("init", async function () {
  await loadTemplates([
    "systems/inspectres/templates/agent-sheet.hbs",
    "systems/inspectres/templates/franchise-sheet.hbs",
    "systems/inspectres/templates/roll-card.hbs",
    "systems/inspectres/templates/mission-tracker.hbs",
  ]);
  // Register per-type actor document classes (Foundry V12+)
  // fvtt-types doesn't know about documentClasses; cast through unknown to assign
  (CONFIG.Actor as unknown as { documentClasses: Record<string, typeof Actor> }).documentClasses = {
    agent: InSpectresAgent as unknown as typeof Actor,
    franchise: InSpectresFranchise as unknown as typeof Actor,
  };

  // Register actor type labels
  (CONFIG.Actor.typeLabels as Record<string, string>) = {
    agent: "INSPECTRES.ActorTypeAgent",
    franchise: "INSPECTRES.ActorTypeFranchise",
  };

  // Register Handlebars helpers
  registerHandlebarsHelpers();

  // Register sheets
  Actors.registerSheet("inspectres", AgentSheet, {
    types: ["agent" as never],
    makeDefault: true,
    label: "INSPECTRES.SheetAgent",
  });

  Actors.registerSheet("inspectres", FranchiseSheet, {
    types: ["franchise" as never],
    makeDefault: true,
    label: "INSPECTRES.SheetFranchise",
  });
});

// The Create Actor dialog defaults to a fixed height too small to show all fields.
// renderDialogV2 fires for ApplicationV2-based dialogs (Foundry V12+).
// Match on the select[name="type"] presence — unique to document-creation dialogs.
Hooks.on("renderDialogV2", function (_app, html: HTMLElement) {
  if (html.querySelector("select[name='type']")) {
    html.style.height = "auto";
  }
});

Hooks.once("ready", function () {
  onMissionSocketEvent(() => {
    if (MissionTrackerApp.instance) {
      // fvtt-types types render() as Application, but runtime returns Promise<Application>
      void (MissionTrackerApp.instance.render(false) as unknown as Promise<unknown>).catch((err: unknown) => {
        console.error("Mission tracker re-render failed (socket event):", err);
      });
    }
  });
});

Hooks.on("updateActor", function (actor: Actor) {
  if ((actor.type as string) === "franchise" && MissionTrackerApp.instance) {
    // fvtt-types types render() as Application, but runtime returns Promise<Application>
    void (MissionTrackerApp.instance.render(false) as unknown as Promise<unknown>).catch((err: unknown) => {
      console.error("Mission tracker re-render failed (actor update):", err);
    });
  }
});

