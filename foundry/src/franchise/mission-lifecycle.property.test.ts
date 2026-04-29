/**
 * Property-based tests for mission lifecycle math invariants.
 * missionPool >= missionGoal → mission complete.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { missionPool } from "../__mocks__/arbitraries.js";

function isMissionComplete(pool: number, goal: number): boolean {
  return goal > 0 && pool >= goal;
}

function progressPercent(pool: number, goal: number): number {
  return goal > 0 ? Math.min(100, Math.round((pool / goal) * 100)) : 0;
}

describe("mission completion invariants", () => {
  it("missionPool >= missionGoal (> 0) always means complete", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 0, max: 10 }),
        (goal, extra) => {
          const pool = goal + extra;
          expect(isMissionComplete(pool, goal)).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("missionPool < missionGoal is never complete", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 1, max: 30 }),
        (goal, deficit) => {
          const pool = Math.max(0, goal - deficit);
          fc.pre(pool < goal);
          expect(isMissionComplete(pool, goal)).toBe(false);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("zero goal never marks mission complete", () => {
    fc.assert(
      fc.property(missionPool(), (pool) => {
        expect(isMissionComplete(pool, 0)).toBe(false);
      }),
      { numRuns: 1000 },
    );
  });

  it("progress percent is always in [0, 100]", () => {
    fc.assert(
      fc.property(missionPool(), missionPool(), (pool, goal) => {
        const pct = progressPercent(pool, goal);
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThanOrEqual(100);
      }),
      { numRuns: 1000 },
    );
  });

  it("progress percent = 0 when goal = 0", () => {
    fc.assert(
      fc.property(missionPool(), (pool) => {
        expect(progressPercent(pool, 0)).toBe(0);
      }),
      { numRuns: 1000 },
    );
  });

  it("progress percent = 100 when pool >= goal (> 0)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 0, max: 30 }),
        (goal, extra) => {
          const pool = goal + extra;
          expect(progressPercent(pool, goal)).toBe(100);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("adding dice to pool never decreases progress", () => {
    fc.assert(
      fc.property(
        missionPool(),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 0, max: 10 }),
        (pool, goal, added) => {
          const before = progressPercent(pool, goal);
          const after = progressPercent(pool + added, goal);
          expect(after).toBeGreaterThanOrEqual(before);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
