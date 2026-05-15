import { agentSystemData } from "./agent-system-data.js";
import { executeStressRoll } from "../rolls/roll-executor.js";
import { findFranchiseActor } from "../franchise/franchise-utils.js";
import { getDevLogger } from "../utils/dev-logger.js";
import { stopDialogSubmitPropagation } from "../utils/dialog-utils.js";

export async function buildStressRollDialog(agent: Actor): Promise<void> {
  const system = agentSystemData(agent);
  const maxCool = system.cool;

  const i18n = game.i18n;
  const stressDiceLabel = i18n?.localize("INSPECTRES.DialogStressDice") ?? "Stress Dice (1–5)";
  const coolIgnoreLabel = i18n?.format("INSPECTRES.DialogCoolIgnore", { max: String(maxCool) }) ?? `Cool dice to ignore lowest (0–${maxCool})`;

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: i18n?.localize("INSPECTRES.StressRoll") ?? "Stress Roll" },
    rejectClose: false,
    render: stopDialogSubmitPropagation,
    content: `
      <div class="inspectres-roll-dialog">
        <label>${stressDiceLabel}: <input type="number" name="stressDice" min="1" max="5" value="1"></label>
        ${maxCool > 0 ? `<label>${coolIgnoreLabel}: <input type="number" name="coolIgnore" min="0" max="${maxCool}" value="0"></label>` : ""}
      </div>
    `,
    buttons: [
      {
        action: "roll",
        label: i18n?.localize("INSPECTRES.DialogRoll") ?? "Roll",
        default: true,
        callback: (_event: Event, _button: HTMLButtonElement, dialog: foundry.applications.api.DialogV2) => {
          const form = dialog.element.querySelector("form");
          if (!form) {
            getDevLogger().error("agent-sheet", "buildStressRollDialog: form element not found in dialog");
            return null;
          }
          const data = new FormData(form);
          const stressDiceCount = Math.max(1, Math.min(5, Number(data.get("stressDice") ?? 1)));
          const coolDiceUsed = Math.max(0, Math.min(maxCool, Number(data.get("coolIgnore") ?? 0)));
          return {
            stressDiceCount: Number.isNaN(stressDiceCount) ? 1 : stressDiceCount,
            coolDiceUsed: Number.isNaN(coolDiceUsed) ? 0 : coolDiceUsed,
          };
        },
      },
      {
        action: "cancel",
        label: i18n?.localize("INSPECTRES.DialogCancel") ?? "Cancel",
        callback: () => null,
      },
    ],
  });

  if (result === null || result === undefined) return;
  const params = result as { stressDiceCount: number; coolDiceUsed: number };
  const franchise = findFranchiseActor();
  await executeStressRoll(agent, params, franchise);
}
