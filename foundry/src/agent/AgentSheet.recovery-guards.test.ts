import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockActorSheetV2, Hooks } from "../__mocks__/setup.js";
import { AgentSheet } from "./AgentSheet.js";
import type { AgentData } from "./agent-schema.js";

function makeAgentSheetWithRecovery(
  recoveryStatus: "active" | "recovering" | "returned" | "dead",
  isEditable = true,
) {
  const mockSheet = new MockActorSheetV2();
  const actor = mockSheet.actor;

  // Setup agent system data with recovery state
  const system: AgentData = {
    description: "",
    skills: {
      academics: { base: 2, penalty: 0 },
      athletics: { base: 1, penalty: 0 },
      technology: { base: 3, penalty: 0 },
      contact: { base: 0, penalty: 0 },
    },
    talent: "",
    cool: 1,
    isWeird: false,
    power: null,
    characteristics: [],
    isDead: recoveryStatus === "dead",
    daysOutOfAction: recoveryStatus === "recovering" ? 20 : 0,
    recoveryStartedAt: recoveryStatus === "recovering" ? 10 : 0,
    stress: 0,
  };

  // Type narrowing: test fixture implements minimal RollActor interface needed for recovery guards.
  // Full Foundry Actor has 130+ properties unused in this test context.
  actor.system = system as unknown as Record<string, unknown>;
  mockSheet.isEditable = isEditable;
  vi.spyOn(actor, "update").mockResolvedValue(actor);

  return { sheet: mockSheet as unknown as AgentSheet, actor };
}

describe("AgentSheet — Recovery state guards", () => {
  beforeEach(() => {
    Hooks.clearAll();
    vi.clearAllMocks();
    // Mock game.settings.get() and game.i18n globally for all tests
    const mockSettings = {
      get: vi.fn((namespace: string, key: string) => {
        if (namespace === "inspectres" && key === "currentDay") return 15;
        return undefined;
      }),
    };
    const mockI18n = {
      localize: vi.fn((key: string) => key),
    };
    const gameGlobal = globalThis as unknown as { game: { settings: unknown; i18n: unknown } };
    gameGlobal.game = {
      settings: mockSettings as unknown,
      i18n: mockI18n as unknown,
    } as unknown as { settings: unknown; i18n: unknown };
  });

  afterEach(() => {
    Hooks.clearAll();
  });

  describe("onSkillStep — recovery blocking", () => {
    it("allows skill increase when agent is active", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("active");
      const target = document.createElement("button");
      target.setAttribute("data-action", "skillIncrease");
      target.setAttribute("data-skill", "academics");

      await AgentSheet.onSkillStep.call(sheet, new Event("click"), target);

      expect(actor.update).toHaveBeenCalled();
    });

    it("blocks skill increase when agent is recovering", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("recovering");
      const target = document.createElement("button");
      target.setAttribute("data-action", "skillIncrease");
      target.setAttribute("data-skill", "academics");

      await AgentSheet.onSkillStep.call(sheet, new Event("click"), target);

      expect(actor.update).not.toHaveBeenCalled();
    });

    it("blocks skill increase when agent is dead", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("dead");
      const target = document.createElement("button");
      target.setAttribute("data-action", "skillIncrease");
      target.setAttribute("data-skill", "academics");

      await AgentSheet.onSkillStep.call(sheet, new Event("click"), target);

      expect(actor.update).not.toHaveBeenCalled();
    });

    it("blocks skill decrease when agent is recovering", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("recovering");
      const target = document.createElement("button");
      target.setAttribute("data-action", "skillDecrease");
      target.setAttribute("data-skill", "academics");

      await AgentSheet.onSkillStep.call(sheet, new Event("click"), target);

      expect(actor.update).not.toHaveBeenCalled();
    });
  });

  describe("onToggleCool — recovery blocking", () => {
    it("allows cool toggle when agent is active", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("active");
      const target = document.createElement("button");
      target.setAttribute("data-value", "1");

      await AgentSheet.onToggleCool.call(sheet, new Event("click"), target);

      expect(actor.update).toHaveBeenCalled();
    });

    it("blocks cool toggle when agent is recovering", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("recovering");
      const target = document.createElement("button");
      target.setAttribute("data-value", "1");

      await AgentSheet.onToggleCool.call(sheet, new Event("click"), target);

      expect(actor.update).not.toHaveBeenCalled();
    });

    it("blocks cool toggle when agent is dead", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("dead");
      const target = document.createElement("button");
      target.setAttribute("data-value", "1");

      await AgentSheet.onToggleCool.call(sheet, new Event("click"), target);

      expect(actor.update).not.toHaveBeenCalled();
    });
  });

  describe("onAddCharacteristic — recovery blocking", () => {
    it("allows adding characteristic when agent is active", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("active");

      await AgentSheet.onAddCharacteristic.call(
        sheet,
        new Event("click"),
        document.createElement("button"),
      );

      expect(actor.update).toHaveBeenCalled();
    });

    it("blocks adding characteristic when agent is recovering", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("recovering");

      await AgentSheet.onAddCharacteristic.call(
        sheet,
        new Event("click"),
        document.createElement("button"),
      );

      expect(actor.update).not.toHaveBeenCalled();
    });

    it("blocks adding characteristic when agent is dead", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("dead");

      await AgentSheet.onAddCharacteristic.call(
        sheet,
        new Event("click"),
        document.createElement("button"),
      );

      expect(actor.update).not.toHaveBeenCalled();
    });
  });

  describe("onRemoveCharacteristic — recovery blocking", () => {
    it("allows removing characteristic when agent is active", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("active");
      const target = document.createElement("button");
      target.setAttribute("data-idx", "0");

      await AgentSheet.onRemoveCharacteristic.call(
        sheet,
        new Event("click"),
        target,
      );

      expect(actor.update).toHaveBeenCalled();
    });

    it("blocks removing characteristic when agent is recovering", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("recovering");
      const target = document.createElement("button");
      target.setAttribute("data-idx", "0");

      await AgentSheet.onRemoveCharacteristic.call(
        sheet,
        new Event("click"),
        target,
      );

      expect(actor.update).not.toHaveBeenCalled();
    });
  });

  describe("not editable guard", () => {
    it("does not update when sheet is not editable (active agent)", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("active", false);
      const target = document.createElement("button");
      target.setAttribute("data-action", "skillIncrease");
      target.setAttribute("data-skill", "academics");

      await AgentSheet.onSkillStep.call(sheet, new Event("click"), target);

      expect(actor.update).not.toHaveBeenCalled();
    });
  });

  describe("recovery state guard interaction", () => {
    it("recovery block takes precedence over editable state", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("recovering", true);
      const target = document.createElement("button");
      target.setAttribute("data-action", "skillIncrease");
      target.setAttribute("data-skill", "academics");

      await AgentSheet.onSkillStep.call(sheet, new Event("click"), target);

      expect(actor.update).not.toHaveBeenCalled();
    });

    it("allows update when agent returned to active", async () => {
      const { sheet, actor } = makeAgentSheetWithRecovery("returned");
      const target = document.createElement("button");
      target.setAttribute("data-action", "skillIncrease");
      target.setAttribute("data-skill", "academics");

      await AgentSheet.onSkillStep.call(sheet, new Event("click"), target);

      expect(actor.update).toHaveBeenCalled();
    });
  });
});
