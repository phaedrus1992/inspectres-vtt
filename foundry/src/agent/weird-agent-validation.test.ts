import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AgentData } from "./agent-schema.js";

/**
 * Validation helper functions extracted for testing.
 * These mirror the validation logic in InSpectresAgent._preCreate and _preUpdate.
 */

function validateSkillRange(
  isWeird: boolean,
  skills: Record<string, { base?: number }> | undefined,
): void {
  if (!skills) return;
  const maxSkill = isWeird ? 10 : 4;
  for (const skill of Object.values(skills)) {
    if (skill && "base" in skill && typeof skill.base === "number" && skill.base > maxSkill) {
      throw new Error(
        `Skill value ${skill.base} exceeds max of ${maxSkill} for ${isWeird ? "weird" : "normal"} agent (p.42, p.59)`,
      );
    }
  }
}

function validateSkillBudget(isWeird: boolean, skills: Record<string, { base: number }> | undefined): void {
  if (!skills) return;
  const totalDice = Object.values(skills).reduce((sum, skill) => sum + (skill?.base ?? 0), 0);
  const maxDice = isWeird ? 10 : 9;
  if (totalDice > maxDice) {
    throw new Error(
      `Skill total ${totalDice} exceeds max of ${maxDice} dice for ${isWeird ? "weird" : "normal"} agent (p.42, p.59)`,
    );
  }
}

function validateTalentGating(isWeird: boolean, talent: string | undefined): void {
  if (isWeird && talent) {
    throw new Error("Weird agents cannot have Talent (p.42, p.59). Clear the Talent field.");
  }
}

function validateSkillMinimum(skills: Record<string, { base: number }> | undefined): void {
  if (!skills) return;
  for (const skill of Object.values(skills)) {
    if (skill && "base" in skill && typeof skill.base === "number" && skill.base < 0) {
      throw new Error("Skill base cannot be negative");
    }
  }
}

describe("Weird Agent Validation", () => {
  describe("Skill range validation", () => {
    it("allows up to 4 per skill for normal agents", () => {
      const skills = {
        academics: { base: 4 },
        athletics: { base: 0 },
        technology: { base: 0 },
        contact: { base: 0 },
      };
      expect(() => validateSkillRange(false, skills)).not.toThrow();
    });

    it("rejects skills exceeding 4 for normal agents", () => {
      const skills = {
        academics: { base: 5 },
        athletics: { base: 0 },
        technology: { base: 0 },
        contact: { base: 0 },
      };
      expect(() => validateSkillRange(false, skills)).toThrow(/exceeds max of 4/);
    });

    it("allows up to 10 per skill for weird agents", () => {
      const skills = {
        academics: { base: 10 },
        athletics: { base: 0 },
        technology: { base: 0 },
        contact: { base: 0 },
      };
      expect(() => validateSkillRange(true, skills)).not.toThrow();
    });

    it("rejects skills exceeding 10 for weird agents", () => {
      const skills = {
        academics: { base: 11 },
        athletics: { base: 0 },
        technology: { base: 0 },
        contact: { base: 0 },
      };
      expect(() => validateSkillRange(true, skills)).toThrow(/exceeds max of 10/);
    });
  });

  describe("Skill budget validation", () => {
    it("allows 9 total dice for normal agents", () => {
      const skills = {
        academics: { base: 4 },
        athletics: { base: 3 },
        technology: { base: 2 },
        contact: { base: 0 },
      };
      expect(() => validateSkillBudget(false, skills)).not.toThrow();
    });

    it("rejects 10+ total dice for normal agents", () => {
      const skills = {
        academics: { base: 4 },
        athletics: { base: 3 },
        technology: { base: 2 },
        contact: { base: 1 },
      };
      expect(() => validateSkillBudget(false, skills)).toThrow(/exceeds max of 9 dice/);
    });

    it("allows 10 total dice for weird agents", () => {
      const skills = {
        academics: { base: 10 },
        athletics: { base: 0 },
        technology: { base: 0 },
        contact: { base: 0 },
      };
      expect(() => validateSkillBudget(true, skills)).not.toThrow();
    });

    it("rejects 11+ total dice for weird agents", () => {
      const skills = {
        academics: { base: 6 },
        athletics: { base: 5 },
        technology: { base: 0 },
        contact: { base: 0 },
      };
      expect(() => validateSkillBudget(true, skills)).toThrow(/exceeds max of 10 dice/);
    });
  });

  describe("Talent field gating", () => {
    it("allows talent on normal agents", () => {
      expect(() => validateTalentGating(false, "Some Talent")).not.toThrow();
    });

    it("rejects talent on weird agents", () => {
      expect(() => validateTalentGating(true, "Some Talent")).toThrow(
        /Weird agents cannot have Talent/,
      );
    });

    it("allows empty/undefined talent on weird agents", () => {
      expect(() => validateTalentGating(true, undefined)).not.toThrow();
      expect(() => validateTalentGating(true, "")).not.toThrow();
    });
  });

  describe("Skill minimum validation", () => {
    it("rejects negative skill base values", () => {
      const skills = {
        academics: { base: -1 },
        athletics: { base: 0 },
        technology: { base: 0 },
        contact: { base: 0 },
      };
      expect(() => validateSkillMinimum(skills)).toThrow(/cannot be negative/);
    });

    it("allows zero skill base values", () => {
      const skills = {
        academics: { base: 0 },
        athletics: { base: 0 },
        technology: { base: 0 },
        contact: { base: 0 },
      };
      expect(() => validateSkillMinimum(skills)).not.toThrow();
    });
  });

  describe("Combined validation (multi-rule checks)", () => {
    it("validates skill range before budget (catches overspend per-skill first)", () => {
      const skills = {
        academics: { base: 5 }, // exceeds per-skill max of 4 for normal
        athletics: { base: 0 },
        technology: { base: 0 },
        contact: { base: 0 },
      };
      expect(() => {
        validateSkillRange(false, skills);
        validateSkillBudget(false, skills);
      }).toThrow(/exceeds max of 4/); // per-skill check catches it first
    });

    it("validates talent gating independently", () => {
      const skills = {
        academics: { base: 4 },
        athletics: { base: 3 },
        technology: { base: 2 },
        contact: { base: 0 },
      };
      // Weird agent with valid skills but invalid talent
      expect(() => {
        validateSkillRange(true, skills);
        validateSkillBudget(true, skills);
        validateTalentGating(true, "Some Talent");
      }).toThrow(/Weird agents cannot have Talent/);
    });

    it("validates skill minimum as lower bound", () => {
      const skills = {
        academics: { base: -2 },
        athletics: { base: 0 },
        technology: { base: 0 },
        contact: { base: 0 },
      };
      expect(() => validateSkillMinimum(skills)).toThrow(/cannot be negative/);
    });
  });

  describe("Error messages include rulebook references", () => {
    it("skill range error includes page references", () => {
      const skills = {
        academics: { base: 5 },
        athletics: { base: 0 },
        technology: { base: 0 },
        contact: { base: 0 },
      };
      expect(() => validateSkillRange(false, skills)).toThrow(/p\.42, p\.59/);
    });

    it("skill budget error includes page references", () => {
      const skills = {
        academics: { base: 4 },
        athletics: { base: 3 },
        technology: { base: 2 },
        contact: { base: 1 },
      };
      expect(() => validateSkillBudget(false, skills)).toThrow(/p\.42, p\.59/);
    });

    it("talent error includes page references", () => {
      expect(() => validateTalentGating(true, "Some Talent")).toThrow(/p\.42, p\.59/);
    });
  });
});
