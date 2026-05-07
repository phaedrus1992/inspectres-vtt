import { describe, it, expect, beforeAll } from "vitest";
import * as fc from "fast-check";
import Handlebars from "handlebars";
import { registerHandlebarsHelpers } from "./handlebars-helpers.js";

beforeAll(() => {
  // The source uses the global `Handlebars` available at Foundry runtime.
  // In vitest we expose the npm module as that global before registering.
  Object.defineProperty(globalThis, "Handlebars", {
    value: Handlebars,
    writable: true,
    configurable: true,
  });
  // game.i18n is only used by inspectres-format, which is covered by the
  // example-based suite. Stub minimally so registerHandlebarsHelpers runs.
  Object.defineProperty(globalThis, "game", {
    value: { i18n: { format: (key: string) => key } },
    writable: true,
    configurable: true,
  });
  registerHandlebarsHelpers();
});

// Helper invocations: Handlebars passes an `options` object as the last
// positional argument to every helper at template runtime. We model that
// here by appending an empty options object so we exercise the helpers the
// same way templates do.
const opts = (): unknown => ({ hash: {}, data: {} });
const call = <T>(name: string, ...args: unknown[]): T => {
  const helper = Handlebars.helpers[name] as ((...a: unknown[]) => T) | undefined;
  if (!helper) throw new Error(`Helper ${name} not registered`);
  return helper(...args, opts());
};

describe("inspectres-add", () => {
  it("is the arithmetic sum for finite integers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (a, b) => {
          expect(call<number>("inspectres-add", a, b)).toBe(a + b);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("is commutative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (a, b) => {
          expect(call<number>("inspectres-add", a, b)).toBe(
            call<number>("inspectres-add", b, a),
          );
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("inspectres-subtract", () => {
  it("is the inverse of add for any pair", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (a, b) => {
          const sum = call<number>("inspectres-add", a, b);
          expect(call<number>("inspectres-subtract", sum, b)).toBe(a);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("subtracting zero is identity", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), (a) => {
        expect(call<number>("inspectres-subtract", a, 0)).toBe(a);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("inspectres-multiply", () => {
  it("matches arithmetic product", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -100, max: 100 }),
        (a, b) => {
          expect(call<number>("inspectres-multiply", a, b)).toBe(a * b);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("multiplying by zero gives zero", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), (a) => {
        // `===` treats -0 and 0 as equal; both vitest matchers (`toBe`,
        // `toEqual`) use Object.is and distinguish them. Compare numerically.
        const result = call<number>("inspectres-multiply", a, 0);
        expect(result === 0).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });
});

describe("inspectres-divide", () => {
  it("returns 0 when dividing by 0 (defined fallback)", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), (a) => {
        expect(call<number>("inspectres-divide", a, 0)).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it("matches arithmetic quotient for nonzero divisor", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (a, b) => {
          expect(call<number>("inspectres-divide", a, b)).toEqual(a / b);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("inspectres-gte", () => {
  it("returns a boolean for any pair of finite numbers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (a, b) => {
          const result = call<boolean>("inspectres-gte", a, b);
          expect(typeof result).toBe("boolean");
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("matches native >=", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (a, b) => {
          expect(call<boolean>("inspectres-gte", a, b)).toBe(a >= b);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("is reflexive: gte(a, a) is true", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), (a) => {
        expect(call<boolean>("inspectres-gte", a, a)).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  it("when a > b then gte(a, b) ∧ ¬gte(b, a)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (a, delta) => {
          const b = a - delta;
          expect(call<boolean>("inspectres-gte", a, b)).toBe(true);
          expect(call<boolean>("inspectres-gte", b, a)).toBe(false);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("inspectres-max", () => {
  it("matches Math.max", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (a, b) => {
          expect(call<number>("inspectres-max", a, b)).toBe(Math.max(a, b));
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("result is at least each input", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (a, b) => {
          const result = call<number>("inspectres-max", a, b);
          expect(result).toBeGreaterThanOrEqual(a);
          expect(result).toBeGreaterThanOrEqual(b);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe("inspectres-capitalize", () => {
  it("preserves length for any string", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(call<string>("inspectres-capitalize", s)).toHaveLength(s.length);
      }),
      { numRuns: 1000 },
    );
  });

  it("first character is uppercase if alphabetic", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => /^[a-zA-Z]/.test(s)),
        (s) => {
          const result = call<string>("inspectres-capitalize", s);
          expect(result.charAt(0)).toBe(result.charAt(0).toUpperCase());
        },
      ),
      { numRuns: 500 },
    );
  });

  it("empty string returns empty string", () => {
    expect(call<string>("inspectres-capitalize", "")).toBe("");
  });

  it("tail is unchanged", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (s) => {
        const result = call<string>("inspectres-capitalize", s);
        expect(result.slice(1)).toBe(s.slice(1));
      }),
      { numRuns: 1000 },
    );
  });

  it("non-string input is returned unchanged (no throw)", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
        ),
        (input) => {
          expect(() => call("inspectres-capitalize", input)).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("inspectres-range", () => {
  it("range(start, end) has end - start + 1 elements when end >= start", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        (start, length) => {
          const end = start + length;
          const result = call<number[]>("inspectres-range", start, end);
          expect(result).toHaveLength(end - start + 1);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("range(start, end) is consecutive integers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 10 }),
        fc.integer({ min: 0, max: 20 }),
        (start, length) => {
          const end = start + length;
          const result = call<number[]>("inspectres-range", start, end);
          for (let i = 0; i < result.length; i++) {
            expect(result[i]).toBe(start + i);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("range(n, n) is [n]", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10, max: 10 }), (n) => {
        expect(call<number[]>("inspectres-range", n, n)).toEqual([n]);
      }),
      { numRuns: 100 },
    );
  });

  it("range(start, end) with end < start returns empty array", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (start, gap) => {
          const end = start - gap;
          expect(call<number[]>("inspectres-range", start, end)).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("inspectres-plural", () => {
  it("returns singular iff count === 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 100 }),
        fc.string(),
        fc.string(),
        (count, singular, plural) => {
          const result = call<string>(
            "inspectres-plural",
            count,
            singular,
            plural,
          );
          expect(result).toBe(count === 1 ? singular : plural);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("returns plural for 0 (zero is plural in English)", () => {
    expect(call<string>("inspectres-plural", 0, "die", "dice")).toBe("dice");
  });

  it("returns plural for negative counts", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: -1 }), (count) => {
        expect(
          call<string>("inspectres-plural", count, "die", "dice"),
        ).toBe("dice");
      }),
      { numRuns: 100 },
    );
  });
});

describe("inspectres-concat", () => {
  it("concatenates all positional args (excluding options) as strings", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          { minLength: 0, maxLength: 8 },
        ),
        (args) => {
          const expected = args.map((a) => String(a)).join("");
          expect(call<string>("inspectres-concat", ...args)).toBe(expected);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("with no positional args returns empty string", () => {
    expect(call<string>("inspectres-concat")).toBe("");
  });

  it("appending empty string is identity", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(call<string>("inspectres-concat", s, "")).toBe(s);
      }),
      { numRuns: 500 },
    );
  });
});
