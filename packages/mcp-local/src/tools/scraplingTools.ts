/**
 * Scrapling tools — Adaptive web scraping via Scrapling Python bridge server.
 *
 * Calls the scrapling_bridge FastAPI server over HTTP (port 8008).
 * Requires SCRAPLING_SERVER_URL env var (default: http://localhost:8008).
 *
 * Tiers:
 *   http     — Basic HTTP fetch with stealthy headers
 *   stealth  — Anti-bot bypass (Cloudflare, TLS fingerprinting)
 *   dynamic  — Full browser rendering (Playwright)
 *
 * Note: Web scraping should comply with target site ToS. User responsibility.
 */

import type { McpTool } from "../types.js";
import { safeUrl } from "../security/index.js";

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

const DEFAULT_SERVER = "http://localhost:8008";

function getServerUrl(): string {
  return (process.env.SCRAPLING_SERVER_URL || DEFAULT_SERVER).replace(/\/$/, "");
}

async function scraplingRequest(
  endpoint: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<any> {
  const url = `${getServerUrl()}${endpoint}`;
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch (e: any) {
    return {
      error: true,
      message: `Scrapling bridge unreachable at ${url}: ${e.message}`,
      suggestion:
        "Ensure the Scrapling bridge server is running. Start with: cd python-mcp-servers/scrapling_bridge && uvicorn server:app --port 8008",
    };
  }
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const scraplingTools: McpTool[] = [
  // 1. scrapling_fetch
  {
    name: "scrapling_fetch",
    description:
      "Fetch a URL with adaptive scraping. Auto-selects fetcher tier: 'http' for public pages, 'stealth' for anti-bot bypass (Cloudflare, TLS fingerprinting), 'dynamic' for JS-rendered pages. Returns page title, text preview, status code. Optionally extract data inline with CSS/XPath selectors. Requires Scrapling bridge server (SCRAPLING_SERVER_URL, default localhost:8008). Web scraping must comply with target site ToS.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to fetch" },
        tier: {
          type: "string",
          enum: ["http", "stealth", "dynamic"],
          description: "Fetcher tier (default: http). Use 'stealth' for Cloudflare sites, 'dynamic' for JS-rendered pages.",
        },
        impersonate: {
          type: "string",
          description: "Browser TLS fingerprint to impersonate (e.g. 'chrome')",
        },
        extract: {
          type: "object",
          properties: {
            selectors: {
              type: "object",
              additionalProperties: { type: "string" },
              description: "Map of name -> CSS/XPath selector to extract",
            },
          },
          description: "Optional inline extraction selectors",
        },
        proxy: { type: "string", description: "Optional proxy URL" },
        timeout: { type: "number", description: "Request timeout in seconds (default: 30)" },
      },
      required: ["url"],
    },
    handler: async (params: any) => {
      // SSRF protection on the user-provided target URL (bridge server call is internal/localhost)
      safeUrl(params.url);

      return await scraplingRequest("/fetch", "POST", {
        url: params.url,
        tier: params.tier || "http",
        impersonate: params.impersonate,
        extract: params.extract,
        proxy: params.proxy,
        timeout: params.timeout || 30,
        stealthy_headers: true,
      });
    },
  },

  // 2. scrapling_extract
  {
    name: "scrapling_extract",
    description:
      "Extract structured data from a URL using CSS or XPath selectors. Zero LLM tokens — deterministic extraction. Use CSS selectors like 'h1::text', '.price::text', 'a[href]::attr(href)'. Use XPath for complex queries starting with '//'. Falls back to fetch_url + LLM extraction if selectors fail. Requires Scrapling bridge server.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to extract from" },
        selectors: {
          type: "object",
          additionalProperties: { type: "string" },
          description: "Map of field name -> CSS or XPath selector. E.g. { title: 'h1::text', prices: '.price::text' }",
        },
        tier: {
          type: "string",
          enum: ["http", "stealth", "dynamic"],
          description: "Fetcher tier (default: http)",
        },
        impersonate: { type: "string", description: "Browser fingerprint" },
        proxy: { type: "string", description: "Optional proxy URL" },
      },
      required: ["url", "selectors"],
    },
    handler: async (params: any) => {
      // SSRF protection on the user-provided target URL
      safeUrl(params.url);

      return await scraplingRequest("/extract", "POST", {
        url: params.url,
        selectors: params.selectors,
        tier: params.tier || "http",
        impersonate: params.impersonate,
        proxy: params.proxy,
        timeout: params.timeout || 30,
      });
    },
  },

  // 3. scrapling_batch_fetch
  {
    name: "scrapling_batch_fetch",
    description:
      "Fetch multiple URLs in parallel with configurable concurrency. Use for competitive analysis, multi-source research, or batch data collection. Up to 20 URLs, 1-10 concurrent fetches. Each URL gets the same tier/proxy config. Returns per-URL results with success/failure status. Requires Scrapling bridge server.",
    inputSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "URLs to fetch (1-20)",
        },
        tier: {
          type: "string",
          enum: ["http", "stealth", "dynamic"],
          description: "Fetcher tier for all URLs (default: http)",
        },
        concurrency: {
          type: "number",
          description: "Max parallel fetches (default: 5, max: 10)",
        },
        extract: {
          type: "object",
          properties: {
            selectors: {
              type: "object",
              additionalProperties: { type: "string" },
            },
          },
          description: "Optional extraction selectors applied to all URLs",
        },
        impersonate: { type: "string" },
        proxy: { type: "string" },
        timeout: { type: "number" },
      },
      required: ["urls"],
    },
    handler: async (params: any) => {
      // SSRF protection — validate every user-provided URL in the batch
      for (const u of params.urls) {
        safeUrl(u);
      }

      return await scraplingRequest("/fetch/batch", "POST", {
        urls: params.urls,
        tier: params.tier || "http",
        concurrency: params.concurrency || 5,
        extract: params.extract,
        impersonate: params.impersonate,
        proxy: params.proxy,
        timeout: params.timeout || 30,
        stealthy_headers: true,
      });
    },
  },

  // 4. scrapling_track_element
  {
    name: "scrapling_track_element",
    description:
      "Track an element across page versions using Scrapling's adaptive element relocation. Survives CSS class renames, DOM restructuring, and layout changes. Use for price monitoring, content change detection, or element stability checks. Returns element tag, text, attributes, and HTML. Requires Scrapling bridge server.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL of the page" },
        selector: { type: "string", description: "CSS selector for the element to track" },
        tier: {
          type: "string",
          enum: ["http", "stealth", "dynamic"],
          description: "Fetcher tier (default: http)",
        },
        impersonate: { type: "string" },
        proxy: { type: "string" },
      },
      required: ["url", "selector"],
    },
    handler: async (params: any) => {
      // SSRF protection on the user-provided target URL
      safeUrl(params.url);

      return await scraplingRequest("/track", "POST", {
        url: params.url,
        selector: params.selector,
        tier: params.tier || "http",
        impersonate: params.impersonate,
        proxy: params.proxy,
      });
    },
  },

  // 5. scrapling_crawl
  {
    name: "scrapling_crawl",
    description:
      "Start a multi-page spider crawl with extraction. Crawls from start URLs, follows links matching a CSS selector, extracts data per page. Returns a session_id to poll with scrapling_crawl_status. Max 500 pages, 1-20 concurrent. Domain whitelist enforced. Use for SEC filing crawls, news aggregation, or site-wide data collection. Requires Scrapling bridge server.",
    inputSchema: {
      type: "object",
      properties: {
        start_urls: {
          type: "array",
          items: { type: "string" },
          description: "URLs to start crawling from (1-10)",
        },
        max_pages: {
          type: "number",
          description: "Max pages to crawl (default: 50, max: 500)",
        },
        concurrency: {
          type: "number",
          description: "Concurrent fetches (default: 5, max: 20)",
        },
        selectors: {
          type: "object",
          additionalProperties: { type: "string" },
          description: "CSS/XPath selectors to extract from each page",
        },
        follow_links: {
          type: "string",
          description: "CSS selector for links to follow (e.g. '.pagination a')",
        },
        domain_whitelist: {
          type: "array",
          items: { type: "string" },
          description: "Only follow links to these domains",
        },
      },
      required: ["start_urls"],
    },
    handler: async (params: any) => {
      // SSRF protection — validate every user-provided start URL
      for (const u of params.start_urls) {
        safeUrl(u);
      }

      return await scraplingRequest("/crawl/start", "POST", {
        start_urls: params.start_urls,
        max_pages: params.max_pages || 50,
        concurrency: params.concurrency || 5,
        selectors: params.selectors || {},
        follow_links: params.follow_links,
        domain_whitelist: params.domain_whitelist || [],
      });
    },
  },

  // 6. scrapling_crawl_status
  {
    name: "scrapling_crawl_status",
    description:
      "Check crawl progress and get collected items. Pass the session_id from scrapling_crawl. Returns status (running/completed/stopped), pages crawled, items with extracted data, and errors. Poll periodically until status is 'completed'. Requires Scrapling bridge server.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Crawl session ID from scrapling_crawl" },
      },
      required: ["session_id"],
    },
    handler: async (params: any) => {
      return await scraplingRequest(`/crawl/status?session_id=${encodeURIComponent(params.session_id)}`, "GET");
    },
  },

  // 7. scrapling_crawl_stop
  {
    name: "scrapling_crawl_stop",
    description:
      "Stop a running crawl session. Pass the session_id from scrapling_crawl. Items collected so far are preserved. Use when you have enough data or need to abort. Requires Scrapling bridge server.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Crawl session ID to stop" },
      },
      required: ["session_id"],
    },
    handler: async (params: any) => {
      return await scraplingRequest("/crawl/stop", "POST", {
        session_id: params.session_id,
      });
    },
  },
];
