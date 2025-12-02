// Stub search tool for gated live E2E tests.
export function searchTool() {
  return async ({ prompt }: { prompt: string }) => {
    return `stub search results for: ${prompt}`;
  };
}
