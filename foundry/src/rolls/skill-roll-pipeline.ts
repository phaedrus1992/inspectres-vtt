import { stopDialogSubmitPropagation } from "../utils/dialog-utils.js";
import { createChatMessage } from "../utils/fvtt-boundary.js";
import type { RollActor } from "./roll-executor.js";

interface DialogResult {
  diceCount?: unknown;
  [key: string]: unknown;
}

type RollOutcome = "good" | "partial" | "bad";

/** Execute a complete skill roll pipeline: configure, evaluate, post to chat. */
export async function executeSkillRoll(
  actor: RollActor,
  skillName: string,
): Promise<void> {
  const config = await openRollDialog(skillName);
  if (!config) return;

  const diceCount = Number(config["diceCount"]) || 2;
  const roll = await new Roll(`${diceCount}d6`).evaluate();
  const total = roll.total ?? 0;
  const outcome = determineOutcome(total);

  await postRollMessage(actor, skillName, outcome, total);
}

/** Open a dialog to configure roll parameters (dice count). */
async function openRollDialog(skillName: string): Promise<DialogResult | null> {
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: `Roll ${skillName}` },
    content: `<div><input type="number" name="diceCount" value="2"></div>`,
    render: stopDialogSubmitPropagation,
    buttons: [
      {
        action: "roll",
        label: "Roll",
        callback: (_event, _button, dialog) => {
          const form = dialog.element.querySelector("form");
          if (!form) return null;
          return Object.fromEntries(new FormData(form));
        },
      },
    ],
  });
  return (result as DialogResult | null) ?? null;
}

/** Determine outcome (bad/partial/good) based on dice total. */
function determineOutcome(total: number): RollOutcome {
  if (total <= 2) return "bad";
  if (total <= 4) return "partial";
  return "good";
}

/** Post the roll result to chat with outcome flags. */
async function postRollMessage(
  actor: RollActor,
  skillName: string,
  outcome: RollOutcome,
  total: number,
): Promise<void> {
  await createChatMessage({
    content: `Rolled ${total}`,
    speaker: { actor: actor.id },
    flags: {
      inspectres: {
        outcome,
        rollType: "skill",
        skill: skillName,
      },
    },
  });
}
