"""
Research Tools Service

Implements research-specific tools that can be called via MCP.
"""
from typing import Any, Dict, List, Optional
import structlog

from config import get_settings
from .convex_client import get_convex_client

logger = structlog.get_logger()

# ═══════════════════════════════════════════════════════════════════════════
# TOOL DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════

TOOL_DEFINITIONS = {
    "initialize_context": {
        "name": "initialize_context",
        "description": "Initialize research context with topic and goals",
        "parameters": {
            "topic": {"type": "string", "required": True},
            "goals": {"type": "array", "items": {"type": "string"}},
            "constraints": {"type": "array", "items": {"type": "string"}},
        },
    },
    "quick_search": {
        "name": "quick_search",
        "description": "Execute a quick search using LinkUp",
        "parameters": {
            "query": {"type": "string", "required": True},
            "maxResults": {"type": "integer", "default": 10},
        },
    },
    "fusion_search": {
        "name": "fusion_search",
        "description": "Execute multi-source search with result fusion",
        "parameters": {
            "query": {"type": "string", "required": True},
            "mode": {"type": "string", "enum": ["fast", "balanced", "comprehensive"]},
            "sources": {"type": "array", "items": {"type": "string"}},
        },
    },
    "get_migration_stats": {
        "name": "get_migration_stats",
        "description": "Get model migration statistics",
        "parameters": {},
    },
}


class ResearchTools:
    """Research tools implementation"""
    
    def __init__(self):
        self.settings = get_settings()
        self._context: Dict[str, Any] = {}
        self._tasks: List[Dict[str, Any]] = []
    
    def list_tools(self) -> List[Dict[str, Any]]:
        """List all available tools"""
        return list(TOOL_DEFINITIONS.values())
    
    def has_tool(self, name: str) -> bool:
        """Check if tool exists"""
        return name in TOOL_DEFINITIONS
    
    async def execute(self, tool_name: str, params: Dict[str, Any], secret: Optional[str] = None) -> Any:
        """Execute a tool by name"""
        logger.info("tool_execute", tool=tool_name, params=params)
        
        # Validate secret if required
        if self.settings.mcp_secret and secret != self.settings.mcp_secret:
            if self.settings.environment != "development":
                raise PermissionError("Invalid MCP secret")
        
        # Route to appropriate handler
        if tool_name == "initialize_context":
            return self._initialize_context(params)
        elif tool_name == "quick_search":
            return await self._quick_search(params)
        elif tool_name == "fusion_search":
            return await self._fusion_search(params)
        elif tool_name == "get_migration_stats":
            return self._get_migration_stats()
        else:
            raise ValueError(f"Unknown tool: {tool_name}")
    
    def _initialize_context(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Initialize research context"""
        self._context = {
            "topic": params.get("topic", ""),
            "goals": params.get("goals", []),
            "constraints": params.get("constraints", []),
            "initialized": True,
        }
        logger.info("context_initialized", topic=self._context["topic"])
        return {"success": True, "context": self._context}
    
    async def _quick_search(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute quick search via Convex"""
        client = get_convex_client()
        if not client.is_available():
            return {"success": False, "error": "Convex not available"}
        
        result = client.action(
            "domains/search/fusion/actions:quickSearch",
            {"query": params.get("query", ""), "maxResults": params.get("maxResults", 10)}
        )
        return {"success": True, "results": result}
    
    async def _fusion_search(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute fusion search via Convex"""
        client = get_convex_client()
        if not client.is_available():
            return {"success": False, "error": "Convex not available"}
        
        result = client.action(
            "domains/search/fusion/actions:fusionSearch",
            {
                "query": params.get("query", ""),
                "mode": params.get("mode", "balanced"),
                "sources": params.get("sources"),
            }
        )
        return {"success": True, "results": result}
    
    def _get_migration_stats(self) -> Dict[str, Any]:
        """Get migration statistics"""
        client = get_convex_client()
        if not client.is_available():
            return {"success": False, "error": "Convex not available"}
        
        result = client.query("domains/agents/mcp_tools/models/migration:getMigrationStats", {})
        return {"success": True, "stats": result}


# Singleton instance
_tools: Optional[ResearchTools] = None


def get_research_tools() -> ResearchTools:
    """Get the singleton research tools instance"""
    global _tools
    if _tools is None:
        _tools = ResearchTools()
    return _tools

