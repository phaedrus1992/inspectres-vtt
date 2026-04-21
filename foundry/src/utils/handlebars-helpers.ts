/**
 * Register custom Handlebars helpers for InSpectres sheets
 */

export function registerHandlebarsHelpers(): void {
  // Arithmetic helpers
  Handlebars.registerHelper("inspectres-add", (a: number, b: number) => a + b);
  Handlebars.registerHelper("inspectres-subtract", (a: number, b: number) => a - b);
  Handlebars.registerHelper("inspectres-multiply", (a: number, b: number) => a * b);
  Handlebars.registerHelper("inspectres-divide", (a: number, b: number) => (b !== 0 ? a / b : 0));

  // Comparison helpers
  Handlebars.registerHelper("inspectres-gte", (a: number, b: number) => a >= b);

  // Math helpers
  Handlebars.registerHelper("inspectres-max", (a: number, b: number) => Math.max(a, b));

  // String helpers
  Handlebars.registerHelper("inspectres-capitalize", (str: string) => {
    if (typeof str !== "string") return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Array helpers
  Handlebars.registerHelper("inspectres-range", (start: number, end: number) => {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  });

  // Plural helper
  Handlebars.registerHelper("inspectres-plural", (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  });

  // Concat helper
  Handlebars.registerHelper("inspectres-concat", (...args: unknown[]) => {
    // Last argument is the Handlebars options object, exclude it
    return args.slice(0, -1).join("");
  });
}
