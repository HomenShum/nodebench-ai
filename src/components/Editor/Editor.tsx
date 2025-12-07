import React from "react";
import { Id } from "../../../convex/_generated/dataModel";
import UnifiedEditor, { type EditorMode } from "@features/editor/components/UnifiedEditor";
import { ErrorBoundary } from "@shared/components/ErrorBoundary";
import "./editor-blocks.css";

interface EditorProps {
  documentId: Id<"documents">;
  isGridMode?: boolean;
  isFullscreen?: boolean;
  // Optional: editing mode for UnifiedEditor
  mode?: EditorMode;
  // Whether editing is allowed (owner or public-edit). Defaults to true.
  editable?: boolean;
}

/**
 * Editor component - wraps UnifiedEditor (BlockNote/ProseMirror) with error boundary.
 * This component provides a consistent API for document editing across the application.
 */
export function Editor({ documentId, isGridMode, isFullscreen, mode, editable }: EditorProps) {
  return (
    <ErrorBoundary title="Failed to load editor">
      <UnifiedEditor
        documentId={documentId as any}
        mode={mode}
        isGridMode={isGridMode}
        isFullscreen={isFullscreen}
        editable={editable}
      />
    </ErrorBoundary>
  );
}
