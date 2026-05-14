/**
 * Form error handling E2E tests
 * Covers #503 from Sprint 525
 */

import { test, expect } from "./fixtures";
import { safeScreenshot } from "./helpers.js";
import { AgentSheetPage } from "./pages/AgentSheetPage.js";
import { createActor, deleteActor } from "./pages/index.js";

test.describe("Error states and edge cases (Issue #503)", () => {
  test("form field with invalid input: error handling does not crash sheet", async ({
    page,
  }) => {
    const actorName = `E2E-error-state-${Date.now()}`;
    let actorId: string | null = null;
    const consoleErrors: string[] = [];
    const consoleHandler = (msg: { type: () => string; text: () => string }) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    };

    try {
      actorId = await createActor(page, "agent", actorName);
      const agent = new AgentSheetPage(page, actorId);

      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Attach console error listener
      page.on("console", consoleHandler);

      // Try filling a number input with non-numeric value
      const numberForm = page.locator(`${agent.sheetSelector()} form`).first();
      const numberInput = numberForm.locator('input[type="number"]').first();
      if ((await numberInput.count()) > 0) {
        await expect(numberInput).toBeVisible();
        await numberInput.fill("not-a-number");

        // Wait for input change event propagation
        await page.waitForFunction(
          (id: string) => {
            const el = document.querySelector(`.inspectres[id*="${id}"]`);
            return el !== null && el.getBoundingClientRect().height > 0;
          },
          actorId,
          { timeout: 10_000 },
        );

        // Sheet should still be visible (not crashed)
        await agent.waitForVisible();
      }

      // Verify no critical errors occurred
      const criticalErrors = consoleErrors.filter(
        (e) =>
          e.includes("TypeError") ||
          e.includes("ReferenceError") ||
          e.includes("Uncaught"),
      );
      expect(criticalErrors).toHaveLength(0);

      try {
        await safeScreenshot(page, "test-results/e2e-screenshots/form-submit-04-error-state.png");
      } catch (err) {
        console.error(`Screenshot failed for form-submit-04: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      page.off("console", consoleHandler);
      if (actorId) await deleteActor(page, actorId);
    }
  });
});
