import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockActorSheetV2, Hooks, ChatMessage } from "../__mocks__/setup.js";
import { FranchiseSheet } from "./FranchiseSheet.js";

describe("FranchiseSheet", () => {
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
      actor.system = { bank: 3, debtMode: false, missionPool: 0, missionGoal: 5 };
      const sheet = Object.create(FranchiseSheet.prototype);
      sheet.actor = actor;
      sheet.isEditable = isEditable;
      const updateSpy = vi.spyOn(actor, "update").mockResolvedValue(actor);
      return { sheet, updateSpy };
    }

    it("onBankRoll does not execute when sheet is not editable", async () => {
      const { sheet, updateSpy } = makeSheet(false);
      await FranchiseSheet.onBankRoll.call(sheet, new Event("click"), document.createElement("button"));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("onClientRoll does not post a chat message when sheet is not editable", async () => {
      const { sheet } = makeSheet(false);
      const chatSpy = vi.spyOn(ChatMessage, "create").mockResolvedValue({} as never);
      await FranchiseSheet.onClientRoll.call(sheet, new Event("click"), document.createElement("button"));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(chatSpy).not.toHaveBeenCalled();
    });
  });
});
