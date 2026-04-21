export const SOCKET_EVENT = "system.inspectres";

export interface MissionSocketPayload {
  type: "missionPoolUpdated";
  franchiseId: string;
}

export function emitMissionPoolUpdated(franchiseId: string): void {
  const payload: MissionSocketPayload = { type: "missionPoolUpdated", franchiseId };
  game.socket?.emit(SOCKET_EVENT, payload);
}

export function onMissionSocketEvent(handler: (payload: MissionSocketPayload) => void): void {
  game.socket?.on(SOCKET_EVENT, (payload: unknown) => {
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("type" in payload) ||
      !("franchiseId" in payload) ||
      typeof (payload as { type: unknown }).type !== "string" ||
      typeof (payload as { franchiseId: unknown }).franchiseId !== "string"
    ) return;

    if ((payload as { type: string }).type !== "missionPoolUpdated") {
      console.warn("onMissionSocketEvent: unhandled payload type", (payload as { type: string }).type);
      return;
    }

    try {
      handler(payload as MissionSocketPayload);
    } catch (err: unknown) {
      console.error("onMissionSocketEvent: handler threw", err);
    }
  });
}
