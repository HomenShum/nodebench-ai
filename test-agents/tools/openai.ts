// Stub answer tool for gated live E2E tests.
export async function answerTool({ prompt }: { prompt: string }) {
  return `stub answer for: ${prompt}`;
}
