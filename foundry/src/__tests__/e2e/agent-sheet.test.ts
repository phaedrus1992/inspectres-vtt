/**
 * E2E: Agent sheet — full control coverage (#496)
 *
 * Tests the AgentSheet action surface and conditional UI paths.
 * Requires Docker Foundry instance (npm run test:e2e).
 */
import { test, expect, ELEMENT_WAIT_TIMEOUT } from "./fixtures.js";
import {
  createActor,
  deleteActor,
  openAgentSheet,
  getChatMessageCount,
  waitForNewChatMessage,
  waitForActorFieldChanged,
  rejoinIfRedirected,
} from "./pages/index.js";

const SKILL_NAMES = ["academics", "athletics", "technology", "contact"] as const;

// Conditional UI paths need specific pre-state that conflicts with the default
// actor setup (isDead, daysOutOfAction, stress+penalty), so they use their own
// actor lifecycle. Everything else (action handlers + stats/notes tab content)
// shares one actor and one test to eliminate redundant create/delete cycles.

test.describe("AgentSheet — actions, stats, and notes", () => {
  let agentId: string;

  test.beforeEach(async ({ page }) => {
    agentId = await createActor(page, "agent", `E2E-agent-${Date.now()}`);
    // All four skills at 2 so roll buttons are active; athletics at 3 for decrease room
    await page.evaluate(async (id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      if (!actor) return;
      await actor.update({
        "system.skills.academics.base": 2,
        "system.skills.athletics.base": 3,
        "system.skills.technology.base": 2,
        "system.skills.contact.base": 2,
      });
    }, agentId);
  });

  test.afterEach(async ({ page }) => {
    await deleteActor(page, agentId);
  });

  test("skill actions, roll, visibility, and tab content", async ({ page, workerUsername }) => {
    let sheet = await openAgentSheet(page, agentId, workerUsername);

    // --- skillRoll: produces a chat message ---
    const beforeRoll = await getChatMessageCount(page);
    await sheet.clickSkillRoll("academics");
    await rejoinIfRedirected(page, workerUsername);

    const dialogVisible = await page.waitForFunction(
      () => {
        const dlg = document.querySelector<HTMLDialogElement>("dialog");
        if (!dlg) return false;
        const rect = dlg.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      undefined,
      { timeout: 5_000 },
    ).then(() => true).catch(() => false);

    if (dialogVisible) {
      await page.click('dialog button[data-action="roll"]').catch(() =>
        page.click('dialog button[type="submit"]:not([data-action="cancel"])').catch(() => {}),
      );
      await rejoinIfRedirected(page, workerUsername);
      await waitForNewChatMessage(page, beforeRoll);
    }

    const afterRoll = await getChatMessageCount(page);
    expect(afterRoll).toBeGreaterThan(beforeRoll);

    // --- skillIncrease + skillDecrease: independent fields, no conflict ---
    // Re-open sheet after any potential rejoin from the roll action.
    sheet = await openAgentSheet(page, agentId, workerUsername);

    const beforeIncrease = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return (actor?.system as { skills: { academics: { base: number } } })?.skills?.academics?.base ?? 0;
    }, agentId);

    await sheet.clickSkillIncrease("academics");
    await rejoinIfRedirected(page, workerUsername);
    await waitForActorFieldChanged(page, agentId, "skills.academics.base", beforeIncrease);

    const afterIncrease = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return (actor?.system as { skills: { academics: { base: number } } })?.skills?.academics?.base ?? 0;
    }, agentId);
    expect(afterIncrease).toBeGreaterThanOrEqual(beforeIncrease);

    // athletics.base starts at 3; decrease operates on an independent field
    await sheet.clickSkillDecrease("athletics");
    await rejoinIfRedirected(page, workerUsername);
    await waitForActorFieldChanged(page, agentId, "skills.athletics.base", 3);

    const afterDecrease = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return (actor?.system as { skills: { athletics: { base: number } } })?.skills?.athletics?.base ?? 0;
    }, agentId);
    expect(afterDecrease).toBeLessThanOrEqual(3);

    // Ensure we're back in the game after any redirects before checking UI.
    await rejoinIfRedirected(page, workerUsername);
    sheet = await openAgentSheet(page, agentId, workerUsername);

    // --- stressRoll button: visible on stats tab ---
    await page.waitForFunction(
      (id: string) => {
        const btn = document.querySelector(`.inspectres[id*="${id}"] [data-action="stressRoll"]`);
        if (!btn) return false;
        const rect = (btn as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      agentId,
      { timeout: ELEMENT_WAIT_TIMEOUT },
    );

    const stressRollVisible = await page.evaluate((id: string) => {
      const btn = document.querySelector(`.inspectres[id*="${id}"] [data-action="stressRoll"]`);
      if (!btn) return false;
      const rect = (btn as HTMLElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, agentId);
    expect(stressRollVisible).toBe(true);

    // --- stats tab: all four skill roll buttons present ---
    for (const skill of SKILL_NAMES) {
      const rollBtnVisible = await page.evaluate(
        (args: { id: string; skill: string }) => {
          const btn = document.querySelector<HTMLElement>(
            `.inspectres[id*="${args.id}"] [data-action="skillRoll"][data-skill="${args.skill}"]`,
          );
          if (!btn) return false;
          const rect = btn.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        },
        { id: agentId, skill },
      );
      expect(rollBtnVisible, `Roll button for ${skill} should be present`).toBe(true);
    }

    // --- addCharacteristic + notes tab button: list grows, button visible ---
    await sheet.openTab("notes");

    const beforeChar = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return ((actor?.system as { characteristics: unknown[] })?.characteristics ?? []).length;
    }, agentId);

    await page.waitForFunction(
      (id: string) => {
        const el = document.querySelector(`.inspectres[id*="${id}"] [data-action="addCharacteristic"]`);
        if (!el) return false;
        const rect = (el as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      agentId,
      { timeout: ELEMENT_WAIT_TIMEOUT },
    );

    const addBtnVisible = await page.evaluate((id: string) => {
      const btn = document.querySelector(`.inspectres[id*="${id}"] [data-action="addCharacteristic"]`);
      if (!btn) return false;
      const rect = (btn as HTMLElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, agentId);
    expect(addBtnVisible).toBe(true);

    await sheet.clickAddCharacteristic();
    await rejoinIfRedirected(page, workerUsername);
    await waitForActorFieldChanged(page, agentId, "characteristics.length", beforeChar);

    const afterChar = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return ((actor?.system as { characteristics: unknown[] })?.characteristics ?? []).length;
    }, agentId);
    expect(afterChar).toBe(beforeChar + 1);
  });
});

