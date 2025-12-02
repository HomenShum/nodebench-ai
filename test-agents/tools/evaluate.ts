// Stub evaluate tool for gated live E2E tests.
export async function evaluateAnswer({ topic, answer }: { topic: string; answer: string }) {
  return {
    verdict: "unknown",
    confidence: 0,
    reasoning: `stub evaluation for topic "${topic}" and answer length ${answer?.length ?? 0}`,
  };
}
