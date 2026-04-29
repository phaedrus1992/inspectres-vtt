import { test as base, expect, type Page } from "@playwright/test";

const JOIN_TIMEOUT = 30_000;
const READY_TIMEOUT = 60_000;
const SHEET_RENDER_TIMEOUT = 5_000;

async function dismissStartupNotifications(page: Page): Promise<void> {
  // Foundry V13 startup warnings (hardware acceleration, screen size) are
  // permanent <li class="notification"> elements with no close button — they
  // can only be removed via DOM. Don't press ESC: it toggles the game menu
  // and opens an overlay that intercepts subsequent clicks.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll(".notification.permanent")) {
      el.remove();
    }
  });
}

async function unpauseGame(page: Page): Promise<void> {
  // Foundry starts paused; tests that rely on hooks/animations need it running.
  await page.evaluate(() => {
    // @ts-expect-error - Foundry runtime global
    if (globalThis.game?.paused) globalThis.game.togglePause(false);
  });
}

async function openFranchiseSheet(page: Page): Promise<void> {
  // Tests need a sheet open with form fields, tabs, etc. Franchise sheet renders
  // reliably on a fresh world (agent sheet has a render bug with default state).
  await page.evaluate(async () => {
    // @ts-expect-error - Foundry runtime globals
    const ActorCls = globalThis.CONFIG?.Actor?.documentClass ?? globalThis.Actor;
    // @ts-expect-error - Foundry runtime global
    let franchise = globalThis.game.actors.find(
      (a: { type: string; name: string }) => a.type === "franchise" && a.name === "E2E Franchise",
    );
    if (!franchise) {
      franchise = await ActorCls.create({ name: "E2E Franchise", type: "franchise" });
    }
    await franchise.sheet.render(true);
  });
  await page.waitForSelector(".inspectres", { timeout: SHEET_RENDER_TIMEOUT });
}

/**
 * Per-test fixture that ensures `page` is in the Foundry game UI with a sheet open.
 *
 * Foundry sessions don't survive across browser contexts, so the auto-launched world
 * places each fresh context on /join. This fixture:
 *   1. Joins the game as Gamemaster.
 *   2. Waits for `game.ready`.
 *   3. Dismisses permanent startup notifications.
 *   4. Unpauses the game.
 *   5. Opens a franchise sheet so DOM elements expected by tests (tabs, inputs, etc.) exist.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    if (page.url().includes("/join")) {
      await page.selectOption('select[name="userid"]', { label: "Gamemaster" });
      await page.click('button[type="submit"]:has-text("Join Game Session")');
      await page.waitForURL(/\/game/, { timeout: JOIN_TIMEOUT });
    }

    await page.waitForFunction(
      // @ts-expect-error - Foundry runtime global
      () => globalThis.game?.ready === true,
      { timeout: READY_TIMEOUT },
    );

    await dismissStartupNotifications(page);
    await unpauseGame(page);
    await openFranchiseSheet(page);

    await use(page);
  },
});

export { expect };
