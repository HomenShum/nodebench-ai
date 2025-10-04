// agents/tools/search.ts
// Local search tool over demo_scenarios. No network. Deterministic.

// Note: Avoid static Node imports to keep browser bundlers happy.
// We'll dynamically import Node modules only when running under Node.

import type { ExecContext } from '../core/execute';
import { linkupStructuredSearch, linkupImageSearch } from '../services/linkup';
import OpenAI from 'openai';

// Sanitize JSON Schema for AJV strict: replace union `type: [..]` with anyOf
function sanitizeSchemaForAjvStrict(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;
  // If `type` is an array, convert to anyOf of simple type schemas
  if (Array.isArray((schema as any).type)) {
    const types = (schema as any).type as string[];
    const rest: any = { ...schema };
    delete rest.type;
    return sanitizeSchemaForAjvStrict({ anyOf: types.map((t) => sanitizeSchemaForAjvStrict({ type: t })), ...rest });
  }
  // Recurse into known schema containers
  const out: any = Array.isArray(schema) ? [] : { ...schema };
  if (Array.isArray(schema)) {
    for (const v of schema) out.push(sanitizeSchemaForAjvStrict(v));
    return out;
  }
  if (schema.properties && typeof schema.properties === 'object') {
    out.properties = {};
    for (const k of Object.keys(schema.properties)) {
      out.properties[k] = sanitizeSchemaForAjvStrict(schema.properties[k]);
    }
  }
  if (schema.items) {
    out.items = sanitizeSchemaForAjvStrict(schema.items);
  }
  if (schema.anyOf) {
    out.anyOf = (schema.anyOf as any[]).map(sanitizeSchemaForAjvStrict);
  }
  if (schema.oneOf) {
    out.oneOf = (schema.oneOf as any[]).map(sanitizeSchemaForAjvStrict);
  }
  if (schema.allOf) {
    out.allOf = (schema.allOf as any[]).map(sanitizeSchemaForAjvStrict);
  }
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    out.additionalProperties = sanitizeSchemaForAjvStrict(schema.additionalProperties);
  }
  return out;
}

function getOpenRouterClient() {
  const orKey = process.env.OPENROUTER_API_KEY;
  const oaKey = process.env.OPENAI_API_KEY || process.env.CONVEX_OPENAI_API_KEY;
  const apiKey = orKey || oaKey;
  const baseURL = orKey
    ? (process.env.OPENROUTER_BASE_URL?.trim() || 'https://openrouter.ai/api/v1')
    : (() => {
        const base = process.env.OPENAI_BASE_URL || process.env.CONVEX_OPENAI_BASE_URL || '';
        return base ? (/\/v\d+\/?$/.test(base) ? base : base.replace(/\/?$/, '/v1')) : undefined;
      })();
  if (!apiKey) throw new Error('OPENAI_API_KEY or OPENROUTER_API_KEY is required');
  const headers: Record<string, string> = {};
  if (orKey) {
    headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL || 'https://nodebench-ai.vercel.app/';
    if (process.env.OPENROUTER_SITE_NAME) headers['X-Title'] = process.env.OPENROUTER_SITE_NAME;
  }
  return new OpenAI({ apiKey, baseURL, ...(Object.keys(headers).length ? { defaultHeaders: headers as any } : {}) } as any);
}

