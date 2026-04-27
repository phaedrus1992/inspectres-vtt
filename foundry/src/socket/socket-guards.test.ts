import { describe, it, expect } from "vitest";
import { isMissionSocketPayload, type MissionSocketPayload } from "./socket-guards.js";

describe("Socket payload validation", () => {
  it("accepts valid MissionSocketPayload", () => {
    const payload: MissionSocketPayload = {
      type: "missionPoolUpdated",
      franchiseId: "franchise-123",
    };
    expect(isMissionSocketPayload(payload)).toBe(true);
  });

  it("rejects null", () => {
    expect(isMissionSocketPayload(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isMissionSocketPayload(undefined)).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isMissionSocketPayload("string")).toBe(false);
    expect(isMissionSocketPayload(42)).toBe(false);
    expect(isMissionSocketPayload(true)).toBe(false);
    expect(isMissionSocketPayload([])).toBe(false);
  });

  it("rejects object missing type field", () => {
    expect(isMissionSocketPayload({ franchiseId: "123" })).toBe(false);
  });

  it("rejects object missing franchiseId field", () => {
    expect(isMissionSocketPayload({ type: "missionPoolUpdated" })).toBe(false);
  });

  it("rejects object with wrong type value", () => {
    expect(
      isMissionSocketPayload({
        type: "unknownEvent",
        franchiseId: "123",
      }),
    ).toBe(false);
  });

  it("rejects object with non-string type", () => {
    expect(
      isMissionSocketPayload({
        type: 123,
        franchiseId: "123",
      }),
    ).toBe(false);
  });

  it("rejects object with non-string franchiseId", () => {
    expect(
      isMissionSocketPayload({
        type: "missionPoolUpdated",
        franchiseId: 123,
      }),
    ).toBe(false);
  });

  it("rejects object with extra fields", () => {
    // Extra fields are OK (backward compatibility for protocol evolution)
    const payload = {
      type: "missionPoolUpdated",
      franchiseId: "123",
      extra: "ignored",
    };
    expect(isMissionSocketPayload(payload)).toBe(true);
  });

  it("rejects payload with empty strings", () => {
    expect(
      isMissionSocketPayload({
        type: "",
        franchiseId: "123",
      }),
    ).toBe(false);

    expect(
      isMissionSocketPayload({
        type: "missionPoolUpdated",
        franchiseId: "",
      }),
    ).toBe(false); // empty franchiseId is invalid
  });
});
