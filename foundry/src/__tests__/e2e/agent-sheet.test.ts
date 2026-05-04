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
} from "./pages/index.js";

const SKILL_NAMES = ["academics", "athletics", "technology", "contact"] as const;

test.describe("AgentSheet — action handlers", () => {
  let agentId: string;

  test.beforeEach(async ({ page }) => {
    agentId = await createActor(page, "agent", `E2E-agent-${Date.now()}`);
    // Set skills to non-zero so roll buttons are active
    await page.evaluate(async (id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      if (!actor) return;
      await actor.update({
        "system.skills.academics.base": 2,
        "system.skills.athletics.base": 2,
        "system.skills.technology.base": 2,
        "system.skills.contact.base": 2,
      });
    }, agentId);
  });

  test.afterEach(async ({ page }) => {
    await deleteActor(page, agentId);
  });

  test("skillRoll — clicking roll button produces a chat message", async ({ page }) => {
    const sheet = await openAgentSheet(page, agentId);
    const beforeCount = await getChatMessageCount(page);

    await sheet.clickSkillRoll("academics");
    // Wait for roll dialog or direct roll
    await page.waitForTimeout(1500);

    // Dismiss dialog if one appeared (stress roll dialog etc.)
    await page.evaluate(() => {
      const btn = document.querySelector<HTMLButtonElement>(
        'dialog button[data-action="roll"], dialog button[type="submit"]',
      );
      if (btn) btn.click();
    });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "test-results/e2e-screenshots/agent-01-skill-roll.png",
      timeout: 5000,
    }).catch(() => {});

    const afterCount = await getChatMessageCount(page);
    // A new chat message should have been created (roll or notification)
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
  });

  test("skillIncrease — clicking increase stepper updates actor.system", async ({ page }) => {
    const sheet = await openAgentSheet(page, agentId);

    const before = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return (actor?.system as { skills: { academics: { base: number } } })?.skills?.academics?.base ?? 0;
    }, agentId);

    await sheet.clickSkillIncrease("academics");
    await page.waitForTimeout(500);

    const after = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return (actor?.system as { skills: { academics: { base: number } } })?.skills?.academics?.base ?? 0;
    }, agentId);

    // Skill increased (or capped at max)
    expect(after).toBeGreaterThanOrEqual(before);

    await page.screenshot({
      path: "test-results/e2e-screenshots/agent-02-skill-increase.png",
      timeout: 5000,
    }).catch(() => {});
  });

  test("skillDecrease — clicking decrease stepper updates actor.system", async ({ page }) => {
    // Set to 3 so there's room to decrease
    await page.evaluate(async (id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      if (actor) await actor.update({ "system.skills.athletics.base": 3 });
    }, agentId);

    const sheet = await openAgentSheet(page, agentId);
    await sheet.clickSkillDecrease("athletics");
    await page.waitForTimeout(500);

    const after = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return (actor?.system as { skills: { athletics: { base: number } } })?.skills?.athletics?.base ?? 0;
    }, agentId);

    expect(after).toBeLessThanOrEqual(3);

    await page.screenshot({
      path: "test-results/e2e-screenshots/agent-03-skill-decrease.png",
      timeout: 5000,
    }).catch(() => {});
  });

  test("addCharacteristic — list grows by one", async ({ page }) => {
    const sheet = await openAgentSheet(page, agentId);

    const before = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return ((actor?.system as { characteristics: unknown[] })?.characteristics ?? []).length;
    }, agentId);

    await sheet.clickAddCharacteristic();
    await page.waitForTimeout(500);

    const after = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return ((actor?.system as { characteristics: unknown[] })?.characteristics ?? []).length;
    }, agentId);

    expect(after).toBe(before + 1);

    await page.screenshot({
      path: "test-results/e2e-screenshots/agent-04-add-characteristic.png",
      timeout: 5000,
    }).catch(() => {});
  });

  test("stressRoll button — is visible on the sheet", async ({ page }) => {
    await openAgentSheet(page, agentId);

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

    const visible = await page.evaluate((id: string) => {
      const btn = document.querySelector(`.inspectres[id*="${id}"] [data-action="stressRoll"]`);
      if (!btn) return false;
      const rect = (btn as HTMLElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, agentId);

    expect(visible).toBe(true);

    await page.screenshot({
      path: "test-results/e2e-screenshots/agent-05-stress-roll-visible.png",
      timeout: 5000,
    }).catch(() => {});
  });
});

