import { describe, it, expect } from "vitest";
import {
  validateTake4Gating,
  validateCardDiceGating,
  validateCoolCapPostLoad,
  validateZeroDiceRoll,
  validateHalfDiceOnJobEnd,
} from "./gating-validation.js";

// ============================================================================
// #281 — Take 4 Gating
// ============================================================================

describe("Take 4 Gating Validation (#281)", () => {
  it("allows Take 4 when original skill rating >= 4", () => {
    const result = validateTake4Gating(4);
    expect(result.allowed).toBe(true);
  });

  it("allows Take 4 when original skill rating > 4", () => {
    const result = validateTake4Gating(5);
    expect(result.allowed).toBe(true);
  });

  it("blocks Take 4 when original skill rating < 4", () => {
    const result = validateTake4Gating(3);
    expect(result.allowed).toBe(false);
    expect(result.blockReason).toContain("INSPECTRES");
  });

  it("blocks Take 4 when original skill rating is 0", () => {
    const result = validateTake4Gating(0);
    expect(result.allowed).toBe(false);
  });
});

// ============================================================================
// #283 — Card Dice Per-Skill Gating
// ============================================================================

describe("Card Dice Per-Skill Gating (#283)", () => {
  it("allows Card dice when selected skill matches card skill", () => {
    const result = validateCardDiceGating("academics", "academics");
    expect(result.allowed).toBe(true);
  });

  it("blocks Card dice when selected skill does not match card skill", () => {
    const result = validateCardDiceGating("academics", "athletics");
    expect(result.allowed).toBe(false);
    expect(result.blockReason).toContain("INSPECTRES");
  });

  it("blocks Card dice when no card skill is available", () => {
    const result = validateCardDiceGating(null, "academics");
    expect(result.allowed).toBe(false);
  });
});

// ============================================================================
// #282 — Cool Cap Enforcement Post-Load
// ============================================================================

describe("Cool Cap Validation Post-Load (#282)", () => {
  it("allows normal agent with cool <= 3", () => {
    const result = validateCoolCapPostLoad("normal", 3);
    expect(result.valid).toBe(true);
    expect(result.shouldReset).toBe(false);
  });

  it("resets normal agent cool from 4 to 3", () => {
    const result = validateCoolCapPostLoad("normal", 4);
    expect(result.valid).toBe(true);
    expect(result.shouldReset).toBe(true);
    expect(result.resetValue).toBe(3);
  });

  it("resets normal agent cool from 6 to 3", () => {
    const result = validateCoolCapPostLoad("normal", 6);
    expect(result.valid).toBe(true);
    expect(result.shouldReset).toBe(true);
    expect(result.resetValue).toBe(3);
  });

  it("allows weird agent with cool > 3", () => {
    const result = validateCoolCapPostLoad("weird", 6);
    expect(result.valid).toBe(true);
    expect(result.shouldReset).toBe(false);
  });

  it("allows weird agent with cool = 4", () => {
    const result = validateCoolCapPostLoad("weird", 4);
    expect(result.valid).toBe(true);
    expect(result.shouldReset).toBe(false);
  });
});

// ============================================================================
// #260 — Zero-Dice Rolls Auto-Fail (UI Warning)
// ============================================================================

describe("Zero-Dice Roll Warning (#260)", () => {
  it("flags zero-dice roll as warning needed", () => {
    const result = validateZeroDiceRoll(0);
    expect(result.needsWarning).toBe(true);
    expect(result.warningMessage).toContain("INSPECTRES");
  });

  it("does not flag 1-die roll as warning", () => {
    const result = validateZeroDiceRoll(1);
    expect(result.needsWarning).toBe(false);
  });

  it("does not flag positive dice roll as warning", () => {
    const result = validateZeroDiceRoll(5);
    expect(result.needsWarning).toBe(false);
  });

  it("warning explains 2d6 take-lowest fallback", () => {
    const result = validateZeroDiceRoll(0);
    expect(result.warningMessage).toMatch(/2d6|lowest/i);
  });
});

// ============================================================================
// #268 — Half-Dice Rule on Job End
// ============================================================================

describe("Job End Half-Dice Rule (#268)", () => {
  it("keeps half dice on premature job end (even pool)", () => {
    const result = validateHalfDiceOnJobEnd(10, "premature");
    expect(result.remaining).toBe(5);
    expect(result.description).toContain("half");
  });

  it("keeps rounded-down half dice on premature job end (odd pool)", () => {
    const result = validateHalfDiceOnJobEnd(7, "premature");
    expect(result.remaining).toBe(3);
  });

  it("zeros dice on normal mission completion", () => {
    const result = validateHalfDiceOnJobEnd(10, "complete");
    expect(result.remaining).toBe(0);
  });

  it("keeps all dice on vacation start", () => {
    const result = validateHalfDiceOnJobEnd(10, "vacation");
    expect(result.remaining).toBe(10);
  });
});
