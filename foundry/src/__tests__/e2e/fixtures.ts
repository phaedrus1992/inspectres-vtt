import { test as base, expect, type Page } from "@playwright/test";
import { ConsoleBuffer } from "./console-capture";
import { workerStorageStatePath, workerUsername, E2E_VIEWPORT } from "./global-setup.js";

const JOIN_TIMEOUT = 30_000;
const READY_TIMEOUT = 60_000;
const SHEET_RENDER_TIMEOUT = 15_000;

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
 * Each Playwright worker authenticates as a distinct Foundry user (test-worker-N),
 * provisioned by global-setup.ts. This allows fullyParallel: true without session
 * conflicts — each worker has its own browser context and Foundry session.
 *
 * Foundry sessions don't survive across browser contexts, so the auto-launched world
 * places each fresh context on /join. This fixture:
 *   1. Creates a browser context seeded with the worker's Foundry session cookies.
 *   2. Subscribes to browser console errors/warnings and uncaught page errors.
 *   3. Joins the game as the worker's assigned user (test-worker-N).
 *   4. Waits for `game.ready`.
 *   5. Dismisses permanent startup notifications.
 *   6. Unpauses the game.
 *   7. Opens a franchise sheet so DOM elements expected by tests (tabs, inputs, etc.) exist.
 *
 * On failure, the captured console log is attached to the Playwright report so
 * browser-side errors (validation, render exceptions, hook failures) surface
 * directly in the test output instead of requiring a manual repro. See #428.
 */
export const test = base.extend({
  // Override the context fixture to inject per-worker storage state.
  // Playwright creates one BrowserContext per test; by overriding `context` we can
  // seed it with the cookies captured for this worker's Foundry user in global-setup.
  context: async ({ browser }, use, testInfo) => {
    const statePath = workerStorageStatePath(testInfo.workerIndex);
    const ctx = await browser.newContext({
      storageState: statePath,
      viewport: E2E_VIEWPORT,
    });
    await use(ctx);
    await ctx.close();
  },

  page: async ({ page }, use, testInfo) => {
    const consoleBuffer = new ConsoleBuffer();

    const consoleHandler = (msg: { type: () => string; text: () => string }) => {
      consoleBuffer.recordConsole(msg.type(), msg.text());
    };
    const errorHandler = (err: Error) => {
      consoleBuffer.recordPageError(err);
    };

    page.on("console", consoleHandler);
    page.on("pageerror", errorHandler);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    if (page.url().includes("/join")) {
      const username = workerUsername(testInfo.workerIndex);
      await page.selectOption('select[name="userid"]', { label: username });
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

    // Explicit listener cleanup to prevent stale handlers on test retry.
    // Playwright closes the BrowserContext between tests, but retained listeners
    // can theoretically fire on reused page objects during retry scenarios.
    page.off("console", consoleHandler);
    page.off("pageerror", errorHandler);

    if (testInfo.status !== testInfo.expectedStatus && !consoleBuffer.isEmpty()) {
      try {
        await testInfo.attach("browser-console.log", {
          body: consoleBuffer.toString(),
          contentType: "text/plain",
        });
      } catch (err: unknown) {
        // Don't let an attachment failure mask the actual test failure — that's
        // the whole point of capturing the buffer. Log and move on so the
        // original assertion error remains the reported result.
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Failed to attach browser-console.log: ${message}`);
      }
    }
  },
});

export { expect };
