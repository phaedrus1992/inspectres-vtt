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
  waitForElementVisible,
  getActorSystemField,
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

  test("skill actions, roll, visibility, and tab content", async ({ page }) => {
    let sheet = await openAgentSheet(page, agentId);

    // --- skillRoll: produces a chat message ---
    const beforeRoll = await getChatMessageCount(page);
    await sheet.clickSkillRoll("academics");

    // Wait up to 15s for the dialog: under CI load on Foundry 13, the dialog can take
    // >5s to render after a skill-roll click (matches other dialog tests in this suite).
    await page.waitForFunction(
      () => {
        const dlg = document.querySelector<HTMLDialogElement>("dialog");
        if (!dlg) return false;
        const rect = dlg.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      undefined,
      { timeout: 15_000 },
    );

    {
      try {
        await page.click('dialog button[data-action="roll"]');
      } catch (primaryError) {
        try {
          await page.click('dialog button[type="submit"]:not([data-action="cancel"])');
        } catch (fallbackError) {
          const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
          const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          throw new Error(
            `Failed to click roll dialog button. Primary selector 'dialog button[data-action="roll"]' failed: ${primaryMsg}. Fallback selector 'dialog button[type="submit"]:not([data-action="cancel"])' also failed: ${fallbackMsg}. Check dialog structure for changes.`,
            { cause: primaryError },
          );
        }
      }
      await waitForNewChatMessage(page, beforeRoll);
    }

    const afterRoll = await getChatMessageCount(page);
    expect(afterRoll).toBeGreaterThan(beforeRoll);

    // --- skillIncrease + skillDecrease: independent fields, no conflict ---
    sheet = await openAgentSheet(page, agentId);

    const beforeIncrease = await getActorSystemField<number>(page, agentId, "skills.academics.base", 0);

    await sheet.clickSkillIncrease("academics");
    await waitForActorFieldChanged(page, agentId, "skills.academics.base", beforeIncrease);

    const afterIncrease = await getActorSystemField<number>(page, agentId, "skills.academics.base", 0);
    expect(afterIncrease).toBeGreaterThanOrEqual(beforeIncrease);

    // athletics.base starts at 3; decrease operates on an independent field
    await sheet.clickSkillDecrease("athletics");
    await waitForActorFieldChanged(page, agentId, "skills.athletics.base", 3);

    const afterDecrease = await getActorSystemField<number>(page, agentId, "skills.athletics.base", 0);
    expect(afterDecrease).toBeLessThanOrEqual(3);

    sheet = await openAgentSheet(page, agentId);

    // --- stressRoll button: visible on stats tab ---
    await waitForElementVisible(
      page,
      `.inspectres[id*="${agentId}"] [data-action="stressRoll"]`,
      ELEMENT_WAIT_TIMEOUT,
    );

    // --- stats tab: all four skill roll buttons present ---
    for (const skill of SKILL_NAMES) {
      await waitForElementVisible(
        page,
        `.inspectres[id*="${agentId}"] [data-action="skillRoll"][data-skill="${skill}"]`,
        ELEMENT_WAIT_TIMEOUT,
      );
    }

    // --- addCharacteristic + notes tab button: list grows, button visible ---
    await sheet.openTab("notes");

    const beforeCharArr = await getActorSystemField<unknown[]>(page, agentId, "characteristics", []);
    const beforeChar = beforeCharArr.length;

    await waitForElementVisible(
      page,
      `.inspectres[id*="${agentId}"] [data-action="addCharacteristic"]`,
      ELEMENT_WAIT_TIMEOUT,
    );

    await sheet.clickAddCharacteristic();
    await waitForActorFieldChanged(page, agentId, "characteristics.length", beforeChar);

    const afterCharArr = await getActorSystemField<unknown[]>(page, agentId, "characteristics", []);
    expect(afterCharArr.length).toBe(beforeChar + 1);
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
  test("recovery banner visible + skill penalty line visible", async ({ page }) => {
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

    await openAgentSheet(page, agentId);

    // Force re-render so updated fields are reflected in the DOM
    await page.evaluate(async (id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      if (actor) await actor.sheet.render(true);
    }, agentId);

    // --- recovery banner ---
    await waitForElementVisible(
      page,
      `.inspectres[id*="${agentId}"] .recovery-banner`,
      ELEMENT_WAIT_TIMEOUT,
    );

    // --- skill penalty line ---
    await waitForElementVisible(
      page,
      `.inspectres[id*="${agentId}"] .skill-penalty-line`,
      ELEMENT_WAIT_TIMEOUT,
    );
  });
});
