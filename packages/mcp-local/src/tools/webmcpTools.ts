/**
 * WebMCP Bridge Tools — Consumer mode for WebMCP-enabled websites.
 *
 * Mirrors mcpBridgeTools.ts pattern: Map-based connection registry,
 * connect/list/call/disconnect lifecycle. The key difference is the
 * transport: Playwright browser pages instead of StdioClientTransport.
 *
 * Discovery: addInitScript intercepts navigator.modelContext.provideContext()
 * and registerTool() BEFORE page code runs, capturing tool metadata.
 *
 * Security: SSRF checks on URLs, arg pattern scanning, result anomaly
 * detection — reusing proven patterns from OpenClaw proxyTools.
 */

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { McpTool } from "../types.js";

// ── Lazy Playwright import (optional dependency) ────────────────────────

let _playwright: any = null;
let _playwrightChecked = false;

function getPlaywright(): any {
  if (_playwrightChecked) return _playwright;
  _playwrightChecked = true;
  try {
    const req = createRequire(import.meta.url);
    _playwright = req("playwright");
  } catch {
    _playwright = null;
  }
  return _playwright;
}

function isPlaywrightInstalled(): boolean {
  try {
    const req = createRequire(import.meta.url);
    req.resolve("playwright");
    return true;
  } catch {
    return false;
  }
}

function isPlaywrightAvailable(): boolean {
  return getPlaywright() !== null;
}

// ── SSRF / URL Validation (inline, mirrors mcpSecurity.ts) ─────────────

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^fc00:/i,
  /^fe80:/i,
  /^::1$/,
  /^localhost$/i,
];

function validateOriginUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return { valid: false, reason: "HTTPS required — WebMCP requires a secure context" };
    }
    const host = parsed.hostname;
    for (const p of PRIVATE_IP_PATTERNS) {
      if (p.test(host)) {
        return { valid: false, reason: `Blocked: private/loopback address '${host}'` };
      }
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: `Invalid URL: '${url}'` };
  }
}

// ── Security Scanners (lightweight, from OpenClaw patterns) ─────────────

