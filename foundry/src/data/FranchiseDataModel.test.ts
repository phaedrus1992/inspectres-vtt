import { describe, it, expect } from "vitest";

describe("FranchiseDataModel", () => {
  it("module exports FranchiseDataModel", async () => {
    const mod = await import("./FranchiseDataModel.js");
    expect(mod.FranchiseDataModel).toBeDefined();
  });

  it("defineSchema includes cards sub-schema", async () => {
    const { FranchiseDataModel } = await import("./FranchiseDataModel.js");
    const schema = FranchiseDataModel.defineSchema();
    expect(schema).toHaveProperty("cards");
    const cards = (schema["cards"] as { fields: Record<string, unknown> }).fields;
    expect(cards).toHaveProperty("library");
    expect(cards).toHaveProperty("gym");
    expect(cards).toHaveProperty("credit");
  });

  it("defineSchema includes all top-level franchise fields", async () => {
    const { FranchiseDataModel } = await import("./FranchiseDataModel.js");
    const schema = FranchiseDataModel.defineSchema();
    expect(schema).toHaveProperty("bank");
    expect(schema).toHaveProperty("missionPool");
    expect(schema).toHaveProperty("missionGoal");
    expect(schema).toHaveProperty("debtMode");
    expect(schema).toHaveProperty("loanAmount");
    expect(schema).toHaveProperty("description");
  });
});
