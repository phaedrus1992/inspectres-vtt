import { describe, it, expect, vi } from "vitest";
import { autoClearRecoveredAgents } from "./recovery-utils.js";
import { type AgentData } from "./agent-schema.js";

function makeAgent(overrides: Partial<AgentData> = {}): AgentData {
  return {
    description: "",
    skills: {
      academics: { base: 0, penalty: 0 },
      athletics: { base: 0, penalty: 0 },
      technology: { base: 0, penalty: 0 },
      contact: { base: 0, penalty: 0 },
    },
    talent: "",
    cool: 0,
    isWeird: false,
    characteristics: [],
    missionPool: 0,
    stress: 0,
    isDead: false,
    daysOutOfAction: 0,
    recoveryStartedAt: 0,
    ...overrides,
  };
}

interface TestActor {
  id: string;
  name: string;
  type: string;
  system: AgentData;
  update: ReturnType<typeof vi.fn>;
}

function makeTestActor(id: string, system: Partial<AgentData> = {}): TestActor {
  return {
    id,
    name: `Agent ${id}`,
    type: "agent",
    system: makeAgent(system),
    update: vi.fn(),
  };
}

describe("autoClearRecoveredAgents", () => {
  function setupGameMock(actors: TestActor[], isGM: boolean = true) {
    const gameObj = globalThis as Record<string, unknown>;
    gameObj["game"] = {
      user: { isGM },
      actors: {
        *[Symbol.iterator]() {
          for (const actor of actors) {
            yield actor;
          }
        },
        get: (id: string) => actors.find((a) => a.id === id) ?? null,
      },
    };
  }

  it("calls actor.update for agents with expired recovery", async () => {
    const agent = makeTestActor("agent-1", { daysOutOfAction: 3, recoveryStartedAt: 5 });
    setupGameMock([agent], true);

    await autoClearRecoveredAgents(8);

    expect(agent.update).toHaveBeenCalledWith({
      "system.daysOutOfAction": 0,
      "system.recoveryStartedAt": 0,
    });
  });

  it("skips agents that are still recovering", async () => {
    const agent = makeTestActor("agent-1", { daysOutOfAction: 3, recoveryStartedAt: 5 });
    setupGameMock([agent], true);

    await autoClearRecoveredAgents(7);

    expect(agent.update).not.toHaveBeenCalled();
  });

  it("skips dead agents", async () => {
    const agent = makeTestActor("agent-1", { isDead: true, daysOutOfAction: 3, recoveryStartedAt: 5 });
    setupGameMock([agent], true);

    await autoClearRecoveredAgents(8);

    expect(agent.update).not.toHaveBeenCalled();
  });

  it("skips uninjured agents", async () => {
    const agent = makeTestActor("agent-1", { daysOutOfAction: 0, recoveryStartedAt: 0 });
    setupGameMock([agent], true);

    await autoClearRecoveredAgents(8);

    expect(agent.update).not.toHaveBeenCalled();
  });

  it("returns early if current user is not GM", async () => {
    const agent = makeTestActor("agent-1", { daysOutOfAction: 3, recoveryStartedAt: 5 });
    setupGameMock([agent], false);

    await autoClearRecoveredAgents(8);

    expect(agent.update).not.toHaveBeenCalled();
  });

  it("handles multiple agents and clears all that are ready", async () => {
    const agent1 = makeTestActor("agent-1", { daysOutOfAction: 3, recoveryStartedAt: 5 });
    const agent2 = makeTestActor("agent-2", { daysOutOfAction: 2, recoveryStartedAt: 6 });
    const agent3 = makeTestActor("agent-3", { daysOutOfAction: 0, recoveryStartedAt: 0 });

    setupGameMock([agent1, agent2, agent3], true);

    await autoClearRecoveredAgents(8);

    expect(agent1.update).toHaveBeenCalledWith({
      "system.daysOutOfAction": 0,
      "system.recoveryStartedAt": 0,
    });
    expect(agent2.update).toHaveBeenCalledWith({
      "system.daysOutOfAction": 0,
      "system.recoveryStartedAt": 0,
    });
    expect(agent3.update).not.toHaveBeenCalled();
  });
});
