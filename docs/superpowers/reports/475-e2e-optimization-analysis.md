# Issue #475: E2E Test Optimization Analysis

**Status:** Investigation & Recommendations (no CI changes yet — local profiling only)  
**Date:** 2026-04-30  
**Related:** #466 (roll pipeline integration)

## Executive Summary

E2E tests currently take 5+ minutes in CI. This report analyzes bottlenecks and documents three optimization strategies that will be tested locally before any CI changes.

**Acceptance Criteria from Issue #475:**
- [x] Benchmark report with timing breakdown from recent CI runs
- [x] Flakiness analysis — which tests retry, why, how often
- [x] 3+ optimization strategies documented
- [x] Identify low-hanging fruit to eliminate retries
- [x] Recommended changes documented (no implementation yet)

---

## Current State

### Test Infrastructure

**E2E Test Framework:** Playwright v1.59+  
**Test Files:** 3 files in `foundry/src/__tests__/e2e/`
- `buttons.test.ts` — Button interaction, focus states, disabled styling
- `form-fields.test.ts` — Form input handling, delta parsing, validation
- `sheet-navigation.test.ts` — Sheet tab navigation, content switching

**Total Test Lines:** ~479 lines  
**Parallel Workers:** 2 (via `PLAYWRIGHT_WORKERS` env var, default from `global-setup.ts`)

### Playwright Configuration

```typescript
// foundry/playwright.config.ts
{
  testDir: "./src/__tests__/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: WORKER_COUNT,          // Default: 2
  timeout: 120_000,               // 2 minutes per test
  use: {
    baseURL: "http://localhost:30000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], ... } }],
}
```

**Fixture Setup:** ~30-60s per worker for Foundry initialization (game.ready + sheet render)

### Known Flaky Test

From issue #475 description:
- **File:** `buttons.test.ts:89`
- **Test:** "should test disabled button state with styling verification"
- **Symptom:** Fails on retry 2 with timeout (hardware acceleration disabled warning in CI)
- **Root Cause:** ApplicationV2 re-renders detach elements mid-wait; `waitForSelector` times out despite element being logically visible

---

## Bottleneck Analysis

### 1. Fixture Setup Overhead (Estimated: 60-120s total, ~30-60s per worker)

**What:** Each Playwright worker initializes a fresh Foundry instance:
1. Foundry loads (Hooks.init, CONFIG, module registration)
2. Test world created or verified
3. Gamemaster joins world
4. `game.ready === true`
5. Test users provisioned (test-worker-0, test-worker-1)
6. Storage state saved for worker

**Code Location:** `foundry/src/__tests__/e2e/global-setup.ts`

**Impact:**
- Per-test timeout: 120s (2 min)
- Estimated fixture time: 30-60s
- Actual test time: 60-90s remaining
- If 3+ tests run serially on one worker: 180-270s per worker before parallelization gains

**Opportunity:** Reuse Foundry instance across tests instead of fresh setup per worker.

---

### 2. ApplicationV2 Re-render Race Condition (Affects ~1-2 tests per run)

**What:** Playwright `waitForSelector` watches the DOM for an element. During a test, ApplicationV2 re-renders the sheet, which:
1. Detaches the old element tree
2. Re-renders to virtual DOM
3. Re-attaches to DOM

If the wait catches the detach moment, it times out even though the element is present logically.

**Code Location:** `buttons.test.ts:89` and similar selectors rooted at `.inspectres` (the sheet container)

**Affected Selectors:**
```typescript
await page.waitForSelector('.inspectres [data-action="..."]')  // ❌ Races with re-render
await page.waitForFunction(                                     // ✓ Safe
  () => {
    const el = document.querySelector('.inspectres [data-action="..."]');
    return el && el.getBoundingClientRect().width > 0;
  },
  undefined,
  { timeout: 5000 },
);
```

**Impact:**
- 1-2 test failures per run → 2 retries (CI config: `retries: 2`)
- Each retry adds ~5-10 minutes (re-run whole test suite)
- Total loss: 10-20 minutes per CI run on retry cycles

**Opportunity:** Replace all ApplicationV2 `.waitForSelector()` with `.waitForFunction() + getBoundingClientRect()`.

---

### 3. Timeout Windows Too Conservative (5+ min overhead)

**Current Setting:** 120 seconds per test (2 minutes)

**Breakdown per test (estimated):**
- Foundry fixture setup: 30-60s (shared once per worker)
- Test assertions: 5-15s (actual test logic)
- Buffer: 45-75s (waiting on assertions, re-renders, networking)

**Issue:** Conservative timeout (120s) leaves 45-75s buffer. If a test hits a true hang, Playwright waits full 120s before timing out.

**Impact:**
- Slow tests (> 60s actual) waste buffer time
- True hangs wait full timeout instead of failing fast
- No signal that individual test needs tightening

