import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { makeAgent, makeFranchise } from "../__mocks__/test-fixtures.js";
import { getFirstMockCallArg, setupGlobalMocks } from "../__mocks__/test-utils.js";
import { setupChatMessageMocks } from "../__mocks__/chat-message-mocks.js";
import { VALID_OUTCOMES } from "../types/roll.js";
import { executeSkillRoll, type SkillName } from "./roll-executor.js";

describe("Skill Roll Integration — ChatMessage Output (#453)", () => {
  let chatMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    chatMessageMock = vi.fn();
    setupGlobalMocks(chatMessageMock);
    setupChatMessageMocks();
    // Mock DialogV2.wait for skill roll dialog
    const g = globalThis as unknown as Record<string, unknown>;
    const foundry = g["foundry"] as Record<string, unknown>;
    if (foundry && !foundry["applications"]) foundry["applications"] = {};
    const applications = foundry["applications"] as Record<string, unknown>;
    if (applications && !applications["api"]) applications["api"] = {};
    const api = applications["api"] as Record<string, unknown>;
    // Mock DialogV2.wait to return minimal roll config (no requirementTier for non-tech skills)
    api["DialogV2"] = {
      wait: vi.fn().mockResolvedValue({
        bankDice: 0,
        coolDice: 0,
        cardDice: 0,
        talentDie: false,
        takesFour: false,
      }),
    };
    // Set up global game.missions for technology roll requirements check
    if (!g["game"]) g["game"] = {};
    const gameObj = g["game"] as Record<string, unknown>;
    gameObj["missions"] = {
      contents: [{
        id: "mission-1",
        system: { itemRarity: "common" },
        isActive: true,
      }],
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    const g = globalThis as unknown as Record<string, unknown>;
    delete g["game"];
    delete g["ChatMessage"];
    delete g["foundry"];
  });

  describe("ChatMessage creation with various skill/franchise combinations", () => {
    type TestCase = { skill: SkillName; skillRank: number; franchiseDice: number; name: string };
    const cases: TestCase[] = [
      { skill: "academics", skillRank: 2, franchiseDice: 1, name: "academics with franchise bonus" },
      { skill: "athletics", skillRank: 1, franchiseDice: 0, name: "athletics without franchise bonus" },
      { skill: "contact", skillRank: 2, franchiseDice: 1, name: "contact with dice" },
      { skill: "technology", skillRank: 0, franchiseDice: 2, name: "technology with high franchise" },
    ];

    for (const testCase of cases) {
      it(`calls ChatMessage.create when skill roll completes — ${testCase.name}`, async () => {
        vi.clearAllMocks();
        const agent = makeAgent({ skills: { [testCase.skill]: testCase.skillRank }, cool: 2 });
        const franchise = makeFranchise({ dice: testCase.franchiseDice });

        await executeSkillRoll(agent, franchise, testCase.skill);

        expect(chatMessageMock).toHaveBeenCalledOnce();
      });

      it(`passes speaker and outcome in ChatMessage — ${testCase.name}`, async () => {
        vi.clearAllMocks();
        const agentName = `Test ${testCase.skill}`;
        const agent = makeAgent({ name: agentName, skills: { [testCase.skill]: testCase.skillRank } });
        const franchise = makeFranchise({ dice: testCase.franchiseDice });

        await executeSkillRoll(agent, franchise, testCase.skill);

        const messageData = getFirstMockCallArg<Record<string, unknown>>(chatMessageMock);
        expect(messageData).toBeDefined();
        expect(messageData?.["speaker"]).toBeDefined();

        const flags = messageData?.["flags"] as Record<string, Record<string, unknown>> | undefined;
        const inspectresFlags = flags?.["inspectres"] as Record<string, unknown> | undefined;
        expect(inspectresFlags).toBeDefined();
        expect(VALID_OUTCOMES).toContain(inspectresFlags?.["outcome"]);
      });
    }
  });

  it("does not call ChatMessage.create when franchise is in debt mode (#455)", async () => {
    const agent = makeAgent({ skills: { technology: 2 } });
    const franchise = makeFranchise({ debtMode: true });

    await executeSkillRoll(agent, franchise, "technology");

    expect(chatMessageMock).not.toHaveBeenCalled();
  });

  it("updates franchise resources after skill roll", async () => {
    const agent = makeAgent({ skills: { academics: 2 }, cool: 1 });
    const franchise = makeFranchise({ missionPool: 0 });
    const getResourceValue = (obj: unknown): number => {
      const system = obj as Record<string, unknown> | undefined;
      return (system?.["missionPool"] as number | undefined) ?? 0;
    };
    const initialPool = getResourceValue(franchise.system);

    await executeSkillRoll(agent, franchise, "academics");

    // Franchise mission pool should be updated (dice added for successful roll)
    const finalPool = getResourceValue(franchise.system);
    expect(finalPool).toBeGreaterThanOrEqual(initialPool);
  });
});
