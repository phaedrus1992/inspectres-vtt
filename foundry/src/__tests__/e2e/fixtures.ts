import { test as base, type Page } from "@playwright/test";
export { expect } from "@playwright/test";

import { ConsoleBuffer } from "./console-capture";
import { E2E_VIEWPORT, foundryUrlForWorker } from "./global-setup.js";

const JOIN_TIMEOUT = 15_000;
const READY_TIMEOUT = 60_000;
// Sheet render timeout raised: ApplicationV2 re-renders on parallel actor changes,
// briefly detaching the element. The locator may resolve then disappear during a
// re-render cycle. 30s gives enough headroom for the sheet to stabilize in CI.
const SHEET_RENDER_TIMEOUT = 30_000;

// Shared timeout for in-test element waits (selectors, locator counts, etc.).
// 5s is too tight under CI load (especially v14 which has slower init) and
// causes spurious retries. 15s tolerates CI variance without slowing the
// suite meaningfully when elements are present.
export const ELEMENT_WAIT_TIMEOUT = 15_000;

/** Username every worker joins as. With one server per worker, no pool is needed. */
const GAMEMASTER_USERNAME = "Gamemaster";

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
  await page.evaluate(() => {
    // @ts-expect-error - Foundry runtime global
    if (globalThis.game?.paused) globalThis.game.togglePause(false);
  });
}

async function openFranchiseSheet(page: Page): Promise<void> {
  // Each worker has its own Foundry server, so a single shared franchise actor
  // per server is safe — no cross-worker contention. Reuse if it exists.
  const actorName = "E2E Franchise";
  const actorId = await page.evaluate(async (name: string) => {
    // @ts-expect-error - Foundry runtime globals
    const ActorCls = globalThis.CONFIG?.Actor?.documentClass ?? globalThis.Actor;
    // @ts-expect-error - Foundry runtime global
    let franchise = globalThis.game.actors.find(
      (a: { type: string; name: string; id: string }) => a.type === "franchise" && a.name === name,
    );
    if (!franchise) {
      franchise = await ActorCls.create({ name, type: "franchise" });
    }
    await franchise.sheet.render(true);
    if (!franchise.id) throw new Error(`Actor "${name}" has no id after create — sheet render cannot be scoped`);
    return franchise.id as string;
  }, actorName);
  // Foundry element id is "t-Actor-<actorId>", not the bare actor id.
  // Substring match scopes to this actor's sheet while handling the prefix.
  //
  // Use waitForFunction rather than waitForSelector: ApplicationV2 re-renders may briefly
  // detach the element between render cycles, causing waitForSelector to miss it even when
  // the element is logically visible. waitForFunction polls until the element is present
  // AND visible, tolerating transient detach/re-attach during re-renders.
  await page.waitForFunction(
    (id: string) => {
      const el = document.querySelector(`.inspectres[id*="${id}"]`);
      if (!el) return false;
      const rect = (el as HTMLElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
    actorId,
    { timeout: SHEET_RENDER_TIMEOUT },
  );
}

/**
 * Per-test fixture that ensures `page` is in the Foundry game UI with a sheet open.
 *
 * Each worker gets its own dedicated Foundry server (see global-setup.ts).
 * Worker N → http://localhost:${BASE_PORT + N}. No /join pool coordination needed —
 * the worker is the only user on its server, so it always joins as Gamemaster.
 *
 * This fixture:
 *   1. Routes the context to the worker's dedicated foundry server (via baseURL).
 *   2. Subscribes to browser console errors/warnings and uncaught page errors.
 *   3. Navigates to /join and joins the game as Gamemaster.
 *   4. Waits for `game.ready`.
 *   5. Dismisses permanent startup notifications.
 *   6. Unpauses the game.
 *   7. Opens a franchise sheet so DOM elements expected by tests exist.
 *
 * On failure, the captured console log is attached to the Playwright report so
 * browser-side errors (validation, render exceptions, hook failures) surface
 * directly in the test output instead of requiring a manual repro. See #428.
 */
export const test = base.extend<{ workerUsername: string }>({
  // Constant for now; kept as a fixture so existing rejoinIfRedirected callers
  // keep working without each test learning the new architecture.
  workerUsername: async ({ page: _page }, use) => {
    await use(GAMEMASTER_USERNAME);
  },

  context: async ({ browser }, use, testInfo) => {
    const ctx = await browser.newContext({
      viewport: E2E_VIEWPORT,
      baseURL: foundryUrlForWorker(testInfo.workerIndex),
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

    await page.goto("/join", { waitUntil: "domcontentloaded" });

    await page.selectOption('select[name="userid"]', { label: GAMEMASTER_USERNAME });
    await page.click('button[type="submit"]:has-text("Join Game Session")');
    await page.waitForURL(/\/game/, { timeout: JOIN_TIMEOUT });

    await page.waitForFunction(
      // @ts-expect-error - Foundry runtime global
      () => globalThis.game?.ready === true,
      undefined,
      { timeout: READY_TIMEOUT },
    );

    await dismissStartupNotifications(page);
    await unpauseGame(page);
    await openFranchiseSheet(page);

    await use(page);

    // Call game.logOut() to close the Foundry server-side session before the context
    // is destroyed. Without this, Foundry keeps the user marked as "in session" until
    // its internal timeout (~30-60s), which disables the Gamemaster option on /join
    // for the next test on this worker.
    try {
      await page.evaluate(() => {
        // @ts-expect-error - Foundry runtime global
        if (typeof globalThis.game?.logOut === "function") globalThis.game.logOut();
      });
      await page.waitForURL(/\/join/, { timeout: 3_000 }).catch(() => {});
    } catch {
      // Best-effort: if the page is already closed or Foundry isn't ready, ignore.
    }

    page.off("console", consoleHandler);
    page.off("pageerror", errorHandler);

    if (testInfo.status !== testInfo.expectedStatus && !consoleBuffer.isEmpty()) {
      try {
        await testInfo.attach("browser-console.log", {
          body: consoleBuffer.toString(),
          contentType: "text/plain",
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Failed to attach browser-console.log: ${message}`);
      }
    }
  },
});
