/**
 * Multi-actor sheet workflows E2E tests
 * Covers #502 from Sprint 525
 */

import { test, expect } from "./fixtures";
import { safeScreenshot } from "./helpers.js";
import { AgentSheetPage } from "./pages/AgentSheetPage.js";
import { createActor, deleteActor } from "./pages/index.js";

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
        await safeScreenshot(page, "test-results/e2e-screenshots/form-submit-03-multi-actor.png");
      } catch (err) {
        console.error(`Screenshot failed for form-submit-03: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      if (actorId1) await deleteActor(page, actorId1);
      if (actorId2) await deleteActor(page, actorId2);
    }
  });
});
