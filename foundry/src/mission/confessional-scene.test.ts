import { describe, it, expect } from "vitest";
import { transitionToConfessionalScene, resetConfessionalScene } from "./confessional-scene.js";

interface MockScene {
  id: string;
  name: string;
  activate: () => Promise<void>;
  tokens: { id: string; name: string }[];
}

interface MockActor {
  id: string;
  name: string;
  token: { id: string; sceneId: string } | null;
}

describe("Confessional Scene Transitions", () => {
  describe("transitionToConfessionalScene", () => {
    it("activates confessional scene", async () => {
      let sceneActivated = false;
      const mockScene: MockScene = {
        id: "scene-confessional",
        name: "Confessional",
        activate: async () => {
          sceneActivated = true;
        },
        tokens: [],
      };

      await transitionToConfessionalScene(mockScene);

      expect(sceneActivated).toBe(true);
    });

    it("moves agents to confessional scene", async () => {
      const mockAgent1: MockActor = {
        id: "agent-1",
        name: "Agent Sinclair",
        token: { id: "token-1", sceneId: "scene-original" },
      };

      const mockAgent2: MockActor = {
        id: "agent-2",
        name: "Agent Murphy",
        token: { id: "token-2", sceneId: "scene-original" },
      };

      const mockScene: MockScene = {
        id: "scene-confessional",
        name: "Confessional",
        activate: async () => {},
        tokens: [
          { id: "token-1", name: "Agent Sinclair" },
          { id: "token-2", name: "Agent Murphy" },
        ],
      };

      const result = await transitionToConfessionalScene(mockScene, [mockAgent1, mockAgent2]);

      expect(result.agentsMoved).toContain("agent-1");
      expect(result.agentsMoved).toContain("agent-2");
    });
  });

  describe("resetConfessionalScene", () => {
    it("returns agents to original scene", async () => {
      const mockAgent1: MockActor = {
        id: "agent-1",
        name: "Agent Sinclair",
        token: { id: "token-1", sceneId: "scene-original" },
      };

      const result = await resetConfessionalScene(mockAgent1, "scene-original");

      expect(result.success).toBe(true);
      expect(result.agentId).toBe("agent-1");
    });

    it("handles agents with no token", async () => {
      const mockAgent: MockActor = {
        id: "agent-1",
        name: "Agent Sinclair",
        token: null,
      };

      const result = await resetConfessionalScene(mockAgent, "scene-original");

      expect(result.success).toBe(true);
    });
  });
});
