/**
 * InSpectres Foundry VTT System
 * Entry point: register Hooks, CONFIG patches, and system initialization
 */

import { InSpectresAgent } from "./agent/InSpectresAgent.js";
import { AgentSheet } from "./agent/AgentSheet.js";
import { InSpectresFranchise } from "./franchise/InSpectresFranchise.js";
import { FranchiseSheet } from "./franchise/FranchiseSheet.js";
import { registerHandlebarsHelpers } from "./utils/handlebars-helpers.js";

Hooks.once("init", async function () {
  await loadTemplates([
    "systems/inspectres/templates/agent-sheet.hbs",
    "systems/inspectres/templates/franchise-sheet.hbs",
    "systems/inspectres/templates/roll-card.hbs",
  ]);
  // Register actor document classes
  // Note: Foundry V12+ supports documentClasses for per-type registration, but fvtt-types
  // may not reflect this. Using a workaround: set documentClass to Agent and register
  // sheets for both types. A future improvement is to use TypeDataModel for proper
  // type separation.
  (CONFIG.Actor.documentClass as typeof InSpectresAgent | typeof InSpectresFranchise) = InSpectresAgent;

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

Hooks.once("ready", function () {
  // System ready for play
});

