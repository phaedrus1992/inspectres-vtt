import { gateAugmentationsForPrivateLife } from "../rolls/private-life-roll.js";
import type { Augmentations } from "../rolls/private-life-roll.js";

export interface SkillRollContext {
  agentName: string;
  skillName: string;
  skillRank: number;
  isPrivateLife: boolean;
  augmentations: Augmentations;
}

export interface SkillRollContextInput {
  agentName: string;
  skillName: string;
  skillRank: number;
  isPrivateLife: boolean;
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

  return {
    agentName: input.agentName,
    skillName: input.skillName,
    skillRank: input.skillRank,
    isPrivateLife: input.isPrivateLife,
    augmentations: gatedAugmentations,
  };
}
