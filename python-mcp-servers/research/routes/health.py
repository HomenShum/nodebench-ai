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
        "service": "research-mcp-server",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
    }


@router.get("/health/ready")
async def readiness_check():
    """
    Readiness check endpoint
    
    Checks if the server is ready to accept requests
    """
    from services.convex_client import get_convex_client
    
    client = get_convex_client()
    convex_ready = client.is_available()
    
    return {
        "ready": convex_ready,
        "convex_connected": convex_ready,
        "timestamp": datetime.utcnow().isoformat(),
    }

