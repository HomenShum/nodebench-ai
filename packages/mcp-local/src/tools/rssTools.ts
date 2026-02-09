/**
 * RSS Tools — Subscribe, fetch, and digest RSS/Atom feeds.
 *
 * Zero npm dependencies — uses Node's built-in `fetch` + simple XML parsing.
 * Articles are tracked in SQLite for deduplication across fetches.
 */

import { getDb } from "../db.js";
import type { McpTool } from "../types.js";

// ── SQLite schema ────────────────────────────────────────────────────────────

function ensureRssTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS rss_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      name TEXT,
      category TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS rss_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_url TEXT NOT NULL,
      title TEXT,
      link TEXT NOT NULL,
      published TEXT,
      summary TEXT,
      fetched_at TEXT DEFAULT (datetime('now')),
      is_new INTEGER DEFAULT 1,
      UNIQUE(source_url, link)
    );
  `);
}

// ── RSS/Atom XML parser ──────────────────────────────────────────────────────

interface FeedItem {
  title: string;
  link: string;
  published: string;
  summary: string;
}

/** Extract text content from an XML tag, handling CDATA */
function extractTag(xml: string, tag: string): string {
  const match = xml.match(
    new RegExp(`<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*<\\/${tag}>`, "i")
  );
  return match ? match[1].trim() : "";
}

/** Extract href from Atom <link> element */
function extractAtomLink(xml: string): string {
  // Prefer rel="alternate", fall back to first <link href="...">
  const altMatch = xml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i);
  if (altMatch) return altMatch[1];
  const anyMatch = xml.match(/<link[^>]*href="([^"]+)"/i);
  return anyMatch ? anyMatch[1] : "";
}

/** Strip HTML tags for clean summaries */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fetch and parse an RSS 2.0 or Atom feed */
async function parseFeed(url: string): Promise<{ title: string; items: FeedItem[] }> {
  const response = await fetch(url, {
    headers: { "User-Agent": "NodeBench-MCP RSS Reader" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`Feed fetch failed: ${response.status} ${response.statusText}`);

  const xml = await response.text();
  const items: FeedItem[] = [];

  // Try RSS 2.0 first: <item>...</item>
  const rssItems = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
  if (rssItems.length > 0) {
    for (const item of rssItems) {
      items.push({
        title: stripHtml(extractTag(item, "title")),
        link: extractTag(item, "link"),
        published: extractTag(item, "pubDate"),
        summary: stripHtml(extractTag(item, "description")).substring(0, 500),
      });
    }
    return { title: stripHtml(extractTag(xml, "title")), items };
  }

  // Try Atom: <entry>...</entry>
  const atomEntries = xml.match(/<entry>([\s\S]*?)<\/entry>/gi) || [];
  for (const entry of atomEntries) {
    items.push({
      title: stripHtml(extractTag(entry, "title")),
      link: extractAtomLink(entry) || extractTag(entry, "link"),
      published: extractTag(entry, "published") || extractTag(entry, "updated"),
      summary: stripHtml(
        extractTag(entry, "summary") || extractTag(entry, "content")
      ).substring(0, 500),
    });
  }

  return { title: stripHtml(extractTag(xml, "title")), items };
}

// ── Tools ────────────────────────────────────────────────────────────────────

export const rssTools: McpTool[] = [
  {
    name: "add_rss_source",
    description:
      "Register an RSS or Atom feed URL for monitoring. Stored in SQLite for persistent tracking. Validates the feed on add. Use fetch_rss_feeds to pull articles and build_research_digest to generate a digest of new articles.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "RSS or Atom feed URL (e.g., https://arxiv.org/rss/cs.AI)",
        },
        name: {
          type: "string",
          description: 'Human-readable name for the source (e.g., "arXiv CS.AI")',
        },
        category: {
          type: "string",
          description:
            'Category tag for grouping in digests (e.g., "ai-research", "security", "frontend")',
        },
      },
      required: ["url"],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureRssTables();
      const db = getDb();
      const url = args.url as string;
      const name = (args.name as string) || url;
      const category = (args.category as string) || "general";

      try {
        // Validate the feed is fetchable and parseable
        const feed = await parseFeed(url);

        db.prepare(
          "INSERT OR IGNORE INTO rss_sources (url, name, category) VALUES (?, ?, ?)"
        ).run(url, name, category);

        return [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              source: { url, name, category },
              feedTitle: feed.title,
              articleCount: feed.items.length,
              message: `Added RSS source "${name}" — ${feed.items.length} articles available`,
            }),
          },
        ];
      } catch (error) {
        return [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: `Failed to add feed: ${(error as Error).message}`,
              hint: "Check the URL is a valid RSS/Atom feed. Try opening it in a browser first.",
            }),
          },
        ];
      }
    },
  },
  {
    name: "fetch_rss_feeds",
    description:
      "Fetch and parse all registered RSS/Atom feeds (or specific URLs). New articles are stored in SQLite with is_new=1 for digest generation. Previously seen articles (same source_url + link) are skipped. Returns per-feed counts and articles.",
    inputSchema: {
      type: "object" as const,
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description:
            "Specific feed URLs to fetch (optional — defaults to all registered sources from add_rss_source)",
        },
        limit_per_feed: {
          type: "number",
          description: "Maximum articles per feed (default: 20)",
        },
      },
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureRssTables();
      const db = getDb();
      const limitPerFeed = (args.limit_per_feed as number) || 20;

      let urls = args.urls as string[] | undefined;
      if (!urls || urls.length === 0) {
        const sources = db.prepare("SELECT url FROM rss_sources").all() as Array<{ url: string }>;
        urls = sources.map((s) => s.url);
      }

      if (urls.length === 0) {
        return [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "No RSS sources registered. Use add_rss_source first.",
            }),
          },
        ];
      }

      const insertStmt = db.prepare(
        "INSERT OR IGNORE INTO rss_articles (source_url, title, link, published, summary) VALUES (?, ?, ?, ?, ?)"
      );

      const results: Array<{
        source: string;
        title: string;
        articlesFound: number;
        newArticles: number;
        articles: FeedItem[];
      }> = [];

      for (const url of urls) {
        try {
          const feed = await parseFeed(url);
          const articles = feed.items.slice(0, limitPerFeed);
          let newCount = 0;

          for (const article of articles) {
            if (!article.link) continue;
            const result = insertStmt.run(
              url,
              article.title,
              article.link,
              article.published,
              article.summary
            );
            if (result.changes > 0) newCount++;
          }

          results.push({
            source: url,
            title: feed.title,
            articlesFound: articles.length,
            newArticles: newCount,
            articles,
          });
        } catch (error) {
          results.push({
            source: url,
            title: `(error: ${(error as Error).message})`,
            articlesFound: 0,
            newArticles: 0,
            articles: [],
          });
        }
      }

      const totalNew = results.reduce((sum, r) => sum + r.newArticles, 0);
      const totalFound = results.reduce((sum, r) => sum + r.articlesFound, 0);

      return [
        {
          type: "text" as const,
          text: JSON.stringify({
            summary: {
              sourcesChecked: results.length,
              totalArticles: totalFound,
              newArticles: totalNew,
            },
            feeds: results,
          }),
        },
      ];
    },
  },
  {
    name: "build_research_digest",
    description:
      "Generate a digest of new (unseen) articles from RSS feeds. Compares against previously seen articles via SQLite. Returns only new items grouped by category. After generating, articles are marked as seen so the next digest only shows truly new content. Output formats: markdown (default), json, or html (ready for send_email).",
    inputSchema: {
      type: "object" as const,
      properties: {
        since_hours: {
          type: "number",
          description: "Include articles fetched in the last N hours (default: 24)",
        },
        category: {
          type: "string",
          description: "Filter by source category (optional — omit for all categories)",
        },
        format: {
          type: "string",
          enum: ["markdown", "json", "html"],
          description:
            "Output format. Use 'html' for send_email with html parameter, 'markdown' for readability, 'json' for programmatic use (default: markdown)",
        },
      },
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      ensureRssTables();
      const db = getDb();
      const sinceHours = (args.since_hours as number) || 24;
      const category = args.category as string | undefined;
      const format = (args.format as string) || "markdown";

      // Query new articles
      const params: unknown[] = [sinceHours];
      let query = `
        SELECT a.title, a.link, a.published, a.summary, a.source_url, a.fetched_at,
               COALESCE(s.name, a.source_url) as source_name,
               COALESCE(s.category, 'uncategorized') as category
        FROM rss_articles a
        LEFT JOIN rss_sources s ON a.source_url = s.url
        WHERE a.is_new = 1
        AND a.fetched_at >= datetime('now', '-' || ? || ' hours')
      `;
      if (category) {
        query += " AND s.category = ?";
        params.push(category);
      }
      query += " ORDER BY a.fetched_at DESC";

      const articles = db.prepare(query).all(...params) as Array<{
        title: string;
        link: string;
        published: string;
        summary: string;
        source_url: string;
        source_name: string;
        category: string;
        fetched_at: string;
      }>;

      // Mark articles as seen
      const markParams: unknown[] = [sinceHours];
      let markQuery = `
        UPDATE rss_articles SET is_new = 0
        WHERE is_new = 1 AND fetched_at >= datetime('now', '-' || ? || ' hours')
      `;
      if (category) {
        markQuery += ` AND source_url IN (SELECT url FROM rss_sources WHERE category = ?)`;
        markParams.push(category);
      }
      db.prepare(markQuery).run(...markParams);

      if (articles.length === 0) {
        return [
          {
            type: "text" as const,
            text: JSON.stringify({
              message: "No new articles found. Run fetch_rss_feeds first to check for updates.",
              articleCount: 0,
            }),
          },
        ];
      }

      // Group by category
      const byCategory = new Map<string, typeof articles>();
      for (const a of articles) {
        const cat = a.category;
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(a);
      }

      if (format === "json") {
        return [
          {
            type: "text" as const,
            text: JSON.stringify({
              generatedAt: new Date().toISOString(),
              articleCount: articles.length,
              sinceHours,
              byCategory: Object.fromEntries(byCategory),
            }),
          },
        ];
      }

      if (format === "html") {
        const sections = [...byCategory.entries()]
          .map(
            ([cat, items]) => `
          <h2 style="color:#333;border-bottom:2px solid #007bff;padding-bottom:4px">${cat} (${items.length})</h2>
          ${items
            .map(
              (a) => `
            <div style="margin-bottom:16px;padding:12px;background:#f8f9fa;border-radius:6px">
              <a href="${a.link}" style="font-size:16px;font-weight:600;color:#007bff;text-decoration:none">${a.title}</a>
              <div style="color:#666;font-size:12px;margin-top:4px">${a.source_name} · ${a.published || a.fetched_at}</div>
              ${a.summary ? `<p style="margin-top:8px;color:#444;font-size:14px">${a.summary}</p>` : ""}
            </div>`
            )
            .join("")}`
          )
          .join("");

        const html = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:640px;margin:0 auto;padding:20px">
            <h1 style="color:#111;margin-bottom:4px">Research Digest</h1>
            <p style="color:#666;margin-top:0">${articles.length} new articles · ${new Date().toLocaleDateString()}</p>
            ${sections}
            <hr style="margin-top:32px;border:none;border-top:1px solid #ddd">
            <p style="color:#999;font-size:11px">Generated by NodeBench MCP · build_research_digest</p>
          </div>`;

        return [
          {
            type: "text" as const,
            text: JSON.stringify({ html, articleCount: articles.length }),
          },
        ];
      }

      // Markdown format (default)
      const lines = [
        `# Research Digest`,
        ``,
        `**${articles.length} new articles** · ${new Date().toLocaleDateString()}`,
        ``,
      ];

      for (const [cat, catArticles] of byCategory) {
        lines.push(`## ${cat} (${catArticles.length})`);
        lines.push("");
        for (const a of catArticles) {
          lines.push(`### [${a.title}](${a.link})`);
          lines.push(
            `*${a.source_name}* · ${a.published || a.fetched_at}`
          );
          if (a.summary) lines.push(`> ${a.summary.substring(0, 300)}`);
          lines.push("");
        }
      }

      return [{ type: "text" as const, text: lines.join("\n") }];
    },
  },
  {
    name: "scaffold_research_pipeline",
    description:
      "Generate a complete, standalone Node.js project for an automated research digest pipeline. Creates: package.json, main script (RSS subscribe → fetch → digest → email), cron setup, .env template, and README with setup instructions. The generated code is self-contained — no dependency on nodebench-mcp at runtime. Use this to help users build their own automated research monitoring.",
    inputSchema: {
      type: "object" as const,
      properties: {
        project_name: {
          type: "string",
          description: 'Project directory name (default: "research-digest")',
        },
        feeds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              url: { type: "string" },
              name: { type: "string" },
              category: { type: "string" },
            },
            required: ["url"],
          },
          description: 'Initial RSS/Atom feed URLs to include (optional — can be added later). Example: [{"url": "https://arxiv.org/rss/cs.AI", "name": "arXiv AI", "category": "ai-research"}]',
        },
        email_to: {
          type: "string",
          description: "Default recipient email for digest delivery (optional — configured in .env)",
        },
        schedule: {
          type: "string",
          enum: ["daily", "twice-daily", "weekly", "manual"],
          description: 'Digest schedule (default: "daily"). Generates appropriate cron expression.',
        },
        output_dir: {
          type: "string",
          description: "Directory to scaffold into (default: current working directory + project_name)",
        },
      },
      required: [],
    },
    handler: async (args: Record<string, unknown>) => {
      const projectName = (args.project_name as string) || "research-digest";
      const feeds = (args.feeds as Array<{ url: string; name?: string; category?: string }>) || [];
      const emailTo = (args.email_to as string) || "";
      const schedule = (args.schedule as string) || "daily";

      const cronExpr: Record<string, string> = {
        daily: "0 8 * * *",
        "twice-daily": "0 8,18 * * *",
        weekly: "0 8 * * 1",
        manual: "(run manually)",
      };

      const feedsJs = feeds.length > 0
        ? feeds.map((f) =>
            `  { url: "${f.url}", name: "${f.name || f.url}", category: "${f.category || "general"}" },`
          ).join("\n")
        : `  // Add your feeds here:\n  // { url: "https://arxiv.org/rss/cs.AI", name: "arXiv AI", category: "ai-research" },\n  // { url: "https://hnrss.org/newest?points=100", name: "Hacker News Top", category: "tech" },`;

      // ── Generate the main script ──
      const mainScript = `#!/usr/bin/env node
/**
 * ${projectName} — Automated Research Digest Pipeline
 *
 * Subscribe to RSS/Atom feeds, fetch new articles, build a digest, and email it.
 * Generated by NodeBench MCP scaffold_research_pipeline.
 *
 * Usage:
 *   node digest.mjs                    # Run once (fetch + digest + email)
 *   node digest.mjs --fetch-only       # Just fetch, don't email
 *   node digest.mjs --list-sources     # Show registered feeds
 *   node digest.mjs --add-feed <url>   # Add a new feed
 *
 * Schedule with cron:
 *   crontab -e
 *   ${cronExpr[schedule]} cd /path/to/${projectName} && node digest.mjs >> digest.log 2>&1
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import * as tls from "node:tls";

// ── Config ────────────────────────────────────────────────────────────────────

const DATA_DIR = new URL("./data/", import.meta.url).pathname.replace(/^\\//, "");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const SOURCES_FILE = DATA_DIR + "sources.json";
const ARTICLES_FILE = DATA_DIR + "articles.json";

const EMAIL_USER = process.env.EMAIL_USER || "";
const EMAIL_PASS = process.env.EMAIL_PASS || "";
const EMAIL_TO = process.env.DIGEST_TO || "${emailTo}" || EMAIL_USER;
const SMTP_HOST = process.env.EMAIL_SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.EMAIL_SMTP_PORT || "465");

// ── Feed storage (JSON file-based, no SQLite needed) ──────────────────────────

function loadSources() {
  if (!existsSync(SOURCES_FILE)) return [];
  return JSON.parse(readFileSync(SOURCES_FILE, "utf-8"));
}

function saveSources(sources) {
  writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2));
}

function loadArticles() {
  if (!existsSync(ARTICLES_FILE)) return {};
  return JSON.parse(readFileSync(ARTICLES_FILE, "utf-8"));
}

function saveArticles(articles) {
  writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2));
}

// ── RSS/Atom parser ───────────────────────────────────────────────────────────

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(\`<\${tag}[^>]*>\\\\s*(?:<!\\\\[CDATA\\\\[)?([\\\\s\\\\S]*?)(?:\\\\]\\\\]>)?\\\\s*</\${tag}>\`, "i"));
  return m ? m[1].trim() : "";
}

function extractAtomLink(xml) {
  const alt = xml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i);
  if (alt) return alt[1];
  const any = xml.match(/<link[^>]*href="([^"]+)"/i);
  return any ? any[1] : "";
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\\s+/g, " ").trim();
}

async function parseFeed(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "${projectName} RSS Reader" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(\`Feed fetch failed: \${res.status}\`);
  const xml = await res.text();
  const items = [];

  const rssItems = xml.match(/<item>([\\s\\S]*?)<\\/item>/gi) || [];
  if (rssItems.length > 0) {
    for (const item of rssItems) {
      items.push({
        title: stripHtml(extractTag(item, "title")),
        link: extractTag(item, "link"),
        published: extractTag(item, "pubDate"),
        summary: stripHtml(extractTag(item, "description")).substring(0, 500),
      });
    }
    return { title: stripHtml(extractTag(xml, "title")), items };
  }

  const atomEntries = xml.match(/<entry>([\\s\\S]*?)<\\/entry>/gi) || [];
  for (const entry of atomEntries) {
    items.push({
      title: stripHtml(extractTag(entry, "title")),
      link: extractAtomLink(entry) || extractTag(entry, "link"),
      published: extractTag(entry, "published") || extractTag(entry, "updated"),
      summary: stripHtml(extractTag(entry, "summary") || extractTag(entry, "content")).substring(0, 500),
    });
  }
  return { title: stripHtml(extractTag(xml, "title")), items };
}

// ── SMTP email sender ─────────────────────────────────────────────────────────

function readSmtp(socket, timeout = 10000) {
  return new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => { socket.removeAllListeners("data"); reject(new Error("SMTP timeout")); }, timeout);
    const onData = (chunk) => {
      buf += chunk.toString();
      const lines = buf.split("\\r\\n").filter(Boolean);
      const last = lines[lines.length - 1];
      if (last && /^\\d{3} /.test(last)) {
        clearTimeout(timer); socket.removeListener("data", onData);
        const code = parseInt(last.substring(0, 3));
        if (code >= 400) reject(new Error(\`SMTP \${code}: \${buf.trim()}\`));
        else resolve(buf.trim());
      }
    };
    socket.on("data", onData);
  });
}

async function smtpCmd(socket, cmd) { socket.write(cmd + "\\r\\n"); return readSmtp(socket); }

async function sendDigestEmail(to, subject, html, plainText) {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log("  [skip] EMAIL_USER/EMAIL_PASS not set — digest printed to stdout instead");
    console.log(plainText);
    return;
  }

  const boundary = "----DigestBoundary" + Date.now();
  const message = [
    \`From: \${EMAIL_USER}\`, \`To: \${to}\`, \`Subject: \${subject}\`,
    \`Date: \${new Date().toUTCString()}\`, "MIME-Version: 1.0",
    \`Content-Type: multipart/alternative; boundary="\${boundary}"\`,
    "", \`--\${boundary}\`, "Content-Type: text/plain; charset=UTF-8", "", plainText,
    \`--\${boundary}\`, "Content-Type: text/html; charset=UTF-8", "", html,
    \`--\${boundary}--\`,
  ].join("\\r\\n");

  const socket = tls.connect({ host: SMTP_HOST, port: SMTP_PORT, rejectUnauthorized: true });
  await new Promise((resolve, reject) => { socket.once("secureConnect", resolve); socket.once("error", reject); });
  try {
    await readSmtp(socket);
    await smtpCmd(socket, "EHLO digest-pipeline");
    await smtpCmd(socket, "AUTH LOGIN");
    await smtpCmd(socket, Buffer.from(EMAIL_USER).toString("base64"));
    await smtpCmd(socket, Buffer.from(EMAIL_PASS).toString("base64"));
    await smtpCmd(socket, \`MAIL FROM:<\${EMAIL_USER}>\`);
    await smtpCmd(socket, \`RCPT TO:<\${to}>\`);
    await smtpCmd(socket, "DATA");
    socket.write(message.replace(/\\r\\n\\./g, "\\r\\n..") + "\\r\\n.\\r\\n");
    await readSmtp(socket);
    await smtpCmd(socket, "QUIT").catch(() => {});
    console.log(\`  [sent] Digest emailed to \${to}\`);
  } finally { socket.destroy(); }
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

async function fetchAll() {
  const sources = loadSources();
  if (sources.length === 0) {
    console.log("No sources registered. Use: node digest.mjs --add-feed <url> [name] [category]");
    return [];
  }

  const seenArticles = loadArticles();
  const newArticles = [];

  for (const source of sources) {
    try {
      const feed = await parseFeed(source.url);
      let newCount = 0;
      for (const item of feed.items.slice(0, 20)) {
        if (!item.link) continue;
        const key = source.url + "|" + item.link;
        if (seenArticles[key]) continue;
        seenArticles[key] = { fetchedAt: new Date().toISOString(), seen: false };
        newArticles.push({ ...item, sourceName: source.name, category: source.category });
        newCount++;
      }
      console.log(\`  [\${source.name}] \${feed.items.length} articles, \${newCount} new\`);
    } catch (e) {
      console.log(\`  [\${source.name}] ERROR: \${e.message}\`);
    }
  }

  saveArticles(seenArticles);
  return newArticles;
}

function buildDigest(articles) {
  if (articles.length === 0) return { html: "", plainText: "", count: 0 };

  const byCategory = new Map();
  for (const a of articles) {
    const cat = a.category || "general";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(a);
  }

  // Plain text
  const lines = [\`Research Digest — \${articles.length} new articles — \${new Date().toLocaleDateString()}\`, ""];
  for (const [cat, items] of byCategory) {
    lines.push(\`## \${cat} (\${items.length})\`, "");
    for (const a of items) {
      lines.push(\`- \${a.title}\`);
      lines.push(\`  \${a.sourceName} · \${a.published || "recent"}\`);
      lines.push(\`  \${a.link}\`);
      if (a.summary) lines.push(\`  > \${a.summary.substring(0, 200)}\`);
      lines.push("");
    }
  }

  // HTML
  const sections = [...byCategory.entries()].map(([cat, items]) => \`
    <h2 style="color:#333;border-bottom:2px solid #007bff;padding-bottom:4px">\${cat} (\${items.length})</h2>
    \${items.map(a => \`
      <div style="margin-bottom:16px;padding:12px;background:#f8f9fa;border-radius:6px">
        <a href="\${a.link}" style="font-size:16px;font-weight:600;color:#007bff;text-decoration:none">\${a.title}</a>
        <div style="color:#666;font-size:12px;margin-top:4px">\${a.sourceName} · \${a.published || "recent"}</div>
        \${a.summary ? \`<p style="margin-top:8px;color:#444;font-size:14px">\${a.summary.substring(0, 300)}</p>\` : ""}
      </div>\`).join("")}\`).join("");

  const html = \`<div style="font-family:-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:20px">
    <h1 style="color:#111">Research Digest</h1>
    <p style="color:#666">\${articles.length} new articles · \${new Date().toLocaleDateString()}</p>
    \${sections}
    <hr style="margin-top:32px;border:none;border-top:1px solid #ddd">
    <p style="color:#999;font-size:11px">Generated by ${projectName}</p>
  </div>\`;

  return { html, plainText: lines.join("\\n"), count: articles.length };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--list-sources")) {
  const sources = loadSources();
  if (sources.length === 0) console.log("No sources. Use --add-feed <url> [name] [category]");
  else sources.forEach((s, i) => console.log(\`\${i + 1}. [\${s.category}] \${s.name} — \${s.url}\`));
} else if (args.includes("--add-feed")) {
  const idx = args.indexOf("--add-feed");
  const url = args[idx + 1];
  const name = args[idx + 2] || url;
  const category = args[idx + 3] || "general";
  if (!url) { console.error("Usage: --add-feed <url> [name] [category]"); process.exit(1); }
  try {
    const feed = await parseFeed(url);
    const sources = loadSources();
    sources.push({ url, name, category });
    saveSources(sources);
    console.log(\`Added: \${name} (\${feed.title}) — \${feed.items.length} articles available\`);
  } catch (e) {
    console.error(\`Failed to validate feed: \${e.message}\`);
  }
} else {
  console.log(\`\\n${"=".repeat(60)}\`);
  console.log(\`  ${projectName} — \${new Date().toISOString()}\`);
  console.log(\`${"=".repeat(60)}\\n\`);

  console.log("Fetching feeds...");
  const articles = await fetchAll();

  if (articles.length === 0) {
    console.log("\\nNo new articles found.");
  } else {
    const digest = buildDigest(articles);
    console.log(\`\\nDigest: \${digest.count} new articles\`);

    if (!args.includes("--fetch-only")) {
      const subject = \`Research Digest — \${digest.count} articles — \${new Date().toLocaleDateString()}\`;
      await sendDigestEmail(EMAIL_TO, subject, digest.html, digest.plainText);
    }

    // Save digest to file
    const digestFile = DATA_DIR + \`digest-\${new Date().toISOString().slice(0,10)}.md\`;
    writeFileSync(digestFile, digest.plainText);
    console.log(\`  [saved] \${digestFile}\`);
  }
}
`;

      // ── Generate package.json ──
      const packageJson = JSON.stringify({
        name: projectName,
        version: "1.0.0",
        type: "module",
        description: "Automated research digest pipeline — RSS/Atom → digest → email",
        main: "digest.mjs",
        scripts: {
          start: "node digest.mjs",
          "fetch-only": "node digest.mjs --fetch-only",
          "list-sources": "node digest.mjs --list-sources",
        },
        engines: { node: ">=18.0.0" },
        license: "MIT",
      }, null, 2);

      // ── Generate .env template ──
      const envTemplate = `# Email configuration (required for email delivery)
# For Gmail: use an App Password (Google Account → Security → App passwords)
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your-16-char-app-password
DIGEST_TO=${emailTo || "your.email@gmail.com"}

# Optional: non-Gmail SMTP
# EMAIL_SMTP_HOST=smtp.gmail.com
# EMAIL_SMTP_PORT=465
`;

      // ── Generate README ──
      const readme = `# ${projectName}

Automated research digest pipeline. Subscribes to RSS/Atom feeds, fetches new articles, builds a categorized digest, and emails it to you.

## Quick Start

\`\`\`bash
# 1. Set up email (see .env.example)
cp .env.example .env
# Edit .env with your email credentials

# 2. Add feeds
node digest.mjs --add-feed "https://arxiv.org/rss/cs.AI" "arXiv AI" "ai-research"
node digest.mjs --add-feed "https://hnrss.org/newest?points=100" "HN Top" "tech"
node digest.mjs --add-feed "https://blog.anthropic.com/rss.xml" "Anthropic" "ai-research"

# 3. Run
node digest.mjs
\`\`\`

## Schedule (cron)

\`\`\`bash
# Edit crontab
crontab -e

# Add (${schedule}):
${cronExpr[schedule]} cd /path/to/${projectName} && node digest.mjs >> digest.log 2>&1
\`\`\`

## Commands

| Command | What it does |
|---|---|
| \`node digest.mjs\` | Fetch + digest + email |
| \`node digest.mjs --fetch-only\` | Fetch only (no email) |
| \`node digest.mjs --list-sources\` | Show registered feeds |
| \`node digest.mjs --add-feed <url> [name] [category]\` | Add a new feed |

## How It Works

1. **Fetch**: Pulls latest articles from all registered RSS/Atom feeds
2. **Deduplicate**: Skips articles already seen (tracked in \`data/articles.json\`)
3. **Digest**: Builds a categorized summary (plain text + HTML)
4. **Email**: Sends via SMTP over TLS (Gmail default, configurable)
5. **Save**: Archives digest as markdown in \`data/\`

No dependencies. Pure Node.js (>= 18). Zero npm packages.

Generated by [NodeBench MCP](https://www.npmjs.com/package/nodebench-mcp) \`scaffold_research_pipeline\`
`;

      return [
        {
          type: "text" as const,
          text: JSON.stringify({
            projectName,
            schedule: `${schedule} (${cronExpr[schedule]})`,
            feedCount: feeds.length,
            files: {
              "digest.mjs": mainScript,
              "package.json": packageJson,
              ".env.example": envTemplate,
              "README.md": readme,
            },
            setupSteps: [
              `1. Create directory: mkdir ${projectName} && cd ${projectName}`,
              "2. Save the files above (digest.mjs, package.json, .env.example, README.md)",
              "3. Copy .env.example to .env and fill in your email credentials",
              `4. Add feeds: node digest.mjs --add-feed "https://arxiv.org/rss/cs.AI" "arXiv AI" "ai-research"`,
              "5. Test: node digest.mjs --fetch-only",
              "6. Run with email: node digest.mjs",
              schedule !== "manual"
                ? `7. Schedule: add to crontab: ${cronExpr[schedule]} cd /path/to/${projectName} && node digest.mjs >> digest.log 2>&1`
                : "7. Run manually whenever you want a digest",
            ],
            tip: "The generated project has ZERO npm dependencies — just Node.js >= 18. Copy the files and run.",
          }),
        },
      ];
    },
  },
];
