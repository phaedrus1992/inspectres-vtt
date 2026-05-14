/**
 * Form submission and custom form elements E2E tests
 * Covers #505, #501 from Sprint 525
 */

import { test, expect } from "./fixtures";
import { safeScreenshot } from "./helpers.js";
import { AgentSheetPage } from "./pages/AgentSheetPage.js";
import { createActor, deleteActor } from "./pages/index.js";

test.describe("Custom form elements & form submit round-trip (Sprint #525)", () => {
  test("stress meter custom element: interact with widget and verify persistence (Issue #505, #501)", async ({
    page,
  }) => {
    const actorName = `E2E-stress-meter-${Date.now()}`;
    let actorId: string | null = null;

    try {
      // Create agent and open sheet
      actorId = await createActor(page, "agent", actorName);
      const agent = new AgentSheetPage(page, actorId);

      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Find stress meter element
      const stressMeter = page.locator(agent.stressMeterSelector());
      await expect(stressMeter).toBeVisible();

      // Click stress meter pips to set stress=3
      const pips = page.locator(agent.stressMeterPips());
      const pipCount = await pips.count();
      expect(pipCount).toBe(6); // Stress has 6 pips (0-6 scale)

      // Click third pip to set stress to 3
      await pips.nth(2).click();
      await page.waitForFunction(
        (id: string) => {
          const el = document.querySelector(`.inspectres[id*="${id}"]`);
          return el && el.getBoundingClientRect().height > 0;
        },
        actorId,
        { timeout: 10_000 },
      );

      // Verify stress value persisted to actor.system
      const systemData = await agent.getSystemData();
      expect(systemData["stress"]).toBe(3);

      // Close sheet and reopen to verify persistence
      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const sheet = globalThis.game?.actors?.get(id)?.sheet;
        if (sheet?.element instanceof HTMLElement) {
          sheet.close();
        }
      }, actorId);

      await page.waitForFunction(
        (id: string) => !document.querySelector(`.inspectres[id*="${id}"]`),
        actorId,
        { timeout: 10_000 },
      );

      // Reopen sheet
      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Verify stress meter reflects persisted value
      const stressMeterAfterReopen = page.locator(agent.stressMeterSelector());
      await expect(stressMeterAfterReopen).toBeVisible();

      const filledPips = page.locator(agent.filledPips());
      const filledCount = await filledPips.count();
      expect(filledCount).toBe(3);

      try {
        await safeScreenshot(page, "test-results/e2e-screenshots/form-submit-01-stress-meter.png");
      } catch (err) {
        console.error(`Screenshot failed for form-submit-01: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });

  // Issue #527 fixed: form.submit() guard installed globally (init.ts) and per-sheet
  // (AgentSheet.ts) prevents /join redirect. Test can now run without skipping.
  test("text form field: fill, submit form, verify persistence (Issue #501)", async ({
    page,
  }) => {
    const actorName = `E2E-form-submit-${Date.now()}`;
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

      // Find a text input field and fill it (target the first visible form field)
      // Note: ApplicationV2 renders the template content in a div, not a form element
      const sheet = page.locator(agent.sheetSelector()).first();
      const textInput = sheet.locator('input[type="text"]').first();
      await expect(textInput).toBeVisible();

      const testValue = "E2E Test Value";
      await textInput.fill(testValue);

      // Submit the form by pressing Enter in the input field
      // (There is no explicit submit button in the sheet; form auto-submits via change listeners)
      await textInput.press("Enter");

      await page.waitForFunction(
        (id: string) => {
          const el = document.querySelector(`.inspectres[id*="${id}"]`);
          return el !== null && el.getBoundingClientRect().height > 0;
        },
        actorId,
        { timeout: 10_000 },
      );

      // Close and reopen sheet
      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const sheet = globalThis.game?.actors?.get(id)?.sheet;
        if (sheet?.element instanceof HTMLElement) {
          sheet.close();
        }
      }, actorId);

      await page.waitForFunction(
        (id: string) => !document.querySelector(`.inspectres[id*="${id}"]`),
        actorId,
        { timeout: 10_000 },
      );

      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Verify input value persisted (re-query the same form field)
      const sheetAfterReopen = page.locator(agent.sheetSelector()).first();
      const textInputAfterReopen = sheetAfterReopen.locator('input[type="text"]').first();
      const value = await textInputAfterReopen.inputValue();
      expect(value).toBe(testValue);

      try {
        await safeScreenshot(page, "test-results/e2e-screenshots/form-submit-02-text-field.png");
      } catch (err) {
        console.error(`Screenshot failed for form-submit-02: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });
});
