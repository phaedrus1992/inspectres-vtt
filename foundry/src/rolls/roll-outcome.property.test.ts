/**
 * Property-based tests for roll outcome resolution invariants.
 * Every die face 1–6 maps to exactly one entry in SKILL_ROLL_CHART and STRESS_ROLL_CHART.
 * Skill roll: read highest die. Stress roll: read lowest die.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { SKILL_ROLL_CHART, STRESS_ROLL_CHART } from "./roll-charts.js";
import { dieFace } from "../__mocks__/arbitraries.js";

// ─── Helpers matching roll-executor logic ─────────────────────────────────────

function resolveSkillOutcome(faces: number[]) {
  const highest = Math.max(...faces) as 1 | 2 | 3 | 4 | 5 | 6;
  return SKILL_ROLL_CHART[highest];
}

function resolveStressOutcome(faces: number[], coolDiceUsed: number) {
  const sorted = [...faces].sort((a, b) => a - b);
  const active = sorted.slice(coolDiceUsed);
  const lowest = active.length > 0 ? (active[0] ?? 6) : 6;
  const face = (lowest >= 1 && lowest <= 6 ? lowest : 1) as 1 | 2 | 3 | 4 | 5 | 6;
  return STRESS_ROLL_CHART[face];
}

// ─── Skill roll chart coverage ────────────────────────────────────────────────

describe("SKILL_ROLL_CHART — every die face has an entry", () => {
  it("all faces 1–6 resolve to defined entries", () => {
    fc.assert(
      fc.property(dieFace(), (face) => {
        const entry = SKILL_ROLL_CHART[face];
        expect(entry).toBeDefined();
        expect(typeof entry.result).toBe("string");
        expect(typeof entry.franchiseDice).toBe("number");
        expect(entry.franchiseDice).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 },
    );
  });

  it("franchise dice from skill rolls are always non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(dieFace(), { minLength: 1, maxLength: 10 }),
        (faces) => {
          const outcome = resolveSkillOutcome(faces);
          expect(outcome.franchiseDice).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("only faces 5–6 yield franchise dice from skill rolls", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 4 }), { minLength: 1, maxLength: 10 }),
        (faces) => {
          const outcome = resolveSkillOutcome(faces as Array<1 | 2 | 3 | 4>);
          expect(outcome.franchiseDice).toBe(0);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("face 6 always yields highest franchise dice (2)", () => {
    fc.assert(
      fc.property(
        fc.array(dieFace(), { minLength: 0, maxLength: 9 }),
        (otherFaces) => {
          const faces = [...otherFaces, 6];
          const outcome = resolveSkillOutcome(faces);
          expect(outcome.franchiseDice).toBe(2);
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ─── Stress roll chart coverage ───────────────────────────────────────────────

describe("STRESS_ROLL_CHART — every die face has an entry", () => {
  it("all faces 1–6 resolve to defined entries", () => {
    fc.assert(
      fc.property(dieFace(), (face) => {
        const entry = STRESS_ROLL_CHART[face];
        expect(entry).toBeDefined();
        expect(typeof entry.result).toBe("string");
        expect(typeof entry.skillPenalty).toBe("number");
        expect(typeof entry.coolGain).toBe("number");
      }),
      { numRuns: 1000 },
    );
  });

  it("cool gain from stress rolls is always non-negative", () => {
    fc.assert(
      fc.property(dieFace(), (face) => {
        const entry = STRESS_ROLL_CHART[face];
        expect(entry.coolGain).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 },
    );
  });

  it("reading lowest die from stress roll always resolves to a valid entry", () => {
    fc.assert(
      fc.property(
        fc.array(dieFace(), { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 0, max: 3 }),
        (faces, coolUsed) => {
          // cool dice removal is bounded by available faces
          const safeCool = Math.min(coolUsed, faces.length - 1);
          const outcome = resolveStressOutcome(faces, safeCool);
          expect(outcome).toBeDefined();
          expect(typeof outcome.result).toBe("string");
        },
      ),
      { numRuns: 1000 },
    );
  });
});
