"""
Flicker Detection MCP Server - FastAPI Application
4-layer pipeline for Android UI flicker detection via frame-by-frame video analysis.
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
    title="Flicker Detection MCP Server",
    description="4-layer Android UI flicker detection: SurfaceFlinger + Logcat, screenrecord, SSIM analysis, semantic verification",
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
        "service": "Flicker Detection MCP Server",
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
    port = int(os.environ.get("PORT", settings.flicker_port))
    host = settings.flicker_host

    print(f"Starting Flicker Detection MCP Server on {host}:{port}")
    print(f"API Documentation: http://{host}:{port}/docs")
    print(f"Health Check: http://{host}:{port}/health")

    uvicorn.run(
        "server:app",
        host=host,
        port=port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