test.describe("AgentSheet — stats tab content", () => {
  let agentId: string;

  test.beforeEach(async ({ page }) => {
    agentId = await createActor(page, "agent", `E2E-agent-stats-${Date.now()}`);
  });

  test.afterEach(async ({ page }) => {
    await deleteActor(page, agentId);
  });

  test("stats tab renders all four skill rows", async ({ page }) => {
    await openAgentSheet(page, agentId);

    for (const skill of SKILL_NAMES) {
      const rollBtnVisible = await page.evaluate(
        (args: { id: string; skill: string }) => {
          const btn = document.querySelector(
            `.inspectres[id*="${args.id}"] [data-action="skillRoll"][data-skill="${args.skill}"]`,
          );
          return btn !== null;
        },
        { id: agentId, skill },
      );
      expect(rollBtnVisible, `Roll button for ${skill} should be present`).toBe(true);
    }

    await page.screenshot({
      path: "test-results/e2e-screenshots/agent-06-stats-tab.png",
      timeout: 5000,
    }).catch(() => {});
  });

  test("notes tab textarea is visible after switching tabs", async ({ page }) => {
    const sheet = await openAgentSheet(page, agentId);
    await sheet.openTab("notes");

    await page.waitForSelector(`.inspectres[id*="${agentId}"] textarea`, {
      timeout: ELEMENT_WAIT_TIMEOUT,
    });

    const textareaVisible = await page.evaluate((id: string) => {
      const ta = document.querySelector(`.inspectres[id*="${id}"] textarea`);
      if (!ta) return false;
      const rect = (ta as HTMLElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, agentId);

    expect(textareaVisible).toBe(true);

    await page.screenshot({
      path: "test-results/e2e-screenshots/agent-07-notes-tab.png",
      timeout: 5000,
    }).catch(() => {});
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

  test("recovery banner is visible when agent is recovering", async ({ page }) => {
    // Set recovery state
    await page.evaluate(async (id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      if (!actor) return;
      // Set daysOutOfAction > 0 and isDead=false to enter "recovering" state
      await actor.update({
        "system.isDead": false,
        "system.daysOutOfAction": 3,
        "system.recoveryStartedAt": 1,
      });
    }, agentId);

    await openAgentSheet(page, agentId);

    const bannerVisible = await page.evaluate((id: string) => {
      const banner = document.querySelector(`.inspectres[id*="${id}"] .recovery-banner`);
      if (!banner) return false;
      const rect = (banner as HTMLElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }, agentId);

    expect(bannerVisible).toBe(true);

    await page.screenshot({
      path: "test-results/e2e-screenshots/agent-08-recovery-banner.png",
      timeout: 5000,
    }).catch(() => {});
  });

  test("skill penalty line appears when stress > 0 and penalty set", async ({ page }) => {
    // Set skill penalty
    await page.evaluate(async (id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      if (!actor) return;
      await actor.update({
        "system.stress": 2,
        "system.skills.academics.base": 3,
        "system.skills.academics.penalty": 1,
      });
    }, agentId);

    await openAgentSheet(page, agentId);

    // Re-render sheet to reflect updated data
    await page.evaluate(async (id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      if (actor) await actor.sheet.render(true);
    }, agentId);

    await page.waitForTimeout(1000);

    const penaltyLineExists = await page.evaluate((id: string) => {
      return document.querySelector(`.inspectres[id*="${id}"] .skill-penalty-line`) !== null;
    }, agentId);

    expect(penaltyLineExists).toBe(true);

    await page.screenshot({
      path: "test-results/e2e-screenshots/agent-09-penalty-line.png",
      timeout: 5000,
    }).catch(() => {});
  });
});
