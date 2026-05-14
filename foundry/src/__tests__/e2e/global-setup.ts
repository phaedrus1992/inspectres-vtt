/**
 * Global setup for Playwright tests
 *
 * Provisions N independent Foundry servers, one per Playwright worker. Each server
 * walks through the same flow:
 *   1. Decline usage data sharing dialog (if present)
 *   2. Dismiss tour overlay (ESC)
 *   3. Create test world (system: inspectres) — only if none exists
 *   4. Launch world (v13) or auto-launches on submit (v14)
 *   5. Join as Gamemaster (no password — fresh world)
 *   6. Wait until `game.ready === true`
 *
 * Idempotent: if a world already exists and game is reachable, just verifies it.
 * Supports Foundry v13 (form-based dialog, hidden launch link) and v14
 * (standalone /create page, package gallery system selector, auto-launch on submit).
 *
 * Server count: `FOUNDRY_SERVER_COUNT` env var (default 1 for local; CI sets it
 * to match `PLAYWRIGHT_WORKERS`). Each worker gets a dedicated server on a
 * dedicated port (30000, 30001, ...) — no /join coordination needed since
 * the worker is the only user on its server. See issue #546.
 */

import { chromium, type Browser, type Page } from "@playwright/test";

// Default 1 worker / 1 server for local (matches local docker-compose.yml's
// single foundry container). CI overrides both via env to run 3/3.
const rawWorkers = Number(process.env["PLAYWRIGHT_WORKERS"] ?? "1");
if (!Number.isFinite(rawWorkers) || rawWorkers < 1) {
  throw new Error(
    `PLAYWRIGHT_WORKERS must be a positive integer, got: ${process.env["PLAYWRIGHT_WORKERS"]}`,
  );
}
/** Number of parallel Playwright workers. Imported by playwright.config.ts. */
export const WORKER_COUNT = rawWorkers;

const rawServerCount = Number(process.env["FOUNDRY_SERVER_COUNT"] ?? "1");
if (!Number.isFinite(rawServerCount) || rawServerCount < 1) {
  throw new Error(
    `FOUNDRY_SERVER_COUNT must be a positive integer, got: ${process.env["FOUNDRY_SERVER_COUNT"]}`,
  );
}
/**
 * Number of independent Foundry containers to provision.
 * Each worker routes to one server: worker N → http://localhost:${BASE_PORT + N}.
 * Must be >= WORKER_COUNT (workers without a server can't run).
 */
export const FOUNDRY_SERVER_COUNT = rawServerCount;

/** Base port for the first foundry server. Server N listens on BASE_PORT + N. */
export const FOUNDRY_BASE_PORT = 30000;

/** Viewport used for both storage-state capture and per-test contexts. */
export const E2E_VIEWPORT = { width: 1920, height: 1080 } as const;

const WORLD_ID = "test-world";
const WORLD_TITLE = "Test World";
const SYSTEM_ID = "inspectres";

/**
 * Base URL for the foundry server matching the given parallel slot index.
 *
 * Use Playwright's `testInfo.parallelIndex` (0..workers-1, stable across worker
 * restarts), NOT `workerIndex` which increments every time a worker process
 * restarts (e.g. on retry) and quickly exceeds the provisioned server count.
 */
export function foundryUrlForWorker(parallelIndex: number): string {
  return `http://localhost:${FOUNDRY_BASE_PORT + parallelIndex}`;
}

