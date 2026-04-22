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
    2: "INSPECTRES.ClientPersonality.Horny",
    3: "INSPECTRES.ClientPersonality.Bored",
    4: "INSPECTRES.ClientPersonality.Skeptical",
    5: "INSPECTRES.ClientPersonality.Angry",
    6: "INSPECTRES.ClientPersonality.Impatient",
    7: "INSPECTRES.ClientPersonality.Weird",
    8: "INSPECTRES.ClientPersonality.Frantic",
    9: "INSPECTRES.ClientPersonality.Terrified",
    10: "INSPECTRES.ClientPersonality.Calm",
    11: "INSPECTRES.ClientPersonality.Enthusiastic",
    12: "INSPECTRES.ClientPersonality.Blase",
  },
  clientType: {
    2: "INSPECTRES.ClientType.GhostMonster",
    3: "INSPECTRES.ClientType.PoliceOfficer",
    4: "INSPECTRES.ClientType.Student",
    5: "INSPECTRES.ClientType.CityWorker",
    6: "INSPECTRES.ClientType.Storekeeper",
    7: "INSPECTRES.ClientType.Housewife",
    8: "INSPECTRES.ClientType.GovOfficial",
    9: "INSPECTRES.ClientType.Businessman",
    10: "INSPECTRES.ClientType.HospitalWorker",
    11: "INSPECTRES.ClientType.Motorist",
    12: "INSPECTRES.ClientType.Aristocrat",
  },
  occurrence: {
    2: "INSPECTRES.ClientOccurrence.GhostMonster",
    3: "INSPECTRES.ClientOccurrence.Appearance",
    4: "INSPECTRES.ClientOccurrence.BizarrePhenomena",
    5: "INSPECTRES.ClientOccurrence.AbnormalWeather",
    6: "INSPECTRES.ClientOccurrence.OddSmell",
    7: "INSPECTRES.ClientOccurrence.WeirdSound",
    8: "INSPECTRES.ClientOccurrence.StrangeLight",
    9: "INSPECTRES.ClientOccurrence.Haunting",
    10: "INSPECTRES.ClientOccurrence.Destruction",
    11: "INSPECTRES.ClientOccurrence.Infestation",
    12: "INSPECTRES.ClientOccurrence.Abduction",
  },
  location: {
    2: "INSPECTRES.ClientLocation.Underground",
    3: "INSPECTRES.ClientLocation.InWater",
    4: "INSPECTRES.ClientLocation.RemoteArea",
    5: "INSPECTRES.ClientLocation.Restaurant",
    6: "INSPECTRES.ClientLocation.MunicipalBuilding",
    7: "INSPECTRES.ClientLocation.ApartmentBuilding",
    8: "INSPECTRES.ClientLocation.StoreOffice",
    9: "INSPECTRES.ClientLocation.ResidentialArea",
    10: "INSPECTRES.ClientLocation.PublicPark",
    11: "INSPECTRES.ClientLocation.SketchyNeighborhood",
    12: "INSPECTRES.ClientLocation.ParallelDimension",
  },
} as const;

/** Type for chart entries */
export type SkillRollOutcome = typeof SKILL_ROLL_CHART[keyof typeof SKILL_ROLL_CHART];
export type StressRollOutcome = typeof STRESS_ROLL_CHART[keyof typeof STRESS_ROLL_CHART];
export type BankRollOutcome = typeof BANK_ROLL_CHART[keyof typeof BANK_ROLL_CHART];
