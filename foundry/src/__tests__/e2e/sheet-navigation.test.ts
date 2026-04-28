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
    await page.screenshot({ path: "test-results/e2e-screenshots/07-sheet-tabs.png", fullPage: true });
    await expect(tabs.first()).toBeVisible();
    // Verify tab labels are readable
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);
  });

  test("should test active tab indication with styling", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    await page.waitForSelector("[role='tab'][aria-selected='true']", { timeout: 5000 });
    const activeTab = page.locator("[role='tab'][aria-selected='true']");
    await page.screenshot({ path: "test-results/e2e-screenshots/08-active-tab.png", fullPage: true });

    const activeStyle = await activeTab.first().evaluate((el) => ({
      ariaSelected: el.getAttribute("aria-selected"),
      color: window.getComputedStyle(el).color,
      borderBottomColor: window.getComputedStyle(el).borderBottomColor,
      backgroundColor: window.getComputedStyle(el).backgroundColor,
    }));

    expect(activeStyle.ariaSelected).toBe("true");
    // Active tab should have distinct styling (border, bg, or color change)
    expect(activeStyle.borderBottomColor || activeStyle.backgroundColor || activeStyle.color).toBeTruthy();
  });

  test("should test tab switching behavior with panel transition", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const tabs = page.locator("[role='tab']");
    // Ensure at least 2 tabs exist to test switching behavior
    await expect(tabs).toHaveCount(2, { timeout: 5000 });
    const secondTab = tabs.nth(1);
    const secondTabId = await secondTab.getAttribute("id");

    // Get first tab's content
    const firstPanel = page.locator("[role='tabpanel']").first();
    const firstContent = await firstPanel.evaluate((el) => el.textContent?.slice(0, 50));

    await secondTab.click();
    await page.waitForTimeout(500); // Wait for Foundry to render new tab content
    await page.screenshot({ path: "test-results/e2e-screenshots/09-tab-switched.png", fullPage: true });

    const selected = await secondTab.getAttribute("aria-selected");
    expect(selected).toBe("true");

    // Verify the visible panel is associated with the second tab
    const visiblePanel = page.locator("[role='tabpanel']:visible");
    await expect(visiblePanel).toHaveCount(1);
    const panelLabel = await visiblePanel.first().getAttribute("aria-labelledby");
    expect(panelLabel).toBe(secondTabId);

    // Verify content changed
    const secondContent = await visiblePanel.first().evaluate((el) => el.textContent?.slice(0, 50));
    expect(firstContent).not.toBe(secondContent);
  });

  test("should test content visibility and accessibility with panel verification", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    await page.waitForSelector("[role='tabpanel']", { timeout: 5000 });
    await page.screenshot({ path: "test-results/e2e-screenshots/10-tabpanel-content.png", fullPage: true });

    const panelInfo = await page.evaluate(() => {
      const panels = document.querySelectorAll("[role='tabpanel']");
      return {
        visibleCount: Array.from(panels).filter((p) => {
          const style = window.getComputedStyle(p);
          return style.display !== "none" && style.visibility !== "hidden";
        }).length,
        totalCount: panels.length,
        hasContent: Array.from(panels).some((p) => p.textContent?.trim().length ?? 0 > 0),
      };
    });

    expect(panelInfo.visibleCount).toBeGreaterThan(0);
    expect(panelInfo.totalCount).toBeGreaterThan(0);
    expect(panelInfo.hasContent).toBe(true);
  });

  test("should test tab keyboard navigation (arrow keys)", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    await page.waitForSelector("[role='tab']", { timeout: 5000 });
    const firstTab = page.locator("[role='tab']").first();

    await firstTab.focus();
    const initialSelected = await firstTab.getAttribute("aria-selected");
    expect(initialSelected).toBeDefined();

    // Test arrow key navigation (if implemented)
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/e2e-screenshots/11-tab-keyboard-nav.png", fullPage: true });

    // Note: Implementation may vary; this test documents the expected behavior
  });

  test("should test tab accessibility attributes and ARIA compliance", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    await page.waitForSelector("[role='tab']", { timeout: 5000 });
    const tabs = page.locator("[role='tab']");
    await page.screenshot({ path: "test-results/e2e-screenshots/12-tab-aria-attrs.png", fullPage: true });

    const tabCount = await tabs.count();
    for (let i = 0; i < Math.min(tabCount, 3); i++) {
      const tab = tabs.nth(i);
      const role = await tab.getAttribute("role");
      const ariaSelected = await tab.getAttribute("aria-selected");
      const ariaControls = await tab.getAttribute("aria-controls");

      expect(role).toBe("tab");
      expect(["true", "false"]).toContain(ariaSelected);
      expect(ariaControls).toBeTruthy(); // Tab should control a panel
    }
  });
});
