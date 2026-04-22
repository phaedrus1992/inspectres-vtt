import { describe, it, expect } from "vitest";
import { buildPenaltyNote } from "./roll-executor.js";

// RED: buildPenaltyNote is not yet exported and does not return i18n keys.
// These tests will fail until:
// 1. buildPenaltyNote is exported
// 2. It returns i18n keys instead of raw English strings

describe("buildPenaltyNote", () => {
  it("returns INSPECTRES.PenaltyNote.Minor i18n key for face 3", () => {
    const note = buildPenaltyNote(3, 1);
    expect(note).toBe("INSPECTRES.PenaltyNote.Minor");
  });

  it("returns INSPECTRES.PenaltyNote.Major i18n key for face 2", () => {
    const note = buildPenaltyNote(2, 1);
    expect(note).toBe("INSPECTRES.PenaltyNote.Major");
  });

  it("returns localized meltdown message for face 1", () => {
    // face 1 = Meltdown — uses game.i18n.format with {count} substitution
    // mock returns the key, so result will be the formatted key string
    const note = buildPenaltyNote(1, 3);
    expect(note).toBe("INSPECTRES.PenaltyNote.Meltdown");
  });
});
