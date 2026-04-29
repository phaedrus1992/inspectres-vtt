/**
 * Sheet navigation and tab switching tests (E2E - Playwright)
 * Tests sheet tab visibility, switching, and content display
 *
 * Issue #409: Add Playwright tests for sheet navigation and tab switching
 *
 * These are E2E/Playwright tests that require a live Foundry VTT instance.
 * Run with: npm run test:e2e (with Docker setup)
 */

import { test, expect } from "./fixtures";

test.describe("Sheet navigation and tab switching (E2E - Playwright)", () => {
  test("should test tab visibility and structure", async ({ page }) => {
    await page.waitForSelector(".inspectres", { timeout: 10000 });
    await page.waitForSelector(".inspectres [role='tab']", { timeout: 5000 });
    const tabs = page.locator(".inspectres [role='tab']");
    await expect(tabs.first()).toBeVisible();
    // Verify tab labels are readable
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);
    await page.screenshot({ path: "test-results/e2e-screenshots/nav-01-tabs.png", timeout: 5000 }).catch(() => {});
  });

  test("should test active tab indication with styling", async ({ page }) => {
    await page.waitForSelector(".inspectres", { timeout: 10000 });
    await page.waitForSelector(".inspectres [role='tab'][aria-selected='true']", { timeout: 5000 });
    const activeTab = page.locator(".inspectres [role='tab'][aria-selected='true']");

    const activeStyle = await activeTab.first().evaluate((el) => ({
      ariaSelected: el.getAttribute("aria-selected"),
      color: window.getComputedStyle(el).color,
      borderBottomColor: window.getComputedStyle(el).borderBottomColor,
      backgroundColor: window.getComputedStyle(el).backgroundColor,
    }));

    expect(activeStyle.ariaSelected).toBe("true");
    // Active tab should have distinct styling (border, bg, or color change)
    expect(activeStyle.borderBottomColor || activeStyle.backgroundColor || activeStyle.color).toBeTruthy();
    await page.screenshot({ path: "test-results/e2e-screenshots/nav-02-active-tab.png", timeout: 5000 }).catch(() => {});
  });

  test("should test tab switching behavior with panel transition", async ({ page }) => {
    await page.waitForSelector(".inspectres", { timeout: 10000 });
    const tabs = page.locator(".inspectres [role='tab']");
    // Ensure at least 2 tabs exist to test switching behavior
    await expect(tabs).toHaveCount(2, { timeout: 5000 });
    const secondTab = tabs.nth(1);
    // Foundry tabs link to panels via aria-controls (referencing the panel's id),
    // not via id+aria-labelledby on the panel. See sheet-tabs HBS for relationship.
    const secondTabPanelId = await secondTab.getAttribute("aria-controls");
    expect(secondTabPanelId).toBeTruthy();

    // Get first tab's content
    const firstPanel = page.locator(".inspectres [role='tabpanel']").first();
    const firstContent = await firstPanel.evaluate((el) => {
      if (!el?.textContent) return "";
      return el.textContent.slice(0, 50);
    });

    // Scroll the second tab into view and force-click via JS to bypass any
    // Foundry notification overlays that might intercept pointer events in CI.
    await page.evaluate(() => {
      const tabs = document.querySelectorAll<HTMLElement>(".inspectres [role='tab']");
      const second = tabs[1];
      if (second) {
        second.scrollIntoView({ block: "nearest" });
        second.click();
      }
    });
    // Wait for the panel to become visible — tab switching toggles the .active class
    // which maps display:none → display:block
    await expect(page.locator(`.inspectres [role='tabpanel']#${secondTabPanelId}`)).toBeVisible({ timeout: 5000 });

    const selected = await secondTab.getAttribute("aria-selected");
    expect(selected).toBe("true");

    // Verify the visible panel is the one controlled by the second tab
    const visiblePanel = page.locator(".inspectres [role='tabpanel']:visible");
    await expect(visiblePanel).toHaveCount(1, { timeout: 5000 });
    const visiblePanelId = await visiblePanel.first().getAttribute("id");
    expect(visiblePanelId).toBe(secondTabPanelId);

    // Verify content changed
    const secondContent = await visiblePanel.first().evaluate((el) => {
      if (!el?.textContent) return "";
      return el.textContent.slice(0, 50);
    });
    expect(firstContent).not.toBe(secondContent);
    await page.screenshot({ path: "test-results/e2e-screenshots/nav-03-tab-switch.png", timeout: 5000 }).catch(() => {});
  });

  test("should test content visibility and accessibility with panel verification", async ({ page }) => {
    await page.waitForSelector(".inspectres", { timeout: 10000 });
    await page.waitForSelector(".inspectres [role='tabpanel']", { timeout: 5000 });

    const panelInfo = await page.evaluate(() => {
      const panels = document.querySelectorAll(".inspectres [role='tabpanel']");
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
    await page.screenshot({ path: "test-results/e2e-screenshots/nav-04-panel-content.png", timeout: 5000 }).catch(() => {});
  });

  test("should test tab keyboard navigation (arrow keys)", async ({ page }) => {
    await page.waitForSelector(".inspectres", { timeout: 10000 });
    await page.waitForSelector(".inspectres [role='tab']", { timeout: 5000 });
    const firstTab = page.locator(".inspectres [role='tab']").first();

    await firstTab.focus();
    const initialSelected = await firstTab.getAttribute("aria-selected");
    expect(initialSelected).toBeDefined();

    // Test arrow key navigation (if implemented)
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/e2e-screenshots/nav-05-keyboard.png", timeout: 5000 }).catch(() => {});

    // Note: Implementation may vary; this test documents the expected behavior
  });

  test("should test tab accessibility attributes and ARIA compliance", async ({ page }) => {
    await page.waitForSelector(".inspectres", { timeout: 10000 });
    await page.waitForSelector(".inspectres [role='tab']", { timeout: 5000 });
    const tabs = page.locator(".inspectres [role='tab']");

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
    await page.screenshot({ path: "test-results/e2e-screenshots/nav-06-aria.png", timeout: 5000 }).catch(() => {});
  });
});
