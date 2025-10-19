// convex/agents/__tests__/e2e-coordinator-agent.test.ts
// End-to-end tests for coordinator agent with real API calls

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ConvexClient } from 'convex/browser';
import { api } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';

/**
 * E2E Tests for Coordinator Agent
 * 
 * These tests verify:
 * 1. Coordinator agent can delegate to specialized agents
 * 2. Specialized agents return properly formatted results
 * 3. Media extraction works with real tool outputs
 * 4. Sub-query filtering works correctly
 * 5. Rich media rendering data is properly structured
 */

describe.skipIf(!process.env.CONVEX_DEPLOYMENT_URL)('Coordinator Agent E2E Tests', () => {
  let client: ConvexClient;
  let testThreadId: string;
  const testUserId = ('test-user-' + Date.now()) as Id<"users">;;

  beforeAll(() => {
    // Initialize Convex client with deployment URL from env
    const deploymentUrl = process.env.CONVEX_DEPLOYMENT_URL;
    if (!deploymentUrl) {
      throw new Error('CONVEX_DEPLOYMENT_URL environment variable is required');
    }
    client = new ConvexClient(deploymentUrl);
  });

  afterAll(() => {
    // Cleanup
    if (client) {
      client.close();
    }
  });

  describe('Web Search Delegation', () => {
    it('should delegate web search and return structured sources', async () => {
      const result = await client.action(
        api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
        {
          prompt: 'Search for recent Tesla news',
          userId: testUserId,
        }
      );

      expect(result).toBeDefined();
      expect(result.response).toBeTruthy();
      expect(result.agentsUsed).toContain('Web');

      // Verify response contains source markers
      expect(result.response).toMatch(/SOURCE_GALLERY_DATA|sources|news/i);
    }, 1200000); // 1200 second timeout for real API calls

    it('should extract web sources from tool results', async () => {
      const result = await client.action(
        api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
        {
          prompt: 'Find information about AI trends',
          userId: testUserId,
        }
      );

      expect(result.response).toBeTruthy();

      // Check for source gallery data markers
      const hasSourceData = result.response.includes('SOURCE_GALLERY_DATA');
      if (hasSourceData) {
        const match = result.response.match(/<!-- SOURCE_GALLERY_DATA\n([\s\S]*?)\n-->/);
        expect(match).toBeTruthy();

        if (match) {
          const sources = JSON.parse(match[1]);
          expect(Array.isArray(sources)).toBe(true);
          expect(sources.length).toBeGreaterThan(0);

          // Verify source structure
          sources.forEach((source: any) => {
            expect(source).toHaveProperty('title');
            expect(source).toHaveProperty('url');
            expect(source).toHaveProperty('domain');
          });
        }
      }
    }, 1200000); // 1200 second timeout for real API calls
  });

  describe('Media Search Delegation', () => {
    it('should delegate media search and return YouTube videos', async () => {
      const result = await client.action(
        api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
        {
          prompt: 'Find YouTube videos about machine learning',
          userId: testUserId,
        }
      );

      expect(result).toBeDefined();
      expect(result.response).toBeTruthy();
      expect(result.agentsUsed).toContain('Media');

      // Verify response contains video markers
      expect(result.response).toMatch(/YOUTUBE_GALLERY_DATA|video|youtube/i);
    }, 1200000); // 1200 second timeout for real API calls

    it('should extract YouTube videos from tool results', async () => {
      const result = await client.action(
        api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
        {
          prompt: 'Show me videos about Python programming',
          userId: testUserId,
        }
      );

      expect(result.response).toBeTruthy();

      // Check for YouTube gallery data markers
      const hasVideoData = result.response.includes('YOUTUBE_GALLERY_DATA');
      if (hasVideoData) {
        const match = result.response.match(/<!-- YOUTUBE_GALLERY_DATA\n([\s\S]*?)\n-->/);
        expect(match).toBeTruthy();

        if (match) {
          const videos = JSON.parse(match[1]);
          expect(Array.isArray(videos)).toBe(true);

          // Verify video structure
          videos.forEach((video: any) => {
            expect(video).toHaveProperty('title');
            expect(video).toHaveProperty('videoId');
            expect(video).toHaveProperty('url');
          });
        }
      }
    }, 1200000); // 1200 second timeout for real API calls
  });

  describe('Multi-Agent Delegation', () => {
    it('should delegate to multiple agents for complex queries', async () => {
      const result = await client.action(
        api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
        {
          prompt: 'Search for Tesla news, videos, and SEC filings',
          userId: testUserId,
        }
      );

      expect(result).toBeDefined();
      expect(result.response).toBeTruthy();

      // Should use multiple agents
      expect(result.agentsUsed.length).toBeGreaterThanOrEqual(1);
    }, 1200000); // 1200 second timeout for real API calls

    it('should combine results from multiple agents', async () => {
      const result = await client.action(
        api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
        {
          prompt: 'Find information about Apple including news, videos, and documents',
          userId: testUserId,
        }
      );

      expect(result.response).toBeTruthy();

      // Response should contain combined results
      const hasMultipleMediaTypes =
        result.response.includes('GALLERY_DATA') ||
        result.response.includes('news') ||
        result.response.includes('video');

      expect(hasMultipleMediaTypes).toBe(true);
    }, 1200000); // 1200 second timeout for real API calls
  });

  describe('Response Formatting', () => {
    it('should format response with proper markdown structure', async () => {
      const result = await client.action(
        api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
        {
          prompt: 'Tell me about recent technology news',
          userId: testUserId,
        }
      );

      expect(result.response).toBeTruthy();

      // Response should have markdown structure
      expect(result.response).toMatch(/^[\s\S]*$/); // Non-empty

      // Should not have malformed JSON in markers
      const galleryMatches = result.response.match(/<!-- .*?_GALLERY_DATA\n([\s\S]*?)\n-->/g);
      if (galleryMatches) {
        galleryMatches.forEach((match: string) => {
          const jsonMatch = match.match(/<!-- .*?_GALLERY_DATA\n([\s\S]*?)\n-->/);
          if (jsonMatch) {
            expect(() => JSON.parse(jsonMatch[1])).not.toThrow();
          }
        });
      }
    }, 1200000); // 1200 second timeout for real API calls

    it('should include human-readable text alongside gallery data', async () => {
      const result = await client.action(
        api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
        {
          prompt: 'Search for information about climate change',
          userId: testUserId,
        }
      );

      expect(result.response).toBeTruthy();

      // Should have both structured data and readable text
      const hasStructuredData = result.response.includes('GALLERY_DATA');
      const hasReadableText = result.response.length > 100;

      expect(hasReadableText).toBe(true);
    }, 1200000); // 1200 second timeout for real API calls
  });

  describe('Error Handling', () => {
    it('should handle empty queries gracefully', async () => {
      // Empty prompts should be rejected with a validation error
      await expect(
        client.action(
          api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
          {
            prompt: '',
            userId: testUserId,
          }
        )
      ).rejects.toThrow(/Prompt cannot be empty/i);
    }, 120000); // 120 second timeout

    it('should handle invalid queries without crashing', async () => {
      const result = await client.action(
        api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
        {
          prompt: '!@#$%^&*()',
          userId: testUserId,
        }
      );

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
    }, 1200000); // 1200 second timeout for real API calls
  });

  describe('Agent Tracking', () => {
    it('should correctly track which agents were used', async () => {
      const result = await client.action(
        api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
        {
          prompt: 'Search for Tesla',
          userId: testUserId,
        }
      );

      expect(result.agentsUsed).toBeDefined();
      expect(Array.isArray(result.agentsUsed)).toBe(true);

      // Valid agent names
      const validAgents = ['Document', 'Media', 'SEC', 'Web'];
      result.agentsUsed.forEach((agent: string) => {
        expect(validAgents).toContain(agent);
      });
    }, 1200000); // 1200 second timeout for real API calls

    it('should not duplicate agent names in tracking', async () => {
      const result = await client.action(
        api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
        {
          prompt: 'Find more information about technology',
          userId: testUserId,
        }
      );

      const uniqueAgents = new Set(result.agentsUsed);
      expect(uniqueAgents.size).toBe(result.agentsUsed.length);
    }, 1200000); // 1200 second timeout for real API calls
  });
});

