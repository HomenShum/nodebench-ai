// src/components/MCPManager.tsx - MCP Server Management Interface
import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { 
  Plus, 
  Settings, 
  Trash2, 
  Play, 
  Pause, 
  TestTube, 
  AlertCircle, 
  CheckCircle,
  Wrench,
  Server,
  Globe,
  Terminal
} from 'lucide-react';
import { toast } from 'sonner';

// Align with convex/mcp.ts -> listMcpServers return type
type ServerListItem = {
  _id: Id<"mcpServers">;
  name: string;
  url?: string;
  apiKey?: string;
  description?: string;
  isEnabled?: boolean;
  createdAt: number;
  updatedAt: number;
  toolCount: number;
};



interface AddServerForm {
  name: string;
  description: string;
  transport: "stdio" | "sse" | "websocket";
  command: string;
  args: string;
  url: string;
  apiKey: string;
  isEnabled: boolean;
}

const MCPManager: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [formData, setFormData] = useState<AddServerForm>({
    name: '',
    description: '',
    transport: 'stdio',
    command: '',
    args: '',
    url: '',
    apiKey: '',
    isEnabled: true,
  });

  // Queries
  const servers = useQuery(api.mcp.listMcpServers, {});
  const tools = useQuery(api.mcp.getMcpTools, { availableOnly: false });

  // Mutations
  const addServer = useMutation(api.mcp.addMcpServer);
  const updateServer = useMutation(api.mcp.updateMcpServer);
  const deleteServer = useMutation(api.mcp.deleteMcpServer);

  const handleAddServer = async () => {
    try {
      const name = formData.name.trim();
      if (!name) {
        toast.error('Name is required');
        return;
      }

      // Only URL/apiKey are supported by the backend addMcpServer
      const url = formData.transport === 'stdio' ? undefined : (formData.url.trim() || undefined);
      if (formData.transport !== 'stdio' && !url) {
        toast.error('URL is required for SSE/WebSocket transport');
        return;
      }

      await addServer({
        name,
        url,
        apiKey: formData.apiKey.trim() || undefined,
      });
      toast.success(`MCP server "${formData.name}" added successfully`);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        transport: 'stdio',
        command: '',
        args: '',
        url: '',
        apiKey: '',
        isEnabled: true,
      });
      setShowAddForm(false);

    } catch (error) {
      console.error('Failed to add MCP server:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add server');
    }
  };

  const handleToggleServer = async (server: ServerListItem) => {
    try {
      await updateServer({
        serverId: server._id,
        isEnabled: !server.isEnabled,
      });

      toast.success(`Server ${server.isEnabled ? 'disabled' : 'enabled'}`);
    } catch (error) {
      console.error('Failed to toggle server:', error);
      toast.error('Failed to toggle server');
    }
  };

  const handleTestConnection = (_server: ServerListItem) => {
    toast.loading('Testing connection...', { id: 'test-connection' });
    // TODO: Implement test connection when available
    setTimeout(() => {
      toast.success('Connection test not implemented yet', { 
        id: 'test-connection' 
      });
    }, 1000);
  };

  const handleDeleteServer = async (server: ServerListItem) => {
    if (!confirm(`Are you sure you want to delete "${server.name}"? This will also remove all associated tools.`)) {
      return;
    }

    try {
      await deleteServer({ serverId: server._id });
      toast.success(`Server "${server.name}" deleted`);
    } catch (error) {
      console.error('Failed to delete server:', error);
      toast.error('Failed to delete server');
    }
  };

  // Simplified indicators based on available fields
  const getEnabledIcon = (isEnabled?: boolean) =>
    isEnabled ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Pause className="h-4 w-4 text-gray-400" />;

  const presetServers = [
    {
      name: 'Tavily Search',
      description: 'Web search capabilities via Tavily',
      transport: 'stdio' as const,
      command: 'npx',
      args: '-y mcp-remote https://mcp.tavily.com/mcp/',
    },
    {
      name: 'GitHub MCP',
      description: 'GitHub repository access and management',
      transport: 'stdio' as const,
      command: 'npx',
      args: '@modelcontextprotocol/server-github',
    },
    {
      name: 'Filesystem MCP',
      description: 'File system operations and access',
      transport: 'stdio' as const,
      command: 'npx',
      args: '@modelcontextprotocol/server-filesystem',
    },
  ];

  const addPresetServer = (preset: typeof presetServers[0]) => {
    setFormData({
      name: preset.name,
      description: preset.description,
      transport: preset.transport,
      command: preset.command,
      args: preset.args,
      url: '',
      apiKey: '',
      isEnabled: true,
    });
    setShowAddForm(true);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">MCP Servers</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Server
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex mt-3 border-b border-gray-100">
          <button
            onClick={() => setShowTools(false)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              !showTools 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Servers ({servers?.length || 0})
          </button>
          <button
            onClick={() => setShowTools(true)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              showTools 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Tools ({tools?.length || 0})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!showTools ? (
          // Servers View
          <div className="p-4">
            {!servers?.length ? (
              <div className="text-center py-8">
                <Server className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No MCP Servers</h3>
                <p className="text-gray-500 mb-4">
                  Add MCP servers to extend NodeBench with external tools and capabilities.
                </p>
                
                {/* Quick Start Presets */}
                <div className="max-w-md mx-auto">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Start:</h4>
                  <div className="space-y-2">
                    {presetServers.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => addPresetServer(preset)}
                        className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{preset.name}</div>
                        <div className="text-sm text-gray-500">{preset.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {servers.map((server) => (
                  <div
                    key={server._id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getEnabledIcon(server.isEnabled)}
                          {server.url ? <Globe className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
                          <h3 className="font-medium text-gray-900">{server.name}</h3>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {server.url ? 'remote' : 'local'}
                          </span>
                        </div>
                        
                        {server.description && (
                          <p className="text-sm text-gray-600 mb-2">{server.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {server.toolCount} tools
                          </span>
                        </div>
                        
                      </div>
                      
                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={() => handleTestConnection(server)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Test Connection"
                        >
                          <TestTube className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => void handleToggleServer(server)}
                          className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                          title={server.isEnabled ? "Disable" : "Enable"}
                        >
                          {server.isEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        
                        <button
                          onClick={() => toast.info('Server settings not implemented yet')}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => void handleDeleteServer(server)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Tools View
          <div className="p-4">
            {!tools?.length ? (
              <div className="text-center py-8">
                <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Tools Available</h3>
                <p className="text-gray-500">
                  Connect to MCP servers to discover available tools.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tools.map((tool) => (
                  <div
                    key={tool._id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {tool.isAvailable ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                          )}
                          <h3 className="font-medium text-gray-900">{tool.name}</h3>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {tool.serverName}
                          </span>
                        </div>
                        
                        {tool.description && (
                          <p className="text-sm text-gray-600 mb-2">{tool.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Used: {tool.usageCount || 0} times</span>
                          {tool.lastUsed && (
                            <span>Last: {new Date(tool.lastUsed).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Server Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add MCP Server</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="My MCP Server"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What does this server do?"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transport *
                  </label>
                  <select
                    value={formData.transport}
                    onChange={(e) => {
                      const t = e.target.value;
                      if (t === 'stdio' || t === 'sse' || t === 'websocket') {
                        setFormData(prev => ({ ...prev, transport: t }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="stdio">Stdio (Command)</option>
                    <option value="sse">Server-Sent Events (URL)</option>
                    <option value="websocket">WebSocket (URL)</option>
                  </select>
                </div>
                
                {formData.transport === 'stdio' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Command *
                      </label>
                      <input
                        type="text"
                        value={formData.command}
                        onChange={(e) => setFormData(prev => ({ ...prev, command: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="npx @modelcontextprotocol/server-example"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Arguments
                      </label>
                      <input
                        type="text"
                        value={formData.args}
                        onChange={(e) => setFormData(prev => ({ ...prev, args: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="--port 3000 --verbose"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL *
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/mcp"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key (optional)
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="API key if required"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isEnabled"
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, isEnabled: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isEnabled" className="ml-2 text-sm text-gray-700">
                    Enable server immediately
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleAddServer()}
                  disabled={!formData.name.trim() || (formData.transport === 'stdio' ? !formData.command.trim() : !formData.url.trim())}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Server
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MCPManager;
