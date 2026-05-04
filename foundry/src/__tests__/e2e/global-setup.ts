/**
 * Global setup for Playwright tests
 *
 * Walks a fresh Foundry instance (no world, no EULA, no usage prompt) through:
 *   1. Decline usage data sharing dialog (if present)
 *   2. Dismiss tour overlay (ESC)
 *   3. Create test world (system: inspectres) — only if none exists
 *   4. Launch world (v13) or auto-launches on submit (v14)
 *   5. Join as Gamemaster (no password — fresh world)
 *   6. Wait until `game.ready === true`
 *   7. Provision N test worker users (test-worker-0 … test-worker-N) via Foundry User API
 *   8. Save a separate storage-state file for each worker
 *
 * Idempotent: if a world already exists and game is reachable, just verifies it.
 * Supports Foundry v13 (form-based dialog, hidden launch link) and v14
 * (standalone /create page, package gallery system selector, auto-launch on submit).
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP_DIR = path.resolve(__dirname, "../../../.tmp");

const rawWorkers = Number(process.env["PLAYWRIGHT_WORKERS"] ?? "2");
if (!Number.isFinite(rawWorkers) || rawWorkers < 1) {
  throw new Error(
    `PLAYWRIGHT_WORKERS must be a positive integer, got: ${process.env["PLAYWRIGHT_WORKERS"]}`,
  );
}
/** Number of parallel Playwright workers. Imported by playwright.config.ts. */
export const WORKER_COUNT = rawWorkers;

/** Viewport used for both storage-state capture and per-test contexts. */
export const E2E_VIEWPORT = { width: 1920, height: 1080 } as const;

/** Foundry role value for Gamemaster (CONST.USER_ROLES.GAMEMASTER in Foundry v13). */
const FOUNDRY_ROLE_GAMEMASTER = 4;

const FOUNDRY_URL = "http://localhost:30000";
const WORLD_ID = "test-world";
const WORLD_TITLE = "Test World";
const SYSTEM_ID = "inspectres";

/** Returns the storage-state path for a given worker index. */
export function workerStorageStatePath(workerIndex: number): string {
  return path.join(TMP_DIR, `playwright-storage-state-${workerIndex}.json`);
}

/** Username for a given worker index. */
export function workerUsername(workerIndex: number): string {
  return `test-worker-${workerIndex}`;
}

async function declineUsageDataSharing(page: Page): Promise<void> {
  const decline = await page.$('button[data-action="no"]');
  if (decline) {
    await decline.click();
    await page.waitForTimeout(500);
  }
}

async function acceptLicenseIfPresent(page: Page): Promise<void> {
  if (!page.url().includes("/license")) return;

  const formInfo = await page.evaluate(() => {
    const keyInput = document.querySelector('input[name="licenseKey"]') as HTMLInputElement | null;
    const eulaCheckbox = document.querySelector(
      'input[name="agree"], input[name="eula"], input[type="checkbox"]',
    ) as HTMLInputElement | null;
    return {
      hasKeyInput: !!keyInput,
      keyValue: keyInput?.value ?? "",
      hasEulaCheckbox: !!eulaCheckbox,
    };
  });

  if (formInfo.hasKeyInput && !formInfo.keyValue) {
    throw new Error(
      "Foundry is on /license and the license key field is empty. " +
        "Set FOUNDRY_LICENSE_KEY in docker/.env (or docker/secrets/config.json) and recreate the container. " +
        "global-setup does not bypass licensing.",
    );
  }

  // EULA-only: tick the agree checkbox and submit.
  if (formInfo.hasEulaCheckbox) {
    await page.evaluate(() => {
      const cb = document.querySelector(
        'input[name="agree"], input[name="eula"], input[type="checkbox"]',
      ) as HTMLInputElement | null;
      if (cb && !cb.checked) cb.click();
    });
  }
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/license"), { timeout: 30_000 });
  await page.waitForTimeout(800);
}

