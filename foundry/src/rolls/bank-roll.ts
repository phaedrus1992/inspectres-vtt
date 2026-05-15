import { BANK_ROLL_CHART } from "./roll-charts.js";
import { type BankDieResolution, type BankResolutionSummary } from "./roll-types.js";
import { type FranchiseData } from "../franchise/franchise-schema.js";
import { getActorSystem, type RollActor } from "../utils/system-cast.js";
import { getDevLogger } from "../utils/dev-logger.js";
import { isDieFace, actorUpdate, rollDice, postChatCard } from "./roll-helpers.js";

/** Pure function: evaluates bank die results against BANK_ROLL_CHART. */
export function resolveBankDice(faces: number[], currentBank: number): BankResolutionSummary {
  const resolutions: BankDieResolution[] = [];
  let delta = 0;
  let lostAll = false;

  for (const face of faces) {
    if (!isDieFace(face)) {
      getDevLogger().error("bank-roll", `resolveBankDice: invalid die face ${face}, skipping`);
      continue;
    }
    const entry = BANK_ROLL_CHART[face];
    const loseAllBank = "loseAllBank" in entry && entry.loseAllBank === true;
    // net per die: spent 1 to roll it; diceReturned gives back; diceAdded adds more
    const bankDelta = entry.diceReturned - 1 + entry.diceAdded;
    resolutions.push({ face, result: entry.result, narration: entry.narration, bankDelta, loseAllBank });
    if (loseAllBank) {
      lostAll = true;
      break;
    }
    delta += bankDelta;
  }

  const finalBankTotal = lostAll ? 0 : Math.max(0, currentBank + delta);
  return { resolutions, finalBankTotal };
}

export async function executeBankRoll(franchise: RollActor): Promise<void> {
  // fvtt-types v13 + template.json: requires double-cast; see foundry-vite.md
  const system = getActorSystem<FranchiseData>(franchise);
  const currentBank = system.bank;

  if (currentBank === 0) {
    ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnNoBankDice") ?? "No bank dice to roll.");
    return;
  }

  const { roll, faces } = await rollDice(currentBank);
  const summary = resolveBankDice(faces, currentBank);

  await actorUpdate(franchise, { "system.bank": summary.finalBankTotal });

  // ChatMessage.getSpeaker requires the full Actor type; RollActor satisfies the needed fields at runtime
  const speaker = ChatMessage.getSpeaker({ actor: franchise as Actor });
  const content = await foundry.applications.handlebars.renderTemplate("systems/inspectres/templates/roll-card.hbs", {
    rollType: "bank",
    title: game.i18n?.localize("INSPECTRES.BankRoll") ?? "Bank Roll",
    resolutions: summary.resolutions,
    finalBankTotal: summary.finalBankTotal,
  });
  await postChatCard(content, speaker, [roll]);
}
