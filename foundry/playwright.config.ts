import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { WORKER_COUNT, POOL_SIZE, poolStorageStatePath } from "./src/__tests__/e2e/global-setup.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Seed empty storage-state files for each pool slot so global-setup can overwrite them.
// These files exist only as creation guards — the pool fixture no longer reads them at
// test time (it joins /join directly), but global-setup still writes them for reference.
const storageTmpDir = path.resolve(__dirname, "./.tmp");
fs.mkdirSync(storageTmpDir, { recursive: true });
for (let i = 0; i < POOL_SIZE; i++) {
  const statePath = poolStorageStatePath(i);
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
  reporter: process.env["CI"] ? [["list"], ["html"]] : "html",
  // 6 min per test: Foundry fixture setup (join + game.ready + sheet render) is ~30-60s
  // in CI. Tests with multiple action clicks may trigger /join redirects mid-test
  // (session expiry), each requiring a ~30s rejoin + re-render cycle. The consolidated
  // agent-sheet test has 9+ actions that can each redirect on v14, needing up to 5+ min.
  timeout: 360_000,
  // Hard wall-clock cap on the full run. If the suite exceeds this, something is wrong
  // (flapping retries, hung test, pool contention) — fail fast, not burn CI minutes.
  // CI cap is 25 min; job-level timeout-minutes:35 in ci.yml adds 10 min for container setup.
  globalTimeout: process.env["CI"] ? 25 * 60_000 : 12 * 60_000,
  use: {
    baseURL: "http://localhost:30000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // storageState is NOT set here — pool-based fixtures claim a free slot at runtime.
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
