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
