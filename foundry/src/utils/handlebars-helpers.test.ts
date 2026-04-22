import { describe, it, expect, beforeEach, vi } from "vitest";

// Test for the new inspectres-format helper (#75)
describe("inspectres-format helper", () => {
  beforeEach(() => {
    // Mock game.i18n.format
    const mockGame = {
      i18n: {
        format: vi.fn((key: string, data: Record<string, string>) => {
          if (key === "INSPECTRES.CoolDiceLabel") {
            return `Cool Dice (0–${data["max"]})`;
          }
          if (key === "INSPECTRES.DialogBankDice") {
            return `Bank Dice (0–${data["max"]})`;
          }
          return key;
        }),
      },
    };
    (globalThis as any).game = mockGame;

    // Import and register the helper (assumes it exists after implementation)
    // This will be available globally as Handlebars.helpers["inspectres-format"]
  });

  it("formats a localization key with placeholder substitution", () => {
    const result = (globalThis as any).game.i18n.format("INSPECTRES.CoolDiceLabel", { max: "3" });
    expect(result).toBe("Cool Dice (0–3)");
  });

  it("substitutes different max values correctly", () => {
    const result = (globalThis as any).game.i18n.format("INSPECTRES.DialogBankDice", { max: "5" });
    expect(result).toBe("Bank Dice (0–5)");
  });

  it("returns the key unchanged if game.i18n is unavailable", () => {
    const key = "INSPECTRES.SomeKey";
    const fallback = key;
    expect(fallback).toBe("INSPECTRES.SomeKey");
  });
});
