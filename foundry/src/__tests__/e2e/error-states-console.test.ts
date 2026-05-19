/**
 * Console errors and silent failures E2E tests
 * Covers #503: error handling, graceful degradation, crash prevention
 */

import { test, expect } from "./fixtures";
import { AgentSheetPage } from "./pages/AgentSheetPage.js";
import { createActor, deleteActor } from "./pages/index.js";
import { safeScreenshot } from "./helpers.js";
import { renderActorSheet, waitForSheetStable } from "./pages/helpers.js";

test.describe("Console errors and silent failures (Issue #503)", () => {
  test("invalid form input does not produce console errors", async ({ page }) => {
    const actorName = `E2E-console-errors-${Date.now()}`;
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

      await renderActorSheet(page, actorId);

      // Attach console error listener
      page.on("console", consoleHandler);

      try {
        // Try filling a number input with non-numeric value
        const sheet = page.locator(agent.sheetSelector()).first();
        const numberInput = sheet.locator('input[type="number"]').first();

        if ((await numberInput.count()) > 0) {
          await expect(numberInput).toBeVisible();
          await numberInput.fill("not-a-number");
          await numberInput.blur();

          await waitForSheetStable(page, actorId);
        }

        // Verify no critical errors occurred
        const criticalErrors = consoleErrors.filter(
          (e) =>
            e.includes("TypeError") ||
            e.includes("ReferenceError") ||
            e.includes("Uncaught"),
        );
        expect(criticalErrors).toHaveLength(0);

        await safeScreenshot(
          page,
          "test-results/e2e-screenshots/error-states-06-console-clean.png",
        );
      } finally {
        page.off("console", consoleHandler);
      }
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });
});
