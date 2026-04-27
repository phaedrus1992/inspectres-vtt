import { describe, it, expect } from "vitest";
import { gateAugmentationsForPrivateLife } from "./private-life-roll.js";

describe("Private Life Roll Mode", () => {
  describe("gateAugmentationsForPrivateLife", () => {
    it("allows Cool augmentation in private-life mode", () => {
      const augmentations = {
        cool: { available: true, selected: false },
        card: { available: true, selected: false },
        bank: { available: true, selected: false },
        talent: { available: true, selected: false },
      };

      const result = gateAugmentationsForPrivateLife(augmentations, true);

      expect(result.cool.available).toBe(true);
    });

    it("disables Card augmentation in private-life mode", () => {
      const augmentations = {
        cool: { available: true, selected: false },
        card: { available: true, selected: false },
        bank: { available: true, selected: false },
        talent: { available: true, selected: false },
      };

      const result = gateAugmentationsForPrivateLife(augmentations, true);

      expect(result.card.available).toBe(false);
    });

    it("disables Bank augmentation in private-life mode", () => {
      const augmentations = {
        cool: { available: true, selected: false },
        card: { available: true, selected: false },
        bank: { available: true, selected: false },
        talent: { available: true, selected: false },
      };

      const result = gateAugmentationsForPrivateLife(augmentations, true);

      expect(result.bank.available).toBe(false);
    });

    it("disables Talent augmentation in private-life mode", () => {
      const augmentations = {
        cool: { available: true, selected: false },
        card: { available: true, selected: false },
        bank: { available: true, selected: false },
        talent: { available: true, selected: false },
      };

      const result = gateAugmentationsForPrivateLife(augmentations, true);

      expect(result.talent.available).toBe(false);
    });

    it("allows all augmentations in normal mode", () => {
      const augmentations = {
        cool: { available: true, selected: false },
        card: { available: true, selected: false },
        bank: { available: true, selected: false },
        talent: { available: true, selected: false },
      };

      const result = gateAugmentationsForPrivateLife(augmentations, false);

      expect(result.cool.available).toBe(true);
      expect(result.card.available).toBe(true);
      expect(result.bank.available).toBe(true);
      expect(result.talent.available).toBe(true);
    });

    it("deselects Card if it was selected before entering private-life mode", () => {
      const augmentations = {
        cool: { available: true, selected: false },
        card: { available: true, selected: true },
        bank: { available: true, selected: false },
        talent: { available: true, selected: false },
      };

      const result = gateAugmentationsForPrivateLife(augmentations, true);

      expect(result.card.selected).toBe(false);
    });

    it("deselects Bank if it was selected before entering private-life mode", () => {
      const augmentations = {
        cool: { available: true, selected: false },
        card: { available: true, selected: false },
        bank: { available: true, selected: true },
        talent: { available: true, selected: false },
      };

      const result = gateAugmentationsForPrivateLife(augmentations, true);

      expect(result.bank.selected).toBe(false);
    });

    it("deselects Talent if it was selected before entering private-life mode", () => {
      const augmentations = {
        cool: { available: true, selected: false },
        card: { available: true, selected: false },
        bank: { available: true, selected: false },
        talent: { available: true, selected: true },
      };

      const result = gateAugmentationsForPrivateLife(augmentations, true);

      expect(result.talent.selected).toBe(false);
    });
  });
});
