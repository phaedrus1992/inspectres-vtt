import { describe, it, expect } from "vitest";
import { gateAugmentationsForPrivateLife } from "./private-life-roll.js";
import type { Augmentations } from "./private-life-roll.js";

describe("gateAugmentationsForPrivateLife validation", () => {
  describe("RED: Input validation (currently failing)", () => {
    it("rejects null augmentations object", () => {
      // #330: Validation gap — no null check. Should throw descriptive error.
      expect(() => {
        gateAugmentationsForPrivateLife(null as unknown as Augmentations, true);
      }).toThrow("Augmentations object required");
    });

    it("rejects missing card state in augmentations", () => {
      // #330: Validation gap — doesn't verify all required fields exist
      const malformed = { cool: { available: true, selected: false } } as unknown as Augmentations;
      expect(() => {
        gateAugmentationsForPrivateLife(malformed, true);
      }).toThrow(/card state required/i);
    });

    it("rejects augmentations with missing available property", () => {
      // #330: Validation gap — state mutation bug. Doesn't validate structure of nested objects.
      const malformed = {
        cool: { selected: false }, // missing 'available'
        card: { available: true, selected: false },
        bank: { available: true, selected: false },
        talent: { available: true, selected: false },
      } as unknown as Augmentations;
      expect(() => {
        gateAugmentationsForPrivateLife(malformed, true);
      }).toThrow(/must be boolean/i);
    });

    it("rejects augmentations with invalid state values", () => {
      // #330: Validation gap — allows non-boolean values
      const malformed = {
        cool: { available: "true", selected: false }, // string instead of boolean
        card: { available: true, selected: false },
        bank: { available: true, selected: false },
        talent: { available: true, selected: false },
      } as unknown as Augmentations;
      expect(() => {
        gateAugmentationsForPrivateLife(malformed, true);
      }).toThrow(/must be boolean/i);
    });
  });

  describe("RED: Immutable state updates (currently failing)", () => {
    it("does not mutate input augmentations when gating private-life", () => {
      // #330: State mutation bug — original code mutates input. Should return new object.
      const original: Augmentations = {
        cool: { available: true, selected: false },
        card: { available: true, selected: true },
        bank: { available: true, selected: false },
        talent: { available: true, selected: false },
      };
      const originalCard = original.card;

      const result = gateAugmentationsForPrivateLife(original, true);

      // Input should not be modified
      expect(original.card).toBe(originalCard);
      expect(original.card.available).toBe(true); // should remain true
      // Result should have new references
      expect(result.card).not.toBe(originalCard);
      expect(result.card.available).toBe(false); // gated off
    });

    it("returns new object when isPrivateLife is false", () => {
      // #330: Validation gap — should still return fresh object even when not gating
      const original: Augmentations = {
        cool: { available: true, selected: false },
        card: { available: true, selected: false },
        bank: { available: true, selected: false },
        talent: { available: true, selected: false },
      };

      const result = gateAugmentationsForPrivateLife(original, false);

      // Should be logically equal but different object references
      expect(result).not.toBe(original);
      expect(result.card).not.toBe(original.card);
      expect(result).toEqual(original); // values match
    });
  });

  describe("GREEN: Valid gating behavior", () => {
    it("gates augmentations when isPrivateLife is true", () => {
      // #330: Validation must not break existing behavior
      const augmentations: Augmentations = {
        cool: { available: true, selected: false },
        card: { available: true, selected: false },
        bank: { available: true, selected: false },
        talent: { available: true, selected: false },
      };

      const result = gateAugmentationsForPrivateLife(augmentations, true);

      expect(result.cool.available).toBe(true); // Cool is never gated
      expect(result.card.available).toBe(false);
      expect(result.bank.available).toBe(false);
      expect(result.talent.available).toBe(false);
    });

    it("preserves all augmentations when isPrivateLife is false", () => {
      const augmentations: Augmentations = {
        cool: { available: true, selected: false },
        card: { available: false, selected: false },
        bank: { available: true, selected: true },
        talent: { available: false, selected: false },
      };

      const result = gateAugmentationsForPrivateLife(augmentations, false);

      expect(result.cool.available).toBe(augmentations.cool.available);
      expect(result.card.available).toBe(augmentations.card.available);
      expect(result.bank.available).toBe(augmentations.bank.available);
      expect(result.talent.available).toBe(augmentations.talent.available);
    });
  });
});
