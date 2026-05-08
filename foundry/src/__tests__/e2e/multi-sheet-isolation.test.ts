/**
 * Multi-actor sheet isolation E2E tests
 * Covers #502: Two actors open simultaneously, changes to one don't affect the other
 */

import { test, expect } from "./fixtures";
import { AgentSheetPage } from "./pages/AgentSheetPage.js";
import { createActor, deleteActor } from "./pages/index.js";

test.describe("Multi-Sheet Isolation (Issue #502)", () => {
  test("two agent sheets open simultaneously: changes to one don't affect the other", async ({ page }) => {
    const agent1Name = `E2E-multi-1-${Date.now()}`;
    const agent2Name = `E2E-multi-2-${Date.now()}`;
    let actorId1: string | null = null;
    let actorId2: string | null = null;

    try {
      actorId1 = await createActor(page, "agent", agent1Name);
      actorId2 = await createActor(page, "agent", agent2Name);

      const agent1 = new AgentSheetPage(page, actorId1);
      const agent2 = new AgentSheetPage(page, actorId2);

      // Open agent 1 sheet
      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId1);

      await agent1.waitForVisible();

      // Open agent 2 sheet
      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(id);
        if (actor) await actor.sheet.render(true);
      }, actorId2);

      await agent2.waitForVisible();

      // Verify both sheets are visible in DOM
      const sheet1Visible = await page.evaluate((id: string) => {
        const el = document.querySelector(`.inspectres[id*="${id}"]`);
        return el ? (el as HTMLElement).getBoundingClientRect().height > 0 : false;
      }, actorId1);
      expect(sheet1Visible).toBe(true);

      const sheet2Visible = await page.evaluate((id: string) => {
        const el = document.querySelector(`.inspectres[id*="${id}"]`);
        return el ? (el as HTMLElement).getBoundingClientRect().height > 0 : false;
      }, actorId2);
      expect(sheet2Visible).toBe(true);

      // Get initial state of both agents
      const initialState1 = await agent1.getSystemData();
      const initialState2 = await agent2.getSystemData();

      // Modify agent1 stress
      const newStress = ((initialState1["stress"] as number ?? 0) + 1) % 7;
      await agent1.setStress(newStress);

      // Verify agent1 changed
      const updatedState1 = await agent1.getSystemData();
      expect(updatedState1["stress"]).toBe(newStress);

      // Verify agent2 is unchanged
      const updatedState2 = await agent2.getSystemData();
      expect(updatedState2["stress"]).toBe(initialState2["stress"]);

      // Verify both sheets still visible and rendered
      const sheet1StillVisible = await page.evaluate((id: string) => {
        const el = document.querySelector(`.inspectres[id*="${id}"]`);
        return el ? (el as HTMLElement).getBoundingClientRect().height > 0 : false;
      }, actorId1);
      expect(sheet1StillVisible).toBe(true);

      const sheet2StillVisible = await page.evaluate((id: string) => {
        const el = document.querySelector(`.inspectres[id*="${id}"]`);
        return el ? (el as HTMLElement).getBoundingClientRect().height > 0 : false;
      }, actorId2);
      expect(sheet2StillVisible).toBe(true);

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/multi-sheet-01-isolation.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(`Screenshot failed for multi-sheet-01: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (actorId1) await deleteActor(page, actorId1);
      if (actorId2) await deleteActor(page, actorId2);
    }
  });

  test("sheet close: closing one sheet doesn't close the other", async ({ page }) => {
    const agent1Name = `E2E-close-1-${Date.now()}`;
    const agent2Name = `E2E-close-2-${Date.now()}`;
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

      // Close agent1 sheet — await to let the close animation/promise complete before polling
      await page.evaluate(async (id: string) => {
        // @ts-expect-error - Foundry runtime global
        const sheet = globalThis.game?.actors?.get(id)?.sheet;
        if (sheet?.element instanceof HTMLElement) {
          await sheet.close();
        }
      }, actorId1);

      // Wait for agent1 sheet to disappear (or be hidden); v14 may keep the element
      // briefly during teardown — accept either removal or zero-size.
      await page.waitForFunction(
        (id: string) => {
          const el = document.querySelector(`.inspectres[id*="${id}"]`);
          if (!el) return true;
          const rect = (el as HTMLElement).getBoundingClientRect();
          return rect.width === 0 && rect.height === 0;
        },
        actorId1,
        { timeout: 10_000 },
      );

      // Verify agent1 is gone (or hidden)
      const sheet1Gone = await page.evaluate((id: string) => {
        const el = document.querySelector(`.inspectres[id*="${id}"]`);
        if (!el) return true;
        const rect = (el as HTMLElement).getBoundingClientRect();
        return rect.width === 0 && rect.height === 0;
      }, actorId1);
      expect(sheet1Gone).toBe(true);

      // Verify agent2 is still visible
      const sheet2StillVisible = await page.evaluate((id: string) => {
        const el = document.querySelector(`.inspectres[id*="${id}"]`);
        return el ? (el as HTMLElement).getBoundingClientRect().height > 0 : false;
      }, actorId2);
      expect(sheet2StillVisible).toBe(true);

      try {
        await page.screenshot({
          path: "test-results/e2e-screenshots/multi-sheet-02-close-isolation.png",
          timeout: 5000,
        });
      } catch (err) {
        console.error(`Screenshot failed for multi-sheet-02: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (actorId1) await deleteActor(page, actorId1);
      if (actorId2) await deleteActor(page, actorId2);
    }
  });
});
