export { type RollActor } from "../utils/system-cast.js";
import { getActorSystem, type RollActor } from "../utils/system-cast.js";
import {
  SKILL_ROLL_CHART,
  STRESS_ROLL_CHART,
  BANK_ROLL_CHART,
  CLIENT_GENERATION_TABLE,
  DEATH_DISMEMBERMENT_CHART,
  type DeathDismembermentOutcome,
  type SkillRollOutcome,
  type StressRollOutcome,
} from "./roll-charts.js";
import { type AgentData } from "../agent/agent-schema.js";
import { agentSystemData } from "../agent/agent-system-data.js";
import { type FranchiseData } from "../franchise/franchise-schema.js";
import { emitMissionPoolUpdated } from "../mission/socket.js";
import { getCurrentDay } from "../agent/recovery-utils.js";
import { type ItemRarity, isRollSufficient, checkDefect } from "../mission/requirements-checker.js";
import { prepareSkillRollContext, type SkillRollContextInput } from "../agent/skill-roll-dialog.js";
import { checkTechnologyRollRequirements } from "./skill-roll-executor.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkillName = "academics" | "athletics" | "technology" | "contact";

export type RollType = "skill" | "bank" | "stress" | "client";
type D3Result = 1 | 2 | 3;

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

function applySkillPenalty(
  updateData: Record<string, unknown>,
  system: AgentData,
  penaltyAmount: number,
  targetSkill: SkillName,
): void {
  const currentPenalty = system.skills[targetSkill]?.penalty ?? 0;
  updateData[`system.skills.${targetSkill}.penalty`] = currentPenalty + penaltyAmount;
}

async function actorUpdate(actor: RollActor, data: Record<string, unknown>): Promise<void> {
  // fvtt-types expects full document data shape for actor.update; partial dot-notation paths are safe at runtime
  const updateData = data as unknown as Parameters<typeof actor.update>[0];
  await actor.update(updateData);
}

async function rollDice(count: number): Promise<{ roll: Roll; faces: number[] }> {
  const roll = new Roll(`${count}d6`);
  await roll.evaluate();
  return { roll, faces: extractFaces(roll) };
}

function getOutcomeClassification(highestFace: number): "good" | "partial" | "bad" {
  if (highestFace < 1 || highestFace > 6) {
    throw new Error(`getOutcomeClassification: die face must be 1-6, got ${highestFace}`);
  }
  if (highestFace >= 5) return "good";
  if (highestFace >= 3) return "partial";
  return "bad";
}

async function postChatCard(
  content: string,
  speaker: ReturnType<typeof ChatMessage.getSpeaker>,
  rolls: Roll[],
): Promise<void> {
  // fvtt-types ChatMessage.create expects strict DocumentData; whisper/rolls fields are valid at runtime
  await ChatMessage.create({ content, speaker, rolls } as unknown as Parameters<typeof ChatMessage.create>[0]);
}

// All valid skills for penalty selection — drives dialog rendering and validation.
// Used to: (1) enumerate dialog options, (2) validate form input against known set.
// If SkillName ever changes, this constant fails to compile until updated.
export const SKILL_NAMES = ["academics", "athletics", "technology", "contact"] as const satisfies readonly SkillName[];

async function getPlayerPenaltyChoice(
  system: AgentData,
  penaltyAmount: number,
): Promise<SkillName | null> {
  const skills: Array<{ name: SkillName; rank: number }> = SKILL_NAMES.map((name) => ({
    name,
    rank: system.skills[name]?.base ?? 0,
  }));

  const content = `
    <form class="inspectres-penalty-dialog">
      <p><strong>${game.i18n?.localize("INSPECTRES.PenaltyDialogPrompt") ?? "Choose a skill to penalize"}</strong></p>
      <p>${game.i18n?.format("INSPECTRES.PenaltyDialogAmount", { amount: String(penaltyAmount) }) ?? `Penalty: -${penaltyAmount} die`}</p>
      ${skills.map((skill, idx) => `
        <label><input type="radio" name="selectedSkill" value="${skill.name}"${idx === 0 ? " checked" : ""}> ${game.i18n?.localize(`INSPECTRES.Skill.${skill.name}`) ?? skill.name} (${skill.rank})</label>
      `).join("")}
    </form>
  `;

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n?.localize("INSPECTRES.PenaltyDialogTitle") ?? "Stress Penalty" },
    rejectClose: false,
    content,
    buttons: [
      {
        action: "select",
        label: game.i18n?.localize("INSPECTRES.DialogOK") ?? "OK",
        default: true,
        callback: (_event: Event, _button: HTMLButtonElement, dialog: foundry.applications.api.DialogV2) => {
          const form = dialog.element.querySelector("form") as HTMLFormElement | null;
          if (!form) return null;
          const data = new FormData(form);
          const selectedSkill = data.get("selectedSkill");
          if (!selectedSkill || typeof selectedSkill !== "string") return null;
          // Validate selected skill is one of the known valid options.
          // Prevents malformed form or DOM manipulation from writing to arbitrary skill paths.
          if (!SKILL_NAMES.includes(selectedSkill as SkillName)) return null;
          return selectedSkill as SkillName;
        },
      },
    ],
  });

  if (result === null || result === undefined) return null;
  return result as SkillName;
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
// Skill Roll Helpers (reduce executeSkillRoll complexity)
// ---------------------------------------------------------------------------

