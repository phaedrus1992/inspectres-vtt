export interface MissionState {
  itemRarity: "common" | "rare" | "exotic";
  requirementsMet: boolean;
}

function validateMissionState(mission: unknown): asserts mission is MissionState {
  if (typeof mission !== "object" || mission === null) {
    throw new Error("Mission state must be an object");
  }
  const obj = mission as Record<string, unknown>;

  const validRarities = ["common", "rare", "exotic"];
  if (!validRarities.includes(obj["itemRarity"] as string)) {
    throw new Error("Mission itemRarity must be one of: common, rare, exotic");
  }

  if (typeof obj["requirementsMet"] !== "boolean") {
    throw new Error("Mission requirementsMet field must be boolean");
  }
}

export function canTechnologyRoll(mission: MissionState | null): boolean {
  // #330: P0 blocker — fail-closed. No mission data = cannot verify requirements = deny
  if (!mission) {
    return false;
  }

  validateMissionState(mission);
  return mission.requirementsMet;
}

export function getRequirementBlockReason(mission: MissionState | null): string {
  // #330: P0 blocker — null mission means no requirements check possible = provide reason
  if (!mission) {
    return "INSPECTRES.Error.NoMissionState";
  }

  if (mission.requirementsMet) {
    return "";
  }

  validateMissionState(mission);

  // Return localization key that describes the requirement tier
  switch (mission.itemRarity) {
    case "common":
      return "INSPECTRES.Requirement.Common";
    case "rare":
      return "INSPECTRES.Requirement.Rare";
    case "exotic":
      return "INSPECTRES.Requirement.Exotic";
    default:
      return "";
  }
}
