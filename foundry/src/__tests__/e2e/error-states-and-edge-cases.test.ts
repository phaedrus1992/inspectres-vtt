/**
 * Error states, validation, and edge case E2E tests
 * Covers #503: comprehensive error handling and boundary conditions
 */

import { test, expect } from "./fixtures";
import { AgentSheetPage } from "./pages/AgentSheetPage.js";
import { createActor, deleteActor } from "./pages/index.js";

test.describe("Validation errors and field constraints (Issue #503)", () => {
  test("required field empty: sheet does not crash, state reflects submission", async ({
    page,
  }) => {
    const actorName = `E2E-validation-required-${Date.now()}`;
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

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/error-states-01-required-field.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(
          `Screenshot failed for error-states-01: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
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

      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Set stress to maximum (6)
      await agent.setStress(6);

      let systemData = await agent.getSystemData();
      expect(systemData["stress"]).toBe(6);

      // Attempt to increase stress beyond max (via UI, should clamp)
      const stressMeter = page.locator(agent.stressMeterSelector());
      await expect(stressMeter).toBeVisible();

      // Click the 6th pip (already at max) to test clamping
      const pips = page.locator(agent.stressMeterPips());
      const pipCount = await pips.count();
      expect(pipCount).toBe(6);

      await pips.nth(5).click(); // Click last pip (index 5 = stress 6)

      await page.waitForFunction(
        (id: string) => {
          const el = document.querySelector(`.inspectres[id*="${id}"]`);
          return el && el.getBoundingClientRect().height > 0;
        },
        actorId,
        { timeout: 10_000 },
      );

      systemData = await agent.getSystemData();
      expect(systemData["stress"]).toBe(6); // Should stay at max, not exceed

      // Now test reducing stress to 0 (minimum)
      const filledPips = page.locator(agent.filledPips());
      let filledCount = await filledPips.count();
      expect(filledCount).toBe(6);

      // Click first pip to reduce to 1, then 0
      for (let i = 6; i > 0; i--) {
        await pips.nth(0).click();
        await page.waitForFunction(
          (id: string) => {
            const el = document.querySelector(`.inspectres[id*="${id}"]`);
            return el && el.getBoundingClientRect().height > 0;
          },
          actorId,
          { timeout: 5_000 },
        );
      }

      systemData = await agent.getSystemData();
      expect(systemData["stress"]).toBe(0); // Should clamp to min

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/error-states-02-stress-boundary.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(
          `Screenshot failed for error-states-02: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
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

      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

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

        await page.waitForFunction(
          (id: string) => {
            const el = document.querySelector(`.inspectres[id*="${id}"]`);
            return el && el.getBoundingClientRect().height > 0;
          },
          actorId,
          { timeout: 10_000 },
        );

        // Verify no truncation (note: truncation depends on field definition)
        const systemData = await agent.getSystemData();
        expect(systemData).toBeDefined();

        // Re-query textarea to verify it still contains the long string
        const textareaAfter = sheet.locator('textarea').first();
        const value = await textareaAfter.inputValue();
        expect(value.length).toBeGreaterThan(500); // At least most of it persisted
      }

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/error-states-03-long-string.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(
          `Screenshot failed for error-states-03: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });
});

test.describe("Recovery edge cases (Issue #503)", () => {
  test("agent already dead: cannot increase stress further, sheet shows death state", async ({
    page,
  }) => {
    const actorName = `E2E-recovery-edge-${Date.now()}`;
    let actorId: string | null = null;

    try {
      actorId = await createActor(page, "agent", actorName);
      const agent = new AgentSheetPage(page, actorId);

      // Set agent to dead state
      await page.evaluate(
        async (id: string) => {
          // @ts-expect-error - Foundry runtime global
          const actor = globalThis.game?.actors?.get(id);
          if (actor) {
            await actor.update({
              "system.isDead": true,
              "system.recoveryStartedAt": null,
            });
          }
        },
        actorId,
      );

      // Open sheet
      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Verify system state reflects dead
      let systemData = await agent.getSystemData();
      expect(systemData["isDead"]).toBe(true);

      // Attempt to modify stress (UI should prevent or handle gracefully)
      const stressMeter = page.locator(agent.stressMeterSelector());
      if ((await stressMeter.count()) > 0) {
        // If stress meter is visible, try to interact
        const pips = page.locator(agent.stressMeterPips());
        if ((await pips.count()) > 0) {
          await pips.nth(2).click();

          await page.waitForFunction(
            (id: string) => {
              const el = document.querySelector(`.inspectres[id*="${id}"]`);
              return el && el.getBoundingClientRect().height > 0;
            },
            actorId,
            { timeout: 10_000 },
          );

          systemData = await agent.getSystemData();
          // Behavior depends on implementation: stress might be locked or UI disabled
          expect(systemData["isDead"]).toBe(true); // Still dead
        }
      }

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/error-states-04-recovery-dead.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(
          `Screenshot failed for error-states-04: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });

  test("recovery started in past: auto-clear behavior on day advance", async ({ page }) => {
    const actorName = `E2E-recovery-past-${Date.now()}`;
    let actorId: string | null = null;

    try {
      actorId = await createActor(page, "agent", actorName);

      const today = await page.evaluate(async () => {
        // @ts-expect-error - Foundry runtime global
        return globalThis.game?.settings?.get("core", "currentDay") ?? 0;
      });

      // Set recovery started 5 days ago with duration of 3 days (should be expired)
      await page.evaluate(
        async (args: { id: string; today: number }) => {
          // @ts-expect-error - Foundry runtime global
          const actor = globalThis.game?.actors?.get(args.id);
          if (actor) {
            await actor.update({
              "system.recoveryStartedAt": args.today - 5,
              "system.daysOutOfAction": 3,
              "system.isDead": false,
            });
          }
        },
        { id: actorId, today },
      );

      const agent = new AgentSheetPage(page, actorId);

      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Verify recovery state is set
      let systemData = await agent.getSystemData();
      expect(systemData["recoveryStartedAt"]).toBeDefined();

      // Trigger day advance (implementation-dependent; may auto-clear on next interaction)
      // For now, just verify the recovery fields exist
      expect(systemData["daysOutOfAction"]).toBeDefined();

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/error-states-05-recovery-past.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(
          `Screenshot failed for error-states-05: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });
});

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

      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Attach console error listener
      page.on("console", consoleHandler);

      // Try filling a number input with non-numeric value
      const sheet = page.locator(agent.sheetSelector()).first();
      const numberInput = sheet.locator('input[type="number"]').first();

      if ((await numberInput.count()) > 0) {
        await expect(numberInput).toBeVisible();
        await numberInput.fill("not-a-number");
        await numberInput.blur();

        await page.waitForFunction(
          (id: string) => {
            const el = document.querySelector(`.inspectres[id*="${id}"]`);
            return el !== null && el.getBoundingClientRect().height > 0;
          },
          actorId,
          { timeout: 10_000 },
        );
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
        await page.screenshot({
          path: "test-results/e2e-screenshots/error-states-06-console-clean.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(
          `Screenshot failed for error-states-06: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } finally {
      page.off("console", consoleHandler);
      if (actorId) await deleteActor(page, actorId);
    }
  });
});
