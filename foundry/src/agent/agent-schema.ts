/**
 * Type definitions for Agent actor system data
 */

export interface AgentSkill {
  base: number;
  penalty: number;
}

export interface AgentCharacteristic {
  text: string;
  used: boolean;
}

export interface WeirdPower {
  name: string;
  description: string;
  baseSkill: "athletics" | "contact";
  coolCost: number;
}

export interface AgentData {
  description: string;
  skills: {
    academics: AgentSkill;
    athletics: AgentSkill;
    technology: AgentSkill;
    contact: AgentSkill;
  };
  talent: string;
  cool: number;
  isWeird: boolean;
  power?: WeirdPower | null;
  characteristics: AgentCharacteristic[];
  /**
   * Agent is out of action due to death or dismemberment.
   *
   * Invariant: when isDead=true, recoveryStartedAt and daysOutOfAction must both be set.
   * Recovery is complete when currentDay >= recoveryStartedAt + daysOutOfAction.
   * Use autoClearRecoveredAgents() hook to auto-revive when timer expires.
   *
   * @see recoveryStartedAt
   * @see daysOutOfAction
   */
  isDead: boolean;
  /**
   * Duration of recovery in wall-clock days.
   *
   * Recovery formula: complete when currentDay >= recoveryStartedAt + daysOutOfAction
   * Use wall-clock time (Foundry currentDay setting), not game time.
   * GM explicitly advances currentDay; system auto-clears when time expires.
   *
   * Invariant: only meaningful when isDead=true.
   *
   * @see isDead
   * @see recoveryStartedAt
   */
  daysOutOfAction: number;
  /**
   * Wall-clock day when recovery started (Foundry setting currentDay).
   *
   * Used to calculate when recovery expires: currentDay >= recoveryStartedAt + daysOutOfAction
   * Stored at moment death occurs; enables recovery timer to survive session restarts.
   *
   * Invariant: only meaningful when isDead=true.
   *
   * @see isDead
   * @see daysOutOfAction
   */
  recoveryStartedAt: number;
  /**
   * Accumulated stress points (0–6 scale).
   * Rules define stress as the sum of all skill penalties, but the VTT uses a single counter
   * for simplified vacation dialog rendering. The counter is reduced when spending Bank dice
   * on Vacation. This dual representation (counter + individual skill penalties) is intentional:
   * skill penalties track mechanical effects during play, while the stress counter simplifies
   * vacation UI presentation.
   */
  stress: number;
}
