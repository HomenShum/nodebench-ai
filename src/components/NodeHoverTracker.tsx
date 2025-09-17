import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { NodeEditPopover } from "./NodeEditPopover";

interface NodeHoverTrackerProps {
  documentId: Id<"documents">;
  editorContainer: HTMLElement | null;
}

interface HoverState {
  nodeId: string;
  position: { x: number; y: number };
  content: string;
}

export function NodeHoverTracker({ documentId, editorContainer }: NodeHoverTrackerProps) {
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const trackNodeEdit = useMutation(api.documents.trackNodeEdit);

  useEffect(() => {
    if (!editorContainer) return;

    let hoverTimeout: NodeJS.Timeout | null = null;

    const handleMouseEnter = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Find the closest BlockNote block element
      const blockElement = target.closest('[data-node-type]') as HTMLElement;
      if (!blockElement) return;

      const nodeType = blockElement.getAttribute('data-node-type');
      const nodeId = blockElement.getAttribute('data-id') || blockElement.id || `${nodeType}-${Date.now()}`;
      
      // Get the text content for tracking
      const content = blockElement.textContent || blockElement.innerText || '';
      
      // Clear any existing timeout
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }

      // Set a delay before showing the popover
      hoverTimeout = setTimeout(() => {
        const rect = blockElement.getBoundingClientRect();
        setHoverState({
          nodeId,
          position: {
            x: rect.left + rect.width / 2,
            y: rect.top,
          },
          content: content.slice(0, 100),
        });
      }, 800); // 800ms delay before showing hover
    };

    const handleMouseLeave = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const blockElement = target.closest('[data-node-type]');
      
      if (blockElement) {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          hoverTimeout = null;
        }
        setHoverState(null);
      }
    };

    // Track when nodes are edited (on input events)
    const handleInput = (event: Event) => {
      const target = event.target as HTMLElement;
      const blockElement = target.closest('[data-node-type]') as HTMLElement;
      
      if (!blockElement) return;

      const nodeType = blockElement.getAttribute('data-node-type');
      const nodeId = blockElement.getAttribute('data-id') || blockElement.id || `${nodeType}-${Date.now()}`;
      const content = blockElement.textContent || blockElement.innerText || '';

      // Track the edit with a debounce (fire-and-forget)
      trackNodeEdit({
        documentId,
        nodeId,
        content: content.slice(0, 200), // First 200 chars
      }).catch((error) => {
        console.warn('Failed to track node edit:', error);
      });
    };

    // Add event listeners with capture to catch events on child elements
    editorContainer.addEventListener('mouseenter', handleMouseEnter, true);
    editorContainer.addEventListener('mouseleave', handleMouseLeave, true);
    editorContainer.addEventListener('input', handleInput, true);

    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      editorContainer.removeEventListener('mouseenter', handleMouseEnter, true);
      editorContainer.removeEventListener('mouseleave', handleMouseLeave, true);
      editorContainer.removeEventListener('input', handleInput, true);
    };
  }, [editorContainer, documentId, trackNodeEdit]);

  return (
    <NodeEditPopover
      documentId={documentId}
      nodeId={hoverState?.nodeId || ''}
      isVisible={!!hoverState}
      position={hoverState?.position || { x: 0, y: 0 }}
    />
  );
}
