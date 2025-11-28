// shared/artifactExtractors.ts
// Pure extraction functions - no Convex imports
// Returns RawArtifact[] (server computes IDs, rev, flags)

import type { RawArtifact, ArtifactKind, ArtifactProvider } from "./artifacts";
import { classifyProvider, classifyKind } from "./artifacts";

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXTRACTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract artifacts from any tool result
 * Returns [] for tools that don't produce artifacts
 */
export function extractArtifacts(toolName: string, result: unknown): RawArtifact[] {
  if (typeof result !== "string") return [];
  
  const text = result;
  const artifacts: RawArtifact[] = [];
  
  // Try tool-specific extraction first
  switch (toolName) {
    case "linkupSearch":
      artifacts.push(...extractFromLinkupSearch(text));
      break;
    case "youtubeSearch":
      artifacts.push(...extractFromYoutubeSearch(text));
      break;
    case "searchSecFilings":
    case "downloadSecFiling":
      artifacts.push(...extractFromSecTools(text));
      break;
    case "enrichCompanyDossier":
    case "enrichFounderInfo":
      artifacts.push(...extractFromEnrichmentTools(text));
      break;
    default:
      // Fallback: scan for URLs in any tool result
      artifacts.push(...extractUrlsFromText(text));
  }
  
  return dedupeRawArtifacts(artifacts);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL-SPECIFIC EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract from linkupSearch results
 * Looks for IMAGE_DATA and SOURCE_GALLERY_DATA markers
 */
function extractFromLinkupSearch(text: string): RawArtifact[] {
  const artifacts: RawArtifact[] = [];
  
  // Extract IMAGE_DATA
  const imageMatch = text.match(/<!--\s*IMAGE_DATA\s*\n([\s\S]*?)\n\s*-->/);
  if (imageMatch) {
    try {
      const images = JSON.parse(imageMatch[1]);
      if (Array.isArray(images)) {
        for (const img of images) {
          if (img.url) {
            artifacts.push({
              url: img.url,
              title: img.name || img.title || "Image",
              thumbnail: img.thumbnail || img.url,
              kind: "image",
              provider: classifyProvider(img.url),
            });
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }
  
  // Extract SOURCE_GALLERY_DATA
  const sourceMatch = text.match(/<!--\s*SOURCE_GALLERY_DATA\s*\n([\s\S]*?)\n\s*-->/);
  if (sourceMatch) {
    try {
      const sources = JSON.parse(sourceMatch[1]);
      if (Array.isArray(sources)) {
        for (const src of sources) {
          if (src.url) {
            artifacts.push({
              url: src.url,
              title: src.title || src.name || "Source",
              snippet: src.description || src.snippet,
              kind: classifyKind(src.url),
              provider: classifyProvider(src.url),
            });
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }
  
  // Also scan for markdown links as fallback
  artifacts.push(...extractMarkdownLinks(text));
  
  return artifacts;
}

/**
 * Extract from youtubeSearch results
 * Looks for YOUTUBE_GALLERY_DATA marker
 */
function extractFromYoutubeSearch(text: string): RawArtifact[] {
  const artifacts: RawArtifact[] = [];
  
  // Extract YOUTUBE_GALLERY_DATA
  const youtubeMatch = text.match(/<!--\s*YOUTUBE_GALLERY_DATA\s*\n([\s\S]*?)\n\s*-->/);
  if (youtubeMatch) {
    try {
      const videos = JSON.parse(youtubeMatch[1]);
      if (Array.isArray(videos)) {
        for (const video of videos) {
          const videoId = video.videoId || video.id;
          const url = video.url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null);
          if (url) {
            artifacts.push({
              url,
              title: video.title || "YouTube Video",
              snippet: video.description,
              thumbnail: video.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : undefined),
              kind: "video",
              provider: "youtube",
            });
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }
  
  // Also look for YouTube URLs in text
  const youtubeUrls = text.matchAll(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g);
  for (const match of youtubeUrls) {
    const videoId = match[1];
    artifacts.push({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: "YouTube Video",
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      kind: "video",
      provider: "youtube",
    });
  }
  
  return artifacts;
}

/**
 * Extract from SEC filing tools
 * Looks for SEC_FILINGS_DATA and COMPANY_SELECTION_DATA markers
 */
function extractFromSecTools(text: string): RawArtifact[] {
  const artifacts: RawArtifact[] = [];
  
  // Extract SEC_FILINGS_DATA
  const filingsMatch = text.match(/<!--\s*SEC_FILINGS_DATA\s*\n([\s\S]*?)\n\s*-->/);
  if (filingsMatch) {
    try {
      const filings = JSON.parse(filingsMatch[1]);
      if (Array.isArray(filings)) {
        for (const filing of filings) {
          if (filing.url) {
            artifacts.push({
              url: filing.url,
              title: filing.formType 
                ? `${filing.formType} - ${filing.companyName || "SEC Filing"}`
                : filing.title || "SEC Filing",
              snippet: filing.description || `Filed: ${filing.filedDate || "Unknown date"}`,
              kind: "sec",
              provider: "sec",
            });
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }
  
  // Extract COMPANY_SELECTION_DATA
  const companyMatch = text.match(/<!--\s*COMPANY_SELECTION_DATA\s*\n([\s\S]*?)\n\s*-->/);
  if (companyMatch) {
    try {
      const companies = JSON.parse(companyMatch[1]);
      if (Array.isArray(companies)) {
        for (const company of companies) {
          if (company.cik) {
            artifacts.push({
              url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}`,
              title: company.name || `CIK ${company.cik}`,
              snippet: company.ticker ? `Ticker: ${company.ticker}` : undefined,
              kind: "company",
              provider: "sec",
            });
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }
  
  // Scan for SEC EDGAR URLs
  const secUrls = text.matchAll(/https?:\/\/(?:www\.)?sec\.gov\/[^\s)"']+/g);
  for (const match of secUrls) {
    artifacts.push({
      url: match[0],
      title: "SEC Filing",
      kind: "sec",
      provider: "sec",
    });
  }
  
  return artifacts;
}

/**
 * Extract from enrichment tools (company/founder research)
 */
function extractFromEnrichmentTools(text: string): RawArtifact[] {
  const artifacts: RawArtifact[] = [];
  
  // Extract PERSON_DATA
  const personMatch = text.match(/<!--\s*PERSON_DATA\s*\n([\s\S]*?)\n\s*-->/);
  if (personMatch) {
    try {
      const people = JSON.parse(personMatch[1]);
      if (Array.isArray(people)) {
        for (const person of people) {
          if (person.linkedinUrl || person.url) {
            artifacts.push({
              url: person.linkedinUrl || person.url,
              title: person.name || "Person",
              snippet: person.title || person.role,
              thumbnail: person.imageUrl,
              kind: "person",
              provider: person.linkedinUrl ? "linkedin" : classifyProvider(person.url || ""),
            });
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }
  
  // Extract COMPANY_DATA
  const companyMatch = text.match(/<!--\s*COMPANY_DATA\s*\n([\s\S]*?)\n\s*-->/);
  if (companyMatch) {
    try {
      const companies = JSON.parse(companyMatch[1]);
      if (Array.isArray(companies)) {
        for (const company of companies) {
          if (company.url || company.website) {
            artifacts.push({
              url: company.url || company.website,
              title: company.name || "Company",
              snippet: company.description,
              thumbnail: company.logoUrl,
              kind: "company",
              provider: classifyProvider(company.url || company.website || ""),
            });
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }
  
  // Fallback: extract markdown links
  artifacts.push(...extractMarkdownLinks(text));
  
  return artifacts;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract markdown-style links [title](url)
 */
function extractMarkdownLinks(text: string): RawArtifact[] {
  const artifacts: RawArtifact[] = [];
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  
  for (const match of text.matchAll(linkRegex)) {
    const [, title, url] = match;
    // Skip common non-artifact links
    if (url.includes("javascript:") || url.includes("mailto:")) continue;
    
    artifacts.push({
      url,
      title: title || "Link",
      kind: classifyKind(url),
      provider: classifyProvider(url),
    });
  }
  
  return artifacts;
}

/**
 * Extract plain URLs from text (fallback)
 */
function extractUrlsFromText(text: string): RawArtifact[] {
  const artifacts: RawArtifact[] = [];
  
  // Match URLs not already in markdown format
  const urlRegex = /(?<!\]\()https?:\/\/[^\s)"'<>]+/g;
  
  for (const match of text.matchAll(urlRegex)) {
    const url = match[0].replace(/[.,;:!?]+$/, ""); // Remove trailing punctuation
    
    // Skip common non-content URLs
    if (url.includes("localhost") || url.includes("127.0.0.1")) continue;
    if (url.includes("api.") && !url.includes("sec.gov")) continue;
    
    artifacts.push({
      url,
      title: "Source",
      kind: classifyKind(url),
      provider: classifyProvider(url),
    });
  }
  
  return artifacts;
}

/**
 * Dedupe raw artifacts by URL
 */
function dedupeRawArtifacts(artifacts: RawArtifact[]): RawArtifact[] {
  const seen = new Set<string>();
  return artifacts.filter(a => {
    const key = a.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
