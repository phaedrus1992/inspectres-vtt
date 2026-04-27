import { describe, it, expect } from "vitest";
import { canTechnologyRoll, getRequirementBlockReason } from "./requirements-integration.js";
import type { MissionState } from "./requirements-integration.js";

describe("canTechnologyRoll validation", () => {
  describe("RED: Fail-closed validation (currently failing)", () => {
    it("rejects roll when mission state is null (fail-closed, not fail-open)", () => {
      // #330: P0 blocker — null mission defaults to true (fail-open). Should default false.
      // Rules require explicit check; null = no mission data = cannot verify = deny.
      const result = canTechnologyRoll(null);
      expect(result).toBe(false); // Currently fails: gets true (fail-open)
    });

    it("rejects roll when requirements not met", () => {
      // #330: P0 blocker — must respect requirementsMet flag
      const mission: MissionState = {
        itemRarity: "exotic",
        requirementsMet: false,
      };
      expect(canTechnologyRoll(mission)).toBe(false);
    });

    it("provides detailed block reason for unmet rare requirements", () => {
      // #330: P0 blocker — error handling should surface reason to user
      const mission: MissionState = {
        itemRarity: "rare",
        requirementsMet: false,
      };
      const reason = getRequirementBlockReason(mission);
      expect(reason).toBe("INSPECTRES.Requirement.Rare");
    });

    it("provides block reason for unmet exotic requirements", () => {
      const mission: MissionState = {
        itemRarity: "exotic",
        requirementsMet: false,
      };
      const reason = getRequirementBlockReason(mission);
      expect(reason).toBe("INSPECTRES.Requirement.Exotic");
    });

    it("rejects block reason when mission state is null and should fail-closed", () => {
      // #330: P0 blocker — null mission means no requirement check possible = deny access
      // Should return reason explaining why access denied, not empty string
      const reason = getRequirementBlockReason(null);
      expect(reason).toBe("INSPECTRES.Error.NoMissionState"); // Currently fails: returns ""
    });
  });

  describe("RED: Input validation (currently failing)", () => {
    it("rejects mission state with invalid item rarity", () => {
      // #330: Validation gap — doesn't validate rarity is one of {common, rare, exotic}
      const malformed = {
        itemRarity: "legendary",
        requirementsMet: false,
      } as unknown as MissionState;
      expect(() => {
        getRequirementBlockReason(malformed);
      }).toThrow(/one of: common, rare, exotic/i);
    });

    it("rejects mission state with missing requirementsMet field", () => {
      // #330: Validation gap — doesn't check required fields
      const malformed = { itemRarity: "rare" } as unknown as MissionState;
      expect(() => {
        canTechnologyRoll(malformed);
      }).toThrow(/must be boolean/i);
    });

    it("rejects mission state with non-boolean requirementsMet", () => {
      // #330: Validation gap — allows string or number instead of boolean
      const malformed = {
        itemRarity: "rare",
        requirementsMet: "yes",
      } as unknown as MissionState;
      expect(() => {
        canTechnologyRoll(malformed);
      }).toThrow(/must be boolean/i);
    });
  });

  describe("GREEN: Valid requirement checking behavior", () => {
    it("allows roll when requirements are met", () => {
      const mission: MissionState = {
        itemRarity: "exotic",
        requirementsMet: true,
      };
      expect(canTechnologyRoll(mission)).toBe(true);
    });

    it("returns empty string when requirements are met", () => {
      const mission: MissionState = {
        itemRarity: "exotic",
        requirementsMet: true,
      };
      expect(getRequirementBlockReason(mission)).toBe("");
    });

    it("returns error message when mission is null (fail-closed)", () => {
      // #330: P0 blocker — null mission now returns reason, not empty string
      const reason = getRequirementBlockReason(null);
      expect(reason).toBe("INSPECTRES.Error.NoMissionState");
    });

    it("provides block reason for common item when requirements not met", () => {
      const mission: MissionState = {
        itemRarity: "common",
        requirementsMet: false,
      };
      const reason = getRequirementBlockReason(mission);
      expect(reason).toBe("INSPECTRES.Requirement.Common");
    });
  });
});
