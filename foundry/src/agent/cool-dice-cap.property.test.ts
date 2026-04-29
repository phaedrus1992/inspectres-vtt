/**
 * Property-based tests for cool dice cap invariants.
 * Normal agents: cap at 3. Weird agents: uncapped.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateCoolCapPostLoad } from "../validation/gating-validation.js";

const NORMAL_COOL_CAP = 3;

describe("cool dice cap invariants", () => {
  it("normal agents with cool > 3 always get reset to 3", () => {
    fc.assert(
      fc.property(fc.integer({ min: 4, max: 100 }), (cool) => {
        const result = validateCoolCapPostLoad("normal", cool);
        expect(result.shouldReset).toBe(true);
        expect(result.resetValue).toBe(NORMAL_COOL_CAP);
      }),
      { numRuns: 1000 },
    );
  });

  it("normal agents with cool <= 3 are never reset", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3 }), (cool) => {
        const result = validateCoolCapPostLoad("normal", cool);
        expect(result.shouldReset).toBe(false);
        expect(result.resetValue).toBeUndefined();
      }),
      { numRuns: 1000 },
    );
  });

  it("weird agents are never reset regardless of cool count", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (cool) => {
        const result = validateCoolCapPostLoad("weird", cool);
        expect(result.shouldReset).toBe(false);
        expect(result.resetValue).toBeUndefined();
      }),
      { numRuns: 1000 },
    );
  });

  it("validation always returns valid=true", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant("normal"), fc.constant("weird")) as fc.Arbitrary<"normal" | "weird">,
        fc.integer({ min: 0, max: 100 }),
        (agentType, cool) => {
          const result = validateCoolCapPostLoad(agentType, cool);
          expect(result.valid).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("reset value is always exactly NORMAL_COOL_CAP when triggered", () => {
    fc.assert(
      fc.property(fc.integer({ min: 4, max: 1000 }), (cool) => {
        const result = validateCoolCapPostLoad("normal", cool);
        if (result.shouldReset) {
          expect(result.resetValue).toBe(NORMAL_COOL_CAP);
        }
      }),
      { numRuns: 1000 },
    );
  });
});
