/**
 * Property-based tests for gating validation functions.
 * These are pure functions — ideal for property testing.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  validateTake4Gating,
  validateCardDiceGating,
  validateZeroDiceRoll,
  validateHalfDiceOnJobEnd,
} from "./gating-validation.js";

describe("validateTake4Gating invariants", () => {
  it("allowed=true when originalSkillRating >= 4", () => {
    fc.assert(
      fc.property(fc.integer({ min: 4, max: 100 }), (rating) => {
        const result = validateTake4Gating(rating);
        expect(result.allowed).toBe(true);
        expect(result.blockReason).toBe("");
      }),
      { numRuns: 1000 },
    );
  });

  it("allowed=false when originalSkillRating < 4", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 3 }), (rating) => {
        const result = validateTake4Gating(rating);
        expect(result.allowed).toBe(false);
        expect(result.blockReason.length).toBeGreaterThan(0);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("validateCardDiceGating invariants", () => {
  it("allowed=true when selectedSkill matches cardSkill", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("academics", "athletics", "technology", "contact"),
        (skill) => {
          const result = validateCardDiceGating(skill, skill);
          expect(result.allowed).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("allowed=false when cardSkill is null (no card dice available)", () => {
    fc.assert(
      fc.property(
        fc.option(fc.constantFrom("academics", "athletics", "technology")),
        (selectedSkill) => {
          const result = validateCardDiceGating(selectedSkill ?? null, null);
          expect(result.allowed).toBe(false);
          expect(result.blockReason.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("allowed=false when skills differ", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("academics", "athletics"),
        fc.constantFrom("technology", "contact"),
        (skill1, skill2) => {
          const result = validateCardDiceGating(skill1, skill2);
          expect(result.allowed).toBe(false);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("validateZeroDiceRoll invariants", () => {
  it("zero dice always triggers warning", () => {
    const result = validateZeroDiceRoll(0);
    expect(result.needsWarning).toBe(true);
    expect(result.warningMessage.length).toBeGreaterThan(0);
  });

  it("positive dice count never triggers warning", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (count) => {
        const result = validateZeroDiceRoll(count);
        expect(result.needsWarning).toBe(false);
        expect(result.warningMessage).toBe("");
      }),
      { numRuns: 1000 },
    );
  });
});

describe("validateHalfDiceOnJobEnd invariants", () => {
  it("premature end: remaining = floor(pool / 2)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (pool) => {
        const result = validateHalfDiceOnJobEnd(pool, "premature");
        expect(result.remaining).toBe(Math.floor(pool / 2));
        expect(result.remaining).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 },
    );
  });

  it("vacation end: pool is preserved unchanged", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (pool) => {
        const result = validateHalfDiceOnJobEnd(pool, "vacation");
        expect(result.remaining).toBe(pool);
      }),
      { numRuns: 1000 },
    );
  });

  it("complete end: pool is zeroed", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (pool) => {
        const result = validateHalfDiceOnJobEnd(pool, "complete");
        expect(result.remaining).toBe(0);
      }),
      { numRuns: 1000 },
    );
  });

  it("premature end: remaining never exceeds original pool", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (pool) => {
        const result = validateHalfDiceOnJobEnd(pool, "premature");
        expect(result.remaining).toBeLessThanOrEqual(pool);
      }),
      { numRuns: 1000 },
    );
  });

  it("premature half-dice is idempotent: applying twice = floor(pool/4)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (pool) => {
        const first = validateHalfDiceOnJobEnd(pool, "premature");
        const second = validateHalfDiceOnJobEnd(first.remaining, "premature");
        expect(second.remaining).toBe(Math.floor(Math.floor(pool / 2) / 2));
      }),
      { numRuns: 1000 },
    );
  });
});
