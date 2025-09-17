import { useState, useCallback } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

export interface McpTool {
  name: string;
  description?: string;
  schema?: any;
}

export interface McpServer {
  _id: Id<"mcpServers">;
  name: string;
  url?: string;
}

export function useMcp() {
  const [serverId, setServerId] = useState<Id<"mcpServers"> | null>(null);
  const [invoking, setInvoking] = useState(false);

  // Convex mutations and actions
  const addMcpServer = useMutation(api.mcp.addMcpServer);
  const callTool = useAction(api.mcpClient.callMcpTool);
  
  // Get MCP servers and tools for current server
  const servers = useQuery(api.mcp.listMcpServers, {}) || [];
  const tools = useQuery(api.mcp.getMcpTools, serverId ? { serverId } : "skip") || [];

  const addServer = useCallback(async (url: string, name: string) => {
    try {
      // Just add the MCP server metadata to the database
      const newServerId = await addMcpServer({
        name,
        url,
      });
      
      setServerId(newServerId);
      return newServerId;
    } catch (error) {
      console.error('Failed to add MCP server:', error);
      throw error;
    }
  }, [addMcpServer]);

  const selectServer = useCallback((id: Id<"mcpServers"> | null) => {
    setServerId(id);
  }, []);

  const invoke = useCallback(async (toolName: string, args: any = {}) => {
    if (!serverId) throw new Error('No active MCP session');

    setInvoking(true);
    try {
      const result = await callTool({
        serverId,
        toolName,
        parameters: args,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to invoke tool');
      }
      
      return result.result;
    } finally {
      setInvoking(false);
    }
  }, [serverId, callTool]);

  return {
    sessionId: serverId, // Keep compatible with existing UI
    tools,
    invoking,
    addServer,
    invoke,
    selectServer,
    servers, // Expose servers list for potential future use
  };
}
