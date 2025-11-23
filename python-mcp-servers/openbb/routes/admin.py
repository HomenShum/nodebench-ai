"""
Admin and discovery endpoints
"""
from fastapi import APIRouter, Query
from typing import Optional
from services.tool_registry import get_tool_registry

router = APIRouter()


@router.get("/available_categories")
async def get_available_categories():
    """
    Get all available data categories
    
    Returns a list of all data categories available in OpenBB Platform
    """
    registry = get_tool_registry()
    categories = registry.get_categories()
    
    return {
        "success": True,
        "categories": categories,
        "count": len(categories),
    }


@router.get("/available_tools")
async def get_available_tools(
    category: Optional[str] = Query(None, description="Filter by category")
):
    """
    Get all available tools
    
    Optionally filter by category
    """
    registry = get_tool_registry()
    
    if category:
        tools = registry.get_tools_by_category(category)
    else:
        tools = registry.get_all_tools()
    
    return {
        "success": True,
        "tools": tools,
        "count": len(tools),
        "category": category,
    }


@router.get("/tool/{tool_name}")
async def get_tool_info(tool_name: str):
    """
    Get detailed information about a specific tool
    
    Returns tool metadata, parameters, and usage examples
    """
    registry = get_tool_registry()
    tool_info = registry.get_tool_info(tool_name)
    
    if not tool_info:
        return {
            "success": False,
            "error": f"Tool '{tool_name}' not found",
        }
    
    return {
        "success": True,
        "tool": tool_info,
    }


@router.get("/categories/{category}/tools")
async def get_category_tools(category: str):
    """
    Get all tools for a specific category
    
    Returns tools belonging to the specified category
    """
    registry = get_tool_registry()
    tools = registry.get_tools_by_category(category)
    
    return {
        "success": True,
        "category": category,
        "tools": tools,
        "count": len(tools),
    }

