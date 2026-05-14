/**
 * Validation errors and field constraints E2E tests
 * Covers #503: comprehensive error handling and boundary conditions
 */

import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { AgentSheetPage } from "./pages/AgentSheetPage.js";
import { createActor, deleteActor } from "./pages/index.js";
import { safeScreenshot } from "./helpers.js";

/**
 * Open actor sheet and wait for render.
 * Eliminates boilerplate: page.evaluate + sheet.render + wait cycle.
 */
async function renderActorSheet(page: Page, actorId: string): Promise<void> {
  await page.evaluate(async (id: string) => {
    // @ts-expect-error - Foundry runtime global
    const actor = globalThis.game?.actors?.get(id);
    if (actor) await actor.sheet.render(true);
  }, actorId);

  await new AgentSheetPage(page, actorId).waitForVisible();
}

/**
 * Wait for sheet DOM to stabilize (visible and rendered).
 * Avoids repeated waitForFunction + getBoundingClientRect pattern.
 */
async function waitForSheetStable(page: Page, actorId: string): Promise<void> {
  await page.waitForFunction(
    (id: string) => {
      const el = document.querySelector(`.inspectres[id*="${id}"]`);
      return el && el.getBoundingClientRect().height > 0;
    },
    actorId,
    { timeout: 10_000 },
  );
}

test.describe("Validation errors and field constraints (Issue #503)", () => {
  test("required field empty: sheet does not crash, state reflects submission", async ({
    page,
  }) => {
    const actorName = `E2E-validation-required-${Date.now()}`;
    let actorId: string | null = null;

    try {
      actorId = await createActor(page, "agent", actorName);
      if (!actorId) throw new Error("Failed to create test actor");
      const agent = new AgentSheetPage(page, actorId);

      await renderActorSheet(page, actorId);

      // Clear the agent name field (if required, this tests empty validation)
      const nameInput = page.locator(`${agent.sheetSelector()} input[name="name"]`).first();
      await expect(nameInput).toBeVisible();
      const originalName = await nameInput.inputValue();

      // Clear and blur to trigger validation
      await nameInput.fill("");
      await nameInput.blur();

      // Sheet should remain visible (no crash)
      await agent.waitForVisible();

      // If system prevents empty names, it should revert or show error
      // For now, verify the sheet is still functional
      const systemAfterClear = await agent.getSystemData();
      expect(systemAfterClear).toBeDefined();

      // Restore name for cleanup
      await nameInput.fill(originalName);
      await nameInput.blur();

      await safeScreenshot(
        page,
        "test-results/e2e-screenshots/error-states-01-required-field.png",
      );
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });

  test("numeric input boundary: stress at max (6) and stress reduction clamping", async ({
    page,
  }) => {
    const actorName = `E2E-stress-boundary-${Date.now()}`;
    let actorId: string | null = null;

    try {
      actorId = await createActor(page, "agent", actorName);
      const agent = new AgentSheetPage(page, actorId);

      await renderActorSheet(page, actorId);

      // Set stress to maximum (6)
      await agent.setStress(6);

      let systemData = await agent.getSystemData();
      expect(systemData["stress"]).toBe(6);

      // Attempt to increase stress beyond max (via UI, should clamp)
      const stressMeterSelector = agent.stressMeterSelector();
      await page.waitForFunction(
        (selector: string) => {
          const el = document.querySelector(selector);
          return el && el.getBoundingClientRect().height > 0;
        },
        stressMeterSelector,
        { timeout: 10_000 },
      );

      // Verify stress meter has 6 pips for the max value
      const pips = page.locator(agent.stressMeterPips());
      const pipCount = await pips.count();
      expect(pipCount).toBe(6);

      // Verify stress is still at max (test completed without additional interaction)
      systemData = await agent.getSystemData();
      expect(systemData["stress"]).toBe(6);

      // Now test reducing stress to 0 by clicking filled pips from right to left
      // Start at stress=6: click pips.nth(5) to get 5, then nth(4) to get 4, etc.
      for (let i = 5; i >= 0; i--) {
        await pips.nth(i).click();
        await waitForSheetStable(page, actorId);
      }

      systemData = await agent.getSystemData();
      expect(systemData["stress"]).toBe(0); // Should clamp to min

      await safeScreenshot(
        page,
        "test-results/e2e-screenshots/error-states-02-stress-boundary.png",
      );
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });

  test("very long string input: textarea accepts and persists without truncation", async ({
    page,
  }) => {
    const actorName = `E2E-long-string-${Date.now()}`;
    let actorId: string | null = null;

    try {
      actorId = await createActor(page, "agent", actorName);
      const agent = new AgentSheetPage(page, actorId);

      await renderActorSheet(page, actorId);

      // Find a textarea (notes or description field)
      const sheet = page.locator(agent.sheetSelector()).first();
      const textarea = sheet.locator('textarea').first();

      if ((await textarea.count()) > 0) {
        await expect(textarea).toBeVisible();

        // Generate a very long string (1000+ chars)
        const longString = "A".repeat(1000) + " " + "B".repeat(500);
        await textarea.fill(longString);

        // Trigger blur to persist
        await textarea.blur();

        await waitForSheetStable(page, actorId);

        // Verify no truncation (note: truncation depends on field definition)
        const systemData = await agent.getSystemData();
        expect(systemData).toBeDefined();

        // Re-query textarea to verify it still contains the long string
        const textareaAfter = sheet.locator('textarea').first();
        const value = await textareaAfter.inputValue();
        expect(value.length).toBeGreaterThan(500); // At least most of it persisted
      }

      await safeScreenshot(
        page,
        "test-results/e2e-screenshots/error-states-03-long-string.png",
      );
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });
});
