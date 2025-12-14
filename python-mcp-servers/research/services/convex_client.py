"""
Secure Convex Client Wrapper

Provides constrained access to Convex functions with explicit allowlist.
This prevents arbitrary function execution from the MCP server.
"""
from typing import Any, Dict, Optional, Set
from convex import ConvexClient
import structlog

from config import get_settings

logger = structlog.get_logger()

# ═══════════════════════════════════════════════════════════════════════════
# SECURITY: FUNCTION ALLOWLISTS
# ═══════════════════════════════════════════════════════════════════════════

# Queries that can be called from this MCP server
ALLOWED_QUERIES: Set[str] = {
    # Search fusion
    "domains/search/fusion/actions:quickSearch",
    "domains/search/fusion/observability:getRecentSearchRuns",
    "domains/search/fusion/observability:getSourceAnalytics",
    # Migration stats
    "domains/agents/mcp_tools/models/migration:getMigrationStats",
    # Document queries
    "domains/documents/queries:getDocument",
    "domains/documents/queries:searchDocuments",
}

# Mutations that can be called from this MCP server
ALLOWED_MUTATIONS: Set[str] = {
    # Document mutations
    "domains/documents/mutations:createDocument",
    "domains/documents/mutations:updateDocument",
    # Task tracking
    "domains/agents/tasks:createTask",
    "domains/agents/tasks:updateTaskStatus",
}

# Actions that can be called from this MCP server
ALLOWED_ACTIONS: Set[str] = {
    # Search fusion
    "domains/search/fusion/actions:quickSearch",
    "domains/search/fusion/actions:fusionSearch",
}


class SecureConvexClient:
    """
    Secure wrapper around ConvexClient with function allowlist.
    
    Only functions explicitly listed in the allowlists can be called.
    This prevents arbitrary code execution from the MCP server.
    """
    
    def __init__(self):
        settings = get_settings()
        self.client: Optional[ConvexClient] = None
        self.url = settings.convex_url
        
        if self.url:
            try:
                self.client = ConvexClient(self.url)
                logger.info("convex_client_initialized", url=self.url)
            except Exception as e:
                logger.error("convex_client_init_failed", error=str(e))
    
    def is_available(self) -> bool:
        """Check if Convex client is available"""
        return self.client is not None
    
    def _validate_function(self, func_name: str, allowed: Set[str]) -> None:
        """Validate function is in allowlist"""
        if func_name not in allowed:
            raise PermissionError(
                f"Function '{func_name}' is not in the allowlist. "
                f"Allowed functions: {sorted(allowed)}"
            )
    
    def query(self, func_name: str, args: Dict[str, Any] = None) -> Any:
        """Execute a query (read-only)"""
        if not self.client:
            raise RuntimeError("Convex client not initialized")
        
        self._validate_function(func_name, ALLOWED_QUERIES)
        
        logger.info("convex_query", function=func_name)
        return self.client.query(func_name, args or {})
    
    def mutation(self, func_name: str, args: Dict[str, Any] = None) -> Any:
        """Execute a mutation (write)"""
        if not self.client:
            raise RuntimeError("Convex client not initialized")
        
        self._validate_function(func_name, ALLOWED_MUTATIONS)
        
        logger.info("convex_mutation", function=func_name)
        return self.client.mutation(func_name, args or {})
    
    def action(self, func_name: str, args: Dict[str, Any] = None) -> Any:
        """Execute an action"""
        if not self.client:
            raise RuntimeError("Convex client not initialized")
        
        self._validate_function(func_name, ALLOWED_ACTIONS)
        
        logger.info("convex_action", function=func_name)
        return self.client.action(func_name, args or {})


# Singleton instance
_client: Optional[SecureConvexClient] = None


def get_convex_client() -> SecureConvexClient:
    """Get the singleton Convex client"""
    global _client
    if _client is None:
        _client = SecureConvexClient()
    return _client