/** Extract skill roll parameters from actor systems. */
function getSkillRollParams(
  agent: RollActor,
  franchise: RollActor | null,
  skillName: SkillName,
) {
  const system = agentSystemData(agent);
  const skill = system.skills[skillName];
  const effectiveDice = Math.max(0, skill.base - skill.penalty);
  const franchiseSystem = franchise ? getActorSystem<FranchiseData>(franchise) : null;
  const cardType = CARD_FOR_SKILL[skillName];
  return {
    system,
    skill,
    effectiveDice,
    franchiseSystem,
    cardType,
    availableCardDice: franchiseSystem && cardType ? franchiseSystem.cards[cardType] : 0,
    availableBank: franchiseSystem ? franchiseSystem.bank : 0,
    availableCool: system.cool,
    talentText: system.talent.trim(),
  };
}

/** Validate and compute main roll outcome (handles zero-dice, take-4, normal cases). */
async function rollSkillDice(
  effectiveDice: number,
  takesFour: boolean,
  augmentation: SkillRollAugmentation,
): Promise<{ highestFace: DieFace; mainRoll: Roll }> {
  let highestFace: DieFace;
  let mainRoll: Roll;

  if (takesFour) {
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

  return { highestFace, mainRoll };
}

/** Apply requirement tier check if specified. */
function applyRequirementTier(
  outcome: SkillRollOutcome,
  highestFace: DieFace,
  skillName: SkillName,
  requirementTier?: ItemRarity,
): { outcome: SkillRollOutcome; requirementDefect: boolean; requirementCheckFailed: boolean } {
  let result = outcome;
  let requirementDefect = false;
  let requirementCheckFailed = false;

  if (requirementTier && skillName === "technology") {
    const rollSufficient = isRollSufficient(highestFace, requirementTier);
    if (!rollSufficient) {
      result = SKILL_ROLL_CHART[1];
      requirementCheckFailed = true;
      requirementDefect = checkDefect(highestFace, requirementTier);
    }
  }

  return { outcome: result, requirementDefect, requirementCheckFailed };
}

/** Update actor resources (card, cool, franchise). */
async function deductSkillRollResources(
  agent: RollActor,
  franchise: RollActor | null,
  franchiseSystem: FranchiseData | null,
  augmentation: SkillRollAugmentation,
  availableCardDice: number,
  availableCool: number,
  cardType: keyof FranchiseData["cards"] | null,
): Promise<void> {
  if (augmentation.takesFour) return;

  try {
    if (franchise && franchiseSystem && augmentation.cardDice > 0 && cardType) {
      await actorUpdate(franchise, { [`system.cards.${cardType}`]: availableCardDice - augmentation.cardDice });
    }
    if (augmentation.coolDice > 0) {
      await actorUpdate(agent, { "system.cool": availableCool - augmentation.coolDice });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorUpdateFailed") ?? "Failed to update actor data");
    throw new Error(`Failed to deduct resources from ${agent.name}: ${message}. Roll cancelled.`);
  }
}

/** Award franchise mission pool if earned. */
async function awardMissionPool(
  franchise: RollActor | null,
  franchiseSystem: FranchiseData | null,
  outcome: SkillRollOutcome,
  system: AgentData,
): Promise<void> {
  if (franchise && franchiseSystem && outcome.franchiseDice > 0 && !system.isWeird) {
    await actorUpdate(franchise, { "system.missionPool": franchiseSystem.missionPool + outcome.franchiseDice });
    if (franchise.id !== null) emitMissionPoolUpdated(franchise.id);
  }
}

// ---------------------------------------------------------------------------
// executeSkillRoll
// ---------------------------------------------------------------------------

export async function executeSkillRoll(
  agent: RollActor,
  franchise: RollActor | null,
  skillName: SkillName,
  options?: { requirementTier?: ItemRarity; isPrivateLife?: boolean }, // Phase 1: Requirements Checker + Phase 4: Private Life
): Promise<void> {
  if (!game.user?.isGM) {
    throw new Error("Skill rolls can only be initiated by the GM");
  }

  // Recovery check is the responsibility of the UI layer (AgentSheet).
  // The UI displays warnings and prevents roll initiation for agents who are recovering/dead.
  // Removing this defensive check prevents error translation loss and focuses validation at the boundary.
  // If an agent somehow rolls while recovering due to a UI race condition, the error should propagate to the caller.

  const {
    system,
    skill,
    effectiveDice,
    franchiseSystem,
    cardType,
    availableCardDice,
    availableBank,
    availableCool,
    talentText,
  } = getSkillRollParams(agent, franchise, skillName);

  // Phase 4: Apply private-life gating if applicable
  const isPrivateLife = options?.isPrivateLife ?? false;
  const contextInput: SkillRollContextInput = {
    agentName: agent.name,
    skillName,
    skillRank: skill.base,
    isPrivateLife,
    originalSkillRating: skill.base,
    availableAugmentations: {
      cool: availableCool > 0,
      card: availableCardDice > 0,
      bank: availableBank > 0,
      talent: talentText.length > 0,
    },
  };
  if (cardType) {
    contextInput.cardSkill = cardType;
  }
  const rollContext = prepareSkillRollContext(contextInput);

  // Gather augmentation via dialog
  const augmentation = await buildSkillRollDialog({
    skillName,
    effectiveDice,
    availableCardDice,
    availableBank,
    availableCool,
    hasTalent: talentText.length > 0,
    canTakeFour: rollContext.take4Allowed,
    cardSkillAllowed: rollContext.cardSkillAllowed,
    isTechnology: skillName === "technology",
    isPrivateLife,
  });

  if (augmentation === null) return; // dialog cancelled

  // Phase 1: Requirements Checker — apply pre-roll requirement if specified
  const requirementTier = options?.requirementTier ?? augmentation.requirementTier;
  if (requirementTier && skillName !== "technology") {
    throw new Error(`Cannot set requirement tier on ${skillName} skill — requirements only apply to Technology rolls. Check dialog filtering.`);
  }

  // Phase 1: Validate Technology roll requirements (if applicable)
  if (skillName === "technology" && requirementTier) {
    const requirementCheck = checkTechnologyRollRequirements({
      itemRarity: requirementTier,
      requirementsMet: true, // TODO: determine from mission context in future phases
    });
    if (!requirementCheck.allowed) {
      throw new Error(`Technology roll blocked: ${requirementCheck.blockReason}`);
    }
  }

  // Roll dice and compute main outcome
  const { highestFace, mainRoll } = await rollSkillDice(effectiveDice, augmentation.takesFour, augmentation);
  let { outcome, requirementDefect, requirementCheckFailed } = applyRequirementTier(
    SKILL_ROLL_CHART[highestFace],
    highestFace,
    skillName,
    requirementTier,
  );

  // Resolve bank dice augmentation (only when not taking a 4)
  let bankSummary: BankResolutionSummary | null = null;
  if (!augmentation.takesFour && augmentation.bankDice > 0 && franchiseSystem) {
    const { faces: bankFaces } = await rollDice(augmentation.bankDice);
    // Pass availableBank (pre-spend); resolveBankDice accounts for spending internally
    bankSummary = resolveBankDice(bankFaces, availableBank);
  }

  // Deduct resources and apply bank updates
  await deductSkillRollResources(agent, franchise, franchiseSystem, augmentation, availableCardDice, availableCool, cardType);
  if (!augmentation.takesFour && bankSummary !== null && franchise && franchiseSystem) {
    await actorUpdate(franchise, { "system.bank": bankSummary.finalBankTotal });
  }

  // Award mission pool
  await awardMissionPool(franchise, franchiseSystem, outcome, system);

  // ChatMessage.getSpeaker requires the full Actor type; RollActor satisfies the needed fields at runtime
  const speaker = ChatMessage.getSpeaker({ actor: agent as Actor });
  const content = await foundry.applications.handlebars.renderTemplate("systems/inspectres/templates/roll-card.hbs", {
    rollType: "skill",
    title: `${game.i18n?.localize("INSPECTRES.SkillRoll") ?? "Skill Roll"}: ${skillName}`,
    result: outcome.result,
    narration: outcome.narration,
    franchiseDiceEarned: outcome.franchiseDice,
    isWeird: system.isWeird,
    takesFour: augmentation.takesFour,
    bankResolutions: bankSummary?.resolutions ?? [],
    requirementTier, // Phase 1
    requirementDefect, // Phase 1
    requirementCheckFailed, // Phase 1
  });

  // Only post ChatMessage if franchise is not in debt mode (#455)
  if (!franchiseSystem?.debtMode) {
    await ChatMessage.create({
      content,
      speaker,
      rolls: [mainRoll],
      flags: {
        inspectres: {
          outcome: getOutcomeClassification(highestFace),
        },
      },
    } as unknown as Parameters<typeof ChatMessage.create>[0]);
  }
}

interface SkillRollDialogOptions {
  skillName: SkillName;
  effectiveDice: number;
  availableCardDice: number;
  availableBank: number;
  availableCool: number;
  hasTalent: boolean;
  canTakeFour: boolean;
  cardSkillAllowed: boolean; // #283: Gate Card dice by skill match
  isTechnology?: boolean; // Phase 1: Requirements Checker
  isPrivateLife?: boolean; // Phase 4: Private Life Gating
}

interface SkillRollAugmentation {
  cardDice: number;
  bankDice: number;
  coolDice: number;
  talentDie: boolean;
  takesFour: boolean;
  requirementTier?: ItemRarity; // Phase 1: Requirements Checker
}

async function buildSkillRollDialog(opts: SkillRollDialogOptions): Promise<SkillRollAugmentation | null> {
  const i18n = game.i18n;

  // Phase 4: Apply private-life gating to augmentation availability
  // #283: Also gate Card dice by skill match
  const canUseCard = opts.availableCardDice > 0 && !(opts.isPrivateLife ?? false) && opts.cardSkillAllowed;
  const canUseBank = opts.availableBank > 0 && !(opts.isPrivateLife ?? false);
  const canUseTalent = opts.hasTalent && !(opts.isPrivateLife ?? false);

  const cardLabel = canUseCard
    ? i18n?.format("INSPECTRES.DialogCardDiceAvailable", { n: String(opts.availableCardDice) }) ?? `Card Dice (${opts.availableCardDice} available)`
    : null;
  const bankLabel = canUseBank ? (i18n?.format("INSPECTRES.DialogBankDice", { max: String(opts.availableBank) }) ?? `Bank Dice (0–${opts.availableBank})`) : null;
  const coolLabel = i18n?.format("INSPECTRES.DialogCoolDice", { max: String(opts.availableCool) }) ?? `Cool Dice (0–${opts.availableCool})`;
  const talentLabel = canUseTalent ? (i18n?.localize("INSPECTRES.DialogTalentDie") ?? "Talent Die") : null;
  const takesFourLabel = i18n?.localize("INSPECTRES.DialogTakesFour") ?? "Take a 4 (skip roll)";
  const baseDiceLabel = i18n?.localize("INSPECTRES.DialogBaseDice") ?? "Base dice";

  const requirementLabel = i18n?.localize("INSPECTRES.DialogRequirementTier") ?? "Requirement";
  const requirementOptions = [
    { value: "", locKey: undefined },
    { value: "common", locKey: "INSPECTRES.Requirement.Common" },
    { value: "rare", locKey: "INSPECTRES.Requirement.Rare" },
    { value: "exotic", locKey: "INSPECTRES.Requirement.Exotic" },
  ];
  const requirementOptionsHtml = requirementOptions
    .map((opt) => {
      if (!opt.value) return `<option value="">None</option>`;
      // Foundry i18n.localize returns string | void; provide fallback for both undefined cases
      const localized = opt.locKey ? (i18n?.localize(opt.locKey) ?? opt.value) : opt.value;
      return `<option value="${opt.value}">${localized}</option>`;
    })
    .join("");
  const requirementSection = opts.isTechnology ? `
    <label>${requirementLabel}: <select name="requirementTier">
      ${requirementOptionsHtml}
    </select></label>
  ` : "";

  const zeroDiceWarning = opts.effectiveDice === 0
    ? `<div class="inspectres-warning-zero-dice">
        <strong>${i18n?.localize("INSPECTRES.WarningZeroDice") ?? "⚠ No Dice to Roll"}</strong><br>
        ${i18n?.localize("INSPECTRES.WarningZeroDiceDetail") ?? "You have 0 base dice. Adding augmentations will let you roll normally, otherwise you'll roll 2d6 and take the lowest."}
      </div>`
    : "";

  const content = `
    <div class="inspectres-roll-dialog">
      ${zeroDiceWarning}
      <p><strong>${baseDiceLabel}:</strong> ${opts.effectiveDice}</p>
      ${requirementSection}
      ${cardLabel ? `<label><input type="checkbox" name="cardDice"> ${cardLabel}</label>` : ""}
      ${bankLabel ? `<label>${bankLabel}: <input type="number" name="bankDice" min="0" max="${opts.availableBank}" value="0"></label>` : ""}
      ${opts.availableCool > 0 ? `<label>${coolLabel}: <input type="number" name="coolDice" min="0" max="${opts.availableCool}" value="0"></label>` : ""}
      ${talentLabel ? `<label><input type="checkbox" name="talentDie"> ${talentLabel}</label>` : ""}
      ${opts.canTakeFour ? `<label><input type="checkbox" name="takesFour"> ${takesFourLabel}</label>` : ""}
    </div>
  `;

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: `${i18n?.localize("INSPECTRES.SkillRoll") ?? "Skill Roll"}: ${opts.skillName}` },
    rejectClose: false,
    content,
    buttons: [
      {
        action: "roll",
        label: i18n?.localize("INSPECTRES.DialogRoll") ?? "Roll",
        default: true,
        callback: (_event: Event, _button: HTMLButtonElement, dialog: foundry.applications.api.DialogV2) => {
          const form = dialog.element.querySelector("form") as HTMLFormElement | null;
          if (!form) {
            console.error("buildSkillRollDialog: form element not found in dialog");
            return null;
          }
          const data = new FormData(form);
          const cardDice = data.has("cardDice") ? opts.availableCardDice : 0;
          const bankDice = Math.min(Number(data.get("bankDice") ?? 0), opts.availableBank);
          const coolDice = Math.min(Number(data.get("coolDice") ?? 0), opts.availableCool);
          const talentDie = data.has("talentDie");
          const takesFour = data.has("takesFour");
          const requirementTierEntry = data.get("requirementTier");
          const requirementTierRaw = typeof requirementTierEntry === "string" ? requirementTierEntry : "";
          const requirementTier = (requirementTierRaw === "common" || requirementTierRaw === "rare" || requirementTierRaw === "exotic")
            ? requirementTierRaw
            : undefined;
          if (requirementTierRaw && !requirementTier) {
            console.error(
              `buildSkillRollDialog: invalid requirementTier value "${requirementTierRaw}". Expected one of: common, rare, exotic. Treating as undefined.`,
            );
          }
          return {
            cardDice,
            bankDice: Number.isNaN(bankDice) ? 0 : bankDice,
            coolDice: Number.isNaN(coolDice) ? 0 : coolDice,
            talentDie,
            takesFour,
            requirementTier,
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
  if (result === null || result === undefined) return null;
  return result as SkillRollAugmentation;
}

// ---------------------------------------------------------------------------
// executeBankRoll
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Stress Roll Helpers (reduce executeStressRoll complexity)
// ---------------------------------------------------------------------------

/** Compute effective face after cool dice removed. */
function getStressOutcomeFace(faces: number[], coolDiceUsed: number): DieFace {
  const sorted = [...faces].sort((a, b) => a - b);
  const active = sorted.slice(coolDiceUsed);
  const rawLowest = active.length > 0 ? (active[0] ?? 6) : 6;
  return isDieFace(rawLowest) ? rawLowest : 1;
}

/** Roll for death outcome if death mode and outcome is fatal. */
async function rollDeathOutcome(
  agent: RollActor,
  deathModeActive: boolean,
  effectiveFace: DieFace,
): Promise<DeathDismembermentOutcome | null> {
  if (!deathModeActive || effectiveFace > 2) return null;

  const roll = await new Roll("1d3").evaluate();
  const result = roll.total ?? 0;
  if (result < 1 || result > 3) {
    const errorMsg = `Invalid d3 result in death roll: ${result} (expected 1–3). Stress roll aborted. Agent: ${agent.name} (${agent.id})`;
    ui.notifications?.error("[INSPECTRES] Death roll validation failed");
    throw new Error(errorMsg);
  }
  const deathKey = result as D3Result;
  const outcome = DEATH_DISMEMBERMENT_CHART[deathKey];
  if (!outcome) {
    const errorMsg = `Death outcome missing for d3 result ${deathKey}. This indicates corrupted DEATH_DISMEMBERMENT_CHART. Agent: ${agent.name} (${agent.id})`;
    ui.notifications?.error("[INSPECTRES] Death chart lookup failed");
    throw new Error(errorMsg);
  }
  return outcome;
}

/** Get penalty choices from player (before applying updates). */
async function getPenaltyChoices(
  system: AgentData,
  effectiveFace: DieFace,
  outcome: StressRollOutcome,
  stressDiceCount: number,
): Promise<{ meltdownSkill: SkillName | null; penaltySkill: SkillName | null }> {
  let meltdownSkill: SkillName | null = null;
  let penaltySkill: SkillName | null = null;

  if (effectiveFace === 1) {
    meltdownSkill = await getPlayerPenaltyChoice(system, stressDiceCount);
  } else if (outcome.skillPenalty > 0) {
    penaltySkill = await getPlayerPenaltyChoice(system, outcome.skillPenalty);
  }

  return { meltdownSkill, penaltySkill };
}

/** Build update data from stress roll outcome and choices. */
function buildStressUpdateData(
  system: AgentData,
  effectiveFace: DieFace,
  outcome: StressRollOutcome,
  meltdownSkill: SkillName | null,
  penaltySkill: SkillName | null,
  deathOutcome: DeathDismembermentOutcome | null,
  stressDiceCount: number,
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  if (effectiveFace === 1) {
    updateData["system.cool"] = 0;
    if (meltdownSkill) {
      applySkillPenalty(updateData, system, stressDiceCount, meltdownSkill);
    }
  } else {
    if (outcome.coolGain > 0) {
      updateData["system.cool"] = system.cool + outcome.coolGain;
    }
    if (penaltySkill) {
      applySkillPenalty(updateData, system, outcome.skillPenalty, penaltySkill);
    }
  }

  if (deathOutcome) {
    if ("isDead" in deathOutcome && deathOutcome.isDead) {
      updateData["system.isDead"] = true;
    } else if ("daysOutOfAction" in deathOutcome) {
      updateData["system.daysOutOfAction"] = deathOutcome.daysOutOfAction;
      updateData["system.recoveryStartedAt"] = getCurrentDay();
    }
  }

  return updateData;
}

// ---------------------------------------------------------------------------
// executeStressRoll
// ---------------------------------------------------------------------------

export async function executeStressRoll(
  agent: RollActor,
  params: StressRollParams,
  franchise: RollActor | null = null,
): Promise<void> {
  if (!game.user?.isGM) {
    throw new Error("Stress rolls can only be initiated by the GM");
  }

  // Recovery check is the responsibility of the UI layer (AgentSheet).
  // The UI displays warnings and prevents roll initiation for agents who are recovering/dead.
  // Removing this defensive check prevents error translation loss and focuses validation at the boundary.
  // If an agent somehow rolls while recovering due to a UI race condition, the error should propagate to the caller.

  const system = agentSystemData(agent);
  const { stressDiceCount, coolDiceUsed } = params;

  const { roll, faces } = await rollDice(stressDiceCount);
  const effectiveFace = getStressOutcomeFace(faces, coolDiceUsed);
  const outcome = STRESS_ROLL_CHART[effectiveFace];

  const franchiseSystem = franchise ? getActorSystem<FranchiseData>(franchise) : null;
  const deathModeActive = franchiseSystem?.deathMode ?? false;
  const deathOutcome = await rollDeathOutcome(agent, deathModeActive, effectiveFace);

  // Issue #440: Validate all player inputs (penalty dialogs) BEFORE applying any state changes.
  const { meltdownSkill, penaltySkill } = await getPenaltyChoices(system, effectiveFace, outcome, stressDiceCount);

  // Build update data from choices
  const updateData = buildStressUpdateData(system, effectiveFace, outcome, meltdownSkill, penaltySkill, deathOutcome, stressDiceCount);

  if (Object.keys(updateData).length > 0) {
    try {
      await actorUpdate(agent, updateData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const failedFields = Object.keys(updateData).join(", ");
      ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorStressRollFailed") ?? "Failed to apply stress roll to agent");
      const userError = new Error(
        `Failed to apply stress roll to ${agent.name}: ${message}. Failed fields: ${failedFields}`,
      );
      throw userError;
    }
  }

  // Hazard pay (rules: +1 franchise die per non-Weird agent at mission end) is deferred to mission resolution.
  // See GitHub issue for implementation of mission-end hazard pay calculation.

  // Only post ChatMessage if franchise is not in debt mode (#455)
  if (!franchiseSystem?.debtMode) {
    // ChatMessage.getSpeaker requires the full Actor type; RollActor satisfies the needed fields at runtime
    const speaker = ChatMessage.getSpeaker({ actor: agent as Actor });
    const content = await foundry.applications.handlebars.renderTemplate("systems/inspectres/templates/roll-card.hbs", {
      rollType: "stress",
      title: game.i18n?.localize("INSPECTRES.StressRoll") ?? "Stress Roll",
      result: deathOutcome?.result ?? outcome.result,
      narration: deathOutcome?.narration ?? outcome.narration,
      stressDiceCount,
      coolDiceUsed,
      diceRolled: faces,
      effectiveFace,
      deathOutcome: deathOutcome ?? null,
      penaltyNote: !deathOutcome && effectiveFace <= 3 ? buildPenaltyNote(effectiveFace as 1 | 2 | 3, stressDiceCount) : null,
    });
    await postChatCard(content, speaker, [roll]);
  }
}

export function buildPenaltyNote(face: 1 | 2 | 3, stressDiceCount: number): string {
  switch (face) {
    case 3:
      return game.i18n?.localize("INSPECTRES.PenaltyNote.Minor") ?? "Minor consequence";
    case 2:
      return game.i18n?.localize("INSPECTRES.PenaltyNote.Major") ?? "Major consequence";
    case 1:
      return game.i18n?.format("INSPECTRES.PenaltyNote.Meltdown", { count: String(stressDiceCount) }) ?? `Meltdown (${stressDiceCount} stress dice)`;
    default: {
      const _exhaustive: never = face;
      throw new Error(`buildPenaltyNote: unexpected face value ${JSON.stringify(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// executeClientRoll
// ---------------------------------------------------------------------------

export async function executeClientRoll(franchise: RollActor): Promise<void> {
  // Client rolls require a franchise actor — cannot be run as a standalone tool.
  // The franchise provides the GM context for generating random client attributes.
  // #274: Validate that franchise system is valid before proceeding.
  try {
    getActorSystem<FranchiseData>(franchise);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[INSPECTRES] Client roll validation failed:", {
      franchiseId: franchise.id,
      franchiseName: franchise.name,
      error: err,
      errorMessage: message,
    });
    ui.notifications?.error(game.i18n?.localize("INSPECTRES.ErrorClientRollFailed") ?? "Client roll requires valid franchise actor");
    throw new Error(
      `Client roll requires valid franchise actor with system data. ${franchise.name} (ID: ${franchise.id}): ${message}`,
    );
  }

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

  // ChatMessage.getSpeaker requires the full Actor type; RollActor satisfies the needed fields at runtime
  const speaker = ChatMessage.getSpeaker({ actor: franchise as Actor });
  const content = await foundry.applications.handlebars.renderTemplate("systems/inspectres/templates/roll-card.hbs", {
    rollType: "client",
    title: game.i18n?.localize("INSPECTRES.ClientRoll") ?? "Client Roll",
    client: generated,
  });
  // Client roll results are GM prep — whisper to all GMs only
  const gmIds = (game.users?.filter((u) => u.isGM).map((u) => u.id).filter((id): id is string => id !== null)) ?? [];
  // fvtt-types ChatMessage.create expects strict DocumentData; whisper/rolls fields are valid at runtime
  await ChatMessage.create({ content, speaker, rolls, whisper: gmIds } as unknown as Parameters<typeof ChatMessage.create>[0]);
}
