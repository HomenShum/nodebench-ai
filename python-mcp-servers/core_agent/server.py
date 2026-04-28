"""
Core Agent MCP Server - FastAPI Application
Provides planning and memory services via RESTful API
"""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from routes import health, tools

# Get settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="Core Agent MCP Server",
    description="Planning and Memory MCP server for Deep Agents",
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
app.include_router(tools.router, prefix="/tools", tags=["Tools"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Core Agent MCP Server",
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
    print(f"🚀 Starting Core Agent MCP Server on {settings.core_agent_host}:{settings.core_agent_port}")
    print(f"📚 API Documentation: http://{settings.core_agent_host}:{settings.core_agent_port}/docs")
    print(f"🏥 Health Check: http://{settings.core_agent_host}:{settings.core_agent_port}/health")
    
    uvicorn.run(
        "server:app",
        host=settings.core_agent_host,
        port=settings.core_agent_port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
