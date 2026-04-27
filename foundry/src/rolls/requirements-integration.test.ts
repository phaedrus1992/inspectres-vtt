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

    it("allows Technology roll when no mission state (optional feature)", () => {
      const allowed = canTechnologyRoll(null);

      expect(allowed).toBe(true);
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

    it("returns empty string when no mission state", () => {
      const reason = getRequirementBlockReason(null);

      expect(reason).toBe("");
    });
  });
});
