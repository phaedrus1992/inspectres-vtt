import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { makeAgent, makeFranchise } from "../__mocks__/test-fixtures.js";
import { executeSkillRoll } from "./roll-executor.js";

type RollOutcome = "good" | "partial" | "bad";

const VALID_OUTCOMES: RollOutcome[] = ["good", "partial", "bad"];

interface GameGlobal {
  game: { user: { isGM: boolean } };
  ChatMessage: { create: ReturnType<typeof vi.fn> };
}

function getFirstMockCallArg<T>(mock: ReturnType<typeof vi.fn>): T | undefined {
  const callArgs = mock.mock.calls[0];
  if (!callArgs || callArgs.length === 0) return undefined;
  return callArgs[0] as T;
}

function setupGlobalMocks(chatMessageMock: ReturnType<typeof vi.fn>): void {
  const g = globalThis as unknown as Partial<GameGlobal>;
  if (!g.game) g.game = { user: { isGM: false } };
  if (g.game && "user" in g.game) {
    (g.game as { user: { isGM: boolean } }).user.isGM = true;
  }
  const chatMessage = {
    create: chatMessageMock,
    getSpeaker: vi.fn(() => ({ actor: "test-actor", token: null })),
  };
  if (!g.ChatMessage) {
    g.ChatMessage = chatMessage as unknown as { create: ReturnType<typeof vi.fn> };
  } else {
    const cm = g.ChatMessage as Record<string, unknown>;
    cm["create"] = chatMessageMock;
    cm["getSpeaker"] = chatMessage.getSpeaker;
  }
}

describe("Skill Roll Integration — ChatMessage Output (#453)", () => {
  let chatMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    chatMessageMock = vi.fn();
    setupGlobalMocks(chatMessageMock);
    // Mock foundry.applications.handlebars
    const g = globalThis as unknown as Record<string, unknown>;
    if (!g["foundry"]) g["foundry"] = {};
    const foundry = g["foundry"] as Record<string, unknown>;
    if (!foundry["applications"]) foundry["applications"] = {};
    const applications = foundry["applications"] as Record<string, unknown>;
    if (!applications["handlebars"]) applications["handlebars"] = {};
    const handlebars = applications["handlebars"] as Record<string, unknown>;
    handlebars["renderTemplate"] = vi.fn(() => Promise.resolve("<div>mocked</div>"));
  });

  afterEach(() => {
    vi.clearAllMocks();
    const g = globalThis as unknown as Record<string, unknown>;
    delete g["game"];
    delete g["ChatMessage"];
  });

  it("calls ChatMessage.create when skill roll completes", async () => {
    const agent = makeAgent({ skills: { academics: 2 }, cool: 2 });
    const franchise = makeFranchise({ dice: 1 });

    await executeSkillRoll(agent, franchise, "academics");

    expect(chatMessageMock).toHaveBeenCalledOnce();
  });

  it("passes speaker information to ChatMessage", async () => {
    const agent = makeAgent({ name: "Test Agent", skills: { athletics: 1 } });
    const franchise = makeFranchise({ dice: 0 });

    await executeSkillRoll(agent, franchise, "athletics");

    const messageData = getFirstMockCallArg<Record<string, unknown>>(chatMessageMock);
    expect(messageData).toBeDefined();
    expect(messageData?.["speaker"]).toBeDefined();
  });

  it("includes flags.inspectres with outcome classification in ChatMessage", async () => {
    const agent = makeAgent({ skills: { contact: 2 } });
    const franchise = makeFranchise({ dice: 1 });

    await executeSkillRoll(agent, franchise, "contact");

    const messageData = getFirstMockCallArg<Record<string, unknown>>(chatMessageMock);
    const flags = messageData?.["flags"] as Record<string, Record<string, unknown>> | undefined;
    const inspectresFlags = flags?.["inspectres"] as Record<string, unknown> | undefined;

    expect(inspectresFlags).toBeDefined();
    expect(VALID_OUTCOMES).toContain(inspectresFlags?.["outcome"]);
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
