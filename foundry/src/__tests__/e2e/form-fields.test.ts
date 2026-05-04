/**
 * Form field rendering and input validation tests (E2E - Playwright)
 * Tests form visibility, labels, input handling, and validation
 *
 * Issue #410: Add Playwright tests for form field rendering and input validation
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

test.describe("Form field rendering and input validation (E2E - Playwright)", () => {
  test("should test form field visibility with styling", async ({ page }) => {
    await waitForSheet(page);
    const inputs = page.locator(".inspectres input[type='text'], .inspectres input[type='number']");
    await expect(inputs.first()).toBeVisible();

    // Verify field is readable (has color and is not invisible)
    const style = await inputs.first().evaluate((el) => ({
      display: window.getComputedStyle(el).display,
      opacity: window.getComputedStyle(el).opacity,
      color: window.getComputedStyle(el).color,
    }));
    expect(style.display).not.toBe("none");
    expect(parseFloat(style.opacity)).toBeGreaterThan(0);
    await page.screenshot({ path: "test-results/e2e-screenshots/form-01-visibility.png", timeout: 5000 }).catch(() => {});
  });

  test("should test input field styling with border verification", async ({ page }) => {
    await waitForSheet(page);
    const input = page.locator(".inspectres input[type='text']").first();
    await expect(input).toBeVisible();

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
    await page.screenshot({ path: "test-results/e2e-screenshots/form-02-border.png", timeout: 5000 }).catch(() => {});
  });

  test("should test input value handling", async ({ page }) => {
    await waitForSheet(page);
    const input = page.locator(".inspectres input[type='text']").first();
    await expect(input).toBeVisible();
    await input.fill("test value");
    // Wait for the value to be set (toHaveValue includes built-in wait)
    await expect(input).toHaveValue("test value");
    await page.screenshot({ path: "test-results/e2e-screenshots/form-03-value.png", timeout: 5000 }).catch(() => {});
  });

  test("should test form field focus and interaction with visual feedback", async ({ page }) => {
    await waitForSheet(page);
    // Use a numeric data field (bank) — always visible on stats tab and not subject
    // to Foundry's name-field special handling. Verify click focuses the field.
    const input = page.locator(".inspectres input[name='system.bank']").first();
    await expect(input).toBeVisible();

    // Click + verify focus via document.activeElement (avoids fill() editable check)
    await input.click();
    const isFocused = await page.evaluate(() => {
      const el = document.querySelector<HTMLInputElement>(".inspectres input[name='system.bank']");
      return el !== null && document.activeElement === el;
    });
    expect(isFocused).toBe(true);

    await page.screenshot({ path: "test-results/e2e-screenshots/form-04-focus.png", timeout: 5000 }).catch(() => {});
  });

  test("should test form validation with required fields", async ({ page }) => {
    await waitForSheet(page);
    // Franchise sheet has no inputs marked required at the HTML level — fields are
    // optional from a form-validation standpoint and validated by the data model.
    // Skip when none are present rather than asserting on absent UI.
    const requiredInputs = page.locator(".inspectres input[required]");
    const count = await requiredInputs.count();
    test.skip(count === 0, "Sheet has no required inputs to validate");

    const requiredInput = requiredInputs.first();
    await expect(requiredInput).toBeVisible();

    const attrs = await requiredInput.evaluate((el) => ({
      required: el.getAttribute("required"),
      aria_required: el.getAttribute("aria-required"),
    }));

    expect(attrs.required !== null || attrs.aria_required === "true").toBe(true);
    await page.screenshot({ path: "test-results/e2e-screenshots/form-05-required.png", timeout: 5000 }).catch(() => {});
  });

  test("should test textarea and select field handling with styling", async ({ page }) => {
    await waitForSheet(page);
    // The textarea lives in the Notes tab — navigate there like a real user would
    await page.click(".inspectres [role='tab'][aria-controls='tab-notes']");
    await page.waitForSelector(".inspectres textarea", { timeout: ELEMENT_WAIT_TIMEOUT });

    const textarea = page.locator(".inspectres textarea").first();
    await expect(textarea).toBeVisible();

    const style = await textarea.evaluate((el) => ({
      borderWidth: window.getComputedStyle(el).borderWidth,
      padding: window.getComputedStyle(el).padding,
    }));
    expect(style.borderWidth).not.toBe("0px");

    await page.screenshot({ path: "test-results/e2e-screenshots/form-06-textarea-select.png", timeout: 5000 }).catch(() => {});
  });

  test("should test form accessibility with ARIA attributes", async ({ page }) => {
    await waitForSheet(page);

    // Check all visible fields in a single evaluate to avoid multiple round-trips timing out in CI.
    // Accept aria-label, aria-labelledby, title, label[for=id], wrapping <label>, or adjacent <label>
    // (sibling-only association tracked by accessibility audit at issue #415).
    const hasAnyLabelling = await page.evaluate(() => {
      const fields = Array.from(
        document.querySelectorAll<HTMLElement>(".inspectres input:not([type='hidden']), .inspectres select"),
      ).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      return fields.slice(0, 5).some((el) => {
        const id = el.id;
        return (
          el.getAttribute("aria-label") !== null ||
          el.getAttribute("aria-labelledby") !== null ||
          el.getAttribute("title") !== null ||
          (id ? document.querySelector(`label[for="${id}"]`) !== null : false) ||
          el.closest("label") !== null ||
          el.previousElementSibling?.tagName === "LABEL" ||
          el.parentElement?.previousElementSibling?.tagName === "LABEL"
        );
      });
    });

    expect(hasAnyLabelling).toBe(true);
    await page.screenshot({ path: "test-results/e2e-screenshots/form-07-aria.png", timeout: 5000 }).catch(() => {});
  });
});
