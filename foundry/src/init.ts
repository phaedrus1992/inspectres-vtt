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
import { autoClearRecoveredAgents } from "./agent/recovery-utils.js";
import { validateAndFixCoolCap } from "./agent/agent-system-data.js";

// Helper to re-render Mission Tracker with error handling
function rerenderMissionTracker(context: string): void {
  if (!MissionTrackerApp.instance) return;
  void MissionTrackerApp.instance.render().catch((err: unknown) => {
    handleActionError(err, `Mission tracker re-render failed (${context})`, "INSPECTRES.ErrorMissionTrackerOpen", "Mission Tracker failed to update");
  });
}

Hooks.once("init", async function () {
  try {
    await foundry.applications.handlebars.loadTemplates([
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

  // Register game settings — cast needed because fvtt-types only knows core settings
  const settingsRegistry = game.settings as unknown as { register: (namespace: string, key: string, data: unknown) => void };

  settingsRegistry.register("inspectres", "currentDay", {
    name: "INSPECTRES.SettingCurrentDay",
    hint: "INSPECTRES.SettingCurrentDayHint",
    scope: "world",
    config: true,
    type: Number,
    default: 1,
    onChange: (newDay: unknown) => {
      if (typeof newDay !== "number") return;
      if (!Number.isInteger(newDay) || newDay < 1) {
        console.warn("[INSPECTRES] Invalid currentDay value; ignoring:", { newDay });
        return;
      }
      void (async () => {
        try {
          const result = await autoClearRecoveredAgents(newDay);
          if (result.failed > 0) {
            console.warn("[INSPECTRES] Some agents failed to auto-clear recovery:", result);
            if (ui.notifications) {
              ui.notifications.warn(game.i18n?.localize("INSPECTRES.ErrorPartialRecoveryFailed") ?? "Some agents failed to clear recovery state");
            }
          }
          // Re-render mission tracker to show updated elapsed days
          rerenderMissionTracker("day change");
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[INSPECTRES] Auto-clear recovered agents failed:", { newDay, error: err, errorMessage: message });
          if (ui.notifications) {
            ui.notifications.error(game.i18n?.localize("INSPECTRES.ErrorAutoRecoverFailed") ?? "Auto-recovery update failed");
          }
        }
      })();
    },
  });

  settingsRegistry.register("inspectres", "devMode", {
    name: "INSPECTRES.SettingDevMode",
    hint: "INSPECTRES.SettingDevModeHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  // Register sheets — cast needed because fvtt-types' registerSheet expects V1 constructor type
  foundry.documents.collections.Actors.registerSheet("inspectres", AgentSheet as never, {
    types: ["agent" as never],
    makeDefault: true,
    label: "INSPECTRES.SheetAgent",
  });

  foundry.documents.collections.Actors.registerSheet("inspectres", FranchiseSheet as never, {
    types: ["franchise" as never],
    makeDefault: true,
    label: "INSPECTRES.SheetFranchise",
  });
});

Hooks.once("ready", function () {
  onMissionSocketEvent(() => {
    rerenderMissionTracker("socket event");
  });
  // #282: Validate Cool cap for all loaded agents (post-load enforcement) — GM only
  if (game.user?.isGM ?? false) {
    void (async () => {
      const failedAgents: string[] = [];
      for (const actor of game.actors ?? []) {
        if ((actor.type as string) !== "agent") continue;
        const updates = validateAndFixCoolCap(actor);
        if (updates) {
          try {
            await actor.update(updates);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`[INSPECTRES] Failed to fix Cool cap for ${actor.name}:`, message);
            failedAgents.push(actor.name ?? "Unknown Agent");
          }
        }
      }
      if (failedAgents.length > 0) {
        const names = failedAgents.join(", ");
        console.warn(`[INSPECTRES] Cool cap enforcement incomplete for: ${names}`);
        ui.notifications?.warn(`Failed to verify Cool cap for: ${names}`);
      }
    })();
  }
});

Hooks.on("updateActor", function (actor: Actor) {
  if ((actor.type as string) === "franchise") {
    rerenderMissionTracker("actor update");
  }
});
