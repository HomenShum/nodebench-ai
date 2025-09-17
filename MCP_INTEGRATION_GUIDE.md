# MCP Integration Guide for NodeBench AI

## Overview

NodeBench AI now includes comprehensive support for the Model Context Protocol (MCP), allowing users to easily add and manage external MCP servers to extend the AI's capabilities with tools, resources, and data sources.

## What is MCP?

The Model Context Protocol (MCP) is an open standard that enables AI applications to securely connect with external data sources and tools. With MCP, NodeBench AI can access:

- **Tools**: External functions and APIs (search engines, databases, calculators, etc.)
- **Resources**: Files, documents, and data sources
- **Prompts**: Pre-defined prompt templates and workflows

## Features Implemented

### ✅ Core Infrastructure
- **Database Schema**: Complete MCP server, tool, and session management
- **Real MCP Client**: Full MCP SDK integration with stdio, SSE, and WebSocket transports
- **Orchestrator**: Gemini AI function calling with MCP tools
- **Frontend Manager**: Comprehensive UI for server management

### ✅ Supported Transports
- **Stdio**: Command-line based MCP servers
- **Server-Sent Events (SSE)**: HTTP-based streaming connections
- **WebSocket**: Real-time bidirectional communication

### ✅ Key Features
- User-specific server management
- Automatic tool discovery and registration
- Connection status monitoring
- Usage tracking and analytics
- Error handling and recovery
- Persistent configuration storage

## Quick Start

### 1. Add a Pre-configured Server

NodeBench includes several preset configurations for popular MCP servers:

**Tavily Search** (Web Search):
```bash
Command: npx
Arguments: -y mcp-remote https://mcp.tavily.com/mcp/
Transport: stdio
```

**GitHub MCP** (Repository Access):
```bash
Command: npx
Arguments: @modelcontextprotocol/server-github
Transport: stdio
```

**Filesystem MCP** (File Operations):
```bash
Command: npx
Arguments: @modelcontextprotocol/server-filesystem
Transport: stdio
```

### 2. Custom Server Configuration

#### Stdio Transport Example
```javascript
{
  name: "Custom Calculator",
  description: "Mathematical calculations and analysis",
  transport: "stdio",
  command: "python",
  args: ["-m", "my_mcp_server"],
  apiKey: "optional-api-key"
}
```

#### SSE Transport Example
```javascript
{
  name: "Weather API",
  description: "Real-time weather data",
  transport: "sse",
  url: "https://weather-mcp.example.com/mcp",
  apiKey: "your-weather-api-key"
}
```

#### WebSocket Transport Example
```javascript
{
  name: "Real-time Data",
  description: "Live data streaming",
  transport: "websocket", 
  url: "wss://data-stream.example.com/mcp"
}
```

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │  Convex Backend │    │   MCP Servers   │
│                 │    │                 │    │                 │
│ MCPManager.tsx  │◄──►│ mcp.ts          │◄──►│ Tavily, GitHub, │
│ Sidebar.tsx     │    │ mcpClient.ts    │    │ Custom servers  │
│                 │    │ mcpOrchestrator │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Database Schema

### MCP Servers Table
```typescript
mcpServers: {
  name: string;                    // User-friendly name
  description?: string;            // Optional description
  transport: "stdio" | "sse" | "websocket";
  command?: string;                // For stdio transport
  args?: string[];                 // Command arguments
  url?: string;                    // For SSE/WebSocket
  apiKey?: string;                 // Encrypted API key
  isEnabled: boolean;              // Active status
  userId: Id<"users">;            // Owner
  connectionStatus?: "connected" | "disconnected" | "error";
  errorMessage?: string;           // Last error
  // Timestamps...
}
```

### MCP Tools Table
```typescript
mcpTools: {
  serverId: Id<"mcpServers">;     // Parent server
  name: string;                    // Tool name
  description?: string;            // Tool description
  schema?: any;                    // Parameter schema
  isAvailable: boolean;            // Current availability
  usageCount?: number;             // Usage statistics
  // Timestamps...
}
```

## API Reference

### Backend Functions

#### Server Management
```typescript
// Add new MCP server
api.mcp.addMcpServer({
  name: "My Server",
  transport: "stdio",
  command: "npx",
  args: ["my-mcp-package"],
  isEnabled: true
})

// Update server configuration
api.mcp.updateMcpServer({
  serverId: "...",
  isEnabled: false
})

// Delete server and cleanup
api.mcp.deleteMcpServer({
  serverId: "..."
})

// List user's servers
api.mcp.listMcpServers({
  enabledOnly: true
})
```

#### Tool Operations
```typescript
// Get available tools
api.mcp.getMcpTools({
  serverId: "...",
  availableOnly: true
})

// Execute MCP tool directly
api.mcpOrchestrator.executeMcpTool({
  serverId: "...",
  toolName: "search",
  arguments: { query: "AI news", max_results: 5 }
})
```

