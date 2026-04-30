/**
 * Accessibility testing utilities
 * Provides utilities for running WCAG AA compliance checks on rendered components
 *
 * Note: axe-core integration is prepared for future Playwright E2E tests.
 * Unit tests use contrast ratio calculation for immediate validation.
 */

/**
 * Contrast ratio check (WCAG AA requires 4.5:1 for normal text, 3:1 for large text)
 * @param fgColor Foreground color in hex or rgb
 * @param bgColor Background color in hex or rgb
 * @returns Contrast ratio (1-21)
 */
export function calculateContrastRatio(fgColor: string, bgColor: string): number {
  let rgbFg: [number, number, number];
  let rgbBg: [number, number, number];

  try {
    rgbFg = parseColor(fgColor);
  } catch (err) {
    throw new Error(
      `Failed to calculate contrast ratio: foreground color '${fgColor}' is invalid. ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    rgbBg = parseColor(bgColor);
  } catch (err) {
    throw new Error(
      `Failed to calculate contrast ratio: background color '${bgColor}' is invalid. ${err instanceof Error ? err.message : String(err)}`,
    );
  }

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
  element: HTMLElement | null | undefined,
  minRatio: number = 4.5,
): void {
  if (!element || !element.isConnected) {
    throw new Error(`Element not connected to DOM: ${element?.tagName ?? "unknown"}`);
  }

  const styles = globalThis.getComputedStyle(element);
  if (!styles) {
    throw new Error(`Failed to retrieve computed styles for ${element.tagName}`);
  }

  const color = styles.color;
  const bgColor = styles.backgroundColor;

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
    const r = Number.parseInt(hex.substring(0, 2), 16);
    const g = Number.parseInt(hex.substring(2, 4), 16);
    const b = Number.parseInt(hex.substring(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      throw new Error(`parseColor: invalid hex color '${color}'`);
    }
    return [r, g, b];
  }

  // Handle rgb/rgba
  const match = color.match(/\d+/g);
  if (match && match.length >= 3) {
    const r = Number.parseInt(match[0] ?? "0", 10);
    const g = Number.parseInt(match[1] ?? "0", 10);
    const b = Number.parseInt(match[2] ?? "0", 10);
    if (![r, g, b].every((v) => v >= 0 && v <= 255)) {
      throw new Error(`parseColor: RGB values must be 0–255, got [${r}, ${g}, ${b}]`);
    }
    return [r, g, b];
  }

  throw new Error(`parseColor: unrecognized color format '${color}'. Expected hex (#RRGGBB) or rgb(r, g, b).`);
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
