// src/components/FastAgentPanel/RichMediaSection.tsx
// Polished media display section for videos, sources, profiles, and images

import React from 'react';
import { VideoCarousel } from './VideoCard';
import { SourceGrid, secDocumentToSource } from './SourceCard';
import { ProfileGrid } from './ProfileCard';
import type { YouTubeVideo, SECDocument } from './MediaGallery';
import type { ExtractedMedia } from './utils/mediaExtractor';

interface RichMediaSectionProps {
  media: ExtractedMedia | { toolMedia: ExtractedMedia; textMedia: ExtractedMedia };
  showCitations?: boolean;
}

/**
 * RichMediaSection - Displays extracted media in a polished, product-oriented format
 *
 * This component transforms raw agent output into a visually rich interface:
 * - Videos appear as interactive cards in a horizontal carousel
 * - Sources/documents appear as rich preview cards in a grid
 * - People/entities appear as profile cards in a grid
 * - Images appear in a responsive gallery
 *
 * This is the "presentation layer" that sits above the raw agent process.
 *
 * If media is separated (toolMedia + textMedia), shows two sections:
 * - "Media Found" - All media from tool results (comprehensive)
 * - "Referenced in Answer" - Only media mentioned in the final answer
 */
export function RichMediaSection({ media, showCitations = false }: RichMediaSectionProps) {
  // Check if media is separated or combined
  const isSeparated = 'toolMedia' in media && 'textMedia' in media;

  if (isSeparated) {
    const { toolMedia, textMedia } = media;

    // Check if we have any media at all
    const hasToolMedia = toolMedia.youtubeVideos.length > 0 || toolMedia.secDocuments.length > 0 ||
                         toolMedia.webSources.length > 0 || toolMedia.profiles.length > 0 || toolMedia.images.length > 0;
    const hasTextMedia = textMedia.youtubeVideos.length > 0 || textMedia.secDocuments.length > 0 ||
                         textMedia.webSources.length > 0 || textMedia.profiles.length > 0 || textMedia.images.length > 0;

    if (!hasToolMedia && !hasTextMedia) return null;

    // Check if text media is different from tool media (to avoid showing duplicates)
    const hasUniqueTextMedia =
      textMedia.youtubeVideos.length > 0 ||
      textMedia.secDocuments.length > 0 ||
      textMedia.webSources.length > 0 ||
      textMedia.profiles.length > 0 ||
      textMedia.images.length > 0;

    return (
      <div className="space-y-6">
        {/* Media from tool results (comprehensive - shows ALL media found) */}
        {hasToolMedia && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                📎 All Media Found by Agent
              </h3>
              <span className="text-xs text-gray-500">
                ({toolMedia.images.length} images, {toolMedia.youtubeVideos.length} videos, {toolMedia.webSources.length + toolMedia.secDocuments.length} sources, {toolMedia.profiles.length} profiles)
              </span>
            </div>
            <RichMediaContent media={toolMedia} showCitations={showCitations} />
          </div>
        )}

        {/* Media referenced in answer (only if different from tool results) */}
        {hasUniqueTextMedia && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                💬 Referenced in Final Answer
              </h3>
              <span className="text-xs text-gray-500">
                (Subset mentioned by agent)
              </span>
            </div>
            <RichMediaContent media={textMedia} showCitations={showCitations} />
          </div>
        )}
      </div>
    );
  }

  // Legacy: combined media (backward compatibility)
  const { youtubeVideos = [], secDocuments = [], webSources = [], profiles = [], images = [] } = media as ExtractedMedia;

  // Don't render if there's no media
  const hasMedia = youtubeVideos.length > 0 || secDocuments.length > 0 || webSources.length > 0 || profiles.length > 0 || images.length > 0;
  if (!hasMedia) return null;

  return <RichMediaContent media={media as ExtractedMedia} showCitations={showCitations} />;
}

/**
 * RichMediaContent - Renders the actual media content (videos, sources, profiles, images)
 */
function RichMediaContent({ media, showCitations }: { media: ExtractedMedia; showCitations: boolean }) {
  const { youtubeVideos = [], secDocuments = [], webSources = [], profiles = [], images = [] } = media;

  // Convert SEC documents to unified source format and combine with web sources
  const secSources = secDocuments.map(secDocumentToSource);
  const allSources = [...secSources, ...webSources];

  return (
    <div className="space-y-4 mb-4">
      {/* Video carousel */}
      {youtubeVideos.length > 0 && (
        <VideoCarousel videos={youtubeVideos} />
      )}

      {/* Source/document grid (includes both SEC documents and web sources) */}
      {allSources.length > 0 && (
        <SourceGrid
          sources={allSources}
          title="Sources & Documents"
          showCitations={showCitations}
        />
      )}

      {/* Profile grid (people/entities) */}
      {profiles.length > 0 && (
        <ProfileGrid
          profiles={profiles}
          title="People"
          showCitations={showCitations}
        />
      )}

      {/* Image carousel - horizontal scrolling gallery */}
      {images.length > 0 && (
        <div className="mb-4">
          {/* Section header */}
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Images
              <span className="text-xs font-normal text-gray-500 ml-2">({images.length})</span>
            </h3>
          </div>

          {/* Horizontal scrolling carousel */}
          <div className="relative">
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ scrollbarWidth: 'thin' }}>
              {images.map((img, idx) => (
                <a
                  key={idx}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 snap-start group relative rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-all hover:shadow-lg"
                  title={img.alt}
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="h-48 w-auto object-cover"
                    loading="lazy"
                  />
                  {/* Hover overlay with alt text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <p className="text-white text-xs line-clamp-2">{img.alt}</p>
                  </div>
                </a>
              ))}
            </div>
            {/* Scroll hint */}
            {images.length > 3 && (
              <div className="text-xs text-gray-400 text-center mt-1">
                ← Scroll to see all {images.length} images →
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

