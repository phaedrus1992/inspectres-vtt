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
  stress: number;
}
