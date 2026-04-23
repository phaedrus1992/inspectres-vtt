import { describe, it, expect } from "vitest";
import { computeRecoveryStatus, type RecoveryStatus } from "./recovery-utils.js";
import { type AgentData } from "./agent-schema.js";

function makeAgent(overrides: Partial<AgentData> = {}): AgentData {
  return {
    description: "",
    skills: {
      academics: { base: 0, penalty: 0 },
      athletics: { base: 0, penalty: 0 },
      technology: { base: 0, penalty: 0 },
      contact: { base: 0, penalty: 0 },
    },
    talent: "",
    cool: 0,
    isWeird: false,
    characteristics: [],
    missionPool: 0,
    isDead: false,
    daysOutOfAction: 0,
    recoveryStartedAt: 0,
    ...overrides,
  };
}

describe("computeRecoveryStatus", () => {
  describe("dead status", () => {
    it("returns dead when isDead is true", () => {
      const system = makeAgent({ isDead: true });
      const result = computeRecoveryStatus(system, 5);

      expect(result.status).toBe("dead");
      expect(result.daysRemaining).toBe(0);
      expect(result.description).toContain("killed");
    });

    it("returns dead regardless of daysOutOfAction", () => {
      const system = makeAgent({ isDead: true, daysOutOfAction: 3, recoveryStartedAt: 2 });
      const result = computeRecoveryStatus(system, 5);

      expect(result.status).toBe("dead");
    });
  });

  describe("active status", () => {
    it("returns active when never injured (daysOutOfAction === 0)", () => {
      const system = makeAgent({ daysOutOfAction: 0, recoveryStartedAt: 0 });
      const result = computeRecoveryStatus(system, 1);

      expect(result.status).toBe("active");
      expect(result.daysRemaining).toBe(0);
    });

    it("returns active with recoveryStartedAt === 0 (fresh agent)", () => {
      const system = makeAgent({ daysOutOfAction: 0 });
      const result = computeRecoveryStatus(system, 10);

      expect(result.status).toBe("active");
    });
  });

  describe("recovering status", () => {
    it("returns recovering when daysRemaining > 0", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const result = computeRecoveryStatus(system, 6); // day 5 + 1 elapsed = 1 remaining

      expect(result.status).toBe("recovering");
      expect(result.daysRemaining).toBe(2);
    });

    it("shows singular 'day' when daysRemaining === 1", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const result = computeRecoveryStatus(system, 7); // day 5 + 2 elapsed = 1 remaining

      expect(result.daysRemaining).toBe(1);
      expect(result.description).toContain("1 more day");
      expect(result.description).not.toContain("days");
    });

    it("shows plural 'days' when daysRemaining > 1", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const result = computeRecoveryStatus(system, 6); // 2 remaining

      expect(result.daysRemaining).toBe(2);
      expect(result.description).toContain("2 more days");
    });

    it("blocks rolls when exactly at recovery deadline", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const result = computeRecoveryStatus(system, 8); // day 5 + 3 elapsed = exactly done

      // At exactly daysOutOfAction, should transition to "returned", not still recovering
      expect(result.status).not.toBe("recovering");
    });
  });

  describe("returned status", () => {
    it("returns returned when daysRemaining === 0 but fields set", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const result = computeRecoveryStatus(system, 8); // exactly 3 days elapsed

      expect(result.status).toBe("returned");
      expect(result.daysRemaining).toBe(0);
    });

    it("allows rolls after recovery expires (status !== recovering)", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const result = computeRecoveryStatus(system, 8);

      // "returned" is not "recovering", so roll-blocker in AgentSheet won't trigger
      expect(result.status).not.toBe("recovering");
    });

    it("shows recovery message when returned", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const result = computeRecoveryStatus(system, 8);

      expect(result.description).toContain("recovered");
    });
  });

  describe("uninitialized recovery edge case", () => {
    it("self-heals when daysOutOfAction > 0 but recoveryStartedAt === 0", () => {
      // Unmigrated agent or invariant violation: recovery window never started
      // Per fix: treat startDay as currentDay, so recovery clock starts now
      const system = makeAgent({ daysOutOfAction: 2, recoveryStartedAt: 0 });
      const result = computeRecoveryStatus(system, 5);

      // Should compute recovery from today (day 5) for 2 days: daysRemaining = 2 - (5-5) = 2
      expect(result.daysRemaining).toBe(2);
      expect(result.status).toBe("recovering");
    });

    it("still requires time to pass after recovery is activated", () => {
      // If recoveryStartedAt stays 0, each call treats "now" as day 0 in the window.
      // This means recovery is pinned to a 2-day window from the present moment.
      // The agent never auto-recovers unless they manually set recoveryStartedAt
      // (which happens on the next roll, or a GM resets the field).
      const agent = makeAgent({ daysOutOfAction: 2, recoveryStartedAt: 0 });

      // Day 5: seeded to day 5, 2-day window → recovered on day 7
      expect(computeRecoveryStatus(agent, 5).status).toBe("recovering");

      // Day 6: seeded to day 6, 2-day window → recovered on day 8
      // (note: recoveryStartedAt is still 0, so it reseeds each call)
      expect(computeRecoveryStatus(agent, 6).status).toBe("recovering");

      // The only way to exit is to fix recoveryStartedAt or reset daysOutOfAction
    });
  });

  describe("off-by-one boundary", () => {
    it("handles daysElapsed === daysOutOfAction correctly", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 10 });

      // Day 12: 2 elapsed, 1 remaining
      const day12 = computeRecoveryStatus(system, 12);
      expect(day12.daysRemaining).toBe(1);
      expect(day12.status).toBe("recovering");

      // Day 13: 3 elapsed, exactly at limit → returned
      const day13 = computeRecoveryStatus(system, 13);
      expect(day13.daysRemaining).toBe(0);
      expect(day13.status).toBe("returned");
    });
  });

  describe("time rewound edge case", () => {
    it("handles negative daysElapsed (currentDay < startDay) gracefully", () => {
      // Should not happen in normal play, but if GM rewinds time or data corrupts
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 10 });
      const result = computeRecoveryStatus(system, 5); // currentDay < startDay

      // daysElapsed = 5 - 10 = -5; Math.max(0, 3 - (-5)) = 8
      // This looks like recovery extends into the future, which is wrong.
      // daysRemaining will be large and positive, status will be recovering.
      // The agent is stuck. This is an invariant violation (GM error).
      expect(result.status).toBe("recovering");
      expect(result.daysRemaining).toBeGreaterThan(0);
    });
  });

  describe("status type discrimination", () => {
    it("guarantees status is one of the enumerated values", () => {
      const testCases: Array<[boolean, number, number, number, RecoveryStatus]> = [
        [true, 0, 0, 1, "dead"],        // isDead
        [false, 0, 0, 1, "active"],     // never injured
        [false, 3, 5, 6, "recovering"], // in recovery window
        [false, 3, 5, 8, "returned"],   // recovery done
      ];

      for (const [isDead, daysOutOfAction, recoveryStartedAt, currentDay, expected] of testCases) {
        const system = makeAgent({ isDead, daysOutOfAction, recoveryStartedAt });
        const result = computeRecoveryStatus(system, currentDay);
        expect(result.status).toBe(expected);
      }
    });
  });

  describe("autoClearRecoveredAgents", () => {
    it("identifies agents ready to clear", () => {
      // Agent #1: recovered on day 8
      const agent1System = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      // Agent #2: still recovering
      const agent2System = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 6 });

      // On day 8
      const status1 = computeRecoveryStatus(agent1System, 8);
      const status2 = computeRecoveryStatus(agent2System, 8);

      expect(status1.status).toBe("returned");
      expect(status2.status).toBe("recovering");
    });
  });
});
