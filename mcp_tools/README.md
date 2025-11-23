# MCP Tools - NodeBench AI

This directory contains **Model Context Protocol (MCP) servers** that expose shared tools for NodeBench AI agents.

## 🏗️ Architecture

MCP servers provide a standardized way for AI agents to access tools and data sources. Each server:
- Exposes tools via MCP protocol (stdio, HTTP/SSE, or WebSocket)
- Can be developed and deployed independently
- Is owned by a specific team
- Has its own versioning and lifecycle

## 📁 Directory Structure

```
mcp_tools/
├── core_agent_server/       # Planning & memory tools (Core Team)
├── data_access_server/      # Task, event, folder management (Data Team)
├── research_server/         # Funding, people, news discovery (Research Team)
└── newsletter_server/       # Newsletter generation (Content Team)
```

## 🚀 Quick Start

### Running a Server Locally

```bash
cd mcp_tools/core_agent_server
npm install
npm run dev
```



## 🔧 Server Specifications

### Core Agent Server
- **Purpose**: Planning and memory tools for Deep Agents architecture
- **Owner**: Core Team
- **Port**: 8001 (local)
- **Tools**: createPlan, updatePlanStep, writeAgentMemory, readAgentMemory

### Data Access Server
- **Purpose**: Task, event, and folder management
- **Owner**: Data Team
- **Port**: 8002 (local)
- **Tools**: listTasks, createTask, updateTask, listEvents, createEvent, getFolderContents

### Research Server
- **Purpose**: Funding research, people profiles, news discovery
- **Owner**: Research Team
- **Port**: 8003 (local)
- **Tools**: searchFunding, searchPeople, searchNews, searchEvents, enhancedFundingSearch

### Newsletter Server
- **Purpose**: Newsletter generation and management
- **Owner**: Content Team
- **Port**: 8004 (local)
- **Tools**: createNewsletter, sendNewsletter, scheduleNewsletter

## 🔌 How Agents Access MCP Tools

Agents don't call MCP servers directly. Instead, they use **wrapper tools** in `convex/tools/wrappers/` that internally call MCP servers via `api.mcpClient.callMcpTool`.

**Example**:
```typescript
// Agent code
import { createPlan } from "../tools/wrappers/coreAgentTools";

const agent = new Agent({
  tools: { createPlan },
});
```

The wrapper internally calls the MCP server:
```typescript
// convex/tools/wrappers/coreAgentTools.ts
export const createPlan = createTool({
  handler: async (ctx, args) => {
    const result = await ctx.runAction(api.mcpClient.callMcpTool, {
      serverId: "core_agent_server",
      toolName: "createPlan",
      parameters: args,
    });
    return result.result;
  },
});
```

## 👥 Multi-Team Collaboration

Each MCP server is owned by a specific team:
- **Core Team**: core_agent_server
- **Data Team**: data_access_server
- **Research Team**: research_server
- **Content Team**: newsletter_server

Teams can develop, test, and deploy their servers independently.

## 📚 Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
# MCP Servers

Shared Model Context Protocol (MCP) servers used by NodeBench AI agents.

## Overview
- `core_agent_server` (TypeScript): planning and memory tools backing the Deep Agents 2.0 coordinator.
- Python MCP lives in `python-mcp-servers/openbb` for financial data; all other templates were removed to keep the repo lean.
- If you need a new MCP server, start from `core_agent_server` as the baseline instead of the deleted `_templates/` folder.

## Directory Structure
```
mcp_tools/
└── core_agent_server/          # Planning + memory MCP server
    ├── server.ts               # MCP entrypoint (stdio)
    ├── tools/
    │   ├── planningTools.ts    # createPlan, updatePlanStep, getPlan
    │   └── memoryTools.ts      # write/read/list/deleteAgentMemory
    ├── package.json
    └── README.md
```

## Quick Start
```bash
cd mcp_tools/core_agent_server
npm install
npm run dev      # starts the stdio server with tsx
# or build for runtime
npm run build
npm start

# HTTP front (JSON-RPC 2.0 over HTTP for Convex callMcpTool)
npm run dev:http   # listens on http://127.0.0.1:4001 by default
# Optional: set MCP_HTTP_TOKEN to require `x-mcp-token` header; override host/port via MCP_HTTP_HOST/PORT
```

## Available Tools
- Planning: `createPlan`, `updatePlanStep`, `getPlan`
- Memory: `writeAgentMemory`, `readAgentMemory`, `listAgentMemory`, `deleteAgentMemory`
- Persistence: plans and memory are stored on-disk under `mcp_tools/core_agent_server/data/` (configurable via `CORE_AGENT_DATA_DIR`) so restarts don’t lose state. For multi-instance durability, point the server at a shared volume or move storage into Convex.

## Agent Integration
- Convex agents call wrappers in `convex/tools/wrappers/coreAgentTools.ts` (same tool names as the MCP server).
- When running the MCP server directly, connect a client to the stdio process named `nodebench-core-agent-server`.
- Tool schemas are JSON-based and validated in the MCP server before execution.

## Resources
- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
