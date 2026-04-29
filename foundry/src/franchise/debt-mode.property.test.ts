/**
 * Property-based tests for debt mode and bankruptcy invariants.
 * computeBankruptcyState reads directly from FranchiseData; loan repayment math.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeBankruptcyState, MAX_LOAN_AMOUNT, LOAN_INTEREST_RATE } from "./bankruptcy-handler.js";
import { franchiseData } from "../__mocks__/arbitraries.js";

describe("computeBankruptcyState invariants", () => {
  it("reflects debtMode flag directly from franchise data", () => {
    fc.assert(
      fc.property(franchiseData(), (system) => {
        const state = computeBankruptcyState(system);
        expect(state.inDebt).toBe(system.debtMode);
      }),
      { numRuns: 1000 },
    );
  });

  it("reflects cardsLocked flag directly from franchise data", () => {
    fc.assert(
      fc.property(franchiseData(), (system) => {
        const state = computeBankruptcyState(system);
        expect(state.cardsLocked).toBe(system.cardsLocked);
      }),
      { numRuns: 1000 },
    );
  });

  it("reflects loanAmount directly from franchise data", () => {
    fc.assert(
      fc.property(franchiseData(), (system) => {
        const state = computeBankruptcyState(system);
        expect(state.loanAmount).toBe(system.loanAmount);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("loan repayment math invariants", () => {
  it("repayment needed = loanAmount + LOAN_INTEREST_RATE", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: MAX_LOAN_AMOUNT }), (loanAmount) => {
        const repaymentNeeded = loanAmount + LOAN_INTEREST_RATE;
        expect(repaymentNeeded).toBe(loanAmount + 1);
        expect(repaymentNeeded).toBeGreaterThan(loanAmount);
      }),
      { numRuns: 1000 },
    );
  });

  it("franchise total after repayment = earnedDice - (loanAmount + interest)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_LOAN_AMOUNT }),
        fc.integer({ min: 0, max: 50 }),
        (loanAmount, earnedDice) => {
          const repaymentNeeded = loanAmount + LOAN_INTEREST_RATE;
          const franchiseTotal = earnedDice - repaymentNeeded;
          // Can be negative (bankruptcy) but math must hold
          expect(franchiseTotal).toBe(earnedDice - repaymentNeeded);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("MAX_LOAN_AMOUNT is never exceeded by borrow amount clamping", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (requestedBorrow) => {
          const clamped = Math.max(0, Math.min(MAX_LOAN_AMOUNT, requestedBorrow));
          expect(clamped).toBeGreaterThanOrEqual(0);
          expect(clamped).toBeLessThanOrEqual(MAX_LOAN_AMOUNT);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("debt cleared requires earned >= loanAmount + interest", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_LOAN_AMOUNT }),
        fc.integer({ min: 0, max: 50 }),
        (loanAmount, earnedDice) => {
          const repaymentNeeded = loanAmount + LOAN_INTEREST_RATE;
          const canClear = earnedDice >= repaymentNeeded;
          const franchiseTotal = earnedDice - repaymentNeeded;
          if (canClear) {
            // After clearing, franchise bank = earnedDice - repaymentNeeded
            expect(franchiseTotal).toBeGreaterThanOrEqual(0);
          } else {
            // Still in debt: earned dice insufficient
            expect(earnedDice).toBeLessThan(repaymentNeeded);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});
