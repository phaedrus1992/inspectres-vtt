import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { WORKER_COUNT, workerStorageStatePath } from "./src/__tests__/e2e/global-setup.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Seed empty storage-state files for each worker so global-setup can overwrite them.
// Playwright requires the storageState path to exist before the run when set statically,
// but we set it dynamically in fixtures — these files exist only as a creation guard.
const storageTmpDir = path.resolve(__dirname, "./.tmp");
fs.mkdirSync(storageTmpDir, { recursive: true });
for (let i = 0; i < WORKER_COUNT; i++) {
  const statePath = workerStorageStatePath(i);
  if (!fs.existsSync(statePath)) {
    fs.writeFileSync(statePath, JSON.stringify({ cookies: [], origins: [] }));
  }
}

export default defineConfig({
  testDir: "./src/__tests__/e2e",
  testMatch: "**/*.test.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: WORKER_COUNT,
  reporter: process.env["CI"]
    ? [["list"], ["html"], ["json", { outputFile: "./test-results/test-results.json" }]]
    : [["html"], ["json", { outputFile: "./test-results/test-results.json" }]],
  // 2 min per test: Foundry fixture setup (join + game.ready + sheet render) is ~30-60s
  // in CI, leaving headroom for actual test assertions.
  timeout: 120_000,
  use: {
    baseURL: "http://localhost:30000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // storageState is set per-worker in fixtures.ts via the workerStorageState fixture.
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
        // Foundry requires 1366x768 minimum; Desktop Chrome default (1280x720) triggers
        // a resolution warning that can affect rendering and test stability.
        viewport: { width: 1366, height: 768 },
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