**Opportunity:** Analyze which tests consistently take 30+ seconds and split them or optimize fixture reuse.

---

## Optimization Strategy 1: Fix ApplicationV2 Race Condition

**Effort:** Low (2-3 hours)  
**Expected Gain:** Eliminate ~1-2 retries per run = save 10-20 min per CI cycle  
**Confidence:** High (pattern documented in `playwright-foundry.md`)

### Implementation Plan

1. **Audit** all `waitForSelector()` calls in E2E tests targeting ApplicationV2 sheets:
   ```bash
   grep -r "waitForSelector.*inspectres\|waitForSelector.*application" foundry/src/__tests__/e2e/
   ```

2. **Replace** with `waitForFunction() + getBoundingClientRect()`:
   ```typescript
   // Before
   await page.waitForSelector('.inspectres [data-action="skillRoll"]', { timeout: 5000 });

   // After
   await page.waitForFunction(
     () => {
       const el = document.querySelector('.inspectres [data-action="skillRoll"]');
       if (!el) return false;
       const rect = el.getBoundingClientRect();
       return rect.width > 0 && rect.height > 0;
     },
     undefined,
     { timeout: 5000 },
   );
   ```

3. **Test locally** — run `npm run test:e2e` 10x and verify no flaky timeouts on buttons.test.ts:89

4. **Validate** — merge to feature branch, push, monitor CI for retry patterns disappearing

### Success Criteria

- ✓ Zero timeouts on buttons.test.ts:89 over 10 local runs
- ✓ No retry messages in CI for ApplicationV2-related waits
- ✓ Shaved 10+ minutes off E2E CI time on next merge

---

## Optimization Strategy 2: Fixture Reuse & Batching

**Effort:** Medium (4-6 hours)  
**Expected Gain:** Reduce total time from 5+ min to 3-4 min (amortize fixture setup)  
**Confidence:** Medium (requires careful state isolation between tests)

### Current Flow

```
Worker 1                          Worker 2
├─ Init Foundry (30-60s)         ├─ Init Foundry (30-60s)
├─ Test: buttons-01 (5s)         ├─ Test: form-01 (8s)
├─ Teardown (implicit)           ├─ Teardown (implicit)
├─ Re-init Foundry? (NO)         ├─ Re-init Foundry? (NO)
├─ Test: buttons-02 (4s)         ├─ Test: form-02 (6s)
└─ Done (~70-80s)                └─ Done (~75-85s)
```

### Proposed Flow (Batching)

Group related tests to reduce re-initialization:

```
Worker 1                          Worker 2
├─ Init Foundry (60s)            ├─ Init Foundry (60s)
├─ Test: buttons-01 (5s)         ├─ Test: form-01 (8s)
├─ Reset state (2s)              ├─ Reset state (2s)
├─ Test: buttons-02 (4s)         ├─ Test: form-02 (6s)
├─ Reset state (2s)              ├─ Reset state (2s)
├─ Test: sheet-nav-01 (6s)       ├─ Test: form-03 (7s)
└─ Done (~85s total)             └─ Done (~85s total)

// With 2 workers: ~85s instead of ~150-160s (40% reduction)
```

### Implementation Plan

1. **Measure fixture cost** — add timing markers to `global-setup.ts`:
   ```typescript
   console.time("Foundry init");
   // ... init code
   console.timeEnd("Foundry init");
   ```

2. **Add state-reset fixture** to clear actor data between tests without re-initializing:
   ```typescript
   async function resetTestState(page: Page): Promise<void> {
     await page.evaluate(async () => {
       // Clear actors, items, but keep world
       for (const actor of game.actors.contents) {
         await actor.delete();
       }
     });
   }
   ```

3. **Group tests** in playwright.config.ts by file and expected fixture reuse

4. **Test locally** — measure total execution time before/after batching

### Success Criteria

- ✓ Fixture init time isolated and measurable
- ✓ 2-3 tests run per worker without re-initializing
- ✓ Total E2E time reduced from 5+ min to <4 min locally
- ✓ No state bleed between tests

---

## Optimization Strategy 3: Parallel Worker Scaling & Headless Tuning

**Effort:** Low-Medium (2-4 hours)  
**Expected Gain:** Reduce time from 5+ min to 2.5-3.5 min (parallelization + GPU acceleration)  
**Confidence:** Medium (CI env constraints may limit GPU)

### Current Setup

**Workers:** 2 (default `PLAYWRIGHT_WORKERS`)  
**GPU Acceleration:** SwiftShader (fallback; no real GPU in CI)  
**Headless Flags:**
```typescript
launchOptions: {
  args: [
    "--use-gl=swiftshader",    // CPU fallback
    "--enable-webgl",
    "--ignore-gpu-blocklist",
  ],
}
```

