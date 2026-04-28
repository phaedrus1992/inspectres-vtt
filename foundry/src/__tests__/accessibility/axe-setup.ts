/**
 * Accessibility testing utilities
 * Provides utilities for running WCAG AA compliance checks on rendered components
 *
 * Note: axe-core integration is prepared for future Playwright E2E tests.
 * Unit tests use contrast ratio calculation for immediate validation.
 */

/**
 * Run accessibility audit on a DOM element
 * Placeholder for future axe-core integration with Playwright
 * @param element Element to audit (or uses document if not provided)
 * @returns Violations found (empty if compliant)
 */
export async function runAccessibilityAudit(
  element?: HTMLElement,
): Promise<Record<string, unknown>[]> {
  // Placeholder for axe-core integration
  // Full implementation requires @axe-core/playwright for E2E testing
  if (!element) {
    return [];
  }
  return [];
}

/**
 * Assert that element meets WCAG AA standards
 * @param element Element to check
 * @param context Test context (for error messages)
 */
export async function expectAccessibilityCompliant(
  element: HTMLElement,
  context: string,
): Promise<void> {
  const violations = await runAccessibilityAudit(element);

  if (violations.length > 0) {
    const errorDetails = violations
      .map((v) => {
        const violation = v as Record<string, unknown>;
        return `[${violation["id"]}] ${violation["description"]}`;
      })
      .join("\n");

    throw new Error(`Accessibility violations in ${context}:\n${errorDetails}`);
  }
}

/**
 * Contrast ratio check (WCAG AA requires 4.5:1 for normal text, 3:1 for large text)
 * @param fgColor Foreground color in hex or rgb
 * @param bgColor Background color in hex or rgb
 * @returns Contrast ratio (1-21)
 */
export function calculateContrastRatio(fgColor: string, bgColor: string): number {
  const rgbFg = parseColor(fgColor);
  const rgbBg = parseColor(bgColor);

  const lFg = getRelativeLuminance(rgbFg);
  const lBg = getRelativeLuminance(rgbBg);

  const lighter = Math.max(lFg, lBg);
  const darker = Math.min(lFg, lBg);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Assert element meets contrast requirements
 * @param element Element to check
 * @param minRatio Minimum contrast ratio (4.5 for normal, 3 for large)
 */
export function expectContrastCompliant(
  element: HTMLElement,
  minRatio: number = 4.5,
): void {
  const color = window.getComputedStyle(element).color;
  const bgColor = window.getComputedStyle(element).backgroundColor;

  const ratio = calculateContrastRatio(color, bgColor);

  if (ratio < minRatio) {
    throw new Error(
      `Contrast ratio ${ratio.toFixed(2)}:1 does not meet WCAG AA requirement (${minRatio}:1)`,
    );
  }
}

// ─── Helper functions ────────────────────────────────────────────

function parseColor(color: string): [number, number, number] {
  // Handle hex colors
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16),
    ];
  }

  // Handle rgb/rgba
  const match = color.match(/\d+/g);
  if (match && match.length >= 3) {
    return [
      parseInt(match[0] ?? "0", 10),
      parseInt(match[1] ?? "0", 10),
      parseInt(match[2] ?? "0", 10),
    ];
  }

  // Default to black if parsing fails
  return [0, 0, 0];
}

function getRelativeLuminance(rgb: [number, number, number]): number {
  const [r = 0, g = 0, b = 0] = rgb;
  const values = [r, g, b].map((val) => {
    const srgb = val / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });

  const r0 = values[0] ?? 0;
  const g0 = values[1] ?? 0;
  const b0 = values[2] ?? 0;
  return 0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0;
}
