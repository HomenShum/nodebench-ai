// src/components/FastAgentPanel/RichMediaSection.tsx
// Polished media display section for videos, sources, and images

import React from 'react';
import { VideoCarousel } from './VideoCard';
import { SourceGrid, secDocumentToSource } from './SourceCard';
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
 * - Images appear in a responsive gallery
 * 
 * This is the "presentation layer" that sits above the raw agent process.
 */
export function RichMediaSection({ media, showCitations = false }: RichMediaSectionProps) {
  const { youtubeVideos, secDocuments, images } = media;
  
  // Don't render if there's no media
  const hasMedia = youtubeVideos.length > 0 || secDocuments.length > 0 || images.length > 0;
  if (!hasMedia) return null;

  // Convert SEC documents to unified source format
  const sources = secDocuments.map(secDocumentToSource);

  return (
    <div className="space-y-4 mb-4">
      {/* Video carousel */}
      {youtubeVideos.length > 0 && (
        <VideoCarousel videos={youtubeVideos} />
      )}

      {/* Source/document grid */}
      {sources.length > 0 && (
        <SourceGrid 
          sources={sources} 
          title="Sources & Documents"
          showCitations={showCitations}
        />
      )}

      {/* Image gallery */}
      {images.length > 0 && (
        <div className="mb-4">
          {/* Section header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gray-200"></div>
            <h3 className="text-sm font-semibold text-gray-700">
              Images
              <span className="text-xs font-normal text-gray-500 ml-2">({images.length})</span>
            </h3>
            <div className="h-px flex-1 bg-gray-200"></div>
          </div>

          {/* Responsive image grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {images.map((img, idx) => (
              <a
                key={idx}
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 transition-all hover:shadow-md"
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

