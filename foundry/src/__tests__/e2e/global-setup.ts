/**
 * Global setup for Playwright tests
 *
 * Walks a fresh Foundry instance (no world, no EULA, no usage prompt) through:
 *   1. Decline usage data sharing dialog (if present)
 *   2. Dismiss tour overlay (ESC)
 *   3. Create test world (system: inspectres) — only if none exists
 *   4. Launch world
 *   5. Join as Gamemaster (no password — fresh world)
 *   6. Wait until `game.ready === true`
 *
 * Idempotent: if a world already exists and game is reachable, just verifies it.
 * Selectors verified against Foundry V13 (felddy/foundryvtt:13).
 */

import path from "path";
import { fileURLToPath } from "url";
import { chromium, type Browser, type Page } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_STATE = path.resolve(__dirname, "../../../.tmp/playwright-storage-state.json");

const FOUNDRY_URL = "http://localhost:30000";
const WORLD_ID = "test-world";
const WORLD_TITLE = "Test World";
const SYSTEM_ID = "inspectres";

async function declineUsageDataSharing(page: Page): Promise<void> {
  const decline = await page.$('button[data-action="no"]');
  if (decline) {
    await decline.click();
    await page.waitForTimeout(500);
  }
}

async function dismissTourOverlay(page: Page): Promise<void> {
  // Foundry shows a guided tour overlay on first visit; ESC closes it.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

async function createWorldIfNeeded(page: Page): Promise<void> {
  const exists = await page.evaluate(
    (id) => !!document.querySelector(`#worlds-list [data-package-id="${id}"]`),
    WORLD_ID,
  );
  if (exists) return;

  await page.click('button[data-action="worldCreate"]');
  await page.waitForTimeout(1500);

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
  if (!submitted) throw new Error("Could not submit Create World form");
  await page.waitForTimeout(3000);

  // Verify the world appeared
  const created = await page.evaluate(
    (id) => !!document.querySelector(`#worlds-list [data-package-id="${id}"]`),
    WORLD_ID,
  );
  if (!created) throw new Error(`World ${WORLD_ID} did not appear after creation`);
}

async function launchAndJoin(page: Page): Promise<void> {
  // The launch link is hover-only (CSS `:hover` reveals it), so click via DOM.
  await page.evaluate(() => {
    const link = document.querySelector('a[data-action="worldLaunch"]') as HTMLElement | null;
    link?.click();
  });
  await page.waitForURL(/\/join/, { timeout: 30_000 });
  await page.waitForTimeout(1500);

  await page.selectOption('select[name="userid"]', { label: "Gamemaster" });
  await page.click('button[type="submit"]:has-text("Join Game Session")');
  await page.waitForURL(/\/game/, { timeout: 30_000 });

  // Wait for Foundry's init/ready hooks to complete.
  await page.waitForFunction(
    // @ts-expect-error - Foundry runtime global
    () => globalThis.game?.ready === true,
    { timeout: 60_000 },
  );
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

    if (page.url().includes("/game")) {
      console.log("✓ Already in game; setup not required.");
      return;
    }

    await declineUsageDataSharing(page);
    await dismissTourOverlay(page);

    if (page.url().includes("/setup")) {
      await createWorldIfNeeded(page);
      await launchAndJoin(page);
    } else if (page.url().includes("/join")) {
      // World was launched previously; just join.
      await page.selectOption('select[name="userid"]', { label: "Gamemaster" });
      await page.click('button[type="submit"]:has-text("Join Game Session")');
      await page.waitForURL(/\/game/, { timeout: 30_000 });
      await page.waitForFunction(
        // @ts-expect-error - Foundry runtime global
        () => globalThis.game?.ready === true,
        { timeout: 60_000 },
      );
    } else {
      throw new Error(`Unexpected starting URL: ${page.url()}`);
    }

    // Persist auth/session cookies so per-test browser contexts skip the join step.
    await page.context().storageState({ path: STORAGE_STATE });
    console.log(`✓ Foundry ready at ${page.url()}`);
    console.log(`✓ Storage state saved to ${STORAGE_STATE}`);
    console.log("=== Setup Complete ===\n");
  } finally {
    await browser?.close();
  }
}

export default globalSetup;
