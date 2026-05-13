import type { Page } from "@playwright/test";

/**
 * Capture a screenshot without blocking the test on a slow render.
 *
 * Foundry V14 init is slow, and `page.screenshot` can wait the full default
 * 5s timeout waiting for a stable frame while the page is still painting —
 * burning ~5s of dead air per call and blowing the CI budget on F14 shards.
 *
 * Approach: wait briefly for the DOM to settle, then snap with a short
 * timeout. If it still can't grab a frame, skip the screenshot rather than
 * fail the test. Screenshots are diagnostic, not load-bearing.
 *
 * Do not wait for `networkidle` — Foundry's socket.io connection is
 * persistent and never goes idle, so that wait would always hit its timeout.
 */
export async function safeScreenshot(page: Page, path: string): Promise<void> {
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 1500 });
  } catch {
    // DOM not stable — try the screenshot anyway, it might still succeed.
  }
  await page.screenshot({ path, timeout: 2000 }).catch(() => {});
}
