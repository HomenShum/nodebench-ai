"""
OpenBB SDK Client Wrapper
Provides a clean interface to OpenBB Platform functionality
"""
from typing import Any, Dict, Optional
from openbb import obb
from config import get_settings

settings = get_settings()


class OpenBBClient:
    """
    Wrapper around OpenBB SDK
    
    Provides methods for executing OpenBB tools and retrieving data
    """
    
    def __init__(self):
        """Initialize OpenBB client"""
        # Configure OpenBB with API key if provided
        if settings.openbb_api_key:
            # TODO: Configure OpenBB with API key
            # obb.account.login(api_key=settings.openbb_api_key)
            pass
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Any:
        """
        Execute an OpenBB tool
        
        Args:
            tool_name: Name of the tool to execute (e.g., 'equity_price_quote')
            parameters: Tool parameters
            
        Returns:
            Tool execution result
        """
        # Map tool names to OpenBB methods
        tool_map = {
            # Equity tools
            "equity_price_quote": self._equity_price_quote,
            "equity_price_historical": self._equity_price_historical,
            "equity_fundamental_overview": self._equity_fundamental_overview,
            
            # Crypto tools
            "crypto_price_quote": self._crypto_price_quote,
            "crypto_price_historical": self._crypto_price_historical,
            
            # Economy tools
            "economy_gdp": self._economy_gdp,
            "economy_inflation": self._economy_inflation,
            
            # News tools
            "news_company": self._news_company,
            "news_world": self._news_world,
        }
        
        if tool_name not in tool_map:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        # Execute the tool
        tool_func = tool_map[tool_name]
        result = await tool_func(**parameters)
        
        return result
    
    # ===== Equity Tools =====
    
    async def _equity_price_quote(self, symbol: str, **kwargs) -> Dict[str, Any]:
        """Get real-time stock quote"""
        try:
            data = obb.equity.price.quote(symbol=symbol, **kwargs)
            return self._format_response(data)
        except Exception as e:
            raise Exception(f"Failed to get quote for {symbol}: {str(e)}")
    
    async def _equity_price_historical(
        self,
        symbol: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Get historical stock price data"""
        try:
            data = obb.equity.price.historical(
                symbol=symbol,
                start_date=start_date,
                end_date=end_date,
                **kwargs
            )
            return self._format_response(data)
        except Exception as e:
            raise Exception(f"Failed to get historical data for {symbol}: {str(e)}")
    
    async def _equity_fundamental_overview(self, symbol: str, **kwargs) -> Dict[str, Any]:
        """Get company fundamental overview"""
        try:
            data = obb.equity.fundamental.overview(symbol=symbol, **kwargs)
            return self._format_response(data)
        except Exception as e:
            raise Exception(f"Failed to get fundamentals for {symbol}: {str(e)}")
    
    # ===== Crypto Tools =====
    
    async def _crypto_price_quote(self, symbol: str, **kwargs) -> Dict[str, Any]:
        """Get cryptocurrency quote"""
        try:
            data = obb.crypto.price.quote(symbol=symbol, **kwargs)
            return self._format_response(data)
        except Exception as e:
            raise Exception(f"Failed to get crypto quote for {symbol}: {str(e)}")
    
    async def _crypto_price_historical(
        self,
        symbol: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Get historical cryptocurrency data"""
        try:
            data = obb.crypto.price.historical(
                symbol=symbol,
                start_date=start_date,
                end_date=end_date,
                **kwargs
            )
            return self._format_response(data)
        except Exception as e:
            raise Exception(f"Failed to get crypto historical data for {symbol}: {str(e)}")
    
    # ===== Economy Tools =====
    
    async def _economy_gdp(self, country: str = "US", **kwargs) -> Dict[str, Any]:
        """Get GDP data"""
        try:
            data = obb.economy.gdp(country=country, **kwargs)
            return self._format_response(data)
        except Exception as e:
            raise Exception(f"Failed to get GDP data: {str(e)}")
    
    async def _economy_inflation(self, country: str = "US", **kwargs) -> Dict[str, Any]:
        """Get inflation data"""
        try:
            data = obb.economy.cpi(country=country, **kwargs)
            return self._format_response(data)
        except Exception as e:
            raise Exception(f"Failed to get inflation data: {str(e)}")
    
    # ===== News Tools =====
    
    async def _news_company(self, symbol: str, limit: int = 10, **kwargs) -> Dict[str, Any]:
        """Get company news"""
        try:
            data = obb.news.company(symbol=symbol, limit=limit, **kwargs)
            return self._format_response(data)
        except Exception as e:
            raise Exception(f"Failed to get news for {symbol}: {str(e)}")
    
    async def _news_world(self, limit: int = 10, **kwargs) -> Dict[str, Any]:
        """Get world news"""
        try:
            data = obb.news.world(limit=limit, **kwargs)
            return self._format_response(data)
        except Exception as e:
            raise Exception(f"Failed to get world news: {str(e)}")
    
    # ===== Helper Methods =====
    
    def _format_response(self, data: Any) -> Dict[str, Any]:
        """Format OpenBB response to JSON-serializable dict"""
        if hasattr(data, 'to_dict'):
            return data.to_dict()
        elif hasattr(data, 'results'):
            # Handle OBBject response
            results = data.results
            if hasattr(results, 'to_dict'):
                return results.to_dict()
            return results
        return data


# Global client instance
_client: Optional[OpenBBClient] = None


def get_openbb_client() -> OpenBBClient:
    """Get or create OpenBB client instance"""
    global _client
    if _client is None:
        _client = OpenBBClient()
    return _client

