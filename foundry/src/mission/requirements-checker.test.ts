import { describe, it, expect } from "vitest";
import { getRequirementTier, isRollSufficient } from "./requirements-checker.js";

describe("Requirements Checker", () => {
  describe("getRequirementTier", () => {
    it("returns minimum roll of 4 for common items", () => {
      const tier = getRequirementTier("common");
      expect(tier.minRoll).toBe(4);
    });

    it("returns minimum roll of 5 for rare items", () => {
      const tier = getRequirementTier("rare");
      expect(tier.minRoll).toBe(5);
    });

    it("returns minimum roll of 6 for exotic items", () => {
      const tier = getRequirementTier("exotic");
      expect(tier.minRoll).toBe(6);
    });

    it("includes human-readable description for each tier", () => {
      const common = getRequirementTier("common");
      expect(common.description).toBeTruthy();
      expect(common.description.length).toBeGreaterThan(0);
    });
  });

  describe("isRollSufficient", () => {
    it("returns true when roll meets requirement", () => {
      const sufficient = isRollSufficient(5, "rare");
      expect(sufficient).toBe(true);
    });

    it("returns false when roll below requirement", () => {
      const insufficient = isRollSufficient(4, "rare");
      expect(insufficient).toBe(false);
    });

    it("returns true when roll exceeds requirement", () => {
      const sufficient = isRollSufficient(6, "common");
      expect(sufficient).toBe(true);
    });
  });
});
