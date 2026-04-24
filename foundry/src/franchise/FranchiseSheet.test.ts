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

  describe("debt control actions", () => {
    function makeSheetWithGM(isGM: boolean, debtMode: boolean = false) {
      const actor = new MockActorSheetV2().actor;
      actor.system = { bank: 3, debtMode, cardsLocked: false, missionPool: 0, missionGoal: 5 };
      const sheet = Object.create(FranchiseSheet.prototype);
      sheet.actor = actor;
      sheet.isEditable = true;
      (globalThis as any).game = { user: { isGM } };
      const updateSpy = vi.spyOn(actor, "update").mockResolvedValue(actor);
      return { sheet, updateSpy };
    }

    it("onToggleDebtMode requires GM permission", async () => {
      const { sheet, updateSpy } = makeSheetWithGM(false);
      await FranchiseSheet.onToggleDebtMode.call(sheet, new Event("click"), document.createElement("button"));
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("onToggleDebtMode toggles debtMode when GM", async () => {
      const { sheet, updateSpy } = makeSheetWithGM(true, false);
      await FranchiseSheet.onToggleDebtMode.call(sheet, new Event("click"), document.createElement("button"));
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          "system.debtMode": true,
        }),
      );
    });

    it("onToggleCardsLocked requires GM permission", async () => {
      const { sheet, updateSpy } = makeSheetWithGM(false, true);
      await FranchiseSheet.onToggleCardsLocked.call(sheet, new Event("click"), document.createElement("button"));
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("onToggleCardsLocked toggles cardsLocked when GM", async () => {
      const { sheet, updateSpy } = makeSheetWithGM(true, true);
      await FranchiseSheet.onToggleCardsLocked.call(sheet, new Event("click"), document.createElement("button"));
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          "system.cardsLocked": true,
        }),
      );
    });
  });
});
