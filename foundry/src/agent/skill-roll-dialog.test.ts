import { describe, it, expect } from "vitest";
import { type AgentData } from "./agent-schema.js";
import { prepareSkillRollContext, type SkillRollContextInput } from "./skill-roll-dialog.js";

describe("Skill Roll Dialog - Private Life Gating", () => {
  describe("prepareSkillRollContext", () => {
    it("allows Cool augmentation in private-life mode", () => {
      const input: SkillRollContextInput = {
        agentName: "Agent Sinclair",
        skillName: "academics" as const,
        skillRank: 2,
        isPrivateLife: true,
        availableAugmentations: {
          cool: true,
          card: true,
          bank: true,
          talent: true,
        },
      };

      const context = prepareSkillRollContext(input);

      expect(context.augmentations.cool.available).toBe(true);
    });

    it("disables Card augmentation in private-life mode", () => {
      const input: SkillRollContextInput = {
        agentName: "Agent Sinclair",
        skillName: "academics" as const,
        skillRank: 2,
        isPrivateLife: true,
        availableAugmentations: {
          cool: true,
          card: true,
          bank: true,
          talent: true,
        },
      };

      const context = prepareSkillRollContext(input);

      expect(context.augmentations.card.available).toBe(false);
    });

    it("disables Bank augmentation in private-life mode", () => {
      const input: SkillRollContextInput = {
        agentName: "Agent Sinclair",
        skillName: "academics" as const,
        skillRank: 2,
        isPrivateLife: true,
        availableAugmentations: {
          cool: true,
          card: true,
          bank: true,
          talent: true,
        },
      };

      const context = prepareSkillRollContext(input);

      expect(context.augmentations.bank.available).toBe(false);
    });

    it("disables Talent augmentation in private-life mode", () => {
      const input: SkillRollContextInput = {
        agentName: "Agent Sinclair",
        skillName: "academics" as const,
        skillRank: 2,
        isPrivateLife: true,
        availableAugmentations: {
          cool: true,
          card: true,
          bank: true,
          talent: true,
        },
      };

      const context = prepareSkillRollContext(input);

      expect(context.augmentations.talent.available).toBe(false);
    });

    it("allows all augmentations in normal skill mode", () => {
      const input: SkillRollContextInput = {
        agentName: "Agent Sinclair",
        skillName: "academics" as const,
        skillRank: 2,
        isPrivateLife: false,
        availableAugmentations: {
          cool: true,
          card: true,
          bank: true,
          talent: true,
        },
      };

      const context = prepareSkillRollContext(input);

      expect(context.augmentations.cool.available).toBe(true);
      expect(context.augmentations.card.available).toBe(true);
      expect(context.augmentations.bank.available).toBe(true);
      expect(context.augmentations.talent.available).toBe(true);
    });

    it("shows private-life indicator when applicable", () => {
      const input: SkillRollContextInput = {
        agentName: "Agent Sinclair",
        skillName: "academics" as const,
        skillRank: 2,
        isPrivateLife: true,
        availableAugmentations: {
          cool: true,
          card: true,
          bank: true,
          talent: true,
        },
      };

      const context = prepareSkillRollContext(input);

      expect(context.isPrivateLife).toBe(true);
    });
  });

  describe("Take 4 Gating (#281)", () => {
    it("allows Take 4 when original skill rating >= 4", () => {
      const input: SkillRollContextInput = {
        agentName: "Agent Sinclair",
        skillName: "academics" as const,
        skillRank: 2,
        isPrivateLife: false,
        originalSkillRating: 4,
        availableAugmentations: {
          cool: true,
          card: true,
          bank: true,
          talent: true,
        },
      };

      const context = prepareSkillRollContext(input);

      expect(context.take4Allowed).toBe(true);
    });

    it("blocks Take 4 when original skill rating < 4", () => {
      const input: SkillRollContextInput = {
        agentName: "Agent Sinclair",
        skillName: "academics" as const,
        skillRank: 2,
        isPrivateLife: false,
        originalSkillRating: 3,
        availableAugmentations: {
          cool: true,
          card: true,
          bank: true,
          talent: true,
        },
      };

      const context = prepareSkillRollContext(input);

      expect(context.take4Allowed).toBe(false);
    });
  });

  describe("Card Dice Gating (#283)", () => {
    it("allows Card dice when skill matches card skill", () => {
      const input: SkillRollContextInput = {
        agentName: "Agent Sinclair",
        skillName: "academics" as const,
        skillRank: 2,
        isPrivateLife: false,
        cardSkill: "academics",
        availableAugmentations: {
          cool: true,
          card: true,
          bank: true,
          talent: true,
        },
      };

      const context = prepareSkillRollContext(input);

      expect(context.cardSkillAllowed).toBe(true);
    });

    it("blocks Card dice when skill does not match card skill", () => {
      const input: SkillRollContextInput = {
        agentName: "Agent Sinclair",
        skillName: "academics" as const,
        skillRank: 2,
        isPrivateLife: false,
        cardSkill: "athletics",
        availableAugmentations: {
          cool: true,
          card: true,
          bank: true,
          talent: true,
        },
      };

      const context = prepareSkillRollContext(input);

      expect(context.cardSkillAllowed).toBe(false);
    });

    it("blocks Card dice when no card skill available", () => {
      const input: SkillRollContextInput = {
        agentName: "Agent Sinclair",
        skillName: "academics" as const,
        skillRank: 2,
        isPrivateLife: false,
        availableAugmentations: {
          cool: true,
          card: true,
          bank: true,
          talent: true,
        },
      };

      const context = prepareSkillRollContext(input);

      expect(context.cardSkillAllowed).toBe(false);
    });
  });
});
