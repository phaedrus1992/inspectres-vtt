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
import "./forms/stress-meter.js";

// Helper to re-render Mission Tracker with error handling
function rerenderMissionTracker(context: string): void {
  if (!MissionTrackerApp.instance) return;
  void MissionTrackerApp.instance.render().catch((err: unknown) => {
    handleActionError(err, `Mission tracker re-render failed (${context})`, "INSPECTRES.ErrorMissionTrackerOpen", "Mission Tracker failed to update");
  });
}

// Re-render any open sheets that display the current day. FranchiseSheet and
// AgentSheet both read `currentDay` in `_prepareContext()` (franchise: day
// counter; agent: recovery banner / days-remaining). A setting change doesn't
// refresh the rendered DOM unless we force a re-render here.
function rerenderDayDependentSheets(context: string): void {
  // @ts-expect-error - fvtt-types doesn't fully type the actors collection iterator
  const actors = (globalThis.game?.actors?.contents ?? []) as Array<{ type?: string; sheet?: { rendered?: boolean; render: (force?: boolean) => Promise<unknown> } }>;
  for (const actor of actors) {
    if (actor.type !== "franchise" && actor.type !== "agent") continue;
    const sheet = actor.sheet;
    if (!sheet?.rendered) continue;
    void sheet.render(false).catch((err: unknown) => {
      handleActionError(err, `${actor.type} sheet re-render failed (${context})`, "INSPECTRES.ErrorSheetRender", "Sheet failed to update");
    });
  }
}

// Foundry v13/v14 bug: form submit events from ApplicationV2 sheets, DialogV2 dialogs,
// and Enter-keypresses inside form inputs are not always preventDefault'd by the framework,
// causing the browser to perform a real form submission and navigate to /join. Install two
// layers of protection at module load (before any sheet renders):
//
// 1. Document-level capture-phase listener intercepts submit *events* before they reach
//    the browser's default action. Works for event-driven submissions (Enter key, click on
//    type="submit" button).
// 2. Override HTMLFormElement.prototype.submit() to no-op. Foundry v13's ApplicationV2 in
//    some paths calls form.submit() programmatically — this does NOT dispatch a submit
//    event, so the capture-phase listener never sees it. Overriding the method itself stops
//    the navigation regardless of how it was triggered.
//
// actor.update() and all form-data extraction (new FormData(form)) are unaffected because
// they don't call form.submit() — they read fields directly.
document.addEventListener("submit", (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
}, { capture: true });

const originalSubmit = HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit = function (this: HTMLFormElement): void {
  // Swallow programmatic submits to prevent /join navigation. If a legitimate use case
  // arises later (e.g. a real external form posting to a server), gate this on a data
  // attribute like form.dataset.allowSubmit === "true".
  void originalSubmit;
};

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
          // Re-render any open franchise sheets so the displayed day matches
          rerenderDayDependentSheets("day change");
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
