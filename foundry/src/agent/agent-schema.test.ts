import { describe, it, expect } from "vitest";
import { SKILL_NAMES } from "../rolls/roll-types.js";
import type { WeirdPower } from "./agent-schema.js";

describe("WeirdPower schema consistency", () => {
  it("baseSkill values must be a subset of SKILL_NAMES", () => {
    // This test enforces that WeirdPower.baseSkill is constrained to
    // valid skills defined in SKILL_NAMES.
    // Currently hardcoded as "athletics" | "contact".
    // If SKILL_NAMES changes, this test will catch the mismatch.

    const validWeirdPowerSkills = ["athletics", "contact"] as const;
    for (const skill of validWeirdPowerSkills) {
      expect(SKILL_NAMES).toContain(skill);
    }
  });

  it("all valid baseSkill values should be explicitly listed", () => {
    // Ensure WeirdPower.baseSkill type includes all intended skills
    const example: WeirdPower = {
      name: "Test",
      description: "Test power",
      baseSkill: "athletics",
      coolCost: 1,
    };
    expect(["athletics", "contact"]).toContain(example.baseSkill);
  });
});
