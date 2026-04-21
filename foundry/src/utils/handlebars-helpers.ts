/**
 * Register custom Handlebars helpers for InSpectres sheets
 */

export function registerHandlebarsHelpers(): void {
  // Arithmetic helpers
  Handlebars.registerHelper("add", (a: number, b: number) => a + b);
  Handlebars.registerHelper("subtract", (a: number, b: number) => a - b);
  Handlebars.registerHelper("multiply", (a: number, b: number) => a * b);
  Handlebars.registerHelper("divide", (a: number, b: number) => (b !== 0 ? a / b : 0));

  // Comparison helpers
  Handlebars.registerHelper("gte", (a: number, b: number) => a >= b);
  Handlebars.registerHelper("lte", (a: number, b: number) => a <= b);
  Handlebars.registerHelper("gt", (a: number, b: number) => a > b);
  Handlebars.registerHelper("lt", (a: number, b: number) => a < b);

  // Math helpers
  Handlebars.registerHelper("max", (a: number, b: number) => Math.max(a, b));
  Handlebars.registerHelper("min", (a: number, b: number) => Math.min(a, b));

  // String helpers
  Handlebars.registerHelper("capitalize", (str: string) => {
    if (typeof str !== "string") return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Array helpers
  Handlebars.registerHelper("range", (start: number, end: number) => {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  });

  // Plural helper
  Handlebars.registerHelper("plural", (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  });

  // Concat helper
  Handlebars.registerHelper("concat", (...args: unknown[]) => {
    // Last argument is the Handlebars options object, exclude it
    return args.slice(0, -1).join("");
  });
}
