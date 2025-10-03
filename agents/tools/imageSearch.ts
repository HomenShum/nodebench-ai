/**
 * Image Search Tool with Linkup Integration
 * 
 * Searches for images using Linkup API and stores results in Convex for real-time display
 */

import { linkupImageSearch } from '../services/linkup';

export interface ImageSearchResult {
  imageUrl: string;
  sourceUrl?: string;
  title?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  metadata?: any;
}

export interface ImageSearchOptions {
  query: string;
  depth?: 'standard' | 'deep';
  maxResults?: number;
  includeMetadata?: boolean;
}

/**
 * Search for images using Linkup
 * 
 * @param options - Search options
 * @returns Array of image results
 */
export async function searchImages(options: ImageSearchOptions): Promise<ImageSearchResult[]> {
  const { query, depth = 'standard', maxResults = 10, includeMetadata = true } = options;

  try {
    // Search using Linkup
    const linkupResults = await linkupImageSearch(query, depth);

    // Transform results
    const images: ImageSearchResult[] = linkupResults.slice(0, maxResults).map((result) => ({
      imageUrl: result.url,
      sourceUrl: result.url, // Linkup returns the image URL directly
      title: result.name || query,
      thumbnailUrl: result.url, // Use same URL for thumbnail
      format: extractFormat(result.url),
      metadata: includeMetadata ? {
        searchQuery: query,
        depth,
        foundAt: new Date().toISOString(),
        linkupType: result.type,
      } : undefined,
    }));

    return images;
  } catch (error) {
    console.error('[imageSearch] Search failed:', error);
    throw new Error(`Image search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract image format from URL
 */
function extractFormat(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    
    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'jpeg';
    if (pathname.endsWith('.png')) return 'png';
    if (pathname.endsWith('.gif')) return 'gif';
    if (pathname.endsWith('.webp')) return 'webp';
    if (pathname.endsWith('.svg')) return 'svg';
    
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Image search tool factory for orchestrator
 */
export function imageSearchTool() {
  return async (payload: any) => {
    const query = payload?.query || payload?.searchQuery || '';
    const depth = payload?.depth || 'standard';
    const maxResults = payload?.maxResults || 10;

    if (!query) {
      throw new Error('Image search requires a query parameter');
    }

    const results = await searchImages({
      query,
      depth,
      maxResults,
      includeMetadata: true,
    });

    return {
      success: true,
      query,
      count: results.length,
      images: results,
    };
  };
}

/**
 * Medical X-ray specific image search
 */
export async function searchMedicalXRayImages(
  condition?: string,
  maxResults: number = 10
): Promise<ImageSearchResult[]> {
  const query = condition 
    ? `medical X-ray ${condition} radiology imaging`
    : 'medical X-ray radiology imaging';

  return searchImages({
    query,
    depth: 'deep',
    maxResults,
    includeMetadata: true,
  });
}

/**
 * Medical X-ray search tool for orchestrator
 */
export function medicalXRaySearchTool() {
  return async (payload: any) => {
    const condition = payload?.condition || payload?.query || '';
    const maxResults = payload?.maxResults || 10;

    const results = await searchMedicalXRayImages(condition, maxResults);

    return {
      success: true,
      condition,
      count: results.length,
      images: results,
      metadata: {
        searchType: 'medical_xray',
        timestamp: new Date().toISOString(),
      },
    };
  };
}

