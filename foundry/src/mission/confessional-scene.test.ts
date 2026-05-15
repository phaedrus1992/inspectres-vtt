import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { transitionToConfessionalScene, resetConfessionalScene, type RollScene, type RollActor, type RollToken } from "./confessional-scene.js";

interface CreatedTokenSpec {
  sceneId: string;
  data: Record<string, unknown>;
}

interface FakeScene {
  readonly id: string;
  readonly name: string;
  activate: () => Promise<Scene>;
  createEmbeddedDocuments: (type: string, data: Record<string, unknown>[]) => Promise<unknown>;
}

class TestToken implements RollToken {
  readonly id: string;
  sceneId: string;
  x: number;
  y: number;
  deleted: boolean;
  readonly parent: { readonly id: string };

  constructor(id: string, sceneId: string = "scene-original") {
    this.id = id;
    this.sceneId = sceneId;
    this.x = 0;
    this.y = 0;
    this.deleted = false;
    this.parent = { id: sceneId };
  }

  toObject(): Record<string, unknown> {
    return { _id: this.id, x: this.x, y: this.y };
  }

  async delete(): Promise<void> {
    this.deleted = true;
  }
}

function makeTestActor(id: string, name: string, tokens: TestToken[] = []): RollActor {
  return {
    id,
    name,
    getActiveTokens: (_linked?: boolean) => tokens as unknown as TokenDocument[],
  };
}

function makeFakeScene(id: string, name: string, created: CreatedTokenSpec[]): FakeScene {
  return {
    id,
    name,
    activate: async () => ({}) as Scene,
    createEmbeddedDocuments: async (type, data) => {
      if (type !== "Token") throw new Error(`unexpected type ${type}`);
      for (const d of data) created.push({ sceneId: id, data: d });
      return [];
    },
  };
}

describe("Confessional Scene Transitions", () => {
  let created: CreatedTokenSpec[];
  let originalScene: FakeScene;
  let confessionalScene: FakeScene;

  beforeEach(() => {
    created = [];
    originalScene = makeFakeScene("scene-original", "Original", created);
    confessionalScene = makeFakeScene("scene-confessional", "Confessional", created);

    (globalThis as Record<string, unknown>)["game"] = {
      user: { isGM: true },
      scenes: {
        get: (id: string) => {
          if (id === "scene-original") return originalScene;
          if (id === "scene-confessional") return confessionalScene;
          return null;
        },
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("transitionToConfessionalScene", () => {
    it("activates confessional scene", async () => {
      await transitionToConfessionalScene(confessionalScene as unknown as RollScene);
      expect(confessionalScene.name).toBe("Confessional");
    });

    it("creates new tokens on confessional scene and deletes originals", async () => {
      const token1 = new TestToken("token-1", "scene-original");
      const token2 = new TestToken("token-2", "scene-original");

      const agent1 = makeTestActor("agent-1", "Agent Sinclair", [token1]);
      const agent2 = makeTestActor("agent-2", "Agent Murphy", [token2]);

      const result = await transitionToConfessionalScene(
        confessionalScene as unknown as RollScene,
        [agent1, agent2],
      );

      expect(result.agentsMoved).toContain("agent-1");
      expect(result.agentsMoved).toContain("agent-2");

      // New tokens created on confessional scene, positioned at 400/400
      const onConfessional = created.filter((c) => c.sceneId === "scene-confessional");
      expect(onConfessional).toHaveLength(2);
      for (const spec of onConfessional) {
        expect(spec.data["x"]).toBe(400);
        expect(spec.data["y"]).toBe(400);
      }

      // Source tokens deleted
      expect(token1.deleted).toBe(true);
      expect(token2.deleted).toBe(true);
    });
  });

  describe("resetConfessionalScene", () => {
    it("returns agents to original scene via create+delete", async () => {
      const token = new TestToken("token-1", "scene-confessional");
      const agent = makeTestActor("agent-1", "Agent Sinclair", [token]);

      const result = await resetConfessionalScene(agent, "scene-original");

      expect(result.success).toBe(true);
      expect(result.agentId).toBe("agent-1");

      const onOriginal = created.filter((c) => c.sceneId === "scene-original");
      expect(onOriginal).toHaveLength(1);
      expect(token.deleted).toBe(true);
    });

    it("handles missing original scene gracefully", async () => {
      const token = new TestToken("token-1", "scene-confessional");
      const agent = makeTestActor("agent-1", "Agent Sinclair", [token]);

      const result = await resetConfessionalScene(agent, "nonexistent-scene");

      expect(result.success).toBe(false);
      expect(result.agentId).toBe("agent-1");
      expect(token.deleted).toBe(false);
    });
  });
});
