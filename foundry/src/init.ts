/**
 * InSpectres Foundry VTT System
 * Entry point: register Hooks, CONFIG patches, and system initialization
 */

import { InSpectresAgent } from "./agent/InSpectresAgent.js";
import { AgentSheet } from "./agent/AgentSheet.js";
import { InSpectresFranchise } from "./franchise/InSpectresFranchise.js";
import { FranchiseSheet } from "./franchise/FranchiseSheet.js";

console.log("InSpectres system initializing...");

Hooks.once("init", () => {
  console.log("InSpectres | System init");

  // Register actor document classes
  CONFIG.Actor.documentClass = InSpectresAgent as any;

  // Register actor type labels
  (CONFIG.Actor.typeLabels as any) = {
    agent: "Agent",
    franchise: "Franchise",
  };

  // Register sheets
  Actors.registerSheet("inspectres", AgentSheet, {
    types: ["agent" as any],
    makeDefault: true,
    label: "Agent Sheet",
  });

  Actors.registerSheet("inspectres", FranchiseSheet, {
    types: ["franchise" as any],
    makeDefault: true,
    label: "Franchise Sheet",
  });
});

Hooks.once("ready", () => {
  console.log("InSpectres | System ready");
});
