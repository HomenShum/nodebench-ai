"""
Tool execution endpoints
"""
import time
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.research_tools import get_research_tools

router = APIRouter()


class ToolRequest(BaseModel):
    """Tool execution request"""
    tool_name: str
    parameters: Dict[str, Any] = {}
    secret: Optional[str] = None


class ToolResponse(BaseModel):
    """Tool execution response"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    tool_name: str
    execution_time_ms: float


@router.get("/list")
async def list_tools():
    """
    List all available research tools
    """
    tools = get_research_tools()
    return {
        "success": True,
        "tools": tools.list_tools(),
        "count": len(tools.list_tools()),
    }


@router.post("/execute")
async def execute_tool(request: ToolRequest) -> ToolResponse:
    """
    Execute a research tool
    """
    start_time = time.time()
    
    try:
        tools = get_research_tools()
        
        # Validate tool exists
        if not tools.has_tool(request.tool_name):
            raise HTTPException(
                status_code=404,
                detail=f"Tool '{request.tool_name}' not found"
            )
        
        # Execute tool
        result = await tools.execute(
            request.tool_name,
            request.parameters,
            request.secret
        )
        
        execution_time = (time.time() - start_time) * 1000
        
        return ToolResponse(
            success=True,
            data=result,
            tool_name=request.tool_name,
            execution_time_ms=execution_time,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        execution_time = (time.time() - start_time) * 1000
        
        return ToolResponse(
            success=False,
            error=str(e),
            tool_name=request.tool_name,
            execution_time_ms=execution_time,
        )

