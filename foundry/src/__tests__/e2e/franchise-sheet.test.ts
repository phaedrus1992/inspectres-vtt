/**
 * E2E: Franchise sheet — full control coverage (#497)
 *
 * Tests the FranchiseSheet action surface, day controls, debt mode, and form inputs.
 * Requires Docker Foundry instance (npm run test:e2e).
 *
 * Actor groupings:
 * - Roll actions + mission tracker: bank:5 prereq; openMissionTracker needs no bank
 * - Day controls: currentDay setting; no actor data dependency
 * - Debt mode: needs bank:0, debtMode:false — conflicts with roll actor's bank:5
 * - Form inputs: independent fields (bank, description, missionGoal) — one actor
 */
import type { Page } from "@playwright/test";
import { test, expect, ELEMENT_WAIT_TIMEOUT } from "./fixtures.js";
import { safeScreenshot } from "./helpers.js";
import {
  createActor,
  deleteActor,
  getChatMessageCount,
  openFranchiseSheet,
  waitForNewChatMessage,
  waitForActorFieldChanged,
  waitForActorFieldEquals,
  waitForElementVisible,
  getActorSystemField,
  assertSheetAccessibility,
} from "./pages/index.js";

/**
 * Create franchise actor with optional system field updates.
 */
async function createFranchiseWithDefaults(
  page: Page,
  namePrefix: string,
  updates?: Record<string, unknown>,
): Promise<string> {
  const id = await createActor(page, "franchise", `${namePrefix}-${Date.now()}`);
  if (updates && Object.keys(updates).length > 0) {
    await page.evaluate(
      async (args: { id: string; updates: Record<string, unknown> }) => {
        // @ts-expect-error - Foundry runtime global
        const actor = globalThis.game?.actors?.get(args.id);
        if (actor) await actor.update(args.updates);
      },
      { id, updates },
    );
  }
  return id;
}

test.describe("FranchiseSheet — roll actions and mission tracker", () => {
  let franchiseId: string;

  test.beforeEach(async ({ page }) => {
    franchiseId = await createFranchiseWithDefaults(page, "E2E-franchise", { "system.bank": 5 });
  });

  test.afterEach(async ({ page }) => {
    await deleteActor(page, franchiseId);
  });

  // bankRoll, clientRoll, and openMissionTracker all operate independently:
  // clientRoll does not consume bank dice; mission tracker is pure UI state.
  test("bankRoll + clientRoll produce chat messages; mission tracker opens", async ({ page }) => {
    const sheet = await openFranchiseSheet(page, franchiseId);

    // Bank roll
    const beforeBank = await getChatMessageCount(page);
    await sheet.clickBankRoll();
    await waitForNewChatMessage(page, beforeBank);

    await safeScreenshot(page, "test-results/e2e-screenshots/franchise-01-bank-roll.png");

    const afterBank = await getChatMessageCount(page);
    expect(afterBank).toBeGreaterThanOrEqual(beforeBank);

    // Client roll (independent of bank dice consumption)
    const beforeClient = afterBank;
    await sheet.clickClientRoll();
    await waitForNewChatMessage(page, beforeClient);

    await safeScreenshot(page, "test-results/e2e-screenshots/franchise-02-client-roll.png");

    const afterClient = await getChatMessageCount(page);
    expect(afterClient).toBeGreaterThanOrEqual(beforeClient);

    // Mission tracker (no bank dependency; opens on same sheet instance)
    await sheet.clickOpenMissionTracker();
    // Surface a real failure if the tracker doesn't open — the assertion below
    // catches presence, but a thrown wait gives a much clearer error message.
    await waitForElementVisible(
      page,
      "#inspectres-mission-tracker, .inspectres-mission-tracker-window, .mission-tracker",
      ELEMENT_WAIT_TIMEOUT,
    );

    await safeScreenshot(page, "test-results/e2e-screenshots/franchise-03-mission-tracker.png");

    const trackerOpen = await page.evaluate(() => {
      return (
        document.querySelector("#inspectres-mission-tracker") !== null ||
        document.querySelector(".inspectres-mission-tracker-window") !== null ||
        document.querySelector(".mission-tracker") !== null
      );
    });
    expect(trackerOpen).toBe(true);

    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForFunction(
      () => document.querySelector("dialog[open]") === null,
      undefined,
      { timeout: 5_000 },
    ).catch(() => {});
  });
});

test.describe("FranchiseSheet — day controls", () => {
  let franchiseId: string;

  test.beforeEach(async ({ page }) => {
    franchiseId = await createFranchiseWithDefaults(page, "E2E-franchise-day");
  });

  test.afterEach(async ({ page }) => {
    await deleteActor(page, franchiseId);
  });

  // Post-state of advance (day N+1) is valid pre-state for regress → day N.
  // Assert BOTH the underlying setting AND the rendered DOM. A test that only
  // checks the setting passes when the button fires but the sheet never
  // re-renders — the user sees no change while the test goes green.
  test("advanceDay + regressDay — setting + DOM increment then decrement", async ({ page }) => {
    // Start at a known value so regress never hits the floor
    await page.evaluate(async () => {
      // @ts-expect-error - Foundry runtime global
      await globalThis.game?.settings?.set("inspectres", "currentDay", 5);
    });

    const sheet = await openFranchiseSheet(page, franchiseId);
    const initial = await sheet.getCurrentDaySetting();
    expect(await sheet.getDisplayedDay()).toBe(initial);

    await sheet.clickAdvanceDay();
    await page.waitForFunction(
      (prev: number) => {
        const el = document.querySelector('.application.sheet.inspectres.franchise .day-display');
        const match = el?.textContent?.match(/(\d+)/);
        return match?.[1] !== undefined && Number(match[1]) !== prev;
      },
      initial,
      { timeout: ELEMENT_WAIT_TIMEOUT },
    );

    expect(await sheet.getCurrentDaySetting()).toBe(initial + 1);
    expect(await sheet.getDisplayedDay()).toBe(initial + 1);

    await safeScreenshot(page, "test-results/e2e-screenshots/franchise-04-advance-day.png");

    await sheet.clickRegressDay();
    await page.waitForFunction(
      (prev: number) => {
        const el = document.querySelector('.application.sheet.inspectres.franchise .day-display');
        const match = el?.textContent?.match(/(\d+)/);
        return match?.[1] !== undefined && Number(match[1]) !== prev;
      },
      initial + 1,
      { timeout: ELEMENT_WAIT_TIMEOUT },
    );

    expect(await sheet.getCurrentDaySetting()).toBe(initial);
    expect(await sheet.getDisplayedDay()).toBe(initial);

    await safeScreenshot(page, "test-results/e2e-screenshots/franchise-05-regress-day.png");
  });
});