test.describe("AgentSheet — conditional UI paths", () => {
  let agentId: string;

  test.beforeEach(async ({ page }) => {
    agentId = await createActor(page, "agent", `E2E-agent-cond-${Date.now()}`);
  });

  test.afterEach(async ({ page }) => {
    await deleteActor(page, agentId);
  });

  // recovery banner and penalty line operate on independent system fields
  // (isDead/daysOutOfAction/recoveryStartedAt vs stress/skills.academics.penalty),
  // so both states can be applied to a single actor in sequence.
  test("recovery banner visible + skill penalty line visible", async ({ page, workerUsername }) => {
    // Set all conditional fields at once — no conflict between them
    await page.evaluate(async (id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      if (!actor) return;
      await actor.update({
        "system.isDead": false,
        "system.daysOutOfAction": 3,
        "system.recoveryStartedAt": 1,
        "system.stress": 2,
        "system.skills.academics.base": 3,
        "system.skills.academics.penalty": 1,
      });
    }, agentId);

    await openAgentSheet(page, agentId, workerUsername);

    // Force re-render so updated fields are reflected in the DOM
    await page.evaluate(async (id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      if (actor) await actor.sheet.render(true);
    }, agentId);

    // --- recovery banner ---
    // waitForFunction: render(true) above is async; poll until the banner appears.
    const bannerVisible = await page.waitForFunction(
      (id: string) => {
        const banner = document.querySelector(`.inspectres[id*="${id}"] .recovery-banner`);
        if (!banner) return false;
        const rect = (banner as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      agentId,
      { timeout: ELEMENT_WAIT_TIMEOUT },
    ).then(() => true).catch(() => false);
    expect(bannerVisible).toBe(true);

    // --- skill penalty line ---
    await page.waitForFunction(
      (id: string) => {
        const el = document.querySelector<HTMLElement>(`.inspectres[id*="${id}"] .skill-penalty-line`);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      agentId,
      { timeout: ELEMENT_WAIT_TIMEOUT },
    ).catch(() => {});

    const penaltyLineExists = await page.evaluate((id: string) => {
      const el = document.querySelector<HTMLElement>(`.inspectres[id*="${id}"] .skill-penalty-line`);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, agentId);
    expect(penaltyLineExists).toBe(true);
  });
});
