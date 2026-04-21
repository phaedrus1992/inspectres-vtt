import { findFranchiseActor, franchiseSystemData } from "../franchise/franchise-utils.js";
import { handleActionError } from "../utils/ui-errors.js";

export class MissionTrackerApp extends foundry.applications.api.ApplicationV2 {
  static instance: MissionTrackerApp | null = null;

  static open(): void {
    if (!MissionTrackerApp.instance) {
      MissionTrackerApp.instance = new MissionTrackerApp();
    }
    void MissionTrackerApp.instance.render({ force: true }).catch((err: unknown) => {
      handleActionError(err, "Failed to open Mission Tracker", "INSPECTRES.ErrorMissionTrackerOpen", "Failed to open Mission Tracker");
      MissionTrackerApp.instance = null;
    });
  }

  static override DEFAULT_OPTIONS: foundry.applications.api.ApplicationV2Options = {
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

  static override PARTS = {
    sheet: { template: "systems/inspectres/templates/mission-tracker.hbs" },
  };

  override async _prepareContext(_options: foundry.applications.api.ApplicationV2Options): Promise<Record<string, unknown>> {
    const franchise = findFranchiseActor();
    if (!franchise) {
      return { missionPool: 0, missionGoal: 0, progressPercent: 0, missionComplete: false, isGm: game.user?.isGM ?? false };
    }
    const system = franchiseSystemData(franchise);
    const missionPool = system.missionPool;
    const missionGoal = system.missionGoal;
    const progressPercent = missionGoal > 0 ? Math.min(100, Math.round((missionPool / missionGoal) * 100)) : 0;
    const missionComplete = missionGoal > 0 && missionPool >= missionGoal;
    return { missionPool, missionGoal, progressPercent, missionComplete, isGm: game.user?.isGM ?? false };
  }

  static async onBeginCleanUp(this: MissionTrackerApp, _event: Event, _target: HTMLElement): Promise<void> {
    void this.openDistributionDialog().catch((err: unknown) => {
      handleActionError(err, "Distribution dialog failed", "INSPECTRES.ErrorRollFailed", "Operation failed");
    });
  }

  static async onEndEarly(this: MissionTrackerApp, _event: Event, _target: HTMLElement): Promise<void> {
    void this.endEarly().catch((err: unknown) => {
      handleActionError(err, "End mission early failed", "INSPECTRES.ErrorUpdateFailed", "Failed to update actor data");
    });
  }

  private async openDistributionDialog(): Promise<void> {
    const franchise = findFranchiseActor();
    if (!franchise) {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.ErrorNoFranchise") ?? "No franchise actor found.");
      return;
    }
    const system = franchiseSystemData(franchise);
    const total = system.missionPool;
    const players = game.users?.filter((u) => u.active && !u.isGM) ?? [];

    const playerInputs = players
      .map((u) => `<label>${u.name ?? u.id}: <input type="number" name="player-${u.id}" min="0" value="0" /></label>`)
      .join("\n");

    const instruction = game.i18n?.format("INSPECTRES.DistributeDialogInstruction", { total: String(total) })
      ?? `Assign ${total} franchise dice among players.`;

    const content = `
      <form class="inspectres-distribute-dialog">
        <p>${instruction}</p>
        ${playerInputs || "<p>No active players.</p>"}
      </form>
    `;

    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n?.localize("INSPECTRES.DistributeDialogTitle") ?? "Distribute Mission Dice" },
      rejectClose: false,
      content,
      buttons: [
        {
          action: "confirm",
          label: game.i18n?.localize("INSPECTRES.DistributeDialogConfirm") ?? "Confirm",
          default: true,
          callback: (_event: Event, _button: HTMLButtonElement, dialog: HTMLDialogElement) => {
            const form = dialog.querySelector("form") as HTMLFormElement | null;
            if (!form) return null;
            const data = new FormData(form);
            const distribution: Record<string, number> = {};
            for (const user of players) {
              const raw = Number(data.get(`player-${user.id}`) ?? 0);
              distribution[user.id] = isNaN(raw) ? 0 : Math.max(0, raw);
            }
            return distribution;
          },
        },
        {
          action: "cancel",
          label: game.i18n?.localize("INSPECTRES.DistributeDialogCancel") ?? "Cancel",
          callback: () => null,
        },
      ],
    });

    if (result === null || result === undefined) return;
    const distribution = result as Record<string, number>;

    const refreshedFranchise = findFranchiseActor();
    if (!refreshedFranchise) {
      ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorNoFranchise") ?? "No franchise actor found.");
      return;
    }
    const refreshedSystem = franchiseSystemData(refreshedFranchise);
    const refreshedTotal = refreshedSystem.missionPool;

    const distributedTotal = Object.values(distribution).reduce((sum, v) => sum + v, 0);
    if (distributedTotal !== refreshedTotal) {
      const msg = game.i18n?.format("INSPECTRES.DistributeDialogTotalMismatch", { total: String(refreshedTotal) })
        ?? `Total must equal ${refreshedTotal} dice.`;
      if (distributedTotal !== total) {
        ui.notifications?.warn(
          game.i18n?.localize("INSPECTRES.DistributeDialogPoolChanged")
            ?? `Mission pool changed from ${total} to ${refreshedTotal} while the dialog was open.`,
        );
      } else {
        ui.notifications?.warn(msg);
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

    const lines = Object.entries(distribution)
      .filter(([, v]) => v > 0)
      .map(([userId, count]) => {
        const user = game.users?.get(userId);
        const name = user?.name ?? userId;
        return `${name}: ${count} ${count === 1 ? (game.i18n?.localize("INSPECTRES.DieSingular") ?? "die") : (game.i18n?.localize("INSPECTRES.DiePlural") ?? "dice")}`;
      });

    const baseMsg = game.i18n?.localize("INSPECTRES.MissionCompleteAnnounce") ?? "The mission is complete! Franchise dice have been distributed.";
    const content = `<p>${baseMsg}</p><ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
    await ChatMessage.create({ content } as unknown as Parameters<typeof ChatMessage.create>[0]);

    if (MissionTrackerApp.instance === this) {
      void this.render().catch((err: unknown) => {
        console.error("Mission tracker re-render failed (broadcastMissionComplete):", err);
      });
    }
  }

  private async endEarly(): Promise<void> {
    const franchise = findFranchiseActor();
    if (!franchise) {
      ui.notifications?.warn(game.i18n?.localize("INSPECTRES.ErrorNoFranchise") ?? "No franchise actor found.");
      return;
    }
    const updateData = { "system.missionPool": 0 } as unknown as Parameters<typeof franchise.update>[0];
    await franchise.update(updateData);

    const msg = game.i18n?.localize("INSPECTRES.MissionEndedEarly") ?? "The mission ended early. Franchise pool cleared.";
    await ChatMessage.create({ content: `<p>${msg}</p>` } as unknown as Parameters<typeof ChatMessage.create>[0]);

    if (MissionTrackerApp.instance === this) {
      void this.render().catch((err: unknown) => {
        console.error("Mission tracker re-render failed (endEarly):", err);
      });
    }
  }

  override async close(options?: { animate?: boolean }): Promise<foundry.applications.api.ApplicationV2> {
    MissionTrackerApp.instance = null;
    return super.close(options);
  }
}
