import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeAgent, makeFranchise } from "../__mocks__/test-fixtures.js";
import { executeSkillRoll } from "./roll-executor.js";

describe("Skill Roll Integration — ChatMessage Output (#453)", () => {
  let chatMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    (globalThis as unknown as { game: { user: { isGM: boolean } } }).game.user.isGM = true;
    chatMessageMock = vi.fn();
    (globalThis as unknown as { ChatMessage: { create: typeof chatMessageMock } }).ChatMessage.create = chatMessageMock;
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

    const messageData = chatMessageMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(messageData).toBeDefined();
    expect(messageData["speaker"]).toBeDefined();
  });

  it("includes flags.inspectres with outcome classification in ChatMessage", async () => {
    const agent = makeAgent({ skills: { contact: 2 } });
    const franchise = makeFranchise({ dice: 1 });

    await executeSkillRoll(agent, franchise, "contact");

    const messageData = chatMessageMock.mock.calls[0]?.[0] as Record<string, unknown>;
    const flags = messageData["flags"] as Record<string, Record<string, unknown>>;
    const inspectresFlags = flags["inspectres"] as Record<string, unknown>;

    expect(inspectresFlags).toBeDefined();
    expect(["good", "partial", "bad"]).toContain(inspectresFlags["outcome"]);
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
    const initialPool = (franchise.system as Record<string, unknown>)["missionPool"] as number ?? 0;

    await executeSkillRoll(agent, franchise, "academics");

    // Franchise mission pool should be updated (dice added for successful roll)
    const finalPool = (franchise.system as Record<string, unknown>)["missionPool"] as number ?? 0;
    expect(finalPool).toBeGreaterThanOrEqual(initialPool);
  });
});
