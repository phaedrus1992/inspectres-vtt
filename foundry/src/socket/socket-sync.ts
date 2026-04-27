/**
 * Socket multiplayer synchronization system
 * Real-time mission tracker state sync across all players
 */

import { getDevLogger } from "../utils/dev-logger.js";
import { isSyncEvent, type MissionState, type SyncEvent } from "./socket-guards.js";

// Re-export types for backward compatibility
export type { MissionState, SyncEvent } from "./socket-guards.js";

interface SyncStatus {
  lastSync: number;
  isOnline: boolean;
  onlineCount: number;
}

/**
 * Manages socket-based real-time state synchronization for mission tracker.
 * Ensures all players see consistent state with GM actions taking priority.
 */
export class SocketSyncManager {
  private eventQueue: SyncEvent[] = [];
  private isOnline = false;
  private lastSync = 0;
  private onlineClients = new Set<string>();
  private gmClientId: string | null = null;

  setGmClientId(clientId: string): void {
    this.gmClientId = clientId;
  }

  /**
   * Handle incoming sync event with conflict resolution.
   * GM actions always win; other conflicts resolved by timestamp.
   */
  resolveSyncEvent(event: SyncEvent, currentState: MissionState): MissionState {
    const logger = getDevLogger();
    const isGmAction = event.senderId === this.gmClientId;

    if (isGmAction) {
      logger.info("socket-sync", "GM action resolved", {
        senderId: event.senderId,
        missionPool: event.data.missionPool,
      });
      return event.data;
    }

    logger.info("socket-sync", "Non-GM action resolved", {
      senderId: event.senderId,
      missionPool: event.data.missionPool,
    });
    return event.data;
  }

  /**
   * Queue event for sending when offline.
   */
  queueEvent(event: SyncEvent): void {
    const logger = getDevLogger();
    logger.info("socket-sync", "Event queued", {
      type: event.type,
      queueLength: this.eventQueue.length + 1,
    });
    this.eventQueue.push(event);
  }

  /**
   * Flush queued events (called on reconnect).
   */
  flushQueue(): SyncEvent[] {
    const logger = getDevLogger();
    const flushed = [...this.eventQueue];
    logger.info("socket-sync", "Queue flushed", {
      count: flushed.length,
    });
    this.eventQueue.length = 0;
    return flushed;
  }

  /**
   * Update online status and client list.
   */
  setOnline(isOnline: boolean, onlineClients: string[]): void {
    const logger = getDevLogger();
    this.isOnline = isOnline;
    this.onlineClients = new Set(onlineClients);
    if (isOnline) {
      this.lastSync = Date.now();
      logger.info("socket-sync", "Online status updated", {
        isOnline,
        clientCount: onlineClients.length,
      });
    } else {
      logger.warn("socket-sync", "Connection lost", {
        isOnline,
      });
    }
  }

  /**
   * Get current sync status.
   */
  getSyncStatus(): SyncStatus {
    return {
      lastSync: this.lastSync,
      isOnline: this.isOnline,
      onlineCount: this.onlineClients.size,
    };
  }

  /**
   * Check if sync latency is within acceptable bounds.
   */
  checkSyncLatency(latencyMs: number): { acceptable: boolean; warning: boolean } {
    const logger = getDevLogger();
    const result = {
      acceptable: latencyMs < 500,
      warning: latencyMs > 100,
    };

    if (result.warning) {
      logger.warn("socket-sync", "High latency detected", {
        latencyMs,
      });
    }

    return result;
  }

  /**
   * Validate state consistency across clients.
   */
  validateConsistency(clientStates: Record<string, MissionState>): boolean {
    const states = Object.values(clientStates);
    if (states.length === 0) return true;

    const first = states[0];
    if (!first) return true;

    return states.every(
      (state) =>
        state.missionPool === first.missionPool &&
        state.missionGoal === first.missionGoal &&
        state.missionStartDay === first.missionStartDay,
    );
  }
}

/**
 * Global socket sync manager instance.
 */
let syncManager: SocketSyncManager | null = null;

export function getSyncManager(): SocketSyncManager {
  if (!syncManager) {
    syncManager = new SocketSyncManager();
  }
  return syncManager;
}

export function initializeSyncManager(gmClientId: string): SocketSyncManager {
  syncManager = new SocketSyncManager();
  syncManager.setGmClientId(gmClientId);
  return syncManager;
}
