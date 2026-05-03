import type { RollActor } from "./roll-executor.js";

interface DialogResult {
  diceCount?: unknown;
  [key: string]: unknown;
}

interface Roll {
  total: number;
  evaluate(): Promise<Roll>;
}

/** Execute a complete skill roll pipeline: configure, evaluate, post to chat. */
export async function executeSkillRoll(
  actor: RollActor,
  skillName: string,
): Promise<void> {
  // Stage 1: Open dialog to configure roll
  const config = await openRollDialog(skillName);
  if (!config) return;

  // Stage 2: Evaluate roll
  const diceCount = Number(config["diceCount"]) || 2;
  const roll = await evaluateRoll(`${diceCount}d6`);

  // Stage 3: Determine outcome
  const outcome = determineOutcome(roll.total);

  // Stage 4: Post to chat
  await postRollMessage(actor, skillName, outcome, roll.total);
}

async function openRollDialog(skillName: string): Promise<DialogResult | null> {
  const g = globalThis as unknown as Record<string, unknown>;
  const foundry = g["foundry"] as unknown as {
    applications: { api: { DialogV2: { wait: Function } } };
  };
  const result = (await foundry.applications.api.DialogV2.wait({
    window: { title: `Roll ${skillName}` },
    content: `<form><input type="number" name="diceCount" value="2"></form>`,
    buttons: [
      {
        action: "roll",
        label: "Roll",
        callback: (_event: Event, _button: unknown, dialog: HTMLElement) => {
          const form = dialog.querySelector("form") as HTMLFormElement;
          return Object.fromEntries(new FormData(form));
        },
      },
    ],
  })) as unknown;
  return (result as Record<string, unknown> | null) ?? null;
}

async function evaluateRoll(formula: string): Promise<Roll> {
  const g = globalThis as unknown as { Roll: new (f: string) => Roll };
  const roll = new g.Roll(formula);
  const rollAny = roll as unknown as Record<string, unknown>;
  const evaluated = await (rollAny["evaluate"] as () => Promise<unknown>)();
  return evaluated as Roll;
}

function determineOutcome(total: number): "good" | "partial" | "bad" {
  if (total <= 2) return "bad";
  if (total <= 4) return "partial";
  return "good";
}

async function postRollMessage(
  actor: RollActor,
  skillName: string,
  outcome: "good" | "partial" | "bad",
  total: number,
): Promise<void> {
  const g = globalThis as unknown as Record<string, unknown>;
  const chatMessage = g["ChatMessage"] as unknown as {
    create: (data: Record<string, unknown>) => Promise<unknown>;
  };
  await chatMessage.create({
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
