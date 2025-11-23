# OpenBB MCP Server

FastAPI-based MCP server providing financial market data via the OpenBB Platform.

## Features

- ✅ Real-time and historical market data
- ✅ Company fundamentals and financials
- ✅ Economic indicators
- ✅ Cryptocurrency data
- ✅ News and sentiment analysis
- ✅ RESTful API with automatic OpenAPI documentation
- ✅ Health checks and monitoring
- ✅ Tool discovery and registration

## Quick Start

### 1. Install Dependencies

```bash
# From python-mcp-servers/openbb directory
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy example environment file
cp ../.env.example ../.env

# Edit .env with your OpenBB API key
# OPENBB_API_KEY=your_key_here
```

### 3. Run Server

```bash
python server.py
```

Server will start on `http://localhost:8001`

### 4. Test Endpoints

```bash
# Health check
curl http://localhost:8001/health

# Get available categories
curl http://localhost:8001/admin/available_categories

# Get available tools
curl http://localhost:8001/admin/available_tools

# Execute a tool
curl -X POST http://localhost:8001/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "equity_price_quote",
    "parameters": {"symbol": "AAPL"}
  }'
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc
- **OpenAPI JSON**: http://localhost:8001/openapi.json

## Available Tools

### Equity Tools
- `equity_price_quote` - Get real-time stock quote
- `equity_price_historical` - Get historical price data
- `equity_fundamental_overview` - Get company fundamentals
- `equity_fundamental_income` - Get income statement
- `equity_fundamental_balance` - Get balance sheet
- `equity_fundamental_cash` - Get cash flow statement

### Crypto Tools
- `crypto_price_quote` - Get cryptocurrency quote
- `crypto_price_historical` - Get historical crypto data

### Economy Tools
- `economy_gdp` - Get GDP data
- `economy_inflation` - Get inflation data
- `economy_unemployment` - Get unemployment data

### News Tools
- `news_company` - Get company news
- `news_world` - Get world news

## Development

### Run Tests

```bash
pytest
```

### Code Formatting

```bash
black .
```

### Type Checking

```bash
mypy .
```

## Docker

### Build Image

```bash
docker build -t openbb-mcp-server .
```

### Run Container

```bash
docker run -p 8001:8001 --env-file ../.env openbb-mcp-server
```

## Deployment

See parent directory README for deployment options (Railway, Render, Fly.io).

## Architecture

```
openbb/
├── server.py              # FastAPI application entry point
├── config.py              # Configuration management
├── routes/
│   ├── health.py         # Health check endpoints
│   ├── admin.py          # Admin/discovery endpoints
│   └── tools.py          # Tool execution endpoints
├── services/
│   ├── openbb_client.py  # OpenBB SDK wrapper
│   └── tool_registry.py  # Tool discovery and registration
└── tests/
    └── test_server.py    # Integration tests
```

## Environment Variables

- `OPENBB_API_KEY` - Your OpenBB API key (required)
- `OPENBB_PORT` - Server port (default: 8001)
- `OPENBB_HOST` - Server host (default: 0.0.0.0)
- `LOG_LEVEL` - Logging level (default: INFO)
- `ENVIRONMENT` - Environment name (default: development)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

## License

MIT

