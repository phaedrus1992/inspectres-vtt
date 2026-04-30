import { describe, it, expect, beforeEach } from "vitest";
import {
  loadConfessionalScene,
  returnFromConfessional,
  getConfessionalSceneId,
} from "./confessional-ui.js";

describe("Confessional UI Integration", () => {
  beforeEach(() => {
    // Mock game.scenes.get() to return scenes for integration tests
    const mockScenes = new Map([
      ["scene-123", { id: "scene-123" }],
      ["new-scene", { id: "new-scene" }],
      ["home-scene-456", { id: "home-scene-456" }],
      ["confess-scene-789", { id: "confess-scene-789" }],
      ["confess-123", { id: "confess-123" }],
    ]);
    (globalThis as any).game = {
      ...(globalThis as any).game,
      scenes: {
        get: (id: string) => mockScenes.get(id),
      },
    };
  });
  describe("loadConfessionalScene", () => {
    it("returns scene ID when confessional scene exists", async () => {
      const existingSceneId = "scene-123";

      // Mock finding an existing confessional scene
      const result = await loadConfessionalScene(existingSceneId);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("creates confessional scene data structure with correct name", async () => {
      const sceneId = await loadConfessionalScene("new-scene");

      expect(sceneId).toBeTruthy();
    });
  });

  describe("returnFromConfessional", () => {
    it("returns to home scene after confessional", async () => {
      const homeSceneId = "home-scene-456";
      const confessionalSceneId = "confess-scene-789";

      const returned = await returnFromConfessional(homeSceneId, confessionalSceneId);

      expect(returned).toBe(true);
    });

    it("clears confessional state on return", async () => {
      const homeSceneId = "home-scene-456";
      const confessionalSceneId = "confess-scene-789";

      await returnFromConfessional(homeSceneId, confessionalSceneId);

      // Verify no confessional state remains
      const stateAfter = getConfessionalSceneId();
      expect(stateAfter).toBeNull();
    });

    it("handles missing home scene gracefully", async () => {
      // #330: P0 blocker — now throws on null home scene (fail-closed)
      const confessionalSceneId = "confess-scene-789";

      await expect(returnFromConfessional(null, confessionalSceneId)).rejects.toThrow(
        /home scene ID required/i,
      );
    });
  });

  describe("getConfessionalSceneId", () => {
    it("returns null when no confessional active", () => {
      const sceneId = getConfessionalSceneId();

      expect(sceneId).toBeNull();
    });

    it("returns scene ID when confessional is active", async () => {
      const confessionalSceneId = "confess-123";

      await loadConfessionalScene(confessionalSceneId);
      const active = getConfessionalSceneId();

      expect(active).toBe(confessionalSceneId);
    });
  });
});
