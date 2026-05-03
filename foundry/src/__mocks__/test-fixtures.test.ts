import { describe, it, expect, beforeEach } from "vitest";
import { makeAgent, makeFranchise, setGMStatus, getSystemField } from "./test-fixtures.js";

describe("Test fixture helpers", () => {
  describe("setGMStatus", () => {
    beforeEach(() => {
      (globalThis as unknown as { game: { user: { isGM: boolean } } }).game.user.isGM = true;
    });

    it("sets GM status to false", () => {
      setGMStatus(false);
      expect((globalThis as unknown as { game: { user: { isGM: boolean } } }).game.user.isGM).toBe(false);
    });

    it("sets GM status to true", () => {
      setGMStatus(true);
      expect((globalThis as unknown as { game: { user: { isGM: boolean } } }).game.user.isGM).toBe(true);
    });
  });

  describe("getSystemField", () => {
    it("retrieves a top-level field", () => {
      const agent = makeAgent({ cool: 3 });
      expect(getSystemField(agent, "cool")).toBe(3);
    });

    it("retrieves a nested field", () => {
      const agent = makeAgent();
      expect(getSystemField(agent, "skills.academics.base")).toBe(3);
    });

    it("returns undefined for missing field", () => {
      const agent = makeAgent();
      expect(getSystemField(agent, "nonexistent")).toBeUndefined();
    });

    it("returns undefined for non-object intermediate", () => {
      const agent = makeAgent({ cool: 3 });
      expect(getSystemField(agent, "cool.nested")).toBeUndefined();
    });
  });
});
