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
      typeof payload === "object" &&
      payload !== null &&
      "type" in payload &&
      (payload as MissionSocketPayload).type === "missionPoolUpdated"
    ) {
      handler(payload as MissionSocketPayload);
    }
  });
}
