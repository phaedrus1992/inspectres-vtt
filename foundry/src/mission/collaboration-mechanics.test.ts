import { describe, it, expect } from "vitest";
import { prepareSkillRollContext } from "../agent/skill-roll-dialog.js";
import { checkTechnologyRollRequirements } from "../rolls/skill-roll-executor.js";
import { transitionToConfessionalScene, resetConfessionalScene, type RollScene } from "./confessional-scene.js";
import type { SkillName } from "../rolls/roll-executor.js";

// Test fixtures matching RollScene interface
class TestToken {
  sceneId: string;
  x: number;
  y: number;

  constructor(id: string, sceneId: string = "scene-original") {
    this.sceneId = sceneId;
    this.x = 0;
    this.y = 0;
  }

  async update(data: { sceneId?: string; x?: number; y?: number }): Promise<void> {
    if (data.sceneId !== undefined) this.sceneId = data.sceneId;
    if (data.x !== undefined) this.x = data.x;
    if (data.y !== undefined) this.y = data.y;
  }
}

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
        skillName: context.skillName as SkillName,
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
      // Create test token to track scene updates
      const testToken = new TestToken("token-1", "scene-original");

      const mockScene: RollScene = {
        id: "scene-confessional",
        name: "Confessional",
        activate: async () => ({} as Scene),
      };

      const mockAgent = {
        id: "agent-1",
        name: "Agent Sinclair",
        getActiveTokens: () => [testToken] as unknown as TokenDocument[],
      };

      const result = await transitionToConfessionalScene(mockScene, [mockAgent]);

      expect(result.sceneId).toBe("scene-confessional");
      expect(result.agentsMoved).toContain("agent-1");
    });

    it("returns agent from confessional after use", async () => {
      // Mock Foundry global
      (globalThis as Record<string, unknown>)["game"] = {
        scenes: { get: (id: string) => (id === "scene-original" ? {} : null) },
      };

      const testToken = new TestToken("token-1", "scene-original");

      const mockAgent = {
        id: "agent-1",
        name: "Agent Sinclair",
        getActiveTokens: () => [testToken] as unknown as TokenDocument[],
      };

      const resetResult = await resetConfessionalScene(mockAgent, "scene-original");

      expect(resetResult.success).toBe(true);
      expect(resetResult.agentId).toBe("agent-1");
    });

    it("handles complex mission with all three mechanics", async () => {
      // Mock Foundry global for confessional reset
      (globalThis as Record<string, unknown>)["game"] = {
        scenes: { get: (id: string) => (id === "scene-original" ? {} : null) },
      };

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
        skillName: context.skillName as SkillName,
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
      const testToken = new TestToken("token-1", "scene-original");

      const mockScene: RollScene = {
        id: "scene-confessional",
        name: "Confessional",
        activate: async () => ({} as Scene),
      };
      const mockAgent = {
        id: "agent-1",
        name: context.agentName,
        getActiveTokens: () => [testToken] as unknown as TokenDocument[],
      };
      const sceneResult = await transitionToConfessionalScene(mockScene, [mockAgent]);
      expect(sceneResult.agentsMoved).toContain("agent-1");

      // Step 4: Reset after confessional
      const resetResult = await resetConfessionalScene(mockAgent, "scene-original");
      expect(resetResult.success).toBe(true);
    });
  });
});
