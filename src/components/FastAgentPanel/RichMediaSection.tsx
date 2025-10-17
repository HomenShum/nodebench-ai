// src/components/FastAgentPanel/RichMediaSection.tsx
// Polished media display section for videos, sources, profiles, and images

import React from 'react';
import { VideoCarousel } from './VideoCard';
import { SourceGrid, secDocumentToSource } from './SourceCard';
import { ProfileGrid } from './ProfileCard';
import type { YouTubeVideo, SECDocument } from './MediaGallery';
import type { ExtractedMedia } from './utils/mediaExtractor';

interface RichMediaSectionProps {
  media: ExtractedMedia;
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
 */
export function RichMediaSection({ media, showCitations = false }: RichMediaSectionProps) {
  const { youtubeVideos = [], secDocuments = [], webSources = [], profiles = [], images = [] } = media;

  // Don't render if there's no media
  const hasMedia = youtubeVideos.length > 0 || secDocuments.length > 0 || webSources.length > 0 || profiles.length > 0 || images.length > 0;
  if (!hasMedia) return null;

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

