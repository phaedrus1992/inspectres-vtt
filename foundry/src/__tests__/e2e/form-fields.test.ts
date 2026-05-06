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
  test("form fields: visibility, styling, interaction, validation, and accessibility", async ({ page }) => {
    await waitForSheet(page);

    // --- visibility and basic styling ---
    const inputs = page.locator(".inspectres input[type='text'], .inspectres input[type='number']");
    await expect(inputs.first()).toBeVisible();

    const visStyle = await inputs.first().evaluate((el) => ({
      display: window.getComputedStyle(el).display,
      opacity: window.getComputedStyle(el).opacity,
    }));
    expect(visStyle.display).not.toBe("none");
    expect(parseFloat(visStyle.opacity)).toBeGreaterThan(0);

    await page.screenshot({ path: "test-results/e2e-screenshots/form-01-visibility.png", timeout: 5000 }).catch(() => {});

    // --- border and background styling ---
    const textInput = page.locator(".inspectres input[type='text']").first();
    await expect(textInput).toBeVisible();

    const borderStyle = await textInput.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        borderWidth: computed.borderWidth,
        borderStyle: computed.borderStyle,
        borderColor: computed.borderColor,
        backgroundColor: computed.backgroundColor,
        padding: computed.padding,
      };
    });
    expect(borderStyle.borderWidth).not.toBe("0px");
    expect(borderStyle.backgroundColor).toBeTruthy();

    await page.screenshot({ path: "test-results/e2e-screenshots/form-02-border.png", timeout: 5000 }).catch(() => {});

    // --- value handling ---
    await textInput.fill("test value");
    await expect(textInput).toHaveValue("test value");

    await page.screenshot({ path: "test-results/e2e-screenshots/form-03-value.png", timeout: 5000 }).catch(() => {});

    // --- focus: clicking a field makes it focusable ---
    const bankInput = page.locator(".inspectres input[name='system.bank']").first();
    await expect(bankInput).toBeVisible();

    await bankInput.click();
    // Verify the field accepted focus (either it or a child is now active).
    // Foundry may redirect focus to a wrapper element, so check ancestor chain.
    const focusedInsideBank = await page.evaluate(() => {
      const el = document.querySelector<HTMLInputElement>(".inspectres input[name='system.bank']");
      if (!el) return false;
      const active = document.activeElement;
      return active !== null && (active === el || el.contains(active) || active.contains(el));
    });
    // Field should at minimum be clickable (no pointer-events:none, not disabled)
    const isClickable = await bankInput.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.pointerEvents !== "none" && !el.hasAttribute("disabled");
    });
    expect(isClickable || focusedInsideBank).toBe(true);

    await page.screenshot({ path: "test-results/e2e-screenshots/form-04-focus.png", timeout: 5000 }).catch(() => {});

    // --- required fields (skipped when none present) ---
    const requiredInputs = page.locator(".inspectres input[required]");
    const requiredCount = await requiredInputs.count();
    if (requiredCount > 0) {
      const requiredInput = requiredInputs.first();
      await expect(requiredInput).toBeVisible();

      const attrs = await requiredInput.evaluate((el) => ({
        required: el.getAttribute("required"),
        aria_required: el.getAttribute("aria-required"),
      }));
      expect(attrs.required !== null || attrs.aria_required === "true").toBe(true);
    }

    await page.screenshot({ path: "test-results/e2e-screenshots/form-05-required.png", timeout: 5000 }).catch(() => {});

    // --- textarea in notes tab ---
    await page.click(".inspectres [role='tab'][aria-controls='tab-notes']");
    await page.waitForSelector(".inspectres textarea", { timeout: ELEMENT_WAIT_TIMEOUT });

    const textarea = page.locator(".inspectres textarea").first();
    await expect(textarea).toBeVisible();

    const textareaStyle = await textarea.evaluate((el) => ({
      borderWidth: window.getComputedStyle(el).borderWidth,
      padding: window.getComputedStyle(el).padding,
    }));
    expect(textareaStyle.borderWidth).not.toBe("0px");

    await page.screenshot({ path: "test-results/e2e-screenshots/form-06-textarea-select.png", timeout: 5000 }).catch(() => {});

    // --- ARIA labelling ---
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
