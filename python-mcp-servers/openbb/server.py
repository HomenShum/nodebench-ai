"""
OpenBB MCP Server - FastAPI Application
Provides financial market data via RESTful API
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from routes import admin, health, tools

settings = get_settings()

def _split_origins(value: str):
    s = (value or "").strip()
    if not s:
        return []
    if s == "*":
        return ["*"]
    return [part.strip() for part in s.split(",") if part.strip()]

app = FastAPI(
    title="OpenBB MCP Server",
    description="Financial market data MCP server powered by OpenBB Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_split_origins(settings.allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(tools.router, prefix="/tools", tags=["Tools"])


@app.get("/")
async def root():
    return {
        "service": "OpenBB MCP Server",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


@app.exception_handler(Exception)
async def global_exception_handler(_request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc),
            "type": type(exc).__name__,
        },
    )


if __name__ == "__main__":
    import os
    # Railway injects PORT at runtime - read it directly, not from cached settings
    port = int(os.environ.get("PORT", settings.openbb_port))
    host = settings.openbb_host
    
    print(f"Starting OpenBB MCP Server on {host}:{port}")
    print(f"API Documentation: http://{host}:{port}/docs")
    print(f"Health Check: http://{host}:{port}/health")

    uvicorn.run(
        "server:app",
        host=host,
        port=port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
