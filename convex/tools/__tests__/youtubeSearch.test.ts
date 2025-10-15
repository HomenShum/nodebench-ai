// convex/tools/__tests__/youtubeSearch.test.ts
// Test suite for YouTube search tool

import { describe, it, expect } from "vitest";
import { youtubeSearch } from "../youtubeSearch";

describe("youtubeSearch tool", () => {
  it("should have correct tool structure", () => {
    expect(youtubeSearch).toBeDefined();
    expect(youtubeSearch.description).toBeDefined();
    expect(youtubeSearch.args).toBeDefined();
    expect(youtubeSearch.handler).toBeDefined();
  });

  it("should have correct description", () => {
    expect(youtubeSearch.description).toContain("YouTube");
    expect(youtubeSearch.description).toContain("videos");
  });

  // Note: Actual API call tests would require API key and network access
  // These would be integration tests rather than unit tests
});
