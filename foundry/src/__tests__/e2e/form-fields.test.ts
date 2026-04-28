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
  test("should test form field visibility", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const inputs = page.locator("input[type='text'], input[type='number']");
    await expect(inputs.first()).toBeVisible();
    await page.screenshot({ path: "test-results/e2e-screenshots/12-form-fields.png" });
  });

  test("should test input field styling", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const input = page.locator("input[type='text']").first();
    await expect(input).toBeVisible();
    await page.screenshot({ path: "test-results/e2e-screenshots/13-input-styling.png" });
    const border = await input.evaluate((el) => {
      if (!el) throw new Error("Text input element not found");
      return window.getComputedStyle(el).borderWidth;
    });
    expect(border).not.toBe("0px");
  });

  test("should test input value handling", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const input = page.locator("input[type='text']").first();
    await expect(input).toBeVisible();
    await input.fill("test value");
    // Wait for the value to be set (toHaveValue includes built-in wait)
    await expect(input).toHaveValue("test value");
    await page.screenshot({ path: "test-results/e2e-screenshots/14-input-value.png" });
  });

  test("should test form field focus and interaction", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const input = page.locator("input").first();
    await expect(input).toBeVisible();
    await input.focus();
    await page.screenshot({ path: "test-results/e2e-screenshots/15-input-focus.png" });
    const focused = await page.evaluate(
      () => document.activeElement === document.querySelector("input"),
    );
    expect(focused).toBe(true);
  });

  test("should test form validation", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const requiredInput = page.locator("input[required]").first();
    await expect(requiredInput).toBeVisible();
    await page.screenshot({ path: "test-results/e2e-screenshots/16-form-validation.png" });
    const isRequired = await requiredInput.getAttribute("required");
    expect(isRequired).not.toBeNull();
  });

  test("should test textarea and select field handling", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    // Wait for at least one form element with multiple field types
    await page.waitForSelector("textarea, select", { timeout: 5000 });
    const textareas = page.locator("textarea");
    const selects = page.locator("select");
    const hasTextarea = await textareas.count() > 0;
    const hasSelect = await selects.count() > 0;
    if (hasTextarea) {
      await page.screenshot({ path: "test-results/e2e-screenshots/17-textarea.png" });
      await expect(textareas.first()).toBeVisible();
    }
    if (hasSelect) {
      await page.screenshot({ path: "test-results/e2e-screenshots/18-select.png" });
      await expect(selects.first()).toBeVisible();
    }
  });

  test("should test form accessibility", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    await page.waitForSelector("input, textarea, select", { timeout: 5000 });
    const inputs = page.locator("input, textarea, select");
    const count = await inputs.count();
    await page.screenshot({ path: "test-results/e2e-screenshots/19-form-accessibility.png" });
    // At least one accessible form element should be present
    expect(count).toBeGreaterThan(0);
  });
});
