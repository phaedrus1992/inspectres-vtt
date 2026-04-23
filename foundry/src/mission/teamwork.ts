export interface TeamworkValidation {
  allowed: boolean;
  autoFails?: boolean;
  warning?: string;
}

export interface DieSelection {
  index: number;
  face: number;
}

export function validateTeamworkAssist(params: { skillRating: number }): TeamworkValidation {
  if (params.skillRating === 1) {
    return {
      allowed: true,
      autoFails: true,
      warning: "Assisting with skill 1 means you automatically fail your own task.",
    };
  }

  return { allowed: true };
}

export function selectDieFromAssist(rollFaces: number[], index: number): number | null {
  if (index < 0 || index >= rollFaces.length) {
    return null;
  }
  return rollFaces[index] ?? null;
}