const SUSPICIOUS_ARG_PATTERNS = [
  /\b(rm\s+-rf|del\s+\/[sf]|format\s+c:)/i,
  /\b(eval|exec|system|popen)\s*\(/i,
  /;\s*(curl|wget|nc|ncat)\s/i,
  /\|\s*(bash|sh|cmd|powershell)\b/i,
  /\$\{.*\}/,  // template injection
];

function scanArgs(args: unknown): string | null {
  const str = JSON.stringify(args);
  for (const p of SUSPICIOUS_ARG_PATTERNS) {
    if (p.test(str)) return `Suspicious argument pattern: ${p.source}`;
  }
  return null;
}

const ANOMALY_PATTERNS = [
  /\b(api_key|apikey|secret_key|access_token|auth_token)\s*[:=]\s*\S{8,}/i,
  /\b(password|passwd)\s*[:=]\s*\S+/i,
  /\b(AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bghp_[a-zA-Z0-9]{36}\b/,
  /\bsk-[a-zA-Z0-9]{20,}\b/,
  /\bnpm_[a-zA-Z0-9]{36}\b/,
  /\/(etc\/passwd|etc\/shadow|\.ssh\/|\.aws\/)/i,
  /[A-Za-z0-9+/=]{500,}/,  // large base64 blob (potential exfiltration)
];

function scanResult(result: unknown): string | null {
  const str = typeof result === "string" ? result : JSON.stringify(result);
  for (const p of ANOMALY_PATTERNS) {
    if (p.test(str)) return `Anomaly in result: ${p.source}`;
  }
  return null;
}

// ── Connection Registry ─────────────────────────────────────────────────

interface WebMcpToolInfo {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}

interface WebMcpConnection {
  origin: string;
  label: string;
  browser: any;    // Playwright Browser
  page: any;       // Playwright Page
  tools: WebMcpToolInfo[];
  connectedAt: string;
}

const _webmcpConnections = new Map<string, WebMcpConnection>();

// For testing: reset all connections
export function _resetConnectionsForTesting(): void {
  _webmcpConnections.clear();
}

// ── Discovery Script (injected before page load) ────────────────────────

const DISCOVERY_INIT_SCRIPT = `
(() => {
  window.__webmcp_tools = [];
  window.__webmcp_executors = new Map();

  // Polyfill navigator.modelContext if not present (for testing / pre-spec browsers)
  if (!navigator.modelContext) {
    navigator.modelContext = {
      provideContext: () => {},
      registerTool: () => {},
    };
  }

  const mc = navigator.modelContext;
  const origProvide = mc.provideContext?.bind(mc);
  const origRegister = mc.registerTool?.bind(mc);

  mc.provideContext = function(opts) {
    if (opts && opts.tools) {
      for (const t of opts.tools) {
        window.__webmcp_tools.push({
          name: t.name || 'unnamed',
          description: t.description || '',
          inputSchema: t.inputSchema || null,
          annotations: t.annotations || null,
        });
        if (t.execute) window.__webmcp_executors.set(t.name, t.execute);
      }
    }
    return origProvide ? origProvide(opts) : undefined;
  };

  mc.registerTool = function(t) {
    window.__webmcp_tools.push({
      name: t.name || 'unnamed',
      description: t.description || '',
      inputSchema: t.inputSchema || null,
      annotations: t.annotations || null,
    });
    if (t.execute) window.__webmcp_executors.set(t.name, t.execute);
    return origRegister ? origRegister(t) : undefined;
  };
})();
`;

// ── Filesystem cache ────────────────────────────────────────────────────

function getWebmcpCacheDir(): string {
  const dir = join(homedir(), ".nodebench", "webmcp_cache");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function cacheOriginTools(origin: string, tools: WebMcpToolInfo[]): string {
  const dir = getWebmcpCacheDir();
  const safe = origin.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = join(dir, `${safe}.json`);
  writeFileSync(path, JSON.stringify({ origin, tools, cachedAt: Date.now() }, null, 2), "utf-8");
  return path;
}

function readCachedOriginTools(origin: string): { tools: WebMcpToolInfo[]; cachedAt: number } | null {
  const dir = getWebmcpCacheDir();
  const safe = origin.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = join(dir, `${safe}.json`);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    return { tools: data.tools ?? [], cachedAt: data.cachedAt ?? 0 };
  } catch {
    return null;
  }
}

// ── Tools ───────────────────────────────────────────────────────────────

export const webmcpTools: McpTool[] = [
  // ────────────────────────────────────────────────────────────────────────
  // 1. connect_webmcp_origin
  // ────────────────────────────────────────────────────────────────────────
  {
    name: "connect_webmcp_origin",
    description:
      "Connect to a WebMCP-enabled website via Playwright. Navigates to the URL, intercepts navigator.modelContext tool registrations, and makes discovered tools available for invocation via call_webmcp_tool. Requires Playwright (npm install playwright && npx playwright install chromium). Use check_webmcp_setup to verify prerequisites.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL of the WebMCP-enabled site (HTTPS required)",
        },
        label: {
          type: "string",
          description: "Human-readable label for this origin (default: derived from hostname)",
        },
        headless: {
          type: "boolean",
          description: "Run browser in headless mode (default: true)",
        },
        waitMs: {
          type: "number",
          description: "Milliseconds to wait after navigation for tool registration (default: 3000)",
        },
      },
      required: ["url"],
    },
    handler: async (args) => {
      const { url, label, headless = true, waitMs = 3000 } = args as {
        url: string;
        label?: string;
        headless?: boolean;
        waitMs?: number;
      };

      // Validate URL
      const validation = validateOriginUrl(url);
      if (!validation.valid) {
        return { success: false, error: true, message: validation.reason };
      }

      // Check Playwright
      const pw = getPlaywright();
      if (!pw) {
        return {
          success: false,
          error: true,
          message: "Playwright not installed.",
          setupInstructions: [
            "npm install playwright",
            "npx playwright install chromium",
          ],
          _hint: "Run check_webmcp_setup for detailed setup instructions.",
        };
      }

      const origin = new URL(url).origin;

      // Check if already connected
      if (_webmcpConnections.has(origin)) {
        const existing = _webmcpConnections.get(origin)!;
        return {
          success: true,
          alreadyConnected: true,
          origin,
          label: existing.label,
          toolCount: existing.tools.length,
          tools: existing.tools.map(t => ({ name: t.name, description: t.description.slice(0, 100) })),
          connectedAt: existing.connectedAt,
          _hint: `Already connected to '${origin}' with ${existing.tools.length} tools. Use call_webmcp_tool to invoke them.`,
        };
      }

      try {
        const browser = await pw.chromium.launch({ headless });
        const page = await browser.newPage();

        // Inject discovery script BEFORE navigation
        await page.addInitScript(DISCOVERY_INIT_SCRIPT);

        // Navigate
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

        // Wait for tool registrations
        await page.waitForTimeout(waitMs);

        // Extract discovered tools
        const tools: WebMcpToolInfo[] = await page.evaluate(() => {
          return (globalThis as any).__webmcp_tools ?? [];
        });

        const resolvedLabel = label ?? new URL(url).hostname;

        const connection: WebMcpConnection = {
          origin,
          label: resolvedLabel,
          browser,
          page,
          tools,
          connectedAt: new Date().toISOString(),
        };

        _webmcpConnections.set(origin, connection);

        // Cache tools for offline lookup
        cacheOriginTools(origin, tools);

        return {
          success: true,
          connected: true,
          origin,
          label: resolvedLabel,
          toolCount: tools.length,
          tools: tools.map(t => ({ name: t.name, description: t.description.slice(0, 100) })),
          _hint: tools.length > 0
            ? `Discovered ${tools.length} WebMCP tools. Use call_webmcp_tool({ origin: "${origin}", tool: "<name>", args: {} }) to invoke them.`
            : "No WebMCP tools found — the site may not support WebMCP or tools may load asynchronously. Try increasing waitMs.",
        };
      } catch (e: any) {
        return {
          success: false,
          error: true,
          message: `Failed to connect to '${url}': ${e.message}`,
          troubleshooting: [
            "1. Verify the site is accessible and uses HTTPS",
            "2. Check if the site registers WebMCP tools (navigator.modelContext)",
            "3. Try increasing waitMs if tools load asynchronously",
            "4. Ensure Playwright browsers are installed: npx playwright install chromium",
          ],
        };
      }
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // 2. list_webmcp_tools
  // ────────────────────────────────────────────────────────────────────────
  {
    name: "list_webmcp_tools",
    description:
      "List all tools discovered from connected WebMCP origins. Shows tool names, descriptions, and input schemas. Optionally filter by origin.",
    inputSchema: {
      type: "object",
      properties: {
        origin: {
          type: "string",
          description: "Filter by origin URL (omit to list all connected origins)",
        },
        verbose: {
          type: "boolean",
          description: "Include full input schemas (default: false)",
        },
      },
    },
    handler: async (args) => {
      const { origin, verbose } = args as { origin?: string; verbose?: boolean };

      if (_webmcpConnections.size === 0) {
        return {
          success: true,
          connected: false,
          message: "No WebMCP origins connected.",
          _hint: 'Connect first: connect_webmcp_origin({ url: "https://example.com" })',
        };
      }

      if (origin) {
        const conn = _webmcpConnections.get(origin);
        if (!conn) {
          return {
            success: false,
            error: true,
            message: `Origin '${origin}' not connected.`,
            connectedOrigins: [..._webmcpConnections.keys()],
          };
        }

        return {
          success: true,
          origin,
          label: conn.label,
          connectedAt: conn.connectedAt,
          toolCount: conn.tools.length,
          tools: verbose
            ? conn.tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema, annotations: t.annotations }))
            : conn.tools.map(t => ({ name: t.name, description: t.description.slice(0, 120) })),
        };
      }

      // All connected origins
      const origins: Record<string, unknown> = {};
      for (const [key, conn] of _webmcpConnections) {
        origins[key] = {
          label: conn.label,
          connectedAt: conn.connectedAt,
          toolCount: conn.tools.length,
          tools: conn.tools.map(t => t.name),
        };
      }
      return {
        success: true,
        connectedOrigins: _webmcpConnections.size,
        origins,
        totalTools: [..._webmcpConnections.values()].reduce((s, c) => s + c.tools.length, 0),
      };
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // 3. call_webmcp_tool
  // ────────────────────────────────────────────────────────────────────────
  {
    name: "call_webmcp_tool",
    description:
      "Invoke a WebMCP tool on a connected origin. The tool is executed in the browser page context via page.evaluate(). Args are validated for suspicious patterns and results are scanned for anomalies. Use list_webmcp_tools to see available tools first.",
    inputSchema: {
      type: "object",
      properties: {
        origin: {
          type: "string",
          description: "Origin URL of the connected site",
        },
        tool: {
          type: "string",
          description: "Tool name to invoke",
        },
        args: {
          type: "object",
          description: "Arguments to pass to the tool (matches the tool's inputSchema)",
        },
      },
      required: ["origin", "tool"],
    },
    handler: async (toolArgs) => {
      const { origin, tool, args } = toolArgs as {
        origin: string;
        tool: string;
        args?: Record<string, unknown>;
      };

      const conn = _webmcpConnections.get(origin);
      if (!conn) {
        return {
          success: false,
          error: true,
          message: `Origin '${origin}' not connected.`,
          connectedOrigins: [..._webmcpConnections.keys()],
          _hint: `Connect first: connect_webmcp_origin({ url: "${origin}" })`,
        };
      }

      // Validate tool exists
      const toolMeta = conn.tools.find(t => t.name === tool);
      if (!toolMeta) {
        const suggestions = conn.tools
          .filter(t => t.name.includes(tool) || tool.includes(t.name))
          .map(t => t.name)
          .slice(0, 5);

        return {
          success: false,
          error: true,
          message: `Tool '${tool}' not found on origin '${origin}'.`,
          availableTools: conn.tools.map(t => t.name),
          suggestions: suggestions.length > 0 ? suggestions : undefined,
        };
      }

      // Security: scan args
      const argWarning = scanArgs(args ?? {});
      if (argWarning) {
        return {
          success: false,
          error: true,
          message: `Blocked: ${argWarning}`,
          origin,
          tool,
        };
      }

      // Execute tool in page context
      const startMs = Date.now();
      try {
        const result = await conn.page.evaluate(
          async ({ toolName, toolArgs: tArgs }: { toolName: string; toolArgs: Record<string, unknown> }) => {
            const executor = (globalThis as any).__webmcp_executors?.get(toolName);
            if (!executor) return { __webmcp_error: `No executor for tool '${toolName}'` };
            try {
              return await executor(tArgs, {});
            } catch (e: any) {
              return { __webmcp_error: e.message ?? String(e) };
            }
          },
          { toolName: tool, toolArgs: args ?? {} },
        );
        const latencyMs = Date.now() - startMs;

        // Check for in-page error
        if (result && typeof result === "object" && "__webmcp_error" in result) {
          return {
            success: false,
            error: true,
            origin,
            tool,
            message: (result as any).__webmcp_error,
            latencyMs,
          };
        }

        // Security: scan result
        const anomaly = scanResult(result);
        if (anomaly) {
          return {
            success: false,
            error: true,
            message: `Result blocked — ${anomaly}`,
            origin,
            tool,
            latencyMs,
            _hint: "The tool result contained suspicious content and was blocked for safety.",
          };
        }

        return {
          success: true,
          origin,
          tool,
          result,
          latencyMs,
        };
      } catch (e: any) {
        return {
          success: false,
          error: true,
          origin,
          tool,
          message: `Tool call failed: ${e.message}`,
          latencyMs: Date.now() - startMs,
          _hint: "The browser page may have navigated away or crashed. Try disconnect + reconnect.",
        };
      }
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // 4. disconnect_webmcp_origin
  // ────────────────────────────────────────────────────────────────────────
  {
    name: "disconnect_webmcp_origin",
    description:
      "Disconnect from a WebMCP origin and close the browser page. Use this to clean up resources or to reconnect with different settings.",
    inputSchema: {
      type: "object",
      properties: {
        origin: {
          type: "string",
          description: "Origin URL to disconnect (omit to disconnect all)",
        },
      },
    },
    handler: async (args) => {
      const { origin } = args as { origin?: string };

      if (origin) {
        const conn = _webmcpConnections.get(origin);
        if (!conn) {
          return {
            success: true,
            message: `Origin '${origin}' was not connected.`,
            connectedOrigins: [..._webmcpConnections.keys()],
          };
        }

        try { await conn.page.close(); } catch { /* ignore */ }
        try { await conn.browser.close(); } catch { /* ignore */ }
        _webmcpConnections.delete(origin);

        return {
          success: true,
          disconnected: origin,
          remainingConnections: _webmcpConnections.size,
        };
      }

      // Disconnect all
      const origins = [..._webmcpConnections.keys()];
      for (const [key, conn] of _webmcpConnections) {
        try { await conn.page.close(); } catch { /* ignore */ }
        try { await conn.browser.close(); } catch { /* ignore */ }
      }
      _webmcpConnections.clear();

      return {
        success: true,
        disconnectedAll: true,
        origins,
        _hint: "All WebMCP connections closed.",
      };
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // 5. scan_webmcp_origin
  // ────────────────────────────────────────────────────────────────────────
  {
    name: "scan_webmcp_origin",
    description:
      "One-shot scan: connect to a WebMCP-enabled site, discover tools, cache the manifest, and disconnect. Useful for inventorying WebMCP tools without keeping a browser open. Results are cached to ~/.nodebench/webmcp_cache/.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL of the WebMCP-enabled site to scan (HTTPS required)",
        },
        waitMs: {
          type: "number",
          description: "Milliseconds to wait for tool registration (default: 3000)",
        },
      },
      required: ["url"],
    },
    handler: async (args) => {
      const { url, waitMs = 3000 } = args as { url: string; waitMs?: number };

      // Validate URL
      const validation = validateOriginUrl(url);
      if (!validation.valid) {
        return { success: false, error: true, message: validation.reason };
      }

      // Check Playwright
      const pw = getPlaywright();
      if (!pw) {
        // Fall back to cached data if available
        const origin = new URL(url).origin;
        const cached = readCachedOriginTools(origin);
        if (cached) {
          return {
            success: true,
            fromCache: true,
            origin,
            toolCount: cached.tools.length,
            tools: cached.tools.map(t => ({ name: t.name, description: t.description.slice(0, 100) })),
            cachedAt: new Date(cached.cachedAt).toISOString(),
            _hint: "Playwright not installed — returning cached results. Install Playwright for live scanning.",
          };
        }
        return {
          success: false,
          error: true,
          message: "Playwright not installed and no cached data available.",
          setupInstructions: ["npm install playwright", "npx playwright install chromium"],
        };
      }

      const origin = new URL(url).origin;

      try {
        const browser = await pw.chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.addInitScript(DISCOVERY_INIT_SCRIPT);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(waitMs);

        const tools: WebMcpToolInfo[] = await page.evaluate(() => {
          return (globalThis as any).__webmcp_tools ?? [];
        });

        await page.close();
        await browser.close();

        // Cache
        const cachePath = cacheOriginTools(origin, tools);

        return {
          success: true,
          origin,
          toolCount: tools.length,
          tools: tools.map(t => ({ name: t.name, description: t.description.slice(0, 100), hasInputSchema: !!t.inputSchema })),
          cachedTo: cachePath,
          _hint: tools.length > 0
            ? `Found ${tools.length} tools. Connect with connect_webmcp_origin to invoke them.`
            : "No WebMCP tools found. The site may not support WebMCP.",
        };
      } catch (e: any) {
        return {
          success: false,
          error: true,
          message: `Scan failed: ${e.message}`,
          origin,
        };
      }
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // 6. check_webmcp_setup
  // ────────────────────────────────────────────────────────────────────────
  {
    name: "check_webmcp_setup",
    description:
      "Check WebMCP prerequisites: Playwright installation, Chromium browser availability, and any cached origin data. Returns setup instructions if anything is missing.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      // Avoid a full optional dependency import here. The setup check only needs
      // a cheap readiness probe, not the Playwright runtime itself.
      const playwrightInstalled = isPlaywrightInstalled();

      // Check for Chromium
      let chromiumAvailable = false;
      if (playwrightInstalled) {
        try {
          const cacheDir = join(
            process.env.HOME ?? process.env.USERPROFILE ?? homedir(),
            ".cache",
            "ms-playwright",
          );
          chromiumAvailable = existsSync(cacheDir);
        } catch {
          chromiumAvailable = false;
        }
      }

      // Check cached origins
      const cacheDir = getWebmcpCacheDir();
      let cachedOrigins: string[] = [];
      try {
        cachedOrigins = readdirSync(cacheDir)
          .filter(f => f.endsWith(".json"))
          .map(f => f.replace(".json", "").replace(/_/g, "/"));
      } catch { /* ignore */ }

      // Active connections
      const activeConnections = [..._webmcpConnections.entries()].map(([origin, conn]) => ({
        origin,
        label: conn.label,
        toolCount: conn.tools.length,
        connectedAt: conn.connectedAt,
      }));

      const ready = playwrightInstalled && chromiumAvailable;

      return {
        success: true,
        ready,
        playwright: {
          installed: playwrightInstalled,
          chromiumAvailable,
        },
        activeConnections: activeConnections.length > 0 ? activeConnections : undefined,
        cachedOrigins: cachedOrigins.length > 0 ? cachedOrigins : undefined,
        setupInstructions: ready ? undefined : [
          ...(playwrightInstalled ? [] : ["1. Install Playwright: npm install playwright"]),
          ...(chromiumAvailable ? [] : ["2. Install Chromium: npx playwright install chromium"]),
        ],
        quickRef: {
          nextTools: ready
            ? ["connect_webmcp_origin", "scan_webmcp_origin"]
            : [],
          methodology: "webmcp_discovery",
          tip: ready
            ? "Playwright ready. Connect to a WebMCP-enabled site to discover tools."
            : "Install Playwright first, then connect to WebMCP origins.",
        },
      };
    },
  },
];
