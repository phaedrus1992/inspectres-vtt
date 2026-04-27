import { describe, it, expect } from "vitest";
import { getActorSystem, type RollActor } from "./system-cast";

describe("getActorSystem", () => {
  it("returns properly typed actor system", () => {
    const actor: RollActor = {
      id: "test-123",
      name: "Test Agent",
      system: { cool: 3, franchise: 1 },
      async update() {},
    };

    const system = getActorSystem<{ cool: number; franchise: number }>(actor);

    expect(system).toEqual({ cool: 3, franchise: 1 });
    expect(system.cool).toBe(3);
  });

  it("handles nested system properties", () => {
    interface TestSystemWithNested {
      skills: {
        academics: { base: number };
        athletics: { base: number };
      };
    }

    const actor: RollActor = {
      id: "test-456",
      name: "Test",
      system: {
        skills: {
          academics: { base: 2 },
          athletics: { base: 1 },
        },
      },
      async update() {},
    };

    const system = getActorSystem<TestSystemWithNested>(actor);

    expect(system.skills.academics.base).toBe(2);
    expect(system.skills.athletics.base).toBe(1);
  });

  it("works with null id (test fixture)", () => {
    const actor: RollActor = {
      id: null,
      name: "Fixture",
      system: { stress: 2 },
      async update() {},
    };

    const system = getActorSystem<{ stress: number }>(actor);

    expect(system.stress).toBe(2);
  });
});
