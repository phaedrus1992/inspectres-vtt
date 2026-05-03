# E2E Test Benchmark Strategy (#475)

## Benchmarking Approach

Once E2E test infrastructure is established, measure:
1. **Test Suite Duration:** Total time to run all E2E tests
2. **Sheet Render Time:** Time for franchise/agent sheets to render after open
3. **Roll Execution Time:** Time from roll button click to chat message

## Optimization Targets

- Lazy-load inactive tabs (E2E only measures visible content)
- Batch sheet updates to reduce render cycles
- Cache computed properties where safe

## Infrastructure Dependency

E2E tests require:
- Headless Foundry instance (containerized or local)
- Browser automation (Playwright)
- Test data fixtures and seed data

Once infrastructure is available, this benchmark can be implemented via:
```bash
npm run benchmark:e2e
```

See `package.json` scripts for current setup.
