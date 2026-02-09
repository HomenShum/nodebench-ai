/**
 * SEO Tools — Website SEO auditing, performance checks, content analysis,
 * and WordPress security assessment.
 *
 * 5 tools:
 * - seo_audit_url: Fetch URL and analyze SEO elements (title, meta, headings, images, etc.)
 * - check_page_performance: Lightweight performance checks via fetch (response time, compression, caching)
 * - analyze_seo_content: Content analysis for SEO (readability, keyword density, link ratio)
 * - check_wordpress_site: Detect WordPress and assess security posture
 * - scan_wordpress_updates: Check WordPress plugins/themes for known versions and vulnerabilities
 *
 * All tools use HTTP fetch + basic HTML parsing. No browser dependencies.
 * No external npm dependencies — uses Node's built-in fetch (Node 18+).
 */

import type { McpTool } from "../types.js";

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 10_000;

function createAbortSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

async function safeFetch(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  options: RequestInit = {},
): Promise<{ ok: boolean; status: number; headers: Headers; text: string; error?: string }> {
  try {
    const res = await fetch(url, {
      signal: createAbortSignal(timeoutMs),
      headers: {
        "User-Agent": "NodeBench-SEO-Auditor/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      ...options,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, headers: res.headers, text };
  } catch (e: any) {
    return {
      ok: false,
      status: 0,
      headers: new Headers(),
      text: "",
      error: e.name === "AbortError" ? `Request timed out after ${timeoutMs}ms` : e.message,
    };
  }
}

// ─── HTML parsing helpers ─────────────────────────────────────────────────────

function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function extractMeta(html: string, name: string): string | null {
  // Match both name="..." and property="..."
  const nameRegex = new RegExp(
    `<meta\\s+(?:[^>]*?)?(?:name|property)\\s*=\\s*["']${escapeRegex(name)}["'][^>]*?content\\s*=\\s*["']([^"']*)["'][^>]*?>`,
    "i",
  );
  const match = html.match(nameRegex);
  if (match) return match[1];

  // Try reversed attribute order: content before name/property
  const reversedRegex = new RegExp(
    `<meta\\s+(?:[^>]*?)?content\\s*=\\s*["']([^"']*)["'][^>]*?(?:name|property)\\s*=\\s*["']${escapeRegex(name)}["'][^>]*?>`,
    "i",
  );
  const reversedMatch = html.match(reversedRegex);
  return reversedMatch ? reversedMatch[1] : null;
}

function extractLinkRel(html: string, rel: string): string | null {
  const regex = new RegExp(
    `<link\\s+(?:[^>]*?)?rel\\s*=\\s*["']${escapeRegex(rel)}["'][^>]*?href\\s*=\\s*["']([^"']*)["'][^>]*?>`,
    "i",
  );
  const match = html.match(regex);
  if (match) return match[1];

  // Reversed attribute order
  const reversedRegex = new RegExp(
    `<link\\s+(?:[^>]*?)?href\\s*=\\s*["']([^"']*)["'][^>]*?rel\\s*=\\s*["']${escapeRegex(rel)}["'][^>]*?>`,
    "i",
  );
  const reversedMatch = html.match(reversedRegex);
  return reversedMatch ? reversedMatch[1] : null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countHeadings(html: string): Record<string, number> {
  const counts: Record<string, number> = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  for (const level of ["h1", "h2", "h3", "h4", "h5", "h6"]) {
    const regex = new RegExp(`<${level}[\\s>]`, "gi");
    const matches = html.match(regex);
    counts[level] = matches ? matches.length : 0;
  }
  return counts;
}

function countImages(html: string): { total: number; withoutAlt: number } {
  const imgRegex = /<img\s[^>]*?>/gi;
  const imgs = html.match(imgRegex) || [];
  const total = imgs.length;
  let withoutAlt = 0;
  for (const img of imgs) {
    // Check if alt attribute exists and is non-empty
    const altMatch = img.match(/\salt\s*=\s*["']([^"']*)["']/i);
    if (!altMatch || altMatch[1].trim() === "") {
      withoutAlt++;
    }
  }
  return { total, withoutAlt };
}

// ─── Content analysis helpers ─────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 2) return 1;
  // Count vowel groups
  const vowelGroups = w.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  // Silent e at end
  if (w.endsWith("e") && count > 1) count--;
  return Math.max(1, count);
}

function fleschKincaidScore(words: number, sentences: number, syllables: number): number {
  if (sentences === 0 || words === 0) return 0;
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
}

function readabilityLevel(score: number): string {
  if (score >= 90) return "Very Easy (5th grade)";
  if (score >= 80) return "Easy (6th grade)";
  if (score >= 70) return "Fairly Easy (7th grade)";
  if (score >= 60) return "Standard (8th-9th grade)";
  if (score >= 50) return "Fairly Difficult (10th-12th grade)";
  if (score >= 30) return "Difficult (College)";
  return "Very Difficult (College Graduate)";
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const seoTools: McpTool[] = [
  {
    name: "seo_audit_url",
    description:
      "Fetch a URL and analyze its SEO elements: title tag, meta description, Open Graph tags (og:title, og:description, og:image), heading hierarchy (h1-h6 counts), images without alt text, canonical URL, robots meta, and structured data (JSON-LD). Scores each element 0-100 and returns a total score with actionable recommendations. Uses HTTP fetch with regex-based HTML parsing — no browser needed.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to audit" },
        timeout: {
          type: "number",
          description: "Request timeout in milliseconds (default: 10000)",
        },
      },
      required: ["url"],
    },
    handler: async (args: any) => {
      const url: string = args.url;
      const timeoutMs: number = args.timeout ?? DEFAULT_TIMEOUT_MS;

      const res = await safeFetch(url, timeoutMs);
      if (!res.ok) {
        return {
          error: true,
          url,
          status: res.status,
          message: res.error || `HTTP ${res.status}`,
        };
      }

      const html = res.text;
      const recommendations: string[] = [];

      // ── Title ──
      const title = extractTag(html, "title");
      const titleLength = title ? title.length : 0;
      let titleScore = 0;
      const titleIssues: string[] = [];
      if (!title) {
        titleIssues.push("Missing title tag");
        recommendations.push("Add a <title> tag — it is the most important on-page SEO element.");
      } else {
        if (titleLength < 30) {
          titleIssues.push("Title too short (< 30 chars)");
          recommendations.push("Lengthen the title to at least 30 characters for better CTR.");
        } else if (titleLength > 60) {
          titleIssues.push("Title too long (> 60 chars) — may be truncated in SERPs");
          recommendations.push("Shorten the title to 60 characters or fewer to avoid truncation.");
        }
        titleScore = titleLength >= 30 && titleLength <= 60 ? 100 : titleLength > 0 ? 60 : 0;
      }

      // ── Meta description ──
      const metaDesc = extractMeta(html, "description");
      const metaDescLength = metaDesc ? metaDesc.length : 0;
      let metaDescScore = 0;
      const metaDescIssues: string[] = [];
      if (!metaDesc) {
        metaDescIssues.push("Missing meta description");
        recommendations.push("Add a meta description — it directly affects click-through rates.");
      } else {
        if (metaDescLength < 70) {
          metaDescIssues.push("Meta description too short (< 70 chars)");
          recommendations.push("Expand the meta description to at least 70 characters.");
        } else if (metaDescLength > 160) {
          metaDescIssues.push("Meta description too long (> 160 chars)");
          recommendations.push("Trim the meta description to 160 characters or fewer.");
        }
        metaDescScore = metaDescLength >= 70 && metaDescLength <= 160 ? 100 : metaDescLength > 0 ? 60 : 0;
      }

      // ── Open Graph ──
      const ogTitle = extractMeta(html, "og:title");
      const ogDescription = extractMeta(html, "og:description");
      const ogImage = extractMeta(html, "og:image");
      let ogScore = 0;
      const ogIssues: string[] = [];
      if (!ogTitle) ogIssues.push("Missing og:title");
      if (!ogDescription) ogIssues.push("Missing og:description");
      if (!ogImage) ogIssues.push("Missing og:image");
      ogScore = Math.round(([ogTitle, ogDescription, ogImage].filter(Boolean).length / 3) * 100);
      if (ogScore < 100) {
        recommendations.push(`Add missing Open Graph tags: ${ogIssues.join(", ")}.`);
      }

      // ── Headings ──
      const headings = countHeadings(html);
      let headingScore = 100;
      const headingIssues: string[] = [];
      if (headings.h1 === 0) {
        headingIssues.push("No H1 tag found");
        headingScore -= 40;
        recommendations.push("Add exactly one H1 tag — it signals the main topic to search engines.");
      } else if (headings.h1 > 1) {
        headingIssues.push(`Multiple H1 tags (${headings.h1}) — use exactly one`);
        headingScore -= 20;
        recommendations.push("Reduce to a single H1 tag for clearer content hierarchy.");
      }
      if (headings.h2 === 0) {
        headingIssues.push("No H2 tags — add subheadings for structure");
        headingScore -= 20;
        recommendations.push("Add H2 subheadings to improve content structure and scannability.");
      }
      headingScore = Math.max(0, headingScore);

      // ── Images ──
      const images = countImages(html);
      let imageScore = 100;
      const imageIssues: string[] = [];
      if (images.total > 0 && images.withoutAlt > 0) {
        const pct = Math.round((images.withoutAlt / images.total) * 100);
        imageIssues.push(`${images.withoutAlt}/${images.total} images missing alt text (${pct}%)`);
        imageScore = Math.max(0, Math.round(100 - pct));
        recommendations.push(`Add alt text to ${images.withoutAlt} image(s) for accessibility and image SEO.`);
      }

      // ── Canonical ──
      const canonical = extractLinkRel(html, "canonical");
      let canonicalScore = canonical ? 100 : 0;
      const canonicalIssues: string[] = [];
      if (!canonical) {
        canonicalIssues.push("Missing canonical URL");
        canonicalScore = 0;
        recommendations.push("Add a <link rel=\"canonical\"> tag to prevent duplicate content issues.");
      }

      // ── Robots meta ──
      const robotsMeta = extractMeta(html, "robots");
      let robotsScore = 100;
      const robotsIssues: string[] = [];
      if (!robotsMeta) {
        robotsIssues.push("No robots meta tag (defaults to index, follow)");
        robotsScore = 80; // Not strictly required
      } else if (robotsMeta.toLowerCase().includes("noindex")) {
        robotsIssues.push("Page is set to noindex — will not appear in search results");
        robotsScore = 20;
        recommendations.push("Remove noindex directive if this page should be indexed.");
      }

      // ── Structured data ──
      const hasJsonLd = /<script\s+type\s*=\s*["']application\/ld\+json["'][^>]*>/i.test(html);
      let structuredDataScore = hasJsonLd ? 100 : 0;
      const structuredDataIssues: string[] = [];
      if (!hasJsonLd) {
        structuredDataIssues.push("No JSON-LD structured data found");
        structuredDataScore = 0;
        recommendations.push("Add JSON-LD structured data for rich snippets in search results.");
      }

      // ── Total score ──
      const weights = {
        title: 20,
        metaDescription: 15,
        openGraph: 10,
        headings: 15,
        images: 10,
        canonical: 10,
        robots: 10,
        structuredData: 10,
      };
      const totalScore = Math.round(
        (titleScore * weights.title +
          metaDescScore * weights.metaDescription +
          ogScore * weights.openGraph +
          headingScore * weights.headings +
          imageScore * weights.images +
          canonicalScore * weights.canonical +
          robotsScore * weights.robots +
          structuredDataScore * weights.structuredData) /
          Object.values(weights).reduce((a, b) => a + b, 0),
      );

      return {
        url,
        score: totalScore,
        elements: {
          title: { content: title, length: titleLength, score: titleScore, issues: titleIssues },
          metaDescription: { content: metaDesc, length: metaDescLength, score: metaDescScore, issues: metaDescIssues },
          openGraph: {
            ogTitle,
            ogDescription,
            ogImage,
            score: ogScore,
            issues: ogIssues,
          },
          headings: { counts: headings, score: headingScore, issues: headingIssues },
          images: { total: images.total, withoutAlt: images.withoutAlt, score: imageScore, issues: imageIssues },
          canonical: { url: canonical, score: canonicalScore, issues: canonicalIssues },
          robots: { content: robotsMeta, score: robotsScore, issues: robotsIssues },
          structuredData: { hasJsonLd, score: structuredDataScore, issues: structuredDataIssues },
        },
        recommendations,
      };
    },
  },

  {
    name: "check_page_performance",
    description:
      "Lightweight page performance check via HTTP fetch (no browser). Measures: response time, content size, compression (content-encoding header), cache headers (cache-control, etag, last-modified), and HTTP status. Returns a performance score with recommendations for improvement.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to check" },
      },
      required: ["url"],
    },
    handler: async (args: any) => {
      const url: string = args.url;
      const recommendations: string[] = [];

      const startTime = Date.now();
      const res = await safeFetch(url);
      const responseTimeMs = Date.now() - startTime;

      if (!res.ok) {
        return {
          error: true,
          url,
          status: res.status,
          responseTimeMs,
          message: res.error || `HTTP ${res.status}`,
        };
      }

      const contentSizeBytes = new TextEncoder().encode(res.text).length;
      const contentEncoding = res.headers.get("content-encoding");
      const compressed = !!contentEncoding;
      const cacheControl = res.headers.get("cache-control");
      const etag = res.headers.get("etag");
      const lastModified = res.headers.get("last-modified");

      // ── Scoring ──
      let score = 100;

      // Response time scoring
      if (responseTimeMs > 3000) {
        score -= 30;
        recommendations.push(`Response time is ${responseTimeMs}ms — aim for under 1000ms. Consider CDN, caching, or server optimization.`);
      } else if (responseTimeMs > 1500) {
        score -= 15;
        recommendations.push(`Response time is ${responseTimeMs}ms — aim for under 1000ms.`);
      } else if (responseTimeMs > 1000) {
        score -= 5;
      }

      // Content size scoring
      if (contentSizeBytes > 500_000) {
        score -= 20;
        recommendations.push(`Page size is ${Math.round(contentSizeBytes / 1024)}KB — consider reducing HTML, inlining less CSS/JS, or lazy-loading assets.`);
      } else if (contentSizeBytes > 200_000) {
        score -= 10;
        recommendations.push(`Page size is ${Math.round(contentSizeBytes / 1024)}KB — could be smaller.`);
      }

      // Compression scoring
      if (!compressed) {
        score -= 15;
        recommendations.push("Enable gzip or brotli compression — the response has no content-encoding header.");
      }

      // Cache scoring
      if (!cacheControl) {
        score -= 10;
        recommendations.push("Add Cache-Control headers to improve repeat visit performance.");
      } else if (cacheControl.includes("no-cache") || cacheControl.includes("no-store")) {
        score -= 5;
        recommendations.push("Cache-Control disables caching. Consider allowing caching for static assets.");
      }

      if (!etag && !lastModified) {
        score -= 5;
        recommendations.push("Add ETag or Last-Modified headers to enable conditional requests (304 responses).");
      }

      score = Math.max(0, score);

      return {
        url,
        responseTimeMs,
        contentSizeBytes,
        contentSizeKB: Math.round(contentSizeBytes / 1024),
        compressed,
        contentEncoding: contentEncoding || "none",
        cacheHeaders: {
          cacheControl: cacheControl || null,
          etag: etag || null,
          lastModified: lastModified || null,
        },
        httpStatus: res.status,
        score,
        recommendations,
      };
    },
  },

  {
    name: "analyze_seo_content",
    description:
      "Analyze HTML or text content for SEO quality: word count, sentence count, paragraph count, Flesch-Kincaid readability score, heading structure, keyword density (if targetKeyword provided), and internal vs external link ratio. Works on raw HTML or plain text. No network requests — pure content analysis.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "HTML or plain text content to analyze" },
        targetKeyword: {
          type: "string",
          description: "Target keyword/phrase to measure density for (optional)",
        },
      },
      required: ["content"],
    },
    handler: async (args: any) => {
      const content: string = args.content;
      const targetKeyword: string | undefined = args.targetKeyword;
      const recommendations: string[] = [];

      // Strip HTML for text analysis
      const plainText = stripHtml(content);
      const words = plainText.split(/\s+/).filter((w: string) => w.length > 0);
      const wordCount = words.length;

      // Sentence count — split on sentence-ending punctuation
      const sentences = plainText.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
      const sentenceCount = sentences.length;

      // Paragraph count — split on double newlines or <p> tags
      const isHtml = /<[a-z][\s\S]*>/i.test(content);
      let paragraphCount: number;
      if (isHtml) {
        const pTags = content.match(/<p[\s>]/gi);
        paragraphCount = pTags ? pTags.length : 1;
      } else {
        const paras = content.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
        paragraphCount = paras.length;
      }

      // Syllable count and readability
      const totalSyllables = words.reduce((sum: number, w: string) => sum + countSyllables(w), 0);
      const rawReadability = fleschKincaidScore(wordCount, sentenceCount, totalSyllables);
      const readabilityScore = Math.round(Math.max(0, Math.min(100, rawReadability)));
      const level = readabilityLevel(readabilityScore);

      // Heading structure
      const headingStructure: Record<string, number> = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
      if (isHtml) {
        const htmlHeadings = countHeadings(content);
        Object.assign(headingStructure, htmlHeadings);
      } else {
        // Markdown headings
        const lines = content.split("\n");
        for (const line of lines) {
          const match = line.match(/^(#{1,6})\s/);
          if (match) {
            const level = `h${match[1].length}`;
            headingStructure[level] = (headingStructure[level] || 0) + 1;
          }
        }
      }

      // Keyword density
      let keywordDensity: { keyword: string; count: number; density: number; recommendation: string } | undefined;
      if (targetKeyword && wordCount > 0) {
        const kwLower = targetKeyword.toLowerCase();
        const textLower = plainText.toLowerCase();
        let kwCount = 0;
        let searchPos = 0;
        while (true) {
          const idx = textLower.indexOf(kwLower, searchPos);
          if (idx === -1) break;
          kwCount++;
          searchPos = idx + 1;
        }
        const density = Math.round((kwCount / wordCount) * 10000) / 100; // percentage with 2 decimals
        let kwRec = "";
        if (density === 0) {
          kwRec = `Target keyword "${targetKeyword}" not found — include it naturally in the content.`;
          recommendations.push(kwRec);
        } else if (density < 0.5) {
          kwRec = `Keyword density is low (${density}%) — consider adding more natural mentions.`;
          recommendations.push(kwRec);
        } else if (density > 3) {
          kwRec = `Keyword density is high (${density}%) — risk of keyword stuffing. Reduce mentions.`;
          recommendations.push(kwRec);
        } else {
          kwRec = `Keyword density of ${density}% is in the optimal range (0.5-3%).`;
        }
        keywordDensity = { keyword: targetKeyword, count: kwCount, density, recommendation: kwRec };
      }

      // Link analysis
      const linkRegex = /<a\s[^>]*href\s*=\s*["']([^"']*)["'][^>]*>/gi;
      let linkMatch: RegExpExecArray | null;
      let internalLinks = 0;
      let externalLinks = 0;
      while ((linkMatch = linkRegex.exec(content)) !== null) {
        const href = linkMatch[1];
        if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")) {
          externalLinks++;
        } else if (href.startsWith("#") || href.startsWith("/") || href.startsWith("./") || href.startsWith("../")) {
          internalLinks++;
        } else {
          // Relative link without prefix — treat as internal
          internalLinks++;
        }
      }
      const linkRatio = externalLinks > 0 ? Math.round((internalLinks / externalLinks) * 100) / 100 : internalLinks > 0 ? Infinity : 0;

      // Content-level recommendations
      if (wordCount < 300) {
        recommendations.push("Content is thin (< 300 words). Aim for 800+ words for competitive SEO.");
      } else if (wordCount < 800) {
        recommendations.push("Content length is moderate. Consider expanding to 1000+ words for long-tail keyword coverage.");
      }

      if (readabilityScore < 50) {
        recommendations.push("Content is difficult to read. Simplify sentences and use shorter words.");
      }

      if (headingStructure.h1 === 0 && isHtml) {
        recommendations.push("Add an H1 heading to establish the main topic.");
      }

      if (sentenceCount > 0 && wordCount / sentenceCount > 25) {
        recommendations.push("Average sentence length is high. Break long sentences for better readability.");
      }

      return {
        wordCount,
        sentenceCount,
        paragraphCount,
        avgWordsPerSentence: sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0,
        totalSyllables,
        readabilityScore,
        readabilityLevel: level,
        headingStructure,
        keywordDensity,
        linkAnalysis: {
          internal: internalLinks,
          external: externalLinks,
          ratio: linkRatio,
        },
        recommendations,
      };
    },
  },

  {
    name: "check_wordpress_site",
    description:
      "Detect whether a site runs WordPress and assess its security posture. Checks: WP generator meta tag, wp-content/wp-includes paths, WP REST API (/wp-json/), login page (/wp-login.php), XML-RPC (/xmlrpc.php), active theme, and visible plugins. Returns WordPress detection confidence, theme info, plugin list, and security score with risk assessments.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL of the site to check" },
        timeout: {
          type: "number",
          description: "Request timeout in milliseconds (default: 10000)",
        },
      },
      required: ["url"],
    },
    handler: async (args: any) => {
      const rawUrl: string = args.url.replace(/\/$/, "");
      const timeoutMs: number = args.timeout ?? DEFAULT_TIMEOUT_MS;
      const recommendations: string[] = [];

      // Fetch main page
      const mainRes = await safeFetch(rawUrl, timeoutMs);
      if (!mainRes.ok) {
        return {
          error: true,
          url: rawUrl,
          status: mainRes.status,
          message: mainRes.error || `HTTP ${mainRes.status}`,
        };
      }

      const html = mainRes.text;

      // ── WordPress detection signals ──
      const signals: string[] = [];

      // Generator meta tag
      const generator = extractMeta(html, "generator");
      let version: string | null = null;
      if (generator && /wordpress/i.test(generator)) {
        signals.push("generator meta tag");
        const versionMatch = generator.match(/WordPress\s+([\d.]+)/i);
        if (versionMatch) version = versionMatch[1];
      }

      // wp-content / wp-includes in HTML
      if (/\/wp-content\//i.test(html)) signals.push("wp-content path in HTML");
      if (/\/wp-includes\//i.test(html)) signals.push("wp-includes path in HTML");

      const isWordPress = signals.length > 0;

      // ── Theme detection ──
      let theme: string | null = null;
      const themeMatch = html.match(/\/wp-content\/themes\/([a-zA-Z0-9_-]+)\//i);
      if (themeMatch) theme = themeMatch[1];

      // ── Plugin detection from HTML ──
      const pluginSet = new Set<string>();
      const pluginRegex = /\/wp-content\/plugins\/([a-zA-Z0-9_-]+)\//gi;
      let pluginMatch: RegExpExecArray | null;
      while ((pluginMatch = pluginRegex.exec(html)) !== null) {
        pluginSet.add(pluginMatch[1]);
      }
      const plugins = Array.from(pluginSet);

      // ── Security checks (only if WordPress detected) ──
      let wpJsonExposed = false;
      let loginExposed = false;
      let xmlrpcExposed = false;
      const risks: string[] = [];

      if (isWordPress) {
        // Check /wp-json/
        try {
          const wpJsonRes = await safeFetch(`${rawUrl}/wp-json/`, timeoutMs);
          if (wpJsonRes.ok) {
            wpJsonExposed = true;
            risks.push("WP REST API is publicly accessible — may expose user data and site structure.");
            recommendations.push("Restrict WP REST API access to authenticated users or disable unused endpoints.");
          }
        } catch { /* ignore */ }

        // Check /wp-login.php
        try {
          const loginRes = await safeFetch(`${rawUrl}/wp-login.php`, timeoutMs);
          if (loginRes.ok || loginRes.status === 200) {
            loginExposed = true;
            risks.push("Login page is publicly accessible — susceptible to brute force attacks.");
            recommendations.push("Move or protect wp-login.php with IP allowlisting, 2FA, or a security plugin.");
          }
        } catch { /* ignore */ }

        // Check /xmlrpc.php
        try {
          const xmlrpcRes = await safeFetch(`${rawUrl}/xmlrpc.php`, timeoutMs);
          if (xmlrpcRes.ok || xmlrpcRes.status === 405) {
            xmlrpcExposed = true;
            risks.push("XML-RPC is exposed — enables brute force amplification and DDoS pingback attacks.");
            recommendations.push("Disable XML-RPC if not needed (block via .htaccess or security plugin).");
          }
        } catch { /* ignore */ }

        // Version-based recommendation
        if (version) {
          recommendations.push(`WordPress version ${version} detected in source. Remove the generator meta tag to hide version info.`);
        }

        if (plugins.length > 10) {
          recommendations.push(`${plugins.length} plugins detected — each adds attack surface. Audit and remove unused plugins.`);
        }
      }

      // Security score
      let securityScore = 100;
      if (wpJsonExposed) securityScore -= 20;
      if (loginExposed) securityScore -= 25;
      if (xmlrpcExposed) securityScore -= 30;
      if (version) securityScore -= 10; // Version leak
      securityScore = Math.max(0, securityScore);

      return {
        url: rawUrl,
        isWordPress,
        detectionSignals: signals,
        version,
        theme,
        plugins,
        pluginCount: plugins.length,
        security: {
          wpJsonExposed,
          loginExposed,
          xmlrpcExposed,
          score: securityScore,
          risks,
        },
        recommendations: isWordPress
          ? recommendations
          : ["Site does not appear to be WordPress — no WP-specific recommendations."],
      };
    },
  },

  {
    name: "scan_wordpress_updates",
    description:
      "Scan a WordPress site for plugin and theme versions, and optionally check for known vulnerabilities via the WPScan API. Detects plugins/themes from page source and extracts versions from ?ver= query params. If wpscanApiToken is provided, queries the WPScan vulnerability database for each detected plugin.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The WordPress site URL to scan" },
        wpscanApiToken: {
          type: "string",
          description: "WPScan API token for vulnerability lookups (optional — get one free at https://wpscan.com)",
        },
      },
      required: ["url"],
    },
    handler: async (args: any) => {
      const rawUrl: string = args.url.replace(/\/$/, "");
      const wpscanApiToken: string | undefined = args.wpscanApiToken;
      const recommendations: string[] = [];

      // Fetch main page
      const mainRes = await safeFetch(rawUrl);
      if (!mainRes.ok) {
        return {
          error: true,
          url: rawUrl,
          status: mainRes.status,
          message: mainRes.error || `HTTP ${mainRes.status}`,
        };
      }

      const html = mainRes.text;

      // ── Detect plugins with versions ──
      const pluginMap = new Map<string, string | null>();
      const pluginRegex = /\/wp-content\/plugins\/([a-zA-Z0-9_-]+)\/[^"']*?(?:\?ver=([0-9.]+))?/gi;
      let match: RegExpExecArray | null;
      while ((match = pluginRegex.exec(html)) !== null) {
        const name = match[1];
        const ver = match[2] || null;
        // Keep the version if we found one (don't overwrite version with null)
        if (!pluginMap.has(name) || (ver && !pluginMap.get(name))) {
          pluginMap.set(name, ver);
        }
      }

      // Also try to extract versions from generic script/style ver params
      const verRegex = /\/wp-content\/plugins\/([a-zA-Z0-9_-]+)\/[^"'\s]*["']/gi;
      while ((match = verRegex.exec(html)) !== null) {
        const name = match[1];
        if (!pluginMap.has(name)) {
          pluginMap.set(name, null);
        }
      }

      // ── Detect themes with versions ──
      const themeMap = new Map<string, string | null>();
      const themeRegex = /\/wp-content\/themes\/([a-zA-Z0-9_-]+)\/[^"']*?(?:\?ver=([0-9.]+))?/gi;
      while ((match = themeRegex.exec(html)) !== null) {
        const name = match[1];
        const ver = match[2] || null;
        if (!themeMap.has(name) || (ver && !themeMap.get(name))) {
          themeMap.set(name, ver);
        }
      }

      // ── Try WP REST API for plugin info (usually requires auth) ──
      try {
        const wpPluginsRes = await safeFetch(`${rawUrl}/wp-json/wp/v2/plugins`);
        if (wpPluginsRes.ok) {
          try {
            const pluginsData = JSON.parse(wpPluginsRes.text);
            if (Array.isArray(pluginsData)) {
              for (const p of pluginsData) {
                const slug = p.plugin?.split("/")?.[0] || p.textdomain;
                if (slug) {
                  pluginMap.set(slug, p.version || pluginMap.get(slug) || null);
                }
              }
            }
          } catch { /* JSON parse failed */ }
        }
      } catch { /* ignore */ }

      // ── WPScan vulnerability lookup ──
      const pluginsResult: Array<{
        name: string;
        version: string | null;
        vulnerabilities?: Array<{ title: string; fixedIn: string | null; severity: string | null }>;
      }> = [];

      let totalVulnerabilities = 0;

      const pluginEntries = Array.from(pluginMap.entries());
      for (let pi = 0; pi < pluginEntries.length; pi++) {
        const name = pluginEntries[pi][0];
        const version = pluginEntries[pi][1];
        const entry: (typeof pluginsResult)[0] = { name, version };

        if (wpscanApiToken) {
          try {
            const wpscanRes = await safeFetch(
              `https://wpscan.com/api/v3/plugins/${name}`,
              DEFAULT_TIMEOUT_MS,
              { headers: { Authorization: `Token token=${wpscanApiToken}` } as any },
            );
            if (wpscanRes.ok) {
              try {
                const data = JSON.parse(wpscanRes.text);
                const pluginData = data[name];
                if (pluginData?.vulnerabilities) {
                  entry.vulnerabilities = pluginData.vulnerabilities.map((v: any) => ({
                    title: v.title || "Unknown vulnerability",
                    fixedIn: v.fixed_in || null,
                    severity: v.cvss?.severity || null,
                  }));
                  // Filter to only show vulns affecting the detected version
                  if (version && entry.vulnerabilities) {
                    const relevant = entry.vulnerabilities.filter(
                      (v) => !v.fixedIn || compareVersions(version, v.fixedIn) < 0,
                    );
                    totalVulnerabilities += relevant.length;
                    entry.vulnerabilities = relevant;
                  } else {
                    totalVulnerabilities += entry.vulnerabilities?.length ?? 0;
                  }
                }
              } catch { /* JSON parse failed */ }
            }
          } catch { /* ignore */ }
        }

        pluginsResult.push(entry);
      }

      const themesResult: Array<{ name: string; version: string | null }> = [];
      const themeEntries = Array.from(themeMap.entries());
      for (let ti = 0; ti < themeEntries.length; ti++) {
        themesResult.push({ name: themeEntries[ti][0], version: themeEntries[ti][1] });
      }

      // ── Recommendations ──
      const noVersionPlugins = pluginsResult.filter((p) => !p.version);
      if (noVersionPlugins.length > 0) {
        recommendations.push(
          `${noVersionPlugins.length} plugin(s) have unknown versions — cannot verify if they are up to date.`,
        );
      }

      if (totalVulnerabilities > 0) {
        recommendations.push(
          `${totalVulnerabilities} known vulnerabilities found. Update affected plugins immediately.`,
        );
      }

      if (!wpscanApiToken) {
        recommendations.push(
          "Provide a wpscanApiToken to check for known vulnerabilities (free at https://wpscan.com).",
        );
      }

      if (pluginsResult.length === 0 && themeMap.size === 0) {
        recommendations.push("No plugins or themes detected in page source — site may not be WordPress.");
      }

      return {
        url: rawUrl,
        plugins: pluginsResult,
        pluginCount: pluginsResult.length,
        themes: themesResult,
        themeCount: themesResult.length,
        totalVulnerabilities,
        wpscanApiUsed: !!wpscanApiToken,
        recommendations,
      };
    },
  },
];

// ─── Version comparison helper ────────────────────────────────────────────────

function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const va = partsA[i] || 0;
    const vb = partsB[i] || 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}
