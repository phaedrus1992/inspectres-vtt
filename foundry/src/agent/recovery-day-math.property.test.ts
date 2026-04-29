/**
 * Property-based tests for recovery day math invariants.
 * Recovery completes when: currentDay >= recoveryStartedAt + daysOutOfAction
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeRecoveryStatus } from "./recovery-utils.js";
import {
  activeAgentData,
  deadAgentData,
  recoveringAgentData,
  dayNumber,
} from "../__mocks__/arbitraries.js";

describe("recovery day math invariants", () => {
  it("dead agent always returns status=dead regardless of day", () => {
    fc.assert(
      fc.property(deadAgentData(), dayNumber(), (system, currentDay) => {
        const info = computeRecoveryStatus(system, currentDay);
        expect(info.status).toBe("dead");
        expect(info.daysRemaining).toBe(0);
      }),
      { numRuns: 1000 },
    );
  });

  it("active agent (daysOutOfAction=0, isDead=false) always returns status=active", () => {
    fc.assert(
      fc.property(activeAgentData(), dayNumber(), (system, currentDay) => {
        const info = computeRecoveryStatus(system, currentDay);
        expect(info.status).toBe("active");
        expect(info.daysRemaining).toBe(0);
      }),
      { numRuns: 1000 },
    );
  });

  it("daysRemaining is always non-negative", () => {
    fc.assert(
      fc.property(
        recoveringAgentData(),
        dayNumber(),
        (system, currentDay) => {
          const info = computeRecoveryStatus(system, currentDay);
          expect(info.daysRemaining).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("when currentDay >= recoveryStartedAt + daysOutOfAction, status is returned", () => {
    fc.assert(
      fc.property(
        recoveringAgentData(),
        dayNumber(),
        (system, extraDays) => {
          const startDay = system.recoveryStartedAt === 0 ? 1 : system.recoveryStartedAt;
          const completionDay = startDay + system.daysOutOfAction;
          const currentDay = completionDay + extraDays;
          const info = computeRecoveryStatus(
            { ...system, recoveryStartedAt: startDay },
            currentDay,
          );
          expect(info.status).toBe("returned");
          expect(info.daysRemaining).toBe(0);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("when currentDay < recoveryStartedAt + daysOutOfAction, status is recovering", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9000 }),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 0, max: 9000 }),
        (startDay, duration, deficit) => {
          const completionDay = startDay + duration;
          const currentDay = startDay + deficit;
          fc.pre(currentDay < completionDay);
          const system = {
            isDead: false,
            daysOutOfAction: duration,
            recoveryStartedAt: startDay,
            // Other fields not used by computeRecoveryStatus
            description: "",
            skills: {
              academics: { base: 2, penalty: 0 },
              athletics: { base: 2, penalty: 0 },
              technology: { base: 2, penalty: 0 },
              contact: { base: 2, penalty: 0 },
            },
            talent: "",
            cool: 0,
            isWeird: false,
            power: null,
            characteristics: [],
            stress: 0,
          };
          const info = computeRecoveryStatus(system, currentDay);
          expect(info.status).toBe("recovering");
          expect(info.daysRemaining).toBeGreaterThan(0);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("daysRemaining decreases by 1 as currentDay advances by 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9000 }),
        fc.integer({ min: 3, max: 30 }),
        fc.integer({ min: 0, max: 10 }),
        (startDay, duration, elapsed) => {
          const currentDay = startDay + elapsed;
          // Need at least 2 days before completion so both day1 and day2 are recovering
          fc.pre(currentDay + 2 < startDay + duration);
          const system = {
            isDead: false,
            daysOutOfAction: duration,
            recoveryStartedAt: startDay,
            description: "",
            skills: {
              academics: { base: 2, penalty: 0 },
              athletics: { base: 2, penalty: 0 },
              technology: { base: 2, penalty: 0 },
              contact: { base: 2, penalty: 0 },
            },
            talent: "",
            cool: 0,
            isWeird: false,
            power: null,
            characteristics: [],
            stress: 0,
          };
          const day1 = computeRecoveryStatus(system, currentDay);
          const day2 = computeRecoveryStatus(system, currentDay + 1);
          expect(day1.status).toBe("recovering");
          expect(day2.status).toBe("recovering");
          expect(day2.daysRemaining).toBe(day1.daysRemaining - 1);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
