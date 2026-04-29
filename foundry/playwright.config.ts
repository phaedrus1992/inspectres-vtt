import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_STATE = path.resolve(__dirname, "./.tmp/playwright-storage-state.json");

// Playwright errors if storageState path doesn't exist before the run.
// Seed with an empty state so global-setup can populate it on first run.
if (!fs.existsSync(STORAGE_STATE)) {
  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  fs.writeFileSync(STORAGE_STATE, JSON.stringify({ cookies: [], origins: [] }));
}

export default defineConfig({
  testDir: "./src/__tests__/e2e",
  testMatch: "**/*.test.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:30000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    storageState: STORAGE_STATE,
  },

  outputDir: "./test-results/e2e-screenshots",

  // We expect docker compose + npm run dev to already be running.
  // The orchestration script (scripts/run-e2e.sh) starts them and waits.

  globalSetup: path.resolve(__dirname, "./src/__tests__/e2e/global-setup.ts"),

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Foundry's PIXI canvas warns when WebGL hardware acceleration is unavailable.
        // SwiftShader gives headless Chromium a working GL backend so the permanent
        // "hardware acceleration disabled" warning does not appear and clutter the UI.
        launchOptions: {
          args: [
            "--use-gl=swiftshader",
            "--enable-webgl",
            "--ignore-gpu-blocklist",
            "--enable-accelerated-2d-canvas",
          ],
        },
      },
    },
  ],

  globalTeardown: undefined,
});
