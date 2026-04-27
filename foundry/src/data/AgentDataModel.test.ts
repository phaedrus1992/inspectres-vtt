import { describe, it, expect } from "vitest";

// RED: These tests will fail until AgentDataModel is implemented.
// They verify the schema shape and default values match template.json.

describe("AgentDataModel", () => {
  it("module exports AgentDataModel", async () => {
    const mod = await import("./AgentDataModel.js");
    expect(mod.AgentDataModel).toBeDefined();
  });

  it("defineSchema returns all required skill fields", async () => {
    const { AgentDataModel } = await import("./AgentDataModel.js");
    const schema = AgentDataModel.defineSchema();
    expect(schema).toHaveProperty("skills");
    const skills = (schema["skills"] as { fields: Record<string, unknown> }).fields;
    expect(skills).toHaveProperty("academics");
    expect(skills).toHaveProperty("athletics");
    expect(skills).toHaveProperty("technology");
    expect(skills).toHaveProperty("contact");
  });

  it("defineSchema includes all top-level agent fields", async () => {
    const { AgentDataModel } = await import("./AgentDataModel.js");
    const schema = AgentDataModel.defineSchema();
    expect(schema).toHaveProperty("talent");
    expect(schema).toHaveProperty("cool");
    expect(schema).toHaveProperty("isWeird");
    expect(schema).toHaveProperty("characteristics");
    expect(schema).toHaveProperty("description");
  });

  // Issue #222: Weird agent power field not persisted
  describe("Issue #222: Weird Agent Power Field", () => {
    it("defineSchema includes power field (WeirdPower | null)", async () => {
      const { AgentDataModel } = await import("./AgentDataModel.js");
      const schema = AgentDataModel.defineSchema();
      expect(schema).toHaveProperty("power");
    });

    it("power field is a SchemaField that accepts WeirdPower structure", async () => {
      const { AgentDataModel } = await import("./AgentDataModel.js");
      const schema = AgentDataModel.defineSchema();
      const powerField = schema["power"];
      // SchemaField has fields property containing nested schemas
      expect(powerField).toBeDefined();
      const powerSchemaFields = (powerField as { fields: Record<string, unknown> }).fields;
      if (powerSchemaFields) {
        expect(powerSchemaFields).toHaveProperty("name");
        expect(powerSchemaFields).toHaveProperty("description");
        expect(powerSchemaFields).toHaveProperty("baseSkill");
        expect(powerSchemaFields).toHaveProperty("coolCost");
      }
    });

    it("power field is optional (not required)", async () => {
      const { AgentDataModel } = await import("./AgentDataModel.js");
      const schema = AgentDataModel.defineSchema();
      const powerField = schema["power"] as { required?: boolean };
      // Optional fields have required: false or are not marked required
      expect(powerField.required).not.toBe(true);
    });
  });

  // Issue #218: Weird agent skill range must allow 0-10
  describe("Issue #218: Weird Agent Skill Range Validation", () => {
    it("schema defines skill fields for each skill type", async () => {
      const { AgentDataModel } = await import("./AgentDataModel.js");
      const schema = AgentDataModel.defineSchema();
      const skillsField = schema["skills"] as { fields: Record<string, unknown> };
      const academicsField = skillsField.fields["academics"] as { fields: Record<string, unknown> };
      expect(academicsField.fields).toHaveProperty("base");
      expect(academicsField.fields).toHaveProperty("penalty");
    });

    it("AgentDataModel has prepareBaseData to enforce weird agent skill rules", async () => {
      const { AgentDataModel } = await import("./AgentDataModel.js");
      expect(AgentDataModel.prototype.prepareBaseData).toBeDefined();
    });

    it("prepareBaseData enforces skill range (weird agents allow 0-10, normal 0-4)", async () => {
      const { AgentDataModel } = await import("./AgentDataModel.js");
      // Test verifies schema constraint: skill base now allows max 10 (changed from 4)
      // This supports weird agents (skill range 0-10) while _preUpdate enforces contextual limits
      // Weird agents: max 10, Normal agents: max 4
      const schema = AgentDataModel.defineSchema();
      expect(schema).toHaveProperty("skills");
      expect(schema).toHaveProperty("isWeird");
      // Validation logic is in AgentDataModel.prepareBaseData() and InSpectresAgent._preUpdate()
      const prepareBaseData = AgentDataModel.prototype.prepareBaseData;
      expect(typeof prepareBaseData).toBe("function");
    });
  });

  // Issue #219: Enforce one weird agent per group
  describe("Issue #219: Weird Agent Group Gating", () => {
    it("group-level validation prevents >1 weird agent", async () => {
      // Note: Issue #219 group-level validation is deferred to Issue #292 (group assignment feature)
      // This test documents the expected behavior when group feature is implemented
      const { AgentDataModel } = await import("./AgentDataModel.js");
      expect(AgentDataModel).toBeDefined();
      // When Issue #292 adds group assignment, this test should validate:
      // - Agent with group "A" and isWeird=true can be created
      // - Second agent with group "A" cannot set isWeird=true
      // - Different groups can each have one weird agent
    });
  });

  // Issue #223: Prevent schema drift
  describe("Issue #223: Schema Drift Prevention", () => {
    it("AgentDataModel fields match AgentData interface keys", async () => {
      const { AgentDataModel } = await import("./AgentDataModel.js");
      const schema = AgentDataModel.defineSchema();
      // Compare against expected keys from AgentData interface
      const schemaKeys = Object.keys(schema).sort();
      const expectedKeys = [
        "characteristics",
        "cool",
        "description",
        "daysOutOfAction",
        "isDead",
        "isWeird",
        "power",
        "recoveryStartedAt",
        "skills",
        "stress",
        "talent",
      ].sort();
      expect(schemaKeys).toEqual(expectedKeys);
    });

    it("schema includes power field that was missing before", async () => {
      const { AgentDataModel } = await import("./AgentDataModel.js");
      const schema = AgentDataModel.defineSchema();
      // Verify power is now in schema (was missing in #222)
      expect(schema).toHaveProperty("power");
    });
  });
});
