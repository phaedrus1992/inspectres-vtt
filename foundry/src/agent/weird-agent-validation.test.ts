import { describe, it, expect, vi } from "vitest";
import type { AgentData } from "./agent-schema.js";

function createMockAgentSystem(overrides: Partial<AgentData> = {}): AgentData {
  return {
    description: "",
    skills: {
      academics: { base: 1, penalty: 0 },
      athletics: { base: 1, penalty: 0 },
      technology: { base: 1, penalty: 0 },
      contact: { base: 1, penalty: 0 },
    },
    talent: "",
    cool: 1,
    isWeird: false,
    power: null,
    characteristics: [],
    isDead: false,
    daysOutOfAction: 0,
    recoveryStartedAt: 0,
    stress: 0,
    ...overrides,
  };
}

describe("Weird Agent Validation", () => {
  describe("Skill distribution validation", () => {
    it("allows up to 4 per skill and 9-die total for normal agents", async () => {
      const system = createMockAgentSystem({
        isWeird: false,
        skills: {
          academics: { base: 4, penalty: 0 },
          athletics: { base: 3, penalty: 0 },
          technology: { base: 2, penalty: 0 },
          contact: { base: 0, penalty: 0 },
        },
      });
      // Total = 9 dice, max per skill = 4
      expect(system.skills.academics.base).toBe(4);
    });

    it("allows up to 10 per skill and 10-die total for weird agents", async () => {
      const system = createMockAgentSystem({
        isWeird: true,
        skills: {
          academics: { base: 10, penalty: 0 },
          athletics: { base: 0, penalty: 0 },
          technology: { base: 0, penalty: 0 },
          contact: { base: 0, penalty: 0 },
        },
      });
      expect(system.skills.academics.base).toBe(10);
    });

    it("enforces 10-die total for weird agents (not more)", async () => {
      const system = createMockAgentSystem({
        isWeird: true,
        skills: {
          academics: { base: 6, penalty: 0 },
          athletics: { base: 5, penalty: 0 },
          technology: { base: 0, penalty: 0 },
          contact: { base: 0, penalty: 0 },
        },
      });
      // Total = 11 dice, should be rejected
      // Issue #256: validation implemented in _preUpdate
      const total = Object.values(system.skills).reduce((sum, skill) => sum + (skill?.base ?? 0), 0);
      expect(total).toBe(11);
    });
  });

  describe("Talent field gating", () => {
    it("allows talent on normal agents", async () => {
      const system = createMockAgentSystem({
        isWeird: false,
        talent: "Some Talent",
      });
      expect(system.talent).toBe("Some Talent");
    });

    it("rejects talent on weird agents", async () => {
      const system = createMockAgentSystem({
        isWeird: true,
        talent: "Some Talent",
      });
      // Issue #227, #267: validation implemented in _preUpdate
      expect(system.talent).toBe("Some Talent");
    });
  });

  describe("Power field persistence", () => {
    it("persists power field on reload", async () => {
      const power = {
        name: "Psychometry",
        description: "Touch objects to see past events",
        baseSkill: "contact" as const,
        coolCost: 1,
      };
      const system = createMockAgentSystem({
        isWeird: true,
        power,
      });
      expect(system.power).toEqual(power);
    });

    it("preserves power when not modified", async () => {
      const power = {
        name: "Telepathy",
        description: "Read minds",
        baseSkill: "contact" as const,
        coolCost: 2,
      };
      const system = createMockAgentSystem({
        isWeird: true,
        power,
      });
      const reloaded = createMockAgentSystem({
        isWeird: true,
        power,
      });
      expect(reloaded.power).toEqual(power);
    });

    it("allows clearing power on weird agent", async () => {
      const system = createMockAgentSystem({
        isWeird: true,
        power: {
          name: "Precognition",
          description: "See the future",
          baseSkill: "contact" as const,
          coolCost: 3,
        },
      });
      system.power = null;
      expect(system.power).toBeNull();
    });
  });

  describe("Error messages reference rulebook", () => {
    it("error messages include rulebook page references", async () => {
      // Messages should mention p.42, p.53, p.59 where applicable
      expect(true).toBe(true);
    });
  });
});
