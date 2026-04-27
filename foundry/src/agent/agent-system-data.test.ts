import { describe, it, expect } from "vitest";
import { agentSystemData } from "./agent-system-data.js";
import { makeAgent } from "../__mocks__/test-fixtures.js";
import type { AgentData } from "./agent-schema.js";

describe("agentSystemData helper", () => {
  it("extracts system data from an agent actor", () => {
    const mockActor = makeAgent({
      "description": "Test agent",
      "skills": {
        academics: { base: 2, penalty: 0 },
        athletics: { base: 1, penalty: 0 },
        technology: { base: 3, penalty: 0 },
        contact: { base: 2, penalty: 0 },
      },
      "talent": "Hypnosis",
      "characteristics": [{ text: "Paranoid", used: false }],
      "stress": 1,
    }) as unknown as Actor;

    const result = agentSystemData(mockActor);

    expect(result.description).toBe("Test agent");
    expect(result.skills.academics.base).toBe(2);
    expect(result.talent).toBe("Hypnosis");
    expect(result.cool).toBe(2);
    expect(result.isWeird).toBe(false);
    expect(result.isDead).toBe(false);
    expect(result.stress).toBe(1);
  });

  it("preserves optional WeirdPower field", () => {
    const mockActor = makeAgent({
      "description": "Weird agent",
      "talent": undefined,
      "isWeird": true,
      "power": {
        name: "Levitate",
        description: "Can levitate objects",
        baseSkill: "athletics" as const,
        coolCost: 1,
      },
      "characteristics": [],
      "stress": 0,
    }) as unknown as Actor;

    const result = agentSystemData(mockActor);

    expect(result.isWeird).toBe(true);
    expect(result.power).toBeDefined();
    expect(result.power?.name).toBe("Levitate");
  });

  it("returns a properly typed AgentData object", () => {
    const mockActor = makeAgent({
      "description": "",
      "stress": 0,
    }) as unknown as Actor;

    const result: AgentData = agentSystemData(mockActor);

    // Type assertion should succeed at compile time
    expect(result).toBeDefined();
    expect(typeof result.stress).toBe("number");
    expect(typeof result.cool).toBe("number");
    expect(Array.isArray(result.characteristics)).toBe(true);
  });
});