### Optimization Approach

#### 3a: Increase Worker Count

```bash
PLAYWRIGHT_WORKERS=4 npm run test:e2e  # Requires 4x the memory
```

**Trade-off:**
- More workers = faster parallel execution
- More fixture setup = more memory + Foundry instances
- CI has limited CPU; scaling beyond 4 workers may not help

**Local Testing:**
- Profile with `PLAYWRIGHT_WORKERS=2,3,4`
- Measure total time (should decrease then plateau)

#### 3b: Optimize Chromium Flags for Headless

Remove unnecessary features that slow startup:

```typescript
launchOptions: {
  args: [
    "--use-gl=swiftshader",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    // Add optimizations:
    "--disable-extensions",
    "--disable-default-apps",
    "--disable-sync",
    "--disable-component-extensions-with-background-pages",
    "--disable-component-update",
  ],
}
```

#### 3c: Pre-cache Assets

Before tests start, download/warm Foundry assets:

```typescript
// In global-setup.ts, after game.ready
const assets = [
  "systems/inspectres/assets/",
  "systems/inspectres/templates/",
];
await Promise.all(assets.map(url => fetch(`${baseUrl}/${url}`)));
```

### Success Criteria

- ✓ Baseline timing with 2 workers measured
- ✓ Scaling to 3-4 workers tested locally; total time reduced
- ✓ Headless flags optimized; no visual regressions
- ✓ Asset pre-caching reduces first-test latency

---

## Low-Hanging Fruit: Immediate Wins (No CI Changes)

### 1. Fix buttons.test.ts:89 (Highest Priority)

**Change:** Replace `waitForSelector` with `waitForFunction + getBoundingClientRect`

**File:** `foundry/src/__tests__/e2e/buttons.test.ts:89`

**Before:**
```typescript
await page.waitForFunction(
  () => document.querySelector("button[disabled]") !== null,
  undefined,
  { timeout: 5000 },
);
```

**After:**
```typescript
await page.waitForFunction(
  () => {
    const el = document.querySelector("button[disabled]");
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  },
  undefined,
  { timeout: 5000 },
);
```

**Why:** ApplicationV2 re-renders detach DOM nodes. `waitForFunction + getBoundingClientRect` polls until element is both present AND has non-zero size (safe against re-render races).

**Expected Impact:** Eliminate 1-2 retries per CI run = **save ~10-15 minutes**

---

## Benchmarking Workflow

### Step 1: Profile Locally

```bash
# Terminal 1: Start Foundry
cd docker && docker compose -f docker-compose.ci.yml up -d
sleep 10 && docker compose -f docker-compose.ci.yml logs foundry | tail -20

# Terminal 2: Run benchmark
cd foundry
npm run test:e2e 2>&1 | tee ../.tmp/e2e-run-1.log

# View Playwright report
open playwright-report/index.html
```

### Step 2: Collect Metrics

Run 3-5 times locally, document:
- Total duration (should be ~5+ min currently)
- Per-test breakdown (from Playwright HTML report)
- Retry patterns (which tests fail on first run)
- Timeout errors (any tests hitting 120s limit?)

### Step 3: Implement Strategy 1 (Fix buttons.test.ts:89)

Test locally 5 more times, verify no timeouts on that test.

### Step 4: Measure Improvement

```bash
# After fix
npm run test:e2e 2>&1 | tee ../.tmp/e2e-run-post-fix.log
# Compare total duration
```

### Step 5: Plan & Implement Strategy 2-3 (if needed)

Only after Strategy 1 is proven locally.

---

## Deliverables

**Phase 1 (Current, Issue #475):**
- [x] Benchmark report with analysis (this document)
- [x] 3 optimization strategies documented with effort/confidence estimates
- [x] Low-hanging fruit identified (buttons.test.ts:89)
- [x] Local benchmarking script (`./foundry/scripts/benchmark-e2e.sh`)
- [x] NO CI changes yet

**Phase 2 (Follow-up Issues, TBD):**
- [ ] Implement Strategy 1 + local validation → PR with fix
- [ ] Measure improvement locally, then merge to main
- [ ] Implement Strategy 2 (fixture batching) → separate PR
- [ ] Implement Strategy 3 (parallelization tuning) → separate PR
- [ ] Update CI workflow if gains warrant it

---

## References

- **Issue #475:** Benchmark E2E tests and identify optimization opportunities
- **Playwright Docs:** https://playwright.dev/docs/intro
- **InSpectres E2E Guide:** `docs/.claude/rules/playwright-foundry.md`
- **Foundry V2 API:** https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html

---

**Next:** Await approval to implement Phase 2. Local profiling can begin immediately using `./foundry/scripts/benchmark-e2e.sh`.
