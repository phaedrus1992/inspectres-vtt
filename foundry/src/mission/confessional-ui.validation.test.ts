import { describe, it, expect, beforeEach } from "vitest";
import {
  loadConfessionalScene,
  returnFromConfessional,
  getConfessionalSceneId,
} from "./confessional-ui.js";

describe("confessional-ui validation", () => {
  beforeEach(() => {
    // Mock game.scenes.get() to return scenes for GREEN tests
    const mockScenes = new Map([
      ["confessional-scene-id", { id: "confessional-scene-id" }],
      ["home-scene-id", { id: "home-scene-id" }],
    ]);
    (globalThis as any).game = {
      ...(globalThis as any).game,
      scenes: {
        get: (id: string) => mockScenes.get(id),
      },
    };
  });
  describe("RED: Input validation (currently failing)", () => {
    it("rejects empty scene ID", async () => {
      // #330: Validation gap — no input validation
      await expect(loadConfessionalScene("")).rejects.toThrow(/cannot be empty/i);
    });

    it("rejects null scene ID", async () => {
      // #330: Validation gap — doesn't validate scene ID is string
      await expect(loadConfessionalScene(null as unknown as string)).rejects.toThrow(/required/i);
    });

    it("rejects undefined home scene ID on return", async () => {
      // #330: Validation gap — accepts undefined, silently fails (now throws)
      await expect(
        returnFromConfessional(undefined as unknown as string | null, "confessional-id"),
      ).rejects.toThrow(/required/i);
    });

    it("rejects empty home scene ID on return", async () => {
      // #330: Validation gap — allows empty string, function returns false silently
      await expect(returnFromConfessional("", "confessional-id")).rejects.toThrow(/cannot be empty/i);
    });

    it("rejects empty confessional scene ID on return", async () => {
      // #330: Validation gap — no validation of confessionalSceneId parameter
      await expect(returnFromConfessional("home-scene", "")).rejects.toThrow(/cannot be empty/i);
    });

    it("rejects null home scene ID with explicit error message", async () => {
      // #330: P0 blocker — currently silently returns false
      await expect(returnFromConfessional(null, "confessional-id")).rejects.toThrow(
        /home scene ID required/i,
      );
    });
  });

  describe("RED: Error handling (future: Foundry API integration)", () => {
    it.skip("throws on load when scene does not exist in world", async () => {
      // #330: P0 blocker — TODO: Add Foundry scene validation in loadConfessionalScene
      // Requires game.scenes?.get(sceneId) API call
      // Currently: no validation, just stores scene ID in memory
      await expect(loadConfessionalScene("nonexistent-scene")).rejects.toThrow(/not found/i);
    });

    it.skip("throws on return when home scene does not exist", async () => {
      // #330: P0 blocker — TODO: Add Foundry scene validation in returnFromConfessional
      // Requires game.scenes?.get(homeSceneId) API call
      // Currently: no validation
      await expect(returnFromConfessional("invalid-scene-id", "confessional-id")).rejects.toThrow(
        /not found/i,
      );
    });
  });;

  describe("GREEN: Valid state transitions", () => {
    it("loads confessional scene and stores ID", async () => {
      // Green: existing behavior must not break
      const sceneId = await loadConfessionalScene("confessional-scene-id");
      expect(sceneId).toBe("confessional-scene-id");
      expect(getConfessionalSceneId()).toBe("confessional-scene-id");
    });

    it("returns true when home scene ID is valid", async () => {
      // Green: existing behavior (now with validation)
      await loadConfessionalScene("confessional-scene-id");
      const result = await returnFromConfessional("home-scene-id", "confessional-scene-id");
      expect(result).toBe(true);
    });

    it("clears confessional scene after return", async () => {
      // Green: existing behavior must not break
      await loadConfessionalScene("confessional-scene-id");
      await returnFromConfessional("home-scene-id", "confessional-scene-id");
      expect(getConfessionalSceneId()).toBeNull();
    });
  });
});
