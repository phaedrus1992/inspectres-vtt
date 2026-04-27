import { canTechnologyRoll, getRequirementBlockReason } from "./requirements-integration.js";

export interface TechnologyRollCheckResult {
  allowed: boolean;
  blockReason: string;
}

export function checkTechnologyRollRequirements(
  mission: { itemRarity: "common" | "rare" | "exotic"; requirementsMet: boolean } | null,
): TechnologyRollCheckResult {
  const allowed = canTechnologyRoll(mission);
  const blockReason = allowed ? "" : getRequirementBlockReason(mission);

  return { allowed, blockReason };
}
