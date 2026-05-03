import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeAgent } from "../__mocks__/test-fixtures.js";
import { executeSkillRoll } from "./skill-roll-pipeline.js";

describe("Skill roll pipeline", () => {
  beforeEach(() => {
    // Mock foundry.applications.api.DialogV2 for roll prompt
    const globalAny = globalThis as unknown as Record<string, unknown>;
    globalAny["foundry"] = {
      applications: {
        api: {
          DialogV2: {
            wait: vi.fn(),
          },
        },
      },
    };
  });

  it("executes a complete skill roll from actor to chat message", async () => {
    const agent = makeAgent({ cool: 3 });
    const globalAny = (globalThis as unknown as Record<string, unknown>)[
      "foundry"
    ] as unknown as Record<string, unknown>;
    const foundryObj = globalAny ?? ({} as Record<string, unknown>);

    // Mock the dialog returning roll configuration
    const dialogMock = vi.fn().mockResolvedValue({
      diceCount: 2,
      rollType: "cool",
    });
    const applications = foundryObj["applications"] as Record<string, unknown>;
    const api = applications["api"] as Record<string, unknown>;
    const dialogV2 = api["DialogV2"] as Record<string, unknown>;
    dialogV2["wait"] = dialogMock;

    // Mock chat message creation
    const createMessageMock = vi.fn().mockResolvedValue({ id: "msg-1" });
    globalAny["ChatMessage"] = {
      create: createMessageMock,
    };

    // Mock Roll class
    globalAny["Roll"] = vi.fn(function (this: unknown) {
      return {
        total: 5,
        evaluate: vi.fn().mockResolvedValue(this),
      };
    });

    // Execute the skill roll pipeline
    await executeSkillRoll(agent, "cool");

    // Verify dialog was opened for configuration
    expect(dialogMock).toHaveBeenCalled();

    // Verify chat message was created with roll outcome
    expect(createMessageMock).toHaveBeenCalled();
    const callArgs = createMessageMock.mock.calls[0] as unknown[];
    const messageData = callArgs[0] as Record<string, unknown>;
    expect(messageData["flags"]).toBeDefined();
    const flags = messageData["flags"] as Record<string, unknown>;
    expect((flags["inspectres"] as Record<string, unknown>)["outcome"]).toMatch(
      /good|partial|bad/,
    );
  });
});
