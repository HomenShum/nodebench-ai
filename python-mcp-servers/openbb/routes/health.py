"""
Health check endpoints
"""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Health check endpoint
    
    Returns server status and basic information
    """
    return {
        "status": "healthy",
        "service": "openbb-mcp-server",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
    }


@router.get("/health/ready")
async def readiness_check():
    """
    Readiness check endpoint
    
    Checks if the server is ready to accept requests
    """
    # TODO: Add actual readiness checks (database, external services, etc.)
    return {
        "ready": True,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/live")
async def liveness_check():
    """
    Liveness check endpoint
    
    Simple check to verify the server is alive
    """
    return {
        "alive": True,
        "timestamp": datetime.utcnow().isoformat(),
    }

