import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/__mocks__/setup.ts"],
    exclude: ["src/__tests__/accessibility/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      thresholds: {
        lines: 45,
        functions: 50,
        branches: 40,
        statements: 45,
      },
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/__mocks__/**", "src/__tests__/**"],
    },
  },
});
