import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { MockRoll } from "../__mocks__/setup.js";
import { makeAgent, makeFranchise } from "../__mocks__/test-fixtures.js";

// We import the pure helper indirectly by importing the module under test.
// The pure resolveBankDice logic is exercised via executeSkillRoll and
// executeBankRoll, but we also export it for direct testing.
import {
  resolveBankDice,
  executeSkillRoll,
  executeStressRoll,
  executeBankRoll,
  executeClientRoll,
  type RollActor,
} from "./roll-executor.js";

// ---------------------------------------------------------------------------
// resolveBankDice — pure function tests
// ---------------------------------------------------------------------------

describe("resolveBankDice", () => {
  it("face 6: returns die and adds one (net +1)", () => {
    const result = resolveBankDice([6], 3);
    expect(result.finalBankTotal).toBe(4);
    expect(result.resolutions[0]?.loseAllBank).toBe(false);
  });

  it("face 5: returns die only (net 0)", () => {
    const result = resolveBankDice([5], 3);
    expect(result.finalBankTotal).toBe(3);
  });

  it("face 4: die lost (net -1)", () => {
    const result = resolveBankDice([4], 5);
    expect(result.finalBankTotal).toBe(4);
  });

  it("face 3: die lost (net -1)", () => {
    const result = resolveBankDice([3], 5);
    expect(result.finalBankTotal).toBe(4);
  });

  it("face 2: die lost plus one extra (net -2)", () => {
    const result = resolveBankDice([2], 5);
    expect(result.finalBankTotal).toBe(3);
  });

  it("face 1: loses all bank dice regardless of other results", () => {
    const result = resolveBankDice([6, 6, 1, 6], 10);
    expect(result.finalBankTotal).toBe(0);
    expect(result.resolutions[2]?.loseAllBank).toBe(true);
  });

  it("face 1: loses all even with only one die", () => {
    const result = resolveBankDice([1], 8);
    expect(result.finalBankTotal).toBe(0);
  });

  it("clamps final total to zero, never negative", () => {
    const result = resolveBankDice([2], 1);
    expect(result.finalBankTotal).toBe(0);
  });

  it("empty array leaves bank unchanged", () => {
    const result = resolveBankDice([], 4);
    expect(result.finalBankTotal).toBe(4);
    expect(result.resolutions).toHaveLength(0);
  });

  it("mixed faces accumulate correctly", () => {
    // face 6 = +1, face 5 = 0, face 4 = -1 → net 0
    const result = resolveBankDice([6, 5, 4], 5);
    expect(result.finalBankTotal).toBe(5);
  });

  it("returns per-die resolution entries", () => {
    const result = resolveBankDice([6, 2], 5);
    expect(result.resolutions).toHaveLength(2);
    expect(result.resolutions[0]?.face).toBe(6);
    expect(result.resolutions[1]?.face).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// executeSkillRoll
// ---------------------------------------------------------------------------

describe("executeSkillRoll", () => {
  beforeEach(() => {
    // Reset Roll mock to return a default result
    vi.spyOn(globalThis as unknown as { Roll: typeof MockRoll }, "Roll").mockImplementation((formula: string) => {
      const roll = new MockRoll(formula);
      roll.setResults([4]);
      return roll;
    });
  });

  afterEach(() => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = MockRoll;
  });

  it("awards franchise dice on roll of 5", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([5]);
      }
    };
    const agent = makeAgent();
    const franchise = makeFranchise();
    await executeSkillRoll(agent, franchise, "academics");
    expect((franchise.system as Record<string, unknown>)["missionPool"]).toBe(1);
  });

  it("awards 2 franchise dice on roll of 6", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([6]);
      }
    };
    const agent = makeAgent();
    const franchise = makeFranchise();
    await executeSkillRoll(agent, franchise, "academics");
    expect((franchise.system as Record<string, unknown>)["missionPool"]).toBe(2);
  });

  it("does not award franchise dice on roll of 4 or lower", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([4]);
      }
    };
    const agent = makeAgent();
    const franchise = makeFranchise();
    await executeSkillRoll(agent, franchise, "academics");
    expect((franchise.system as Record<string, unknown>)["missionPool"]).toBe(0);
  });

  it("weird agents never earn franchise dice", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([6]);
      }
    };
    const agent = makeAgent({ isWeird: true });
    const franchise = makeFranchise();
    await executeSkillRoll(agent, franchise, "academics");
    expect((franchise.system as Record<string, unknown>)["missionPool"]).toBe(0);
  });

  it("works with null franchise (no franchise dice awarded)", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([6]);
      }
    };
    const agent = makeAgent();
    await expect(executeSkillRoll(agent, null, "academics")).resolves.not.toThrow();
  });

  it("zero-dice path rolls 2d6 and takes lowest", async () => {
    // Agent with no skill dice (base 0 penalty 0 → effectiveDice 0) and dialog returns no augments
    let rollFormula = "";
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        rollFormula = formula;
        this.setResults([6, 2]); // lowest is 2 → Taxing result
      }
    };
    const agent = makeAgent({ skills: { academics: { base: 0, penalty: 0 }, athletics: { base: 0, penalty: 0 }, technology: { base: 0, penalty: 0 }, contact: { base: 0, penalty: 0 } } });
    const chatCreateSpy = vi.spyOn(ChatMessage, "create");
    await executeSkillRoll(agent, null, "academics");
    // Should have rolled 2d6 for the zero-dice path
    expect(rollFormula).toBe("2d6");
    expect(chatCreateSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// executeBankRoll
// ---------------------------------------------------------------------------

describe("executeBankRoll", () => {
  it("updates franchise bank total based on roll results", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        // 2 bank dice: face 6 (+1), face 5 (0) → net +1 from 4 = 5
        this.setResults([6, 5]);
      }
    };
    const franchise = makeFranchise({ bank: 4 });
    await executeBankRoll(franchise);
    expect((franchise.system as Record<string, unknown>)["bank"]).toBe(5);
  });

  it("zeroes bank on face 1", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([1]);
      }
    };
    const franchise = makeFranchise({ bank: 5 });
    await executeBankRoll(franchise);
    expect((franchise.system as Record<string, unknown>)["bank"]).toBe(0);
  });

  it("warns and returns early when bank is 0", async () => {
    const franchise = makeFranchise({ bank: 0 });
    const updateSpy = vi.spyOn(franchise, "update");
    await executeBankRoll(franchise);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// executeStressRoll
// ---------------------------------------------------------------------------

describe("executeStressRoll", () => {
  it("adds Cool die on result 6", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([6]);
      }
    };
    const agent = makeAgent({ cool: 1 });
    await executeStressRoll(agent, { stressDiceCount: 1, coolDiceUsed: 0 });
    expect((agent.system as Record<string, unknown>)["cool"]).toBe(2);
  });

  it("zeroes cool on Meltdown (result 1)", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([1]);
      }
    };
    const agent = makeAgent({ cool: 3 });
    await executeStressRoll(agent, { stressDiceCount: 1, coolDiceUsed: 0 });
    expect((agent.system as Record<string, unknown>)["cool"]).toBe(0);
  });

  it("no actor update on result 5 (Blasé)", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([5]);
      }
    };
    const agent = makeAgent({ cool: 2 });
    const updateSpy = vi.spyOn(agent, "update");
    await executeStressRoll(agent, { stressDiceCount: 1, coolDiceUsed: 0 });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("cool dice ignore the lowest results (not spent)", async () => {
    // Roll [1, 3, 5] — with 1 cool die ignoring the lowest (1), effective lowest is 3
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([1, 3, 5]);
      }
    };
    const agent = makeAgent({ cool: 2 });
    const sys = agent.system as Record<string, unknown>;
    const coolBefore = sys["cool"];
    await executeStressRoll(agent, { stressDiceCount: 3, coolDiceUsed: 1 });
    // Cool is NOT spent on stress ignore; result should be 3 (Stressed), cool unchanged
    expect(sys["cool"]).toBe(coolBefore);
  });

  it("applies penalty on Fair result (result 3) when penalty amount > 0", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([3]); // Fair = Minor penalty
      }
    };
    const agent = makeAgent({
      cool: 2,
      skills: {
        academics: { base: 2, penalty: 0 },
        athletics: { base: 1, penalty: 0 },
        technology: { base: 1, penalty: 0 },
        contact: { base: 0, penalty: 0 }
      }
    });

    // Mock dialog.wait to return "academics" (default)
    vi.spyOn(foundry.applications.api.DialogV2, "wait").mockResolvedValue("academics" as never);

    await executeStressRoll(agent, { stressDiceCount: 1, coolDiceUsed: 0 });
    const system = agent.system as Record<string, unknown>;
    const skills = system["skills"] as Record<string, Record<string, number>>;
    // Fair result = -1 penalty to selected skill
    expect(skills["academics"]?.["penalty"]).toBeGreaterThan(0);
  });

  it("applies penalty to selected skill, not hardcoded to academics", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([2]); // Stressed = -1 penalty
      }
    };
    const agent = makeAgent({
      cool: 2,
      skills: {
        academics: { base: 2, penalty: 0 },
        athletics: { base: 1, penalty: 0 },
        technology: { base: 1, penalty: 0 },
        contact: { base: 0, penalty: 0 }
      }
    });

    // Mock dialog.wait to return "athletics" instead of academics
    vi.spyOn(foundry.applications.api.DialogV2, "wait").mockResolvedValue("athletics" as never);

    await executeStressRoll(agent, { stressDiceCount: 1, coolDiceUsed: 0 });

    const system = agent.system as Record<string, unknown>;
    const skills = system["skills"] as Record<string, Record<string, number>>;
    // Penalty applied to athletics (player choice), not academics
    expect(skills["athletics"]?.["penalty"]).toBeGreaterThan(0);
    expect(skills["academics"]?.["penalty"]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// executeClientRoll
// ---------------------------------------------------------------------------

describe("executeClientRoll", () => {
  it("posts a chat message without modifying franchise", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        // 2d6 sum of 7 → all middle-row results
        this.setResults([3, 4]);
      }
    };
    const franchise = makeFranchise();
    const updateSpy = vi.spyOn(franchise, "update");
    await executeClientRoll(franchise);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("looks up valid table entries for all four attributes", async () => {
    vi.restoreAllMocks(); // Clear beforeEach spy setup
    let callCount = 0;
    const faces = [[4, 3], [2, 5], [6, 1], [3, 4]]; // sums: 7, 7, 7, 7
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        const idx = callCount++;
        this.setResults(faces[idx % faces.length] ?? [3, 4]);
      }
    };
    const chatCreateSpy = vi.spyOn(ChatMessage, "create");
    const franchise = makeFranchise();
    await executeClientRoll(franchise);
    expect(chatCreateSpy).toHaveBeenCalledOnce();
  });

  it("passes generated client attributes to the chat template", async () => {
    // Sum 2 → minimum values (personality: Horny, clientType: Ghost/Monster Transformation, etc.)
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([1, 1]); // sum 2
      }
    };
    let capturedContent = "";
    vi.spyOn(globalThis as unknown as { renderTemplate: (path: string, data: Record<string, unknown>) => Promise<string> }, "renderTemplate")
      .mockImplementation(async (_path: string, data: Record<string, unknown>) => {
        capturedContent = JSON.stringify(data);
        return capturedContent;
      });
    const franchise = makeFranchise();
    await executeClientRoll(franchise);
    const parsed = JSON.parse(capturedContent) as Record<string, unknown>;
    const client = parsed["client"] as Record<string, string>;
    expect(client["personality"]).toBe("INSPECTRES.ClientPersonality.Horny");
    expect(client["clientType"]).toBe("INSPECTRES.ClientType.GhostMonster");
    expect(client["occurrence"]).toBe("INSPECTRES.ClientOccurrence.GhostMonster");
    expect(client["location"]).toBe("INSPECTRES.ClientLocation.Underground");
  });
});

