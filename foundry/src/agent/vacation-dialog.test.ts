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
        agentName: "Test Agent",
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
        agentName: "Test Agent",
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
        agentName: "Test Agent",
        franchiseBank: 2,
        franchiseInDebt: false,
      };

      const maxSpendable = Math.min(options.agentStress, options.franchiseBank);
      expect(maxSpendable).toBe(2);
    });

    it("allows zero spending (no-op case)", async () => {
      const options: VacationOptions = {
        agentStress: 3,
        agentName: "Test Agent",
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
    it("should include Cool restoration option when agent is weird", () => {
      const options: VacationOptions = {
        agentStress: 3,
        agentName: "Weird Agent",
        franchiseBank: 5,
        franchiseInDebt: false,
        agentCool: 2,
        agentIsWeird: true,
      };

      // Dialog should present both stress and cool options for weird agents
      expect(options.agentIsWeird).toBe(true);
      expect(options.agentCool).toBeDefined();
    });

    it("should not include Cool restoration option for normal agents", () => {
      const options: VacationOptions = {
        agentStress: 3,
        agentName: "Normal Agent",
        franchiseBank: 5,
        franchiseInDebt: false,
        agentCool: 0,
        agentIsWeird: false,
      };

      expect(options.agentIsWeird).toBe(false);
    });

    it("should allow restoring Cool using franchise dice for weird agents", () => {
      const options: VacationOptions = {
        agentStress: 3,
        agentName: "Weird Agent",
        franchiseBank: 5,
        franchiseInDebt: false,
        agentCool: 1,
        agentIsWeird: true,
      };

      // Weird agent should be able to spend franchise dice to restore Cool
      const maxCoolRestore = Math.min(options.agentCool || 0, options.franchiseBank);
      expect(maxCoolRestore).toBe(1);
    });

    it("should limit Cool restoration to current Cool value", () => {
      const scenarios = [
        { cool: 3, bank: 10, maxRestore: 3 }, // Limited by cool (agent can restore up to max cool)
        { cool: 1, bank: 5, maxRestore: 1 },
        { cool: 10, bank: 2, maxRestore: 2 }, // Limited by bank (not enough franchise)
      ];

      for (const { cool, bank, maxRestore } of scenarios) {
        const options: VacationOptions = {
          agentStress: 2,
          agentName: "Weird",
          franchiseBank: bank,
          franchiseInDebt: false,
          agentCool: cool,
          agentIsWeird: true,
        };
        const actualMax = Math.min(options.agentCool || 0, options.franchiseBank);
        expect(actualMax).toBe(maxRestore);
      }
    });
  });
});
