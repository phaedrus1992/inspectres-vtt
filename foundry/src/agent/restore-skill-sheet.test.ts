import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AgentSheet } from "./AgentSheet.js";
import { MockActorSheetV2 } from "../__mocks__/setup.js";
import type { AgentData } from "./agent-schema.js";

// Type assertion: MockActorSheetV2 satisfies AgentSheet interface for testing action handlers.
// The mock lacks Foundry ApplicationV2 properties unused in these tests, hence the minimal interface.
describe("AgentSheet.onRestoreSkill - Cool-to-skill recovery button", () => {
  let mockSheet: MockActorSheetV2;
  let agent: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSheet = new MockActorSheetV2();
    agent = mockSheet.actor;
    agent.system = {
      cool: 2,
      skills: {
        academics: { base: 2, penalty: 2 },
        athletics: { base: 2, penalty: 0 },
        technology: { base: 1, penalty: 0 },
        contact: { base: 2, penalty: 1 },
      },
      characteristics: [],
      description: "",
      talent: "",
      isWeird: false,
      isDead: false,
      recoveryStartedAt: 0,
      daysOutOfAction: 0,
    } as unknown as AgentData;
    Object.defineProperty(mockSheet, "isEditable", { value: true, writable: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not update actor when not editable", async () => {
    const sheet = mockSheet as unknown as AgentSheet;
    Object.defineProperty(sheet, "isEditable", { value: false, writable: true });
    vi.spyOn(agent, "update").mockResolvedValue(agent);

    const target = document.createElement("button");
    target.setAttribute("data-skill", "academics");
    await AgentSheet.onRestoreSkill.call(sheet, new Event("click"), target);

    expect(agent.update).not.toHaveBeenCalled();
  });

  it("shows warning when agent has no Cool available", async () => {
    const sheet = mockSheet as unknown as AgentSheet;
    agent.system.cool = 0;
    // Mock returns minimal Notification-like object
    const warnSpy = vi.spyOn(ui.notifications!, "warn").mockReturnValue({} as any);

    const target = document.createElement("button");
    target.setAttribute("data-skill", "academics");
    await AgentSheet.onRestoreSkill.call(sheet, new Event("click"), target);

    expect(warnSpy).toHaveBeenCalled();
  });

  it("logs error when skill attribute missing", async () => {
    const sheet = mockSheet as unknown as AgentSheet;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const target = document.createElement("button");
    // missing data-skill attribute
    await AgentSheet.onRestoreSkill.call(sheet, new Event("click"), target);

    expect(errorSpy).toHaveBeenCalledWith(
      "onRestoreSkill: missing or invalid data-skill attribute",
      expect.any(Object),
    );
  });

  it("opens restore skill dialog with max Cool value", async () => {
    const sheet = mockSheet as unknown as AgentSheet;
    const dialogSpy = vi.spyOn(foundry.applications.api.DialogV2, "wait").mockResolvedValue(null);

    const target = document.createElement("button");
    target.setAttribute("data-skill", "academics");
    await AgentSheet.onRestoreSkill.call(sheet, new Event("click"), target);

    expect(dialogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        window: expect.objectContaining({
          title: expect.any(String),
        }),
        content: expect.stringContaining("max=\"2\""), // max Cool is 2
      }),
    );
  });

  it("calls executeSkillRecovery when dialog confirms restore", async () => {
    const sheet = mockSheet as unknown as AgentSheet;
    vi.spyOn(agent, "update").mockResolvedValue(agent);

    vi.spyOn(foundry.applications.api.DialogV2, "wait").mockResolvedValue({
      cool: 1,
    });

    const target = document.createElement("button");
    target.setAttribute("data-skill", "academics");
    // Handler calls executeSkillRecovery which calls agent.update
    // Fire the handler and verify update is called (which executeSkillRecovery does)
    await AgentSheet.onRestoreSkill.call(sheet, new Event("click"), target);

    // Verify the update was called (indicates executeSkillRecovery succeeded)
    expect(agent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        [`system.skills.academics.penalty`]: 1, // penalty reduced from 2 to 1
        "system.cool": 1, // cool reduced from 2 to 1
      }),
    );
  });

  it("does nothing when dialog is cancelled", async () => {
    const sheet = mockSheet as unknown as AgentSheet;
    vi.spyOn(agent, "update").mockResolvedValue(agent);

    vi.spyOn(foundry.applications.api.DialogV2, "wait").mockResolvedValue("cancel");

    const target = document.createElement("button");
    target.setAttribute("data-skill", "academics");
    await AgentSheet.onRestoreSkill.call(sheet, new Event("click"), target);

    expect(agent.update).not.toHaveBeenCalled();
  });
});
