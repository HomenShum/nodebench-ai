"""
Tool Registry
Manages tool discovery and metadata
"""
from typing import Dict, List, Any, Optional


class ToolRegistry:
    """
    Registry of available OpenBB tools
    
    Provides tool discovery, metadata, and categorization
    """
    
    def __init__(self):
        """Initialize tool registry"""
        self.tools = self._initialize_tools()
    
    def _initialize_tools(self) -> Dict[str, Dict[str, Any]]:
        """Initialize tool definitions"""
        return {
            # ===== Equity Tools =====
            "equity_price_quote": {
                "name": "equity_price_quote",
                "category": "equity",
                "description": "Get real-time stock quote",
                "parameters": {
                    "symbol": {"type": "string", "required": True, "description": "Stock ticker symbol"},
                },
                "returns": "Real-time quote data including price, volume, and market cap",
            },
            "equity_price_historical": {
                "name": "equity_price_historical",
                "category": "equity",
                "description": "Get historical stock price data",
                "parameters": {
                    "symbol": {"type": "string", "required": True, "description": "Stock ticker symbol"},
                    "start_date": {"type": "string", "required": False, "description": "Start date (YYYY-MM-DD)"},
                    "end_date": {"type": "string", "required": False, "description": "End date (YYYY-MM-DD)"},
                },
                "returns": "Historical price data with OHLCV",
            },
            "equity_fundamental_overview": {
                "name": "equity_fundamental_overview",
                "category": "equity",
                "description": "Get company fundamental overview",
                "parameters": {
                    "symbol": {"type": "string", "required": True, "description": "Stock ticker symbol"},
                },
                "returns": "Company fundamentals including market cap, P/E ratio, etc.",
            },
            
            # ===== Crypto Tools =====
            "crypto_price_quote": {
                "name": "crypto_price_quote",
                "category": "crypto",
                "description": "Get cryptocurrency quote",
                "parameters": {
                    "symbol": {"type": "string", "required": True, "description": "Crypto symbol (e.g., BTC, ETH)"},
                },
                "returns": "Real-time crypto quote data",
            },
            "crypto_price_historical": {
                "name": "crypto_price_historical",
                "category": "crypto",
                "description": "Get historical cryptocurrency data",
                "parameters": {
                    "symbol": {"type": "string", "required": True, "description": "Crypto symbol"},
                    "start_date": {"type": "string", "required": False, "description": "Start date (YYYY-MM-DD)"},
                    "end_date": {"type": "string", "required": False, "description": "End date (YYYY-MM-DD)"},
                },
                "returns": "Historical crypto price data",
            },
            
            # ===== Economy Tools =====
            "economy_gdp": {
                "name": "economy_gdp",
                "category": "economy",
                "description": "Get GDP data",
                "parameters": {
                    "country": {"type": "string", "required": False, "description": "Country code (default: US)"},
                },
                "returns": "GDP data for specified country",
            },
            "economy_inflation": {
                "name": "economy_inflation",
                "category": "economy",
                "description": "Get inflation data (CPI)",
                "parameters": {
                    "country": {"type": "string", "required": False, "description": "Country code (default: US)"},
                },
                "returns": "Inflation/CPI data for specified country",
            },
            
            # ===== News Tools =====
            "news_company": {
                "name": "news_company",
                "category": "news",
                "description": "Get company news",
                "parameters": {
                    "symbol": {"type": "string", "required": True, "description": "Stock ticker symbol"},
                    "limit": {"type": "integer", "required": False, "description": "Number of articles (default: 10)"},
                },
                "returns": "Recent news articles about the company",
            },
            "news_world": {
                "name": "news_world",
                "category": "news",
                "description": "Get world financial news",
                "parameters": {
                    "limit": {"type": "integer", "required": False, "description": "Number of articles (default: 10)"},
                },
                "returns": "Recent world financial news",
            },
        }
    
    def get_categories(self) -> List[str]:
        """Get all available categories"""
        categories = set()
        for tool in self.tools.values():
            categories.add(tool["category"])
        return sorted(list(categories))
    
    def get_all_tools(self) -> List[Dict[str, Any]]:
        """Get all tools"""
        return list(self.tools.values())
    
    def get_tools_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get tools for a specific category"""
        return [
            tool for tool in self.tools.values()
            if tool["category"] == category
        ]
    
    def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific tool"""
        return self.tools.get(tool_name)


# Global registry instance
_registry: Optional[ToolRegistry] = None


def get_tool_registry() -> ToolRegistry:
    """Get or create tool registry instance"""
    global _registry
    if _registry is None:
        _registry = ToolRegistry()
    return _registry

