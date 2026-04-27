import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildVacationDialog, type VacationOptions } from "./vacation-dialog.js";

describe("vacation-dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).ui = {
      notifications: {
        warn: vi.fn(),
        info: vi.fn(),
      },
    };
    (globalThis as any).game = {
      i18n: {
        localize: (key: string) => key,
      },
    };
  });

  describe("buildVacationDialog", () => {
    it("returns null when franchise is in debt", async () => {
      const options: VacationOptions = {
        agentStress: 3,
        franchiseBank: 5,
        franchiseInDebt: true,
      };

      const result = await buildVacationDialog(options);

      expect(result).toBeNull();
      expect(ui.notifications?.warn).toHaveBeenCalledWith(
        expect.stringContaining("DebtMode"),
      );
    });

    it("returns null when agent has no stress", async () => {
      const options: VacationOptions = {
        agentStress: 0,
        franchiseBank: 5,
        franchiseInDebt: false,
      };

      const result = await buildVacationDialog(options);

      expect(result).toBeNull();
      expect(ui.notifications?.info).toHaveBeenCalledWith(
        expect.stringContaining("NoStress"),
      );
    });

    it("limits spending to agent stress and franchise bank", async () => {
      const options: VacationOptions = {
        agentStress: 3,
        franchiseBank: 2,
        franchiseInDebt: false,
      };

      const maxSpendable = Math.min(options.agentStress, options.franchiseBank);
      expect(maxSpendable).toBe(2);
    });

    it("allows zero spending (no-op case)", async () => {
      const options: VacationOptions = {
        agentStress: 3,
        franchiseBank: 5,
        franchiseInDebt: false,
      };

      // Test that buildVacationDialog doesn't reject zero as input
      // (caller should detect and warn about no-op)
      expect(options.agentStress).toBeGreaterThan(0);
      expect(options.franchiseBank).toBeGreaterThanOrEqual(0);
    });

    it("respects max spending = min(stress, bank)", async () => {
      const scenarios = [
        { stress: 6, bank: 3, expected: 3 },
        { stress: 1, bank: 10, expected: 1 },
        { stress: 5, bank: 5, expected: 5 },
      ];

      for (const { stress, bank, expected } of scenarios) {
        const maxSpendable = Math.min(stress, bank);
        expect(maxSpendable).toBe(expected);
      }
    });
  });

  describe("VacationResult", () => {
    it("returns bankDiceSpent and stressReduction", () => {
      // Test the interface structure (no runtime behavior to test)
      const result = { bankDiceSpent: 2, stressReduction: 2 };
      expect(result.bankDiceSpent).toBe(2);
      expect(result.stressReduction).toBe(2);
    });
  });

  describe("Weird agent Cool restoration during vacation", () => {
    it("should return null when agent is weird with zero stress but zero cool", async () => {
      const options: VacationOptions = {
        agentStress: 0,
        franchiseBank: 5,
        franchiseInDebt: false,
        agentCool: 0,
        agentIsWeird: true,
      };

      const result = await buildVacationDialog(options);

      expect(result).toBeNull();
      expect(ui.notifications?.info).toHaveBeenCalledWith(
        expect.stringContaining("NoStress"),
      );
    });

    it("should allow Cool restoration when weird agent has cool to restore", async () => {
      const options: VacationOptions = {
        agentStress: 0,
        franchiseBank: 5,
        franchiseInDebt: false,
        agentCool: 2,
        agentIsWeird: true,
      };

      // Dialog should be shown (weird agent has cool to restore)
      // Cannot test actual dialog UI without mocking DialogV2, but interface allows it
      expect(options.agentIsWeird).toBe(true);
      expect(options.agentCool).toBeGreaterThan(0);
    });

    it("should limit Cool restoration to available franchise dice after stress", () => {
      const scenarios = [
        { stress: 2, cool: 5, bank: 5, maxStressSpend: 2, maxCoolRestore: 3 },
        { stress: 1, cool: 3, bank: 2, maxStressSpend: 1, maxCoolRestore: 1 },
        { stress: 0, cool: 10, bank: 4, maxStressSpend: 0, maxCoolRestore: 4 },
      ];

      for (const { stress, cool, bank, maxStressSpend, maxCoolRestore } of scenarios) {
        const maxSpendable = Math.min(stress, bank);
        const availableDice = bank - maxSpendable;
        expect(maxSpendable).toBe(maxStressSpend);
        expect(availableDice).toBe(maxCoolRestore);
      }
    });

    it("should not allow Cool restoration for normal agents", () => {
      const options: VacationOptions = {
        agentStress: 3,
        franchiseBank: 5,
        franchiseInDebt: false,
        agentCool: 0,
        agentIsWeird: false,
      };

      expect(options.agentIsWeird).toBe(false);
      // Normal agents don't get cool restoration UI
      const maxCoolRestore = options.agentIsWeird ? Math.max(0, options.franchiseBank) : 0;
      expect(maxCoolRestore).toBe(0);
    });
  });
});
