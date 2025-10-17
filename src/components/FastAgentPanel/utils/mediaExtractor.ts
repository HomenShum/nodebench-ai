// src/components/FastAgentPanel/utils/mediaExtractor.ts
// Utility to extract media (videos, documents, images) from text content

import type { YouTubeVideo, SECDocument } from '../MediaGallery';

export interface WebSource {
  title: string;
  url: string;
  domain?: string;
  description?: string;
  favicon?: string;
  previewImage?: string;
}

export interface PersonProfile {
  name: string;
  profession?: string;
  organization?: string;
  location?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  additionalInfo?: string;
}

export interface ExtractedMedia {
  youtubeVideos: YouTubeVideo[];
  secDocuments: SECDocument[];
  webSources: WebSource[];
  profiles: PersonProfile[];
  images: Array<{ url: string; alt: string }>;
}

/**
 * Extract all media types from text content
 * Looks for HTML comment markers and markdown image syntax
 */
export function extractMediaFromText(text: string): ExtractedMedia {
  return {
    youtubeVideos: extractYouTubeVideos(text),
    secDocuments: extractSECDocuments(text),
    webSources: extractWebSources(text),
    profiles: extractProfiles(text),
    images: extractImages(text),
  };
}

/**
 * Extract YouTube videos from HTML comment markers
 * Format: <!-- YOUTUBE_GALLERY_DATA\n[...]\n-->
 */
function extractYouTubeVideos(text: string): YouTubeVideo[] {
  const youtubeMatch = text.match(/<!-- YOUTUBE_GALLERY_DATA\s*([\s\S]*?)\s*-->/);
  if (!youtubeMatch) return [];

  try {
    const videos = JSON.parse(youtubeMatch[1]);
    return Array.isArray(videos) ? videos : [];
  } catch (error) {
    console.warn('Failed to parse YouTube gallery data:', error);
    return [];
  }
}

/**
 * Extract SEC documents from HTML comment markers
 * Format: <!-- SEC_GALLERY_DATA\n[...]\n-->
 */
function extractSECDocuments(text: string): SECDocument[] {
  const secMatch = text.match(/<!-- SEC_GALLERY_DATA\s*([\s\S]*?)\s*-->/);
  if (!secMatch) return [];

  try {
    const documents = JSON.parse(secMatch[1]);
    return Array.isArray(documents) ? documents : [];
  } catch (error) {
    console.warn('Failed to parse SEC gallery data:', error);
    return [];
  }
}

/**
 * Extract web sources from HTML comment markers
 * Format: <!-- SOURCE_GALLERY_DATA\n[...]\n-->
 */
function extractWebSources(text: string): WebSource[] {
  const sourceMatch = text.match(/<!-- SOURCE_GALLERY_DATA\s*([\s\S]*?)\s*-->/);
  if (!sourceMatch) return [];

  try {
    const sources = JSON.parse(sourceMatch[1]);
    return Array.isArray(sources) ? sources : [];
  } catch (error) {
    console.warn('Failed to parse source gallery data:', error);
    return [];
  }
}

/**
 * Extract person profiles from HTML comment markers
 * Format: <!-- PROFILE_GALLERY_DATA\n[...]\n-->
 */
function extractProfiles(text: string): PersonProfile[] {
  const profileMatch = text.match(/<!-- PROFILE_GALLERY_DATA\s*([\s\S]*?)\s*-->/);
  if (!profileMatch) return [];

  try {
    const profiles = JSON.parse(profileMatch[1]);
    return Array.isArray(profiles) ? profiles : [];
  } catch (error) {
    console.warn('Failed to parse profile gallery data:', error);
    return [];
  }
}

/**
 * Extract images from markdown syntax
 * Format: ![alt text](url)
 */
function extractImages(text: string): Array<{ url: string; alt: string }> {
  // Extract markdown images: ![alt](url)
  const imageMatches = text.match(/!\[.*?\]\(.*?\)/g) || [];
  
  return imageMatches
    .map(match => {
      const urlMatch = match.match(/\((.*?)\)/);
      const altMatch = match.match(/!\[(.*?)\]/);
      return {
        url: urlMatch?.[1] || '',
        alt: altMatch?.[1] || 'Image'
      };
    })
    .filter(img => img.url && img.url.trim().length > 0); // Remove invalid entries
}

/**
 * Remove media markers from text to avoid duplicate display
 * Removes HTML comment markers and "## Images" headers
 */
export function removeMediaMarkersFromText(text: string): string {
  return text
    .replace(/<!-- YOUTUBE_GALLERY_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- SEC_GALLERY_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- SOURCE_GALLERY_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- PROFILE_GALLERY_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- COMPANY_SELECTION_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- PEOPLE_SELECTION_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- EVENT_SELECTION_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- NEWS_SELECTION_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/## Images\s*\n*/g, ''); // Remove "## Images" header
}

/**
 * Check if text contains any media
 */
export function hasMedia(media: ExtractedMedia): boolean {
  return (
    media.youtubeVideos.length > 0 ||
    media.secDocuments.length > 0 ||
    media.webSources.length > 0 ||
    media.profiles.length > 0 ||
    media.images.length > 0
  );
}

