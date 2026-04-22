/**
 * InSpectres Foundry VTT System
 * Entry point: register Hooks, CONFIG patches, and system initialization
 */

import { InSpectresAgent } from "./agent/InSpectresAgent.js";
import { AgentSheet } from "./agent/AgentSheet.js";
import { InSpectresFranchise } from "./franchise/InSpectresFranchise.js";
import { FranchiseSheet } from "./franchise/FranchiseSheet.js";
import { AgentDataModel } from "./data/AgentDataModel.js";
import { FranchiseDataModel } from "./data/FranchiseDataModel.js";
import { registerHandlebarsHelpers } from "./utils/handlebars-helpers.js";
import { MissionTrackerApp } from "./mission/MissionTrackerApp.js";
import { onMissionSocketEvent } from "./mission/socket.js";
import { handleActionError } from "./utils/ui-errors.js";

Hooks.once("init", async function () {
  try {
    await loadTemplates([
      "systems/inspectres/templates/agent-sheet.hbs",
      "systems/inspectres/templates/franchise-sheet.hbs",
      "systems/inspectres/templates/roll-card.hbs",
      "systems/inspectres/templates/mission-tracker.hbs",
    ]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to load templates:", message);
    ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorTemplateLoad") ?? `Template load failed: ${message}`);
  }

  // Register TypeDataModel classes — provides server-side validation and typed actor.system
  // fvtt-types v13: CONFIG.Actor.dataModels not typed; cast through unknown to assign
  (CONFIG.Actor as unknown as { dataModels: Record<string, unknown> }).dataModels = {
    agent: AgentDataModel,
    franchise: FranchiseDataModel,
  };

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

  // Register sheets — cast needed because fvtt-types' registerSheet expects V1 constructor type
  Actors.registerSheet("inspectres", AgentSheet as never, {
    types: ["agent" as never],
    makeDefault: true,
    label: "INSPECTRES.SheetAgent",
  });

  Actors.registerSheet("inspectres", FranchiseSheet as never, {
    types: ["franchise" as never],
    makeDefault: true,
    label: "INSPECTRES.SheetFranchise",
  });
});

// The Create Actor dialog defaults to a fixed height too small to show all fields.
// renderDialogV2 fires for ApplicationV2-based dialogs (Foundry V13+).
// Match on the select[name="type"] presence — unique to document-creation dialogs.
// setPosition must be used instead of style.height because Foundry calls setPosition after
// the hook fires and would overwrite any inline style change.
Hooks.on("renderDialogV2", function (app, html: HTMLElement) {
  if (html.querySelector("select[name='type']")) {
    // fvtt-types types the hook's app param as Any; cast through unknown to call setPosition
    (app as unknown as foundry.applications.api.ApplicationV2).setPosition({ height: "auto" });
  }
});

Hooks.once("ready", function () {
  onMissionSocketEvent(() => {
    if (MissionTrackerApp.instance) {
      void MissionTrackerApp.instance.render().catch((err: unknown) => {
        handleActionError(err, "Mission tracker re-render failed (socket event)", "INSPECTRES.ErrorMissionTrackerOpen", "Mission Tracker failed to update");
      });
    }
  });
});

Hooks.on("updateActor", function (actor: Actor) {
  if ((actor.type as string) === "franchise" && MissionTrackerApp.instance) {
    void MissionTrackerApp.instance.render().catch((err: unknown) => {
      handleActionError(err, "Mission tracker re-render failed (actor update)", "INSPECTRES.ErrorMissionTrackerOpen", "Mission Tracker failed to update");
    });
  }
});
