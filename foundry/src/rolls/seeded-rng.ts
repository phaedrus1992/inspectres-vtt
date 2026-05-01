/**
 * Seeded random number generator for deterministic dice rolls.
 * Uses a simple linear congruential generator (LCG) for reproducibility in tests.
 * Production uses Math.random() seed = 0 to maintain current behavior.
 */

/** Global RNG state. Allows tests to seed for determinism. */
let rngSeed = 0;

/** Simple 32-bit LCG implementation for seeding. */
function lcg(): number {
  rngSeed = (rngSeed * 1103515245 + 12345) & 0x7fffffff;
  return rngSeed / 0x7fffffff;
}

/** Get current RNG seed value. */
export function getRNGSeed(): number {
  return rngSeed;
}

/** Set RNG seed for deterministic rolls (tests). Seed=0 → Math.random() fallback (production). */
export function setRNGSeed(seed: number): void {
  rngSeed = seed >>> 0; // cast to uint32
}

/**
 * Generate a random number in [0, 1).
 * If seed is 0, falls back to Math.random() for production behavior.
 * If seed is non-zero, uses deterministic LCG for tests.
 */
export function random(): number {
  return rngSeed === 0 ? Math.random() : lcg();
}
