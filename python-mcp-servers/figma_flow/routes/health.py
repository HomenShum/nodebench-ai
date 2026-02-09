"""Health check endpoints for Figma Flow Analysis server."""

import os
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "figma-flow-analysis"}


@router.get("/health/ready")
async def health_ready():
    """Check if FIGMA_ACCESS_TOKEN is configured."""
    token = os.getenv("FIGMA_ACCESS_TOKEN", "")
    has_token = bool(token)
    return {
        "status": "ready" if has_token else "degraded",
        "figma_token_configured": has_token,
        "message": "Figma token configured" if has_token else "Set FIGMA_ACCESS_TOKEN env var",
    }
