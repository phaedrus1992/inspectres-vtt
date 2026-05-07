/**
 * Dialog and modal E2E tests
 * Covers #500: DialogV2, mission tracker, roll dialogs, confirmations
 */

import { test, expect } from "./fixtures";
import { AgentSheetPage } from "./pages/AgentSheetPage.js";
import { createActor, deleteActor } from "./pages/index.js";

test.describe("DialogV2 and Modal Workflows (Issue #500)", () => {
  test("roll dialog: open dialog, confirm roll, verify message posted", async ({ page }) => {
    const actorName = `E2E-roll-dialog-${Date.now()}`;
    let actorId: string | null = null;

    try {
      actorId = await createActor(page, "agent", actorName);
      const agent = new AgentSheetPage(page, actorId);

      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Click a skill roll button to open the roll dialog
      // Using evaluate to find the first skill roll action in the sheet
      const skillFound = await page.evaluate((sheetId: string) => {
        const sheetEl = document.querySelector(`.inspectres[id*="${sheetId}"]`);
        if (!sheetEl) return false;
        const rollBtn = sheetEl.querySelector('[data-action="skillRoll"]') as HTMLElement;
        return rollBtn ? true : false;
      }, actorId);

      expect(skillFound).toBe(true);

      // Click the skill roll button — this should open a dialog
      const skillRollBtn = page.locator(`${agent.sheetSelector()} [data-action="skillRoll"]`).first();
      await skillRollBtn.click();

      // Wait for dialog to appear (DialogV2 renders as <dialog> element)
      await page.waitForFunction(
        () => {
          const dialog = document.querySelector("dialog:not([open='false'])") as HTMLDialogElement | null;
          if (!dialog) return false;
          const rect = dialog.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        },
        undefined,
        { timeout: 10_000 },
      );

      // Verify dialog is open and visible
      const dialog = page.locator("dialog");
      await expect(dialog).toHaveCount(1);

      // Find and click the confirm button in the dialog
      const confirmBtn = page.locator('dialog button[data-action="roll"], dialog button:has-text("Roll")').first();
      if ((await confirmBtn.count()) > 0) {
        await confirmBtn.click();
      } else {
        // Fallback: click any primary button
        const primaryBtn = page.locator("dialog button").first();
        await primaryBtn.click();
      }

      // Wait for dialog to close
      await page.waitForFunction(
        () => !document.querySelector("dialog:not([open='false'])"),
        undefined,
        { timeout: 5_000},
      );

      // Verify a chat message was posted (check game.messages)
      const messagePosted = await page.evaluate(() => {
        // @ts-expect-error - Foundry runtime global
        return (globalThis.game?.messages?.size ?? 0) > 0;
      });
      expect(messagePosted).toBe(true);

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/dialog-01-roll-dialog.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(`Screenshot failed for dialog-01: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });

  test("confirmation dialog: cancel closes without side effects", async ({ page }) => {
    const actorName = `E2E-confirm-dialog-${Date.now()}`;
    let actorId: string | null = null;

    try {
      actorId = await createActor(page, "agent", actorName);
      const agent = new AgentSheetPage(page, actorId);

      // Store initial message count
      const initialMessageCount = await page.evaluate(() => {
        // @ts-expect-error - Foundry runtime global
        return (globalThis.game?.messages?.size ?? 0);
      });

      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Simulate opening a confirmation dialog by finding a delete button
      const deleteBtn = page.locator(`${agent.sheetSelector()} [data-action*="delete"], ${agent.sheetSelector()} button:has-text("Delete")`).first();
      if ((await deleteBtn.count()) > 0) {
        await deleteBtn.click();

        // Wait for dialog
        await page.waitForFunction(
          () => {
            const dialog = document.querySelector("dialog:not([open='false'])");
            return dialog && dialog.getBoundingClientRect().height > 0;
          },
          undefined,
          { timeout: 10_000 },
        );

        // Click Cancel button
        const cancelBtn = page.locator("dialog button:has-text('Cancel'), dialog button:has-text('Close')").first();
        if ((await cancelBtn.count()) > 0) {
          await cancelBtn.click();
        }

        // Wait for dialog to close
        await page.waitForFunction(
          () => !document.querySelector("dialog:not([open='false'])"),
          undefined,
          { timeout: 5_000 },
        );

        // Verify message count unchanged (cancel had no side effects)
        const finalMessageCount = await page.evaluate(() => {
          // @ts-expect-error - Foundry runtime global
          return (globalThis.game?.messages?.size ?? 0);
        });
        expect(finalMessageCount).toBe(initialMessageCount);
      }

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/dialog-02-confirm-cancel.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(`Screenshot failed for dialog-02: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });

  test("dialog escape key: closes dialog without action", async ({ page }) => {
    const actorName = `E2E-escape-dialog-${Date.now()}`;
    let actorId: string | null = null;

    try {
      actorId = await createActor(page, "agent", actorName);
      const agent = new AgentSheetPage(page, actorId);

      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Open a dialog by clicking a skill roll button
      const skillRollBtn = page.locator(`${agent.sheetSelector()} [data-action="skillRoll"]`).first();
      if ((await skillRollBtn.count()) > 0) {
        await skillRollBtn.click();

        // Wait for dialog
        await page.waitForFunction(
          () => {
            const dialog = document.querySelector("dialog:not([open='false'])");
            return dialog && dialog.getBoundingClientRect().height > 0;
          },
          undefined,
          { timeout: 10_000 },
        );

        // Press Escape to close dialog
        await page.press("body", "Escape");

        // Wait for dialog to close
        await page.waitForFunction(
          () => !document.querySelector("dialog:not([open='false'])"),
          undefined,
          { timeout: 5_000 },
        );

        // Verify dialog is closed
        const dialogCount = await page.locator("dialog:not([open='false'])").count();
        expect(dialogCount).toBe(0);
      }

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/dialog-03-escape-key.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(`Screenshot failed for dialog-03: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });
});
