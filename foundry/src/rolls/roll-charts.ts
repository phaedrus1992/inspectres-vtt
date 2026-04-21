/**
 * Roll chart constants for InSpectres
 * Maps die face (1–6) to outcomes per the official rules
 */

/** Skill Roll Chart: read the HIGHEST die from a skill roll */
export const SKILL_ROLL_CHART = {
  6: { result: "Amazing!", narration: "Player narrates the result in full detail", franchiseDice: 2 },
  5: { result: "Good", narration: "Player narrates the result", franchiseDice: 1 },
  4: { result: "Fair", narration: "Player narrates mostly positive but must include a complication", franchiseDice: 0 },
  3: { result: "Not Great", narration: "GM narrates your fate; you may suggest one minor positive effect", franchiseDice: 0 },
  2: { result: "Bad", narration: "GM narrates your fate (or you may suggest something negative)", franchiseDice: 0 },
  1: { result: "Terrible!", narration: "GM gets to hose you with a dire situation", franchiseDice: 0 },
} as const;

/** Stress Roll Chart: read the LOWEST die from a stress roll */
export const STRESS_ROLL_CHART = {
  6: { result: "Too Cool for School", narration: "Gain 1 Cool die; no stress penalties", coolGain: 1, skillPenalty: 0 },
  5: { result: "Blasé", narration: "No effect; you don't care", coolGain: 0, skillPenalty: 0 },
  4: { result: "Annoyed", narration: "–1 die penalty to your next skill roll", coolGain: 0, skillPenalty: 1 },
  3: { result: "Stressed", narration: "Lose 1 die from one skill of your choice", coolGain: 0, skillPenalty: 1 },
  2: { result: "Frazzled", narration: "Lose 2 dice from one skill OR 1 die from each of two skills", coolGain: 0, skillPenalty: 2 },
  1: { result: "Meltdown", narration: "Lose all Cool dice; lose skill dice equal to the number of stress dice you rolled", coolGain: 0, skillPenalty: -1 },
} as const;

/** Bank Roll Chart: evaluated per die spent from Bank */
export const BANK_ROLL_CHART = {
  6: { result: "Compounded Interest", narration: "Return this die + add 1 Bank die", diceReturned: 1, diceAdded: 1 },
  5: { result: "Interest", narration: "Return this die to Bank", diceReturned: 1, diceAdded: 0 },
  4: { result: "Withdrawal", narration: "Lose this die", diceReturned: 0, diceAdded: 0 },
  3: { result: "Withdrawal", narration: "Lose this die", diceReturned: 0, diceAdded: 0 },
  2: { result: "Service Charge", narration: "Lose this die + 1 additional Bank die", diceReturned: 0, diceAdded: -1 },
  1: { result: "Account Overrun", narration: "Lose ALL Bank dice", diceReturned: 0, diceAdded: 0, loseAllBank: true },
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
