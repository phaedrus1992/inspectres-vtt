import { describe, it, expect } from "vitest";
import { getRequirementTier, isRollSufficient, checkDefect } from "./requirements-checker.js";

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

  describe("checkDefect", () => {
    it("returns false for common items (no defect on common)", () => {
      const defect = checkDefect(3, "common");
      expect(defect).toBe(false);
    });

    it("returns true for rare when roll = 4 (min 5 - 1)", () => {
      const defect = checkDefect(4, "rare");
      expect(defect).toBe(true);
    });

    it("returns true for exotic when roll = 5 (min 6 - 1)", () => {
      const defect = checkDefect(5, "exotic");
      expect(defect).toBe(true);
    });

    it("returns false when roll is 2+ below requirement", () => {
      const defect = checkDefect(3, "exotic");
      expect(defect).toBe(false);
    });

    it("returns false when roll meets requirement", () => {
      const defect = checkDefect(5, "rare");
      expect(defect).toBe(false);
    });
  });
});
