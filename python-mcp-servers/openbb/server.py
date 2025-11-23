"""
OpenBB MCP Server - FastAPI Application
Provides financial market data via RESTful API
"""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from routes import health, admin, tools

# Get settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="OpenBB MCP Server",
    description="Financial market data MCP server powered by OpenBB Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(tools.router, prefix="/tools", tags=["Tools"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "OpenBB MCP Server",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc),
            "type": type(exc).__name__,
        },
    )


if __name__ == "__main__":
    print(f"🚀 Starting OpenBB MCP Server on {settings.openbb_host}:{settings.openbb_port}")
    print(f"📚 API Documentation: http://{settings.openbb_host}:{settings.openbb_port}/docs")
    print(f"🏥 Health Check: http://{settings.openbb_host}:{settings.openbb_port}/health")
    
    uvicorn.run(
        "server:app",
        host=settings.openbb_host,
        port=settings.openbb_port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )

