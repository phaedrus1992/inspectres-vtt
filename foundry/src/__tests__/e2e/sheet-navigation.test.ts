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
    // Wait for sheet content to render before checking tabs
    await page.waitForSelector("[role='tab']", { timeout: 5000 }).catch(() => {});
    await expect(tabs.first()).toBeVisible();
  });

  test("should test active tab indication", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const activeTab = page.locator("[role='tab'][aria-selected='true']");
    await page.waitForSelector("[role='tab'][aria-selected='true']", { timeout: 5000 }).catch(() => {});
    const ariaSelected = await activeTab.first().getAttribute("aria-selected");
    expect(ariaSelected).toBe("true");
  });

  test("should test tab switching behavior", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const tabs = page.locator("[role='tab']");
    await page.waitForSelector("[role='tab']:nth-of-type(2)", { timeout: 5000 }).catch(() => {});
    const secondTab = tabs.nth(1);
    await secondTab.click();
    const selected = await secondTab.getAttribute("aria-selected");
    expect(selected).toBe("true");
  });

  test("should test content visibility and accessibility", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    await page.waitForSelector("[role='tabpanel']", { timeout: 5000 }).catch(() => {});
    const visibleCount = await page.locator("[role='tabpanel']:visible").count();
    expect(visibleCount).toBeGreaterThan(0);
  });

  test("should test tab accessibility attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const tabs = page.locator("[role='tab']");
    await page.waitForSelector("[role='tab']", { timeout: 5000 }).catch(() => {});
    const role = await tabs.first().getAttribute("role");
    expect(role).toBe("tab");
  });
});
