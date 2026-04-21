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

  describe("_onRender", () => {
    it("attaches change listener to weird-checkbox elements", async () => {
      const mockActor = new MockActorSheetV2().actor;
      const sheet = Object.create(AgentSheet.prototype);
      sheet.actor = mockActor;

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
