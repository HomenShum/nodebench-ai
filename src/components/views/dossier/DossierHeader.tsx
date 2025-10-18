// src/components/views/dossier/DossierHeader.tsx
// Unified metadata header for dossier documents

import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import {
  Globe,
  Lock,
  Star,
  Share2,
  Video,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Edit2,
  Check,
  X,
} from 'lucide-react';

interface DossierHeaderProps {
  documentId: Id<'documents'>;
  title: string;
  isPublic: boolean;
  isFavorite?: boolean;
  tags?: string[];
  videoCount: number;
  imageCount: number;
  documentCount: number;
  messageCount?: number;
}

/**
 * DossierHeader - Metadata header for dossier documents
 * Shows title, status, asset counts, tags, and actions
 */
export function DossierHeader({
  documentId,
  title,
  isPublic,
  isFavorite = false,
  tags = [],
  videoCount,
  imageCount,
  documentCount,
  messageCount = 0,
}: DossierHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const updateDocument = useMutation(api.documents.update);
  const toggleFavorite = useMutation(api.documents.toggleFavorite);

  const handleSaveTitle = async () => {
    if (editedTitle.trim() && editedTitle !== title) {
      await updateDocument({ id: documentId, title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(title);
    setIsEditingTitle(false);
  };

  const handleToggleFavorite = async () => {
    await toggleFavorite({ id: documentId });
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share dossier:', documentId);
  };

  const handleAISummary = () => {
    // TODO: Implement AI summary functionality
    console.log('Generate AI summary for:', documentId);
  };

  return (
    <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-6 py-4">
      {/* Top row: Title and actions */}
      <div className="flex items-center justify-between mb-3">
        {/* Title */}
        <div className="flex-1 min-w-0 mr-4">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="flex-1 text-xl font-semibold px-2 py-1 border border-[var(--accent-primary)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                autoFocus
              />
              <button
                onClick={handleSaveTitle}
                className="p-1.5 hover:bg-[var(--bg-hover)] rounded transition-colors"
                title="Save"
              >
                <Check className="h-4 w-4 text-green-600" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1.5 hover:bg-[var(--bg-hover)] rounded transition-colors"
                title="Cancel"
              >
                <X className="h-4 w-4 text-red-600" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-xl font-semibold text-[var(--text-primary)] truncate">
                {title}
              </h1>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--bg-hover)] rounded transition-all"
                title="Edit title"
              >
                <Edit2 className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-lg border transition-colors ${
              isFavorite
                ? 'bg-yellow-50 border-yellow-300 text-yellow-600 hover:bg-yellow-100'
                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={handleShare}
            className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            title="Share dossier"
          >
            <Share2 className="h-4 w-4" />
          </button>

          <button
            onClick={handleAISummary}
            className="px-3 py-2 rounded-lg border border-[var(--accent-primary)] bg-[var(--accent-primary-bg)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors flex items-center gap-2"
            title="Generate AI summary"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI Summary</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Status and asset counts */}
      <div className="flex items-center justify-between">
        {/* Status indicators */}
        <div className="flex items-center gap-4">
          {/* Public/Private */}
          <div className="flex items-center gap-1.5">
            {isPublic ? (
              <>
                <Globe className="h-4 w-4 text-green-600" />
                <span className="text-sm text-[var(--text-secondary)]">Public</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 text-[var(--text-secondary)]" />
                <span className="text-sm text-[var(--text-secondary)]">Private</span>
              </>
            )}
          </div>

          {/* Asset counts */}
          <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            {messageCount > 0 && (
              <span>{messageCount} message{messageCount !== 1 ? 's' : ''}</span>
            )}
            {videoCount > 0 && (
              <span className="flex items-center gap-1">
                <Video className="h-3.5 w-3.5" />
                {videoCount}
              </span>
            )}
            {imageCount > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" />
                {imageCount}
              </span>
            )}
            {documentCount > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {documentCount}
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

