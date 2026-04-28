/**
 * Form field rendering and input validation tests (E2E - Playwright)
 * Tests form visibility, labels, input handling, and validation
 *
 * Issue #410: Add Playwright tests for form field rendering and input validation
 *
 * These are E2E/Playwright tests that require a live Foundry VTT instance.
 * Run with: npm run test:e2e (with Docker setup)
 */

import { test, expect } from "@playwright/test";

test.describe("Form field rendering and input validation (E2E - Playwright)", () => {
  test("should test form field visibility with styling", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app", { timeout: 10000 });
    const inputs = page.locator("input[type='text'], input[type='number']");
    await expect(inputs.first()).toBeVisible();
    await page.screenshot({ path: "test-results/e2e-screenshots/12-form-fields.png", fullPage: true });

    // Verify field is readable (has color and is not invisible)
    const style = await inputs.first().evaluate((el) => ({
      display: window.getComputedStyle(el).display,
      opacity: window.getComputedStyle(el).opacity,
      color: window.getComputedStyle(el).color,
    }));
    expect(style.display).not.toBe("none");
    expect(parseFloat(style.opacity)).toBeGreaterThan(0);
  });

  test("should test input field styling with border verification", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app", { timeout: 10000 });
    const input = page.locator("input[type='text']").first();
    await expect(input).toBeVisible();
    await page.screenshot({ path: "test-results/e2e-screenshots/13-input-styling.png", fullPage: true });

    const style = await input.evaluate((el) => {
      if (!el) throw new Error("Text input element not found");
      const computed = window.getComputedStyle(el);
      return {
        borderWidth: computed.borderWidth,
        borderStyle: computed.borderStyle,
        borderColor: computed.borderColor,
        backgroundColor: computed.backgroundColor,
        padding: computed.padding,
      };
    });

    expect(style.borderWidth).not.toBe("0px");
    expect(style.backgroundColor).toBeTruthy();
  });

  test("should test input value handling", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app", { timeout: 10000 });
    const input = page.locator("input[type='text']").first();
    await expect(input).toBeVisible();
    await input.fill("test value");
    // Wait for the value to be set (toHaveValue includes built-in wait)
    await expect(input).toHaveValue("test value");
    await page.screenshot({ path: "test-results/e2e-screenshots/14-input-value.png", fullPage: true });
  });

  test("should test form field focus and interaction with visual feedback", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app", { timeout: 10000 });
    const input = page.locator("input").first();
    await expect(input).toBeVisible();

    // Get styles before focus
    const beforeFocus = await input.evaluate((el) => ({
      borderColor: window.getComputedStyle(el).borderColor,
      outline: window.getComputedStyle(el).outline,
    }));

    await input.focus();
    await page.screenshot({ path: "test-results/e2e-screenshots/15-input-focus.png", fullPage: true });

    const focused = await page.evaluate(() => document.activeElement === document.querySelector("input"));
    expect(focused).toBe(true);

    // Get styles after focus
    const afterFocus = await input.evaluate((el) => ({
      borderColor: window.getComputedStyle(el).borderColor,
      outline: window.getComputedStyle(el).outline,
    }));

    // Focus should change visual appearance
    const styleChanged = beforeFocus.borderColor !== afterFocus.borderColor || beforeFocus.outline !== afterFocus.outline;
    expect(styleChanged || afterFocus.outline !== "none").toBe(true);
  });

  test("should test form validation with required fields", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app", { timeout: 10000 });
    const requiredInput = page.locator("input[required]").first();
    await expect(requiredInput).toBeVisible();
    await page.screenshot({ path: "test-results/e2e-screenshots/16-form-validation.png", fullPage: true });

    const attrs = await requiredInput.evaluate((el) => ({
      required: el.getAttribute("required"),
      aria_required: el.getAttribute("aria-required"),
    }));

    expect(attrs.required !== null || attrs.aria_required === "true").toBe(true);
  });

  test("should test textarea and select field handling with styling", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app", { timeout: 10000 });
    // Wait for at least one form element with multiple field types
    await page.waitForSelector("textarea, select", { timeout: 5000 });
    const textareas = page.locator("textarea");
    const selects = page.locator("select");
    const textareaCount = await textareas.count();
    const selectCount = await selects.count();

    // At least one field type must exist (verified by waitForSelector above)
    expect(textareaCount > 0 || selectCount > 0).toBe(true);

    if (textareaCount > 0) {
      await page.screenshot({ path: "test-results/e2e-screenshots/17-textarea.png", fullPage: true });
      const style = await textareas.first().evaluate((el) => ({
        borderWidth: window.getComputedStyle(el).borderWidth,
        padding: window.getComputedStyle(el).padding,
      }));
      expect(style.borderWidth).not.toBe("0px");
    }

    if (selectCount > 0) {
      await page.screenshot({ path: "test-results/e2e-screenshots/18-select.png", fullPage: true });
      await expect(selects.first()).toBeVisible();
    }
  });

  test("should test form accessibility with ARIA attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app", { timeout: 10000 });
    await page.waitForSelector("input, textarea, select", { timeout: 5000 });
    const inputs = page.locator("input, textarea, select");
    const count = await inputs.count();
    await page.screenshot({ path: "test-results/e2e-screenshots/19-form-accessibility.png", fullPage: true });

    // At least one accessible form element should be present
    expect(count).toBeGreaterThan(0);

    // Verify some fields have labels or aria-label
    let hasAccessibility = false;
    for (let i = 0; i < Math.min(count, 3); i++) {
      const field = inputs.nth(i);
      const [ariaLabel, ariaLabelledBy, title] = await field.evaluate((el) => [
        el.getAttribute("aria-label"),
        el.getAttribute("aria-labelledby"),
        el.getAttribute("title"),
      ]);
      if (ariaLabel || ariaLabelledBy || title) {
        hasAccessibility = true;
        break;
      }
    }
    // Verify fields exist AND some have accessible names
    expect(hasAccessibility).toBe(true);
  });
});
