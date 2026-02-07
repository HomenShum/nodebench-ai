/**
 * Web tools — URL fetching and web search capabilities.
 * Enables agents to gather information from the web for research, ideation, and discovery.
 *
 * - web_search: Searches the web using AI providers with search grounding
 * - fetch_url: Fetches a URL and extracts content as markdown/text/html
 *
 * Uses Gemini grounding (preferred), OpenAI web search, or Perplexity as providers.
 * Cheerio is optional for HTML parsing.
 */

import type { McpTool } from "../types.js";

// ─── Dynamic import helpers ───────────────────────────────────────────────────

async function canImport(pkg: string): Promise<boolean> {
  try {
    await import(pkg);
    return true;
  } catch {
    return false;
  }
}

async function getCheerio(): Promise<any | null> {
  try {
    const mod = await import("cheerio");
    // cheerio exports load() directly, not as default
    return mod;
  } catch {
    return null;
  }
}

// ─── HTML to Markdown conversion ─────────────────────────────────────────────

function htmlToMarkdown(html: string, cheerio: any): string {
  const $ = cheerio.load(html);

  // Remove script, style, nav, footer, header (keep main content)
  $("script, style, nav, footer, header, aside, .ad, .advertisement, [role='navigation']").remove();

  // Try to find main content area
  let content = $("main, article, [role='main'], .content, .post-content, .article-content").first();
  if (content.length === 0) {
    content = $("body");
  }

  const lines: string[] = [];

  // Extract text with structure
  content.find("h1, h2, h3, h4, h5, h6, p, li, td, th, pre, code, blockquote").each((_: any, el: any) => {
    const tag = el.tagName?.toLowerCase() ?? "";
    const text = $(el).text().trim();

    if (!text) return;

    switch (tag) {
      case "h1":
        lines.push(`\n# ${text}\n`);
        break;
      case "h2":
        lines.push(`\n## ${text}\n`);
        break;
      case "h3":
        lines.push(`\n### ${text}\n`);
        break;
      case "h4":
        lines.push(`\n#### ${text}\n`);
        break;
      case "h5":
      case "h6":
        lines.push(`\n**${text}**\n`);
        break;
      case "p":
        lines.push(`${text}\n`);
        break;
      case "li":
        lines.push(`- ${text}`);
        break;
      case "pre":
      case "code":
        lines.push(`\`\`\`\n${text}\n\`\`\`\n`);
        break;
      case "blockquote":
        lines.push(`> ${text}\n`);
        break;
      case "td":
      case "th":
        // Tables are complex, just capture cell content
        lines.push(text);
        break;
    }
  });

  // Clean up result
  let result = lines.join("\n");
  // Remove excessive newlines
  result = result.replace(/\n{3,}/g, "\n\n");
  // Trim leading/trailing whitespace
  result = result.trim();

  return result;
}

