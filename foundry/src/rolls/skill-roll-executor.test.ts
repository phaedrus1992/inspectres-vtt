import { describe, it, expect } from "vitest";
import { checkTechnologyRollRequirements } from "./skill-roll-executor.js";

interface MissionData {
  itemRarity: "common" | "rare" | "exotic";
  requirementsMet: boolean;
}

describe("Skill Roll Executor - Requirements Validation", () => {
  describe("checkTechnologyRollRequirements", () => {
    it("allows Technology roll when requirements are met", () => {
      const mission: MissionData = {
        itemRarity: "rare",
        requirementsMet: true,
      };

      const result = checkTechnologyRollRequirements(mission);

      expect(result.allowed).toBe(true);
      expect(result.blockReason).toBe("");
    });

    it("blocks Technology roll when requirements not met", () => {
      const mission: MissionData = {
        itemRarity: "exotic",
        requirementsMet: false,
      };

      const result = checkTechnologyRollRequirements(mission);

      expect(result.allowed).toBe(false);
      expect(result.blockReason.length).toBeGreaterThan(0);
    });

    it("returns localization key in block reason", () => {
      const mission: MissionData = {
        itemRarity: "common",
        requirementsMet: false,
      };

      const result = checkTechnologyRollRequirements(mission);

      expect(result.blockReason).toContain("INSPECTRES");
    });

    it("allows Technology roll when mission is null (optional feature)", () => {
      const result = checkTechnologyRollRequirements(null);

      expect(result.allowed).toBe(true);
      expect(result.blockReason).toBe("");
    });
  });
});
