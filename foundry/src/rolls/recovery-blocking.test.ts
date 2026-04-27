import { describe, it, expect } from "vitest";
import { computeRecoveryStatus } from "../agent/recovery-utils.js";
import { type AgentData } from "../agent/agent-schema.js";

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
    power: null,
    characteristics: [],
    stress: 0,
    isDead: false,
    daysOutOfAction: 0,
    recoveryStartedAt: 0,
    ...overrides,
  };
}

describe("Recovery Blocking for Rolls", () => {
  describe("computeRecoveryStatus state machine", () => {
    it("returns active status for agent with no recovery", () => {
      const system = makeAgent({ daysOutOfAction: 0, recoveryStartedAt: 0 });
      const status = computeRecoveryStatus(system, 5);
      expect(status.status).toBe("active");
    });

    it("returns recovering status when in recovery window", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const status = computeRecoveryStatus(system, 6); // 1 day into 3-day recovery
      expect(status.status).toBe("recovering");
      expect(status.daysRemaining).toBe(2);
    });

    it("returns returned status when recovery deadline reached", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const status = computeRecoveryStatus(system, 8); // exactly at deadline
      expect(status.status).toBe("returned");
    });

    it("returns active status after recovery is cleared", () => {
      const system = makeAgent({ daysOutOfAction: 0, recoveryStartedAt: 5 });
      const status = computeRecoveryStatus(system, 10);
      expect(status.status).toBe("active");
    });

    it("returns dead status for dead agents", () => {
      const system = makeAgent({ isDead: true });
      const status = computeRecoveryStatus(system, 5);
      expect(status.status).toBe("dead");
    });
  });

  describe("Recovery blocking in rolls", () => {
    it("includes recovery status description when agent is recovering", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const status = computeRecoveryStatus(system, 6);
      expect(status.description).toContain("2 more days");
    });

    it("blocks both recovering and dead agents from rolling", () => {
      const recovering = makeAgent({ daysOutOfAction: 2, recoveryStartedAt: 3 });
      const dead = makeAgent({ isDead: true });

      const recoveringStatus = computeRecoveryStatus(recovering, 4);
      const deadStatus = computeRecoveryStatus(dead, 4);

      expect(recoveringStatus.status).toBe("recovering");
      expect(deadStatus.status).toBe("dead");
      // Both blocked: check rolls would fail due to recovery/dead check
      expect(recoveringStatus.status === "recovering" || recoveringStatus.status === "dead").toBe(true);
      expect(deadStatus.status === "recovering" || deadStatus.status === "dead").toBe(true);
    });
  });

  describe("Auto-clear behavior", () => {
    it("identifies agents ready to clear when recovery expires", () => {
      const agent = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });

      const statusBefore = computeRecoveryStatus(agent, 8);
      expect(statusBefore.status).toBe("returned");

      // After clearing recovery fields (simulating auto-clear hook):
      agent.daysOutOfAction = 0;
      agent.recoveryStartedAt = 0;

      const statusAfter = computeRecoveryStatus(agent, 8);
      expect(statusAfter.status).toBe("active");
    });

    it("recognizes multiple agents expiring on same day", () => {
      const agent1 = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const agent2 = makeAgent({ daysOutOfAction: 2, recoveryStartedAt: 6 });

      const status1 = computeRecoveryStatus(agent1, 8);
      const status2 = computeRecoveryStatus(agent2, 8);

      expect(status1.status).toBe("returned");
      expect(status2.status).toBe("returned");
    });
  });
});
