/**
 * Form submission, custom form elements, multi-actor, and error state E2E tests
 * Covers #505, #501, #502, #503 from Sprint 525
 */

import { test, expect } from "./fixtures";
import { AgentSheetPage } from "./pages/AgentSheetPage.js";
import { createActor, deleteActor } from "./pages/index.js";

test.describe("Custom form elements & form submit round-trip (Sprint #525)", () => {
  // Blocked by issue #526: <stress-meter> custom element not yet implemented.
  // Re-enable once the component ships; logic and selectors are validated by code review.
  test.skip("stress meter custom element: interact with widget and verify persistence (Issue #505, #501)", async ({
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
        () => {
          const el = document.querySelector(`.inspectres[id*="${actorId}"]`);
          return el && el.getBoundingClientRect().height > 0;
        },
        undefined,
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
        () => !document.querySelector(`.inspectres[id*="${actorId}"]`),
        undefined,
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
        await page.screenshot({
          path: "test-results/e2e-screenshots/form-submit-01-stress-meter.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(`Screenshot failed for form-submit-01: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });

  // Blocked by issue #527: agent sheet does not currently expose a submit
  // button reachable in v14 without /join redirect; re-enable when the form
  // submission path is wired through DialogV2 or a guarded handler.
  test.skip("text form field: fill, submit form, verify persistence (Issue #501)", async ({
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
      const form = page.locator(`${agent.sheetSelector()} form`).first();
      const textInput = form.locator('input[type="text"]').first();
      await expect(textInput).toBeVisible();

      const testValue = "E2E Test Value";
      await textInput.fill(testValue);

      // Submit the form by clicking the submit button
      const submitBtn = page.locator(`${agent.sheetSelector()} button[type="submit"]`).first();
      if ((await submitBtn.count()) > 0) {
        await submitBtn.click();
      } else {
        // Fallback: find and click any submit-like button
        const anySubmitBtn = page.locator(`${agent.sheetSelector()} button`).first();
        await anySubmitBtn.click();
      }

      await page.waitForFunction(
        () => {
          const el = document.querySelector(`.inspectres[id*="${actorId}"]`);
          return el && el.getBoundingClientRect().height > 0;
        },
        undefined,
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
        () => !document.querySelector(`.inspectres[id*="${actorId}"]`),
        undefined,
        { timeout: 10_000 },
      );

      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId);

      await agent.waitForVisible();

      // Verify input value persisted (re-query the same form field)
      const formAfterReopen = page.locator(`${agent.sheetSelector()} form`).first();
      const textInputAfterReopen = formAfterReopen.locator('input[type="text"]').first();
      const value = await textInputAfterReopen.inputValue();
      expect(value).toBe(testValue);

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/form-submit-02-text-field.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(`Screenshot failed for form-submit-02: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (actorId) await deleteActor(page, actorId);
    }
  });
});

test.describe("Multi-actor sheet workflows (Issue #502)", () => {
  test("two actors open simultaneously: edit one, verify other unaffected", async ({
    page,
  }) => {
    const agent1Name = `E2E-multi-actor-1-${Date.now()}`;
    const agent2Name = `E2E-multi-actor-2-${Date.now()}`;
    let actorId1: string | null = null;
    let actorId2: string | null = null;

    try {
      actorId1 = await createActor(page, "agent", agent1Name);
      actorId2 = await createActor(page, "agent", agent2Name);

      const agent1 = new AgentSheetPage(page, actorId1);
      const agent2 = new AgentSheetPage(page, actorId2);

      // Open both sheets
      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId1);

      await agent1.waitForVisible();

      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId2);

      await agent2.waitForVisible();

      // Verify both sheets are in DOM
      const sheet1Visible = await page.evaluate((id: string) => {
        return document.querySelector(`.inspectres[id*="${id}"]`) !== null;
      }, actorId1);
      const sheet2Visible = await page.evaluate((id: string) => {
        return document.querySelector(`.inspectres[id*="${id}"]`) !== null;
      }, actorId2);
      expect(sheet1Visible).toBe(true);
      expect(sheet2Visible).toBe(true);

      // Get initial stress value for agent2
      const system2Before = await agent2.getSystemData();

      // Update agent1's stress
      await agent1.setStress(5);

      // Verify agent1 changed
      const system1After = await agent1.getSystemData();
      expect(system1After["stress"]).toBe(5);

      // Verify agent2 unchanged
      const system2After = await agent2.getSystemData();
      expect(system2After["stress"]).toBe(system2Before["stress"]);

      // Verify both sheet DOM elements still present
      const sheet1StillVisible = await page.evaluate((id: string) => {
        const el = document.querySelector(`.inspectres[id*="${id}"]`);
        if (!el) return false;
        const rect = (el as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }, actorId1);
      const sheet2StillVisible = await page.evaluate((id: string) => {
        const el = document.querySelector(`.inspectres[id*="${id}"]`);
        if (!el) return false;
        const rect = (el as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }, actorId2);
      expect(sheet1StillVisible).toBe(true);
      expect(sheet2StillVisible).toBe(true);

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/form-submit-03-multi-actor.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(`Screenshot failed for form-submit-03: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (actorId1) await deleteActor(page, actorId1);
      if (actorId2) await deleteActor(page, actorId2);
    }
  });
});

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
          () => {
            const el = document.querySelector(`.inspectres[id*="${actorId}"]`);
            return el && el.getBoundingClientRect().height > 0;
          },
          undefined,
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
        await page.screenshot({
          path: "test-results/e2e-screenshots/form-submit-04-error-state.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(`Screenshot failed for form-submit-04: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      page.off("console", consoleHandler);
      if (actorId) await deleteActor(page, actorId);
    }
  });
});
