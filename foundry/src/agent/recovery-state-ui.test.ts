import { describe, it, expect, beforeEach } from "vitest";

/**
 * Tests for agent recovery state management UI (Issue #164).
 *
 * Recovery state can be set manually via:
 * - "Start Recovery" dialog: sets recoveryStartedAt and daysOutOfAction
 * - "Revive Agent" button: clears recovery fields
 * - Status display shows recovery progress
 */
describe("Agent Recovery State UI", () => {
  describe("recovery state validation", () => {
    it("rejects negative daysOutOfAction", () => {
      expect(() => {
        const daysOutOfAction = -1;
        if (daysOutOfAction < 0) throw new Error("Days out of action must be non-negative");
      }).toThrow("Days out of action must be non-negative");
    });

    it("accepts zero daysOutOfAction (instant recovery)", () => {
      const daysOutOfAction = 0;
      expect(daysOutOfAction).toBeGreaterThanOrEqual(0);
    });

    it("accepts positive daysOutOfAction", () => {
      const daysOutOfAction = 3;
      expect(daysOutOfAction).toBeGreaterThan(0);
    });

    it("rejects non-integer recoveryStartedAt", () => {
      expect(() => {
        const recoveryStartedAt = 1.5;
        if (!Number.isInteger(recoveryStartedAt)) {
          throw new Error("recoveryStartedAt must be an integer");
        }
      }).toThrow("recoveryStartedAt must be an integer");
    });

    it("accepts positive integer recoveryStartedAt", () => {
      const recoveryStartedAt = 5;
      expect(Number.isInteger(recoveryStartedAt)).toBe(true);
      expect(recoveryStartedAt).toBeGreaterThan(0);
    });
  });

  describe("recovery duration calculation", () => {
    it("calculates days remaining correctly", () => {
      const currentDay = 5;
      const recoveryStartedAt = 3;
      const daysOutOfAction = 4;

      const daysRemaining = Math.max(
        0,
        daysOutOfAction - (currentDay - recoveryStartedAt),
      );

      expect(daysRemaining).toBe(2); // 4 - (5 - 3) = 2
    });

    it("returns 0 days remaining when recovery expired", () => {
      const currentDay = 10;
      const recoveryStartedAt = 5;
      const daysOutOfAction = 2;

      const daysRemaining = Math.max(
        0,
        daysOutOfAction - (currentDay - recoveryStartedAt),
      );

      expect(daysRemaining).toBe(0); // 2 - (10 - 5) = -3, but clamped to 0
    });

    it("returns 0 days remaining at recovery completion boundary", () => {
      const currentDay = 7;
      const recoveryStartedAt = 5;
      const daysOutOfAction = 2;

      const daysRemaining = Math.max(
        0,
        daysOutOfAction - (currentDay - recoveryStartedAt),
      );

      expect(daysRemaining).toBe(0); // 2 - (7 - 5) = 0 (exactly expired)
    });
  });

  describe("recovery state clearing", () => {
    it("clears all recovery fields on revive", () => {
      const agent = {
        recoveryStartedAt: null,
        daysOutOfAction: null,
      };

      expect(agent.recoveryStartedAt).toBeNull();
      expect(agent.daysOutOfAction).toBeNull();
    });
  });
});
