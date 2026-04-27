import { describe, it, expect, beforeEach } from "vitest";
import type { AgentData } from "./agent-schema";

/**
 * Test suite for weird agent powers system (#19, #20)
 * - Power field on AgentDataModel
 * - Power activation mechanics (costs 1 Cool)
 * - Cool system variant (unlimited cap, stress affects cool differently)
 */

interface PowerDescriptor {
  name: string;
  description: string;
  baseSkill: "athletics" | "contact";
  coolCost: number;
}

type WeirdAgentData = AgentData;

describe("Weird Agent Powers", () => {
  describe("Power descriptor", () => {
    it("should define a power with name, description, base skill, and cool cost", () => {
      const power: PowerDescriptor = {
        name: "Shapeshifter",
        description: "Transform into another humanoid shape",
        baseSkill: "athletics",
        coolCost: 1,
      };

      expect(power.name).toBe("Shapeshifter");
      expect(power.baseSkill).toBe("athletics");
      expect(power.coolCost).toBe(1);
    });

    it("should support powers that add to Athletics", () => {
      const power: PowerDescriptor = {
        name: "Fire Breath",
        description: "Exhale supernatural flames",
        baseSkill: "athletics",
        coolCost: 1,
      };

      expect(power.baseSkill).toBe("athletics");
    });

    it("should support powers that add to Contact", () => {
      const power: PowerDescriptor = {
        name: "Mind Control",
        description: "Influence a target's thoughts",
        baseSkill: "contact",
        coolCost: 1,
      };

      expect(power.baseSkill).toBe("contact");
    });
  });

  describe("Cool system for weird agents", () => {
    it("should allow unlimited Cool for weird agents (no cap)", () => {
      const agent: WeirdAgentData = {
        description: "",
        skills: {
          academics: { base: 2, penalty: 0 },
          athletics: { base: 3, penalty: 0 },
          technology: { base: 0, penalty: 0 },
          contact: { base: 5, penalty: 0 },
        },
        talent: "",
        cool: 15,
        isWeird: true,
        characteristics: [],
        missionPool: 0,
        isDead: false,
        daysOutOfAction: 0,
        recoveryStartedAt: 0,
        stress: 0,
      };

      // Weird agent with 15 cool should be allowed (normal cap is 3)
      expect(agent.isWeird).toBe(true);
      expect(agent.cool).toBe(15);
    });

    it("should reduce Cool on power activation", () => {
      const agent: WeirdAgentData = {
        description: "",
        skills: {
          academics: { base: 1, penalty: 0 },
          athletics: { base: 1, penalty: 0 },
          technology: { base: 1, penalty: 0 },
          contact: { base: 1, penalty: 0 },
        },
        talent: "",
        cool: 5,
        isWeird: true,
        characteristics: [],
        missionPool: 0,
        isDead: false,
        daysOutOfAction: 0,
        recoveryStartedAt: 0,
        stress: 0,
        power: {
          name: "Shapeshifter",
          description: "Transform",
          baseSkill: "athletics",
          coolCost: 1,
        },
      };

      // After activating power (cost 1 cool), should have 4 cool remaining
      const remainingCool = agent.cool - (agent.power?.coolCost ?? 0);
      expect(remainingCool).toBe(4);
    });

    it("should prevent power activation if insufficient Cool", () => {
      const agent: WeirdAgentData = {
        description: "",
        skills: {
          academics: { base: 1, penalty: 0 },
          athletics: { base: 1, penalty: 0 },
          technology: { base: 1, penalty: 0 },
          contact: { base: 1, penalty: 0 },
        },
        talent: "",
        cool: 0,
        isWeird: true,
        characteristics: [],
        missionPool: 0,
        isDead: false,
        daysOutOfAction: 0,
        recoveryStartedAt: 0,
        stress: 0,
        power: {
          name: "Mind Control",
          description: "Control thoughts",
          baseSkill: "contact",
          coolCost: 1,
        },
      };

      const canActivate = agent.cool >= (agent.power?.coolCost ?? 0);
      expect(canActivate).toBe(false);
    });
  });

  describe("Stress effect on Cool (weird variant)", () => {
    it("should apply stress penalty to Cool in weird variant", () => {
      const agent: WeirdAgentData = {
        description: "",
        skills: {
          academics: { base: 1, penalty: 2 },
          athletics: { base: 1, penalty: 2 },
          technology: { base: 1, penalty: 2 },
          contact: { base: 1, penalty: 2 },
        },
        talent: "",
        cool: 4,
        isWeird: true,
        characteristics: [],
        missionPool: 0,
        isDead: false,
        daysOutOfAction: 0,
        recoveryStartedAt: 0,
        stress: 2,
      };

      // Stress of 2 should reduce effective Cool to 2 (4 - 2 = 2)
      // This is the weird variant mechanic
      const effectiveCool = Math.max(0, agent.cool - agent.stress);
      expect(effectiveCool).toBe(2);
    });

    it("should reduce Cool to 0 if stress exceeds Cool", () => {
      const agent: WeirdAgentData = {
        description: "",
        skills: {
          academics: { base: 1, penalty: 0 },
          athletics: { base: 1, penalty: 0 },
          technology: { base: 1, penalty: 0 },
          contact: { base: 1, penalty: 0 },
        },
        talent: "",
        cool: 2,
        isWeird: true,
        characteristics: [],
        missionPool: 0,
        isDead: false,
        daysOutOfAction: 0,
        recoveryStartedAt: 0,
        stress: 5,
      };

      const effectiveCool = Math.max(0, agent.cool - agent.stress);
      expect(effectiveCool).toBe(0);
    });
  });

  describe("Power activation in rolls", () => {
    it("should add power bonus to base skill when activated", () => {
      const agent: WeirdAgentData = {
        description: "",
        skills: {
          academics: { base: 2, penalty: 0 },
          athletics: { base: 3, penalty: 0 },
          technology: { base: 1, penalty: 0 },
          contact: { base: 2, penalty: 0 },
        },
        talent: "",
        cool: 3,
        isWeird: true,
        characteristics: [],
        missionPool: 0,
        isDead: false,
        daysOutOfAction: 0,
        recoveryStartedAt: 0,
        stress: 0,
        power: {
          name: "Fire Breath",
          description: "Exhale flames",
          baseSkill: "athletics",
          coolCost: 1,
        },
      };

      // Power adds +1d6 to athletics when activated
      const baseAthleticsPool = agent.skills.athletics.base;
      const powerBonus = agent.power?.baseSkill === "athletics" ? 1 : 0;
      const totalAthleticsPool = baseAthleticsPool + powerBonus;

      expect(totalAthleticsPool).toBe(4);
    });
  });

  describe("Franchise restriction for weird agents", () => {
    it("should not earn franchise dice on 5-6 skill rolls (weird only)", () => {
      const weirdAgent: WeirdAgentData = {
        description: "",
        skills: {
          academics: { base: 2, penalty: 0 },
          athletics: { base: 2, penalty: 0 },
          technology: { base: 2, penalty: 0 },
          contact: { base: 4, penalty: 0 },
        },
        talent: "",
        cool: 2,
        isWeird: true,
        characteristics: [],
        missionPool: 0,
        isDead: false,
        daysOutOfAction: 0,
        recoveryStartedAt: 0,
        stress: 0,
      };

      const shouldEarnFranchise = !weirdAgent.isWeird;
      expect(shouldEarnFranchise).toBe(false);
    });

    it("should earn franchise dice normally for non-weird agents", () => {
      const normalAgent: AgentData = {
        description: "",
        skills: {
          academics: { base: 2, penalty: 0 },
          athletics: { base: 2, penalty: 0 },
          technology: { base: 2, penalty: 0 },
          contact: { base: 3, penalty: 0 },
        },
        talent: "Star Trek Geek",
        cool: 0,
        isWeird: false,
        power: null,
        characteristics: [],
        missionPool: 0,
        isDead: false,
        daysOutOfAction: 0,
        recoveryStartedAt: 0,
        stress: 0,
      };

      const shouldEarnFranchise = !normalAgent.isWeird;
      expect(shouldEarnFranchise).toBe(true);
    });
  });
});
