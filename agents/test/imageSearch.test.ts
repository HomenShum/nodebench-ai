// agents/test/imageSearch.test.ts
// Test suite for Linkup image search functionality

import { describe, it, expect } from 'vitest';
import { linkupImageSearch } from '../services/linkup';
import { searchTool } from '../tools/search';
import type { ExecContext } from '../core/execute';

describe('Linkup Image Search', () => {
  // Skip these tests in CI unless LIVE_E2E=1 is set
  const shouldRunLive = process.env.LIVE_E2E === '1';
  const testIf = (condition: boolean) => (condition ? it : it.skip);

  describe('linkupImageSearch()', () => {
    testIf(shouldRunLive)('should return image results for "medical images"', async () => {
      const images = await linkupImageSearch('medical images', 'standard');
      
      expect(images).toBeDefined();
      expect(Array.isArray(images)).toBe(true);
      expect(images.length).toBeGreaterThan(0);
      
      // Check first image has required fields
      const firstImage = images[0];
      expect(firstImage).toHaveProperty('name');
      expect(firstImage).toHaveProperty('url');
      expect(firstImage).toHaveProperty('type');
      expect(firstImage.type).toBe('image');
      expect(firstImage.url).toMatch(/^https?:\/\//);
    });

    testIf(shouldRunLive)('should return image results for "San Francisco Golden Gate Bridge"', async () => {
      const images = await linkupImageSearch('San Francisco Golden Gate Bridge', 'standard');
      
      expect(images).toBeDefined();
      expect(Array.isArray(images)).toBe(true);
      expect(images.length).toBeGreaterThan(0);
      
      // All results should be images
      images.forEach((img) => {
        expect(img.type).toBe('image');
        expect(img.url).toMatch(/^https?:\/\//);
      });
    });

    testIf(shouldRunLive)('should handle deep search depth', async () => {
      const images = await linkupImageSearch('nature photography', 'deep');
      
      expect(images).toBeDefined();
      expect(Array.isArray(images)).toBe(true);
      // Deep search should return more results
      expect(images.length).toBeGreaterThan(0);
    });
  });

  describe('searchTool() with includeImages', () => {
    testIf(shouldRunLive)('should return images when includeImages=true', async () => {
      const tool = searchTool({ root: process.cwd() });
      
      const mockCtx: ExecContext = {
        memory: {
          get: () => undefined,
          set: () => {},
          putDoc: () => {},
          getDoc: () => undefined,
        },
        trace: {
          info: () => {},
          warn: () => {},
          error: () => {},
        },
      } as any;

      const result = await tool(
        { query: 'medical images', includeImages: true },
        mockCtx
      );

      expect(result).toBeDefined();
      expect(result.images).toBeDefined();
      expect(Array.isArray(result.images)).toBe(true);
      expect(result.images!.length).toBeGreaterThan(0);
      expect(result.snippet).toContain('Found');
      expect(result.snippet).toContain('images');
    });

    testIf(shouldRunLive)('should not return images when includeImages=false', async () => {
      const tool = searchTool({ root: process.cwd() });
      
      const mockCtx: ExecContext = {
        memory: {
          get: () => undefined,
          set: () => {},
          putDoc: () => {},
          getDoc: () => undefined,
        },
        trace: {
          info: () => {},
          warn: () => {},
          error: () => {},
        },
      } as any;

      const result = await tool(
        { query: 'medical images', includeImages: false },
        mockCtx
      );

      expect(result).toBeDefined();
      expect(result.images).toBeUndefined();
      // Should use structured search instead
      expect(result.structured).toBeDefined();
    });
  });

  describe('Image result structure', () => {
    testIf(shouldRunLive)('should have valid image URLs', async () => {
      const images = await linkupImageSearch('test images', 'standard');
      
      images.forEach((img) => {
        // URL should be valid HTTP/HTTPS
        expect(img.url).toMatch(/^https?:\/\/.+/);
        
        // URL should point to an image file or CDN
        const isImageUrl = 
          img.url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) ||
          img.url.includes('image') ||
          img.url.includes('photo') ||
          img.url.includes('cdn') ||
          img.url.includes('media');
        
        expect(isImageUrl).toBeTruthy();
      });
    });

    testIf(shouldRunLive)('should have descriptive names', async () => {
      const images = await linkupImageSearch('medical doctor', 'standard');
      
      images.forEach((img) => {
        // Name should be a non-empty string
        expect(typeof img.name).toBe('string');
        // Most images should have descriptive names (allow some empty ones)
      });
      
      // At least 50% should have non-empty names
      const withNames = images.filter((img) => img.name.length > 0);
      expect(withNames.length).toBeGreaterThan(images.length * 0.5);
    });
  });

  describe('Error handling', () => {
    it('should handle empty query gracefully', async () => {
      const tool = searchTool({ root: process.cwd() });
      
      const mockCtx: ExecContext = {
        memory: {
          get: () => undefined,
          set: () => {},
          putDoc: () => {},
          getDoc: () => undefined,
        },
        trace: {
          info: () => {},
          warn: () => {},
          error: () => {},
        },
      } as any;

      const result = await tool(
        { query: '', includeImages: true },
        mockCtx
      );

      expect(result).toBeDefined();
      // Should return empty results or fallback
      expect(result.hits).toBeDefined();
    });
  });
});

