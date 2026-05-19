// All valid skills for penalty selection — drives dialog rendering and validation.
// Single source of truth: SkillName union is derived from this array.
export const SKILL_NAMES = ["academics", "athletics", "technology", "contact"] as const;

export type SkillName = typeof SKILL_NAMES[number];

export type RollType = "skill" | "bank" | "stress" | "client";

export type D3Result = 1 | 2 | 3;

export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;

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
