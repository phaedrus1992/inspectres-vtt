import { findFranchiseActor, franchiseSystemData } from "../franchise/franchise-utils.js";
import { handleActionError } from "../utils/ui-errors.js";
import { promptDistribution } from "../utils/distribution-dialog.js";
import { emitMissionPoolUpdated } from "./socket.js";
import { getCurrentDaySetting } from "../utils/settings-utils.js";

// HandlebarsApplicationMixin provides _renderHTML/_replaceHTML required by ApplicationV2
// for PARTS-based templates. Without it Foundry throws when render() is called.
export class MissionTrackerApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static instance: MissionTrackerApp | null = null;

  static open(): void {
    MissionTrackerApp.instance ??= new MissionTrackerApp();
    const instance = MissionTrackerApp.instance;
    void instance.render({ force: true }).catch((err: unknown) => {
      handleActionError(err, "Failed to open Mission Tracker", "INSPECTRES.ErrorMissionTrackerOpen", "Failed to open Mission Tracker");
      if (MissionTrackerApp.instance === instance) {
        MissionTrackerApp.instance = null;
      }
    });
  }

  static override readonly DEFAULT_OPTIONS: foundry.applications.api.ApplicationV2Options = {
    id: "inspectres-mission-tracker",
    classes: ["inspectres", "inspectres-mission-tracker-window"],
    window: {
      title: "INSPECTRES.MissionTrackerTitle",
      resizable: false,
    },
    position: { width: 360, height: "auto" },
    actions: {
      beginCleanUp: MissionTrackerApp.onBeginCleanUp,
      endEarly: MissionTrackerApp.onEndEarly,
    },
  };

  static override readonly PARTS = {
    sheet: { template: "systems/inspectres/templates/mission-tracker.hbs" },
  };

  override async _prepareContext(_options: foundry.applications.api.ApplicationV2Options): Promise<Record<string, unknown>> {
    const franchise = findFranchiseActor();
    if (!franchise) {
      return { missionPool: 0, missionGoal: 0, progressPercent: 0, missionComplete: false, isGm: game.user?.isGM ?? false, elapsedDays: 0 };
    }
    const system = franchiseSystemData(franchise);
    const missionPool = system.missionPool;
    const missionGoal = system.missionGoal;
    const progressPercent = missionGoal > 0 ? Math.min(100, Math.round((missionPool / missionGoal) * 100)) : 0;
    const missionComplete = missionGoal > 0 && missionPool >= missionGoal;

    const currentDay = getCurrentDaySetting();
    const missionStartDay = system.missionStartDay ?? currentDay;
    const elapsedDays = Math.max(0, currentDay - missionStartDay);

    return { missionPool, missionGoal, progressPercent, missionComplete, isGm: game.user?.isGM ?? false, elapsedDays };
  }

  static async onBeginCleanUp(this: MissionTrackerApp, _event: Event, _target: HTMLElement): Promise<void> {
    if (!(game.user?.isGM ?? false)) return;
    void this.openDistributionDialog().catch((err: unknown) => {
      handleActionError(err, "Distribution dialog failed", "INSPECTRES.ErrorUpdateFailed", "Failed to update actor data");
    });
  }

  static async onEndEarly(this: MissionTrackerApp, _event: Event, _target: HTMLElement): Promise<void> {
    if (!(game.user?.isGM ?? false)) return;
    void this.endEarly().catch((err: unknown) => {
      handleActionError(err, "End mission early failed", "INSPECTRES.ErrorUpdateFailed", "Failed to update actor data");
    });
  }

  private async openDistributionDialog(): Promise<void> {
    const franchise = findFranchiseActor();
    if (!franchise) {
      ui.notifications?.error(
        game.i18n?.localize("INSPECTRES.ErrorNoFranchise") ?? "No franchise actor found.",
      );
      return;
    }
    const system = franchiseSystemData(franchise);
    const total = system.missionPool;
    const players = (game.users?.filter((u) => u.active && !u.isGM) ?? []).map((u) => ({ id: u.id, name: u.name ?? u.id }));

    const distribution = await promptDistribution({ missionPool: total, players });

    if (distribution === null) return;

    // Verify franchise still exists after dialog interaction. If it was deleted,
    // throw error with context instead of returning silently (prevents data loss).
    const refreshedFranchise = findFranchiseActor();
    if (!refreshedFranchise) {
      throw new Error("Franchise actor was deleted while the distribution dialog was open. Distribution cancelled to prevent data loss.");
    }
    const refreshedSystem = franchiseSystemData(refreshedFranchise);
    const refreshedTotal = refreshedSystem.missionPool;

    const distributedTotal = Object.values(distribution).reduce((sum, v) => sum + v, 0);
    if (distributedTotal !== refreshedTotal) {
      const msg = game.i18n?.format("INSPECTRES.DistributeDialogTotalMismatch", { total: String(refreshedTotal) })
        ?? `Total must equal ${refreshedTotal} dice.`;
      if (distributedTotal === total) {
        ui.notifications?.warn(msg);
      } else {
        ui.notifications?.warn(
          game.i18n?.localize("INSPECTRES.DistributeDialogPoolChanged")
            ?? `Mission pool changed from ${total} to ${refreshedTotal} while the dialog was open.`,
        );
      }
      return;
    }

    await this.broadcastMissionComplete(refreshedFranchise, distribution);
  }

  private async broadcastMissionComplete(
    franchise: Actor,
    distribution: Record<string, number>,
  ): Promise<void> {
    const updateData = { "system.missionPool": 0 } as unknown as Parameters<typeof franchise.update>[0];
    await franchise.update(updateData);

    try {
      emitMissionPoolUpdated(franchise.id ?? "");
    } catch (err: unknown) {
      handleActionError(err, "Socket emission failed", "INSPECTRES.ErrorSocketEmissionFailed", "Failed to notify other players");
    }

    const lines = Object.entries(distribution)
      .filter(([, v]) => v > 0)
      .map(([userId, count]) => {
        const user = game.users?.get(userId);
        const name = user?.name ?? userId;
        return `${name}: ${count} ${count === 1 ? (game.i18n?.localize("INSPECTRES.DieSingular") ?? "die") : (game.i18n?.localize("INSPECTRES.DiePlural") ?? "dice")}`;
      });

    const baseMsg = game.i18n?.localize("INSPECTRES.MissionCompleteAnnounce") ?? "The mission is complete! Franchise dice have been distributed.";
    const listItems = lines.map((l) => `<li>${l}</li>`).join("");
    const content = `<p>${baseMsg}</p><ul>${listItems}</ul>`;
    await ChatMessage.create({ content } as unknown as Parameters<typeof ChatMessage.create>[0]);

    if (MissionTrackerApp.instance === this) {
      void this.render().catch((err: unknown) => {
        handleActionError(err, "Mission tracker re-render failed", "INSPECTRES.ErrorMissionTrackerOpen", "Failed to refresh mission tracker");
      });
    }
  }

  private async endEarly(): Promise<void> {
    const franchise = findFranchiseActor();
    if (!franchise) {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.ErrorNoFranchise") ?? "No franchise actor found.");
      return;
    }
    const system = franchiseSystemData(franchise);
    // #268: Keep half of earned dice on premature job end, not zero
    const remaining = Math.floor(system.missionPool / 2);
    const updateData = { "system.missionPool": remaining } as unknown as Parameters<typeof franchise.update>[0];
    await franchise.update(updateData);

    try {
      emitMissionPoolUpdated(franchise.id ?? "");
    } catch (err: unknown) {
      handleActionError(err, "Socket emission failed", "INSPECTRES.ErrorSocketEmissionFailed", "Failed to notify other players");
    }

    const msg = game.i18n?.format("INSPECTRES.MissionEndedEarlyWithHalfDice", { remaining: String(remaining) })
      ?? `The mission ended early. Keeping ${remaining} franchise dice.`;
    await ChatMessage.create({ content: `<p>${msg}</p>` } as unknown as Parameters<typeof ChatMessage.create>[0]);

    if (MissionTrackerApp.instance === this) {
      void this.render().catch((err: unknown) => {
        handleActionError(err, "Mission tracker re-render failed", "INSPECTRES.ErrorMissionTrackerOpen", "Failed to refresh mission tracker");
      });
    }
  }

  override async close(options?: { animate?: boolean }): Promise<foundry.applications.api.ApplicationV2> {
    MissionTrackerApp.instance = null;
    return super.close(options);
  }
}