test.describe("FranchiseSheet — debt mode", () => {
  let franchiseId: string;

  test.beforeEach(async ({ page }) => {
    // bank:0 + debtMode:false required; conflicts with roll tests' bank:5 setup
    franchiseId = await createFranchiseWithDefaults(page, "E2E-franchise-debt", {
      "system.bank": 0,
      "system.debtMode": false,
    });
  });

  test.afterEach(async ({ page }) => {
    await deleteActor(page, franchiseId);
  });

  test("toggleDebtMode — debtMode flag changes", async ({ page }) => {
    const sheet = await openFranchiseSheet(page, franchiseId);
    await sheet.openTab("notes");

    const before = await getActorSystemField<boolean>(page, franchiseId, "debtMode", false);

    await sheet.clickToggleDebtMode();
    await waitForActorFieldChanged(page, franchiseId, "debtMode", before);

    const after = await getActorSystemField<boolean>(page, franchiseId, "debtMode", false);

    expect(after).toBe(!before);

    await safeScreenshot(page, "test-results/e2e-screenshots/franchise-06-debt-mode.png");
  });
});

test.describe("FranchiseSheet — form-bound inputs", () => {
  let franchiseId: string;

  test.beforeEach(async ({ page }) => {
    franchiseId = await createFranchiseWithDefaults(page, "E2E-franchise-form");
  });

  test.afterEach(async ({ page }) => {
    await deleteActor(page, franchiseId);
  });

  // bank, description, and missionGoal are independent fields; filling each in
  // sequence on the same actor produces no state conflict.
  test("bank, description, and missionGoal inputs persist via actor.update", async ({ page }) => {
    const sheet = await openFranchiseSheet(page, franchiseId);

    // --- bank input ---
    const bankInput = page.locator(
      `.inspectres[id*="${franchiseId}"] input[name="system.bank"]`,
    ).first();

    await bankInput.waitFor({ state: "visible", timeout: ELEMENT_WAIT_TIMEOUT });
    await bankInput.fill("7");
    await bankInput.press("Tab");
    await waitForActorFieldEquals(page, franchiseId, "bank", 7);

    const bankValue = await getActorSystemField<number>(page, franchiseId, "bank", 0);
    expect(bankValue).toBe(7);

    await safeScreenshot(page, "test-results/e2e-screenshots/franchise-07-bank-input.png");

    // --- description textarea (notes tab) ---
    await sheet.openTab("notes");

    const textarea = page.locator(
      `.inspectres[id*="${franchiseId}"] textarea`,
    ).first();

    await textarea.waitFor({ state: "visible", timeout: ELEMENT_WAIT_TIMEOUT });
    const testText = "E2E description test";
    await textarea.fill(testText);
    await textarea.press("Tab");
    await waitForActorFieldEquals(page, franchiseId, "description", testText);

    const savedDescription = await getActorSystemField<string>(page, franchiseId, "description", "");
    expect(savedDescription).toBe(testText);

    await safeScreenshot(page, "test-results/e2e-screenshots/franchise-08-description.png");

    // --- missionGoal input (back to stats tab) ---
    await sheet.openTab("stats");

    const missionGoalInput = page.locator(
      `.inspectres[id*="${franchiseId}"] input[name="system.missionGoal"]`,
    ).first();

    await missionGoalInput.waitFor({ state: "visible", timeout: ELEMENT_WAIT_TIMEOUT });
    await missionGoalInput.fill("10");
    await missionGoalInput.press("Tab");
    await waitForActorFieldEquals(page, franchiseId, "missionGoal", 10);

    const missionGoalValue = await getActorSystemField<number>(page, franchiseId, "missionGoal", 0);
    expect(missionGoalValue).toBe(10);

    await safeScreenshot(page, "test-results/e2e-screenshots/franchise-09-mission-goal.png");
  });
});

test.describe("FranchiseSheet — accessibility", () => {
  let franchiseId: string;

  test.beforeEach(async ({ page }) => {
    franchiseId = await createFranchiseWithDefaults(page, "E2E-franchise-a11y");
  });

  test.afterEach(async ({ page }) => {
    await deleteActor(page, franchiseId);
  });

  test("all tabs pass WCAG AA contrast", async ({ page }) => {
    const sheet = await openFranchiseSheet(page, franchiseId);
    for (const tab of ["stats", "notes"] as const) {
      await sheet.openTab(tab);
      await assertSheetAccessibility(page, franchiseId);
    }
  });
});
