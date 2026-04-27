import { describe, it, expect } from "vitest";
import { type AgentData } from "./agent-schema.js";
import { prepareSkillRollContext } from "./skill-roll-dialog.js";

interface SkillRollContextInput {
  agentName: string;
  skillName: string;
  skillRank: number;
  isPrivateLife: boolean;
  availableAugmentations: {
    cool: boolean;
    card: boolean;
    bank: boolean;
    talent: boolean;
  };
}

describe("Skill Roll Dialog - Private Life Gating", () => {
  describe("prepareSkillRollContext", () => {
    it("allows Cool augmentation in private-life mode", () => {
      const input: SkillRollContextInput = {
        agentName: "Agent Sinclair",
        skillName: "academics",
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
        skillName: "academics",
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
        skillName: "academics",
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
        skillName: "academics",
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
        skillName: "academics",
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
        skillName: "academics",
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
});
