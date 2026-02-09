"""Health check endpoints for Flicker Detection server."""

import shutil
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "flicker-detection"}


@router.get("/health/ready")
async def health_ready():
    """Check if external dependencies (adb, ffmpeg, ffprobe) are available."""
    deps = {}
    for tool in ["adb", "ffmpeg", "ffprobe"]:
        deps[tool] = shutil.which(tool) is not None

    all_ready = all(deps.values())
    return {
        "status": "ready" if all_ready else "degraded",
        "dependencies": deps,
        "message": "All dependencies available" if all_ready else "Some dependencies missing — check dependencies field",
    }
