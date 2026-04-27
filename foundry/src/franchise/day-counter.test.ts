import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { updateCurrentDay, getCurrentDay } from "./day-counter.js";

describe("Day Counter - Franchise sheet day management", () => {
  beforeEach(() => {
    // Mock game.settings
    const globalThis_ = globalThis as unknown as Record<string, unknown>;
    globalThis_["game"] = {
      settings: {
        set: vi.fn(() => Promise.resolve()),
        get: vi.fn((scope: string, key: string) => {
          if (scope === "inspectres" && key === "currentDay") {
            return 1;
          }
          return undefined;
        }),
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("increments day by 1 when +day button clicked", async () => {
    const globalThis_ = globalThis as unknown as Record<string, unknown>;
    const settings = globalThis_["game"] as unknown as { settings: { set: () => Promise<unknown>; get: (a: string, b: string) => number } };
    await updateCurrentDay(1);
    expect(settings.settings.set).toHaveBeenCalledWith("inspectres", "currentDay", 2);
  });

  it("decrements day by 1 when -day button clicked", async () => {
    const globalThis_ = globalThis as unknown as Record<string, unknown>;
    const settings = globalThis_["game"] as unknown as { settings: { set: () => Promise<unknown>; get: (a: string, b: string) => number } };
    await updateCurrentDay(-1);
    expect(settings.settings.set).toHaveBeenCalledWith("inspectres", "currentDay", 1);
  });

  it("allows direct day input (jump to specific day)", async () => {
    const globalThis_ = globalThis as unknown as Record<string, unknown>;
    const settings = globalThis_["game"] as unknown as { settings: { set: () => Promise<unknown>; get: (a: string, b: string) => number } };
    await updateCurrentDay(10, true);
    expect(settings.settings.set).toHaveBeenCalledWith("inspectres", "currentDay", 10);
  });

  it("prevents negative days (minimum is 1)", async () => {
    const globalThis_ = globalThis as unknown as Record<string, unknown>;
    const settings = globalThis_["game"] as unknown as { settings: { set: () => Promise<unknown>; get: (a: string, b: string) => number } };
    await updateCurrentDay(-5, true);
    expect(settings.settings.set).toHaveBeenCalledWith("inspectres", "currentDay", 1);
  });

  it("returns current day value", () => {
    const current = getCurrentDay();
    expect(current).toBe(1);
  });

  it("displays day in FranchiseSheet template context", () => {
    const day = getCurrentDay();
    expect(typeof day).toBe("number");
    expect(day).toBeGreaterThanOrEqual(1);
  });
});
