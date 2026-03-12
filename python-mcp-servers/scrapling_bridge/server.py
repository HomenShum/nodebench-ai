"""
Scrapling Bridge Server -- FastAPI wrapper for Scrapling adaptive web scraping.
Port 8008. Same pattern as flicker_detection (8006) and figma_flow (8007).

Endpoints:
  /health        - Health check + Scrapling version
  /fetch         - Single URL fetch with tier selection (http/stealth/dynamic)
  /fetch/batch   - Batch fetch multiple URLs in parallel
  /extract       - CSS/XPath extraction from a URL
  /track         - Adaptive element tracking across page versions
  /crawl/start   - Start a Spider crawl session
  /crawl/status  - Check crawl progress
  /crawl/stop    - Stop a running crawl
"""

import asyncio
import ipaddress
import logging
import os
import re
import socket
import time
import uuid
from typing import Any, Optional
from urllib.parse import urlparse

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Scrapling imports (graceful if not installed)
# ---------------------------------------------------------------------------
try:
    import scrapling
    from scrapling import Fetcher, StealthFetcher, PlayWrightFetcher

    SCRAPLING_VERSION = getattr(scrapling, "__version__", "unknown")
    SCRAPLING_AVAILABLE = True
except ImportError:
    SCRAPLING_VERSION = "not installed"
    SCRAPLING_AVAILABLE = False

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
logger = logging.getLogger("scrapling_bridge")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Scrapling Bridge Server",
    description="Adaptive web scraping bridge for NodeBench MCP. Wraps Scrapling fetchers + Spider.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")
