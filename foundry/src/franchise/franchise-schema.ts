/**
 * Type definitions for Franchise actor system data
 */

export interface FranchiseCards {
  library: number;
  gym: number;
  credit: number;
}

export interface FranchiseData {
  description: string;
  cards: FranchiseCards;
  /**
   * Franchise bank (resource pool).
   * When negative, triggers Debt Mode. Must be zero or negative to enter debtMode=true.
   * Bankruptcy resets bank to 0.
   *
   * Invariant: bank <= 0 when debtMode=true
   *
   * @see debtMode
   */
  bank: number;
  /**
   * Franchise dice pool for current mission.
   * Incremented by skill rolls; decremented by spending.
   * When missionPool >= missionGoal, mission is complete.
   */
  missionPool: number;
  /**
   * Mission completion threshold (dice target).
   * Mission succeeds when missionPool >= missionGoal.
   */
  missionGoal: number;
  /**
   * Wall-clock day when current mission started (Foundry currentDay setting).
   * Used to calculate mission duration and trigger vacation cleanup.
   */
  missionStartDay: number;
  /**
   * Franchise is in Debt Mode (bank negative, financial crisis).
   *
   * Effects in Debt Mode:
   * - Agents cannot earn franchise dice (cardsLocked=true)
   * - Bank rolls disabled
   * - Client rolls disabled
   * - Only Loan Repayment rolls allowed
   *
   * Invariant: debtMode=true requires bank < 0
   * Invariant: debtMode=true requires cardsLocked=true (cards earned but not kept)
   *
   * @see bank
   * @see cardsLocked
   * @see loanAmount
   */
  debtMode: boolean;
  /**
   * Outstanding loan amount during Debt Mode.
   * Set when entering Debt Mode; cleared when loan is repaid.
   * Only meaningful when debtMode=true.
   *
   * @see debtMode
   */
  loanAmount: number;
  /**
   * Agents earn franchise dice but cannot keep them (Debt Mode state).
   *
   * When cardsLocked=true:
   * - Skill rolls earn dice but dice are not added to franchise
   * - Dice are tracked for Loan Repayment roll
   *
   * Invariant: cardsLocked=true when debtMode=true
   *
   * @see debtMode
   */
  cardsLocked: boolean;
  /**
   * Franchise is in Death Mode (agents dying, high stakes).
   * GM control flag for rule variant where agents can die permanently.
   * Does NOT auto-apply death—GM must set manually and use explicit revival buttons.
   *
   * @see isDead on Agent
   */
  deathMode: boolean;
}
