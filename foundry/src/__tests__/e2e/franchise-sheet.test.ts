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
import { test, expect, ELEMENT_WAIT_TIMEOUT } from "./fixtures.js";
import {
  createActor,
  deleteActor,
  getChatMessageCount,
  openFranchiseSheet,
  waitForNewChatMessage,
  waitForActorFieldChanged,
  waitForActorFieldEquals,
} from "./pages/index.js";

test.describe("FranchiseSheet — roll actions and mission tracker", () => {
  let franchiseId: string;

  test.beforeEach(async ({ page }) => {
    franchiseId = await createActor(page, "franchise", `E2E-franchise-${Date.now()}`);
    await page.evaluate(async (id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      if (actor) await actor.update({ "system.bank": 5 });
    }, franchiseId);
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

    await page.screenshot({
      path: "test-results/e2e-screenshots/franchise-01-bank-roll.png",
      timeout: 5000,
    }).catch(() => {});

    const afterBank = await getChatMessageCount(page);
    expect(afterBank).toBeGreaterThanOrEqual(beforeBank);

    // Client roll (independent of bank dice consumption)
    const beforeClient = afterBank;
    await sheet.clickClientRoll();
    await waitForNewChatMessage(page, beforeClient);

    await page.screenshot({
      path: "test-results/e2e-screenshots/franchise-02-client-roll.png",
      timeout: 5000,
    }).catch(() => {});

    const afterClient = await getChatMessageCount(page);
    expect(afterClient).toBeGreaterThanOrEqual(beforeClient);

    // Mission tracker (no bank dependency; opens on same sheet instance)
    await sheet.clickOpenMissionTracker();
    await page.waitForFunction(
      () =>
        document.querySelector("#inspectres-mission-tracker") !== null ||
        document.querySelector(".inspectres-mission-tracker-window") !== null ||
        document.querySelector(".mission-tracker") !== null,
      undefined,
      { timeout: ELEMENT_WAIT_TIMEOUT },
    ).catch(() => {});

    await page.screenshot({
      path: "test-results/e2e-screenshots/franchise-03-mission-tracker.png",
      timeout: 5000,
    }).catch(() => {});

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
    franchiseId = await createActor(page, "franchise", `E2E-franchise-day-${Date.now()}`);
  });

  test.afterEach(async ({ page }) => {
    await deleteActor(page, franchiseId);
  });

  // Post-state of advance (day N+1) is valid pre-state for regress → day N.
  test("advanceDay + regressDay — currentDay increments then decrements", async ({ page }) => {
    // Start at a known value so regress never hits the floor
    await page.evaluate(async () => {
      // @ts-expect-error - Foundry runtime global
      await globalThis.game?.settings?.set("inspectres", "currentDay", 5);
    });

    const sheet = await openFranchiseSheet(page, franchiseId);
    const initial = await sheet.getCurrentDaySetting();

    await sheet.clickAdvanceDay();
    await page.waitForFunction(
      (prev: number) => {
        try {
          // @ts-expect-error - Foundry runtime global
          return ((globalThis.game?.settings?.get("inspectres", "currentDay") as number) ?? 1) !== prev;
        } catch {
          return false;
        }
      },
      initial,
      { timeout: ELEMENT_WAIT_TIMEOUT },
    ).catch(() => {});

    const afterAdvance = await sheet.getCurrentDaySetting();
    expect(afterAdvance).toBe(initial + 1);

    await page.screenshot({
      path: "test-results/e2e-screenshots/franchise-04-advance-day.png",
      timeout: 5000,
    }).catch(() => {});

    await sheet.clickRegressDay();
    await page.waitForFunction(
      (prev: number) => {
        try {
          // @ts-expect-error - Foundry runtime global
          return ((globalThis.game?.settings?.get("inspectres", "currentDay") as number) ?? 1) !== prev;
        } catch {
          return false;
        }
      },
      afterAdvance,
      { timeout: ELEMENT_WAIT_TIMEOUT },
    ).catch(() => {});

    const afterRegress = await sheet.getCurrentDaySetting();
    expect(afterRegress).toBe(initial);

    await page.screenshot({
      path: "test-results/e2e-screenshots/franchise-05-regress-day.png",
      timeout: 5000,
    }).catch(() => {});
  });
});

test.describe("FranchiseSheet — debt mode", () => {
  let franchiseId: string;

  test.beforeEach(async ({ page }) => {
    franchiseId = await createActor(page, "franchise", `E2E-franchise-debt-${Date.now()}`);
    // bank:0 + debtMode:false required; conflicts with roll tests' bank:5 setup
    await page.evaluate(async (id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      if (actor) await actor.update({ "system.bank": 0, "system.debtMode": false });
    }, franchiseId);
  });

  test.afterEach(async ({ page }) => {
    await deleteActor(page, franchiseId);
  });

  test("toggleDebtMode — debtMode flag changes", async ({ page }) => {
    const sheet = await openFranchiseSheet(page, franchiseId);
    await sheet.openTab("notes");

    const before = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return (actor?.system as { debtMode: boolean })?.debtMode ?? false;
    }, franchiseId);

    await sheet.clickToggleDebtMode();
    await waitForActorFieldChanged(page, franchiseId, "debtMode", before);

    const after = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return (actor?.system as { debtMode: boolean })?.debtMode ?? false;
    }, franchiseId);

    expect(after).toBe(!before);

    await page.screenshot({
      path: "test-results/e2e-screenshots/franchise-06-debt-mode.png",
      timeout: 5000,
    }).catch(() => {});
  });
});

test.describe("FranchiseSheet — form-bound inputs", () => {
  let franchiseId: string;

  test.beforeEach(async ({ page }) => {
    franchiseId = await createActor(page, "franchise", `E2E-franchise-form-${Date.now()}`);
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

    const bankValue = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return (actor?.system as { bank: number })?.bank ?? 0;
    }, franchiseId);
    expect(bankValue).toBe(7);

    await page.screenshot({
      path: "test-results/e2e-screenshots/franchise-07-bank-input.png",
      timeout: 5000,
    }).catch(() => {});

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

    const savedDescription = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return (actor?.system as { description: string })?.description ?? "";
    }, franchiseId);
    expect(savedDescription).toBe(testText);

    await page.screenshot({
      path: "test-results/e2e-screenshots/franchise-08-description.png",
      timeout: 5000,
    }).catch(() => {});

    // --- missionGoal input (back to stats tab) ---
    await sheet.openTab("stats");

    const missionGoalInput = page.locator(
      `.inspectres[id*="${franchiseId}"] input[name="system.missionGoal"]`,
    ).first();

    await missionGoalInput.waitFor({ state: "visible", timeout: ELEMENT_WAIT_TIMEOUT });
    await missionGoalInput.fill("10");
    await missionGoalInput.press("Tab");
    await waitForActorFieldEquals(page, franchiseId, "missionGoal", 10);

    const missionGoalValue = await page.evaluate((id: string) => {
      // @ts-expect-error - Foundry runtime global
      const actor = globalThis.game?.actors?.get(id);
      return (actor?.system as { missionGoal: number })?.missionGoal ?? 0;
    }, franchiseId);
    expect(missionGoalValue).toBe(10);

    await page.screenshot({
      path: "test-results/e2e-screenshots/franchise-09-mission-goal.png",
      timeout: 5000,
    }).catch(() => {});
  });
});
