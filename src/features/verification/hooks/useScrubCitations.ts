// src/features/verification/hooks/useScrubCitations.ts
// React hook for scrubbing hallucinated citations from agent output
// Uses artifact store to build allowed URL set, then scrubs client-side

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { 
  scrubUnverifiedCitations, 
  buildAllowedUrlsSet,
  type ScrubResult,
  type ScrubOptions,
} from "../../../../shared/verification/citationScrubber";

/**
 * Hook to get scrubbed text with hallucinated URLs removed
 * 
 * @param text - The text to scrub (agent output)
 * @param runId - The run ID to check artifacts against
 * @param options - Scrubbing options
 * @returns Scrubbed text and metadata
 */
export function useScrubCitations(
  text: string | undefined,
  runId: string | undefined,
  options: ScrubOptions = {}
): ScrubResult & { isLoading: boolean } {
  // Get artifacts for this run
  const artifacts = useQuery(
    api.lib.artifactQueries.getArtifactsByRun,
    runId ? { runId } : "skip"
  );
  
  // Build allowed URLs set from artifacts
  const allowedUrls = useMemo(() => {
    if (!artifacts) return new Set<string>();
    return buildAllowedUrlsSet(artifacts.map(a => a.canonicalUrl));
  }, [artifacts]);
  
  // Scrub the text
  const result = useMemo(() => {
    if (!text) {
      return {
        text: "",
        removedUrls: [],
        removedConfidences: 0,
        removedTimestamps: 0,
        wasScrubbed: false,
      };
    }
    
    // If artifacts haven't loaded yet, return original text
    // (we'll re-scrub when artifacts load)
    if (!artifacts) {
      return {
        text,
        removedUrls: [],
        removedConfidences: 0,
        removedTimestamps: 0,
        wasScrubbed: false,
      };
    }
    
    return scrubUnverifiedCitations(text, allowedUrls, options);
  }, [text, allowedUrls, options, artifacts]);
  
  return {
    ...result,
    isLoading: artifacts === undefined,
  };
}

/**
 * Simpler hook that just returns scrubbed text
 */
export function useScrubbedText(
  text: string | undefined,
  runId: string | undefined,
  options: ScrubOptions = {}
): string {
  const { text: scrubbedText } = useScrubCitations(text, runId, options);
  return scrubbedText;
}

/**
 * Hook to check if text has unverified citations
 */
export function useHasUnverifiedCitations(
  text: string | undefined,
  runId: string | undefined
): { hasUnverified: boolean; count: number; isLoading: boolean } {
  const { removedUrls, isLoading } = useScrubCitations(text, runId);
  
  return {
    hasUnverified: removedUrls.length > 0,
    count: removedUrls.length,
    isLoading,
  };
}
