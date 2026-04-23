import { describe, it, expect } from "vitest";
import { validateTeamworkAssist, selectDieFromAssist } from "./teamwork.js";

describe("Teamwork", () => {
  describe("validateTeamworkAssist", () => {
    it("allows helper to assist with skill rating >= 2", () => {
      const valid = validateTeamworkAssist({ skillRating: 2 });
      expect(valid.allowed).toBe(true);
    });

    it("allows helper with skill rating 1 to assist but auto-fails own roll", () => {
      const result = validateTeamworkAssist({ skillRating: 1 });
      expect(result.allowed).toBe(true);
      expect(result.autoFails).toBe(true);
    });

    it("includes warning message when skill rating is 1", () => {
      const result = validateTeamworkAssist({ skillRating: 1 });
      expect(result.warning).toBeTruthy();
      expect(result.warning).toContain("automatically fail");
    });

    it("allows skill rating 0 to assist", () => {
      const valid = validateTeamworkAssist({ skillRating: 0 });
      expect(valid.allowed).toBe(true);
    });
  });

  describe("selectDieFromAssist", () => {
    it("allows selection of any die from roll result", () => {
      const rollFaces = [2, 4, 6, 1];
      const selected = selectDieFromAssist(rollFaces, 1); // select 4
      expect(selected).toBe(4);
    });

    it("returns selected die for recipient pool", () => {
      const rollFaces = [3, 3, 5];
      const selected = selectDieFromAssist(rollFaces, 2); // select 5
      expect(selected).toBe(5);
    });

    it("prevents selecting die outside roll result", () => {
      const rollFaces = [2, 4];
      const selected = selectDieFromAssist(rollFaces, 5); // invalid index
      expect(selected).toBeNull();
    });
  });
});
