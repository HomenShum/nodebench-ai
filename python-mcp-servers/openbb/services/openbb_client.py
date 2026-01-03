"""
OpenBB SDK Client Wrapper
Provides a clean interface to OpenBB Platform functionality
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

import yfinance as yf
from config import get_settings

settings = get_settings()


class OpenBBClient:
    """
    Minimal data client used by the OpenBB MCP server.

    Notes:
    - The OpenBB Python package can be brittle across versions/environments.
    - For this server's REST surface (used by Convex), we only require stable
      "equity quote" and "equity historical" style capabilities.
    - We currently back these tools with `yfinance`, which is already an OpenBB
      dependency in many setups and works without additional API keys.
    """
    
    def __init__(self):
        """Initialize client (kept for parity with previous OpenBB wrapper)."""
        self._configured_api_key = bool(settings.openbb_api_key)

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _pick_first(self, *values: Any) -> Any:
        for v in values:
            if v is None:
                continue
            if isinstance(v, str) and not v.strip():
                continue
            return v
        return None
    
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
            ticker = yf.Ticker(symbol)

            fast_info: Dict[str, Any] = {}
            info: Dict[str, Any] = {}
            try:
                fast_info = dict(getattr(ticker, "fast_info", {}) or {})
            except Exception:
                fast_info = {}

            # `Ticker.info` can be slow and occasionally error; treat as best-effort.
            try:
                info = dict(getattr(ticker, "info", {}) or {})
            except Exception:
                info = {}

            price = self._pick_first(
                fast_info.get("last_price"),
                info.get("currentPrice"),
                info.get("regularMarketPrice"),
            )

            return {
                "symbol": symbol,
                "price": price,
                "currency": self._pick_first(fast_info.get("currency"), info.get("currency")),
                "marketCap": info.get("marketCap"),
                "dayHigh": info.get("dayHigh"),
                "dayLow": info.get("dayLow"),
                "previousClose": info.get("previousClose"),
                "open": info.get("open"),
                "volume": info.get("volume"),
                "source": "yfinance",
                "fetchedAt": self._now_iso(),
            }
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
            ticker = yf.Ticker(symbol)

            hist = ticker.history(
                start=start_date,
                end=end_date,
                interval=kwargs.get("interval", "1d"),
                auto_adjust=False,
            )
            # Ensure JSON-serializable output.
            hist = hist.reset_index()
            points = []
            for _, row in hist.iterrows():
                # Row may contain Timestamp-like objects.
                dt = row.get("Date")
                if dt is None:
                    dt = row.get("Datetime")
                if hasattr(dt, "to_pydatetime"):
                    dt = dt.to_pydatetime()
                if hasattr(dt, "isoformat"):
                    ts = dt.isoformat()
                else:
                    ts = str(dt)

                points.append(
                    {
                        "t": ts,
                        "open": float(row["Open"]) if row.get("Open") is not None else None,
                        "high": float(row["High"]) if row.get("High") is not None else None,
                        "low": float(row["Low"]) if row.get("Low") is not None else None,
                        "close": float(row["Close"]) if row.get("Close") is not None else None,
                        "volume": int(row["Volume"]) if row.get("Volume") is not None else None,
                    }
                )

            return {
                "symbol": symbol,
                "count": len(points),
                "points": points,
                "source": "yfinance",
                "fetchedAt": self._now_iso(),
            }
        except Exception as e:
            raise Exception(f"Failed to get historical data for {symbol}: {str(e)}")
    
    async def _equity_fundamental_overview(self, symbol: str, **kwargs) -> Dict[str, Any]:
        """Get company fundamental overview"""
        try:
            ticker = yf.Ticker(symbol)
            info = dict(getattr(ticker, "info", {}) or {})
            # Return a stable subset.
            return {
                "symbol": symbol,
                "longName": info.get("longName"),
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                "website": info.get("website"),
                "marketCap": info.get("marketCap"),
                "trailingPE": info.get("trailingPE"),
                "forwardPE": info.get("forwardPE"),
                "priceToBook": info.get("priceToBook"),
                "beta": info.get("beta"),
                "dividendYield": info.get("dividendYield"),
                "source": "yfinance",
                "fetchedAt": self._now_iso(),
            }
        except Exception as e:
            raise Exception(f"Failed to get fundamentals for {symbol}: {str(e)}")
    
    # ===== Crypto Tools =====
    
    async def _crypto_price_quote(self, symbol: str, **kwargs) -> Dict[str, Any]:
        """Get cryptocurrency quote"""
        try:
            yf_symbol = symbol if "-" in symbol else f"{symbol.upper()}-USD"
            return await self._equity_price_quote(symbol=yf_symbol, **kwargs)
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
            yf_symbol = symbol if "-" in symbol else f"{symbol.upper()}-USD"
            return await self._equity_price_historical(
                symbol=yf_symbol,
                start_date=start_date,
                end_date=end_date,
                **kwargs,
            )
        except Exception as e:
            raise Exception(f"Failed to get crypto historical data for {symbol}: {str(e)}")
    
    # ===== Economy Tools =====
    
    async def _economy_gdp(self, country: str = "US", **kwargs) -> Dict[str, Any]:
        """Get GDP data"""
        raise Exception("economy_gdp not implemented in this deployment")
    
    async def _economy_inflation(self, country: str = "US", **kwargs) -> Dict[str, Any]:
        """Get inflation data"""
        raise Exception("economy_inflation not implemented in this deployment")
    
    # ===== News Tools =====
    
    async def _news_company(self, symbol: str, limit: int = 10, **kwargs) -> Dict[str, Any]:
        """Get company news"""
        try:
            ticker = yf.Ticker(symbol)
            news = list(getattr(ticker, "news", []) or [])
            return {
                "symbol": symbol,
                "count": min(len(news), int(limit)),
                "items": news[: int(limit)],
                "source": "yfinance",
                "fetchedAt": self._now_iso(),
            }
        except Exception as e:
            raise Exception(f"Failed to get news for {symbol}: {str(e)}")
    
    async def _news_world(self, limit: int = 10, **kwargs) -> Dict[str, Any]:
        """Get world news"""
        # `yfinance` doesn't provide a stable global feed without a ticker.
        return {
            "count": 0,
            "items": [],
            "note": "world news not implemented in this deployment",
            "source": "yfinance",
            "fetchedAt": self._now_iso(),
        }
    
    # ===== Helper Methods =====
    
    def _format_response(self, data: Any) -> Dict[str, Any]:
        """Backward-compat shim (no longer used)."""
        return {"data": data}


# Global client instance
_client: Optional[OpenBBClient] = None


def get_openbb_client() -> OpenBBClient:
    """Get or create OpenBB client instance"""
    global _client
    if _client is None:
        _client = OpenBBClient()
    return _client
