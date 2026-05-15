export { type RollActor } from "../utils/system-cast.js";
import { getActorSystem, type RollActor } from "../utils/system-cast.js";
import {
  SKILL_ROLL_CHART,
  type SkillRollOutcome,
} from "./roll-charts.js";
import { resolveBankDice } from "./bank-roll.js";
import { type AgentData } from "../agent/agent-schema.js";
import { agentSystemData } from "../agent/agent-system-data.js";
import { type FranchiseData } from "../franchise/franchise-schema.js";
import { emitMissionPoolUpdated } from "../mission/socket.js";
import { type ItemRarity, isRollSufficient, checkDefect } from "../mission/requirements-checker.js";
import { prepareSkillRollContext, type SkillRollContextInput } from "../agent/skill-roll-dialog.js";
import { checkTechnologyRollRequirements } from "./skill-roll-executor.js";
import { stopDialogSubmitPropagation } from "../utils/dialog-utils.js";
import { createChatMessage } from "../utils/fvtt-boundary.js";
import { getDevLogger } from "../utils/dev-logger.js";
import {
  isDieFace,
  actorUpdate,
  rollDice,
  getOutcomeClassification,
} from "./roll-helpers.js";

export {
  type SkillName,
  type RollType,
  type BankDieResolution,
  type BankResolutionSummary,
  type StressRollParams,
} from "./roll-types.js";
import { type SkillName, type BankResolutionSummary, type DieFace } from "./roll-types.js";


export { resolveBankDice, executeBankRoll } from "./bank-roll.js";
export { executeStressRoll, buildPenaltyNote, SKILL_NAMES } from "./stress-roll.js";

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
    await createChatMessage({
      content,
      speaker,
      rolls: [mainRoll],
      flags: {
        inspectres: {
          outcome: getOutcomeClassification(highestFace),
        },
      },
    });
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
    render: stopDialogSubmitPropagation,
    content,
    buttons: [
      {
        action: "roll",
        label: i18n?.localize("INSPECTRES.DialogRoll") ?? "Roll",
        default: true,
        callback: (_event: Event, _button: HTMLButtonElement, dialog: foundry.applications.api.DialogV2) => {
          const form = dialog.element.querySelector("form") as HTMLFormElement | null;
          if (!form) {
            getDevLogger().error("roll-executor", "buildSkillRollDialog: form element not found in dialog");
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
            getDevLogger().error(
              "roll-executor",
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


export { executeClientRoll } from "./client-roll.js";
