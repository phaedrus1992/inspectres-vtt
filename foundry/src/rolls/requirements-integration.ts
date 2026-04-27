export interface MissionState {
  itemRarity: "common" | "rare" | "exotic";
  requirementsMet: boolean;
}

export function canTechnologyRoll(mission: MissionState | null): boolean {
  if (!mission) {
    return true;
  }

  return mission.requirementsMet;
}

export function getRequirementBlockReason(mission: MissionState | null): string {
  if (!mission || mission.requirementsMet) {
    return "";
  }

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
