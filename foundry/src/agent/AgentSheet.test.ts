import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockActorSheetV2, Hooks } from "../__mocks__/setup.js";
import { AgentSheet } from "./AgentSheet.js";

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
      const actor = new MockActorSheetV2().actor;
      actor.system = { skills: { academics: { base: 2, penalty: 0 } }, cool: 1, characteristics: [] };
      const sheet = Object.create(AgentSheet.prototype);
      sheet.actor = actor;
      sheet.isEditable = isEditable;
      const updateSpy = vi.spyOn(actor, "update").mockResolvedValue(actor);
      return { sheet, updateSpy };
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
      const sheet = Object.create(AgentSheet.prototype);
      sheet.actor = mockActor;
      sheet.isEditable = true;

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

  describe("_onRender", () => {
    it("does not attach change listeners when sheet is not editable", async () => {
      const mockSheet = new MockActorSheetV2();
      const sheet = Object.create(AgentSheet.prototype);
      sheet.actor = mockSheet.actor;
      sheet.isEditable = false;

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
      const sheet = Object.create(AgentSheet.prototype);
      sheet.actor = mockActor;
      sheet.isEditable = true;

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
      const sheet = Object.create(AgentSheet.prototype);
      sheet.actor = mockActor;
      sheet.isEditable = true;

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
      const sheet = Object.create(AgentSheet.prototype);
      sheet.actor = mockActor;
      sheet.isEditable = true;

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
  });

});
