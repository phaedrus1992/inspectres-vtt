/**
 * Recovery status computation for agents out of action (daysOutOfAction countdown)
 * Supports Death & Dismemberment optional rule: agents can be dead or recovering from injuries
 */

import { type AgentData } from "./agent-schema.js";

// Default in-game day when the setting is unavailable (matches setting's initial value)
const DEFAULT_IN_GAME_DAY = 1;

export function getCurrentDay(): number {
  try {
    return (
      (game.settings as unknown as { get: (namespace: string, key: string) => unknown })?.get(
        "inspectres",
        "currentDay",
      ) as number
    ) ?? DEFAULT_IN_GAME_DAY;
  } catch (err: unknown) {
    if (game.ready) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[INSPECTRES] Failed to get currentDay setting; using default:", { error: err, errorMessage: message });
    }
    return DEFAULT_IN_GAME_DAY;
  }
}

export type RecoveryStatus = "active" | "dead" | "recovering" | "returned";

export interface RecoveryInfo {
  status: RecoveryStatus;
  daysRemaining: number;
  description: string;
}

export function computeRecoveryStatus(
  system: AgentData,
  currentDay: number,
): RecoveryInfo {
  if (system.isDead) {
    return {
      status: "dead",
      daysRemaining: 0,
      description: "Agent has been killed",
    };
  }

  // Never injured — daysOutOfAction explicitly 0
  if (system.daysOutOfAction === 0) {
    return {
      status: "active",
      daysRemaining: 0,
      description: "Agent is active",
    };
  }

  // Injured but recovery start day not set — invariant violation
  // This occurs if: (a) migration failed to initialize recoveryStartedAt on legacy data,
  // or (b) caller set daysOutOfAction > 0 without setting recoveryStartedAt in the same update.
  // Treat as if recovery started today to avoid leaving agent permanently blocked.
  const startDay = system.recoveryStartedAt === 0 ? currentDay : system.recoveryStartedAt;

  const daysElapsed = currentDay - startDay;
  const daysRemaining = Math.max(0, system.daysOutOfAction - daysElapsed);

  if (daysRemaining > 0) {
    return {
      status: "recovering",
      daysRemaining,
      description: `Agent out of action for ${daysRemaining} more day${daysRemaining === 1 ? "" : "s"}`,
    };
  }

  return {
    status: "returned",
    daysRemaining: 0,
    description: "Agent recovered and ready to return",
  };
}

export interface AutoClearResult {
  cleared: number;
  failed: number;
  errors: Array<{ agentName: string; error: string }>;
}

export async function autoClearRecoveredAgents(currentDay: number): Promise<AutoClearResult> {
  const result: AutoClearResult = { cleared: 0, failed: 0, errors: [] };

  if (typeof game === "undefined" || !game.actors) return result;
  if (!game.user?.isGM) return result;

  const updates: Array<{ id: string; name: string; changes: Record<string, number> }> = [];

  for (const actor of game.actors) {
    if ((actor.type as string) !== "agent") continue;
    const system = actor.system as unknown as AgentData;

    // Skip dead agents (stay dead) and uninjured agents (nothing to clear)
    if (system.isDead || system.daysOutOfAction === 0) continue;

    const daysElapsed = currentDay - system.recoveryStartedAt;
    if (daysElapsed >= system.daysOutOfAction) {
      updates.push({
        id: actor.id ?? "",
        name: actor.name ?? "Unknown",
        changes: { "system.daysOutOfAction": 0, "system.recoveryStartedAt": 0 },
      });
    }
  }

  if (updates.length === 0) return result;

  // Update all recovered agents, tracking success/failure
  for (const { id, name, changes } of updates) {
    const actor = game.actors?.get(id);
    if (!actor) {
      result.failed += 1;
      result.errors.push({ agentName: name, error: "Actor not found" });
      continue;
    }

    try {
      await actor.update(changes);
      result.cleared += 1;
    } catch (err: unknown) {
      result.failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ agentName: name, error: message });
    }
  }

  return result;
}
