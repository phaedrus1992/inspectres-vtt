import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createDayNumber, createDiceCount, createStressValue } from "./brands.js";

describe("branded type constructors", () => {
  describe("createStressValue", () => {
    it("clamps to [0, 6]", () => {
      fc.assert(
        fc.property(fc.integer({ min: -100, max: 100 }), (input) => {
          const result = createStressValue(input);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(6);
        }),
        { numRuns: 1000 },
      );
    });

    it("floors input before clamping", () => {
      const test1 = createStressValue(3.7);
      expect(test1).toBe(3);
      const test2 = createStressValue(-2.5);
      expect(test2).toBe(0);
      const test3 = createStressValue(6.3);
      expect(test3).toBe(6);
    });

    it("is idempotent (applying twice == applying once)", () => {
      fc.assert(
        fc.property(fc.integer({ min: -20, max: 20 }), (input) => {
          const once = createStressValue(input);
          const twice = createStressValue(once);
          expect(twice).toBe(once);
        }),
        { numRuns: 500 },
      );
    });
  });

  describe("createDayNumber", () => {
    it("ensures non-negative and floors", () => {
      fc.assert(
        fc.property(fc.integer({ min: -100, max: 1000 }), (input) => {
          const result = createDayNumber(input);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(result)).toBe(true);
        }),
        { numRuns: 1000 },
      );
    });

    it("floors fractional values", () => {
      expect(createDayNumber(5.9)).toBe(5);
      expect(createDayNumber(10.1)).toBe(10);
      expect(createDayNumber(-0.5)).toBe(0);
    });

    it("is idempotent", () => {
      fc.assert(
        fc.property(fc.integer({ min: -50, max: 500 }), (input) => {
          const once = createDayNumber(input);
          const twice = createDayNumber(once);
          expect(twice).toBe(once);
        }),
        { numRuns: 500 },
      );
    });
  });

  describe("createDiceCount", () => {
    it("ensures non-negative and floors", () => {
      fc.assert(
        fc.property(fc.integer({ min: -50, max: 100 }), (input) => {
          const result = createDiceCount(input);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(result)).toBe(true);
        }),
        { numRuns: 1000 },
      );
    });

    it("floors fractional values", () => {
      expect(createDiceCount(3.8)).toBe(3);
      expect(createDiceCount(0.2)).toBe(0);
      expect(createDiceCount(-5.5)).toBe(0);
    });

    it("is idempotent", () => {
      fc.assert(
        fc.property(fc.integer({ min: -30, max: 200 }), (input) => {
          const once = createDiceCount(input);
          const twice = createDiceCount(once);
          expect(twice).toBe(once);
        }),
        { numRuns: 500 },
      );
    });
  });
});
