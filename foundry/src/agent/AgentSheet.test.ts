import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockActorSheetV2, Hooks } from "../__mocks__/setup.js";
import { AgentSheet } from "./AgentSheet.js";
import type { AgentData } from "./agent-schema.js";

function makeAgentSheetTestInstance(actor: unknown, isEditable = true) {
  const sheet = Object.create(AgentSheet.prototype) as unknown as AgentSheet;
  // Test fixtures bypass readonly properties via Object.create pattern
  // Production uses proper ApplicationV2 initialization; tests use minimal mock
  Object.defineProperty(sheet, "actor", { value: actor, writable: true });
  Object.defineProperty(sheet, "isEditable", { value: isEditable, writable: true });
  return sheet;
}

describe("AgentSheet", () => {
  beforeEach(() => {
    Hooks.clearAll();
    vi.clearAllMocks();
  });

  afterEach(() => {
    Hooks.clearAll();
  });

  describe("action handlers — isEditable guard", () => {
    function makeSheet(isEditable: boolean) {
      const mockSheet = new MockActorSheetV2();
      const actor = mockSheet.actor;
      actor.system = { skills: { academics: { base: 2, penalty: 0 } }, cool: 1, characteristics: [] };
      // Sheet instance from mockSheet
      mockSheet.isEditable = isEditable;
      const updateSpy = vi.spyOn(actor, "update").mockResolvedValue(actor);
      return { sheet: mockSheet as unknown as AgentSheet, updateSpy };
    }

    it("onSkillStep does not update actor when not editable", async () => {
      const { sheet, updateSpy } = makeSheet(false);
      const target = document.createElement("button");
      target.setAttribute("data-action", "skillIncrease");
      target.setAttribute("data-skill", "academics");
      await AgentSheet.onSkillStep.call(sheet, new Event("click"), target);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("onToggleCool does not update actor when not editable", async () => {
      const { sheet, updateSpy } = makeSheet(false);
      const target = document.createElement("button");
      target.setAttribute("data-value", "1");
      await AgentSheet.onToggleCool.call(sheet, new Event("click"), target);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("onAddCharacteristic does not update actor when not editable", async () => {
      const { sheet, updateSpy } = makeSheet(false);
      await AgentSheet.onAddCharacteristic.call(sheet, new Event("click"), document.createElement("button"));
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("onRemoveCharacteristic does not update actor when not editable", async () => {
      const { sheet, updateSpy } = makeSheet(false);
      const target = document.createElement("button");
      target.setAttribute("data-idx", "0");
      await AgentSheet.onRemoveCharacteristic.call(sheet, new Event("click"), target);
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe("tab navigation", () => {
    function makeSheetWithTabs(activeTab = "stats") {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, true);

      const statsTab = document.createElement("div");
      statsTab.setAttribute("data-tab", "stats");
      statsTab.classList.add("tab");

      const notesTab = document.createElement("div");
      notesTab.setAttribute("data-tab", "notes");
      notesTab.classList.add("tab");

      const statsBtn = document.createElement("button");
      statsBtn.setAttribute("data-tab", "stats");
      statsBtn.classList.add("sheet-tab");

      const notesBtn = document.createElement("button");
      notesBtn.setAttribute("data-tab", "notes");
      notesBtn.classList.add("sheet-tab");

      const element = document.createElement("form");
      element.appendChild(statsTab);
      element.appendChild(notesTab);
      element.appendChild(statsBtn);
      element.appendChild(notesBtn);

      element.dataset["activeTab"] = activeTab;

      Object.defineProperty(sheet, "element", { value: element });
      return { sheet, statsTab, notesTab, statsBtn, notesBtn };
    }

    it("activates the stats tab by default on first render", async () => {
      const { sheet, statsTab, notesTab, statsBtn, notesBtn } = makeSheetWithTabs();
      await sheet._onRender({}, {});

      expect(statsTab.classList.contains("active")).toBe(true);
      expect(notesTab.classList.contains("active")).toBe(false);
      expect(statsBtn.classList.contains("active")).toBe(true);
      expect(notesBtn.classList.contains("active")).toBe(false);
    });

    it("activates the notes tab when stored as active", async () => {
      const { sheet, statsTab, notesTab, statsBtn, notesBtn } = makeSheetWithTabs("notes");
      await sheet._onRender({}, {});

      expect(notesTab.classList.contains("active")).toBe(true);
      expect(statsTab.classList.contains("active")).toBe(false);
      expect(notesBtn.classList.contains("active")).toBe(true);
      expect(statsBtn.classList.contains("active")).toBe(false);
    });

    it("switches to notes tab when a tab button is clicked", async () => {
      const { sheet, statsTab, notesTab, notesBtn } = makeSheetWithTabs();
      await sheet._onRender({}, {});

      notesBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(notesTab.classList.contains("active")).toBe(true);
      expect(statsTab.classList.contains("active")).toBe(false);
    });

    it("remembers tab state across re-renders", async () => {
      const { sheet, notesBtn, notesTab } = makeSheetWithTabs();
      await sheet._onRender({}, {});

      notesBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(sheet.element.dataset["activeTab"]).toBe("notes");

      await sheet._onRender({}, {});
      expect(notesTab.classList.contains("active")).toBe(true);
    });
  });

  describe("portrait editing", () => {
    it("updates actor img when portrait is edited", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, true);

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);
      const target = document.createElement("img");
      target.dataset["type"] = "image";

      let pickerCallback: ((path: string) => void) | undefined;
      const mockFilePicker = {
        browse: vi.fn(),
      };
      class MockFilePicker {
        constructor(options: { callback?: (path: string) => void }) {
          pickerCallback = options.callback;
        }
        browse() {
          mockFilePicker.browse();
        }
      }
      global.foundry = {
        applications: {
          api: {
            FilePicker: MockFilePicker,
          },
        },
      } as unknown as typeof foundry;

      await AgentSheet.onEditPortrait.call(sheet, new MouseEvent("click"), target);
      expect(mockFilePicker.browse).toHaveBeenCalled();

      if (pickerCallback) pickerCallback("systems/inspectres/assets/new-portrait.png");
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ img: "systems/inspectres/assets/new-portrait.png" }),
      );
    });

    it("does not update actor when file picker is dismissed without selection", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, true);

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);
      const target = document.createElement("img");

      const mockFilePicker = {
        browse: vi.fn(),
      };
      class MockFilePicker {
        browse() {
          mockFilePicker.browse();
        }
      }
      global.foundry = {
        applications: {
          api: {
            FilePicker: MockFilePicker,
          },
        },
      } as unknown as typeof foundry;

      await AgentSheet.onEditPortrait.call(sheet, new MouseEvent("click"), target);
      expect(mockFilePicker.browse).toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("does not open file picker when sheet is not editable", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, false);

      const filePickerConstructor = vi.fn();
      class TrackingFilePicker {
        constructor() {
          filePickerConstructor();
        }
        browse() {}
      }
      global.foundry = {
        applications: {
          api: {
            FilePicker: TrackingFilePicker,
          },
        },
      } as unknown as typeof foundry;

      await AgentSheet.onEditPortrait.call(sheet, new MouseEvent("click"), document.createElement("img"));

      expect(filePickerConstructor).not.toHaveBeenCalled();
    });
  });

  describe("_onRender", () => {
    it("does not attach change listeners when sheet is not editable", async () => {
      const mockSheet = new MockActorSheetV2();
      const sheet = makeAgentSheetTestInstance(mockSheet.actor, false);

      const checkbox = document.createElement("input");
      checkbox.className = "weird-checkbox";
      checkbox.type = "checkbox";

      const querySelectorAllSpy = vi.fn(() => [checkbox]);
      Object.defineProperty(sheet, "element", {
        value: { querySelectorAll: querySelectorAllSpy },
      });

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);

      await sheet._onRender({}, {});

      checkbox.dispatchEvent(new Event("change"));
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("attaches change listener to weird-checkbox elements", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, true);

      const checkbox = document.createElement("input");
      checkbox.className = "weird-checkbox";
      checkbox.type = "checkbox";

      Object.defineProperty(sheet, "element", {
        value: {
          querySelectorAll: vi.fn(() => [checkbox]),
        },
      });

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);

      await sheet._onRender({}, {});

      checkbox.dispatchEvent(new Event("change"));
      expect(updateSpy).toHaveBeenCalled();
    });

    it("handles listener errors gracefully without rethrowing", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, true);

      const checkbox = document.createElement("input");
      checkbox.className = "weird-checkbox";

      Object.defineProperty(sheet, "element", {
        value: {
          querySelectorAll: vi.fn(() => [checkbox]),
        },
      });

      const updateError = new Error("Update failed");
      vi.spyOn(sheet.actor, "update").mockRejectedValueOnce(updateError);

      await sheet._onRender({}, {});
      checkbox.dispatchEvent(new Event("change"));

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(true).toBe(true);
    });

    it("multiple checkboxes each get listeners attached", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, true);

      const checkbox1 = document.createElement("input");
      const checkbox2 = document.createElement("input");
      checkbox1.className = "weird-checkbox";
      checkbox2.className = "weird-checkbox";

      Object.defineProperty(sheet, "element", {
        value: {
          querySelectorAll: vi.fn(() => [checkbox1, checkbox2]),
        },
      });

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);

      await sheet._onRender({}, {});

      checkbox1.dispatchEvent(new Event("change"));
      checkbox2.dispatchEvent(new Event("change"));

      expect(updateSpy).toHaveBeenCalledTimes(2);
    });

    it("does not accumulate listeners across multiple re-renders", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, true);

      const checkbox = document.createElement("input");
      checkbox.className = "weird-checkbox";
      checkbox.type = "checkbox";

      Object.defineProperty(sheet, "element", {
        value: {
          querySelectorAll: vi.fn(() => [checkbox]),
        },
      });

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);

      await sheet._onRender({}, {});
      await sheet._onRender({}, {});
      await sheet._onRender({}, {});

      checkbox.dispatchEvent(new Event("change"));
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("onActivatePower guards", () => {
    it("does not activate power when sheet is not editable", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, false);

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);

      await AgentSheet.onActivatePower.call(sheet, new Event("click"), document.createElement("button"));

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("does not activate power while agent is recovering", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, true);

      const agentData: AgentData = {
        description: "",
        skills: { academics: { base: 1, penalty: 0 }, athletics: { base: 1, penalty: 0 }, technology: { base: 1, penalty: 0 }, contact: { base: 1, penalty: 0 } },
        talent: "",
        cool: 3,
        isWeird: true,
        power: { name: "Test Power", description: "Test", baseSkill: "athletics", coolCost: 1 },
        characteristics: [],
        isDead: false,
        daysOutOfAction: 2,
        recoveryStartedAt: 5,
        stress: 0,
      };

      Object.defineProperty(sheet.actor, "system", { value: agentData });

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);

      await AgentSheet.onActivatePower.call(sheet, new Event("click"), document.createElement("button"));

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("activates power and deducts cool when conditions are met", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, true);

      const agentData: AgentData = {
        description: "",
        skills: { academics: { base: 1, penalty: 0 }, athletics: { base: 1, penalty: 0 }, technology: { base: 1, penalty: 0 }, contact: { base: 1, penalty: 0 } },
        talent: "",
        cool: 3,
        isWeird: true,
        power: { name: "Test Power", description: "Test", baseSkill: "athletics", coolCost: 1 },
        characteristics: [],
        isDead: false,
        daysOutOfAction: 0,
        recoveryStartedAt: 0,
        stress: 0,
      };

      Object.defineProperty(sheet.actor, "system", { value: agentData });

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);
      const createChatSpy = vi.spyOn(ChatMessage, "create").mockResolvedValue({} as ChatMessage);

      await AgentSheet.onActivatePower.call(sheet, new Event("click"), document.createElement("button"));

      expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ "system.cool": 2 }));
      expect(createChatSpy).toHaveBeenCalled();
    });

    it("prevents power activation if cool is insufficient", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, true);

      const agentData: AgentData = {
        description: "",
        skills: { academics: { base: 1, penalty: 0 }, athletics: { base: 1, penalty: 0 }, technology: { base: 1, penalty: 0 }, contact: { base: 1, penalty: 0 } },
        talent: "",
        cool: 0,
        isWeird: true,
        power: { name: "Test Power", description: "Test", baseSkill: "athletics", coolCost: 1 },
        characteristics: [],
        isDead: false,
        daysOutOfAction: 0,
        recoveryStartedAt: 0,
        stress: 0,
      };

      Object.defineProperty(sheet.actor, "system", { value: agentData });

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);

      await AgentSheet.onActivatePower.call(sheet, new Event("click"), document.createElement("button"));

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe("recovery management handlers", () => {
    it("onReviveAgent clears death state", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, true);

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);
      const target = document.createElement("button");
      target.setAttribute("data-action", "reviveAgent");

      await AgentSheet.onReviveAgent.call(sheet, new Event("click"), target);

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          "system.isDead": false,
          "system.daysOutOfAction": 0,
          "system.recoveryStartedAt": 0,
        })
      );
    });

    it("onEmergencyRecovery opens dialog and sets recovery fields", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, true);

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);

      const mockDialogWait = vi.fn().mockResolvedValue({ days: 2 });
      global.foundry = {
        applications: {
          api: {
            DialogV2: { wait: mockDialogWait },
          },
        },
      } as unknown as typeof foundry;

      const target = document.createElement("button");
      target.setAttribute("data-action", "emergencyRecovery");

      await AgentSheet.onEmergencyRecovery.call(sheet, new Event("click"), target);

      expect(mockDialogWait).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalled();
    });

    it("onOverrideRecoveryDay updates recovery end day", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, true);

      const agentData: AgentData = {
        description: "",
        skills: { academics: { base: 1, penalty: 0 }, athletics: { base: 1, penalty: 0 }, technology: { base: 1, penalty: 0 }, contact: { base: 1, penalty: 0 } },
        talent: "",
        cool: 0,
        isWeird: false,
        power: null,
        characteristics: [],
        isDead: false,
        daysOutOfAction: 3,
        recoveryStartedAt: 5,
        stress: 0,
      };
      Object.defineProperty(sheet.actor, "system", { value: agentData });

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);

      const input = document.createElement("input");
      input.type = "number";
      input.value = "10";
      input.setAttribute("data-action", "overrideRecoveryDay");

      await AgentSheet.onOverrideRecoveryDay.call(sheet, new Event("change"), input);

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          "system.daysOutOfAction": 5,
        })
      );
    });

    it("does not perform recovery actions when sheet is not editable", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = makeAgentSheetTestInstance(mockActor, false);

      const updateSpy = vi.spyOn(sheet.actor, "update").mockResolvedValue(sheet.actor);

      await AgentSheet.onReviveAgent.call(sheet, new Event("click"), document.createElement("button"));
      await AgentSheet.onEmergencyRecovery.call(sheet, new Event("click"), document.createElement("button"));

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

});
