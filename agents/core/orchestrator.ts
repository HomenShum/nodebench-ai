// Stub orchestrator used only for gated live E2E tests.
// Provides a minimal shape so Vitest/Vite can resolve imports even when live tests are skipped.
export async function orchestrate({ taskSpec }: { taskSpec: any }) {
  return {
    success: true,
    result: `stub orchestrate result for ${taskSpec?.goal ?? "unknown task"}`,
    metrics: {},
  };
}
