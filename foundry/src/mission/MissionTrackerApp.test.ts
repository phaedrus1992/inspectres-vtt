import { describe, it, expect, vi, beforeEach } from "vitest";

describe("MissionTrackerApp day arithmetic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("elapsed days calculation", () => {
    it("calculates zero elapsed when mission starts today", () => {
      const currentDay = 10;
      const missionStartDay = 10;
      const elapsedDays = Math.max(0, currentDay - missionStartDay);
      expect(elapsedDays).toBe(0);
    });

    it("calculates correct elapsed when mission started yesterday", () => {
      const currentDay = 10;
      const missionStartDay = 9;
      const elapsedDays = Math.max(0, currentDay - missionStartDay);
      expect(elapsedDays).toBe(1);
    });

    it("calculates correct elapsed when mission started multiple days ago", () => {
      const currentDay = 15;
      const missionStartDay = 10;
      const elapsedDays = Math.max(0, currentDay - missionStartDay);
      expect(elapsedDays).toBe(5);
    });

    it("clamps to zero when currentDay is before start", () => {
      const currentDay = 5;
      const missionStartDay = 10;
      const elapsedDays = Math.max(0, currentDay - missionStartDay);
      expect(elapsedDays).toBe(0);
    });

    it("handles day 1 correctly", () => {
      const currentDay = 1;
      const missionStartDay = 1;
      const elapsedDays = Math.max(0, currentDay - missionStartDay);
      expect(elapsedDays).toBe(0);
    });

    it("handles large day numbers", () => {
      const currentDay = 365;
      const missionStartDay = 1;
      const elapsedDays = Math.max(0, currentDay - missionStartDay);
      expect(elapsedDays).toBe(364);
    });
  });
});
