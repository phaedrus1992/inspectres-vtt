import { getDevLogger } from "../utils/dev-logger.js";
import { getPayloadType, isMissionSocketPayload, type MissionSocketPayload } from "../socket/socket-guards.js";

export const SOCKET_EVENT = "system.inspectres";

export { type MissionSocketPayload } from "../socket/socket-guards.js";

export function emitMissionPoolUpdated(franchiseId: string): void {
  const payload: MissionSocketPayload = { type: "missionPoolUpdated", franchiseId };
  game.socket?.emit(SOCKET_EVENT, payload);
}

export function onMissionSocketEvent(handler: (payload: MissionSocketPayload) => void): void {
  game.socket?.on(SOCKET_EVENT, (payload: unknown) => {
    if (!isMissionSocketPayload(payload)) {
      const type = getPayloadType(payload);
      if (type !== undefined) {
        getDevLogger().warn("socket", "Unhandled payload type", { type });
      }
      return;
    }

    try {
      handler(payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      getDevLogger().error("socket", "Handler threw", { error: message });
    }
  });
}
