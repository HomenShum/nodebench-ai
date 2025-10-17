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
 * Extract YouTube videos from HTML comment markers OR plain text format
 * Format 1: <!-- YOUTUBE_GALLERY_DATA\n[...]\n-->
 * Format 2: Plain text with "Video ID: xxx" and "YouTube: https://..." and "Thumbnail: https://..."
 */
function extractYouTubeVideos(text: string): YouTubeVideo[] {
  // Try HTML comment marker first
  const youtubeMatch = text.match(/<!-- YOUTUBE_GALLERY_DATA\s*([\s\S]*?)\s*-->/);
  if (youtubeMatch) {
    try {
      const videos = JSON.parse(youtubeMatch[1]);
      return Array.isArray(videos) ? videos : [];
    } catch (error) {
      console.warn('Failed to parse YouTube gallery data:', error);
    }
  }

  // Fallback: Parse plain text format (when agent synthesizes response)
  // Look for patterns like:
  // - Video ID: d5EltXhbcfA
  // - YouTube: https://www.youtube.com/watch?v=d5EltXhbcfA
  // - Thumbnail: https://i.ytimg.com/vi/d5EltXhbcfA/mqdefault.jpg
  // - Channel: AI Engineer
  // - Title: Building and evaluating AI Agents
  const videos: YouTubeVideo[] = [];

  // Match video blocks (numbered list items with video details)
  const videoBlockRegex = /(?:^|\n)\d+\.\s*(?:Title:\s*)?(.*?)(?:\n|$)[\s\S]*?(?:Channel:\s*)(.*?)(?:\n|$)[\s\S]*?(?:YouTube:\s*)(https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+))[\s\S]*?(?:Video ID:\s*)([a-zA-Z0-9_-]+)[\s\S]*?(?:Thumbnail:\s*)(https:\/\/i\.ytimg\.com\/vi\/([a-zA-Z0-9_-]+)\/[^)\s]+)/g;

  let match;
  while ((match = videoBlockRegex.exec(text)) !== null) {
    const [, title, channel, url, videoId1, videoId2, thumbnail, videoId3] = match;
    const videoId = videoId1 || videoId2 || videoId3;

    if (videoId && title && channel) {
      videos.push({
        title: title.trim(),
        channel: channel.trim(),
        url: url.trim(),
        videoId: videoId.trim(),
        thumbnail: thumbnail?.trim() || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        description: '', // Not available in plain text format
      });
    }
  }

  console.log('[mediaExtractor] Extracted', videos.length, 'videos from plain text');
  return videos;
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

  const images = imageMatches
    .map(match => {
      const urlMatch = match.match(/\((.*?)\)/);
      const altMatch = match.match(/!\[(.*?)\]/);
      return {
        url: urlMatch?.[1] || '',
        alt: altMatch?.[1] || 'Image'
      };
    })
    .filter(img => img.url && img.url.trim().length > 0); // Remove invalid entries

  if (images.length > 0) {
    console.log('[mediaExtractor] Extracted', images.length, 'images from markdown');
  }

  return images;
}

/**
 * Remove media markers from text to avoid duplicate display
 * Removes HTML comment markers, "## Images" headers, and image markdown
 */
export function removeMediaMarkersFromText(text: string): string {
  let cleaned = text
    .replace(/<!-- YOUTUBE_GALLERY_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- SEC_GALLERY_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- SOURCE_GALLERY_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- PROFILE_GALLERY_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- COMPANY_SELECTION_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- PEOPLE_SELECTION_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- EVENT_SELECTION_DATA\s*[\s\S]*?\s*-->\s*/g, '')
    .replace(/<!-- NEWS_SELECTION_DATA\s*[\s\S]*?\s*-->\s*/g, '');

  // Remove "## Images" section entirely (header + all images in that section)
  // This regex matches "## Images" followed by any content until the next heading or end
  // It captures the header, newlines, and all markdown images that follow
  cleaned = cleaned.replace(/## Images\s*\n+(?:!\[.*?\]\(.*?\)\s*)+/g, '');

  // Also remove any standalone "## Images" headers that might remain
  cleaned = cleaned.replace(/## Images\s*\n*/g, '');

  return cleaned;
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

