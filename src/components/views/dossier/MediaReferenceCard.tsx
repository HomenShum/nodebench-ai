// src/components/views/dossier/MediaReferenceCard.tsx
// Lightweight reference cards for the transcript that replace inline embeds

import React from 'react';
import { Video, Image as ImageIcon, FileText, ExternalLink } from 'lucide-react';

interface MediaReferenceCardProps {
  type: 'video' | 'image' | 'document';
  count: number;
  onClick?: () => void;
  className?: string;
}

/**
 * MediaReferenceCard - Lightweight card that replaces inline media embeds
 * Shows media type icon and count, clickable to highlight in right panel
 */
export function MediaReferenceCard({ type, count, onClick, className = '' }: MediaReferenceCardProps) {
  const config = getMediaConfig(type);

  return (
    <button
      onClick={onClick}
      className={`
        my-4 p-4 rounded-lg border-2 border-dashed
        bg-[var(--bg-secondary)] border-[var(--border-color)]
        hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary-bg)]
        transition-all duration-200
        flex items-center gap-3
        w-full text-left
        group
        ${className}
      `}
      title={`View ${count} ${config.label}${count !== 1 ? 's' : ''} in media gallery`}
    >
      {/* Icon */}
      <div className={`
        flex-shrink-0 w-10 h-10 rounded-lg
        flex items-center justify-center
        ${config.bgClass}
        group-hover:scale-110 transition-transform
      `}>
        <config.icon className={`h-5 w-5 ${config.iconClass}`} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--text-primary)]">
            {config.emoji} {count} {config.label}{count !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            added to Media Gallery
          </span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Click to view in right panel
        </p>
      </div>

      {/* Arrow indicator */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="h-4 w-4 text-[var(--accent-primary)]" />
      </div>
    </button>
  );
}

/**
 * Get configuration for each media type
 */
function getMediaConfig(type: 'video' | 'image' | 'document') {
  switch (type) {
    case 'video':
      return {
        icon: Video,
        emoji: '🎥',
        label: 'Video',
        bgClass: 'bg-red-50',
        iconClass: 'text-red-600',
      };
    case 'image':
      return {
        icon: ImageIcon,
        emoji: '🖼️',
        label: 'Image',
        bgClass: 'bg-blue-50',
        iconClass: 'text-blue-600',
      };
    case 'document':
      return {
        icon: FileText,
        emoji: '📄',
        label: 'Document',
        bgClass: 'bg-green-50',
        iconClass: 'text-green-600',
      };
  }
}

/**
 * Grouped media reference card for multiple media types in one block
 */
interface GroupedMediaReferenceProps {
  videos?: number;
  images?: number;
  documents?: number;
  onClick?: () => void;
  className?: string;
}

export function GroupedMediaReference({
  videos = 0,
  images = 0,
  documents = 0,
  onClick,
  className = '',
}: GroupedMediaReferenceProps) {
  const total = videos + images + documents;
  if (total === 0) return null;

  // If only one type, use single card
  if (videos > 0 && images === 0 && documents === 0) {
    return <MediaReferenceCard type="video" count={videos} onClick={onClick} className={className} />;
  }
  if (images > 0 && videos === 0 && documents === 0) {
    return <MediaReferenceCard type="image" count={images} onClick={onClick} className={className} />;
  }
  if (documents > 0 && videos === 0 && images === 0) {
    return <MediaReferenceCard type="document" count={documents} onClick={onClick} className={className} />;
  }

  // Multiple types - show grouped card
  return (
    <button
      onClick={onClick}
      className={`
        my-4 p-4 rounded-lg border-2 border-dashed
        bg-[var(--bg-secondary)] border-[var(--border-color)]
        hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary-bg)]
        transition-all duration-200
        w-full text-left
        group
        ${className}
      `}
      title="View media in gallery"
    >
      <div className="flex items-center gap-3">
        {/* Icon group */}
        <div className="flex-shrink-0 flex -space-x-2">
          {videos > 0 && (
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center border-2 border-white">
              <Video className="h-4 w-4 text-red-600" />
            </div>
          )}
          {images > 0 && (
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border-2 border-white">
              <ImageIcon className="h-4 w-4 text-blue-600" />
            </div>
          )}
          {documents > 0 && (
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center border-2 border-white">
              <FileText className="h-4 w-4 text-green-600" />
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {videos > 0 && (
              <span className="text-sm font-medium text-[var(--text-primary)]">
                🎥 {videos} Video{videos !== 1 ? 's' : ''}
              </span>
            )}
            {images > 0 && (
              <span className="text-sm font-medium text-[var(--text-primary)]">
                🖼️ {images} Image{images !== 1 ? 's' : ''}
              </span>
            )}
            {documents > 0 && (
              <span className="text-sm font-medium text-[var(--text-primary)]">
                📄 {documents} Document{documents !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Click to view in Media Gallery
          </p>
        </div>

        {/* Arrow indicator */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="h-4 w-4 text-[var(--accent-primary)]" />
        </div>
      </div>
    </button>
  );
}

