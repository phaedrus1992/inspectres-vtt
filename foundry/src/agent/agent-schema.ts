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
  characteristics: AgentCharacteristic[];
  missionPool: number;
  isDead: boolean;
  daysOutOfAction: number;
  recoveryStartedAt: number;
}
