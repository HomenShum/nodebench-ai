"""
Shared Pydantic models
"""
from pydantic import BaseModel
from typing import Any, Optional, Dict


class HealthResponse(BaseModel):
    """Standard health check response"""
    status: str
    service: str
    timestamp: str
    version: str


class ErrorResponse(BaseModel):
    """Standard error response"""
    success: bool = False
    error: str
    type: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class SuccessResponse(BaseModel):
    """Standard success response"""
    success: bool = True
    data: Any
    message: Optional[str] = None

