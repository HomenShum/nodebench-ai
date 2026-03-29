/**
 * Sitemap Tools — Interactive site map with stateful drill-down + diff crawl + test suggestion
 *
 * Provides retention.sh-style interactive site exploration:
 *   site_map({ url }) → crawl, store session
 *   site_map({ action: 'overview' }) → navigation graph
 *   site_map({ action: 'screen', index: N }) → drill into page
 *   site_map({ action: 'screenshot', index: N }) → return screenshot
 *   site_map({ action: 'findings' }) → QA findings
 *
 *   diff_crawl({ url }) → baseline or compare
 *   suggest_tests({ session_id }) → generate test cases from crawl
 */

import type { McpTool, ContentBlock } from "../types.js";

// ─── Session state (bounded) ──────────────────────────────────────────────────

interface CrawlPage {
  url: string;
  title: string;
  status: number;
  interactiveElements: number;
  outgoingLinks: string[];
  consoleErrors: string[];
  screenshot?: string; // base64 jpeg
}

interface SitemapSession {
  id: string;
  baseUrl: string;
  pages: CrawlPage[];
  crawledAt: number;
  findings: Array<{ severity: "error" | "warning" | "info"; message: string; pageIndex?: number }>;
}

const MAX_SESSIONS = 20;
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const sessions = new Map<string, SitemapSession>();

function evictStaleSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.crawledAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
  // Hard cap
  while (sessions.size > MAX_SESSIONS) {
    const oldest = sessions.keys().next().value;
    if (oldest) sessions.delete(oldest);
  }
}

