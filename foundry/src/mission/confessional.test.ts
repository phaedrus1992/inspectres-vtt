import { describe, it, expect } from "vitest";
import {
  createConfessionalTracker,
  addCharacteristic,
  getCharacteristicsForSession,
  type ConfessionalTracker,
} from "./confessional.js";

describe("Confessional Tracker", () => {
  describe("createConfessionalTracker", () => {
    it("creates tracker with no confessional used initially", () => {
      const tracker = createConfessionalTracker("session-1");
      expect(tracker.sessionId).toBe("session-1");
      expect(tracker.confessionalUsed).toBe(false);
    });

    it("initializes empty characteristics array", () => {
      const tracker = createConfessionalTracker("session-1");
      expect(tracker.characteristics).toEqual([]);
    });
  });

  describe("addCharacteristic", () => {
    it("adds characteristic to tracker", () => {
      const tracker = createConfessionalTracker("session-1");
      const result = addCharacteristic(tracker, "agent-1", "Brave");
      expect(result.characteristics).toContainEqual({
        agentId: "agent-1",
        characteristicName: "Brave",
      });
    });

    it("prevents second confessional in same scene", () => {
      const tracker = createConfessionalTracker("session-1");
      const first = addCharacteristic(tracker, "agent-1", "Brave");
      if (!first.allowed) throw new Error("first should be allowed");
      const trackerWithUsed: ConfessionalTracker = {
        sessionId: tracker.sessionId,
        confessionalUsed: true,
        characteristics: first.characteristics,
      };
      const second = addCharacteristic(trackerWithUsed, "agent-2", "Cunning");
      expect(second.allowed).toBe(false);
      expect(second.error).toContain("one confessional per scene");
    });

    it("allows new confessional in new scene", () => {
      const newScene = createConfessionalTracker("session-2");
      const second = addCharacteristic(newScene, "agent-2", "Cunning");
      expect(second.allowed).toBe(true);
    });
  });

  describe("getCharacteristicsForSession", () => {
    it("returns characteristics for specific agent", () => {
      const tracker = createConfessionalTracker("session-1");
      const result = addCharacteristic(tracker, "agent-1", "Brave");
      if (!result.allowed) throw new Error("should be allowed");
      const trackerWithChars: ConfessionalTracker = {
        sessionId: tracker.sessionId,
        confessionalUsed: result.confessionalUsed,
        characteristics: result.characteristics,
      };
      const chars = getCharacteristicsForSession(trackerWithChars, "agent-1");
      expect(chars).toEqual(["Brave"]);
    });

    it("returns empty array for agent with no characteristics", () => {
      const tracker = createConfessionalTracker("session-1");
      const chars = getCharacteristicsForSession(tracker, "agent-999");
      expect(chars).toEqual([]);
    });
  });
});
