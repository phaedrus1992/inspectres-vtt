import { describe, it, expect } from "vitest";
import { makeAgent } from "../__mocks__/test-fixtures.js";
import { type RollActor } from "./roll-executor.js";
import { validateTeamworkAssist } from "../mission/teamwork.js";

describe("Teamwork Integration with Roll Executor", () => {
  describe("Teamwork assists", () => {
    it("allows teamwork assist on skill rolls", () => {
      const helper = makeAgent({ name: "Helper" });
      const helperSystem = helper.system as { skills: Record<string, { base: number }> };
      const skillData = helperSystem.skills["academics"];
      if (!skillData) throw new Error("Skill data missing");
      const validation = validateTeamworkAssist({ skillRating: skillData.base });
      expect(validation.allowed).toBe(true);
      expect(validation.autoFails).toBeUndefined();
    });

    it.todo("stress rolls reject teamwork assists (per #249)");
    it.todo("transfers selected die from helper to recipient");
  });
});
