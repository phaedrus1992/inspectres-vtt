/**
 * InSpectres Franchise Actor
 * Represents the paranormal investigation franchise (shared resources)
 */

import type { FranchiseData } from "./franchise-schema.js";
import { getCurrentDaySetting } from "../utils/settings-utils.js";
import { getDevLogger } from "../utils/dev-logger.js";

/**
 * Add franchise dice to an actor's mission pool
 */
async function addToMissionPool(actor: Actor, amount: number): Promise<void> {
  try {
    const system = actor.system as unknown as { missionPool: number };
    const current = system.missionPool;
    await actor.update({
      "system.missionPool": current + amount,
    } as Parameters<typeof actor.update>[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    getDevLogger().error("franchise", "Failed to add to mission pool", { amount, error: message });
    throw err;
  }
}

export class InSpectresFranchise extends Actor {
  /**
   * Award mission dice from a job
   */
  async awardMissionDice(amount: number): Promise<void> {
    return addToMissionPool(this, amount);
  }

  /**
   * Set missionStartDay when mission goal transitions from 0 to > 0
   */
  override _onUpdate(changed: unknown, options: unknown, userId: unknown): void {
    super._onUpdate(changed as never, options as never, userId as never);
    if (typeof changed !== "object" || changed === null) return;
    const systemChanged = (changed as Record<string, unknown>)["system"] as Record<string, unknown> | undefined;
    if (!systemChanged) return;

    const newGoal = systemChanged["missionGoal"] as number | undefined;
    if (typeof newGoal !== "number" || newGoal <= 0) return;

    const system = this.system as unknown as FranchiseData;
    if (system.missionGoal > 0) return; // Mission already started

    const currentDay = getCurrentDaySetting();
    void this.update({ "system.missionStartDay": currentDay } as Parameters<typeof this.update>[0]).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      getDevLogger().warn("franchise", "Failed to set mission start day", { currentDay, error: message });
    });
  }
}