function genSessionId(): string {
  return `sm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Lightweight crawler (no external deps) ───────────────────────────────────

async function crawlSite(baseUrl: string, maxPages: number = 30): Promise<CrawlPage[]> {
  const visited = new Set<string>();
  const pages: CrawlPage[] = [];
  const queue: string[] = [baseUrl];
  const { URL } = await import("node:url");
  const baseHost = new URL(baseUrl).hostname;

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift()!;
    const normalized = url.split("#")[0].split("?")[0]; // strip hash/query for dedup
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "NodeBench-SiteMap/1.0" },
        redirect: "follow",
      });
      clearTimeout(timeout);

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        pages.push({ url, title: "(non-HTML)", status: res.status, interactiveElements: 0, outgoingLinks: [], consoleErrors: [] });
        continue;
      }

      // Read body with size cap (2MB)
      const MAX_BODY = 2 * 1024 * 1024;
      const body = await res.text();
      const truncated = body.length > MAX_BODY ? body.slice(0, MAX_BODY) : body;

      // Extract title
      const titleMatch = truncated.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "(no title)";

      // Extract links
      const linkRegex = /href=["']([^"'#]+)["']/gi;
      const links: string[] = [];
      let match;
      while ((match = linkRegex.exec(truncated)) !== null) {
        try {
          const resolved = new URL(match[1], url).href;
          if (new URL(resolved).hostname === baseHost && !visited.has(resolved.split("#")[0].split("?")[0])) {
            links.push(resolved);
            queue.push(resolved);
          }
        } catch { /* invalid URL */ }
      }

      // Count interactive elements
      const interactiveRegex = /<(button|input|select|textarea|a\s)/gi;
      let interactiveCount = 0;
      while (interactiveRegex.exec(truncated)) interactiveCount++;

      pages.push({
        url,
        title,
        status: res.status,
        interactiveElements: interactiveCount,
        outgoingLinks: links.slice(0, 50),
        consoleErrors: [],
      });
    } catch (e: any) {
      pages.push({
        url,
        title: "(fetch failed)",
        status: 0,
        interactiveElements: 0,
        outgoingLinks: [],
        consoleErrors: [e.message],
      });
    }
  }

  return pages;
}

function analyzeFindings(pages: CrawlPage[]): SitemapSession["findings"] {
  const findings: SitemapSession["findings"] = [];

  // Check for failed pages
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].status === 0) {
      findings.push({ severity: "error", message: `Page unreachable: ${pages[i].url}`, pageIndex: i });
    } else if (pages[i].status >= 400) {
      findings.push({ severity: "error", message: `HTTP ${pages[i].status}: ${pages[i].url}`, pageIndex: i });
    }
  }

  // Check for pages with no interactive elements
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].interactiveElements === 0 && pages[i].status === 200) {
      findings.push({ severity: "warning", message: `No interactive elements: ${pages[i].url}`, pageIndex: i });
    }
  }

  // Check for console errors
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].consoleErrors.length > 0) {
      findings.push({ severity: "warning", message: `Console errors on ${pages[i].url}: ${pages[i].consoleErrors.join("; ")}`, pageIndex: i });
    }
  }

  // SPA detection
  const allSamePath = pages.every(p => new URL(p.url).pathname === new URL(pages[0].url).pathname);
  if (pages.length === 1 || allSamePath) {
    findings.push({ severity: "info", message: "Single-page app detected — install NodeBench locally for deeper SPA crawling" });
  }

  return findings;
}

// ─── Diff crawl baseline storage ──────────────────────────────────────────────

const MAX_BASELINES = 10;
const baselines = new Map<string, SitemapSession>();

function evictStaleBaselines(): void {
  while (baselines.size > MAX_BASELINES) {
    const oldest = baselines.keys().next().value;
    if (oldest) baselines.delete(oldest);
  }
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const sitemapTools: McpTool[] = [
  // ── site_map ──────────────────────────────────────────────────────────
  {
    name: "site_map",
    description:
      "Interactive site map with stateful drill-down. First call with { url } to crawl. Then use { action: 'overview' | 'screen' | 'screenshot' | 'findings' } to explore. Returns session_id for subsequent calls.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL to crawl (initial call only)",
        },
        session_id: {
          type: "string",
          description: "Session ID from previous site_map call",
        },
        action: {
          type: "string",
          enum: ["overview", "screen", "screenshot", "findings"],
          description: "Drill-down action (requires session_id)",
        },
        index: {
          type: "number",
          description: "Page index for 'screen' and 'screenshot' actions",
        },
        max_pages: {
          type: "number",
          description: "Maximum pages to crawl (default: 30, max: 50)",
        },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
    handler: async (args: {
      url?: string;
      session_id?: string;
      action?: string;
      index?: number;
      max_pages?: number;
    }) => {
      evictStaleSessions();

      // ── Initial crawl ──
      if (args.url && !args.action) {
        const maxPages = Math.min(args.max_pages ?? 30, 50);
        const pages = await crawlSite(args.url, maxPages);
        const findings = analyzeFindings(pages);
        const session: SitemapSession = {
          id: genSessionId(),
          baseUrl: args.url,
          pages,
          crawledAt: Date.now(),
          findings,
        };
        sessions.set(session.id, session);

        return {
          session_id: session.id,
          screensCount: pages.length,
          elementsCount: pages.reduce((s, p) => s + p.interactiveElements, 0),
          findingsCount: findings.length,
          screens: pages.map((p, i) => ({
            index: i,
            path: new URL(p.url).pathname,
            title: p.title,
            elements: p.interactiveElements,
            status: p.status,
          })),
          next: [
            `site_map({ session_id: '${session.id}', action: 'overview' })`,
            `site_map({ session_id: '${session.id}', action: 'screen', index: 0 })`,
            `site_map({ session_id: '${session.id}', action: 'findings' })`,
          ],
        };
      }

      // ── Drill-down requires session ──
      const session = sessions.get(args.session_id ?? "");
      if (!session) {
        return { error: "Session not found or expired. Call site_map({ url }) first to crawl." };
      }

      switch (args.action) {
        case "overview": {
          // Navigation graph
          const graph: Record<string, string[]> = {};
          for (const page of session.pages) {
            const path = new URL(page.url).pathname;
            graph[path] = page.outgoingLinks.map(l => {
              try { return new URL(l).pathname; } catch { return l; }
            });
          }
          return {
            session_id: session.id,
            baseUrl: session.baseUrl,
            pageCount: session.pages.length,
            navigationGraph: graph,
            next: [
              `site_map({ session_id: '${session.id}', action: 'screen', index: 0 })`,
              `site_map({ session_id: '${session.id}', action: 'findings' })`,
            ],
          };
        }

        case "screen": {
          const idx = args.index ?? 0;
          if (idx < 0 || idx >= session.pages.length) {
            return { error: `Index ${idx} out of range (0-${session.pages.length - 1})` };
          }
          const page = session.pages[idx];
          return {
            index: idx,
            url: page.url,
            title: page.title,
            status: page.status,
            interactiveElements: page.interactiveElements,
            outgoingLinks: page.outgoingLinks.length,
            consoleErrors: page.consoleErrors,
            hasScreenshot: !!page.screenshot,
            next: [
              `site_map({ session_id: '${session.id}', action: 'screenshot', index: ${idx} })`,
              `site_map({ session_id: '${session.id}', action: 'findings' })`,
              `site_map({ session_id: '${session.id}', action: 'overview' })`,
            ],
          };
        }

        case "screenshot": {
          const idx = args.index ?? 0;
          if (idx < 0 || idx >= session.pages.length) {
            return { error: `Index ${idx} out of range (0-${session.pages.length - 1})` };
          }
          const page = session.pages[idx];
          if (page.screenshot) {
            return {
              index: idx,
              url: page.url,
              screenshot: page.screenshot,
              note: "Screenshot available (base64 JPEG)",
            };
          }
          return {
            index: idx,
            url: page.url,
            note: "Screenshot not available — this lightweight crawler does not capture screenshots. Use capture_responsive_suite({ url }) for visual capture, or install Playwright for full browser rendering.",
            suggestion: `capture_responsive_suite({ url: '${page.url}' })`,
          };
        }

        case "findings": {
          return {
            session_id: session.id,
            totalFindings: session.findings.length,
            errors: session.findings.filter(f => f.severity === "error"),
            warnings: session.findings.filter(f => f.severity === "warning"),
            info: session.findings.filter(f => f.severity === "info"),
            next: [
              `site_map({ session_id: '${session.id}', action: 'overview' })`,
              `suggest_tests({ session_id: '${session.id}' })`,
              `diff_crawl({ url: '${session.baseUrl}' })`,
            ],
          };
        }

        default:
          return { error: `Unknown action: ${args.action}. Use: overview, screen, screenshot, findings` };
      }
    },
  },

  // ── diff_crawl ────────────────────────────────────────────────────────
  {
    name: "diff_crawl",
    description:
      "Before/after site comparison. First call captures baseline. Second call diffs against baseline. Shows added/removed/changed pages.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL to crawl and compare",
        },
        baseline_id: {
          type: "string",
          description: "Baseline session ID to compare against (omit to capture new baseline)",
        },
        max_pages: {
          type: "number",
          description: "Maximum pages to crawl (default: 30, max: 50)",
        },
      },
      required: ["url"],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
    handler: async (args: { url: string; baseline_id?: string; max_pages?: number }) => {
      evictStaleBaselines();
      const maxPages = Math.min(args.max_pages ?? 30, 50);

      // If no baseline, capture one
      if (!args.baseline_id) {
        const pages = await crawlSite(args.url, maxPages);
        const findings = analyzeFindings(pages);
        const session: SitemapSession = {
          id: genSessionId(),
          baseUrl: args.url,
          pages,
          crawledAt: Date.now(),
          findings,
        };
        baselines.set(session.id, session);
        sessions.set(session.id, session); // also accessible via site_map

        return {
          status: "baseline_captured",
          baseline_id: session.id,
          pageCount: pages.length,
          findingsCount: findings.length,
          instruction: `Make your changes, then run: diff_crawl({ url: '${args.url}', baseline_id: '${session.id}' })`,
        };
      }

      // Diff against baseline
      const baseline = baselines.get(args.baseline_id) || sessions.get(args.baseline_id);
      if (!baseline) {
        return { error: "Baseline not found or expired. Run diff_crawl({ url }) first to capture." };
      }

      const currentPages = await crawlSite(args.url, maxPages);
      const currentFindings = analyzeFindings(currentPages);

      // Compute diffs
      const baseUrls = new Set(baseline.pages.map(p => p.url));
      const currUrls = new Set(currentPages.map(p => p.url));

      const added = currentPages.filter(p => !baseUrls.has(p.url));
      const removed = baseline.pages.filter(p => !currUrls.has(p.url));

      // Changed pages (same URL, different content)
      const changed: Array<{ url: string; titleChanged: boolean; elementsChanged: number; statusChanged: boolean }> = [];
      for (const curr of currentPages) {
        const base = baseline.pages.find(p => p.url === curr.url);
        if (base) {
          const titleChanged = base.title !== curr.title;
          const elementsChanged = curr.interactiveElements - base.interactiveElements;
          const statusChanged = base.status !== curr.status;
          if (titleChanged || elementsChanged !== 0 || statusChanged) {
            changed.push({ url: curr.url, titleChanged, elementsChanged, statusChanged });
          }
        }
      }

      // New findings
      const baselineFindingSet = new Set(baseline.findings.map(f => f.message));
      const newFindings = currentFindings.filter(f => !baselineFindingSet.has(f.message));
      const resolvedFindings = baseline.findings.filter(f => !currentFindings.some(cf => cf.message === f.message));

      // Store current as new session
      const session: SitemapSession = {
        id: genSessionId(),
        baseUrl: args.url,
        pages: currentPages,
        crawledAt: Date.now(),
        findings: currentFindings,
      };
      sessions.set(session.id, session);

      return {
        session_id: session.id,
        baseline_id: args.baseline_id,
        summary: {
          baselinePages: baseline.pages.length,
          currentPages: currentPages.length,
          added: added.length,
          removed: removed.length,
          changed: changed.length,
          newFindings: newFindings.length,
          resolvedFindings: resolvedFindings.length,
        },
        added: added.map(p => ({ url: p.url, title: p.title })),
        removed: removed.map(p => ({ url: p.url, title: p.title })),
        changed,
        newFindings,
        resolvedFindings,
        next: [
          `site_map({ session_id: '${session.id}', action: 'findings' })`,
          `suggest_tests({ session_id: '${session.id}' })`,
        ],
      };
    },
  },

  // ── suggest_tests ─────────────────────────────────────────────────────
  {
    name: "suggest_tests",
    description:
      "Generate scenario-based test suggestions from a site_map or diff_crawl session. Analyzes crawl findings and generates actionable test cases.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID from site_map or diff_crawl",
        },
      },
      required: ["session_id"],
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { session_id: string }) => {
      const session = sessions.get(args.session_id);
      if (!session) {
        return { error: "Session not found or expired. Run site_map({ url }) first." };
      }

      const tests: Array<{
        name: string;
        persona: string;
        goal: string;
        steps: string[];
        assertions: string[];
        category: string;
      }> = [];

      // Generate tests from findings
      for (const finding of session.findings) {
        if (finding.severity === "error") {
          if (finding.message.includes("unreachable")) {
            tests.push({
              name: `Test: Page availability — ${finding.message.split(": ")[1] || ""}`,
              persona: "First-time visitor",
              goal: "Access all pages without errors",
              steps: [
                `Navigate to ${session.pages[finding.pageIndex ?? 0]?.url || session.baseUrl}`,
                "Wait for page load",
                "Check HTTP status",
              ],
              assertions: [
                "Status code is 200",
                "Page content renders (not blank)",
                "No console errors",
              ],
              category: "availability",
            });
          }
          if (finding.message.includes("HTTP 4") || finding.message.includes("HTTP 5")) {
            tests.push({
              name: `Test: Error handling — ${finding.message}`,
              persona: "Returning user with bookmarked link",
              goal: "See helpful error page, not blank screen",
              steps: [
                `Navigate to failing URL`,
                "Observe error handling",
              ],
              assertions: [
                "Error page renders with helpful message",
                "Navigation back to home is available",
                "No raw error stack traces visible",
              ],
              category: "error_handling",
            });
          }
        }

        if (finding.severity === "warning" && finding.message.includes("No interactive elements")) {
          tests.push({
            name: `Test: Page interactivity — ${session.pages[finding.pageIndex ?? 0]?.title || "Unknown"}`,
            persona: "Power user exploring features",
            goal: "Find actionable content on every page",
            steps: [
              `Navigate to ${session.pages[finding.pageIndex ?? 0]?.url || ""}`,
              "Look for buttons, links, or forms",
              "Tab through page",
            ],
            assertions: [
              "At least one interactive element exists",
              "All interactive elements are keyboard accessible",
              "Page has a clear call-to-action",
            ],
            category: "interactivity",
          });
        }
      }

      // Generate structural tests from crawl data
      // Navigation completeness
      const orphanPages = session.pages.filter((p, i) =>
        i > 0 && !session.pages.some((other, j) => j !== i && other.outgoingLinks.includes(p.url))
      );
      if (orphanPages.length > 0) {
        tests.push({
          name: "Test: Navigation completeness — orphan pages",
          persona: "New user exploring via navigation",
          goal: "Reach all pages through navigation links",
          steps: [
            "Start at home page",
            "Click through all navigation links",
            "Check if all pages are reachable",
          ],
          assertions: orphanPages.map(p => `Page ${new URL(p.url).pathname} is reachable from navigation`),
          category: "navigation",
        });
      }

      // Cross-page consistency
      if (session.pages.length > 1) {
        tests.push({
          name: "Test: Cross-page consistency",
          persona: "Quality reviewer",
          goal: "Verify consistent layout and branding across all pages",
          steps: session.pages.slice(0, 5).map(p => `Visit ${new URL(p.url).pathname}`),
          assertions: [
            "Header/navigation is consistent across pages",
            "Footer is consistent across pages",
            "Font and color scheme is consistent",
            "No broken images or missing assets",
          ],
          category: "consistency",
        });
      }

      // Mobile responsiveness
      tests.push({
        name: "Test: Mobile responsiveness",
        persona: "Mobile user on iPhone 14",
        goal: "Use the site comfortably on mobile",
        steps: [
          "Set viewport to 375x812",
          ...session.pages.slice(0, 3).map(p => `Navigate to ${new URL(p.url).pathname}`),
        ],
        assertions: [
          "No horizontal overflow",
          "Touch targets >= 44px",
          "Text is readable without zooming",
          "Navigation is accessible (hamburger menu or bottom nav)",
        ],
        category: "responsive",
      });

      return {
        session_id: args.session_id,
        testCount: tests.length,
        tests,
        categories: [...new Set(tests.map(t => t.category))],
        next: [
          `site_map({ session_id: '${args.session_id}', action: 'overview' })`,
          `diff_crawl({ url: '${session.baseUrl}' })`,
        ],
      };
    },
  },
];
