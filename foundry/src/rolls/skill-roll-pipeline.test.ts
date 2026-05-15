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

    // Setup all mocks before executing the pipeline
    const dialogMock = vi.fn().mockResolvedValue({
      diceCount: 2,
      rollType: "cool",
    });
    const createMessageMock = vi.fn().mockResolvedValue({ id: "msg-1" });
    const rollConstructor = vi.fn(function (this: unknown) {
      return {
        total: 5,
        evaluate: vi.fn().mockResolvedValue(this),
      };
    });

    // Assign all mocks to globalThis before calling the function
    const g = globalThis as unknown as Record<string, unknown>;
    g["foundry"] = {
      applications: {
        api: {
          DialogV2: {
            wait: dialogMock,
          },
        },
      },
    };
    g["ChatMessage"] = { create: createMessageMock };
    g["Roll"] = rollConstructor;

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

  it("passes a well-formed config to DialogV2.wait", async () => {
    const agent = makeAgent({ cool: 3 });

    const dialogMock = vi.fn().mockResolvedValue({ diceCount: 2 });
    const createMessageMock = vi.fn().mockResolvedValue({ id: "msg-1" });
    const rollConstructor = vi.fn(function (this: unknown) {
      return { total: 5, evaluate: vi.fn().mockResolvedValue(this) };
    });

    const g = globalThis as unknown as Record<string, unknown>;
    g["foundry"] = {
      applications: { api: { DialogV2: { wait: dialogMock } } },
    };
    g["ChatMessage"] = { create: createMessageMock };
    g["Roll"] = rollConstructor;

    await executeSkillRoll(agent, "cool");

    expect(dialogMock).toHaveBeenCalledTimes(1);
    const config = dialogMock.mock.calls[0]?.[0] as Record<string, unknown>;

    // Window title includes the skill name passed to executeSkillRoll
    const windowConfig = config["window"] as Record<string, unknown>;
    expect(windowConfig["title"]).toBe("Roll cool");

    // Content is a string containing the diceCount input control
    expect(typeof config["content"]).toBe("string");
    expect(config["content"] as string).toContain('name="diceCount"');

    // render must be wired up to stop submit propagation (v14 /join bug guard)
    expect(typeof config["render"]).toBe("function");

    // buttons array with a single "roll" action that returns form data
    const buttons = config["buttons"] as Array<Record<string, unknown>>;
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.["action"]).toBe("roll");
    expect(buttons[0]?.["label"]).toBe("Roll");
    expect(typeof buttons[0]?.["callback"]).toBe("function");
  });
});
