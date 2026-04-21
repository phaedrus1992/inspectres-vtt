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

// The Create Actor dialog clips the Type dropdown. Force the app window tall
// enough to show all fields whenever a dialog contains an actor-type select.
Hooks.on("renderDialog", function (_dialog: Dialog, html: JQuery) {
  if (html.find("select[name='type']").length && html.find("input[name='name']").length) {
    html.closest(".app.dialog").css({ "min-height": "200px" });
  }
});

Hooks.once("ready", function () {
  onMissionSocketEvent(() => {
    if (MissionTrackerApp.instance) {
      MissionTrackerApp.instance.render(false);
    }
  });
});

Hooks.on("updateActor", function (actor: Actor) {
  if ((actor.type as string) === "franchise" && MissionTrackerApp.instance) {
    MissionTrackerApp.instance.render(false);
  }
});

