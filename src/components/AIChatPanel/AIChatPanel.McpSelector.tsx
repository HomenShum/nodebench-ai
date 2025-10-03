import React from 'react';
import { Server as ServerIcon } from 'lucide-react';
import { Id } from '../../../convex/_generated/dataModel';

interface McpServer {
  _id: Id<'mcpServers'>;
  name: string;
  description?: string;
}

interface McpSelectorProps {
  servers: McpServer[];
  mcpSessionId: Id<'mcpServers'> | null;
  onSelectServer: (serverId: Id<'mcpServers'> | null) => void;
  showMcpPanel: boolean;
  onToggleMcpPanel?: () => void;
  toolsCount: number;
  isLoading: boolean;
}

export const AIChatPanelMcpSelector: React.FC<McpSelectorProps> = ({
  servers,
  mcpSessionId,
  onSelectServer,
  showMcpPanel,
  onToggleMcpPanel,
  toolsCount,
  isLoading,
}) => {
  const selectServer = (serverId: Id<'mcpServers'> | null) => {
    if (mcpSessionId === serverId) {
      onSelectServer(null);
    } else {
      onSelectServer(serverId);
    }
  };

  const selectedServer = servers.find(s => s._id === mcpSessionId);

  return (
    <div className="flex items-center gap-2">
      {/* Compact MCP Server Selector */}
      {servers.length > 0 ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">MCP:</span>
          <select
            value={mcpSessionId || ''}
            onChange={(e) => onSelectServer(e.target.value ? e.target.value as Id<'mcpServers'> : null)}
            className="px-2 py-1 text-xs border border-[var(--border-color)] rounded bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            disabled={isLoading}
          >
            <option value="">None</option>
            {servers.map((server) => (
              <option key={server._id} value={server._id}>
                {server.name}
              </option>
            ))}
          </select>
          {selectedServer && (
            <span className="text-xs text-[var(--text-muted)]">
              ({toolsCount} tool{toolsCount !== 1 ? 's' : ''})
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={() => selectServer(null)}
            className={`group relative w-6 h-6 rounded border-2 transition-all duration-200 hover:scale-105 ${
              !mcpSessionId
                ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] shadow-sm scale-105'
                : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)]'
            }`}
            title="No MCP server - Click to deselect"
          >
            <ServerIcon
              className={`transition-all duration-200 ${
                !mcpSessionId
                  ? 'h-3 w-3 text-white m-auto'
                  : 'h-2.5 w-2.5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] m-auto'
              }`}
            />
            {!mcpSessionId && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-in zoom-in-0 duration-200" />
            )}
          </button>
        </div>
      )}

      {/* MCP Panel Toggle */}
      {onToggleMcpPanel && (
        <button
          onClick={onToggleMcpPanel}
          className={`px-2 py-1 text-xs rounded border transition-colors ${
            showMcpPanel
              ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)]'
              : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
          title={`${showMcpPanel ? 'Hide' : 'Show'} MCP panel`}
          disabled={isLoading}
        >
          <span className="inline-flex items-center gap-1">
            <ServerIcon className="h-3 w-3" />
            <span>MCP</span>
            {toolsCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)] px-1 py-[1px] text-[10px] leading-4">
                {toolsCount}
              </span>
            )}
          </span>
        </button>
      )}
    </div>
  );
};

