export type ItemRarity = "common" | "rare" | "exotic";

export interface RequirementTier {
  readonly minRoll: number;
  readonly description: string;
  readonly localizationKey: string;
}

const REQUIREMENT_TIERS: Record<ItemRarity, RequirementTier> = {
  common: {
    minRoll: 4,
    description: "Laptop, mobile phone, standard firearm, hiking gear",
    localizationKey: "INSPECTRES.Requirement.Common",
  },
  rare: {
    minRoll: 5,
    description: "Antique swords, flamethrowers, mil-spec gear, 1957 Chevy",
    localizationKey: "INSPECTRES.Requirement.Rare",
  },
  exotic: {
    minRoll: 6,
    description: "Grimoires, laser rifles, ectoplasm reticulators, enchanted objects",
    localizationKey: "INSPECTRES.Requirement.Exotic",
  },
};

export function getRequirementTier(rarity: ItemRarity): RequirementTier {
  return REQUIREMENT_TIERS[rarity];
}

export function isRollSufficient(rollResult: number, rarity: ItemRarity): boolean {
  const tier = getRequirementTier(rarity);
  return rollResult >= tier.minRoll;
}

export function checkDefect(rollResult: number, rarity: ItemRarity): boolean {
  const tier = getRequirementTier(rarity);
  return rollResult === tier.minRoll - 1 && rarity !== "common";
}
