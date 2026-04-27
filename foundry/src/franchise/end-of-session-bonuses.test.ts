import { describe, it, expect, beforeEach, vi } from "vitest";
import { calculateHazardPay, selectRandomCharacteristic } from "./end-of-session-bonuses.js";

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
    beforeEach(() => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
    });

    it("returns a characteristic from the available list", () => {
      const unused = ["Charm", "Cool", "Discipline"];
      const result = selectRandomCharacteristic(unused);
      expect(unused).toContain(result);
    });

    it("returns null when no characteristics available", () => {
      const unused: string[] = [];
      const result = selectRandomCharacteristic(unused);
      expect(result).toBeNull();
    });

    it("selects from provided unused characteristics only", () => {
      const unused = ["Charm"];
      const result = selectRandomCharacteristic(unused);
      expect(result).toBe("Charm");
    });
  });
});
