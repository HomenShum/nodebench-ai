# Research MCP Server

FastAPI-based MCP server providing iterative research capabilities with Convex integration.

## Features

- ✅ Iterative search with reflection loops
- ✅ Context initialization and task tracking
- ✅ Convex database integration with security model
- ✅ Function allowlist for constrained access
- ✅ RESTful API with automatic OpenAPI documentation
- ✅ Health checks and monitoring

## Quick Start

### 1. Install Dependencies

```bash
# From python-mcp-servers/research directory
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy example environment file
cp ../.env.example ../.env

# Edit .env with your configuration
# CONVEX_URL=https://your-deployment.convex.cloud
# CONVEX_DEPLOY_KEY=your_deploy_key (optional, for admin access)
```

### 3. Run Server

```bash
python server.py
```

Server will start on http://localhost:8002

## API Endpoints

### Health
- `GET /health` - Health check
- `GET /health/ready` - Readiness check

### Tools
- `POST /tools/execute` - Execute a research tool
- `GET /tools/list` - List available tools

### Research Tools

| Tool | Description |
|------|-------------|
| `initialize_context` | Initialize research context with topic and goals |
| `init_task_tracker` | Create task tracker for research workflow |
| `update_task_status` | Update task status (pending/in_progress/complete/failed) |
| `get_task_summary` | Get summary of all tasks |
| `iterative_search` | Execute search with reflection and refinement |
| `fusion_search` | Multi-source search with result fusion |

## Security Model

### Function Allowlist

The server uses an explicit allowlist of Convex functions that can be called:

```python
ALLOWED_QUERIES = [
    "domains/search/fusion/actions:quickSearch",
    "domains/search/fusion/actions:fusionSearch",
    "domains/agents/mcp_tools/models/migration:getMigrationStats",
]

ALLOWED_MUTATIONS = [
    "domains/documents/mutations:createDocument",
    "domains/documents/mutations:updateDocument",
]

ALLOWED_ACTIONS = [
    "domains/search/fusion/actions:quickSearch",
    "domains/search/fusion/actions:fusionSearch",
]
```

### Authentication

- Uses shared secret for service-to-service auth
- Optional: Convex deploy key for admin operations
- All requests validated against allowlist before execution

## Architecture

```
research/
├── server.py              # FastAPI application entry point
├── config.py              # Configuration management
├── routes/
│   ├── health.py         # Health check endpoints
│   └── tools.py          # Tool execution endpoints
├── services/
│   ├── convex_client.py  # Secure Convex client wrapper
│   └── research_tools.py # Research tool implementations
└── tests/
    └── test_server.py    # Integration tests
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RESEARCH_PORT` | Server port | 8002 |
| `RESEARCH_HOST` | Server host | 0.0.0.0 |
| `CONVEX_URL` | Convex deployment URL | - |
| `MCP_SECRET` | Shared secret for auth | - |
| `LOG_LEVEL` | Logging level | INFO |

