# MCP Test Suite — 33 test files, 497+ tests

## Test Groups

### Unit Tests (core validation)
- `tools.test.ts` — 242 tool validation tests + IR metrics
- `embeddingProvider.test.ts` — Cosine similarity, mock provider, fallback
- `analytics.test.ts` — Analytics pipeline tests
- `dynamicLoading.test.ts` — Dynamic tool loading
- `forecastingScoring.test.ts` — Forecast scoring accuracy

### Eval Harnesses (agent-level evaluation)
- `evalHarness.test.ts` — 15 scenarios, 102 tool calls
- `evalDatasetBench.test.ts` — 20 SWE-bench tasks, 473 calls
- `comparativeBench.test.ts` — A/B: bare vs MCP agent, 244+ calls
- `critterCalibrationEval.ts` — Accountability checkpoint calibration

### Preset & Gating Benchmarks
- `presetRealWorldBench.test.ts` — 8 scenarios × 4 presets, 57 tests
- `toolsetGatingEval.test.ts` — 4 presets × 9 scenarios, 46 tests

### Open Dataset Evaluations
- `openDatasetParallelEval.test.ts` — BFCL v3, 8 tasks, 80 calls
- `openDatasetParallelEvalGaia.test.ts` — GAIA benchmark
- `openDatasetParallelEvalSwebench.test.ts` — SWE-bench
- `openDatasetParallelEvalToolbench.test.ts` — ToolBench
- `openDatasetPerfComparison.test.ts` — Cross-dataset perf

### GAIA Capability Tests
- `gaiaCapabilityEval.test.ts` — Core GAIA
- `gaiaCapabilityAudioEval.test.ts` — Audio modality
- `gaiaCapabilityFilesEval.test.ts` — File handling
- `gaiaCapabilityMediaEval.test.ts` — Media/image

### Integration Tests
- `cliSubcommands.test.ts` — 15 CLI integration tests
- `localDashboard.test.ts` — Dashboard HTTP endpoints
- `webmcpTools.test.ts` — WebMCP tool integration
- `batchAutopilot.test.ts` — Batch operations
- `architectSmoke.test.ts` — 4 architect smoke tests
- `architectComplex.test.ts` — 18 complex architect tests
- `thompsonProtocol.test.ts` — Thompson protocol validation

### Dogfood Tests (end-to-end validation)
- `multiHopDogfood.test.ts` — Multi-hop graph traversal
- `openclawDogfood.test.ts` — OpenClaw sandbox
- `openclawMessaging.test.ts` — OpenClaw messaging
- `traceabilityDogfood.test.ts` — Completion traceability
- `forecastingDogfood.test.ts` — Forecasting pipeline

## Running Tests

```bash
# All tests
npx vitest run

# Single file
npx vitest run src/__tests__/tools.test.ts

# By pattern
npx vitest run --testPathPattern="dogfood"
```
