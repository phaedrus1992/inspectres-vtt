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
  isDead: boolean;
  daysOutOfAction: number;
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
