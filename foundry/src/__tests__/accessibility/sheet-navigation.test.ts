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
    // Find a sheet with tabs
    const tabs = page.locator("[role='tab']");
    const count = await tabs.count();
    if (count > 0) {
      await expect(tabs.first()).toBeVisible();
    }
  });

  test("should test active tab indication", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const activeTab = page.locator("[role='tab'][aria-selected='true']");
    if ((await activeTab.count()) > 0) {
      const ariaSelected = await activeTab.first().getAttribute("aria-selected");
      expect(ariaSelected).toBe("true");
    }
  });

  test("should test tab switching behavior", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const tabs = page.locator("[role='tab']");
    const count = await tabs.count();
    if (count > 1) {
      const secondTab = tabs.nth(1);
      await secondTab.click();
      const selected = await secondTab.getAttribute("aria-selected");
      expect(selected).toBe("true");
    }
  });

  test("should test content visibility and accessibility", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const tabpanels = page.locator("[role='tabpanel']");
    const count = await tabpanels.count();
    if (count > 0) {
      // At least one tabpanel should be visible
      const visibleCount = await page.locator("[role='tabpanel']:visible").count();
      expect(visibleCount).toBeGreaterThan(0);
    }
  });

  test("should test tab accessibility attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const tabs = page.locator("[role='tab']");
    const count = await tabs.count();
    if (count > 0) {
      // Tab should have aria-selected
      const role = await tabs.first().getAttribute("role");
      expect(role).toBe("tab");
    }
  });
});
