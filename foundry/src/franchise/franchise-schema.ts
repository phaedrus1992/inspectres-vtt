/**
 * Type definitions for Franchise actor system data
 */

export interface FranchiseCards {
  library: number;
  gym: number;
  credit: number;
}

export interface FranchiseData {
  cards: FranchiseCards;
  bank: number;
  missionPool: number;
  missionGoal: number;
  debtMode: boolean;
  loanAmount: number;
}
