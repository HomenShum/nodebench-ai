"""
Research MCP Server - FastAPI Application
Provides iterative research capabilities with Convex integration
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from routes import health, tools

settings = get_settings()

def _split_origins(value: str):
    s = (value or "").strip()
    if not s:
        return []
    if s == "*":
        return ["*"]
    return [part.strip() for part in s.split(",") if part.strip()]

app = FastAPI(
    title="Research MCP Server",
    description="Iterative research MCP server with Convex integration",
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
app.include_router(tools.router, prefix="/tools", tags=["Tools"])


@app.get("/")
async def root():
    return {
        "service": "Research MCP Server",
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
    print(f"Starting Research MCP Server on {settings.research_host}:{settings.research_port}")
    print(f"API Documentation: http://{settings.research_host}:{settings.research_port}/docs")
    print(f"Health Check: http://{settings.research_host}:{settings.research_port}/health")

    uvicorn.run(
        "server:app",
        host=settings.research_host,
        port=settings.research_port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
