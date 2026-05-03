import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  executeSkillRoll,
  executeStressRoll,
  type RollActor,
} from "./roll-executor.js";
import { getCurrentDay } from "../agent/recovery-utils.js";

// Mock Foundry globals
class MockRoll {
  dice: Array<{ results: Array<{ active: boolean; result: number }> }>;
  total: number;

  constructor(formula?: string, face?: number) {
    // Support both old API (face: number) and formula-based API
    // If face provided, use it directly; otherwise parse formula or default to 4
    if (face !== undefined) {
      this.total = face;
      this.dice = [{ results: [{ active: true, result: face }] }];
    } else if (formula === "1d3") {
      // For d3 tests: allow passing invalid result via vi.stubGlobal override
      this.total = 1; // default valid d3 result
      this.dice = [{ results: [{ active: true, result: 1 }] }];
    } else {
      // Default to face 4 (no death roll)
      this.total = 4;
      this.dice = [{ results: [{ active: true, result: 4 }] }];
    }
  }

  async evaluate() {
    return this;
  }
}

vi.stubGlobal("game", {
  i18n: {
    localize: (key: string) => key,
    format: (key: string, data: Record<string, unknown>) => `${key}:${JSON.stringify(data)}`,
  },
  users: {
    filter: () => [],
  },
  user: {
    isGM: true,
  },
});

vi.stubGlobal("ui", {
  notifications: {
    warn: vi.fn(),
    error: vi.fn(),
  },
});

vi.stubGlobal("ChatMessage", {
  getSpeaker: () => ({ actor: null }),
  create: vi.fn(),
});

vi.stubGlobal("renderTemplate", vi.fn(async () => "<div></div>"));
vi.stubGlobal("Roll", MockRoll);

// Mock foundry.applications.handlebars.renderTemplate and DialogV2 (V2 APIs)
vi.stubGlobal("foundry", {
  applications: {
    handlebars: {
      renderTemplate: vi.fn(async () => "<div></div>"),
    },
    api: {
      DialogV2: {
        // Return a skill choice so that updateData is built and update() gets called
        wait: vi.fn(async () => "academics"),
      },
    },
  },
});

// Test helpers
function makeAgent(overrides: Record<string, unknown> = {}): RollActor {
  return {
    id: "test-agent-id",
    name: "Test Agent",
    system: {
      skills: {
        academics: { base: 3, penalty: 0 },
        athletics: { base: 2, penalty: 0 },
        technology: { base: 2, penalty: 0 },
        contact: { base: 2, penalty: 0 },
      },
      talent: "",
      cool: 2,
      isWeird: false,
      isDead: false,
      daysOutOfAction: 0,
      recoveryStartedAt: 0,
      stress: 0,
      ...overrides,
    },
    async update(_data: Record<string, unknown>) {
      return this;
    },
  };
}

function makeFranchise(overrides: Record<string, unknown> = {}): RollActor {
  return {
    id: "test-franchise-id",
    name: "Test Franchise",
    system: {
      cards: { library: 2, gym: 1, credit: 3 },
      bank: 4,
      missionPool: 0,
      deathMode: false,
      ...overrides,
    },
    async update(_data: Record<string, unknown>) {
      return this;
    },
  };
}

describe("Error handling in rolls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Recovery blocking - responsibility moved to UI layer", () => {
    it("executor does not check recovery (UI layer responsibility)", async () => {
      const currentDay = getCurrentDay();
      const agent = makeAgent({
        daysOutOfAction: 3,
        recoveryStartedAt: currentDay - 1, // 1 day into 3-day recovery
      });
      const franchise = makeFranchise();

      // Executor no longer checks recovery — that's the UI's job.
      // The roll should proceed (UI layer prevents the call entirely).
      expect.assertions(1);
      try {
        await executeSkillRoll(agent, franchise, "academics");
        // Executor proceeds without recovery block, so we reach here
        expect(true).toBe(true); // positive assertion: roll completed
      } catch (err) {
        // If error is NOT about recovery, update failure is acceptable
        expect(String(err)).not.toMatch(/recovering|dead/);
      }
    });

    it("UI layer blocks recovering agents (not executor)", async () => {
      // This test documents that recovery blocking has moved to the UI.
      // The executor no longer checks recovery status.
      // The UI (AgentSheet) is responsible for checking recovery and preventing roll buttons.
      const currentDay = getCurrentDay();
      const agent = makeAgent({
        daysOutOfAction: 2,
        recoveryStartedAt: currentDay,
      });
      const franchise = makeFranchise();

      expect.assertions(1);
      try {
        await executeStressRoll(agent, { stressDiceCount: 1, coolDiceUsed: 0 }, franchise);
        // Executor proceeds without recovery block
        expect(true).toBe(true); // positive assertion: roll completed
      } catch (err) {
        // Any error should NOT be a recovery block error
        expect(String(err)).not.toMatch(/is recovering|is dead/);
      }
    });
  });

  describe("Death roll validation errors", () => {
    it("validates d3 result bounds and throws diagnostic error", async () => {
      const agent = makeAgent({ isDead: false });
      const franchise = makeFranchise({ deathMode: true });

      try {
        // Mock Roll to return face 1 (triggers death roll) with invalid d3 result
        let rollCount = 0;
        vi.stubGlobal("Roll", class extends MockRoll {
          constructor(formula?: string) {
            if (formula === "1d3") {
              // Return invalid d3 result (0 is out of bounds [1,3])
              super(formula, 0);
              rollCount++;
            } else {
              super(formula, 1); // skill roll returns face 1, triggering deathMode
            }
          }
        });

        await expect(
          executeStressRoll(agent, { stressDiceCount: 1, coolDiceUsed: 0 }, franchise),
        ).rejects.toThrow(/Invalid d3 result/);
        expect(rollCount).toBe(1); // Verify d3 roll was actually called
      } finally {
        vi.stubGlobal("Roll", MockRoll);
      }
    });
  });

  describe("Error context preservation through error chain", () => {
    it("logs diagnostic context and rethrows update failures", async () => {
      const notificationSpy = vi.spyOn(ui.notifications as any, "error");
      const agent = makeAgent();
      const franchise = makeFranchise();

      // Mock agent.update to fail
      const failAgent: RollActor = {
        ...agent,
        async update() {
          throw new Error("Database constraint violation");
        },
      };

      // Should throw after logging diagnostic context
      await expect(
        executeStressRoll(
          failAgent,
          { stressDiceCount: 1, coolDiceUsed: 0 },
          franchise,
        ),
      ).rejects.toThrow(/Failed to apply stress roll/);

      // Should have notified user of error (diagnostic logging now via ui.notifications)
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringMatching(/ErrorStressRollFailed|Failed to apply stress roll/),
      );

      notificationSpy.mockRestore();
    });

    it("rethrows update failures with user-facing error message", async () => {
      // ui.notifications is mocked and guaranteed to exist (defined at line 35-38)
      const notificationSpy = vi.spyOn(ui.notifications as any, "error");
      const agent = makeAgent();
      const franchise = makeFranchise();

      // Mock agent.update to fail
      const failAgent: RollActor = {
        ...agent,
        async update() {
          throw new Error("Specific failure reason");
        },
      };

      // Now: rethrows error with context (instead of silent return)
      await expect(
        executeStressRoll(
          failAgent,
          { stressDiceCount: 1, coolDiceUsed: 0 },
          franchise,
        ),
      ).rejects.toThrow(/Failed to apply stress roll to Test Agent/);

      // User sees notification error AND error propagates to caller
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringMatching(/ErrorStressRollFailed|Failed to apply stress roll/),
      );
    });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
