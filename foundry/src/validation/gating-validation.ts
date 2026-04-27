// Validation functions for skill roll gating and error handling.
// Centralizes validation logic used across augmentation dialog, agent sheet, and mission tracker.

export interface GatingValidationResult {
  allowed: boolean;
  blockReason: string;
}

export interface CoolCapValidationResult {
  valid: boolean;
  shouldReset: boolean;
  resetValue?: number;
}

export interface ZeroDiceWarning {
  needsWarning: boolean;
  warningMessage: string;
}

export interface HalfDiceResolution {
  remaining: number;
  description: string;
}

// ============================================================================
// #281 — Take 4 Gating: Only available when original skill rating >= 4
// ============================================================================

export function validateTake4Gating(originalSkillRating: number): GatingValidationResult {
  if (originalSkillRating >= 4) {
    return { allowed: true, blockReason: "" };
  }
  return {
    allowed: false,
    blockReason: "INSPECTRES.Error.Take4RequiresSkillRating4",
  };
}

// ============================================================================
// #283 — Card Dice Gating: Only available for matching skill
// ============================================================================

export function validateCardDiceGating(
  selectedSkill: string | null,
  cardSkill: string | null,
): GatingValidationResult {
  if (!cardSkill) {
    return { allowed: false, blockReason: "INSPECTRES.Error.NoCardDiceAvailable" };
  }
  if (selectedSkill === cardSkill) {
    return { allowed: true, blockReason: "" };
  }
  return {
    allowed: false,
    blockReason: "INSPECTRES.Error.CardDiceSkillMismatch",
  };
}

// ============================================================================
// #282 — Cool Cap Post-Load Validation: 3-die max for normal agents
// ============================================================================

export function validateCoolCapPostLoad(
  agentType: "normal" | "weird",
  currentCool: number,
): CoolCapValidationResult {
  if (agentType === "weird") {
    // Weird agents have no cool cap
    return { valid: true, shouldReset: false };
  }
  // Normal agents: cap at 3
  if (currentCool > 3) {
    return { valid: true, shouldReset: true, resetValue: 3 };
  }
  return { valid: true, shouldReset: false };
}

// ============================================================================
// #260 — Zero-Dice Roll Warning: Inform player of 2d6 take-lowest rule
// ============================================================================

export function validateZeroDiceRoll(diceCount: number): ZeroDiceWarning {
  if (diceCount === 0) {
    return {
      needsWarning: true,
      warningMessage:
        "INSPECTRES.Warn.ZeroDiceRollAutoFails\n" +
        "Rolling 0 dice forces an auto-fail roll: roll 2d6 and take the lowest die result.",
    };
  }
  return { needsWarning: false, warningMessage: "" };
}

// ============================================================================
// #268 — Half-Dice Rule on Premature Job End
// ============================================================================

export function validateHalfDiceOnJobEnd(
  currentPool: number,
  endType: "premature" | "complete" | "vacation",
): HalfDiceResolution {
  if (endType === "premature") {
    const remaining = Math.floor(currentPool / 2);
    return {
      remaining,
      description: `Job ended early. Keeping half dice: ${currentPool} → ${remaining}`,
    };
  }
  if (endType === "vacation") {
    // Starting vacation: preserve pool for later distribution
    return {
      remaining: currentPool,
      description: `Vacation started. Pool preserved: ${currentPool}`,
    };
  }
  // Normal completion (complete)
  return {
    remaining: 0,
    description: `Mission completed. Pool zeroed for distribution: ${currentPool} → 0`,
  };
}
