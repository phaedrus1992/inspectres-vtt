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
    expect(schema).toHaveProperty("missionPool");
    expect(schema).toHaveProperty("description");
  });
});
