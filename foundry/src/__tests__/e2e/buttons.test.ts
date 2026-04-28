/**
 * Button accessibility tests (E2E - Playwright)
 * Tests button usability across all custom controls (e.g. dice, toggles, actions)
 *
 * Issue #408: Add Playwright tests for button usability and interaction states
 *
 * These are E2E/Playwright tests that require a live Foundry VTT instance.
 * Run with: npm run test:e2e (with Docker setup)
 *
 * Prerequisites:
 * - docker/.env configured with UID/GID
 * - docker/secrets/config.json exists
 * - docker compose up running Foundry on port 30000
 * - npm run dev watching for changes in another terminal
 */

import { test, expect } from "@playwright/test";

test.describe("Button usability and interaction states (E2E - Playwright)", () => {
  test("should navigate to agent sheet and load", async ({ page }) => {
    await page.goto("/");
    // Wait for Foundry to load
    await page.waitForSelector(".window-app", { timeout: 10000 });
    await page.screenshot({ path: "test-results/e2e-screenshots/01-foundry-loaded.png" });
    expect(page.url()).toContain("localhost:30000");
  });

  test("should test button visibility in default state", async ({ page }) => {
    await page.goto("/");
    // Navigate to actors sidebar and find an agent
    const actorButton = page.locator("a.document.actor").first();
    await expect(actorButton).toBeVisible();
    await page.screenshot({ path: "test-results/e2e-screenshots/02-button-visibility.png" });
  });

  test("should test hover state visual feedback", async ({ page }) => {
    await page.goto("/");
    const button = page.locator("button").first();
    await expect(button).toBeVisible();
    await button.hover();
    await page.screenshot({ path: "test-results/e2e-screenshots/03-button-hover.png" });
    const shadow = await button.evaluate((el) => {
      if (!el) throw new Error("Button element not found");
      return window.getComputedStyle(el).boxShadow;
    });
    expect(shadow).not.toBe("none");
  });

  test("should test focus state for keyboard navigation", async ({ page }) => {
    await page.goto("/");
    const button = page.locator("button").first();
    await button.focus();
    await page.screenshot({ path: "test-results/e2e-screenshots/04-button-focus.png" });
    // Verify the button element is actually focused (not just any button)
    const focused = await page.evaluate(async () => {
      const firstButton = document.querySelector("button");
      const activeElement = document.activeElement;
      return firstButton === activeElement ? "focused" : "not-focused";
    });
    expect(focused).toBe("focused");
  });

  test("should test disabled button state", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("button[disabled]", { timeout: 5000 });
    const buttons = page.locator("button[disabled]");
    await page.screenshot({ path: "test-results/e2e-screenshots/05-button-disabled.png" });
    const opacity = await buttons.first().evaluate((el) => {
      if (!el) throw new Error("Disabled button element not found");
      return window.getComputedStyle(el).opacity;
    });
    expect(parseFloat(opacity)).toBeLessThan(1);
  });

  test("should test button contrast and readability", async ({ page }) => {
    await page.goto("/");
    const button = page.locator("button").first();
    await expect(button).toBeVisible();
    await page.screenshot({ path: "test-results/e2e-screenshots/06-button-contrast.png" });
    const styles = await button.evaluate((el) => {
      if (!el) throw new Error("Button element not found");
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        background: computed.backgroundColor,
        fontSize: computed.fontSize,
      };
    });
    const fontSizePx = parseFloat(styles.fontSize);
    expect(fontSizePx).toBeGreaterThanOrEqual(12);
  });
});
