/**
 * Type guards for socket payload validation
 * Ensures payloads are validated at the boundary before use
 */

export interface MissionSocketPayload {
  type: "missionPoolUpdated";
  franchiseId: string;
}

/**
 * Validates that an unknown value is a valid MissionSocketPayload
 */
export function isMissionSocketPayload(payload: unknown): payload is MissionSocketPayload {
  if (typeof payload !== "object" || payload === null) return false;
  if (!("type" in payload) || !("franchiseId" in payload)) return false;

  const p = payload as Record<string, unknown>;
  return (
    typeof p["type"] === "string" &&
    typeof p["franchiseId"] === "string" &&
    (p["franchiseId"] as string).trim().length > 0 &&
    p["type"] === "missionPoolUpdated"
  );
}

/**
 * Safely extract the type field from an unknown socket payload
 * Used for diagnostic logging; returns undefined if payload lacks a valid type field
 */
export function getPayloadType(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null || !("type" in payload)) {
    return undefined;
  }
  const candidate = (payload as Record<string, unknown>)["type"];
  return typeof candidate === "string" ? candidate : undefined;
}

