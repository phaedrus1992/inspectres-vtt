/**
 * Property-based tests for recovery status state machine.
 * Valid states: active | recovering | returned | dead
 * No illegal transitions: returned agents are not dead; dead agents don't recover.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeRecoveryStatus, type RecoveryStatus } from "./recovery-utils.js";
import {
  agentData,
  activeAgentData,
  deadAgentData,
  recoveringAgentData,
  dayNumber,
} from "../__mocks__/arbitraries.js";

const VALID_STATUSES: RecoveryStatus[] = ["active", "dead", "recovering", "returned"];

describe("recovery state machine invariants", () => {
  it("output status is always one of the four valid statuses", () => {
    fc.assert(
      fc.property(agentData(), dayNumber(), (system, currentDay) => {
        const info = computeRecoveryStatus(system, currentDay);
        expect(VALID_STATUSES).toContain(info.status);
      }),
      { numRuns: 1000 },
    );
  });

  it("dead agents never produce recovering or returned status", () => {
    fc.assert(
      fc.property(deadAgentData(), dayNumber(), (system, currentDay) => {
        const info = computeRecoveryStatus(system, currentDay);
        expect(info.status).not.toBe("recovering");
        expect(info.status).not.toBe("returned");
        expect(info.status).not.toBe("active");
      }),
      { numRuns: 1000 },
    );
  });

  it("active agents never produce recovering, returned, or dead status", () => {
    fc.assert(
      fc.property(activeAgentData(), dayNumber(), (system, currentDay) => {
        const info = computeRecoveryStatus(system, currentDay);
        expect(info.status).toBe("active");
      }),
      { numRuns: 1000 },
    );
  });

  it("recovering agents are not dead", () => {
    fc.assert(
      fc.property(
        recoveringAgentData(),
        fc.integer({ min: 0, max: 5 }),
        (system, offsetWithinRecovery) => {
          const startDay = system.recoveryStartedAt === 0 ? 1 : system.recoveryStartedAt;
          const completionDay = startDay + system.daysOutOfAction;
          const currentDay = completionDay - offsetWithinRecovery - 1;
          fc.pre(currentDay >= startDay && currentDay < completionDay);
          const info = computeRecoveryStatus(
            { ...system, recoveryStartedAt: startDay },
            currentDay,
          );
          expect(info.status).toBe("recovering");
          expect(info.status).not.toBe("dead");
          expect(info.daysRemaining).toBeGreaterThan(0);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("returned agents have daysRemaining=0", () => {
    fc.assert(
      fc.property(agentData(), dayNumber(), (system, currentDay) => {
        const info = computeRecoveryStatus(system, currentDay);
        fc.pre(info.status === "returned");
        expect(info.daysRemaining).toBe(0);
      }),
      { numRuns: 1000 },
    );
  });

  it("status monotonically progresses recovering → returned as time advances", () => {
    fc.assert(
      fc.property(
        recoveringAgentData(),
        fc.integer({ min: 0, max: 5 }),
        (system, startOffset) => {
          const startDay = Math.max(1, system.recoveryStartedAt);
          const currentDay = startDay + startOffset;
          const farFutureDay = startDay + system.daysOutOfAction + 100;

          const now = computeRecoveryStatus({ ...system, recoveryStartedAt: startDay }, currentDay);
          const later = computeRecoveryStatus({ ...system, recoveryStartedAt: startDay }, farFutureDay);

          // After enough time: returned (never goes back to recovering from returned)
          expect(later.status).toBe("returned");
          // Now is either recovering or already returned (never dead, never active since daysOutOfAction > 0)
          expect(now.status === "recovering" || now.status === "returned").toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
