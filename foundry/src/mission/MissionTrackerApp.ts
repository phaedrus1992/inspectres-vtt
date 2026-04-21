import { findFranchiseActor, franchiseSystemData } from "../franchise/franchise-utils.js";
import { type FranchiseData } from "../franchise/franchise-schema.js";

export class MissionTrackerApp extends Application {
  static instance: MissionTrackerApp | null = null;

  static open(): void {
    if (!MissionTrackerApp.instance) {
      MissionTrackerApp.instance = new MissionTrackerApp();
    }
    MissionTrackerApp.instance.render(true);
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "inspectres-mission-tracker",
      classes: ["inspectres", "inspectres-mission-tracker-window"],
      template: "systems/inspectres/templates/mission-tracker.hbs",
      title: game.i18n?.localize("INSPECTRES.MissionTrackerTitle") ?? "Mission Tracker",
      width: 360,
      height: "auto",
      resizable: false,
      minimizable: true,
    });
  }

  override getData(): Record<string, unknown> {
    const franchise = findFranchiseActor();
    if (!franchise) {
      return { missionPool: 0, missionGoal: 0, progressPercent: 0, missionComplete: false, isGm: game.user?.isGM ?? false };
    }
    const system = franchiseSystemData(franchise);
    const missionPool = system.missionPool;
    const missionGoal = system.missionGoal;
    const progressPercent = missionGoal > 0 ? Math.min(100, Math.round((missionPool / missionGoal) * 100)) : 0;
    const missionComplete = missionGoal > 0 && missionPool >= missionGoal;
    return {
      missionPool,
      missionGoal,
      progressPercent,
      missionComplete,
      isGm: game.user?.isGM ?? false,
    };
  }

  override activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);

    html.on("click", "[data-action='beginCleanUp']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      void this.openDistributionDialog().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Distribution dialog failed:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorRollFailed") ?? "Operation failed");
      });
    });

    html.on("click", "[data-action='endEarly']", (event: JQuery.ClickEvent) => {
      event.preventDefault();
      void this.endEarly().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("End mission early failed:", message);
        ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorUpdateFailed") ?? "Failed to update actor data");
      });
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

    const result = await (Dialog.wait as (config: unknown) => Promise<unknown>)({
      title: game.i18n?.localize("INSPECTRES.DistributeDialogTitle") ?? "Distribute Mission Dice",
      content,
      buttons: {
        confirm: {
          label: game.i18n?.localize("INSPECTRES.DistributeDialogConfirm") ?? "Confirm",
          callback: (html: JQuery) => {
            const form = html.find("form")[0] as HTMLFormElement | undefined;
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
        cancel: {
          label: game.i18n?.localize("INSPECTRES.DistributeDialogCancel") ?? "Cancel",
          callback: () => null,
        },
      },
      default: "confirm",
    });

    if (result === null || result === undefined) return;
    const distribution = result as Record<string, number>;

    const distributedTotal = Object.values(distribution).reduce((sum, v) => sum + v, 0);
    if (distributedTotal !== total) {
      const msg = game.i18n?.format("INSPECTRES.DistributeDialogTotalMismatch", { total: String(total) })
        ?? `Total must equal ${total} dice.`;
      ui.notifications?.warn(msg);
      return;
    }

    await this.broadcastMissionComplete(franchise, system, distribution);
  }

  private async broadcastMissionComplete(
    franchise: Actor,
    system: FranchiseData,
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

    void system;
    if (MissionTrackerApp.instance === this) this.render(false);
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

    if (MissionTrackerApp.instance === this) this.render(false);
  }

  override close(options?: Application.CloseOptions): Promise<void> {
    MissionTrackerApp.instance = null;
    return super.close(options);
  }
}
