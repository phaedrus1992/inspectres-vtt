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

// SyncEvent types for socket synchronization
export interface MissionState {
  missionPool: number;
  missionGoal: number;
  missionStartDay: number;
}

export interface SyncEvent {
  type: "mission-update";
  data: MissionState;
  senderId: string;
  timestamp: number;
}

/**
 * Validates that an unknown value is a valid SyncEvent
 * Checks all required fields and their types before accepting untrusted socket data
 */
export function isSyncEvent(event: unknown): event is SyncEvent {
  if (typeof event !== "object" || event === null) return false;
  if (!("type" in event) || !("data" in event) || !("senderId" in event) || !("timestamp" in event)) {
    return false;
  }

  const e = event as Record<string, unknown>;

  // Validate type discriminator
  if (e["type"] !== "mission-update") return false;

  // Validate senderId is non-empty string (field is used in GM conflict resolution)
  if (typeof e["senderId"] !== "string" || e["senderId"].length === 0) return false;

  // Validate timestamp is positive number
  if (typeof e["timestamp"] !== "number" || e["timestamp"] <= 0) return false;

  // Validate data is object with required MissionState fields
  if (typeof e["data"] !== "object" || e["data"] === null) return false;
  const data = e["data"] as Record<string, unknown>;
  if (
    typeof data["missionPool"] !== "number" ||
    typeof data["missionGoal"] !== "number" ||
    typeof data["missionStartDay"] !== "number"
  ) {
    return false;
  }

  return true;
}
