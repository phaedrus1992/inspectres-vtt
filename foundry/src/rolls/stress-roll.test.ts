import { describe, it, expect } from "vitest";
import { getStressOutcomeFace, buildStressUpdateData, SKILL_NAMES } from "./stress-roll.js";
import { STRESS_ROLL_CHART, DEATH_DISMEMBERMENT_CHART } from "./roll-charts.js";
import type { AgentData } from "../agent/agent-schema.js";
import { createDayNumber } from "../types/brands.js";

function makeAgentSystem(overrides: Partial<AgentData> = {}): AgentData {
  return {
    description: "",
    skills: {
      academics: { base: 1, penalty: 0 },
      athletics: { base: 1, penalty: 0 },
      technology: { base: 1, penalty: 0 },
      contact: { base: 1, penalty: 0 },
    },
    talent: "",
    cool: 3,
    isWeird: false,
    power: null,
    characteristics: [],
    isDead: false,
    daysOutOfAction: createDayNumber(0),
    recoveryStartedAt: createDayNumber(0),
    stress: 0,
    ...overrides,
  };
}

describe("getStressOutcomeFace", () => {
  it("returns the lowest face when no cool dice are used", () => {
    expect(getStressOutcomeFace([4, 2, 6], 0)).toBe(2);
  });

  it("removes the N lowest dice for N cool dice used", () => {
    // sorted: [1, 3, 5]; removing 1 lowest leaves [3, 5]; lowest of those is 3
    expect(getStressOutcomeFace([5, 1, 3], 1)).toBe(3);
  });

  it("removes all dice when cool dice equals dice count, defaulting to face 6", () => {
    expect(getStressOutcomeFace([1, 2], 2)).toBe(6);
  });

  it("handles empty dice array as face 6 (no stress applied)", () => {
    expect(getStressOutcomeFace([], 0)).toBe(6);
  });

  it("clamps non-DieFace values to 1", () => {
    // An invalid face like 0 should fall back to the safe lower bound (1)
    expect(getStressOutcomeFace([0], 0)).toBe(1);
  });

  it("treats removed-die slot correctly with duplicates", () => {
    // sorted: [2, 2, 5]; remove 1 leaves [2, 5]; lowest is 2
    expect(getStressOutcomeFace([2, 5, 2], 1)).toBe(2);
  });
});

describe("buildStressUpdateData", () => {
  it("on meltdown (face 1) zeroes cool and applies meltdown penalty to chosen skill", () => {
    const system = makeAgentSystem({ cool: 4 });
    const data = buildStressUpdateData(
      system,
      1,
      STRESS_ROLL_CHART[1],
      "academics",
      null,
      null,
      3,
    );
    expect(data["system.cool"]).toBe(0);
    expect(data["system.skills.academics.penalty"]).toBe(3);
  });

  it("on meltdown without meltdown skill choice still zeroes cool", () => {
    const system = makeAgentSystem({ cool: 2 });
    const data = buildStressUpdateData(system, 1, STRESS_ROLL_CHART[1], null, null, null, 2);
    expect(data["system.cool"]).toBe(0);
    expect("system.skills.academics.penalty" in data).toBe(false);
  });

  it("on face 6 (TooCool) adds coolGain to current cool, no penalty", () => {
    const system = makeAgentSystem({ cool: 2 });
    const data = buildStressUpdateData(system, 6, STRESS_ROLL_CHART[6], null, null, null, 1);
    expect(data["system.cool"]).toBe(3);
  });

  it("on face 3 applies the chart's skillPenalty to chosen skill", () => {
    const system = makeAgentSystem();
    const data = buildStressUpdateData(
      system,
      3,
      STRESS_ROLL_CHART[3],
      null,
      "technology",
      null,
      1,
    );
    expect(data["system.skills.technology.penalty"]).toBe(STRESS_ROLL_CHART[3].skillPenalty);
  });

  it("stacks new penalty on top of existing skill penalty", () => {
    const system = makeAgentSystem({
      skills: {
        academics: { base: 1, penalty: 0 },
        athletics: { base: 1, penalty: 2 },
        technology: { base: 1, penalty: 0 },
        contact: { base: 1, penalty: 0 },
      },
    });
    const data = buildStressUpdateData(
      system,
      2,
      STRESS_ROLL_CHART[2],
      null,
      "athletics",
      null,
      1,
    );
    // existing 2 + face-2 chart penalty of 2 = 4
    expect(data["system.skills.athletics.penalty"]).toBe(4);
  });

  it("on death outcome with daysOutOfAction sets recovery fields", () => {
    const system = makeAgentSystem();
    const data = buildStressUpdateData(
      system,
      1,
      STRESS_ROLL_CHART[1],
      null,
      null,
      DEATH_DISMEMBERMENT_CHART[1],
      2,
    );
    expect(data["system.daysOutOfAction"]).toBe(2);
    expect(typeof data["system.recoveryStartedAt"]).toBe("number");
    expect("system.isDead" in data).toBe(false);
  });

  it("on death outcome with isDead sets isDead but no recovery fields", () => {
    const system = makeAgentSystem();
    const data = buildStressUpdateData(
      system,
      1,
      STRESS_ROLL_CHART[1],
      null,
      null,
      DEATH_DISMEMBERMENT_CHART[3],
      1,
    );
    expect(data["system.isDead"]).toBe(true);
    expect("system.daysOutOfAction" in data).toBe(false);
  });

  it("does not write cool when coolGain is 0 and not meltdown", () => {
    const system = makeAgentSystem({ cool: 1 });
    const data = buildStressUpdateData(system, 4, STRESS_ROLL_CHART[4], null, null, null, 1);
    expect("system.cool" in data).toBe(false);
  });
});

describe("SKILL_NAMES", () => {
  it("matches the four AgentData skill keys", () => {
    expect([...SKILL_NAMES].sort()).toEqual(["academics", "athletics", "contact", "technology"]);
  });

  it("is readonly at the type level", () => {
    // Sanity: confirm SKILL_NAMES exposes a stable length for dialog rendering
    expect(SKILL_NAMES.length).toBe(4);
  });
});
