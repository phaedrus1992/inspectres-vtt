import { describe, it, expect } from "vitest";
import { prepareSkillRollContext } from "../agent/skill-roll-dialog.js";
import { checkTechnologyRollRequirements } from "../rolls/skill-roll-executor.js";
import { transitionToConfessionalScene, resetConfessionalScene } from "./confessional-scene.js";

interface MissionContext {
  agentName: string;
  skillName: string;
  isPrivateLife: boolean;
  itemRarity: "common" | "rare" | "exotic";
  requirementsMet: boolean;
}

describe("Collaboration Mechanics E2E", () => {
  describe("Private Life + Requirements + Confessional", () => {
    it("gates augmentations for private-life roll", () => {
      const context: MissionContext = {
        agentName: "Agent Sinclair",
        skillName: "academics",
        isPrivateLife: true,
        itemRarity: "rare",
        requirementsMet: true,
      };

      const rollContext = prepareSkillRollContext({
        agentName: context.agentName,
        skillName: context.skillName,
        skillRank: 2,
        isPrivateLife: context.isPrivateLife,
        availableAugmentations: { cool: true, card: true, bank: true, talent: true },
      });

      expect(rollContext.augmentations.cool.available).toBe(true);
      expect(rollContext.augmentations.card.available).toBe(false);
    });

    it("validates requirements for Technology roll", () => {
      const context: MissionContext = {
        agentName: "Agent Sinclair",
        skillName: "technology",
        isPrivateLife: false,
        itemRarity: "exotic",
        requirementsMet: false,
      };

      const checkResult = checkTechnologyRollRequirements({
        itemRarity: context.itemRarity,
        requirementsMet: context.requirementsMet,
      });

      expect(checkResult.allowed).toBe(false);
      expect(checkResult.blockReason).toContain("INSPECTRES");
    });

    it("transitions agents to confessional scene", async () => {
      const mockScene = {
        id: "scene-confessional",
        name: "Confessional",
        activate: async () => {},
        tokens: [],
      };

      const mockAgent = {
        id: "agent-1",
        name: "Agent Sinclair",
        token: { id: "token-1", sceneId: "scene-original" },
      };

      const result = await transitionToConfessionalScene(mockScene, [mockAgent]);

      expect(result.sceneId).toBe("scene-confessional");
      expect(result.agentsMoved).toContain("agent-1");
    });

    it("returns agent from confessional after use", async () => {
      const mockAgent = {
        id: "agent-1",
        name: "Agent Sinclair",
        token: { id: "token-1", sceneId: "scene-original" },
      };

      const resetResult = await resetConfessionalScene(mockAgent, "scene-original");

      expect(resetResult.success).toBe(true);
      expect(resetResult.agentId).toBe("agent-1");
    });

    it("handles complex mission with all three mechanics", async () => {
      const context: MissionContext = {
        agentName: "Agent Sinclair",
        skillName: "academics",
        isPrivateLife: true,
        itemRarity: "rare",
        requirementsMet: true,
      };

      // Step 1: Prepare skill roll with private-life gating
      const rollContext = prepareSkillRollContext({
        agentName: context.agentName,
        skillName: context.skillName,
        skillRank: 2,
        isPrivateLife: context.isPrivateLife,
        availableAugmentations: { cool: true, card: true, bank: true, talent: true },
      });
      expect(rollContext.isPrivateLife).toBe(true);
      expect(rollContext.augmentations.card.available).toBe(false);

      // Step 2: Check Technology roll requirements (not relevant here, but integrated)
      const techCheckResult = checkTechnologyRollRequirements({
        itemRarity: context.itemRarity,
        requirementsMet: context.requirementsMet,
      });
      expect(techCheckResult.allowed).toBe(true);

      // Step 3: Transition to confessional
      const mockScene = {
        id: "scene-confessional",
        name: "Confessional",
        activate: async () => {},
        tokens: [],
      };
      const mockAgent = {
        id: "agent-1",
        name: context.agentName,
        token: { id: "token-1", sceneId: "scene-original" },
      };
      const sceneResult = await transitionToConfessionalScene(mockScene, [mockAgent]);
      expect(sceneResult.agentsMoved).toContain("agent-1");

      // Step 4: Reset after confessional
      const resetResult = await resetConfessionalScene(mockAgent, "scene-original");
      expect(resetResult.success).toBe(true);
    });
  });
});
