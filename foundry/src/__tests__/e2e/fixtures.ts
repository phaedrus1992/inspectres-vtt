import { test as base, type Page } from "@playwright/test";
export { expect } from "@playwright/test";

import { ConsoleBuffer } from "./console-capture";
import { POOL_USERNAMES, E2E_VIEWPORT } from "./global-setup.js";

const JOIN_TIMEOUT = 60_000;
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

async function openFranchiseSheet(page: Page, username: string): Promise<void> {
  // Each pool slot opens its own franchise actor (keyed by username) to avoid
  // parallel render collisions. With fullyParallel, two workers hitting the same
  // actor simultaneously can cause double-render or visibility conflicts.
  const actorName = `E2E Franchise ${username}`;
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
  // Scope selector to this actor's sheet — multiple workers share the same Foundry
  // world, so other workers' franchise sheets are also present in the DOM. Using the
  // actor ID avoids a "locator resolved to 2 elements" timeout on the generic selector.
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
 * Claims a free pool slot by scanning the /join page for the first enabled pool user.
 *
 * Foundry's session-disable mechanism (option disabled on /join while a session is
 * active) is the coordination signal — no application-level locks are needed. Pool
 * users whose options are enabled are free; the first one found is claimed by returning
 * its username for the caller to select and join.
 *
 * Returns the username of the claimed slot, or throws if JOIN_TIMEOUT elapses.
 */
async function claimPoolSlot(page: Page): Promise<string> {
  const usernames = [...POOL_USERNAMES];
  const claimed = await page.waitForFunction(
    (names: string[]) => {
      const select = document.querySelector('select[name="userid"]') as HTMLSelectElement | null;
      if (!select) return null;
      for (const name of names) {
        const opt = Array.from(select.options).find((o) => o.text === name);
        if (opt != null && !opt.disabled) return name;
      }
      return null;
    },
    usernames,
    { timeout: JOIN_TIMEOUT },
  );
  const username = await claimed.jsonValue() as string | null;
  if (!username) throw new Error("No free pool slot found — pool may be undersized");
  return username;
}

/**
 * Per-test fixture that ensures `page` is in the Foundry game UI with a sheet open.
 *
 * Tests claim a free pool slot from a set of pre-provisioned Foundry users
 * (test-pool-0 … test-pool-N). A slot is "free" when its user option on the /join
 * page is enabled — Foundry disables it while a session is active, which serves as
 * the distributed coordination mechanism. Pool size = WORKER_COUNT * (MAX_RETRIES + 1),
 * so there are always enough free slots even during CI retry runs.
 *
 * This fixture:
 *   1. Navigates to /join and claims the first available pool user.
 *   2. Subscribes to browser console errors/warnings and uncaught page errors.
 *   3. Joins the game as the claimed user.
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
  // Expose the claimed pool username so tests can pass it to page objects
  // that need to rejoin as the correct user on /join redirects.
  workerUsername: async ({ page }, use) => {
    // page fixture runs first and stores the claimed username on the page object.
    await use((page as unknown as Record<string, unknown>)["__poolUsername"] as string ?? "");
  },

  context: async ({ browser }, use) => {
    const ctx = await browser.newContext({ viewport: E2E_VIEWPORT });
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

    // Navigate to /join to scan which pool slots are free.
    // Pool users are created with no password, so no auth is needed — any test can
    // navigate to /join and join as whichever pool user is currently free.
    await page.goto("/join", { waitUntil: "domcontentloaded" });

    // Claim the first free pool slot. Foundry disables the option while a session is
    // active, so scanning for an enabled pool user option is the distributed lock.
    const username = await claimPoolSlot(page);

    // Store username on the page object for the workerUsername fixture to read.
    (page as unknown as Record<string, unknown>)["__poolUsername"] = username;

    await page.selectOption('select[name="userid"]', { label: username });
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
    await openFranchiseSheet(page, username);

    await use(page);

    // Call game.logOut() to close the Foundry server-side session before the context
    // is destroyed. Without this, Foundry keeps the user marked as "in session" until
    // its internal timeout (~30-60s), which disables that user's option on the /join
    // page for the next test.
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
