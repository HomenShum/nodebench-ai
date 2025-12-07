"""
Tool execution endpoints for Core Agent (Planning & Memory)
"""
from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import time
from ..services.convex_service import convex_service

router = APIRouter()

# --- Models ---

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

# --- Tool Implementations ---

async def create_plan(user_id: str, goal: str, steps: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not user_id: raise ValueError("User ID required")
    result = convex_service.create_plan(user_id, goal, steps)
    return {"plan_id": result, "message": "Plan created successfully"}

async def update_plan_step(user_id: str, plan_id: str, step_index: int, status: str) -> Dict[str, Any]:
    if not user_id: raise ValueError("User ID required")
    convex_service.update_plan_step(user_id, plan_id, step_index, status)
    return {"message": "Step updated"}

async def get_plan(user_id: str, plan_id: str) -> Dict[str, Any]:
    if not user_id: raise ValueError("User ID required")
    plan = convex_service.get_plan(user_id, plan_id)
    if not plan: raise ValueError(f"Plan {plan_id} not found")
    return plan

async def write_agent_memory(user_id: str, key: str, content: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
    if not user_id: raise ValueError("User ID required")
    convex_service.write_memory(user_id, key, content, metadata)
    return {"message": "Memory stored", "key": key}

async def read_agent_memory(user_id: str, key: str) -> Dict[str, Any]:
    if not user_id: raise ValueError("User ID required")
    memory = convex_service.read_memory(user_id, key)
    if not memory: return {"found": False, "message": "Memory key not found"}
    return {"found": True, "data": memory}

async def list_agent_memory(user_id: str) -> List[Dict[str, Any]]:
    if not user_id: raise ValueError("User ID required")
    return convex_service.list_memory(user_id)

async def delete_agent_memory(user_id: str, key: str) -> Dict[str, Any]:
    if not user_id: raise ValueError("User ID required")
    convex_service.delete_memory(user_id, key)
    return {"success": True, "message": "Memory deleted"}

# --- Router ---

@router.post("/execute", response_model=ToolResponse)
async def execute_tool(request: ToolRequest, x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """
    Execute a tool with given parameters
    """
    start_time = time.time()
    
    try:
        result = None
        params = request.parameters
        user_id = x_user_id
        
        if not user_id:
            # Fallback for dev/testing if header not present (though it should be)
            # raise HTTPException(status_code=400, detail="X-User-Id header required")
            pass 

        if request.tool_name == "createPlan":
            result = await create_plan(user_id, params.get("goal"), params.get("steps", []))
        elif request.tool_name == "updatePlanStep":
            result = await update_plan_step(user_id, params.get("planId"), params.get("stepIndex"), params.get("status"))
        elif request.tool_name == "getPlan":
            result = await get_plan(user_id, params.get("planId"))
        elif request.tool_name == "writeAgentMemory":
            result = await write_agent_memory(user_id, params.get("key"), params.get("content"), params.get("metadata"))
        elif request.tool_name == "readAgentMemory":
            result = await read_agent_memory(user_id, params.get("key"))
        elif request.tool_name == "listAgentMemory":
            result = await list_agent_memory(user_id)
        elif request.tool_name == "deleteAgentMemory":
            result = await delete_agent_memory(user_id, params.get("key"))
        else:
            raise HTTPException(status_code=404, detail=f"Tool '{request.tool_name}' not found")
        
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
