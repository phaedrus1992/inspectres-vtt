/**
 * Consolidated test fixtures for RollActor interface.
 * Provides makeAgent and makeFranchise helpers that properly implement
 * the RollActor interface without Object.create patterns.
 * Issues #244, #297: Standard fixture module for all tests.
 */

import type { RollActor } from "../rolls/roll-executor.js";
import type { AgentData } from "../agent/agent-schema.js";

export function makeAgent(overrides: Record<string, unknown> = {}): RollActor {
  return {
    id: "test-agent-id",
    name: "Test Agent",
    system: {
      description: "Test agent",
      skills: {
        academics: { base: 3, penalty: 0 },
        athletics: { base: 2, penalty: 0 },
        technology: { base: 2, penalty: 0 },
        contact: { base: 2, penalty: 0 },
      },
      talent: "Computers",
      cool: 2,
      isWeird: false,
      characteristics: [],
      isDead: false,
      daysOutOfAction: 0,
      recoveryStartedAt: 0,
      stress: 0,
      missionPool: 0,
      ...overrides,
    },
    async update(data: Record<string, unknown>) {
      for (const [k, v] of Object.entries(data)) {
        const systemPath = k.replace("system.", "");
        const parts = systemPath.split(".");
        if (parts.length === 1) {
          (this.system as Record<string, unknown>)[systemPath] = v;
        } else {
          let obj = this.system as Record<string, unknown>;
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (part !== undefined) {
              if (!(part in obj)) {
                obj[part] = {};
              }
              const next = obj[part];
              if (typeof next === "object" && next !== null) {
                obj = next as Record<string, unknown>;
              }
            }
          }
          const lastPart = parts[parts.length - 1];
          if (lastPart !== undefined) {
            obj[lastPart] = v;
          }
        }
      }
      return this;
    },
  };
}

export function makeFranchise(overrides: Record<string, unknown> = {}): RollActor {
  return {
    id: "test-franchise-id",
    name: "Test Franchise",
    system: {
      cards: { library: 2, gym: 1, credit: 3 },
      bank: 4,
      missionPool: 0,
      missionGoal: 10,
      debtMode: false,
      loanAmount: 0,
      ...overrides,
    },
    async update(data: Record<string, unknown>) {
      for (const [k, v] of Object.entries(data)) {
        const systemPath = k.replace("system.", "");
        const parts = systemPath.split(".");
        if (parts.length === 1) {
          (this.system as Record<string, unknown>)[systemPath] = v;
        } else {
          let obj = this.system as Record<string, unknown>;
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (part !== undefined) {
              if (!(part in obj)) {
                obj[part] = {};
              }
              const next = obj[part];
              if (typeof next === "object" && next !== null) {
                obj = next as Record<string, unknown>;
              }
            }
          }
          const lastPart = parts[parts.length - 1];
          if (lastPart !== undefined) {
            obj[lastPart] = v;
          }
        }
      }
      return this;
    },
  };
}
