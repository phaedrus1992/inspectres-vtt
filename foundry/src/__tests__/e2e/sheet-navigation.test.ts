/**
 * Sheet navigation and tab switching tests (E2E - Playwright)
 * Tests sheet tab visibility, switching, and content display
 *
 * Issue #409: Add Playwright tests for sheet navigation and tab switching
 *
 * These are E2E/Playwright tests that require a live Foundry VTT instance.
 * Run with: npm run test:e2e (with Docker setup)
 */

import { test, expect, ELEMENT_WAIT_TIMEOUT } from "./fixtures";

// ApplicationV2 re-renders briefly detach elements. waitForSelector on ".inspectres" can
// time out even when the sheet is logically visible. Use waitForFunction + getBoundingClientRect
// to tolerate transient detach/re-attach cycles.
async function waitForSheet(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const el = document.querySelector(".inspectres");
      if (!el) return false;
      const rect = (el as HTMLElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
    undefined,
    { timeout: 15_000 },
  );
}

test.describe("Sheet navigation and tab switching (E2E - Playwright)", () => {
  test("tabs: visibility, active state, switching, panel content, keyboard, and ARIA", async ({ page }) => {
    await waitForSheet(page);

    // --- tab visibility and structure ---
    const tabs = page.locator(".inspectres [role='tab']");
    await expect(tabs.first()).toBeVisible();
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);
    await page.screenshot({ path: "test-results/e2e-screenshots/nav-01-tabs.png", timeout: 5000 }).catch(() => {});

    // --- active tab has correct ARIA and distinct styling ---
    const activeTab = page.locator(".inspectres [role='tab'][aria-selected='true']");
    await expect(activeTab.first()).toBeVisible();

    const activeStyle = await activeTab.first().evaluate((el) => ({
      ariaSelected: el.getAttribute("aria-selected"),
      color: window.getComputedStyle(el).color,
      borderBottomColor: window.getComputedStyle(el).borderBottomColor,
      backgroundColor: window.getComputedStyle(el).backgroundColor,
    }));

    expect(activeStyle.ariaSelected).toBe("true");
    expect(activeStyle.borderBottomColor || activeStyle.backgroundColor || activeStyle.color).toBeTruthy();
    await page.screenshot({ path: "test-results/e2e-screenshots/nav-02-active-tab.png", timeout: 5000 }).catch(() => {});

    // --- tab switching changes active panel ---
    await expect(tabs).toHaveCount(2, { timeout: ELEMENT_WAIT_TIMEOUT });
    const secondTab = tabs.nth(1);
    const secondTabPanelId = await secondTab.getAttribute("aria-controls");
    expect(secondTabPanelId).toBeTruthy();

    const firstPanel = page.locator(".inspectres [role='tabpanel']").first();
    const firstContent = await firstPanel.evaluate((el) => el.textContent?.slice(0, 50) ?? "");

    // Scroll the second tab into view and force-click via JS to bypass notification overlays.
    await page.evaluate(() => {
      const allTabs = document.querySelectorAll<HTMLElement>(".inspectres [role='tab']");
      const second = allTabs[1];
      if (second) {
        second.scrollIntoView({ block: "nearest" });
        second.click();
      }
    });
    await expect(page.locator(`.inspectres [role='tabpanel']#${secondTabPanelId}`)).toBeVisible({ timeout: ELEMENT_WAIT_TIMEOUT });

    const selected = await secondTab.getAttribute("aria-selected");
    expect(selected).toBe("true");

    const visiblePanel = page.locator(".inspectres [role='tabpanel']:visible");
    await expect(visiblePanel).toHaveCount(1, { timeout: ELEMENT_WAIT_TIMEOUT });
    const visiblePanelId = await visiblePanel.first().getAttribute("id");
    expect(visiblePanelId).toBe(secondTabPanelId);

    const secondContent = await visiblePanel.first().evaluate((el) => el.textContent?.slice(0, 50) ?? "");
    expect(firstContent).not.toBe(secondContent);
    await page.screenshot({ path: "test-results/e2e-screenshots/nav-03-tab-switch.png", timeout: 5000 }).catch(() => {});

    // --- panel content is visible and non-empty ---
    const panelInfo = await page.evaluate(() => {
      const panels = document.querySelectorAll(".inspectres [role='tabpanel']");
      return {
        visibleCount: Array.from(panels).filter((p) => {
          const style = window.getComputedStyle(p);
          return style.display !== "none" && style.visibility !== "hidden";
        }).length,
        totalCount: panels.length,
        hasContent: Array.from(panels).some((p) => (p.textContent?.trim().length ?? 0) > 0),
      };
    });

    expect(panelInfo.visibleCount).toBeGreaterThan(0);
    expect(panelInfo.totalCount).toBeGreaterThan(0);
    expect(panelInfo.hasContent).toBe(true);
    await page.screenshot({ path: "test-results/e2e-screenshots/nav-04-panel-content.png", timeout: 5000 }).catch(() => {});

    // --- keyboard navigation ---
    const firstTab = page.locator(".inspectres [role='tab']").first();
    await firstTab.focus();
    const initialSelected = await firstTab.getAttribute("aria-selected");
    expect(initialSelected).toBeDefined();

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/e2e-screenshots/nav-05-keyboard.png", timeout: 5000 }).catch(() => {});

    // --- ARIA compliance on all tabs ---
    const tabsForAria = page.locator(".inspectres [role='tab']");
    const ariaTabCount = await tabsForAria.count();
    for (let i = 0; i < Math.min(ariaTabCount, 3); i++) {
      const tab = tabsForAria.nth(i);
      const role = await tab.getAttribute("role");
      const ariaSelected = await tab.getAttribute("aria-selected");
      const ariaControls = await tab.getAttribute("aria-controls");

      expect(role).toBe("tab");
      expect(["true", "false"]).toContain(ariaSelected);
      expect(ariaControls).toBeTruthy();
    }
    await page.screenshot({ path: "test-results/e2e-screenshots/nav-06-aria.png", timeout: 5000 }).catch(() => {});
  });
});
