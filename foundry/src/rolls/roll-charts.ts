/**
 * Roll chart constants for InSpectres
 * Maps die face (1–6) to outcomes per the official rules
 */

/** Skill Roll Chart: read the HIGHEST die from a skill roll (#71) */
export const SKILL_ROLL_CHART = {
  6: { result: "INSPECTRES.SkillRollResult.Amazing", narration: "INSPECTRES.SkillRollNarration.Amazing", franchiseDice: 2 },
  5: { result: "INSPECTRES.SkillRollResult.Good", narration: "INSPECTRES.SkillRollNarration.Good", franchiseDice: 1 },
  4: { result: "INSPECTRES.SkillRollResult.Fair", narration: "INSPECTRES.SkillRollNarration.Fair", franchiseDice: 0 },
  3: { result: "INSPECTRES.SkillRollResult.NotGreat", narration: "INSPECTRES.SkillRollNarration.NotGreat", franchiseDice: 0 },
  2: { result: "INSPECTRES.SkillRollResult.Bad", narration: "INSPECTRES.SkillRollNarration.Bad", franchiseDice: 0 },
  1: { result: "INSPECTRES.SkillRollResult.Terrible", narration: "INSPECTRES.SkillRollNarration.Terrible", franchiseDice: 0 },
} as const;

/** Stress Roll Chart: read the LOWEST die from a stress roll (#71) */
export const STRESS_ROLL_CHART = {
  6: { result: "INSPECTRES.StressRollResult.TooCool", narration: "INSPECTRES.StressRollNarration.TooCool", coolGain: 1, skillPenalty: 0 },
  5: { result: "INSPECTRES.StressRollResult.Blase", narration: "INSPECTRES.StressRollNarration.Blase", coolGain: 0, skillPenalty: 0 },
  4: { result: "INSPECTRES.StressRollResult.Annoyed", narration: "INSPECTRES.StressRollNarration.Annoyed", coolGain: 0, skillPenalty: 1 },
  3: { result: "INSPECTRES.StressRollResult.Stressed", narration: "INSPECTRES.StressRollNarration.Stressed", coolGain: 0, skillPenalty: 1 },
  2: { result: "INSPECTRES.StressRollResult.Frazzled", narration: "INSPECTRES.StressRollNarration.Frazzled", coolGain: 0, skillPenalty: 2 },
  1: { result: "INSPECTRES.StressRollResult.Meltdown", narration: "INSPECTRES.StressRollNarration.Meltdown", coolGain: 0, skillPenalty: -1 },
} as const;

/** Bank Roll Chart: evaluated per die spent from Bank (#71) */
export const BANK_ROLL_CHART = {
  6: { result: "INSPECTRES.BankRollResult.CompoundedInterest", narration: "INSPECTRES.BankRollNarration.CompoundedInterest", diceReturned: 1, diceAdded: 1 },
  5: { result: "INSPECTRES.BankRollResult.Interest", narration: "INSPECTRES.BankRollNarration.Interest", diceReturned: 1, diceAdded: 0 },
  4: { result: "INSPECTRES.BankRollResult.Withdrawal", narration: "INSPECTRES.BankRollNarration.Withdrawal", diceReturned: 0, diceAdded: 0 },
  3: { result: "INSPECTRES.BankRollResult.Withdrawal", narration: "INSPECTRES.BankRollNarration.Withdrawal", diceReturned: 0, diceAdded: 0 },
  2: { result: "INSPECTRES.BankRollResult.ServiceCharge", narration: "INSPECTRES.BankRollNarration.ServiceCharge", diceReturned: 0, diceAdded: -1 },
  1: { result: "INSPECTRES.BankRollResult.AccountOverrun", narration: "INSPECTRES.BankRollNarration.AccountOverrun", diceReturned: 0, diceAdded: 0, loseAllBank: true },
} as const;

/**
 * Client Generation Table: Roll 2d6 for each of four attributes
 * This is NOT an outcome resolution table; it randomly generates client characteristics
 */
export const CLIENT_GENERATION_TABLE = {
  personality: {
    2: "Horny",
    3: "Bored",
    4: "Skeptical",
    5: "Angry",
    6: "Impatient",
    7: "Weird",
    8: "Frantic",
    9: "Terrified",
    10: "Calm",
    11: "Enthusiastic",
    12: "Blasé",
  },
  clientType: {
    2: "Ghost/Monster Transformation",
    3: "Police Officer",
    4: "Student",
    5: "City Worker",
    6: "Storekeeper",
    7: "Housewife",
    8: "Gov't Official",
    9: "Businessman",
    10: "Hospital Worker",
    11: "Motorist",
    12: "Aristocrat",
  },
  occurrence: {
    2: "Ghost/Monster Transformation",
    3: "Appearance",
    4: "Bizarre phenomena",
    5: "Abnormal weather",
    6: "Odd Smell",
    7: "Weird Sound",
    8: "Strange Light",
    9: "Haunting",
    10: "Destruction",
    11: "Infestation",
    12: "Abduction",
  },
  location: {
    2: "Underground (sewers/subway)",
    3: "In the water",
    4: "Some remote area",
    5: "A restaurant",
    6: "Municipal building",
    7: "Apartment building",
    8: "Store / office",
    9: "Residential area",
    10: "Public park or zoo",
    11: "Sketchy neighborhood",
    12: "Parallel dimension",
  },
} as const;

/** Type for chart entries */
export type SkillRollOutcome = typeof SKILL_ROLL_CHART[keyof typeof SKILL_ROLL_CHART];
export type StressRollOutcome = typeof STRESS_ROLL_CHART[keyof typeof STRESS_ROLL_CHART];
export type BankRollOutcome = typeof BANK_ROLL_CHART[keyof typeof BANK_ROLL_CHART];
