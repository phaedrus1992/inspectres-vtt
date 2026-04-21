import {
  SKILL_ROLL_CHART,
  STRESS_ROLL_CHART,
  BANK_ROLL_CHART,
  CLIENT_GENERATION_TABLE,
} from "./roll-charts.js";
import { type AgentData } from "../agent/agent-schema.js";
import { type FranchiseData } from "../franchise/franchise-schema.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkillName = "academics" | "athletics" | "technology" | "contact";

type DieFace = 1 | 2 | 3 | 4 | 5 | 6;

export interface BankDieResolution {
  face: DieFace;
  result: string;
  narration: string;
  bankDelta: number;
  loseAllBank: boolean;
}

export interface BankResolutionSummary {
  resolutions: BankDieResolution[];
  finalBankTotal: number;
}

export interface StressRollParams {
  stressDiceCount: number;
  coolDiceUsed: number;
}

// ---------------------------------------------------------------------------
// Guards and helpers
// ---------------------------------------------------------------------------

function isDieFace(n: number): n is DieFace {
  return n >= 1 && n <= 6;
}

function extractFaces(roll: Roll): number[] {
  return roll.dice.flatMap((t) => t.results).filter((r) => r.active !== false).map((r) => r.result);
}

function actorUpdate(actor: Actor, data: Record<string, unknown>): void {
  const updateData = data as unknown as Parameters<typeof actor.update>[0];
  void actor.update(updateData).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to update actor:", message);
    ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorUpdateFailed") ?? "Failed to update actor data");
  });
}

function findFranchiseActor(): Actor | null {
  if (!game.actors) return null;
  for (const actor of game.actors) {
    if ((actor.type as string) === "franchise") return actor;
  }
  return null;
}

async function rollDice(count: number): Promise<{ roll: Roll; faces: number[] }> {
  const roll = new Roll(`${count}d6`);
  await roll.evaluate();
  return { roll, faces: extractFaces(roll) };
}

async function postChatCard(
  content: string,
  speaker: ReturnType<typeof ChatMessage.getSpeaker>,
  rolls: Roll[],
): Promise<void> {
  await ChatMessage.create({ content, speaker, rolls } as unknown as Parameters<typeof ChatMessage.create>[0]);
}

// ---------------------------------------------------------------------------
// Pure: resolveBankDice
// ---------------------------------------------------------------------------

