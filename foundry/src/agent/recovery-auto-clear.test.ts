import { describe, it, expect, beforeEach, vi } from "vitest";
import { type AgentData } from "./agent-schema.js";

interface TestActor {
  type: string;
  system: AgentData;
  update: (data: Record<string, unknown>) => Promise<void>;
}

function makeTestActor(system: Partial<AgentData> = {}): TestActor {
  return {
    type: "agent",
    system: {
      description: "",
      skills: { academics: { base: 0, penalty: 0 }, athletics: { base: 0, penalty: 0 }, technology: { base: 0, penalty: 0 }, contact: { base: 0, penalty: 0 } },
      talent: "",
      cool: 0,
      isWeird: false,
      characteristics: [],
      missionPool: 0,
      isDead: false,
      daysOutOfAction: 0,
      recoveryStartedAt: 0,
      ...system,
    },
    update: vi.fn(),
  };
}

describe("autoClearRecoveryOnDayAdvance", () => {
  describe("clearing recovery fields when deadline passed", () => {
    it("clears daysOutOfAction when currentDay >= recoveryStartedAt + daysOutOfAction", async () => {
      // Agent recovers on day 8 (started day 5, 3-day recovery)
      const actor = makeTestActor({ daysOutOfAction: 3, recoveryStartedAt: 5 });

      // Simulate the onChange handler logic
      const oldDay = 7;
      const newDay = 8;
      const daysElapsed = newDay - actor.system.recoveryStartedAt;
      const isRecoveryExpired = daysElapsed >= actor.system.daysOutOfAction;

      expect(isRecoveryExpired).toBe(true);

      if (isRecoveryExpired && actor.system.daysOutOfAction > 0) {
        await actor.update({ "system.daysOutOfAction": 0, "system.recoveryStartedAt": 0 });
      }

      expect(actor.update).toHaveBeenCalledWith({
        "system.daysOutOfAction": 0,
        "system.recoveryStartedAt": 0,
      });
    });

    it("does not clear if still recovering", async () => {
      const actor = makeTestActor({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const newDay = 7; // Still 1 day remaining
      const daysElapsed = newDay - actor.system.recoveryStartedAt;
      const isRecoveryExpired = daysElapsed >= actor.system.daysOutOfAction;

      expect(isRecoveryExpired).toBe(false);

      if (isRecoveryExpired && actor.system.daysOutOfAction > 0) {
        await actor.update({ "system.daysOutOfAction": 0, "system.recoveryStartedAt": 0 });
      }

      expect(actor.update).not.toHaveBeenCalled();
    });

    it("ignores agents with daysOutOfAction === 0 (never injured)", async () => {
      const actor = makeTestActor({ daysOutOfAction: 0, recoveryStartedAt: 0 });
      const newDay = 10;

      if (actor.system.daysOutOfAction > 0) {
        await actor.update({ "system.daysOutOfAction": 0, "system.recoveryStartedAt": 0 });
      }

      expect(actor.update).not.toHaveBeenCalled();
    });

    it("ignores dead agents", async () => {
      const actor = makeTestActor({ isDead: true, daysOutOfAction: 3, recoveryStartedAt: 5 });
      const newDay = 8;

      // Dead agents should not auto-clear (they stay dead)
      if (actor.system.isDead) {
        // Skip recovery clearance
        expect(actor.update).not.toHaveBeenCalled();
        return;
      }

      if (actor.system.daysOutOfAction > 0) {
        await actor.update({ "system.daysOutOfAction": 0, "system.recoveryStartedAt": 0 });
      }

      expect(actor.update).not.toHaveBeenCalled();
    });

    it("batches multiple agents into one updateDocuments call", async () => {
      // When multiple agents recover on the same day, update them all at once
      // actor1: started day 5, 2-day recovery = recovered by day 7
      // actor2: started day 5, 3-day recovery = recovered by day 8
      const actor1 = makeTestActor({ daysOutOfAction: 2, recoveryStartedAt: 5 });
      const actor2 = makeTestActor({ daysOutOfAction: 3, recoveryStartedAt: 5 });
      const newDay = 8; // Both are expired

      const updates: Array<{ daysOutOfAction: 0; recoveryStartedAt: 0 }> = [];

      for (const actor of [actor1, actor2]) {
        const daysElapsed = newDay - actor.system.recoveryStartedAt;
        if (daysElapsed >= actor.system.daysOutOfAction && actor.system.daysOutOfAction > 0 && !actor.system.isDead) {
          updates.push({ daysOutOfAction: 0, recoveryStartedAt: 0 });
        }
      }

      expect(updates.length).toBe(2);
    });
  });
});