async function declineUsageDataSharing(page: Page): Promise<void> {
  const decline = await page.waitForSelector('button[data-action="no"]', { timeout: 3_000 }).catch(() => null);
  if (decline) {
    await decline.click();
    await page.waitForURL((u) => !u.pathname.includes("/consent"), { timeout: 5_000 }).catch(() => {});
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
}

async function dismissTourOverlay(page: Page): Promise<void> {
  const overlay = await page.waitForSelector(".tour-overlay", { timeout: 5_000 }).catch(() => null);
  if (overlay) {
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => !document.querySelector(".tour-overlay"),
      undefined,
      { timeout: 5_000 },
    ).catch(() => {});
  }
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

  await page.waitForFunction(
    () => !document.querySelector(".tour-overlay"),
    undefined,
    { timeout: 10_000 },
  ).catch(() => {});

  await page.click('button[data-action="worldCreate"]');
  await page.waitForFunction(
    () => !!document.querySelector('input[name="title"], input[name="world-id"]'),
    undefined,
    { timeout: 15_000 },
  );

  if (majorVersion >= 14) {
    await createWorldV14(page);
  } else {
    await createWorldV13(page);
  }
}

async function createWorldV13(page: Page): Promise<void> {
  await page.fill('input[name="title"]', WORLD_TITLE);
  await page.fill('input[name="id"]', WORLD_ID);
  await page.selectOption('select[name="system"]', SYSTEM_ID);

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
  await page.waitForFunction(
    (id: string) => !!document.querySelector(`#worlds-list [data-package-id="${id}"]`),
    WORLD_ID,
    { timeout: 15_000 },
  );

  const created = await page.evaluate(
    (id) => !!document.querySelector(`#worlds-list [data-package-id="${id}"]`),
    WORLD_ID,
  );
  if (!created) throw new Error(`World ${WORLD_ID} did not appear after creation (v13)`);
}

async function createWorldV14(page: Page): Promise<void> {
  await page.fill('input[name="title"]', WORLD_TITLE);
  await page.fill('input[name="world-id"]', WORLD_ID);

  // V14 hides the native <select name="system"> behind a clickable package gallery.
  // Clicking the system <li> sets the select value via Foundry's framework.
  const systemPackage = await page.$(`li.package.system[data-package-id="${SYSTEM_ID}"]`);
  if (!systemPackage) {
    throw new Error(`V14 system package li not found for ${SYSTEM_ID}`);
  }
  await systemPackage.click();

  await page.click('button[type="submit"]:not([data-action="cancel"])');

  // V14 auto-launches the world on submit and redirects to /join (the players page).
  await page.waitForURL((u) => u.pathname.includes("/join") || u.pathname.includes("/players"), {
    timeout: 30_000,
  });
}

const DEFAULT_JOIN_TIMEOUTS = { url: 30_000, ready: 60_000 };

async function joinAsUser(page: Page, username: string, timeouts = DEFAULT_JOIN_TIMEOUTS): Promise<void> {
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
  await page.waitForFunction(
    // @ts-expect-error - Foundry runtime global
    () => globalThis.game?.ready === true,
    undefined,
    { timeout: timeouts.ready },
  );

  // Mark every registered tour as completed and persist to the user. On a fresh
  // world Foundry auto-launches first-time tours (e.g. "welcome") which render
  // a `.tour-overlay` that intercepts pointer events and breaks subsequent clicks
  // mid-test. Persist completion to the per-user core.tourProgress setting so
  // tours never auto-launch in per-test contexts.
  //
  // Wrapped in a 10s timeout: tour.complete() can occasionally hang waiting for
  // its own DOM/render cycle. We don't need to await individual completions —
  // setting tourProgress directly is enough to suppress future auto-launches.
  await page.evaluate(async () => {
    const TIMEOUT_MS = 10_000;
    interface FoundryTour { id?: string; namespace?: string; exit?: () => void }
    interface FoundryTours { active?: FoundryTour | null; values?: () => Iterable<FoundryTour> }
    interface FoundrySettings { get: (n: string, k: string) => unknown; set: (n: string, k: string, v: unknown) => Promise<unknown> }
    interface FoundryGame { tours?: FoundryTours; settings?: FoundrySettings }
    const g = globalThis as { game?: FoundryGame };

    const work = (async () => {
      try { g.game?.tours?.active?.exit?.(); } catch { /* tour API may be absent */ }
      const tours = g.game?.tours;
      const progress: Record<string, string> = {};
      if (tours?.values) {
        for (const tour of tours.values()) {
          const key = tour.namespace && tour.id ? `${tour.namespace}.${tour.id}` : tour.id;
          if (key) progress[key] = "completed";
        }
      }
      try {
        if (g.game?.settings) {
          await g.game.settings.set("core", "tourProgress", progress);
        }
      } catch { /* setting may not exist on older Foundry */ }
      for (const el of document.querySelectorAll(".tour-overlay, .tour")) {
        el.remove();
      }
    })();

    await Promise.race([
      work,
      new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS)),
    ]);
  });
}

