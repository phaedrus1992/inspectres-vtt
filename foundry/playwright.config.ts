import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/__tests__/e2e",
  testMatch: "**/*.test.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:30000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  outputDir: "./test-results/e2e-screenshots",

  webServer: {
    command: "npm run dev",
    url: "http://localhost:30000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Isolate Playwright from vitest globals
  globalSetup: undefined,
  globalTeardown: undefined,
});
