/**
 * Property-based tests for stress accumulation/relief invariants.
 * Stress is bounded [0, 6]. Never negative, never above cap.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { stressValue } from "../__mocks__/arbitraries.js";

const STRESS_MAX = 6;
const STRESS_MIN = 0;

function applyStressDelta(current: number, delta: number): number {
  return Math.max(STRESS_MIN, Math.min(STRESS_MAX, current + delta));
}

function reliefStress(current: number, relief: number): number {
  return Math.max(STRESS_MIN, current - relief);
}

describe("stress accumulation invariants", () => {
  it("stress after addition is always within [0, 6]", () => {
    fc.assert(
      fc.property(
        stressValue(),
        fc.integer({ min: 0, max: 10 }),
        (current, gain) => {
          const next = applyStressDelta(current, gain);
          expect(next).toBeGreaterThanOrEqual(STRESS_MIN);
          expect(next).toBeLessThanOrEqual(STRESS_MAX);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("stress after subtraction is always within [0, 6]", () => {
    fc.assert(
      fc.property(
        stressValue(),
        fc.integer({ min: 0, max: 10 }),
        (current, relief) => {
          const next = reliefStress(current, relief);
          expect(next).toBeGreaterThanOrEqual(STRESS_MIN);
          expect(next).toBeLessThanOrEqual(STRESS_MAX);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("stress never goes negative", () => {
    fc.assert(
      fc.property(
        stressValue(),
        fc.integer({ min: 0, max: 100 }),
        (current, relief) => {
          const next = reliefStress(current, relief);
          expect(next).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("stress never exceeds cap (6)", () => {
    fc.assert(
      fc.property(
        stressValue(),
        fc.integer({ min: 0, max: 100 }),
        (current, gain) => {
          const next = applyStressDelta(current, gain);
          expect(next).toBeLessThanOrEqual(STRESS_MAX);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("zero delta leaves stress unchanged", () => {
    fc.assert(
      fc.property(stressValue(), (current) => {
        expect(applyStressDelta(current, 0)).toBe(current);
      }),
      { numRuns: 1000 },
    );
  });

  it("full relief from max stress produces zero", () => {
    fc.assert(
      fc.property(fc.integer({ min: STRESS_MAX, max: STRESS_MAX + 10 }), (relief) => {
        const next = reliefStress(STRESS_MAX, relief);
        expect(next).toBe(0);
      }),
      { numRuns: 500 },
    );
  });

  it("stress cannot be reduced below zero regardless of relief amount", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        fc.integer({ min: 10, max: 100 }),
        (current, massiveRelief) => {
          const next = reliefStress(current, massiveRelief);
          expect(next).toBe(0);
        },
      ),
      { numRuns: 500 },
    );
  });
});