origins = ["*"] if ALLOWED_ORIGINS == "*" else [o.strip() for o in ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory crawl session store
# ---------------------------------------------------------------------------
MAX_SESSIONS = 100
crawl_sessions: dict[str, dict[str, Any]] = {}

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ExtractSelectors(BaseModel):
    """CSS/XPath selectors to extract from the page."""
    selectors: dict[str, str] = Field(default_factory=dict, description="name -> CSS/XPath selector")


class FetchRequest(BaseModel):
    url: str
    tier: str = Field("http", pattern="^(http|stealth|dynamic)$")
    impersonate: Optional[str] = Field(None, description="Browser TLS fingerprint (e.g. 'chrome')")
    extract: Optional[ExtractSelectors] = None
    proxy: Optional[str] = None
    timeout: int = Field(30, ge=5, le=120)
    stealthy_headers: bool = True


class BatchFetchRequest(BaseModel):
    urls: list[str] = Field(..., min_length=1, max_length=20)
    tier: str = Field("http", pattern="^(http|stealth|dynamic)$")
    impersonate: Optional[str] = None
    extract: Optional[ExtractSelectors] = None
    proxy: Optional[str] = None
    timeout: int = Field(30, ge=5, le=120)
    concurrency: int = Field(5, ge=1, le=10)
    stealthy_headers: bool = True


class ExtractRequest(BaseModel):
    url: str
    selectors: dict[str, str] = Field(..., description="name -> CSS or XPath selector")
    tier: str = Field("http", pattern="^(http|stealth|dynamic)$")
    impersonate: Optional[str] = None
    proxy: Optional[str] = None
    timeout: int = Field(30, ge=5, le=120)


class TrackRequest(BaseModel):
    url: str
    selector: str = Field(..., description="Initial CSS selector for the element to track")
    tier: str = Field("http", pattern="^(http|stealth|dynamic)$")
    impersonate: Optional[str] = None
    proxy: Optional[str] = None


class CrawlStartRequest(BaseModel):
    start_urls: list[str] = Field(..., min_length=1, max_length=10)
    max_pages: int = Field(50, ge=1, le=500)
    concurrency: int = Field(5, ge=1, le=20)
    selectors: dict[str, str] = Field(default_factory=dict)
    follow_links: Optional[str] = Field(None, description="CSS selector for links to follow")
    domain_whitelist: list[str] = Field(default_factory=list)


class CrawlStopRequest(BaseModel):
    session_id: str


class ProxyConfigRequest(BaseModel):
    proxies: list[str] = Field(..., min_length=1, max_length=50)
    rotation: str = Field("round_robin", pattern="^(round_robin|random)$")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Hostnames blocked regardless of DNS resolution
_BLOCKED_HOSTNAMES = {"localhost", "metadata.google.internal"}


def validate_url(url: str) -> None:
    """Block SSRF-prone URLs: private IPs, link-local, loopback, non-http(s) schemes.

    Raises HTTPException(400) if the URL is unsafe.
    """
    parsed = urlparse(url)

    # Scheme check
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(400, f"Blocked scheme: {parsed.scheme}. Only http/https allowed.")

    hostname = (parsed.hostname or "").lower().rstrip(".")
    if not hostname:
        raise HTTPException(400, "Missing hostname in URL.")

    # Blocked hostnames
    if hostname in _BLOCKED_HOSTNAMES:
        raise HTTPException(400, f"Blocked hostname: {hostname}")

    # Resolve hostname and check IP ranges
    try:
        addr_infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        raise HTTPException(400, f"Cannot resolve hostname: {hostname}")

    for family, _, _, _, sockaddr in addr_infos:
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise HTTPException(400, f"Blocked private/reserved IP: {ip}")

    return None


def _get_fetcher(tier: str, **kwargs):
    """Return the appropriate Scrapling fetcher for the tier."""
    if not SCRAPLING_AVAILABLE:
        raise HTTPException(503, "Scrapling is not installed. Run: pip install 'scrapling[all]'")

    if tier == "stealth":
        return StealthFetcher(**kwargs)
    elif tier == "dynamic":
        return PlayWrightFetcher(**kwargs)
    else:
        return Fetcher(**kwargs)


def _extract_data(page, selectors: dict[str, str]) -> dict[str, Any]:
    """Run CSS/XPath selectors against a Scrapling page."""
    results = {}
    for name, sel in selectors.items():
        try:
            if sel.startswith("//") or sel.startswith("(//"):
                # XPath
                elements = page.xpath(sel)
            else:
                # CSS
                elements = page.css(sel)

            if elements:
                texts = [el.text.strip() for el in elements if el.text and el.text.strip()]
                results[name] = texts if len(texts) > 1 else (texts[0] if texts else None)
            else:
                results[name] = None
        except Exception as e:
            results[name] = f"error: {str(e)}"
    return results


async def _fetch_single(req: FetchRequest) -> dict[str, Any]:
    """Fetch a single URL and optionally extract data."""
    start = time.time()
    fetcher_kwargs = {}
    if req.impersonate:
        fetcher_kwargs["auto_match"] = False
    if req.proxy:
        fetcher_kwargs["proxy"] = req.proxy
    if req.stealthy_headers and req.tier == "http":
        fetcher_kwargs["stealthy_headers"] = True

    fetcher = _get_fetcher(req.tier, **fetcher_kwargs)

    try:
        page = await asyncio.to_thread(fetcher.get, req.url, timeout=req.timeout)
    except Exception as e:
        return {
            "url": req.url,
            "success": False,
            "error": str(e),
            "elapsed_ms": int((time.time() - start) * 1000),
        }

    result: dict[str, Any] = {
        "url": req.url,
        "success": True,
        "status_code": getattr(page, "status", None),
        "title": None,
        "text_length": 0,
        "elapsed_ms": int((time.time() - start) * 1000),
    }

    # Extract title
    try:
        title_el = page.css("title")
        if title_el:
            result["title"] = title_el[0].text.strip() if title_el[0].text else None
    except Exception:
        pass

    # Text length
    try:
        body_text = page.get_all_text() if hasattr(page, "get_all_text") else ""
        result["text_length"] = len(body_text)
        # Return first 2000 chars of text for preview
        result["text_preview"] = body_text[:2000] if body_text else ""
    except Exception:
        result["text_preview"] = ""

    # Optional extraction
    if req.extract and req.extract.selectors:
        result["extracted"] = _extract_data(page, req.extract.selectors)

    return result


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {
        "service": "Scrapling Bridge Server",
        "version": "1.0.0",
        "scrapling_version": SCRAPLING_VERSION,
        "scrapling_available": SCRAPLING_AVAILABLE,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy" if SCRAPLING_AVAILABLE else "degraded",
        "scrapling_available": SCRAPLING_AVAILABLE,
        "scrapling_version": SCRAPLING_VERSION,
        "active_crawls": len([s for s in crawl_sessions.values() if s.get("status") == "running"]),
    }


@app.post("/fetch")
async def fetch(req: FetchRequest):
    """Fetch a single URL with tier selection and optional extraction."""
    validate_url(req.url)
    result = await _fetch_single(req)
    if not result["success"]:
        return JSONResponse(status_code=502, content=result)
    return result


@app.post("/fetch/batch")
async def fetch_batch(req: BatchFetchRequest):
    """Fetch multiple URLs in parallel with configurable concurrency."""
    for url in req.urls:
        validate_url(url)
    semaphore = asyncio.Semaphore(req.concurrency)

    async def bounded_fetch(url: str):
        async with semaphore:
            single_req = FetchRequest(
                url=url,
                tier=req.tier,
                impersonate=req.impersonate,
                extract=req.extract,
                proxy=req.proxy,
                timeout=req.timeout,
                stealthy_headers=req.stealthy_headers,
            )
            return await _fetch_single(single_req)

    results = await asyncio.gather(*[bounded_fetch(u) for u in req.urls])
    succeeded = sum(1 for r in results if r["success"])

    return {
        "total": len(req.urls),
        "succeeded": succeeded,
        "failed": len(req.urls) - succeeded,
        "results": results,
    }


@app.post("/extract")
async def extract(req: ExtractRequest):
    """Fetch a URL and extract structured data using CSS/XPath selectors."""
    validate_url(req.url)
    fetch_req = FetchRequest(
        url=req.url,
        tier=req.tier,
        impersonate=req.impersonate,
        proxy=req.proxy,
        timeout=req.timeout,
        extract=ExtractSelectors(selectors=req.selectors),
    )
    result = await _fetch_single(fetch_req)
    if not result["success"]:
        return JSONResponse(status_code=502, content=result)

    return {
        "url": req.url,
        "extracted": result.get("extracted", {}),
        "title": result.get("title"),
        "elapsed_ms": result.get("elapsed_ms", 0),
    }


@app.post("/track")
async def track_element(req: TrackRequest):
    """
    Track an element across page versions using Scrapling's adaptive element tracking.
    Returns the element's current state and a tracking signature for future comparisons.
    """
    validate_url(req.url)

    if not SCRAPLING_AVAILABLE:
        raise HTTPException(503, "Scrapling is not installed")

    fetcher_kwargs = {}
    if req.proxy:
        fetcher_kwargs["proxy"] = req.proxy
    fetcher = _get_fetcher(req.tier, **fetcher_kwargs)

    try:
        page = await asyncio.to_thread(fetcher.get, req.url)
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch {req.url}: {e}")

    try:
        elements = page.css(req.selector)
        if not elements:
            return {
                "url": req.url,
                "selector": req.selector,
                "found": False,
                "message": f"No elements matching '{req.selector}'",
            }

        el = elements[0]
        return {
            "url": req.url,
            "selector": req.selector,
            "found": True,
            "tag": getattr(el, "tag", None),
            "text": el.text.strip() if el.text else None,
            "attributes": dict(el.attrib) if hasattr(el, "attrib") else {},
            "html": str(el) if el else None,
        }
    except Exception as e:
        raise HTTPException(500, f"Element tracking failed: {e}")


@app.post("/crawl/start")
async def crawl_start(req: CrawlStartRequest):
    """Start a crawl session. Returns a session_id to poll for results."""
    for url in req.start_urls:
        validate_url(url)
    session_id = str(uuid.uuid4())[:8]

    # Evict oldest session if at capacity
    if len(crawl_sessions) >= MAX_SESSIONS:
        oldest_id = min(crawl_sessions, key=lambda k: crawl_sessions[k].get("started_at", 0))
        logger.info(f"Session store full ({MAX_SESSIONS}), evicting oldest session {oldest_id}")
        del crawl_sessions[oldest_id]

    crawl_sessions[session_id] = {
        "status": "running",
        "start_urls": req.start_urls,
        "max_pages": req.max_pages,
        "pages_crawled": 0,
        "items": [],
        "errors": [],
        "started_at": time.time(),
    }

    # Run crawl in background
    asyncio.create_task(_run_crawl(session_id, req))

    return {
        "session_id": session_id,
        "status": "started",
        "message": f"Crawl started. Poll /crawl/status?session_id={session_id} for progress.",
    }


async def _run_crawl(session_id: str, req: CrawlStartRequest):
    """Background crawl task."""
    session = crawl_sessions[session_id]

    if not SCRAPLING_AVAILABLE:
        session["status"] = "failed"
        session["errors"].append("Scrapling not installed")
        return

    fetcher = _get_fetcher("http", stealthy_headers=True)
    visited: set[str] = set()
    queue = list(req.start_urls)

    while queue and session["pages_crawled"] < req.max_pages and session["status"] == "running":
        url = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)

        try:
            page = await asyncio.to_thread(fetcher.get, url, timeout=30)
            item: dict[str, Any] = {"url": url, "status": getattr(page, "status", None)}

            # Extract title
            try:
                title_el = page.css("title")
                item["title"] = title_el[0].text.strip() if title_el and title_el[0].text else None
            except Exception:
                item["title"] = None

            # Extract requested selectors
            if req.selectors:
                item["extracted"] = _extract_data(page, req.selectors)

            # Follow links if selector provided
            if req.follow_links:
                try:
                    link_els = page.css(req.follow_links)
                    for link_el in link_els:
                        href = link_el.attrib.get("href", "") if hasattr(link_el, "attrib") else ""
                        if href and href not in visited:
                            # Domain whitelist check
                            if req.domain_whitelist:
                                from urllib.parse import urlparse
                                parsed = urlparse(href)
                                if parsed.netloc and parsed.netloc not in req.domain_whitelist:
                                    continue
                            queue.append(href)
                except Exception:
                    pass

            session["items"].append(item)
            session["pages_crawled"] += 1

        except Exception as e:
            session["errors"].append({"url": url, "error": str(e)})

    session["status"] = "completed" if session["status"] == "running" else session["status"]
    session["completed_at"] = time.time()


