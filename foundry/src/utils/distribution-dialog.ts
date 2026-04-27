export interface PlayerInfo {
  id: string;
  name: string;
}

export interface DistributionDialogOptions {
  missionPool: number;
  players: PlayerInfo[];
}

export interface DistributionDialogResult {
  content: string;
  window?: { title: string };
  buttons?: Array<{
    action: string;
    label: string;
    default?: boolean;
    callback?: (
      event: Event,
      button: HTMLButtonElement,
      dialog: HTMLDialogElement,
    ) => Record<string, number> | null;
  }>;
  rejectClose?: boolean;
}

export async function createDistributionDialog(opts: DistributionDialogOptions): Promise<DistributionDialogResult> {
  const { missionPool, players } = opts;

  const playerInputs = players
    .map(
      (player) => `
          <div class="distribution-input">
            <label for="player-${player.id}">${player.name}:</label>
            <input type="number" id="player-${player.id}" name="player-${player.id}" min="0" value="0" />
          </div>
        `,
    )
    .join("\n");

  const instruction = game.i18n?.format("INSPECTRES.DistributeDialogInstruction", { total: String(missionPool) })
    ?? `Assign ${missionPool} franchise dice among players.`;

  const content = `
    <form class="inspectres-distribute-dialog">
      <p>${instruction}</p>
      ${playerInputs || "<p>No active players.</p>"}
    </form>
  `;

  return {
    content,
    window: { title: game.i18n?.localize("INSPECTRES.DistributeDialogTitle") ?? "Distribute Mission Dice" },
    rejectClose: false,
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
          for (const player of players) {
            const raw = Number(data.get(`player-${player.id}`) ?? 0);
            distribution[player.id] = isNaN(raw) ? 0 : Math.max(0, raw);
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
  };
}
