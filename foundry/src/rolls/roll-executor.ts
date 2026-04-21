import {
  SKILL_ROLL_CHART,
  STRESS_ROLL_CHART,
  BANK_ROLL_CHART,
  CLIENT_GENERATION_TABLE,
} from "./roll-charts.js";
import { type AgentData } from "../agent/agent-schema.js";
import { type FranchiseData } from "../franchise/franchise-schema.js";
import { emitMissionPoolUpdated } from "../mission/socket.js";

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

async function actorUpdate(actor: Actor, data: Record<string, unknown>): Promise<void> {
  const updateData = data as unknown as Parameters<typeof actor.update>[0];
  await actor.update(updateData);
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
      const lowestFace = faces.length > 0 ? Math.min(...faces) : 1;
      highestFace = isDieFace(lowestFace) ? lowestFace : 1;
    } else {
      const { roll, faces } = await rollDice(totalDice);
      mainRoll = roll;
      const maxFace = faces.length > 0 ? Math.max(...faces) : 1;
      highestFace = isDieFace(maxFace) ? maxFace : 1;
    }
  }

  const outcome = SKILL_ROLL_CHART[highestFace];

  // Resolve bank dice augmentation (only when not taking a 4)
  let bankSummary: BankResolutionSummary | null = null;
  if (!augmentation.takesFour && augmentation.bankDice > 0 && franchiseSystem) {
    const { faces: bankFaces } = await rollDice(augmentation.bankDice);
    // Pass availableBank (pre-spend); resolveBankDice accounts for spending internally
    bankSummary = resolveBankDice(bankFaces, availableBank);
  }

  // Apply actor updates — skipped entirely when taking a 4 (no resources spent)
  if (!augmentation.takesFour) {
    if (franchise && franchiseSystem) {
      if (augmentation.cardDice > 0 && cardType) {
        await actorUpdate(franchise, { [`system.cards.${cardType}`]: availableCardDice - augmentation.cardDice });
      }
      if (bankSummary !== null) {
        await actorUpdate(franchise, { "system.bank": bankSummary.finalBankTotal });
      }
    }
    if (augmentation.coolDice > 0) {
      await actorUpdate(agent, { "system.cool": availableCool - augmentation.coolDice });
    }
  }

  // Mission pool earned regardless of takesFour (it's an outcome, not a cost)
  if (franchise && franchiseSystem && outcome.franchiseDice > 0 && !system.isWeird) {
    await actorUpdate(franchise, { "system.missionPool": franchiseSystem.missionPool + outcome.franchiseDice });
    if (franchise.id !== null) emitMissionPoolUpdated(franchise.id);
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
  const i18n = game.i18n;
  const cardLabel = opts.availableCardDice > 0
    ? i18n?.format("INSPECTRES.DialogCardDiceAvailable", { n: String(opts.availableCardDice) }) ?? `Card Dice (${opts.availableCardDice} available)`
    : null;
  const bankLabel = i18n?.format("INSPECTRES.DialogBankDice", { max: String(opts.availableBank) }) ?? `Bank Dice (0–${opts.availableBank})`;
  const coolLabel = i18n?.format("INSPECTRES.DialogCoolDice", { max: String(opts.availableCool) }) ?? `Cool Dice (0–${opts.availableCool})`;
  const talentLabel = i18n?.localize("INSPECTRES.DialogTalentDie") ?? "Talent Die";
  const takesFourLabel = i18n?.localize("INSPECTRES.DialogTakesFour") ?? "Take a 4 (skip roll)";
  const baseDiceLabel = i18n?.localize("INSPECTRES.DialogBaseDice") ?? "Base dice";

  const content = `
    <form class="inspectres-roll-dialog">
      <p><strong>${baseDiceLabel}:</strong> ${opts.effectiveDice}</p>
      ${cardLabel ? `<label><input type="checkbox" name="cardDice"> ${cardLabel}</label>` : ""}
      ${opts.availableBank > 0 ? `<label>${bankLabel}: <input type="number" name="bankDice" min="0" max="${opts.availableBank}" value="0"></label>` : ""}
      ${opts.availableCool > 0 ? `<label>${coolLabel}: <input type="number" name="coolDice" min="0" max="${opts.availableCool}" value="0"></label>` : ""}
      ${opts.hasTalent ? `<label><input type="checkbox" name="talentDie"> ${talentLabel}</label>` : ""}
      ${opts.canTakeFour ? `<label><input type="checkbox" name="takesFour"> ${takesFourLabel}</label>` : ""}
    </form>
  `;

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: `${i18n?.localize("INSPECTRES.SkillRoll") ?? "Skill Roll"}: ${opts.skillName}` },
    content,
    buttons: [
      {
        action: "roll",
        label: i18n?.localize("INSPECTRES.DialogRoll") ?? "Roll",
        default: true,
        callback: (_event: Event, _button: HTMLButtonElement, dialog: HTMLDialogElement) => {
          const form = dialog.querySelector("form") as HTMLFormElement | null;
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
      {
        action: "cancel",
        label: i18n?.localize("INSPECTRES.DialogCancel") ?? "Cancel",
        callback: () => null,
      },
    ],
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

  await actorUpdate(franchise, { "system.bank": summary.finalBankTotal });

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

  // active[0] is always defined here; ?? 6 satisfies noUncheckedIndexedAccess
  const rawLowest = active.length > 0 ? (active[0] ?? 6) : 6;
  const effectiveFace: DieFace = isDieFace(rawLowest) ? rawLowest : 1;
  const outcome = STRESS_ROLL_CHART[effectiveFace];

  // Apply updates — meltdown takes precedence over coolGain
  if (effectiveFace === 1) {
    // Meltdown: zero cool, skill penalty = stress dice count (narrated in chat)
    await actorUpdate(agent, { "system.cool": 0 });
  } else if (outcome.coolGain > 0) {
    await actorUpdate(agent, { "system.cool": system.cool + outcome.coolGain });
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
    penaltyNote: effectiveFace <= 3 ? buildPenaltyNote(effectiveFace as 1 | 2 | 3, stressDiceCount) : null,
  });
  await postChatCard(content, speaker, [roll]);
}

function buildPenaltyNote(face: 1 | 2 | 3, stressDiceCount: number): string {
  switch (face) {
    case 3:
      return "Reduce 1 die from one skill of your choice on your character sheet.";
    case 2:
      return "Reduce 2 dice from one skill, or 1 die from each of two skills on your character sheet.";
    case 1:
      return `Meltdown! Cool dice reset to 0. Reduce ${stressDiceCount} skill dice total (distributed as you choose) on your character sheet.`;
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
  // Client roll results are GM prep — whisper to all GMs only
  const gmIds = (game.users?.filter((u) => u.isGM).map((u) => u.id).filter((id): id is string => id !== null)) ?? [];
  await ChatMessage.create({ content, speaker, rolls, whisper: gmIds } as unknown as Parameters<typeof ChatMessage.create>[0]);
}
