import { describe, it, expect } from "vitest";
import { canTechnologyRoll, getRequirementBlockReason } from "./requirements-integration.js";

interface MissionState {
  itemRarity: "common" | "rare" | "exotic";
  requirementsMet: boolean;
}

describe("Requirements Checker Integration", () => {
  describe("canTechnologyRoll", () => {
    it("allows Technology roll when requirements are met", () => {
      const mission: MissionState = {
        itemRarity: "rare",
        requirementsMet: true,
      };

      const allowed = canTechnologyRoll(mission);

      expect(allowed).toBe(true);
    });

    it("blocks Technology roll when requirements not met", () => {
      const mission: MissionState = {
        itemRarity: "exotic",
        requirementsMet: false,
      };

      const allowed = canTechnologyRoll(mission);

      expect(allowed).toBe(false);
    });

    it("blocks Technology roll when no mission state (fail-closed #330)", () => {
      // #330: P0 blocker — null mission now defaults to false (fail-closed, not fail-open)
      const allowed = canTechnologyRoll(null);

      expect(allowed).toBe(false);
    });
  });

  describe("getRequirementBlockReason", () => {
    it("returns empty string when requirements met", () => {
      const mission: MissionState = {
        itemRarity: "rare",
        requirementsMet: true,
      };

      const reason = getRequirementBlockReason(mission);

      expect(reason).toBe("");
    });

    it("returns localization key when requirements not met for common item", () => {
      const mission: MissionState = {
        itemRarity: "common",
        requirementsMet: false,
      };

      const reason = getRequirementBlockReason(mission);

      expect(reason).toContain("INSPECTRES");
      expect(reason.length).toBeGreaterThan(0);
    });

    it("returns localization key when requirements not met for rare item", () => {
      const mission: MissionState = {
        itemRarity: "rare",
        requirementsMet: false,
      };

      const reason = getRequirementBlockReason(mission);

      expect(reason).toContain("INSPECTRES");
    });

    it("returns localization key when requirements not met for exotic item", () => {
      const mission: MissionState = {
        itemRarity: "exotic",
        requirementsMet: false,
      };

      const reason = getRequirementBlockReason(mission);

      expect(reason).toContain("INSPECTRES");
    });

    it("returns error message when no mission state (#330)", () => {
      // #330: P0 blocker — null mission now returns error reason, not empty string
      const reason = getRequirementBlockReason(null);

      expect(reason).toBe("INSPECTRES.Error.NoMissionState");
    });
  });
});
