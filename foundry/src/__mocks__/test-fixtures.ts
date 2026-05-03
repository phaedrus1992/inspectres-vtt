/**
 * Consolidated test fixtures for RollActor interface.
 * Provides makeAgent and makeFranchise helpers that properly implement
 * the RollActor interface without Object.create patterns.
 * Issues #244, #297: Standard fixture module for all tests.
 */

import type { RollActor } from "../rolls/roll-executor.js";

function applyNestedUpdate(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  if (parts.length === 1) {
    target[path] = value;
  } else {
    let obj = target;
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
    const lastPart = parts.at(-1);
    if (lastPart !== undefined) {
      obj[lastPart] = value;
    }
  }
}

/** Create a test agent fixture. Pass system field overrides as the parameter. */
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
      ...overrides,
    },
    async update(data: Record<string, unknown>) {
      for (const [k, v] of Object.entries(data)) {
        const systemPath = k.replace("system.", "");
        applyNestedUpdate(this.system as Record<string, unknown>, systemPath, v);
      }
      return this;
    },
  };
}

/** Create a test franchise fixture. Pass system field overrides as the parameter. */
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
      deathMode: false,
      loanAmount: 0,
      ...overrides,
    },
    async update(data: Record<string, unknown>) {
      for (const [k, v] of Object.entries(data)) {
        const systemPath = k.replace("system.", "");
        applyNestedUpdate(this.system as Record<string, unknown>, systemPath, v);
      }
      return this;
    },
  };
}

/** Set GM status for privilege gate tests. */
export function setGMStatus(isGM: boolean): void {
  (globalThis as unknown as { game: { user: { isGM: boolean } } }).game.user.isGM = isGM;
}

/** Access a nested system field using dot notation. */
export function getSystemField(actor: RollActor, path: string): unknown {
  const parts = path.split(".");
  let value: unknown = actor.system;
  for (const part of parts) {
    if (typeof value === "object" && value !== null && part in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return value;
}
