/**
 * Property-based tests for dice pool calculation invariants.
 * Pool = skill.base - skill.penalty, clamped to >= 0.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { skillRank, skillPenalty } from "../__mocks__/arbitraries.js";

function computeEffectiveDice(base: number, penalty: number): number {
  return Math.max(0, base - penalty);
}

describe("dice pool invariants", () => {
  it("pool is always non-negative regardless of base/penalty", () => {
    fc.assert(
      fc.property(skillRank(), skillPenalty(), (base, penalty) => {
        const pool = computeEffectiveDice(base, penalty);
        expect(pool).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 },
    );
  });

  it("pool never exceeds base rank", () => {
    fc.assert(
      fc.property(skillRank(), skillPenalty(), (base, penalty) => {
        const pool = computeEffectiveDice(base, penalty);
        expect(pool).toBeLessThanOrEqual(base);
      }),
      { numRuns: 1000 },
    );
  });

  it("zero penalty means pool equals base rank", () => {
    fc.assert(
      fc.property(skillRank(), (base) => {
        const pool = computeEffectiveDice(base, 0);
        expect(pool).toBe(base);
      }),
      { numRuns: 1000 },
    );
  });

  it("penalty equal to base produces zero pool", () => {
    fc.assert(
      fc.property(skillRank(), (base) => {
        const pool = computeEffectiveDice(base, base);
        expect(pool).toBe(0);
      }),
      { numRuns: 1000 },
    );
  });

  it("penalty exceeding base still produces zero pool (no negative)", () => {
    fc.assert(
      fc.property(
        skillRank(),
        fc.integer({ min: 1, max: 20 }),
        (base, extra) => {
          const pool = computeEffectiveDice(base, base + extra);
          expect(pool).toBe(0);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
