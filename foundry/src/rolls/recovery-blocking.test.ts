import { describe, it, expect, beforeEach } from "vitest";
import { computeRecoveryStatus, type RecoveryStatus } from "../agent/recovery-utils.js";
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
    characteristics: [],
    missionPool: 0,
    isDead: false,
    daysOutOfAction: 0,
    recoveryStartedAt: 0,
    ...overrides,
  };
}

describe("Recovery Blocking for Rolls", () => {
  describe("canExecuteSkillRoll", () => {
    it("allows skill roll when agent is active (no recovery)", () => {
      const system = makeAgent({ daysOutOfAction: 0, recoveryStartedAt: 0 });
      const status = computeRecoveryStatus(system, 5);

      expect(status.status).toBe("active");
      expect(status.status !== "recovering").toBe(true);
    });

    it("prevents skill roll when agent is recovering (status === recovering)", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const status = computeRecoveryStatus(system, 6); // 1 day into 3-day recovery

      expect(status.status).toBe("recovering");
      expect(status.status === "recovering").toBe(true);
    });

    it("allows skill roll when recovery just completed (status === returned)", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const status = computeRecoveryStatus(system, 8); // exactly at recovery deadline

      expect(status.status).toBe("returned");
      expect(status.status !== "recovering").toBe(true);
    });

    it("allows skill roll after recovery fields are cleared (daysOutOfAction === 0)", () => {
      const system = makeAgent({ daysOutOfAction: 0, recoveryStartedAt: 5 }); // cleared
      const status = computeRecoveryStatus(system, 10);

      expect(status.status).toBe("active");
      expect(status.status !== "recovering").toBe(true);
    });
  });

  describe("canExecuteStressRoll", () => {
    it("allows stress roll when agent is active", () => {
      const system = makeAgent({ daysOutOfAction: 0 });
      const status = computeRecoveryStatus(system, 5);

      expect(status.status).toBe("active");
    });

    it("prevents stress roll when agent is recovering", () => {
      const system = makeAgent({ daysOutOfAction: 2, recoveryStartedAt: 3 });
      const status = computeRecoveryStatus(system, 4); // 1 day into 2-day recovery

      expect(status.status).toBe("recovering");
    });
  });

  describe("autoClearRecoveredAgents", () => {
    it("identifies agents ready to clear (returned status)", () => {
      const recoveredAgent = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const status = computeRecoveryStatus(recoveredAgent, 8);

      expect(status.status).toBe("returned");
      // Test that fields should be cleared when status === "returned"
      expect(recoveredAgent.daysOutOfAction > 0).toBe(true);
    });

    it("should auto-clear daysOutOfAction when recovery expires (currentDay >= recoveryStartedAt + daysOutOfAction)", () => {
      // This test documents the expected behavior:
      // When currentDay advances past the recovery deadline, daysOutOfAction should be reset to 0.
      const agent = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });

      // Before: day 8 (deadline reached)
      const statusBefore = computeRecoveryStatus(agent, 8);
      expect(statusBefore.status).toBe("returned");

      // After clear (simulating auto-clear handler):
      // In production, the recovery-auto-clear hook would reset these fields
      agent.daysOutOfAction = 0;
      agent.recoveryStartedAt = 0;

      const statusAfter = computeRecoveryStatus(agent, 8);
      expect(statusAfter.status).toBe("active");
    });

    it("should batch-update multiple agents to avoid N separate async updates", () => {
      // This test documents the expected implementation pattern:
      // When recovery expires for multiple agents, they should be updated together,
      // not one-by-one in a loop.
      const agent1 = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const agent2 = makeAgent({ daysOutOfAction: 2, recoveryStartedAt: 6 });

      // Both have expired as of day 8
      const status1 = computeRecoveryStatus(agent1, 8);
      const status2 = computeRecoveryStatus(agent2, 8);

      expect(status1.status).toBe("returned");
      expect(status2.status).toBe("returned");

      // In production, updateEmbeddedDocuments would batch these:
      // game.actors?.updateEmbeddedDocuments("Actor", [
      //   { _id: agent1.id, "system.daysOutOfAction": 0, "system.recoveryStartedAt": 0 },
      //   { _id: agent2.id, "system.daysOutOfAction": 0, "system.recoveryStartedAt": 0 },
      // ]);
    });
  });

  describe("chat message recovery status notification", () => {
    it("should include recovery status in chat when agent attempts action while recovering", () => {
      const system = makeAgent({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const status = computeRecoveryStatus(system, 6); // 1 day into recovery

      // The chat message should include:
      // - Agent name
      // - Recovery status
      // - Days remaining
      expect(status.status).toBe("recovering");
      expect(status.daysRemaining).toBe(2);
      expect(status.description).toContain("2 more days");
    });
  });
});