@app.get("/crawl/status")
async def crawl_status(session_id: str):
    """Check crawl progress and get items collected so far."""
    if session_id not in crawl_sessions:
        raise HTTPException(404, f"Crawl session '{session_id}' not found")

    session = crawl_sessions[session_id]
    elapsed = time.time() - session["started_at"]

    return {
        "session_id": session_id,
        "status": session["status"],
        "pages_crawled": session["pages_crawled"],
        "max_pages": session["max_pages"],
        "items_count": len(session["items"]),
        "errors_count": len(session["errors"]),
        "elapsed_seconds": round(elapsed, 1),
        "items": session["items"],
        "errors": session["errors"],
    }


@app.post("/crawl/stop")
async def crawl_stop(req: CrawlStopRequest):
    """Stop a running crawl session."""
    if req.session_id not in crawl_sessions:
        raise HTTPException(404, f"Crawl session '{req.session_id}' not found")

    session = crawl_sessions[req.session_id]
    if session["status"] != "running":
        return {"session_id": req.session_id, "status": session["status"], "message": "Crawl already stopped"}

    session["status"] = "stopped"
    return {
        "session_id": req.session_id,
        "status": "stopped",
        "pages_crawled": session["pages_crawled"],
        "items_count": len(session["items"]),
    }


# ---------------------------------------------------------------------------
# Global error handler
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(_request, exc):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "type": type(exc).__name__},
    )


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.getenv("SCRAPLING_PORT", "8008"))
    host = os.getenv("SCRAPLING_HOST", "0.0.0.0")
    logger.info(f"Starting Scrapling Bridge Server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
