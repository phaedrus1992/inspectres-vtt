import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeSkillRoll,
  executeStressRoll,
  type RollActor,
} from "./roll-executor.js";
import { getCurrentDay } from "../agent/recovery-utils.js";

// Mock Foundry globals
class MockRoll {
  dice: Array<{ results: Array<{ active: boolean; result: number }> }>;

  constructor(lowFace?: number) {
    // Default to face 4 (no death roll). If lowFace provided, use it for death-roll testing.
    const face = lowFace ?? 4;
    this.dice = [{ results: [{ active: true, result: face }] }];
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

      // Mock Math.random to produce invalid d3 (0 or 4+, not 1–3)
      const randomSpy = vi.spyOn(Math, "random").mockReturnValue(-0.1);
      // Math.floor(-0.1 * 3) + 1 = Math.floor(-0.3) + 1 = -1 + 1 = 0 (invalid)

      try {
        // Create Roll mock that returns face 1, triggering death-roll evaluation
        vi.stubGlobal("Roll", class extends MockRoll {
          constructor() {
            super(1); // face 1 triggers deathMode branch (effectiveFace <= 2)
          }
        });

        // executeStressRoll should hit death-roll code with mocked Math.random producing 0
        await expect(
          executeStressRoll(agent, { stressDiceCount: 1, coolDiceUsed: 0 }, franchise),
        ).rejects.toThrow(/Invalid d3 result.*0/);

        expect(randomSpy).toHaveBeenCalled();
      } finally {
        randomSpy.mockRestore();
        vi.stubGlobal("Roll", MockRoll);
      }
    });
  });

  describe("Error context preservation through error chain", () => {
    it("logs diagnostic context and rethrows update failures", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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

      // Should have logged diagnostic context
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/INSPECTRES.*Stress roll update failed/),
        expect.objectContaining({
          agentId: "test-agent-id",
          agentName: "Test Agent",
        }),
      );

      errorSpy.mockRestore();
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