function basicHtmlToText(html: string): string {
  // Fallback when cheerio not available - basic regex extraction
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Search provider implementations ─────────────────────────────────────────

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

async function searchWithGemini(query: string, maxResults: number): Promise<SearchResult[]> {
  const { GoogleGenAI } = await import("@google/genai");
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
  const ai = new GoogleGenAI({ apiKey });

  const coerceUrl = (value: string): string | null => {
    const url = value.trim();
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("//")) return `https:${url}`;
    // Common case: model returns "en.wikipedia.org/wiki/..." without scheme.
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(url)) return `https://${url}`;
    return null;
  };

  const attemptPrompts = [
    `Search the web for: "${query}"

Return the top ${maxResults} most relevant results. For each result, provide:
1. Title
2. URL
3. A 1-2 sentence snippet summarizing the content

Format your response as JSON array:
[{"title": "...", "url": "...", "snippet": "..."}]

Only return the JSON array, no other text.`,
    // Retry prompt: explicitly require absolute URLs.
    `Use Google Search to find sources for: "${query}"

Return a JSON array with up to ${maxResults} entries in this exact shape:
[{"title":"...","url":"https://...","snippet":"..."}]

Requirements:
- url MUST be an absolute URL starting with https://
- Do NOT return markdown, do NOT wrap in code fences.
- If a source is Wikipedia, include the en.wikipedia.org URL directly.`,
  ];

  for (const prompt of attemptPrompts) {
    // Use Gemini with Google Search grounding
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user" as const,
          parts: [{ text: prompt }],
        },
      ],
      config: {
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 2048,
        temperature: 0,
      },
    });

    const cand = (response as any)?.candidates?.[0];

    // Attempt 1: parse the model-produced JSON array (usually includes direct URLs).
    const text = (cand as any)?.content?.parts?.[0]?.text ?? "[]";
    const jsonMatch = String(text).match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const results = JSON.parse(jsonMatch[0]);
        if (Array.isArray(results) && results.length > 0) {
          const normalized: SearchResult[] = [];
          for (const r of results) {
            const coerced = coerceUrl(String(r?.url ?? ""));
            if (!coerced) continue;
            normalized.push({
              title: String(r?.title ?? "").trim(),
              url: coerced,
              snippet: String(r?.snippet ?? "").trim(),
              source: "gemini",
            });
            if (normalized.length >= maxResults) break;
          }
          if (normalized.length > 0) return normalized;
        }
      } catch {
        // fall through
      }
    }

    // Attempt 2: use grounded sources and resolve redirect URLs to final URLs.
    const grounding = cand?.groundingMetadata;
    const chunks = grounding?.groundingChunks;
    const supports = grounding?.groundingSupports;

    if (!Array.isArray(chunks) || chunks.length === 0) {
      continue; // retry with the next prompt
    }

    const snippetsByChunkIndex = new Map<number, string[]>();
    if (Array.isArray(supports)) {
      for (const s of supports) {
        const indices = s?.groundingChunkIndices;
        const segText = s?.segment?.text;
        if (!segText || !Array.isArray(indices)) continue;
        for (const idx of indices) {
          if (typeof idx !== "number") continue;
          const existing = snippetsByChunkIndex.get(idx) ?? [];
          existing.push(String(segText));
          snippetsByChunkIndex.set(idx, existing);
        }
      }
    }

    const resolveRedirect = async (url: string): Promise<string> => {
      const headers = {
        "User-Agent": "Mozilla/5.0 (compatible; NodeBench-MCP/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      };

      try {
        const head = await fetch(url, { method: "HEAD", redirect: "follow", headers });
        return head.url || url;
      } catch {
        // Some sites don't support HEAD; fall back to GET but don't read the body.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8_000);
        try {
          const res = await fetch(url, {
            method: "GET",
            redirect: "follow",
            headers,
            signal: controller.signal,
          });
          // Prevent buffering large responses.
          if ((res as any)?.body?.cancel) {
            try {
              await (res as any).body.cancel();
            } catch {
              // ignore
            }
          }
          return res.url || url;
        } finally {
          clearTimeout(timeout);
        }
      }
    };

    const grounded: SearchResult[] = [];
    const seen = new Set<string>();
    const limit = Math.min(maxResults, 10);

    for (let i = 0; i < chunks.length && grounded.length < limit; i++) {
      const uri = chunks[i]?.web?.uri;
      if (!uri || typeof uri !== "string") continue;

      const finalUrl = await resolveRedirect(uri);
      if (seen.has(finalUrl)) continue;
      seen.add(finalUrl);

      const title = chunks[i]?.web?.title;
      const snippetParts = snippetsByChunkIndex.get(i) ?? [];
      const snippet = snippetParts
        .slice(0, 3)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      grounded.push({
        title: typeof title === "string" && title.trim() ? title.trim() : finalUrl,
        url: finalUrl,
        snippet,
        source: "gemini_grounded",
      });
    }

    if (grounded.length > 0) return grounded;
  }

  return [];
}

async function searchWithOpenAI(query: string, maxResults: number): Promise<SearchResult[]> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI();

  // Use OpenAI with web search preview (responses API)
  try {
    const response = await (client as any).responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" }],
      input: `Search for: "${query}". Return the top ${maxResults} most relevant results as JSON array with title, url, snippet fields.`,
    });

    const text = response?.output_text ?? "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const results = JSON.parse(jsonMatch[0]);
    return results.map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      snippet: r.snippet || "",
      source: "openai",
    }));
  } catch {
    // Fall back to standard chat if responses API not available
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a search assistant. Based on your knowledge, provide relevant results for the query.",
        },
        {
          role: "user",
          content: `Search for: "${query}". Return ${maxResults} relevant results as JSON array: [{"title": "...", "url": "...", "snippet": "..."}]`,
        },
      ],
      max_tokens: 2048,
    });

    const text = response.choices[0]?.message?.content ?? "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const results = JSON.parse(jsonMatch[0]);
    return results.map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      snippet: r.snippet || "",
      source: "openai_knowledge",
    }));
  }
}