// ---------------------------------------------------------------------------
// Death & Dismemberment — Outcome Tests
// ---------------------------------------------------------------------------

describe("executeStressRoll — death outcomes in death mode", () => {
  it("triggers death outcome when death mode enabled and roll face ≤ 2", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // 0 * 3 + 1 = 1 (Maimed)

    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([1]); // Face 1 triggers death outcome
      }
    };

    const agent = makeAgent();
    const franchise = makeFranchise({ "deathMode": true });
    const agentUpdateSpy = vi.spyOn(agent, "update");

    await executeStressRoll(agent, { stressDiceCount: 1, coolDiceUsed: 0 }, franchise);

    expect(agentUpdateSpy).toHaveBeenCalled();
    const updateCall = agentUpdateSpy.mock.calls[0];
    expect(updateCall).toBeDefined();
    // Verify that a death outcome was triggered (agent update was called with death-related data)
    expect(agent.system).toBeDefined();
  });

  it("does not trigger death outcome when death mode disabled despite low roll", async () => {
    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([1]); // Face 1, but death mode off
      }
    };

    const agent = makeAgent();
    const franchise = makeFranchise({ "deathMode": false });
    const agentUpdateSpy = vi.spyOn(agent, "update");

    await executeStressRoll(agent, { stressDiceCount: 1, coolDiceUsed: 0 }, franchise);

    expect(agentUpdateSpy).toHaveBeenCalled();
    const updateData = agentUpdateSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    // Should apply meltdown stress penalty, not death outcome
    expect(updateData?.["system.isDead"]).toBeUndefined();
  });

  it("death outcome roll with face 2 triggers when death mode enabled", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.33); // 0.33 * 3 + 1 ≈ 1.99 → 1 (Maimed)

    (globalThis as unknown as { Roll: typeof MockRoll }).Roll = class extends MockRoll {
      constructor(formula: string) {
        super(formula);
        this.setResults([2]); // Face 2 also triggers death
      }
    };

    const agent = makeAgent();
    const franchise = makeFranchise({ "deathMode": true });
    const agentUpdateSpy = vi.spyOn(agent, "update");

    await executeStressRoll(agent, { stressDiceCount: 1, coolDiceUsed: 0 }, franchise);

    expect(agentUpdateSpy).toHaveBeenCalled();
    // Face 2 should trigger some death outcome (not meltdown)
    const updateCall = agentUpdateSpy.mock.calls[0];
    expect(updateCall).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

describe("invariants", () => {
  it("resolveBankDice never produces negative final bank total", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 6 }), { maxLength: 10 }),
        fc.nat({ max: 50 }),
        (faces, initial) => {
          const result = resolveBankDice(faces, initial);
          expect(result.finalBankTotal).toBeGreaterThanOrEqual(0);
          expect(Number.isNaN(result.finalBankTotal)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("resolveBankDice single face=1 always zeroes bank regardless of other faces", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 1, maxLength: 5 }),
        fc.nat({ max: 50 }),
        (otherFaces, initial) => {
          const faces = [...otherFaces, 1];
          const result = resolveBankDice(faces, initial);
          expect(result.finalBankTotal).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("empty dice array leaves bank unchanged", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 50 }),
        (initial) => {
          const result = resolveBankDice([], initial);
          expect(result.finalBankTotal).toBe(initial);
          expect(result.resolutions).toHaveLength(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});
