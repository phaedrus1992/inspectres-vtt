/**
 * Roll chart constants for InSpectres
 * All charts follow [result, narration, franchiseDice] format
 */

export const SKILL_ROLL_CHART = {
  "6-7": { result: "Complete Success", narration: "You succeed and gain valuable information.", franchiseDice: 1 },
  "8-9": { result: "Success", narration: "You succeed.", franchiseDice: 0 },
  "10-11": { result: "Qualified Success", narration: "You succeed, but complications arise.", franchiseDice: 0 },
  "12+": { result: "Desperate Success", narration: "You narrowly succeed through effort or luck.", franchiseDice: -1 },
  "2-5": { result: "Failure", narration: "You fail. The franchise steps in.", franchiseDice: 2 },
} as const;

export const STRESS_ROLL_CHART = {
  "6-7": { result: "Recover", narration: "You shake it off.", recoveryRounds: 0 },
  "8-9": { result: "Cope", narration: "You manage your stress.", recoveryRounds: 1 },
  "10-11": { result: "Suppress", narration: "You push it down and move forward.", recoveryRounds: 2 },
  "12+": { result: "Breakdown", narration: "You break down. The franchise assists.", recoveryRounds: 3 },
  "2-5": { result: "Panic", narration: "You panic. Everyone suffers.", recoveryRounds: 4 },
} as const;

export const BANK_ROLL_CHART = {
  "6-7": { result: "Critical Success", narration: "You get exactly what you need, plus interest.", gain: 2 },
  "8-9": { result: "Success", narration: "You get what you asked for.", gain: 1 },
  "10-11": { result: "Partial Success", narration: "You get part of what you asked for.", gain: 0 },
  "12+": { result: "Failure", narration: "The franchise denies you. Debt increases.", gain: -1 },
  "2-5": { result: "Critical Failure", narration: "The franchise demands immediate repayment.", gain: -2 },
} as const;

export const CLIENT_ROLL_CHART = {
  "6-7": { result: "Complete Success", narration: "The client is delighted. Full payment + bonus.", payment: 1.5 },
  "8-9": { result: "Success", narration: "The client is satisfied. Full payment.", payment: 1.0 },
  "10-11": { result: "Qualified Success", narration: "The client is satisfied but notes issues. Half payment.", payment: 0.5 },
  "12+": { result: "Failure", narration: "The client is unhappy. No payment.", payment: 0 },
  "2-5": { result: "Disaster", narration: "The client is furious. Negative reputation.", payment: -0.5 },
} as const;

/** Type for chart entries */
export type SkillRollOutcome = typeof SKILL_ROLL_CHART[keyof typeof SKILL_ROLL_CHART];
export type StressRollOutcome = typeof STRESS_ROLL_CHART[keyof typeof STRESS_ROLL_CHART];
export type BankRollOutcome = typeof BANK_ROLL_CHART[keyof typeof BANK_ROLL_CHART];
export type ClientRollOutcome = typeof CLIENT_ROLL_CHART[keyof typeof CLIENT_ROLL_CHART];
