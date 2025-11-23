"""
Tool execution endpoints
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from services.openbb_client import get_openbb_client
from services.tool_registry import get_tool_registry

router = APIRouter()


class ToolRequest(BaseModel):
    """Tool execution request"""
    tool_name: str
    parameters: Dict[str, Any] = {}


class ToolResponse(BaseModel):
    """Tool execution response"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    tool_name: str
    execution_time_ms: Optional[float] = None


@router.post("/execute", response_model=ToolResponse)
async def execute_tool(request: ToolRequest):
    """
    Execute a tool with given parameters
    
    Executes the specified OpenBB tool and returns the result
    """
    import time
    start_time = time.time()
    
    try:
        # Get tool registry and client
        registry = get_tool_registry()
        client = get_openbb_client()
        
        # Validate tool exists
        tool_info = registry.get_tool_info(request.tool_name)
        if not tool_info:
            raise HTTPException(
                status_code=404,
                detail=f"Tool '{request.tool_name}' not found"
            )
        
        # Execute tool
        result = await client.execute_tool(
            request.tool_name,
            request.parameters
        )
        
        execution_time = (time.time() - start_time) * 1000
        
        return ToolResponse(
            success=True,
            data=result,
            tool_name=request.tool_name,
            execution_time_ms=execution_time,
        )
        
    except Exception as e:
        execution_time = (time.time() - start_time) * 1000
        
        return ToolResponse(
            success=False,
            error=str(e),
            tool_name=request.tool_name,
            execution_time_ms=execution_time,
        )


@router.post("/batch_execute")
async def batch_execute_tools(requests: list[ToolRequest]):
    """
    Execute multiple tools in batch
    
    Executes multiple tools and returns all results
    """
    results = []
    
    for request in requests:
        result = await execute_tool(request)
        results.append(result)
    
    return {
        "success": True,
        "results": results,
        "count": len(results),
    }

