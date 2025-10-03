import React, { useRef, useState } from "react";
import { FileTypeIcon } from "../FileTypeIcon";
import { inferFileType, type FileType } from "../../lib/fileTypes";
import { X } from "lucide-react";

export interface ContextPillProps {
  id: string;
  title: string;
  type: 'document' | 'file';
  metadata: {
    createdAt?: number;
    nodeCount?: number;
    wordCount?: number;
    size?: number;
    mimeType?: string;
    analyzedAt?: number;
  };
  details?: string;
  onRemove: () => void;
}

export const ContextPill: React.FC<ContextPillProps> = ({ title, type, metadata, details, onRemove }) => {
  const [showPopover, setShowPopover] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const iconType: FileType = type === 'document'
    ? inferFileType({ name: title, isNodebenchDoc: true })
    : inferFileType({ name: title, mimeType: metadata?.mimeType });

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown date';
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="relative" ref={pillRef}>
      <div
        className="flex items-center gap-1 px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full text-xs border border-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/20 transition-colors cursor-pointer"
        onClick={() => setShowPopover(!showPopover)}
        title={`Click to view details for ${title}`}
      >
        <FileTypeIcon type={iconType} className="h-3 w-3" />
        <span className="truncate max-w-[80px]">{title}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-[var(--accent-primary)]/30 transition-colors"
          title="Remove from context"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      {showPopover && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowPopover(false)} />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileTypeIcon type={iconType} className="h-4 w-4" />
              <span className="font-medium text-sm text-gray-800">{title}</span>
            </div>

            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between"><span>Type:</span><span className="font-medium">{type === 'document' ? 'Document' : 'File'}</span></div>
              {metadata.createdAt && (<div className="flex justify-between"><span>Created:</span><span className="font-medium">{formatDate(metadata.createdAt)}</span></div>)}
              {type === 'document' && (
                <>
                  {metadata.nodeCount !== undefined && (<div className="flex justify-between"><span>Sections:</span><span className="font-medium">{metadata.nodeCount}</span></div>)}
                  {metadata.wordCount !== undefined && (<div className="flex justify-between"><span>Words:</span><span className="font-medium">{metadata.wordCount.toLocaleString()}</span></div>)}
                </>
              )}
              {type === 'file' && (
                <>
                  {metadata.size && (<div className="flex justify-between"><span>Size:</span><span className="font-medium">{formatBytes(metadata.size)}</span></div>)}
                  {metadata.mimeType && (<div className="flex justify-between"><span>Type:</span><span className="font-medium">{metadata.mimeType}</span></div>)}
                  {metadata.analyzedAt && (<div className="flex justify-between"><span>Analyzed:</span><span className="font-medium">{formatDate(metadata.analyzedAt)}</span></div>)}
                </>
              )}
            </div>
            {details && (<div className="mt-2 text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-auto">{details}</div>)}
            <div className="mt-3 pt-2 border-t border-gray-200">
              <button onClick={() => { onRemove(); setShowPopover(false); }} className="flex items-center gap-1 w-full px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors">
                <X className="h-3 w-3" />
                Remove from context
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

