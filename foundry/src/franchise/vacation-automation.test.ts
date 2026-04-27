import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  applyEndOfSessionBonuses,
  initiateBankruptcyRestart,
  type EndOfSessionContext,
} from "./vacation-automation.js";

describe("vacation-automation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).ui = {
      notifications: {
        warn: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
      },
    };
    (globalThis as any).game = {
      i18n: {
        localize: (key: string) => key,
        format: (key: string, data: unknown) => key,
      },
    };
  });

  describe("applyEndOfSessionBonuses", () => {
    it("applies hazard pay when death mode is active", async () => {
      const mockFranchiseActor = {
        system: {
          bank: 5,
          deathMode: true,
        },
        update: vi.fn(),
      } as any;

      const mockAgents = [
        { type: "agent", system: { isWeird: false } },
        { type: "agent", system: { isWeird: true } },
        { type: "agent", system: { isWeird: false } },
      ] as any;

      (globalThis as any).game.actors = mockAgents;

      const context: EndOfSessionContext = {
        franchiseActor: mockFranchiseActor,
        deathMode: true,
        agentCount: 3,
        nonWeirdAgentCount: 2,
      };

      await applyEndOfSessionBonuses(context);

      // Verify hazard pay was calculated and applied
      expect(mockFranchiseActor.update).toHaveBeenCalled();
      const updateCall = (mockFranchiseActor.update as any).mock.calls[0]?.[0];
      expect(updateCall?.["system.bank"]).toBe(7); // 5 + 2 hazard pay
    });

    it("skips hazard pay when death mode is false", async () => {
      const mockFranchiseActor = {
        system: {
          bank: 5,
          deathMode: false,
        },
        items: {
          contents: [
            { isWeird: false },
            { isWeird: true },
            { isWeird: false },
          ],
        },
        update: vi.fn(),
      } as any;

      const context: EndOfSessionContext = {
        franchiseActor: mockFranchiseActor,
        deathMode: false,
        agentCount: 3,
        nonWeirdAgentCount: 2,
      };

      await applyEndOfSessionBonuses(context);

      // Franchise bank should not change when death mode is off
      expect(mockFranchiseActor.update).not.toHaveBeenCalled();
    });

    it("notifies characteristics bonus availability", async () => {
      const mockFranchiseActor = {
        system: {
          bank: 5,
        },
        update: vi.fn(),
      } as any;

      const context: EndOfSessionContext = {
        franchiseActor: mockFranchiseActor,
        deathMode: false,
        agentCount: 1,
        nonWeirdAgentCount: 1,
      };

      await applyEndOfSessionBonuses(context);

      // Characteristics bonus notification should fire
      expect((globalThis as any).ui.notifications.info).toHaveBeenCalled();
      const calls = ((globalThis as any).ui.notifications.info as any).mock.calls;
      const notified = calls.some((call: unknown[]) =>
        String(call[0]).includes("Characteristics") || String(call[0]).includes("INSPECTRES.NotifyCharacteristicsBonus"),
      );
      expect(notified).toBe(true);
    });
  });

  describe("initiateBankruptcyRestart", () => {
    it("returns success with restart confirmation", async () => {
      const mockFranchiseActor = {
        system: {
          bank: 0,
          debtMode: true,
          cardsLocked: true,
        },
        update: vi.fn(),
      } as any;

      const mockAgents = [
        { type: "agent", system: { cool: 2 }, update: vi.fn() },
        { type: "agent", system: { cool: 1 }, update: vi.fn() },
      ] as any;

      (globalThis as any).game.actors = mockAgents;
      (globalThis as any).game.user = { isGM: true };

      // Mock DialogV2 confirmation
      vi.stubGlobal("foundry", {
        applications: {
          api: {
            DialogV2: {
              confirm: vi.fn().mockResolvedValue(true),
            },
          },
        },
      } as any);

      const result = await initiateBankruptcyRestart(mockFranchiseActor);

      expect(result.success).toBe(true);
      expect(result.restarted).toBe(true);
    });

    it("returns failure when user declines restart", async () => {
      const mockFranchiseActor = {
        system: {
          bank: 0,
          debtMode: true,
          cardsLocked: true,
        },
        update: vi.fn(),
      } as any;

      // Mock DialogV2 rejection
      vi.stubGlobal("foundry", {
        applications: {
          api: {
            DialogV2: {
              confirm: vi.fn().mockResolvedValue(false),
            },
          },
        },
      } as any);

      const result = await initiateBankruptcyRestart(mockFranchiseActor);

      expect(result.success).toBe(false);
      expect(mockFranchiseActor.update).not.toHaveBeenCalled();
    });

    it("wipes Cool from all agents on restart", async () => {
      const mockAgent1 = { type: "agent", system: { cool: 3 }, update: vi.fn(), name: "Agent 1" };
      const mockAgent2 = { type: "agent", system: { cool: 1 }, update: vi.fn(), name: "Agent 2" };

      const mockFranchiseActor = {
        system: {
          bank: 0,
          debtMode: true,
          cardsLocked: true,
        },
        update: vi.fn(),
      } as any;

      (globalThis as any).game.actors = [mockAgent1, mockAgent2];
      (globalThis as any).game.user = { isGM: true };

      vi.stubGlobal("foundry", {
        applications: {
          api: {
            DialogV2: {
              confirm: vi.fn().mockResolvedValue(true),
            },
          },
        },
      } as any);

      await initiateBankruptcyRestart(mockFranchiseActor);

      // Both agents should have Cool wiped
      expect(mockAgent1.update).toHaveBeenCalledWith(expect.objectContaining({ "system.cool": 0 }));
      expect(mockAgent2.update).toHaveBeenCalledWith(expect.objectContaining({ "system.cool": 0 }));
    });

    it("resets franchise state on restart", async () => {
      const mockFranchiseActor = {
        system: {
          bank: 0,
          debtMode: true,
          cardsLocked: true,
          loanAmount: 7,
        },
        update: vi.fn(),
      } as any;

      (globalThis as any).game.actors = [];
      (globalThis as any).game.user = { isGM: true };

      vi.stubGlobal("foundry", {
        applications: {
          api: {
            DialogV2: {
              confirm: vi.fn().mockResolvedValue(true),
            },
          },
        },
      } as any);

      await initiateBankruptcyRestart(mockFranchiseActor);

      // Franchise should be reset
      expect(mockFranchiseActor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          "system.debtMode": false,
          "system.cardsLocked": false,
          "system.loanAmount": 0,
          "system.bank": 0,
        }),
      );
    });
  });
});
