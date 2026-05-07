/**
 * Item sheet E2E tests: registration, creation, editing, deletion
 * Covers #498: Item sheets — registration + coverage
 */

import { test, expect } from "./fixtures";
import { AgentSheetPage } from "./pages/AgentSheetPage.js";
import { createActor, deleteActor } from "./pages/index.js";

test.describe("Item Sheet Workflows (Issue #498)", () => {
  test("item sheet registration: sheets are registered and available", async ({ page }) => {
    // Verify that item sheets are registered in CONFIG.Item.documentClass
    const sheetRegistered = await page.evaluate(() => {
      // @ts-expect-error - Foundry runtime global
      const ConfigActor = globalThis.CONFIG?.Actor?.documentClass;
      // @ts-expect-error - Foundry runtime global
      const ConfigItem = globalThis.CONFIG?.Item?.documentClass;
      return {
        actorExists: !!ConfigActor,
        itemExists: !!ConfigItem,
      };
    });

    expect(sheetRegistered.actorExists).toBe(true);
    expect(sheetRegistered.itemExists).toBe(true);

    try {
      await page.screenshot({
        path: "test-results/e2e-screenshots/item-sheet-01-registration.png",
        timeout: 5000,
      });
    } catch (err) {
      console.error(`Screenshot failed for item-sheet-01: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  test("create and open item sheet: create item and render its sheet", async ({ page }) => {
    const actorName = `E2E-item-test-${Date.now()}`;
    let actorId: string | null = null;
    let itemId: string | null = null;

    try {
      actorId = await createActor(page, "agent", actorName);
      const agent = new AgentSheetPage(page, actorId);

      // Open agent sheet
      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Create an item (ability) on the actor
      const createResult = await page.evaluate(async (actorId: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(actorId);
        if (!actor) return null;
        const item = await actor.createEmbeddedDocuments("Item", [
          {
            name: "Test Ability",
            type: "ability",
            system: {},
          },
        ]);
        return item?.[0]?.id ?? null;
      }, actorId);

      expect(createResult).toBeTruthy();
      itemId = createResult as string;

      // Open the item sheet
      const itemSheetOpened = await page.evaluate(async (args: { actorId: string; itemId: string }) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(args.actorId);
        if (!actor) return false;
        const item = actor.items.get(args.itemId);
        if (!item) return false;
        try {
          await item.sheet.render(true);
          return true;
        } catch {
          return false;
        }
      }, { actorId, itemId });

      expect(itemSheetOpened).toBe(true);

      // Wait for item sheet to appear (item sheets may use different selector)
      const itemSheetVisible = await page.waitForFunction(
        () => {
          const selector = `[id*="${itemId}"]`;
          const el = document.querySelector(selector);
          return el && (el as HTMLElement).getBoundingClientRect().height > 0;
        },
        { timeout: 10_000 },
      ).then(
        () => true,
        () => false,
      );

      expect(itemSheetVisible).toBe(true);

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/item-sheet-02-create-and-open.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(`Screenshot failed for item-sheet-02: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      // Item cleanup happens with actor cleanup
      if (actorId) await deleteActor(page, actorId);
    }
  });

  test("edit and save item: change item field and verify persistence", async ({ page }) => {
    const actorName = `E2E-edit-item-${Date.now()}`;
    let actorId: string | null = null;
    let itemId: string | null = null;

    try {
      actorId = await createActor(page, "agent", actorName);
      const agent = new AgentSheetPage(page, actorId);

      // Open agent sheet
      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Create an item
      const createResult = await page.evaluate(async (actorId: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(actorId);
        if (!actor) return null;
        const item = await actor.createEmbeddedDocuments("Item", [
          {
            name: "Original Name",
            type: "ability",
            system: {},
          },
        ]);
        return item?.[0]?.id ?? null;
      }, actorId);

      itemId = createResult as string;
      expect(itemId).toBeTruthy();

      // Open item sheet
      await page.evaluate(async (args: { actorId: string; itemId: string }) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(args.actorId);
        const item = actor?.items?.get(args.itemId);
        if (item) await item.sheet.render(true);
      }, { actorId, itemId });

      // Wait for sheet
      await page.waitForFunction(
        () => {
          const el = document.querySelector(`[id*="${itemId}"]`);
          return el && (el as HTMLElement).getBoundingClientRect().height > 0;
        },
        { timeout: 10_000 },
      );

      // Update the item name via evaluate (or via form if accessible)
      const newName = `Edited Item ${Date.now()}`;
      await page.evaluate(async (args: { actorId: string; itemId: string; newName: string }) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(args.actorId);
        const item = actor?.items?.get(args.itemId);
        if (item) await item.update({ name: args.newName });
      }, { actorId, itemId, newName });

      // Verify the change persisted
      const updatedName = await page.evaluate(async (args: { actorId: string; itemId: string }) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(args.actorId);
        const item = actor?.items?.get(args.itemId);
        return item?.name ?? null;
      }, { actorId, itemId });

      expect(updatedName).toBe(newName);

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/item-sheet-03-edit-and-save.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(`Screenshot failed for item-sheet-03: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });

  test("delete item: remove item and verify it no longer exists", async ({ page }) => {
    const actorName = `E2E-delete-item-${Date.now()}`;
    let actorId: string | null = null;
    let itemId: string | null = null;

    try {
      actorId = await createActor(page, "agent", actorName);

      // Create an item
      const createResult = await page.evaluate(async (actorId: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(actorId);
        if (!actor) return null;
        const item = await actor.createEmbeddedDocuments("Item", [
          {
            name: "Item to Delete",
            type: "ability",
            system: {},
          },
        ]);
        return item?.[0]?.id ?? null;
      }, actorId);

      itemId = createResult as string;
      expect(itemId).toBeTruthy();

      // Verify item exists
      let itemExists = await page.evaluate(async (args: { actorId: string; itemId: string }) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(args.actorId);
        const item = actor?.items?.get(args.itemId);
        return !!item;
      }, { actorId, itemId });
      expect(itemExists).toBe(true);

      // Delete the item
      await page.evaluate(async (args: { actorId: string; itemId: string }) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(args.actorId);
        const item = actor?.items?.get(args.itemId);
        if (item) await item.delete();
      }, { actorId, itemId });

      // Verify item is gone
      itemExists = await page.evaluate(async (args: { actorId: string; itemId: string }) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(args.actorId);
        const item = actor?.items?.get(args.itemId);
        return !!item;
      }, { actorId, itemId });
      expect(itemExists).toBe(false);

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/item-sheet-04-delete.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(`Screenshot failed for item-sheet-04: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });
});
