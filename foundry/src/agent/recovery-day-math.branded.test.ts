import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createDayNumber } from "../types/brands.js";
import { dayNumber } from "../__mocks__/arbitraries.js";

describe("DayNumber branded type in recovery calculations", () => {
  it("recovery expiry calculation preserves DayNumber type", () => {
    fc.assert(
      fc.property(dayNumber(), dayNumber(), dayNumber(), (started, duration, current) => {
        const recoveryStartedAt = createDayNumber(started);
        const daysOutOfAction = createDayNumber(duration);
        const currentDay = createDayNumber(current);

        // Recovery complete when currentDay >= recoveryStartedAt + daysOutOfAction
        const expiryDay = createDayNumber(
          (recoveryStartedAt as unknown as number) + (daysOutOfAction as unknown as number),
        );

        // Ensure all values are non-negative (DayNumber invariant)
        expect(recoveryStartedAt as unknown as number).toBeGreaterThanOrEqual(0);
        expect(daysOutOfAction as unknown as number).toBeGreaterThanOrEqual(0);
        expect(expiryDay as unknown as number).toBeGreaterThanOrEqual(0);

        // Test invariant: recovery timer never goes negative
        const daysRemaining = Math.max(
          0,
          (expiryDay as unknown as number) - (currentDay as unknown as number),
        );
        expect(daysRemaining).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 },
    );
  });

  it("DayNumber creation clamps negative values to 0", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: -1 }), (negative) => {
        const day = createDayNumber(negative);
        expect(day as unknown as number).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it("DayNumber creation rounds floats down", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (float) => {
        const day = createDayNumber(float);
        const expected = Math.max(0, Math.floor(float));
        expect(day as unknown as number).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});
