import { gateAugmentationsForPrivateLife } from "../rolls/private-life-roll.js";
import type { Augmentations } from "../rolls/private-life-roll.js";
import { validateTake4Gating, validateCardDiceGating } from "../validation/gating-validation.js";
import type { SkillName } from "../rolls/roll-executor.js";

export interface SkillRollContext {
  agentName: string;
  skillName: string;
  skillRank: number;
  isPrivateLife: boolean;
  augmentations: Augmentations;
  take4Allowed: boolean;
  cardSkillAllowed: boolean;
}

export interface SkillRollContextInput {
  agentName: string;
  skillName: SkillName;
  skillRank: number;
  isPrivateLife: boolean;
  originalSkillRating?: number;
  cardSkill?: string;
  availableAugmentations: {
    cool: boolean;
    card: boolean;
    bank: boolean;
    talent: boolean;
  };
}

export function prepareSkillRollContext(input: SkillRollContextInput): SkillRollContext {
  const augmentations: Augmentations = {
    cool: { available: input.availableAugmentations.cool, selected: false },
    card: { available: input.availableAugmentations.card, selected: false },
    bank: { available: input.availableAugmentations.bank, selected: false },
    talent: { available: input.availableAugmentations.talent, selected: false },
  };

  const gatedAugmentations = gateAugmentationsForPrivateLife(augmentations, input.isPrivateLife);

  // #281: Gate Take 4 by original skill rating
  const take4Check = validateTake4Gating(input.originalSkillRating ?? 0);
  const take4Allowed = take4Check.allowed;

  // #283: Gate Card dice by matching skill
  const cardCheck = validateCardDiceGating(input.skillName, input.cardSkill ?? null);
  const cardSkillAllowed = cardCheck.allowed;

  return {
    agentName: input.agentName,
    skillName: input.skillName,
    skillRank: input.skillRank,
    isPrivateLife: input.isPrivateLife,
    augmentations: gatedAugmentations,
    take4Allowed,
    cardSkillAllowed,
  };
}
