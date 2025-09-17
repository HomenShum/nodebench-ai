import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface NodeEditPopoverProps {
  documentId: Id<"documents">;
  nodeId: string;
  isVisible: boolean;
  position: { x: number; y: number };
}

export function NodeEditPopover({ documentId, nodeId, isVisible, position }: NodeEditPopoverProps) {
  const nodeEditInfo = useQuery(api.documents.getNodeEditInfo, {
    documentId,
    nodeId,
  });
  
  const user = useQuery(
    api.documents.getUserById,
    nodeEditInfo?.editedBy ? { userId: nodeEditInfo.editedBy } : "skip"
  );

  if (!isVisible || !nodeEditInfo) {
    return null;
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div
      className="fixed z-50 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-lg p-3 max-w-xs pointer-events-none"
      style={{
        left: position.x,
        top: position.y - 10,
        transform: 'translateY(-100%)',
      }}
    >
      <div className="flex flex-col gap-1.5">
        <div className="text-xs font-medium text-[var(--text-primary)]">
          Last edited
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="text-xs text-[var(--text-secondary)]">
            <span className="font-medium">
              {user?.name || 'Unknown User'}
            </span>
            <span className="text-[var(--text-muted)] ml-1">
              ({nodeEditInfo.editedBy.slice(-8)})
            </span>
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {formatTime(nodeEditInfo.editedAt)}
          </div>
          {nodeEditInfo.content && (
            <div className="text-xs text-[var(--text-muted)] italic mt-1 truncate">
              "{nodeEditInfo.content.slice(0, 50)}..."
            </div>
          )}
        </div>
      </div>
      
      {/* Tooltip arrow */}
      <div 
        className="absolute left-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[var(--border-color)]"
        style={{ transform: 'translateX(-50%)' }}
      />
    </div>
  );
}
