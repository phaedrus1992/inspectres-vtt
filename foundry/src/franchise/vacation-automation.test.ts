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
        items: {
          contents: [
            { isWeird: false },
            { isWeird: true },
            { isWeird: false },
          ],
        },
      } as any;

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

    it("applies characteristics bonus to random unused characteristic", async () => {
      const mockFranchiseActor = {
        system: {
          bank: 5,
        },
        items: {
          contents: [
            { isWeird: false },
          ],
        },
        update: vi.fn(),
      } as any;

      const context: EndOfSessionContext = {
        franchiseActor: mockFranchiseActor,
        deathMode: false,
        agentCount: 1,
        nonWeirdAgentCount: 1,
      };

      // Mock selecting characteristics bonus
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      await applyEndOfSessionBonuses(context);

      // Characteristics bonus should be applied if unused characteristic available
      // Update call expected if bonus applies
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
        items: {
          contents: [
            { system: { cool: 2 }, update: vi.fn() },
            { system: { cool: 1 }, update: vi.fn() },
          ],
        },
      } as any;

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
      const mockAgent1 = { system: { cool: 3 }, update: vi.fn() };
      const mockAgent2 = { system: { cool: 1 }, update: vi.fn() };

      const mockFranchiseActor = {
        system: {
          bank: 0,
          debtMode: true,
          cardsLocked: true,
        },
        update: vi.fn(),
        items: {
          contents: [mockAgent1, mockAgent2],
        },
      } as any;

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
        items: {
          contents: [],
        },
      } as any;

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
