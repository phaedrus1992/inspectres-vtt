import { describe, it, expect } from "vitest";
import { makeAgent, makeFranchise } from "./test-fixtures.js";
import type { RollActor } from "../rolls/roll-executor.js";

describe("test-fixtures — consolidated RollActor builders", () => {
  describe("makeAgent", () => {
    it("creates a RollActor implementing the agent interface", () => {
      const agent = makeAgent();

      expect(agent.id).toBe("test-agent-id");
      expect(agent.name).toBe("Test Agent");
      expect(typeof agent.system).toBe("object");
      expect(typeof agent.update).toBe("function");
    });

    it("accepts overrides for system properties", () => {
      const agent = makeAgent({ "cool": 5 });
      const system = agent.system as Record<string, unknown>;
      expect(system["cool"]).toBe(5);
    });

    it("supports nested system property updates", async () => {
      const agent = makeAgent();
      await agent.update({ "system.skills.academics.base": 4 });

      const system = agent.system as Record<string, unknown>;
      const skills = system["skills"] as Record<string, unknown>;
      const academics = skills["academics"] as Record<string, unknown>;
      expect(academics["base"]).toBe(4);
    });

    it("returns type-compatible RollActor", () => {
      const agent = makeAgent();
      const _typed: RollActor = agent; // Should compile without error

      expect(_typed).toBeDefined();
    });
  });

  describe("makeFranchise", () => {
    it("creates a RollActor implementing the franchise interface", () => {
      const franchise = makeFranchise();

      expect(franchise.id).toBe("test-franchise-id");
      expect(franchise.name).toBe("Test Franchise");
      expect(typeof franchise.system).toBe("object");
      expect(typeof franchise.update).toBe("function");
    });

    it("accepts overrides for system properties", () => {
      const franchise = makeFranchise({ "bank": 10 });
      const system = franchise.system as Record<string, unknown>;
      expect(system["bank"]).toBe(10);
    });

    it("returns type-compatible RollActor", () => {
      const franchise = makeFranchise();
      const _typed: RollActor = franchise; // Should compile without error

      expect(_typed).toBeDefined();
    });
  });
});
