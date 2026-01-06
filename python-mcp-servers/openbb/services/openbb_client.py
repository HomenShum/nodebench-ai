"""
OpenBB SDK Client Wrapper
Provides a clean interface to OpenBB Platform functionality
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx
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

    def _yahoo_headers(self) -> Dict[str, str]:
        # Yahoo often blocks "unknown" clients; set a realistic UA.
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/json,text/plain,*/*",
            "Accept-Language": "en-US,en;q=0.9",
        }

    async def _fetch_stooq_quote(self, symbol: str) -> Dict[str, Any]:
        """
        Fetch a quote from Stooq (free CSV endpoint).

        Example:
          https://stooq.com/q/l/?s=crm.us&f=sd2t2ohlcv&h&e=csv
        """
        stooq_symbol = symbol.strip()
        if not stooq_symbol:
            raise Exception("Missing symbol")

        # Stooq uses market suffixes like ".us" for US equities.
        if "." not in stooq_symbol:
            stooq_symbol = f"{stooq_symbol}.us"

        url = "https://stooq.com/q/l/"
        params = {"s": stooq_symbol.lower(), "f": "sd2t2ohlcv", "h": "1", "e": "csv"}

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)

        if resp.status_code != 200:
            raise Exception(f"Stooq quote HTTP {resp.status_code}")

        lines = [ln.strip() for ln in (resp.text or "").splitlines() if ln.strip()]
        if len(lines) < 2:
            raise Exception("Stooq quote returned no rows")

        header = [h.strip() for h in lines[0].split(",")]
        row = [c.strip() for c in lines[1].split(",")]
        if len(row) != len(header):
            raise Exception("Stooq quote CSV column mismatch")

        data = dict(zip(header, row))
        close = data.get("Close")
        if not close or close.upper() == "N/D":
            raise Exception("Stooq quote missing Close")

        def to_float(value: Optional[str]) -> Optional[float]:
            if value is None:
                return None
            v = value.strip()
            if not v or v.upper() == "N/D":
                return None
            try:
                return float(v)
            except Exception:
                return None

        def to_int(value: Optional[str]) -> Optional[int]:
            if value is None:
                return None
            v = value.strip()
            if not v or v.upper() == "N/D":
                return None
            try:
                return int(float(v))
            except Exception:
                return None

        return {
            "symbol": symbol,
            "stooqSymbol": data.get("Symbol") or stooq_symbol,
            "date": data.get("Date"),
            "time": data.get("Time"),
            "open": to_float(data.get("Open")),
            "high": to_float(data.get("High")),
            "low": to_float(data.get("Low")),
            "close": to_float(data.get("Close")),
            "volume": to_int(data.get("Volume")),
        }

    async def _fetch_yahoo_quote(self, symbol: str) -> Dict[str, Any]:
        """
        Fetch quote fields directly from Yahoo Finance's public quote endpoint.

        This avoids `yfinance` returning `None` fields in certain hosted/containerized environments.
        """
        url = "https://query1.finance.yahoo.com/v7/finance/quote"
        params = {"symbols": symbol}

        async with httpx.AsyncClient(timeout=15.0, headers=self._yahoo_headers()) as client:
            resp = await client.get(url, params=params)

        if resp.status_code != 200:
            raise Exception(f"Yahoo quote HTTP {resp.status_code}")

        payload = resp.json()
        result = (payload or {}).get("quoteResponse", {}).get("result", []) or []
        if not result:
            raise Exception("Yahoo quote returned no results")

        q = result[0] or {}
        return q

    def _parse_world_bank_series(self, payload: Any) -> Dict[str, Any]:
        """
        World Bank API returns: [metadata, [dataPoints...]]
        Pick the most recent non-null value.
        """
        if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[1], list):
            raise Exception("Unexpected World Bank payload shape")

        points = payload[1]
        for p in points:
            if not isinstance(p, dict):
                continue
            value = p.get("value")
            if value is None:
                continue
            return {
                "value": value,
                "date": p.get("date"),
                "country": (p.get("country") or {}).get("value"),
                "indicator": (p.get("indicator") or {}).get("value"),
            }
        raise Exception("No non-null datapoints returned")
    
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
            # Prefer Stooq in hosted environments (no auth, predictable response format).
            try:
                stooq = await self._fetch_stooq_quote(symbol)
                if stooq.get("close") is not None:
                    return {
                        "symbol": symbol,
                        "price": stooq.get("close"),
                        "currency": "USD",
                        "marketCap": None,
                        "dayHigh": stooq.get("high"),
                        "dayLow": stooq.get("low"),
                        "previousClose": None,
                        "open": stooq.get("open"),
                        "volume": stooq.get("volume"),
                        "source": "stooq",
                        "fetchedAt": self._now_iso(),
                        "asOf": stooq.get("date"),
                    }
            except Exception:
                pass

            # Fall back to Yahoo quote endpoint (may be blocked in some environments).
            q = await self._fetch_yahoo_quote(symbol)
            price = q.get("regularMarketPrice")
            if price is None:
                raise Exception("Yahoo quote missing regularMarketPrice")
            return {
                "symbol": symbol,
                "price": price,
                "currency": q.get("currency"),
                "marketCap": q.get("marketCap"),
                "dayHigh": q.get("regularMarketDayHigh"),
                "dayLow": q.get("regularMarketDayLow"),
                "previousClose": q.get("regularMarketPreviousClose"),
                "open": q.get("regularMarketOpen"),
                "volume": q.get("regularMarketVolume"),
                "source": "yahoo_finance_quote",
                "fetchedAt": self._now_iso(),
            }
        except Exception as e:
            # Final fallback: yfinance (kept for parity, may still fail silently in some hosts).
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info or {}
                price = self._pick_first(
                    info.get("regularMarketPrice"),
                    info.get("currentPrice"),
                    info.get("previousClose"),
                )
                if price is None:
                    raise Exception("yfinance missing price")
                return {
                    "symbol": symbol,
                    "price": price,
                    "currency": info.get("currency"),
                    "marketCap": info.get("marketCap"),
                    "dayHigh": info.get("dayHigh") or info.get("regularMarketDayHigh"),
                    "dayLow": info.get("dayLow") or info.get("regularMarketDayLow"),
                    "previousClose": info.get("previousClose") or info.get("regularMarketPreviousClose"),
                    "open": info.get("open") or info.get("regularMarketOpen"),
                    "volume": info.get("volume") or info.get("regularMarketVolume"),
                    "source": "yfinance",
                    "fetchedAt": self._now_iso(),
                }
            except Exception as yf_err:
                raise Exception(f"Failed to get quote for {symbol}: {str(e)}; yfinance fallback: {str(yf_err)}")
    
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

            if points:
                return {
                    "symbol": symbol,
                    "count": len(points),
                    "points": points,
                    "source": "yfinance",
                    "fetchedAt": self._now_iso(),
                }
        except Exception:
            # Fall through to Stooq fallback.
            pass

        # Stooq fallback (works well in hosted environments).
        try:
            stooq_symbol = symbol.strip()
            if "." not in stooq_symbol:
                stooq_symbol = f"{stooq_symbol}.us"

            url = "https://stooq.com/q/d/l/"
            params = {"s": stooq_symbol.lower(), "i": "d"}

            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(url, params=params)

            if resp.status_code != 200:
                raise Exception(f"Stooq historical HTTP {resp.status_code}")

            lines = [ln.strip() for ln in (resp.text or "").splitlines() if ln.strip()]
            if len(lines) < 2:
                raise Exception("Stooq historical returned no rows")

            header = [h.strip() for h in lines[0].split(",")]
            date_idx = header.index("Date") if "Date" in header else -1
            open_idx = header.index("Open") if "Open" in header else -1
            high_idx = header.index("High") if "High" in header else -1
            low_idx = header.index("Low") if "Low" in header else -1
            close_idx = header.index("Close") if "Close" in header else -1
            volume_idx = header.index("Volume") if "Volume" in header else -1
            if min(date_idx, open_idx, high_idx, low_idx, close_idx, volume_idx) < 0:
                raise Exception("Stooq historical missing required columns")

            out_points = []
            for ln in lines[1:]:
                cols = [c.strip() for c in ln.split(",")]
                if len(cols) < len(header):
                    continue
                dt = cols[date_idx]
                if start_date and dt < start_date:
                    continue
                if end_date and dt > end_date:
                    continue
                if cols[close_idx].upper() == "N/D":
                    continue
                try:
                    out_points.append(
                        {
                            "t": dt,
                            "open": float(cols[open_idx]) if cols[open_idx].upper() != "N/D" else None,
                            "high": float(cols[high_idx]) if cols[high_idx].upper() != "N/D" else None,
                            "low": float(cols[low_idx]) if cols[low_idx].upper() != "N/D" else None,
                            "close": float(cols[close_idx]) if cols[close_idx].upper() != "N/D" else None,
                            "volume": int(float(cols[volume_idx])) if cols[volume_idx].upper() != "N/D" else None,
                        }
                    )
                except Exception:
                    continue

            return {
                "symbol": symbol,
                "count": len(out_points),
                "points": out_points,
                "source": "stooq",
                "fetchedAt": self._now_iso(),
            }
        except Exception as e:
            raise Exception(f"Failed to get historical data for {symbol}: {str(e)}")
    
    async def _equity_fundamental_overview(self, symbol: str, **kwargs) -> Dict[str, Any]:
        """Get company fundamental overview"""
        quote: Optional[Dict[str, Any]] = None
        quote_error: Optional[str] = None
        try:
            # Always include a "quote" view via our Stooq-based implementation (reliable, no key).
            quote = await self._equity_price_quote(symbol=symbol, **kwargs)
        except Exception as e:
            quote_error = str(e)

        info: Dict[str, Any] = {}
        info_error: Optional[str] = None
        try:
            # Best-effort enrichment via yfinance (can be sparse / rate-limited).
            ticker = yf.Ticker(symbol)
            info = dict(getattr(ticker, "info", {}) or {})
        except Exception as e:
            info_error = str(e)

        if quote is None:
            raise Exception(f"Failed to get fundamentals for {symbol}: quote unavailable ({quote_error or 'unknown error'})")

        # Backward-compatible fields (existing clients expect these keys).
        overview: Dict[str, Any] = {
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
            # Added: quote snapshot (always present when successful).
            "price": quote.get("price"),
            "currency": quote.get("currency"),
            "dayHigh": quote.get("dayHigh"),
            "dayLow": quote.get("dayLow"),
            "volume": quote.get("volume"),
            "asOf": quote.get("asOf"),
            # Metadata
            "source": "mixed",
            "quoteSource": quote.get("source"),
            "partial": False,
            "errors": {},
            "fetchedAt": self._now_iso(),
        }

        missing_yf = [
            k
            for k in [
                "longName",
                "sector",
                "industry",
                "website",
                "marketCap",
                "trailingPE",
                "forwardPE",
                "priceToBook",
                "beta",
                "dividendYield",
            ]
            if overview.get(k) is None
        ]
        if missing_yf:
            overview["partial"] = True
            overview["errors"]["yfinance_missing_fields"] = missing_yf

        if info_error:
            overview["partial"] = True
            overview["errors"]["yfinance_error"] = info_error
        if quote_error:
            overview["errors"]["quote_error"] = quote_error

        return overview
    
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
        try:
            # GDP (current US$) indicator: NY.GDP.MKTP.CD
            url = f"https://api.worldbank.org/v2/country/{country}/indicator/NY.GDP.MKTP.CD"
            params = {"format": "json", "per_page": 10}
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params)
            if resp.status_code != 200:
                raise Exception(f"World Bank HTTP {resp.status_code}")
            parsed = resp.json()
            point = self._parse_world_bank_series(parsed)
            return {
                "country": country,
                "value": point.get("value"),
                "year": point.get("date"),
                "unit": "USD",
                "source": "world_bank",
                "fetchedAt": self._now_iso(),
            }
        except Exception as e:
            raise Exception(f"Failed to get GDP for {country}: {str(e)}")
    
    async def _economy_inflation(self, country: str = "US", **kwargs) -> Dict[str, Any]:
        """Get inflation data"""
        try:
            # Inflation, consumer prices (annual %) indicator: FP.CPI.TOTL.ZG
            url = f"https://api.worldbank.org/v2/country/{country}/indicator/FP.CPI.TOTL.ZG"
            params = {"format": "json", "per_page": 10}
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params)
            if resp.status_code != 200:
                raise Exception(f"World Bank HTTP {resp.status_code}")
            parsed = resp.json()
            point = self._parse_world_bank_series(parsed)
            return {
                "country": country,
                "value": point.get("value"),
                "year": point.get("date"),
                "unit": "percent",
                "source": "world_bank",
                "fetchedAt": self._now_iso(),
            }
        except Exception as e:
            raise Exception(f"Failed to get inflation for {country}: {str(e)}")
    
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
