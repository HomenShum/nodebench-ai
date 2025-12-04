/**
 * FastAgentPanel.ArtifactCard.tsx
 * Enhanced artifact card with "Save to Workspace" functionality
 * 
 * Features:
 * - Display generated artifacts (code, tables, documents)
 * - Save to Workspace button to persist as permanent documents
 * - Copy, download, and expand actions
 * - Visual feedback during save operation
 */

import React, { useState, useCallback } from 'react';
import { 
  FileText, 
  Code2, 
  Table2, 
  Download, 
  Copy, 
  Check, 
  FolderPlus,
  Loader2,
  ExternalLink,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';

export type ArtifactType = 'code' | 'table' | 'document' | 'markdown' | 'json' | 'csv';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string; // For code artifacts
  metadata?: Record<string, unknown>;
}

interface ArtifactCardProps {
  artifact: Artifact;
  className?: string;
  onExpand?: (artifact: Artifact) => void;
  onSaveComplete?: (documentId: string) => void;
}

const TYPE_ICONS: Record<ArtifactType, React.ReactNode> = {
  code: <Code2 className="w-4 h-4" />,
  table: <Table2 className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  markdown: <FileText className="w-4 h-4" />,
  json: <Code2 className="w-4 h-4" />,
  csv: <Table2 className="w-4 h-4" />,
};

const TYPE_COLORS: Record<ArtifactType, { bg: string; text: string; border: string }> = {
  code: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  table: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  document: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  markdown: { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-800' },
  json: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  csv: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
};

/**
 * ArtifactCard - Displays a generated artifact with save-to-workspace functionality
 */
export function ArtifactCard({
  artifact,
  className,
  onExpand,
  onSaveComplete,
}: ArtifactCardProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);

  const createDocument = useMutation(api.domains.documents.documents.create);

  const colors = TYPE_COLORS[artifact.type] || TYPE_COLORS.document;
  const icon = TYPE_ICONS[artifact.type] || TYPE_ICONS.document;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [artifact.content]);

  const handleDownload = useCallback(() => {
    const ext = artifact.type === 'code' ? (artifact.language || 'txt') : 
                artifact.type === 'json' ? 'json' :
                artifact.type === 'csv' ? 'csv' :
                artifact.type === 'markdown' ? 'md' : 'txt';
    
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/[^a-z0-9]/gi, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [artifact]);

  const handleSaveToWorkspace = useCallback(async () => {
    if (saving || saved) return;
    
    setSaving(true);
    try {
      const docId = await createDocument({
        title: artifact.title,
        content: artifact.content,
        type: artifact.type === 'code' ? 'code' : 
              artifact.type === 'markdown' ? 'note' : 'document',
        isPublic: false,
      });
      
      setSaved(true);
      setSavedDocId(docId);
      onSaveComplete?.(docId);
    } catch (err) {
      console.error('Failed to save artifact:', err);
    } finally {
      setSaving(false);
    }
  }, [artifact, createDocument, onSaveComplete, saving, saved]);

  const handleOpenDocument = useCallback(() => {
    if (savedDocId) {
      window.dispatchEvent(
        new CustomEvent('nodebench:openDocument', {
          detail: { documentId: savedDocId }
        })
      );
    }
  }, [savedDocId]);

  // Preview content (first few lines)
  const previewLines = artifact.content.split('\n').slice(0, 5);
  const hasMore = artifact.content.split('\n').length > 5;

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-all duration-200",
      "hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600",
      colors.border,
      className
    )}>
      {/* Header */}
      <div className={cn("px-3 py-2 flex items-center justify-between", colors.bg)}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={colors.text}>{icon}</span>
          <span className={cn("text-sm font-medium truncate", colors.text)}>
            {artifact.title}
          </span>
          {artifact.language && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/20 text-gray-600 dark:text-gray-400">
              {artifact.language}
            </span>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Copy */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
          
          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
            title="Download"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
          </button>
          
          {/* Expand */}
          {onExpand && (
            <button
              type="button"
              onClick={() => onExpand(artifact)}
              className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
              title="Expand"
            >
              <Maximize2 className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Content Preview */}
      <div className="px-3 py-2 bg-white dark:bg-gray-900">
        <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
          {previewLines.join('\n')}
          {hasMore && <span className="text-gray-400">...</span>}
        </pre>
      </div>

      {/* Save to Workspace Footer */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
        {saved ? (
          <button
            type="button"
            onClick={handleOpenDocument}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Saved! Open in Workspace
            <ExternalLink className="w-3 h-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSaveToWorkspace}
            disabled={saving}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              saving
                ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow"
            )}
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FolderPlus className="w-3.5 h-3.5" />
                Save to Workspace
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default ArtifactCard;