async function searchWithPerplexity(query: string, maxResults: number): Promise<SearchResult[]> {
  // Perplexity uses OpenAI-compatible API
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai",
  });

  const response = await client.chat.completions.create({
    model: "llama-3.1-sonar-large-128k-online",
    messages: [
      {
        role: "system",
        content: "Be precise and concise. Return results as JSON.",
      },
      {
        role: "user",
        content: `Search for: "${query}". Return the top ${maxResults} results as JSON array: [{"title": "...", "url": "...", "snippet": "..."}]`,
      },
    ],
    max_tokens: 2048,
  });

  const text = response.choices[0]?.message?.content ?? "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const results = JSON.parse(jsonMatch[0]);
    return results.map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      snippet: r.snippet || "",
      source: "perplexity",
    }));
  } catch {
    return [];
  }
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const webTools: McpTool[] = [
  {
    name: "web_search",
    description:
      "Search the web using AI providers with search grounding. Returns structured search results with titles, URLs, and snippets. Auto-selects best provider: Gemini (Google Search grounding) > OpenAI (web search preview) > Perplexity. Use for research, market analysis, tech discovery, and gathering current information.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query (e.g., 'TypeScript MCP servers 2026', 'AI agent frameworks comparison')",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results to return (default: 5, max: 20)",
        },
        provider: {
          type: "string",
          enum: ["auto", "gemini", "openai", "perplexity"],
          description: "Which search provider to use. Default: 'auto' (selects best available).",
        },
      },
      required: ["query"],
    },
    handler: async (args) => {
      const query = args.query as string;
      const maxResults = Math.min(args.maxResults ?? 5, 20);
      const providerChoice = args.provider ?? "auto";

      // Determine which provider to use
      type ProviderName = "gemini" | "openai" | "perplexity";
      let selectedProvider: ProviderName | null = null;

      if (providerChoice !== "auto") {
        selectedProvider = providerChoice as ProviderName;
      } else {
        // Auto-select: Gemini > OpenAI > Perplexity
        if (
          (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY) &&
          (await canImport("@google/genai"))
        ) {
          selectedProvider = "gemini";
        } else if (process.env.OPENAI_API_KEY && (await canImport("openai"))) {
          selectedProvider = "openai";
        } else if (process.env.PERPLEXITY_API_KEY && (await canImport("openai"))) {
          selectedProvider = "perplexity";
        }
      }

      if (!selectedProvider) {
        return {
          query,
          results: [],
          provider: "none",
          resultCount: 0,
          searchedAt: new Date().toISOString(),
          setup: {
            message: "No search provider available. Results will be empty until a provider is configured.",
            options: [
              "Set GEMINI_API_KEY (recommended — Google Search grounding)",
              "Set OPENAI_API_KEY (GPT-4o web search preview)",
              "Set PERPLEXITY_API_KEY (Perplexity sonar)",
            ],
            sdks: "Install: @google/genai or openai",
          },
        };
      }

      try {
        let results: SearchResult[];

        switch (selectedProvider) {
          case "gemini":
            results = await searchWithGemini(query, maxResults);
            break;
          case "openai":
            results = await searchWithOpenAI(query, maxResults);
            break;
          case "perplexity":
            results = await searchWithPerplexity(query, maxResults);
            break;
        }

        return {
          query,
          results,
          provider: selectedProvider,
          resultCount: results.length,
          searchedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        return {
          error: true,
          query,
          provider: selectedProvider,
          message: `Search failed: ${err.message}`,
          suggestion: "Check that the API key is valid. Try a different provider.",
        };
      }
    },
  },
  {
    name: "fetch_url",
    description:
      "Fetch a URL and extract its content as markdown, text, or raw HTML. Useful for reading documentation, blog posts, API references, and web pages. Uses cheerio for HTML parsing when available, with fallback to basic text extraction.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch (e.g., 'https://docs.example.com/getting-started')",
        },
        extractMode: {
          type: "string",
          enum: ["markdown", "text", "html"],
          description: "How to extract content: 'markdown' (structured), 'text' (plain), 'html' (raw). Default: 'markdown'.",
        },
        maxLength: {
          type: "number",
          description: "Maximum content length to return (default: 50000 characters)",
        },
      },
      required: ["url"],
    },
    handler: async (args) => {
      const url = args.url as string;
      const extractMode = (args.extractMode as string) ?? "markdown";
      const maxLength = (args.maxLength as number) ?? 50000;

      // Validate URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return {
          error: true,
          url,
          message: "Invalid URL format",
          suggestion: "Provide a valid URL starting with http:// or https://",
        };
      }

      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; NodeBench-MCP/1.0; +https://github.com/nodebench)",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
        });

        if (!response.ok) {
          return {
            error: true,
            url,
            status: response.status,
            message: `HTTP ${response.status}: ${response.statusText}`,
            suggestion: "Check that the URL is accessible and not blocked.",
          };
        }

        const contentType = response.headers.get("content-type") ?? "";
        const html = await response.text();

        // Extract title from HTML
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        const title = titleMatch?.[1]?.trim() ?? parsedUrl.hostname;

        let content: string;

        if (extractMode === "html") {
          content = html;
        } else if (extractMode === "markdown") {
          const cheerio = await getCheerio();
          if (cheerio) {
            content = htmlToMarkdown(html, cheerio);
          } else {
            // Fallback to text extraction
            content = basicHtmlToText(html);
          }
        } else {
          // text mode
          const cheerio = await getCheerio();
          if (cheerio) {
            const $ = cheerio.load(html);
            $("script, style").remove();
            content = $("body").text().replace(/\s+/g, " ").trim();
          } else {
            content = basicHtmlToText(html);
          }
        }

        // Truncate if needed
        const truncated = content.length > maxLength;
        if (truncated) {
          content = content.slice(0, maxLength) + "\n\n... [truncated]";
        }

        return {
          url,
          finalUrl: response.url, // After redirects
          title,
          contentType,
          extractMode,
          content,
          contentLength: content.length,
          truncated,
          fetchedAt: new Date().toISOString(),
          cheerioAvailable: !!(await getCheerio()),
        };
      } catch (err: any) {
        return {
          error: true,
          url,
          message: `Fetch failed: ${err.message}`,
          suggestion: "Check network connectivity and that the URL is accessible.",
        };
      }
    },
  },
];
