/**
 * Shared fast-check arbitraries for InSpectres property-based tests.
 * Import from here to keep generators DRY across test files.
 */
import * as fc from "fast-check";
import { type AgentData, type AgentSkill } from "../agent/agent-schema.js";
import { type FranchiseData } from "../franchise/franchise-schema.js";

// ─── Primitive arbitraries ────────────────────────────────────────────────────

/** Valid die face (1–6) */
export const dieFace = (): fc.Arbitrary<1 | 2 | 3 | 4 | 5 | 6> =>
  fc.integer({ min: 1, max: 6 }) as fc.Arbitrary<1 | 2 | 3 | 4 | 5 | 6>;

/** Stress value (0–6 inclusive per rules) */
export const stressValue = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 6 });

/** Skill base rank (0–10 per DataModel schema) */
export const skillRank = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 10 });

/** Skill penalty (0–10; penalty can't exceed max base by design) */
export const skillPenalty = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 10 });

/** Cool dice count (0–3 for normal agents; weird agents uncapped) */
export const coolDice = (max = 3): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max });

/** Non-negative day counter for recovery (0–9999) */
export const dayNumber = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 9999 });

/** Dice count for stress/skill rolls (1–10 reasonable upper bound) */
export const diceCount = (): fc.Arbitrary<number> =>
  fc.integer({ min: 1, max: 10 });

/** Bank resource pool (0–50 reasonable range) */
export const bankAmount = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 50 });

/** Mission pool / goal (0–30 reasonable range) */
export const missionPool = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 30 });

// ─── Composite arbitraries ────────────────────────────────────────────────────

export const agentSkill = (): fc.Arbitrary<AgentSkill> =>
  fc.record({
    base: skillRank(),
    penalty: skillPenalty(),
  });

/** Minimal AgentData for property tests — only fields relevant to mechanics */
export const agentData = (): fc.Arbitrary<AgentData> =>
  fc.record({
    description: fc.constant(""),
    skills: fc.record({
      academics: agentSkill(),
      athletics: agentSkill(),
      technology: agentSkill(),
      contact: agentSkill(),
    }),
    talent: fc.constant(""),
    cool: coolDice(6),
    isWeird: fc.boolean(),
    power: fc.constant(null),
    characteristics: fc.constant([]),
    isDead: fc.boolean(),
    daysOutOfAction: fc.integer({ min: 0, max: 30 }),
    recoveryStartedAt: dayNumber(),
    stress: stressValue(),
  });

/** FranchiseData suitable for property tests */
export const franchiseData = (): fc.Arbitrary<FranchiseData> =>
  fc.record({
    description: fc.constant(""),
    cards: fc.record({
      library: fc.integer({ min: 0, max: 10 }),
      gym: fc.integer({ min: 0, max: 10 }),
      credit: fc.integer({ min: 0, max: 10 }),
    }),
    bank: bankAmount(),
    missionPool: missionPool(),
    missionGoal: missionPool(),
    missionStartDay: dayNumber(),
    debtMode: fc.boolean(),
    loanAmount: fc.integer({ min: 0, max: 10 }),
    cardsLocked: fc.boolean(),
    deathMode: fc.boolean(),
  });

/** Agent with guaranteed recovery state (not dead, has daysOutOfAction > 0) */
export const recoveringAgentData = (): fc.Arbitrary<AgentData> =>
  agentData().map((a) => ({
    ...a,
    isDead: false,
    daysOutOfAction: Math.max(1, a.daysOutOfAction),
    recoveryStartedAt: a.recoveryStartedAt,
  }));

/** Agent with guaranteed dead state */
export const deadAgentData = (): fc.Arbitrary<AgentData> =>
  agentData().map((a) => ({
    ...a,
    isDead: true,
  }));

/** Agent guaranteed to be active (not dead, no recovery) */
export const activeAgentData = (): fc.Arbitrary<AgentData> =>
  agentData().map((a) => ({
    ...a,
    isDead: false,
    daysOutOfAction: 0,
    recoveryStartedAt: 0,
  }));
