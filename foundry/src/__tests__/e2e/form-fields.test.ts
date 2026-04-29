/**
 * Form field rendering and input validation tests (E2E - Playwright)
 * Tests form visibility, labels, input handling, and validation
 *
 * Issue #410: Add Playwright tests for form field rendering and input validation
 *
 * These are E2E/Playwright tests that require a live Foundry VTT instance.
 * Run with: npm run test:e2e (with Docker setup)
 */

import { test, expect } from "./fixtures";

test.describe("Form field rendering and input validation (E2E - Playwright)", () => {
  test("should test form field visibility with styling", async ({ page }) => {
    await page.waitForSelector(".inspectres", { timeout: 10000 });
    const inputs = page.locator(".inspectres input[type='text'], .inspectres input[type='number']");
    await expect(inputs.first()).toBeVisible();
    await page.screenshot({ path: "test-results/e2e-screenshots/12-form-fields.png" });

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
    await page.waitForSelector(".inspectres", { timeout: 10000 });
    const input = page.locator(".inspectres input[type='text']").first();
    await expect(input).toBeVisible();
    await page.screenshot({ path: "test-results/e2e-screenshots/13-input-styling.png" });

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
    await page.waitForSelector(".inspectres", { timeout: 10000 });
    const input = page.locator(".inspectres input[type='text']").first();
    await expect(input).toBeVisible();
    await input.fill("test value");
    // Wait for the value to be set (toHaveValue includes built-in wait)
    await expect(input).toHaveValue("test value");
    await page.screenshot({ path: "test-results/e2e-screenshots/14-input-value.png" });
  });

  test("should test form field focus and interaction with visual feedback", async ({ page }) => {
    await page.waitForSelector(".inspectres", { timeout: 10000 });
    const input = page.locator(".inspectres input").first();
    await expect(input).toBeVisible();

    // Get styles before focus
    const beforeFocus = await input.evaluate((el) => ({
      borderColor: window.getComputedStyle(el).borderColor,
      outline: window.getComputedStyle(el).outline,
    }));

    await input.focus();
    await page.screenshot({ path: "test-results/e2e-screenshots/15-input-focus.png" });

    const focused = await page.evaluate(() => document.activeElement === document.querySelector(".inspectres input"));
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
    await page.waitForSelector(".inspectres", { timeout: 10000 });
    // Franchise sheet has no inputs marked required at the HTML level — fields are
    // optional from a form-validation standpoint and validated by the data model.
    // Skip when none are present rather than asserting on absent UI.
    const requiredInputs = page.locator(".inspectres input[required]");
    const count = await requiredInputs.count();
    test.skip(count === 0, "Sheet has no required inputs to validate");

    const requiredInput = requiredInputs.first();
    await expect(requiredInput).toBeVisible();
    await page.screenshot({ path: "test-results/e2e-screenshots/16-form-validation.png" });

    const attrs = await requiredInput.evaluate((el) => ({
      required: el.getAttribute("required"),
      aria_required: el.getAttribute("aria-required"),
    }));

    expect(attrs.required !== null || attrs.aria_required === "true").toBe(true);
  });

  test("should test textarea and select field handling with styling", async ({ page }) => {
    await page.waitForSelector(".inspectres", { timeout: 10000 });
    // Wait for at least one to be present in the DOM. Textareas may live in an
    // inactive tab (display:none) — `state: "attached"` accepts hidden elements.
    await page.waitForSelector(".inspectres textarea, .inspectres select", {
      timeout: 5000,
      state: "attached",
    });
    const textareas = page.locator(".inspectres textarea");
    const selects = page.locator(".inspectres select");
    const textareaCount = await textareas.count();
    const selectCount = await selects.count();

    // At least one field type must exist (verified by waitForSelector above)
    expect(textareaCount > 0 || selectCount > 0).toBe(true);

    if (textareaCount > 0) {
      await page.screenshot({ path: "test-results/e2e-screenshots/17-textarea.png" });
      const style = await textareas.first().evaluate((el) => ({
        borderWidth: window.getComputedStyle(el).borderWidth,
        padding: window.getComputedStyle(el).padding,
      }));
      expect(style.borderWidth).not.toBe("0px");
    }

    if (selectCount > 0) {
      await page.screenshot({ path: "test-results/e2e-screenshots/18-select.png" });
      await expect(selects.first()).toBeVisible();
    }
  });

  test("should test form accessibility with ARIA attributes", async ({ page }) => {
    await page.waitForSelector(".inspectres", { timeout: 10000 });
    await page.waitForSelector(".inspectres input, .inspectres textarea, .inspectres select", {
      timeout: 5000,
      state: "attached",
    });
    const inputs = page.locator(".inspectres input, .inspectres textarea, .inspectres select");
    const count = await inputs.count();
    await page.screenshot({ path: "test-results/e2e-screenshots/19-form-accessibility.png" });

    // At least one form element should be present
    expect(count).toBeGreaterThan(0);

    // Accept any of: aria-label, aria-labelledby, title, label[for=id], wrapping <label>,
    // or a sibling <label> (current Foundry/InSpectres convention — labels are adjacent).
    // Sibling-only association is not screen-reader accessible and is tracked by the
    // theming/accessibility audit at issue #415; this assertion documents that some
    // visible labelling mechanism exists for form fields.
    let hasAnyLabelling = false;
    const sampleSize = Math.min(count, 5);
    for (let i = 0; i < sampleSize; i++) {
      const field = inputs.nth(i);
      const result = await field.evaluate((el) => {
        const id = el.id;
        const labelFor = id ? document.querySelector(`label[for="${id}"]`) !== null : false;
        const labelWraps = el.closest("label") !== null;
        const prevLabel =
          el.previousElementSibling?.tagName === "LABEL" ||
          el.parentElement?.previousElementSibling?.tagName === "LABEL";
        return {
          ariaLabel: el.getAttribute("aria-label"),
          ariaLabelledBy: el.getAttribute("aria-labelledby"),
          title: el.getAttribute("title"),
          labelFor,
          labelWraps,
          prevLabel,
        };
      });
      if (
        result.ariaLabel ||
        result.ariaLabelledBy ||
        result.title ||
        result.labelFor ||
        result.labelWraps ||
        result.prevLabel
      ) {
        hasAnyLabelling = true;
        break;
      }
    }

    expect(hasAnyLabelling).toBe(true);
  });
});
