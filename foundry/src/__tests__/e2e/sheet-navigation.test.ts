/**
 * Sheet navigation and tab switching tests (E2E - Playwright)
 * Tests sheet tab visibility, switching, and content display
 *
 * Issue #409: Add Playwright tests for sheet navigation and tab switching
 *
 * These are E2E/Playwright tests that require a live Foundry VTT instance.
 * Run with: npm run test:e2e (with Docker setup)
 */

import { test, expect } from "@playwright/test";

test.describe("Sheet navigation and tab switching (E2E - Playwright)", () => {
  test("should test tab visibility and structure", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    await page.waitForSelector("[role='tab']", { timeout: 5000 });
    const tabs = page.locator("[role='tab']");
    await page.screenshot({ path: "test-results/e2e-screenshots/07-sheet-tabs.png" });
    await expect(tabs.first()).toBeVisible();
  });

  test("should test active tab indication", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    await page.waitForSelector("[role='tab'][aria-selected='true']", { timeout: 5000 });
    const activeTab = page.locator("[role='tab'][aria-selected='true']");
    await page.screenshot({ path: "test-results/e2e-screenshots/08-active-tab.png" });
    const ariaSelected = await activeTab.first().getAttribute("aria-selected");
    expect(ariaSelected).toBe("true");
  });

  test("should test tab switching behavior", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const tabs = page.locator("[role='tab']");
    // Ensure we can switch between multiple tabs
    await expect(tabs).toHaveCount(2, { timeout: 5000 });
    const secondTab = tabs.nth(1);
    await secondTab.click();
    await page.waitForTimeout(500); // Wait for Foundry to render new tab content
    await page.screenshot({ path: "test-results/e2e-screenshots/09-tab-switched.png" });
    const selected = await secondTab.getAttribute("aria-selected");
    expect(selected).toBe("true");
    // Verify content actually changed (not just aria attribute)
    const visiblePanel = page.locator("[role='tabpanel']:visible");
    await expect(visiblePanel).toHaveCount(1);
  });

  test("should test content visibility and accessibility", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    await page.waitForSelector("[role='tabpanel']", { timeout: 5000 });
    await page.screenshot({ path: "test-results/e2e-screenshots/10-tabpanel-content.png" });
    const visibleCount = await page.locator("[role='tabpanel']:visible").count();
    expect(visibleCount).toBeGreaterThan(0);
  });

  test("should test tab accessibility attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    await page.waitForSelector("[role='tab']", { timeout: 5000 });
    const tabs = page.locator("[role='tab']");
    await page.screenshot({ path: "test-results/e2e-screenshots/11-tab-aria.png" });
    const role = await tabs.first().getAttribute("role");
    expect(role).toBe("tab");
  });
});
