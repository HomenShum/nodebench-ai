// src/components/FastAgentPanel/utils/mediaExtractor.ts
// Utility to extract media (videos, documents, images) from text content

import type { YouTubeVideo, SECDocument } from '../MediaGallery';

export interface ExtractedMedia {
  youtubeVideos: YouTubeVideo[];
  secDocuments: SECDocument[];
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
    images: extractImages(text),
  };
}

/**
 * Extract YouTube videos from HTML comment markers
 * Format: <!-- YOUTUBE_GALLERY_DATA\n[...]\n-->
 */
function extractYouTubeVideos(text: string): YouTubeVideo[] {
  const youtubeMatch = text.match(/<!-- YOUTUBE_GALLERY_DATA\n([\s\S]*?)\n-->/);
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
  const secMatch = text.match(/<!-- SEC_GALLERY_DATA\n([\s\S]*?)\n-->/);
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
    .replace(/<!-- YOUTUBE_GALLERY_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/<!-- SEC_GALLERY_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/<!-- COMPANY_SELECTION_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/<!-- PEOPLE_SELECTION_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/<!-- EVENT_SELECTION_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/<!-- NEWS_SELECTION_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/## Images\s*\n*/g, ''); // Remove "## Images" header
}

/**
 * Check if text contains any media
 */
export function hasMedia(media: ExtractedMedia): boolean {
  return (
    media.youtubeVideos.length > 0 ||
    media.secDocuments.length > 0 ||
    media.images.length > 0
  );
}