async function launchAndJoin(page: Page, baseUrl: string, majorVersion: number): Promise<void> {
  console.log(`[launchAndJoin] v${majorVersion}, current URL: ${page.url()}`);

  // After createWorldV14, the page may already be on /join or /players because
  // v14 auto-launches on form submit. Detect by URL, not version.
  const url = page.url();
  if (url.includes("/join") || url.includes("/players")) {
    console.log("[launchAndJoin] Auto-launch landed on", url, "→ navigating to /join");
    await page.goto(`${baseUrl}/join`, { waitUntil: "domcontentloaded" });
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

  // If we landed on /players, navigate to /join to reach the actual login form.
  if (!page.url().includes("/join")) {
    console.log(`[launchAndJoin] Landed on ${page.url()} → navigating to /join`);
    await page.goto(`${baseUrl}/join`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('select[name="userid"]', { timeout: 30_000 });
  }
  await joinAsUser(page, "Gamemaster");
}

async function provisionOneServer(browser: Browser, serverIndex: number): Promise<void> {
  const baseUrl = foundryUrlForWorker(serverIndex);
  console.log(`\n--- Provisioning server ${serverIndex} (${baseUrl}) ---`);

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    // Probe current state. networkidle ensures Foundry's JS has run so game.version
    // is readable before detectFoundryMajorVersion() is called.
    await page.goto(baseUrl, { waitUntil: "networkidle" });

    const alreadyInGame = page.url().includes("/game");

    if (!alreadyInGame) {
      await acceptLicenseIfPresent(page);
      await declineUsageDataSharing(page);
      await dismissTourOverlay(page);

      if (page.url().includes("/setup")) {
        const majorVersion = await detectFoundryMajorVersion(page);
        console.log(`[setup ${serverIndex}] Foundry major version: ${majorVersion}`);
        await createWorldIfNeeded(page, majorVersion);
        await launchAndJoin(page, baseUrl, majorVersion);
      } else if (page.url().includes("/join")) {
        await joinAsUser(page, "Gamemaster");
      } else {
        throw new Error(`[server ${serverIndex}] Unexpected starting URL: ${page.url()}`);
      }
    }

    console.log(`✓ Server ${serverIndex} ready at ${page.url()}`);
  } finally {
    await page.close();
  }
}

async function globalSetup(): Promise<void> {
  console.log("\n=== Foundry E2E Test Setup ===");
  console.log(`Provisioning ${FOUNDRY_SERVER_COUNT} server(s) for ${WORKER_COUNT} worker(s)`);

  if (FOUNDRY_SERVER_COUNT < WORKER_COUNT) {
    throw new Error(
      `FOUNDRY_SERVER_COUNT (${FOUNDRY_SERVER_COUNT}) must be >= PLAYWRIGHT_WORKERS (${WORKER_COUNT}). ` +
        `Each worker needs its own dedicated Foundry server.`,
    );
  }

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    // Provision servers in parallel — each is independent (own container, own /data).
    await Promise.all(
      Array.from({ length: FOUNDRY_SERVER_COUNT }, (_, i) => provisionOneServer(browser!, i)),
    );
    console.log("=== Setup Complete ===\n");
  } finally {
    await browser?.close();
  }
}

export default globalSetup;
