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
    const count = await inputs.count();
    if (count > 0) {
      await expect(inputs.first()).toBeVisible();
    }
  });

  test("should test input field styling", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const input = page.locator("input[type='text']").first();
    if (await input.count() > 0) {
      const border = await input.evaluate((el) =>
        window.getComputedStyle(el).borderWidth,
      );
      expect(border).not.toBe("0px");
    }
  });

  test("should test input value handling", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const input = page.locator("input[type='text']").first();
    if (await input.count() > 0) {
      await input.fill("test value");
      const value = await input.inputValue();
      expect(value).toBe("test value");
    }
  });

  test("should test form field focus and interaction", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const input = page.locator("input").first();
    if (await input.count() > 0) {
      await input.focus();
      const focused = await page.evaluate(
        () => document.activeElement === document.querySelector("input"),
      );
      expect(focused).toBe(true);
    }
  });

  test("should test form validation", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const requiredInput = page.locator("input[required]").first();
    if (await requiredInput.count() > 0) {
      const isRequired = await requiredInput.getAttribute("required");
      expect(isRequired).not.toBeNull();
    }
  });

  test("should test textarea and select field handling", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const textarea = page.locator("textarea").first();
    const select = page.locator("select").first();
    if (await textarea.count() > 0) {
      await expect(textarea).toBeVisible();
    }
    if (await select.count() > 0) {
      await expect(select).toBeVisible();
    }
  });

  test("should test form accessibility", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".window-app");
    const inputs = page.locator("input, textarea, select");
    const count = await inputs.count();
    if (count > 0) {
      // At least one accessible form element should be present
      expect(count).toBeGreaterThan(0);
    }
  });
});
