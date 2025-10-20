// src/components/FastAgentPanel/DocumentActionCard.tsx
// Card component for displaying created/updated documents in Fast Agent Panel

import React from 'react';
import { FileText, ExternalLink, CheckCircle2, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DocumentAction {
  action: 'created' | 'updated';
  documentId: string;
  title: string;
  isPublic?: boolean;
  updatedFields?: string[];
}

interface DocumentActionCardProps {
  document: DocumentAction;
  className?: string;
  onDocumentSelect?: (documentId: string) => void;
}

/**
 * DocumentActionCard - Displays a clickable card for documents created/updated by the agent
 * Allows users to quickly navigate to the document
 */
export function DocumentActionCard({ document, className, onDocumentSelect }: DocumentActionCardProps) {
  const isCreated = document.action === 'created';

  const handleClick = () => {
    // Use custom event dispatch pattern used throughout the app
    if (onDocumentSelect) {
      onDocumentSelect(document.documentId);
    } else {
      // Fallback: dispatch custom event for document selection
      try {
        window.dispatchEvent(
          new CustomEvent('nodebench:openDocument', {
            detail: { documentId: document.documentId }
          })
        );
      } catch (err) {
        console.error('[DocumentActionCard] Failed to navigate:', err);
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 p-4 rounded-lg border transition-all",
        "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        isCreated
          ? "bg-gradient-to-br from-green-50 to-white border-green-200 hover:border-green-300 focus:ring-green-500"
          : "bg-gradient-to-br from-blue-50 to-white border-blue-200 hover:border-blue-300 focus:ring-blue-500",
        className
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
        isCreated ? "bg-green-100" : "bg-blue-100"
      )}>
        {isCreated ? (
          <CheckCircle2 className={cn("h-5 w-5", "text-green-600")} />
        ) : (
          <Edit3 className={cn("h-5 w-5", "text-blue-600")} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {document.title}
          </h3>
        </div>
        
        <p className="text-xs text-gray-600 mb-2">
          {isCreated ? 'Document created' : 'Document updated'}
          {document.updatedFields && document.updatedFields.length > 0 && (
            <span className="text-gray-500">
              {' '}• {document.updatedFields.join(', ')}
            </span>
          )}
        </p>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {document.isPublic && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
              Public
            </span>
          )}
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
            isCreated
              ? "bg-green-100 text-green-700 border-green-200"
              : "bg-blue-100 text-blue-700 border-blue-200"
          )}>
            {isCreated ? 'New' : 'Modified'}
          </span>
        </div>
      </div>

      {/* Arrow icon */}
      <div className="flex-shrink-0">
        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
      </div>
    </button>
  );
}

interface DocumentActionGridProps {
  documents: DocumentAction[];
  title?: string;
  className?: string;
  onDocumentSelect?: (documentId: string) => void;
}

/**
 * DocumentActionGrid - Grid layout for multiple document action cards
 */
export function DocumentActionGrid({ documents, title = "Documents", className, onDocumentSelect }: DocumentActionGridProps) {
  if (documents.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-700">
          {title}
        </h3>
        <span className="text-xs text-gray-500">
          ({documents.length})
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {documents.map((doc, idx) => (
          <DocumentActionCard
            key={`${doc.documentId}-${idx}`}
            document={doc}
            onDocumentSelect={onDocumentSelect}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Extract document actions from tool result text
 */
export function extractDocumentActions(text: string): DocumentAction[] {
  const documents: DocumentAction[] = [];
  
  // Match all DOCUMENT_ACTION_DATA markers
  const regex = /<!-- DOCUMENT_ACTION_DATA\n([\s\S]*?)\n-->/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data.documentId && data.title) {
        documents.push(data);
      }
    } catch (error) {
      console.error('[extractDocumentActions] Failed to parse document action data:', error);
    }
  }
  
  return documents;
}

/**
 * Remove document action markers from text
 */
export function removeDocumentActionMarkers(text: string): string {
  return text.replace(/<!-- DOCUMENT_ACTION_DATA\n[\s\S]*?\n-->\n*/g, '');
}

