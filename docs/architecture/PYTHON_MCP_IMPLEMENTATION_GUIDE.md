# Python MCP Server Implementation Guide for Convex

**Date**: November 22, 2025  
**Context**: OpenBB MCP Server requires Python runtime

---

## 🎯 Overview

This guide explains how to implement Python-based MCP servers (like OpenBB) with Convex, which is a TypeScript/Node.js backend platform.

---

## 🏗️ Architecture Options

### Option 1: **Separate Python Process** (Recommended for OpenBB)

Run Python MCP server as a separate process that Convex actions communicate with via HTTP/WebSocket.

**Pros**:
- ✅ Full Python ecosystem access (OpenBB, pandas, numpy, etc.)
- ✅ Isolated runtime - Python crashes don't affect Convex
- ✅ Can run on separate infrastructure (better resource management)
- ✅ Matches OpenBB MCP server design

**Cons**:
- ⚠️ Requires separate deployment/hosting
- ⚠️ Network latency for each call
- ⚠️ More complex infrastructure

### Option 2: **Python Subprocess from Node.js Actions**

Spawn Python processes from Convex Node.js actions using `child_process`.

**Pros**:
- ✅ Single deployment (Convex handles everything)
- ✅ No separate infrastructure needed

**Cons**:
- ❌ Limited by Convex action timeout (5 minutes)
- ❌ Cold start overhead for each Python invocation
- ❌ Not suitable for long-running processes
- ❌ Difficult to manage Python dependencies in Convex environment

### Option 3: **Convex Python Client** (Not Applicable)

The `convex-py` library is for Python apps to **call** Convex, not for Convex to run Python.

---

## ✅ Recommended Approach: Separate Python MCP Server

For OpenBB and similar Python-based MCP servers, run them as **separate HTTP/WebSocket services** that Convex actions communicate with.

---

## 📋 Implementation Steps

### Step 1: Set Up Python MCP Server

Create a separate Python project for your MCP server:

```bash
# Create Python project directory
mkdir python-mcp-servers
cd python-mcp-servers

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install openbb-mcp-server  # or your MCP server package
pip install fastapi uvicorn    # For HTTP server
```

### Step 2: Create Python MCP Server Wrapper

Create `openbb_server.py`:

```python
"""
OpenBB MCP Server HTTP Wrapper
Exposes OpenBB MCP functionality via HTTP endpoints
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import openbb  # OpenBB SDK

app = FastAPI()

class ToolRequest(BaseModel):
    tool_name: str
    parameters: dict

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "openbb-mcp"}

@app.get("/admin/available_categories")
async def get_categories():
    # Return OpenBB categories
    return {
        "categories": ["equity", "crypto", "economy", "news", "etf"]
    }

@app.get("/admin/available_tools")
async def get_tools(category: str = None):
    # Return available tools for category
    tools = []
    # ... implement tool discovery
    return {"tools": tools}

@app.post("/tools/execute")
async def execute_tool(request: ToolRequest):
    try:
        # Execute OpenBB tool
        result = await execute_openbb_tool(
            request.tool_name,
            request.parameters
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

### Step 3: Configure Convex to Call Python Server

In your Convex project, create actions that call the Python server:

**`convex/actions/openbbActions.ts`** (already exists):

```typescript
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

export const callOpenBBMCP = internalAction({
  args: {
    endpoint: v.string(),
    method: v.string(),
    params: v.optional(v.any()),
    body: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const serverUrl = process.env.OPENBB_MCP_SERVER_URL || "http://127.0.0.1:8001";
    
    // Build URL with query params
    let url = `${serverUrl}${args.endpoint}`;
    if (args.params) {
      const queryString = new URLSearchParams(args.params).toString();
      url += `?${queryString}`;
    }

    // Make HTTP request
    const response = await fetch(url, {
      method: args.method,
      headers: { "Content-Type": "application/json" },
      body: args.body ? JSON.stringify(args.body) : undefined,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  },
});
```

### Step 4: Set Environment Variable

Add to your `.env.local`:

```bash
# OpenBB MCP Server URL
OPENBB_MCP_SERVER_URL=http://localhost:8001
```

For production, set this in Convex dashboard:

```bash
npx convex env set OPENBB_MCP_SERVER_URL https://your-python-server.com
```

---

## 🚀 Deployment Options

### Option A: Deploy Python Server Separately

**Railway.app** (Recommended):
```bash
# In python-mcp-servers directory
railway init
railway up
```

**Render.com**:
- Create new Web Service
- Connect GitHub repo
- Build command: `pip install -r requirements.txt`
- Start command: `python openbb_server.py`

**Fly.io**:
```bash
fly launch
fly deploy
```

### Option B: Docker Container

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["python", "openbb_server.py"]
```

Deploy to any container platform (AWS ECS, Google Cloud Run, etc.)

---

## 📝 Implementation Status

### ✅ Completed

1. ✅ **Convex Actions**: Created `convex/actions/openbbActions.ts` with HTTP client
2. ✅ **Python Directory Structure**: Created organized `python-mcp-servers/` directory
3. ✅ **OpenBB Server**: Implemented complete FastAPI server with:
   - Health check endpoints (`/health`, `/health/ready`, `/health/live`)
   - Admin endpoints (`/admin/available_categories`, `/admin/available_tools`)
   - Tool execution endpoints (`/tools/execute`, `/tools/batch_execute`)
   - OpenBB SDK client wrapper
   - Tool registry with 9 tools (equity, crypto, economy, news)
   - Configuration management
   - Docker support
   - Comprehensive tests

### ⏳ Next Steps

1. **Install Dependencies**:
   ```bash
   cd python-mcp-servers/openbb
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure Environment**:
   ```bash
   cd python-mcp-servers
   cp .env.example .env
   # Edit .env and add your OPENBB_API_KEY
   ```

3. **Run Server Locally**:
   ```bash
   cd openbb
   python server.py
   # Server starts on http://localhost:8001
   ```

4. **Test Connection**:
   ```bash
   # Terminal 1: Python server running
   # Terminal 2: Test from Convex
   npx convex run actions/openbbActions:testOpenBBConnection
   ```

5. **Deploy to Production** (choose one):
   - Railway.app: `railway init && railway up`
   - Render.com: Connect GitHub repo
   - Docker: `docker-compose up --build`

6. **Set Production Environment Variable**:
   ```bash
   npx convex env set OPENBB_MCP_SERVER_URL https://your-deployed-server.com
   ```

---

## 🔍 Testing Locally

### Terminal 1: Start Python Server
```bash
cd python-mcp-servers
source venv/bin/activate
python openbb_server.py
# Server running on http://localhost:8001
```

### Terminal 2: Start Convex Dev
```bash
npx convex dev
```

### Terminal 3: Test Connection
```bash
npx convex run actions/openbbActions:testOpenBBConnection
```

---

## 📚 Resources

- **Convex Actions**: https://docs.convex.dev/functions/actions
- **Convex Node Runtime**: https://docs.convex.dev/functions/bundling
- **OpenBB MCP**: https://github.com/openbb-finance/openbb-mcp
- **FastAPI**: https://fastapi.tiangolo.com/