/** Pure function: evaluates bank die results against BANK_ROLL_CHART. */
export function resolveBankDice(faces: number[], currentBank: number): BankResolutionSummary {
  const resolutions: BankDieResolution[] = [];
  let delta = 0;
  let lostAll = false;

  for (const face of faces) {
    if (!isDieFace(face)) {
      console.error(`resolveBankDice: invalid die face ${face}, skipping`);
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

// ---------------------------------------------------------------------------
// Card type mapping
// ---------------------------------------------------------------------------

const CARD_FOR_SKILL: Record<SkillName, keyof FranchiseData["cards"] | null> = {
  academics: "library",
  athletics: "gym",
  technology: "credit",
  contact: null,
};

// ---------------------------------------------------------------------------
// executeSkillRoll
// ---------------------------------------------------------------------------

export async function executeSkillRoll(
  agent: Actor,
  franchise: Actor | null,
  skillName: SkillName,
): Promise<void> {
  const system = agent.system as unknown as AgentData;
  const skill = system.skills[skillName];
  const effectiveDice = Math.max(0, skill.base - skill.penalty);

  const franchiseSystem = franchise ? (franchise.system as unknown as FranchiseData) : null;
  const cardType = CARD_FOR_SKILL[skillName];
  const availableCardDice = franchiseSystem && cardType ? franchiseSystem.cards[cardType] : 0;
  const availableBank = franchiseSystem ? franchiseSystem.bank : 0;
  const availableCool = system.cool;
  const talentText = system.talent.trim();

  // Gather augmentation via dialog
  const augmentation = await buildSkillRollDialog({
    skillName,
    effectiveDice,
    availableCardDice,
    availableBank,
    availableCool,
    hasTalent: talentText.length > 0,
    canTakeFour: skill.base >= 4,
  });

  if (augmentation === null) return; // dialog cancelled

  let highestFace: DieFace;
  let mainRoll: Roll;

  if (augmentation.takesFour) {
    // Taking 4: guaranteed Fair result, no dice rolled
    highestFace = 4;
    mainRoll = new Roll("0d6");
    await mainRoll.evaluate();
  } else {
    const totalDice =
      effectiveDice +
      augmentation.cardDice +
      augmentation.bankDice +
      augmentation.coolDice +
      (augmentation.talentDie ? 1 : 0);

    if (totalDice === 0) {
      // Zero dice: roll 2d6 take lowest (rules: auto-fail at 0 skill = treated as 1)
      const { roll, faces } = await rollDice(2);
      mainRoll = roll;
      const lowestFace = Math.min(...faces);
      highestFace = isDieFace(lowestFace) ? lowestFace : 1;
    } else {
      const { roll, faces } = await rollDice(totalDice);
      mainRoll = roll;
      const maxFace = Math.max(...faces);
      highestFace = isDieFace(maxFace) ? maxFace : 1;
    }
  }

  const outcome = SKILL_ROLL_CHART[highestFace];

  // Resolve bank dice augmentation
  let bankSummary: BankResolutionSummary | null = null;
  if (augmentation.bankDice > 0 && franchiseSystem) {
    const { faces: bankFaces } = await rollDice(augmentation.bankDice);
    bankSummary = resolveBankDice(bankFaces, availableBank - augmentation.bankDice);
  }

  // Apply actor updates
  if (franchise && franchiseSystem) {
    if (augmentation.cardDice > 0 && cardType) {
      actorUpdate(franchise, { [`system.cards.${cardType}`]: availableCardDice - augmentation.cardDice });
    }
    if (bankSummary !== null) {
      actorUpdate(franchise, { "system.bank": bankSummary.finalBankTotal });
    }
    if (outcome.franchiseDice > 0 && !system.isWeird) {
      actorUpdate(franchise, { "system.missionPool": franchiseSystem.missionPool + outcome.franchiseDice });
    }
  }

  if (augmentation.coolDice > 0) {
    actorUpdate(agent, { "system.cool": availableCool - augmentation.coolDice });
  }

  const speaker = ChatMessage.getSpeaker({ actor: agent });
  const content = await renderTemplate("systems/inspectres/templates/roll-card.hbs", {
    rollType: "skill",
    title: `${game.i18n?.localize("INSPECTRES.SkillRoll") ?? "Skill Roll"}: ${skillName}`,
    result: outcome.result,
    narration: outcome.narration,
    franchiseDiceEarned: outcome.franchiseDice,
    isWeird: system.isWeird,
    takesFour: augmentation.takesFour,
    bankResolutions: bankSummary?.resolutions ?? [],
  });
  await postChatCard(content, speaker, [mainRoll]);
}

interface SkillRollDialogOptions {
  skillName: SkillName;
  effectiveDice: number;
  availableCardDice: number;
  availableBank: number;
  availableCool: number;
  hasTalent: boolean;
  canTakeFour: boolean;
}

interface SkillRollAugmentation {
  cardDice: number;
  bankDice: number;
  coolDice: number;
  talentDie: boolean;
  takesFour: boolean;
}

async function buildSkillRollDialog(opts: SkillRollDialogOptions): Promise<SkillRollAugmentation | null> {
  const cardLabel = opts.availableCardDice > 0
    ? `Card Dice (${opts.availableCardDice} available)`
    : null;

  const content = `
    <form class="inspectres-roll-dialog">
      <p><strong>Base dice:</strong> ${opts.effectiveDice}</p>
      ${cardLabel ? `<label><input type="checkbox" name="cardDice" ${opts.availableCardDice === 0 ? "disabled" : ""}> ${cardLabel}</label>` : ""}
      ${opts.availableBank > 0 ? `<label>Bank Dice (0–${opts.availableBank}): <input type="number" name="bankDice" min="0" max="${opts.availableBank}" value="0"></label>` : ""}
      ${opts.availableCool > 0 ? `<label>Cool Dice (0–${opts.availableCool}): <input type="number" name="coolDice" min="0" max="${opts.availableCool}" value="0"></label>` : ""}
      ${opts.hasTalent ? `<label><input type="checkbox" name="talentDie"> Talent Die</label>` : ""}
      ${opts.canTakeFour ? `<label><input type="checkbox" name="takesFour"> Take a 4 (skip roll)</label>` : ""}
    </form>
  `;

  // Dialog.wait<T> is constrained by fvtt-types; cast through unknown to avoid the constraint
  const result = await (Dialog.wait as (config: unknown) => Promise<unknown>)({
    title: `${game.i18n?.localize("INSPECTRES.SkillRoll") ?? "Skill Roll"}: ${opts.skillName}`,
    content,
    buttons: {
      roll: {
        label: "Roll",
        callback: (html: JQuery) => {
          const form = html.find("form")[0] as HTMLFormElement | undefined;
          if (!form) return { cardDice: 0, bankDice: 0, coolDice: 0, talentDie: false, takesFour: false };
          const data = new FormData(form);
          const cardDice = data.has("cardDice") ? opts.availableCardDice : 0;
          const bankDice = Math.min(Number(data.get("bankDice") ?? 0), opts.availableBank);
          const coolDice = Math.min(Number(data.get("coolDice") ?? 0), opts.availableCool);
          const talentDie = data.has("talentDie");
          const takesFour = data.has("takesFour");
          return { cardDice, bankDice: isNaN(bankDice) ? 0 : bankDice, coolDice: isNaN(coolDice) ? 0 : coolDice, talentDie, takesFour };
        },
      },
      cancel: {
        label: "Cancel",
        callback: () => null,
      },
    },
    default: "roll",
  });
  if (result === null || result === undefined) return null;
  return result as SkillRollAugmentation;
}

// ---------------------------------------------------------------------------
// executeBankRoll
// ---------------------------------------------------------------------------

export async function executeBankRoll(franchise: Actor): Promise<void> {
  const system = franchise.system as unknown as FranchiseData;
  const currentBank = system.bank;

  if (currentBank === 0) {
    ui.notifications?.warn(game.i18n?.localize("INSPECTRES.WarnNoBankDice") ?? "No bank dice to roll.");
    return;
  }

  const { roll, faces } = await rollDice(currentBank);
  const summary = resolveBankDice(faces, currentBank);

  actorUpdate(franchise, { "system.bank": summary.finalBankTotal });

  const speaker = ChatMessage.getSpeaker({ actor: franchise });
  const content = await renderTemplate("systems/inspectres/templates/roll-card.hbs", {
    rollType: "bank",
    title: game.i18n?.localize("INSPECTRES.BankRoll") ?? "Bank Roll",
    resolutions: summary.resolutions,
    finalBankTotal: summary.finalBankTotal,
  });
  await postChatCard(content, speaker, [roll]);
}

// ---------------------------------------------------------------------------
// executeStressRoll
// ---------------------------------------------------------------------------

export async function executeStressRoll(agent: Actor, params: StressRollParams): Promise<void> {
  const system = agent.system as unknown as AgentData;
  const { stressDiceCount, coolDiceUsed } = params;

  const { roll, faces } = await rollDice(stressDiceCount);

  // Sort ascending; remove the N lowest (cool ignores lowest; cool NOT spent)
  const sorted = [...faces].sort((a, b) => a - b);
  const active = sorted.slice(coolDiceUsed);

  // If all dice ignored by cool, treat as 6 (Too Cool)
  const rawLowest = active.length > 0 ? (active[0] ?? 6) : 6;
  const effectiveFace: DieFace = isDieFace(rawLowest) ? rawLowest : 1;
  const outcome = STRESS_ROLL_CHART[effectiveFace];

  // Apply updates
  if (outcome.coolGain > 0) {
    actorUpdate(agent, { "system.cool": system.cool + outcome.coolGain });
  }

  if (effectiveFace === 1) {
    // Meltdown: zero cool, skill penalty = stress dice count (narrated in chat)
    actorUpdate(agent, { "system.cool": 0 });
  }

  const speaker = ChatMessage.getSpeaker({ actor: agent });
  const content = await renderTemplate("systems/inspectres/templates/roll-card.hbs", {
    rollType: "stress",
    title: game.i18n?.localize("INSPECTRES.StressRoll") ?? "Stress Roll",
    result: outcome.result,
    narration: outcome.narration,
    stressDiceCount,
    coolDiceUsed,
    diceRolled: faces,
    effectiveFace,
    // For results requiring manual skill reduction, include a reminder
    penaltyNote: effectiveFace <= 3 ? buildPenaltyNote(effectiveFace, stressDiceCount) : null,
  });
  await postChatCard(content, speaker, [roll]);
}

function buildPenaltyNote(face: DieFace, stressDiceCount: number): string {
  switch (face) {
    case 3:
      return "Reduce 1 die from one skill of your choice on your character sheet.";
    case 2:
      return "Reduce 2 dice from one skill, or 1 die from each of two skills on your character sheet.";
    case 1:
      return `Meltdown! Cool dice reset to 0. Reduce ${stressDiceCount} skill dice total (distributed as you choose) on your character sheet.`;
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// executeClientRoll
// ---------------------------------------------------------------------------

export async function executeClientRoll(franchise: Actor): Promise<void> {
  const attributes = ["personality", "clientType", "occurrence", "location"] as const;
  const rolls: Roll[] = [];
  const generated: Record<string, string> = {};

  for (const attr of attributes) {
    const { roll, faces } = await rollDice(2);
    rolls.push(roll);
    const sum = faces.reduce((acc, f) => acc + f, 0);
    // 2d6 sums range 2–12; clamp to valid keys
    const key = Math.max(2, Math.min(12, sum));
    const table = CLIENT_GENERATION_TABLE[attr] as Record<number, string>;
    generated[attr] = table[key] ?? "";
  }

  const speaker = ChatMessage.getSpeaker({ actor: franchise });
  const content = await renderTemplate("systems/inspectres/templates/roll-card.hbs", {
    rollType: "client",
    title: game.i18n?.localize("INSPECTRES.ClientRoll") ?? "Client Roll",
    client: generated,
  });
  await postChatCard(content, speaker, rolls);
}
