/**
 * InSpectres Foundry VTT System
 * Entry point: register Hooks, CONFIG patches, and system initialization
 */

import { InSpectresAgent } from "./agent/InSpectresAgent.js";
import { AgentSheet } from "./agent/AgentSheet.js";
import { InSpectresFranchise } from "./franchise/InSpectresFranchise.js";
import { FranchiseSheet } from "./franchise/FranchiseSheet.js";
import { registerHandlebarsHelpers } from "./utils/handlebars-helpers.js";

Hooks.once("init", () => {
  // Register actor document classes
  (CONFIG.Actor.documentClass as typeof InSpectresAgent) = InSpectresAgent;

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

Hooks.once("ready", () => {
  // System ready for play
});
