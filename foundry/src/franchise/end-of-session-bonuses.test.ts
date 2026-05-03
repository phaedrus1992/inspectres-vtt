import { describe, it, expect, beforeEach, vi } from "vitest";
import { calculateHazardPay, selectRandomCharacteristic } from "./end-of-session-bonuses.js";

// Mock Foundry Roll
class MockRoll {
  total: number;

  constructor(formula?: string, result?: number) {
    this.total = result ?? 1; // default d1d{n} roll = 1
  }

  async evaluate() {
    return this;
  }
}

vi.stubGlobal("Roll", MockRoll);

describe("end-of-session-bonuses", () => {
  describe("calculateHazardPay", () => {
    it("returns 0 when death mode is false", () => {
      const actors: Array<{ isWeird: boolean }> = [];
      const deathMode = false;
      const result = calculateHazardPay(actors, deathMode);
      expect(result).toBe(0);
    });

    it("returns 0 when no actors provided", () => {
      const actors: Array<{ isWeird: boolean }> = [];
      const result = calculateHazardPay(actors, true);
      expect(result).toBe(0);
    });

    it("adds 1 die per non-weird agent in death mode", () => {
      const actors: Array<{ isWeird: boolean }> = [
        { isWeird: false },
        { isWeird: true },
        { isWeird: false },
      ];
      const result = calculateHazardPay(actors, true);
      expect(result).toBe(2); // 2 non-weird agents
    });

    it("returns 0 for all weird agents in death mode", () => {
      const actors: Array<{ isWeird: boolean }> = [
        { isWeird: true },
        { isWeird: true },
      ];
      const result = calculateHazardPay(actors, true);
      expect(result).toBe(0);
    });
  });

  describe("selectRandomCharacteristic", () => {
    it("returns a characteristic from the available list", async () => {
      const unused = ["Charm", "Cool", "Discipline"];
      const result = await selectRandomCharacteristic(unused);
      expect(unused).toContain(result);
    });

    it("returns null when no characteristics available", async () => {
      const unused: string[] = [];
      const result = await selectRandomCharacteristic(unused);
      expect(result).toBeNull();
    });

    it("selects from provided unused characteristics only", async () => {
      const unused = ["Charm"];
      const result = await selectRandomCharacteristic(unused);
      expect(result).toBe("Charm");
    });
  });
});
