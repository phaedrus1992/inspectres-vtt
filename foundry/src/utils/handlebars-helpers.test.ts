import { describe, it, expect, beforeEach, vi } from "vitest";
import Handlebars from "handlebars";

// Test for the new inspectres-format helper (#75)
describe("inspectres-format helper", () => {
  beforeEach(() => {
    // Mock game.i18n
    const mockFormat = vi.fn((key: string, data: Record<string, string>) => {
      if (key === "INSPECTRES.CoolDiceLabel") {
        return `Cool Dice (0–${data["max"]})`;
      }
      if (key === "INSPECTRES.DialogBankDice") {
        return `Bank Dice (0–${data["max"]})`;
      }
      return key; // fallback returns key unchanged
    });

    const mockGame = { i18n: { format: mockFormat } };
    Object.defineProperty(globalThis, "game", {
      value: mockGame,
      writable: true,
      configurable: true,
    });

    // Register the helper
    Handlebars.registerHelper("inspectres-format", (key: string, data: Record<string, string | number>) => {
      const stringData: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        stringData[k] = String(v);
      }
      if (!game.i18n) {
        console.warn(`[InSpectres] game.i18n unavailable when formatting key: ${key}`);
        return key;
      }
      const result = game.i18n.format(key, stringData);
      if (result === key) {
        console.warn(`[InSpectres] Missing localization key: ${key}`);
      }
      return result;
    });
  });

  it("formats a localization key with placeholder substitution", () => {
    const template = Handlebars.compile('{{inspectres-format key data}}');
    const result = template({ key: "INSPECTRES.CoolDiceLabel", data: { max: 3 } });
    expect(result).toBe("Cool Dice (0–3)");
  });

  it("substitutes different max values correctly", () => {
    const template = Handlebars.compile('{{inspectres-format key data}}');
    const result = template({ key: "INSPECTRES.DialogBankDice", data: { max: 5 } });
    expect(result).toBe("Bank Dice (0–5)");
  });

  it("returns the key unchanged if no matching localization", () => {
    const template = Handlebars.compile('{{inspectres-format key data}}');
    const result = template({ key: "INSPECTRES.NonExistent", data: {} });
    expect(result).toBe("INSPECTRES.NonExistent");
  });

  it("handles missing game.i18n gracefully", () => {
    Object.defineProperty(globalThis, "game", {
      value: { i18n: null },
      writable: true,
      configurable: true,
    });
    const template = Handlebars.compile('{{inspectres-format key data}}');
    const result = template({ key: "INSPECTRES.SomeKey", data: {} });
    expect(result).toBe("INSPECTRES.SomeKey");
  });
});
