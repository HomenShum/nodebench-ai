# Python MCP Servers

This directory contains Python-based MCP (Model Context Protocol) servers that provide specialized functionality to the NodeBench AI Convex backend.

## Directory Structure

```
python-mcp-servers/
├── README.md                    # This file
├── requirements.txt             # Shared Python dependencies
├── docker-compose.yml           # Multi-server orchestration
├── .env.example                 # Environment variable template
│
├── openbb/                      # OpenBB Financial Data MCP Server
│   ├── README.md
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── server.py               # FastAPI server
│   ├── config.py               # Configuration
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py           # Health check endpoints
│   │   ├── admin.py            # Admin/discovery endpoints
│   │   └── tools.py            # Tool execution endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── openbb_client.py    # OpenBB SDK wrapper
│   │   └── tool_registry.py    # Tool discovery and registration
│   └── tests/
│       ├── __init__.py
│       └── test_server.py
│
├── research/                    # Research & Web Scraping MCP Server (Future)
│   ├── README.md
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── server.py
│   └── ...
│
├── newsletter/                  # Newsletter Generation MCP Server (Future)
│   ├── README.md
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── server.py
│   └── ...
│
└── shared/                      # Shared utilities across servers
    ├── __init__.py
    ├── auth.py                  # Authentication helpers
    ├── logging.py               # Logging configuration
    └── models.py                # Shared Pydantic models
```

## Quick Start

### 1. Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install shared dependencies
pip install -r requirements.txt

# Install server-specific dependencies
cd openbb
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
# OPENBB_API_KEY=your_key_here
# LOG_LEVEL=INFO
```

### 3. Run a Server

```bash
# Run OpenBB server
cd openbb
python server.py

# Server will start on http://localhost:8001
```

### 4. Run All Servers with Docker Compose

```bash
# Build and start all servers
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all servers
docker-compose down
```

## Available Servers

### OpenBB Financial Data Server

**Port**: 8001  
**Status**: ✅ Ready to implement  
**Purpose**: Provides financial market data, company fundamentals, economic indicators

**Endpoints**:
- `GET /health` - Health check
- `GET /admin/available_categories` - List data categories
- `GET /admin/available_tools` - List available tools
- `POST /tools/execute` - Execute a tool

### Research Server

**Port**: 8002
**Status**: ✅ Implemented
**Purpose**: Iterative research with Convex integration and security model

**Features**:
- Secure Convex client with function allowlist
- Iterative search with reflection loops
- Multi-source fusion search
- Context initialization and task tracking

**Endpoints**:
- `GET /health` - Health check
- `GET /tools/list` - List available tools
- `POST /tools/execute` - Execute a research tool

### Newsletter Server (Future)

**Port**: 8003  
**Status**: ⏳ Planned  
**Purpose**: Newsletter generation, email formatting, digest creation

## Development

### Adding a New Server

1. Create a new directory: `mkdir my-server`
2. Copy structure from `openbb/` template
3. Create `requirements.txt` with dependencies
4. Implement `server.py` with FastAPI
5. Add to `docker-compose.yml`
6. Update this README

### Testing

```bash
# Run tests for a specific server
cd openbb
pytest

# Run all tests
pytest
```

### Code Style

```bash
# Format code
black .

# Lint code
flake8 .

# Type checking
mypy .
```

## Deployment

### Railway.app

```bash
cd openbb
railway init
railway up
```

### Render.com

1. Create new Web Service
2. Connect GitHub repo
3. Root directory: `python-mcp-servers/openbb`
4. Build command: `pip install -r requirements.txt`
5. Start command: `python server.py`

### Docker

```bash
# Build image
docker build -t openbb-mcp-server ./openbb

# Run container
docker run -p 8001:8001 --env-file .env openbb-mcp-server
```

## Environment Variables

See `.env.example` for all available configuration options.

## License

MIT

