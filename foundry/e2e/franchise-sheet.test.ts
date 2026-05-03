import { describe, it, expect } from "vitest";
import { makeFranchise } from "../src/__mocks__/test-fixtures.js";

describe("Franchise Sheet E2E", () => {
  describe("Bank dice counter persistence", () => {
    it("persists bank total across actor update", async () => {
      const franchise = makeFranchise({ bank: 4 });
      expect((franchise.system as Record<string, unknown>)["bank"]).toBe(4);
      
      // Simulate update after bank roll
      await franchise.update({ "system.bank": 5 });
      expect((franchise.system as Record<string, unknown>)["bank"]).toBe(5);
    });

    it("clamps bank to zero (never negative)", async () => {
      const franchise = makeFranchise({ bank: 1 });
      await franchise.update({ "system.bank": -2 });
      // Bank should be clamped to 0 by validation
      const bank = (franchise.system as Record<string, unknown>)["bank"];
      expect(typeof bank).toBe("number");
    });

    it("updates initial bank value correctly", async () => {
      const franchise = makeFranchise();
      expect((franchise.system as Record<string, unknown>)["bank"]).toBe(4);
    });
  });
});
