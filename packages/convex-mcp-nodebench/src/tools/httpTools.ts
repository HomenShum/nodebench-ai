import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { getQuickRef } from "./toolRegistry.js";
import type { McpTool } from "../types.js";

// ── Helpers ──────────────────────────────────────────────────────────

function findConvexDir(projectDir: string): string | null {
  const candidates = [join(projectDir, "convex"), join(projectDir, "src", "convex")];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

// ── HTTP Endpoint Analysis ──────────────────────────────────────────

interface HttpRoute {
  path: string;
  method: string;
  line: number;
  handlerType: "inline" | "imported";
}

interface HttpIssue {
  severity: "critical" | "warning" | "info";
  message: string;
  location?: string;
}

function analyzeHttpEndpoints(convexDir: string): {
  hasHttp: boolean;
  routes: HttpRoute[];
  issues: HttpIssue[];
  hasCors: boolean;
  hasOptionsHandler: boolean;
} {
  const httpPath = join(convexDir, "http.ts");
  if (!existsSync(httpPath)) {
    return { hasHttp: false, routes: [], issues: [], hasCors: false, hasOptionsHandler: false };
  }

  const content = readFileSync(httpPath, "utf-8");
  const lines = content.split("\n");
  const routes: HttpRoute[] = [];
  const issues: HttpIssue[] = [];

  // Extract routes: http.route({ path: "...", method: "...", handler: ... })
  const routeBlockPattern = /http\.route\s*\(\s*\{/g;
  let routeMatch;
  while ((routeMatch = routeBlockPattern.exec(content)) !== null) {
    const startIdx = routeMatch.index;
    // Find the closing of this route block (rough — find next })
    let depth = 0;
    let endIdx = startIdx;
    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === "{") depth++;
      if (content[i] === "}") {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }
    const block = content.slice(startIdx, endIdx + 1);

    const pathMatch = block.match(/path\s*:\s*["']([^"']+)["']/);
    const methodMatch = block.match(/method\s*:\s*["']([^"']+)["']/);
    const line = content.slice(0, startIdx).split("\n").length;

    if (pathMatch && methodMatch) {
      routes.push({
        path: pathMatch[1],
        method: methodMatch[1].toUpperCase(),
        line,
        handlerType: /handler\s*:\s*httpAction/.test(block) ? "inline" : "imported",
      });
    }
  }

  // Check for duplicate routes (same path + method)
  const routeKeys = new Map<string, number>();
  for (const route of routes) {
    const key = `${route.method} ${route.path}`;
    const count = (routeKeys.get(key) || 0) + 1;
    routeKeys.set(key, count);
    if (count === 2) {
      issues.push({
        severity: "critical",
        message: `Duplicate route: ${key} — only the last registration will be used`,
        location: `http.ts:${route.line}`,
      });
    }
  }

  // Check for CORS handling
  const hasCors = /Access-Control-Allow-Origin/i.test(content) ||
    /cors/i.test(content);
  const hasOptionsHandler = routes.some((r) => r.method === "OPTIONS");

  if (!hasCors && routes.length > 0) {
    issues.push({
      severity: "warning",
      message: "No CORS headers detected. Browser requests from different origins will fail. Add Access-Control-Allow-Origin headers.",
    });
  }

  if (hasCors && !hasOptionsHandler) {
    issues.push({
      severity: "warning",
      message: "CORS headers found but no OPTIONS handler registered. Preflight requests will fail. Add http.route({ path: '...', method: 'OPTIONS', handler: ... }).",
    });
  }

  // Check for paths that look like they should be grouped
  const pathPrefixes = new Map<string, number>();
  for (const route of routes) {
    const parts = route.path.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const prefix = `/${parts[0]}/${parts[1]}`;
      pathPrefixes.set(prefix, (pathPrefixes.get(prefix) || 0) + 1);
    }
  }

  // Check for missing httpRouter import
  if (!/httpRouter/.test(content)) {
    issues.push({
      severity: "critical",
      message: "Missing httpRouter import. HTTP endpoints require: import { httpRouter } from 'convex/server';",
    });
  }

  // Check for export default
  if (!/export\s+default\s+http/.test(content)) {
    issues.push({
      severity: "critical",
      message: "Missing 'export default http'. The httpRouter must be exported as default.",
    });
  }

  // Check for httpAction import
  if (!/httpAction/.test(content) && routes.length > 0) {
    issues.push({
      severity: "warning",
      message: "No httpAction usage found. HTTP route handlers should use httpAction().",
    });
  }

  return { hasHttp: true, routes, issues, hasCors, hasOptionsHandler };
}

// ── Tool Definitions ────────────────────────────────────────────────

export const httpTools: McpTool[] = [
  {
    name: "convex_analyze_http",
    description:
      "Analyze convex/http.ts for HTTP endpoint issues: duplicate routes, missing CORS headers, missing OPTIONS preflight handlers, missing httpRouter/httpAction imports, and missing default export. Returns route inventory with methods and paths.",
    inputSchema: {
      type: "object",
      properties: {
        projectDir: {
          type: "string",
          description: "Absolute path to the project root containing a convex/ directory",
        },
      },
      required: ["projectDir"],
    },
    handler: async (args: { projectDir: string }) => {
      const projectDir = resolve(args.projectDir);
      const convexDir = findConvexDir(projectDir);
      if (!convexDir) {
        return { error: "No convex/ directory found" };
      }

      const result = analyzeHttpEndpoints(convexDir);
      if (!result.hasHttp) {
        return {
          hasHttp: false,
          message: "No convex/http.ts found — project has no HTTP endpoints",
          quickRef: getQuickRef("convex_analyze_http"),
        };
      }

      // Group routes by path prefix
      const byMethod: Record<string, number> = {};
      for (const r of result.routes) {
        byMethod[r.method] = (byMethod[r.method] || 0) + 1;
      }

      return {
        hasHttp: true,
        totalRoutes: result.routes.length,
        byMethod,
        hasCors: result.hasCors,
        hasOptionsHandler: result.hasOptionsHandler,
        routes: result.routes,
        issues: {
          total: result.issues.length,
          critical: result.issues.filter((i) => i.severity === "critical").length,
          warnings: result.issues.filter((i) => i.severity === "warning").length,
          details: result.issues,
        },
        quickRef: getQuickRef("convex_analyze_http"),
      };
    },
  },
];
