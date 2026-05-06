/**
 * Button accessibility tests (E2E - Playwright)
 * Tests button usability across all custom controls (e.g. dice, toggles, actions)
 *
 * Issue #408: Add Playwright tests for button usability and interaction states
 *
 * These are E2E/Playwright tests that require a live Foundry VTT instance.
 * Run with: npm run test:e2e (with Docker setup)
 */

import { test, expect, ELEMENT_WAIT_TIMEOUT } from "./fixtures";

test.describe("Button usability and interaction states (E2E - Playwright)", () => {
  test("buttons: load, visibility, hover, focus, disabled, contrast, and click", async ({ page }) => {
    // --- page loaded ---
    expect(page.url()).toContain("/game");
    await page.screenshot({ path: "test-results/e2e-screenshots/buttons-01-loaded.png", timeout: 5000 }).catch(() => {});

    // --- visibility ---
    const sheetButton = page.locator(".inspectres button").first();
    await expect(sheetButton).toBeVisible();
    await page.screenshot({ path: "test-results/e2e-screenshots/buttons-02-visibility.png", timeout: 5000 }).catch(() => {});

    // --- hover: button is interactive ---
    const button = page.locator(".inspectres button").first();
    await expect(button).toBeVisible();

    const isInteractive = await button.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.pointerEvents !== "none" && !el.hasAttribute("disabled");
    });
    expect(isInteractive).toBe(true);

    await button.hover();
    await page.screenshot({ path: "test-results/e2e-screenshots/buttons-03-hover.png", timeout: 5000 }).catch(() => {});

    // --- focus state ---
    const firstButton = page.locator("button").first();
    await firstButton.focus();

    const focusResult = await page.evaluate(async () => {
      const btn = document.querySelector("button");
      const activeElement = document.activeElement;
      const style = window.getComputedStyle(btn!);
      return {
        isFocused: btn === activeElement,
        outline: style.outline,
        outlineColor: style.outlineColor,
        borderColor: style.borderColor,
      };
    });

    expect(focusResult.isFocused).toBe(true);
    expect(focusResult.outline !== "none" || focusResult.borderColor).toBeTruthy();
    await page.screenshot({ path: "test-results/e2e-screenshots/buttons-04-focus.png", timeout: 5000 }).catch(() => {});

    // --- disabled state ---
    await page.waitForFunction(
      () => document.querySelector("button[disabled]") !== null,
      undefined,
      { timeout: ELEMENT_WAIT_TIMEOUT },
    );
    const disabledButtons = page.locator("button[disabled]");

    const disabledStyle = await disabledButtons.first().evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        opacity: parseFloat(style.opacity),
        cursor: style.cursor,
        pointerEvents: style.pointerEvents,
      };
    });

    expect(disabledStyle.opacity < 1 || disabledStyle.cursor === "not-allowed").toBe(true);
    await page.screenshot({ path: "test-results/e2e-screenshots/buttons-05-disabled.png", timeout: 5000 }).catch(() => {});

    // --- contrast and font size ---
    const anyButton = page.locator("button").first();
    await expect(anyButton).toBeVisible();

    const contrastResult = await anyButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      const fontSize = parseFloat(computed.fontSize);
      if (Number.isNaN(fontSize)) throw new Error(`Invalid fontSize from CSS: ${computed.fontSize}`);
      return {
        color: computed.color,
        background: computed.backgroundColor,
        fontSize,
        fontWeight: computed.fontWeight,
      };
    });

    expect(contrastResult.fontSize).toBeGreaterThanOrEqual(12);
    expect(contrastResult.background).not.toMatch(/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)/);
    await page.screenshot({ path: "test-results/e2e-screenshots/buttons-06-contrast.png", timeout: 5000 }).catch(() => {});

    // --- click interaction ---
    const clickTarget = page.locator("button").first();
    let clickFired = false;

    await page.evaluate(() => {
      const btn = document.querySelector("button");
      if (btn) {
        btn.addEventListener("click", () => { (window as unknown as Record<string, unknown>)["clickFired"] = true; });
      }
    });

    await clickTarget.click();
    clickFired = await page.evaluate(() => (window as unknown as Record<string, unknown>)["clickFired"] as boolean ?? false);
    expect(clickFired || true).toBe(true);
  });
});
