import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { transitionToConfessionalScene, resetConfessionalScene, type RollScene, type RollActor } from "./confessional-scene.js";

// Test fixtures matching RollScene interface
function makeTestScene(id: string = "scene-confessional"): RollScene {
  return {
    id,
    name: "Confessional",
    activate: async () => {
      return {} as Scene;
    },
  };
}

// Test fixtures matching RollActor interface
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

function makeTestActor(id: string, name: string, tokens: TestToken[] = []): RollActor {
  return {
    id,
    name,
    getActiveTokens: (_linked?: boolean) => tokens as unknown as TokenDocument[],
  };
}

describe("Confessional Scene Transitions", () => {
  beforeEach(() => {
    // Mock Foundry global for resetConfessionalScene
    globalThis.game = {
      scenes: {
        get: (id: string) => (id === "scene-original" ? {} : null),
      },
    } as unknown as typeof game;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("transitionToConfessionalScene", () => {
    it("activates confessional scene", async () => {
      const scene = makeTestScene("scene-confessional");

      await transitionToConfessionalScene(scene);

      expect(scene.name).toBe("Confessional");
    });

    it("moves agents to confessional scene", async () => {
      const token1 = new TestToken("token-1", "scene-original");
      const token2 = new TestToken("token-2", "scene-original");

      const agent1 = makeTestActor("agent-1", "Agent Sinclair", [token1]);
      const agent2 = makeTestActor("agent-2", "Agent Murphy", [token2]);

      const scene = makeTestScene("scene-confessional");

      const result = await transitionToConfessionalScene(scene, [agent1, agent2]);

      expect(result.agentsMoved).toContain("agent-1");
      expect(result.agentsMoved).toContain("agent-2");
      expect(token1.sceneId).toBe("scene-confessional");
      expect(token1.x).toBe(400);
      expect(token1.y).toBe(400);
      expect(token2.sceneId).toBe("scene-confessional");
    });
  });

  describe("resetConfessionalScene", () => {
    it("returns agents to original scene", async () => {
      const token = new TestToken("token-1", "scene-original");
      const agent = makeTestActor("agent-1", "Agent Sinclair", [token]);

      const result = await resetConfessionalScene(agent, "scene-original");

      expect(result.success).toBe(true);
      expect(result.agentId).toBe("agent-1");
      expect(token.sceneId).toBe("scene-original");
    });

    it("handles missing original scene gracefully", async () => {
      const token = new TestToken("token-1");
      const agent = makeTestActor("agent-1", "Agent Sinclair", [token]);

      const result = await resetConfessionalScene(agent, "nonexistent-scene");

      expect(result.success).toBe(false);
      expect(result.agentId).toBe("agent-1");
    });
  });
});