#### AI Orchestration
```typescript
// AI conversation with MCP tools
api.mcpOrchestrator.orchestrateWithMcp({
  prompt: "Search for the latest AI developments",
  maxSteps: 5,
  enabledServerIds: ["server1", "server2"]
})
```

### MCP Client Integration
```typescript
// Real MCP connections
api.mcpClient.connectToMcpServer({ serverId: "..." })
api.mcpClient.disconnectFromMcpServer({ serverId: "..." })
api.mcpClient.callMcpTool({ 
  serverId: "...", 
  toolName: "...", 
  arguments: {...} 
})
```

## Usage Examples

### 1. Web Search with Tavily
```typescript
// Add Tavily server
const serverId = await addMcpServer({
  name: "Tavily Search",
  description: "Web search capabilities",
  transport: "stdio",
  command: "npx",
  args: ["-y", "mcp-remote", "https://mcp.tavily.com/mcp/"],
  apiKey: process.env.TAVILY_API_KEY
});

// Use in AI conversation
const result = await orchestrateWithMcp({
  prompt: "What are the latest developments in quantum computing?",
  enabledServerIds: [serverId]
});
```

### 2. File System Operations
```typescript
// Add filesystem server
const fsServerId = await addMcpServer({
  name: "File System",
  transport: "stdio", 
  command: "npx",
  args: ["@modelcontextprotocol/server-filesystem", "/path/to/workspace"]
});

// AI can now read/write files
const result = await orchestrateWithMcp({
  prompt: "Analyze the package.json file and suggest optimizations",
  enabledServerIds: [fsServerId]
});
```

### 3. Custom Tool Integration
```typescript
// Direct tool execution
const searchResult = await executeMcpTool({
  serverId: tavilyServerId,
  toolName: "search",
  arguments: {
    query: "NodeBench AI features",
    max_results: 10
  }
});

console.log("Search results:", searchResult.result);
```

## Error Handling

The MCP integration includes comprehensive error handling:

```typescript
try {
  const result = await callMcpTool({
    serverId,
    toolName: "invalid_tool",
    arguments: {}
  });
} catch (error) {
  // Automatic retry logic
  // Connection recovery
  // User-friendly error messages
  console.error("MCP tool failed:", error.message);
}
```

## Security Considerations

1. **API Key Encryption**: API keys are encrypted before storage
2. **User Isolation**: Each user can only access their own servers
3. **Connection Sandboxing**: MCP connections are isolated per user
4. **Resource Limits**: Built-in rate limiting and usage tracking

## Performance Optimizations

1. **Connection Pooling**: Reuse active MCP connections
2. **Automatic Cleanup**: Inactive connections are cleaned up after 30 minutes
3. **Async Tool Discovery**: Non-blocking tool registration
4. **Graceful Degradation**: Fallback to basic AI if MCP tools fail

## Troubleshooting

### Common Issues

**Server Won't Connect**
- Check command/URL syntax
- Verify API keys
- Review error messages in server list

**Tools Not Appearing**
- Ensure server is enabled and connected
- Check server supports tool listing
- Try reconnecting the server

**Performance Issues**
- Monitor connection count
- Check for resource-heavy tools
- Review usage statistics

### Debug Commands

```bash
# Check MCP server status
npx @modelcontextprotocol/inspect <server-command>

# Test tool directly
npx mcp-client <server-url> tools/list
```

## Extension Development

### Creating Custom MCP Servers

```python
# Example Python MCP server
from mcp import McpServer
from mcp.types import Tool

server = McpServer("my-custom-server")

@server.tool("calculate")
def calculate(expression: str) -> float:
    """Safely evaluate mathematical expressions"""
    # Implementation here
    return result

if __name__ == "__main__":
    server.run()
```

### Integration Patterns

1. **Tool Wrappers**: Wrap existing APIs as MCP tools
2. **Resource Providers**: Expose data sources via MCP resources
3. **Workflow Automation**: Chain multiple MCP tools together

## Roadmap

### Planned Features
- [ ] Visual tool flow builder
- [ ] MCP server marketplace
- [ ] Advanced caching and optimization
- [ ] Batch tool execution
- [ ] Server health monitoring
- [ ] Auto-discovery of local MCP servers

### Community Contributions
- Submit new preset configurations
- Report compatibility issues
- Contribute tool integrations
- Share usage patterns

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review MCP server documentation
3. File issues with specific error messages
4. Share configuration details for debugging

## Examples Repository

Complete working examples available at:
- **Tavily Integration**: Web search and research
- **GitHub Integration**: Repository analysis and management  
- **Weather API**: Real-time weather data
- **Calculator Service**: Mathematical computations
- **Database Connector**: SQL query execution

---

*This integration brings the power of the MCP ecosystem to NodeBench AI, enabling unlimited extensibility through community-driven tools and resources.*