async function dismissTourOverlay(page: Page): Promise<void> {
  // Foundry shows a guided tour overlay on first visit; ESC closes it.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

/**
 * Detects the running Foundry major version from the setup page globals.
 *
 * Reads `game.version` (e.g. "14.360") which Foundry exposes on every page.
 * DOM-based detection (input field names, button text) breaks across builds —
 * v14.360.0 dropped the `world-id` input we used previously. The version
 * global is stable across builds.
 */
async function detectFoundryMajorVersion(page: Page): Promise<number> {
  const version = await page.evaluate(() => {
    const g = globalThis as { game?: { version?: string } };
    return g.game?.version ?? null;
  });
  if (!version) throw new Error("Could not read game.version from setup page");
  const major = Number.parseInt(version.split(".")[0] ?? "", 10);
  if (!Number.isFinite(major)) throw new Error(`Unparsable game.version: ${version}`);
  return major;
}

async function createWorldIfNeeded(page: Page, majorVersion: number): Promise<void> {
  const exists = await page.evaluate(
    (id) => !!document.querySelector(`[data-package-id="${id}"]`),
    WORLD_ID,
  );
  if (exists) return;

  await page.click('button[data-action="worldCreate"]');
  await page.waitForTimeout(2000);

  if (majorVersion >= 14) {
    await createWorldV14(page);
  } else {
    await createWorldV13(page);
  }
}

async function createWorldV13(page: Page): Promise<void> {
  await page.fill('input[name="title"]', WORLD_TITLE);
  await page.waitForTimeout(200);
  await page.fill('input[name="id"]', WORLD_ID);
  await page.selectOption('select[name="system"]', SYSTEM_ID);
  await page.waitForTimeout(200);

  // Submit via requestSubmit() — direct .click() races with TinyMCE blur events.
  const submitted = await page.evaluate(() => {
    const form = [...document.querySelectorAll("form.application")].find(
      (f) => f.querySelector(".window-title, h2, h4")?.textContent?.trim() === "Create World",
    );
    const submitBtn = form?.querySelector('button[type="submit"]');
    if (!form || !submitBtn) return false;
    (form as HTMLFormElement).requestSubmit(submitBtn as HTMLButtonElement);
    return true;
  });
  if (!submitted) throw new Error("Could not submit Create World form (v13)");
  await page.waitForTimeout(3000);

  const created = await page.evaluate(
    (id) => !!document.querySelector(`#worlds-list [data-package-id="${id}"]`),
    WORLD_ID,
  );
  if (!created) throw new Error(`World ${WORLD_ID} did not appear after creation (v13)`);
}

async function createWorldV14(page: Page): Promise<void> {
  await page.fill('input[name="title"]', WORLD_TITLE);
  await page.waitForTimeout(200);
  await page.fill('input[name="world-id"]', WORLD_ID);
  await page.waitForTimeout(200);

  // V14 hides the native <select name="system"> behind a clickable package gallery.
  // Clicking the system <li> sets the select value via Foundry's framework.
  const systemPackage = await page.$(`li.package.system[data-package-id="${SYSTEM_ID}"]`);
  if (!systemPackage) {
    throw new Error(`V14 system package li not found for ${SYSTEM_ID}`);
  }
  await systemPackage.click();
  await page.waitForTimeout(300);

  // Submit the form. V14's submit button is a plain <button type="submit">Continue</button>.
  await page.click('button[type="submit"]:not([data-action="cancel"])');

  // V14 auto-launches the world on submit and redirects to /join (the players page).
  await page.waitForURL((u) => u.pathname.includes("/join") || u.pathname.includes("/players"), {
    timeout: 30_000,
  });
  await page.waitForTimeout(1500);
}

const DEFAULT_JOIN_TIMEOUTS = { url: 30_000, ready: 60_000 };

async function joinAsUser(page: Page, username: string, timeouts = DEFAULT_JOIN_TIMEOUTS): Promise<void> {
  // Check for critical failure or error page
  const criticalFailure = await page.evaluate(() => {
    const text = document.body.textContent || '';
    if (text.includes('Critical Failure')) {
      const errorSection = document.querySelector('section') || document.body;
      return { isCritical: true, errorText: errorSection.textContent };
    }
    return { isCritical: false };
  });

  if (criticalFailure.isCritical) {
    const errorMsg = criticalFailure.errorText?.slice(0, 500) || 'Unknown error';
    throw new Error(`Foundry join failed with critical error: ${errorMsg}`);
  }

  await page.selectOption('select[name="userid"]', { label: username });
  await page.click('button[type="submit"]:has-text("Join Game Session")');
  await page.waitForURL(/\/game/, { timeout: timeouts.url });
  // Wait for Foundry's init/ready hooks to complete.
  await page.waitForFunction(
    // @ts-expect-error - Foundry runtime global
    () => globalThis.game?.ready === true,
    undefined,
    { timeout: timeouts.ready },
  );
}

async function launchAndJoin(page: Page, majorVersion: number): Promise<void> {
  console.log(`[launchAndJoin] v${majorVersion}, current URL: ${page.url()}`);

  // After createWorldV14, the page may already be on /join or /players because
  // v14 auto-launches on form submit. Detect by URL, not version.
  const url = page.url();
  if (url.includes("/join") || url.includes("/players")) {
    console.log("[launchAndJoin] Auto-launch landed on", url, "→ navigating to /join");
    await page.goto(`${FOUNDRY_URL}/join`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('select[name="userid"]', { timeout: 30_000 });
    await joinAsUser(page, "Gamemaster");
    return;
  }

  // Still on /setup with an existing world: click the launch link.
  // v13 hides the link with `:hover` CSS; v14.360+ renders it visible by default.
  // Forcing visibility is harmless on v14 and required on v13 — do it unconditionally.
  await page.evaluate(() => {
    const container = document.querySelector('[data-package-id="test-world"]') as HTMLElement | null;
    if (!container) throw new Error("World package container not found");
    container.style.setProperty("display", "block", "important");
    container.style.setProperty("visibility", "visible", "important");

    const launchBtn = container.querySelector('a[data-action="worldLaunch"]') as HTMLElement | null;
    if (!launchBtn) throw new Error("World launch button not found");
    launchBtn.style.setProperty("display", "block", "important");
    launchBtn.style.setProperty("visibility", "visible", "important");
    launchBtn.style.setProperty("opacity", "1", "important");
  });

  console.log("[launchAndJoin] Clicking worldLaunch link");
  await page.click('[data-package-id="test-world"] a[data-action="worldLaunch"]', { timeout: 5000 });

  // v14 may show a "World Data Migration" dialog when the world's stored core
  // version is older than the current core. Confirm with "Begin Migration".
  // Race: either the migration dialog appears OR navigation away from /setup.
  const migrationConfirmed = await Promise.race([
    page
      .waitForSelector('dialog.application.dialog button[data-action="yes"]', { timeout: 5_000 })
      .then(() => true)
      .catch(() => false),
    page
      .waitForURL((u) => !u.pathname.includes("/setup"), { timeout: 5_000 })
      .then(() => "navigated" as const)
      .catch(() => false),
  ]);
  if (migrationConfirmed === true) {
    console.log("[launchAndJoin] World Data Migration dialog detected → confirming");
    await page.click('dialog.application.dialog button[data-action="yes"]');
  }

  // v13 redirects to /join. v14 redirects to /players (User Management) first.
  await page.waitForURL((u) => u.pathname.includes("/join") || u.pathname.includes("/players"), {
    timeout: 60_000,
  });
  await page.waitForTimeout(1500);

  // If we landed on /players, navigate to /join to reach the actual login form.
  if (!page.url().includes("/join")) {
    console.log(`[launchAndJoin] Landed on ${page.url()} → navigating to /join`);
    await page.goto(`${FOUNDRY_URL}/join`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('select[name="userid"]', { timeout: 30_000 });
  }
  await joinAsUser(page, "Gamemaster");
}

/**
 * Provisions N test worker users in Foundry and saves a storage-state file for each.
 *
 * Runs inside the Gamemaster browser context. Creates `test-worker-0 … test-worker-N`
 * users with GM role so each worker can access all actors and settings without
 * ownership restrictions. Existing users are reused (idempotent).
 *
 * Then logs in as each user in a fresh browser context to capture per-worker cookies.
 */
async function provisionWorkerUsers(gmPage: Page, browser: Browser): Promise<void> {
  // Create users via Foundry's User document API (GM context required).
  const usernames = Array.from({ length: WORKER_COUNT }, (_, i) => workerUsername(i));

  await gmPage.evaluate(
    async ([names, gmRole]: [string[], number]) => {
      // Accessing Foundry runtime globals — these exist in the browser context only.
      const g = globalThis as Record<string, unknown>;
      const game = g["game"] as { users?: { getName: (n: string) => unknown } } | undefined;
      // Foundry exports User to globalThis during init — no fallback needed.
      const UserCls = g["User"] as
        | { create: (data: Record<string, unknown>) => Promise<void> }
        | undefined;
      if (!UserCls) throw new Error("User class not available in Foundry globals (game.ready must be true before calling provisionWorkerUsers)");

      for (const name of names) {
        const existing = game?.users?.getName(name);
        if (!existing) {
          await UserCls.create({ name, role: gmRole, password: "" });
        }
      }
    },
    [usernames, FOUNDRY_ROLE_GAMEMASTER] as [string[], number],
  );

  console.log(`✓ Provisioned ${WORKER_COUNT} worker user(s): ${usernames.join(", ")}`);

  // Capture a storage state for each worker by joining as that user.
  // Use generous timeouts: CI Foundry takes 60-90s per login when sessions
  // are sequential and the server needs to reinitialize between them.
  const provisionTimeouts = { url: 60_000, ready: 120_000 };
  for (let i = 0; i < WORKER_COUNT; i++) {
    const username = workerUsername(i);
    const statePath = workerStorageStatePath(i);

    const ctx = await browser.newContext({ viewport: E2E_VIEWPORT });
    try {
      const page = await ctx.newPage();
      await page.goto(`${FOUNDRY_URL}/join`, { waitUntil: "networkidle" });
      await joinAsUser(page, username, provisionTimeouts);
      await ctx.storageState({ path: statePath });
      console.log(`✓ Storage state saved for ${username} → ${statePath}`);
    } finally {
      await ctx.close();
    }
  }
}

async function globalSetup(): Promise<void> {
  console.log("\n=== Foundry E2E Test Setup ===");
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    // Probe current state.
    await page.goto(FOUNDRY_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    let alreadyInGame = page.url().includes("/game");

    if (!alreadyInGame) {
      await acceptLicenseIfPresent(page);
      await declineUsageDataSharing(page);
      await dismissTourOverlay(page);

      if (page.url().includes("/setup")) {
        const majorVersion = await detectFoundryMajorVersion(page);
        console.log(`[setup] Foundry major version: ${majorVersion}`);
        await createWorldIfNeeded(page, majorVersion);
        await launchAndJoin(page, majorVersion);
      } else if (page.url().includes("/join")) {
        // World was launched previously; just join.
        await joinAsUser(page, "Gamemaster");
      } else {
        throw new Error(`Unexpected starting URL: ${page.url()}`);
      }

    }

    console.log(`✓ Foundry ready at ${page.url()}`);

    // Provision per-worker users and capture their storage states.
    await provisionWorkerUsers(page, browser);

    console.log("=== Setup Complete ===\n");
  } finally {
    await browser?.close();
  }
}

export default globalSetup;