async function generateSchemaWithGrok(input: { query: string; intent?: string }): Promise<any | null> {
  try {
    const client = getOpenRouterClient();
    const model = process.env.OPENAI_MODEL || (process.env.OPENROUTER_API_KEY ? 'z-ai/glm-4.6' : 'gpt-5-nano');
    const system = 'You are a schema generator. Output ONLY a valid JSON Schema (draft-07) object. No prose.';
    const user = `Create a deep, task-suited JSON Schema for structured web results.\nIntent: ${input.intent || 'research'}\nQuery: ${input.query}\nConstraints: Include fields for summary, key findings, metrics (label, value, unit, date, source), entities (people, companies, orgs), timeline (date, event, source), and citations (name, url, snippet).`;
    const rsp = await client.chat.completions.create({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] });
    const text = rsp.choices?.[0]?.message?.content || '';
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    const json = start >= 0 && end > start ? text.slice(start, end + 1) : text;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function searchTool(opts: { root: string }) {
  const root = opts.root;
  return async function tool(args: { query: string; sources?: string[]; schema?: any; intent?: string; schemaGenerator?: 'grok' | 'provided'; includeImages?: boolean }, ctx: ExecContext): Promise<{ hits: Array<{ source: string; lines: number[] }>; snippet?: string; structured?: any; images?: Array<{ name: string; url: string; type: string }> }> {
    const q = String(args?.query || '').toLowerCase();

    // If includeImages is true, use image search
    if (args?.includeImages) {
      try {
        const images = await linkupImageSearch(q, 'standard');
        ctx.memory.set('lastSearchQuery', q);
        ctx.memory.set('lastSearchImages', images);
        ctx.memory.putDoc(`search_images_${Date.now()}`, JSON.stringify(images));
        return {
          hits: images.slice(0, 5).map((img) => ({ source: img.url, lines: [1] })),
          snippet: `Found ${images.length} images for "${q}"`,
          images
        };
      } catch (e) {
        ctx.trace.warn('search.linkup.images.failed', { message: (e as Error).message });
      }
    }

    // Primary: Linkup structured search (standard depth) using provided schema or a deep default
    try {
      const fallbackSchema = {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Original query or task' },
          summary: { type: 'string' },
          keyFindings: { type: 'array', items: { type: 'string' } },
          entities: { type: 'object', properties: { people: { type: 'array', items: { type: 'string' } }, companies: { type: 'array', items: { type: 'string' } }, orgs: { type: 'array', items: { type: 'string' } } } },
          metrics: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' }, unit: { type: 'string' }, date: { type: 'string' }, source: { type: 'string' } }, required: ['label', 'value'] } },
          timeline: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' }, source: { type: 'string' } }, required: ['event'] } },
          citations: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, url: { type: 'string', format: 'uri' }, snippet: { type: 'string' } }, required: ['url'] } },
        },
        required: ['summary', 'citations'],
      };
      let schema: any = args?.schema || null;
      if (!schema && args?.schemaGenerator !== 'provided') {
        schema = await generateSchemaWithGrok({ query: q, intent: args?.intent || 'research' });
      }
      schema = schema || fallbackSchema;
      schema = sanitizeSchemaForAjvStrict(schema);

      const out: any = await linkupStructuredSearch(q, schema, 'standard');
      const sources = Array.isArray(out?.sources) ? out.sources : [];
      const hits = sources.slice(0, 5).map((s: any) => ({ source: s.name || s.url, lines: [1] }));
      const snippet = (out?.answer || out?.summary || '').toString().slice(0, 200);
      if (hits.length > 0 || snippet || out) {
        ctx.memory.set('lastSearchQuery', q);
        ctx.memory.set('lastSearchSources', sources);
        ctx.memory.putDoc(`search_structured_${Date.now()}`, JSON.stringify(out));
        return { hits, snippet, structured: out };
      }
    } catch (e) {
      ctx.trace.warn('search.linkup.failed', { message: (e as Error).message });
    }

    // Fallback: internal document search (if data provider is available)
    try {
      const store: any = (ctx as any).data;
      if (store && typeof store.searchDocuments === 'function') {
        const docs = await store.searchDocuments(q);
        const hits = (docs || []).slice(0, 10).map((d: any) => ({ source: d.title || d._id, lines: [1] }));
        const snippet = hits[0]?.source || '';
        ctx.memory.set('lastSearchQuery', q);
        ctx.memory.set('lastSearchHits', hits);
        return { hits, snippet };
      }
    } catch (e) {
      ctx.trace.warn('search.store.failed', { message: (e as Error).message });
    }

    const sources = Array.isArray(args?.sources) && args.sources.length > 0
      ? args.sources
      : ['seed_notes.md', 'sample_page.html'];

    const hits: Array<{ source: string; lines: number[] }> = [];
    let snippet = '';

    for (const rel of sources) {
      try {
        // Try Node fs if available; otherwise skip local file search in the browser
        const isNode = typeof process !== 'undefined' && !!(process as any).versions?.node;
        if (!isNode) {
          ctx.trace.warn('search.local.skipped', { file: rel, reason: 'non-node runtime' });
          continue;
        }
        const { default: pathMod } = await (0, eval)("import('node:path')");
        const fsMod = await (0, eval)("import('node:fs/promises')");
        const p = pathMod.resolve(root, rel);
        const text = await fsMod.readFile(p, 'utf-8');
        const ls = text.split(/\r?\n/);
        const matched: number[] = [];
        for (let i = 0; i < ls.length; i++) {
          if (ls[i].toLowerCase().includes(q)) matched.push(i + 1);
        }
        if (matched.length > 0) {
          hits.push({ source: rel, lines: matched.slice(0, 5) });
          if (!snippet) snippet = ls[Math.max(0, matched[0] - 1)].slice(0, 200);
        }
      } catch (e) {
        ctx.trace.warn('search.read.failed', { file: rel, message: (e as Error).message });
      }
    }

    // If we couldn't run local search (e.g., browser) or found no hits, do a second attempt with structured search
    if (hits.length === 0) {
      try {
        const baseSchema = args?.schema || { type: 'object', properties: { summary: { type: 'string' }, citations: { type: 'array', items: { type: 'object', properties: { url: { type: 'string' } } } } }, required: ['summary'] };
        const sanitized = sanitizeSchemaForAjvStrict(baseSchema);
        const out: any = await linkupStructuredSearch(q, sanitized, 'standard');
        const sources = Array.isArray(out?.sources) ? out.sources : [];
        const fallbackHits = sources.slice(0, 5).map((s: any) => ({ source: s.name || s.url, lines: [1] }));
        const fallbackSnippet = (out?.answer || out?.summary || '').toString().slice(0, 200);
        if (fallbackHits.length > 0 || fallbackSnippet) {
          ctx.memory.set('lastSearchQuery', q);
          ctx.memory.set('lastSearchSources', sources);
          return { hits: fallbackHits, snippet: fallbackSnippet, structured: out };
        }
      } catch (e) {
        ctx.trace.warn('search.linkup.failed', { message: (e as Error).message });
      }
    }

    // Store artifacts
    ctx.memory.set('lastSearchQuery', q);
    ctx.memory.set('lastSearchHits', hits);

    return { hits, snippet };
  };
}

