// agents/tools/openai.ts
// OpenAI-backed tools for 'answer' and 'summarize' steps.

import OpenAI from 'openai';
import type { ExecContext, Tool } from '../core/execute';
import type { ContextStore } from '../data/contextStore';

function getClient() {
  // Strong precedence: if using OpenRouter, always use its base URL regardless of OPENAI_BASE_URL
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

async function gatherContextText(ctx: ExecContext, input: { query?: string; docId?: string; agendaRange?: { start: number; end: number } }) {
  const parts: string[] = [];
  const store: ContextStore | undefined = (ctx as any).data;

  if (store && input.query) {
    const canSearch = typeof (store as any).searchDocuments === 'function';
    if (canSearch) {
      try {
        const docs = await (store as any).searchDocuments(input.query);
        const titles = docs.slice(0, 5).map((d: any) => `• ${d.title || d._id}`).join('\n');
        if (titles) parts.push(`# Matching Docs\n${titles}`);
      } catch (e) {
        ctx.trace.warn('openai.ctx.search.failed', { message: (e as Error).message });
      }
    }
  }

  if (store && input.docId) {
    const canGetDoc = typeof (store as any).getDocumentById === 'function';
    if (canGetDoc) {
      try {
        const doc = await (store as any).getDocumentById(input.docId);
        if (doc) {
          const preview = (doc.contentPreview || doc.content || '').toString().slice(0, 2000);
          parts.push(`# Active Document: ${doc.title || doc._id}\n${preview}`);
        }
      } catch (e) {
        ctx.trace.warn('openai.ctx.doc.failed', { message: (e as Error).message });
      }
    }
  }

  if (store && input.agendaRange) {
    const canListAgenda = typeof (store as any).listAgendaInRange === 'function';
    if (canListAgenda) {
      try {
        const ag = await (store as any).listAgendaInRange(input.agendaRange);
        const ev = (ag.events || []).slice(0, 5).map((e: any) => `• ${e.title || e.name || 'event'}`).join('\n');
        const tasks = (ag.tasks || []).slice(0, 5).map((t: any) => `• ${t.title || t.name || 'task'}`).join('\n');
        const holidays = (ag.holidays || []).slice(0, 5).map((h: any) => `• ${h.name || h.title || 'holiday'}`).join('\n');
        const notes = (ag.notes || []).slice(0, 5).map((n: any) => `• ${n.title}`).join('\n');
        const agendaText = [`# Agenda Snapshot`, ev && `Events\n${ev}`, tasks && `Tasks\n${tasks}`, holidays && `Holidays\n${holidays}`, notes && `Notes\n${notes}`].filter(Boolean).join('\n\n');
        if (agendaText) parts.push(agendaText);
      } catch (e) {
        ctx.trace.warn('openai.ctx.agenda.failed', { message: (e as Error).message });

      }
    }
  }

  return parts.filter(Boolean).join('\n\n---\n\n');
}


// Robust completion with retry and model fallback for provider 429s
async function createWithFallback(client: any, payloadBase: any, ctx: ExecContext) {
  const orKey = process.env.OPENROUTER_API_KEY;
  // Candidate models prioritized. You can override by setting OPENAI_MODEL
  const envModel = process.env.OPENAI_MODEL?.trim();
  const candidates: string[] = envModel
    ? [envModel]
    : (orKey
        ? [
            'z-ai/glm-4.6',          // GLM 4.6 via OpenRouter
            'openai/gpt-5-mini',     // OpenRouter route to OpenAI
          ]
        : [
            'gpt-5-mini',
          ]);

  const maxAttemptsPerModel = 2;
  for (const model of candidates) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      try {
        const t0 = Date.now();
        const rsp = await client.chat.completions.create({ ...payloadBase, model });
        const dt = Date.now() - t0;
        ctx.trace.info('openai.completion.success', { model, elapsedMs: dt, attempt });
        return rsp;
      } catch (e: any) {
        const code = e?.status ?? e?.code ?? e?.response?.status;
        const msg = e?.error?.metadata?.raw || e?.message || String(e);
        ctx.trace.warn('openai.completion.retry', { model, attempt, code, message: msg?.slice(0, 200) });
        // Exponential backoff on 429/503; otherwise rethrow
        if (code === 429 || code === 503) {
          const delay = 600 * attempt;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        // If it's a provider/model availability issue, try next model
        if (typeof msg === 'string' && /temporarily rate-limited|model.*not.*available/i.test(msg)) {
          break;
        }
        throw e;
      }
    }
  }
  throw new Error('All model attempts failed due to rate limits or errors');
}

export const answerTool: Tool = async (args: any, ctx: ExecContext) => {
  const client = getClient();
  const query = String(args?.query || args?.goal || '');
  const contextText = await gatherContextText(ctx, {
    query,
    docId: args?.docId,
    agendaRange: args?.agendaRange,
  });

  const system = 'You are a helpful assistant. Use provided context when relevant.';

  // Multimodal support (OpenRouter Grok 4 fast): args.imageUrl or args.imageUrls
  const imageUrls: string[] = ([] as string[])
    .concat(args?.imageUrl ? [String(args.imageUrl)] : [])
    .concat(Array.isArray(args?.imageUrls) ? args.imageUrls.map(String) : []);

  const resolvedImageUrls = imageUrls.map((u) =>
    u === '@updated_screenshot'
      ? (process.env.UPDATED_SCREENSHOT_URL || process.env.OPENROUTER_TEST_IMAGE_URL || 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg')
      : u
  );

  const userContent = resolvedImageUrls.length
    ? [
        { type: 'text', text: [contextText ? `# Context\n${contextText}` : '', `# Question\n${query}`].filter(Boolean).join('\n\n') },
        ...resolvedImageUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
      ]
    : [contextText ? `# Context\n${contextText}` : '', `# Question\n${query}`].filter(Boolean).join('\n\n');

  const messages: any[] = [
    { role: 'system', content: system },
    { role: 'user', content: userContent as any },
  ];

  const t0 = Date.now();
  const rsp = await createWithFallback(client, { messages }, ctx);
  const dt = Date.now() - t0;
  const content = rsp.choices?.[0]?.message?.content || '';

  // Usage metrics (if provided by provider)
  const usage = (rsp as any)?.usage || {};
  const inputTokens = usage.prompt_tokens ?? usage.input_tokens ?? undefined;
  const outputTokens = usage.completion_tokens ?? usage.output_tokens ?? undefined;
  const totalTokens = usage.total_tokens ?? (typeof inputTokens === 'number' && typeof outputTokens === 'number' ? inputTokens + outputTokens : undefined);
  ctx.trace.info('tool.usage', { tool: 'answer', elapsedMs: dt, inputTokens, outputTokens, totalTokens });


  // Store artifacts & metrics
  const ts = Date.now();
  ctx.memory.putDoc(`answer_${ts}`, content);
  ctx.memory.putDoc(`usage_${ts}`, JSON.stringify({ inputTokens, outputTokens, totalTokens, elapsedMs: dt }));
  return content;
};

export const summarizeTool: Tool = async (args: any, ctx: ExecContext) => {
  const client = getClient();
  const textInput = String(args?.text || '');
  const sentences = Number(args?.sentences || 2);

  // Prefer doc content via store if docId supplied
  let base = textInput;
  const store: ContextStore | undefined = (ctx as any).data;
  if (!base && store && args?.docId) {
    const canGetDoc = typeof (store as any).getDocumentById === 'function';
    if (canGetDoc) {
      try {
        const doc = await (store as any).getDocumentById(String(args.docId));
        base = (doc?.content || doc?.contentPreview || '').toString();
      } catch (e) {
        ctx.trace.warn('openai.summarize.doc.failed', { message: (e as Error).message });
      }
    }
  }
  if (!base) {
    // fall back to last fetched artifact
    const docs = ctx.memory.docsSnapshot();
    const lastKey = Object.keys(docs).slice(-1)[0];
    base = lastKey ? docs[lastKey] : '';
  }

  const prompt = `Summarize the following content in ${sentences} sentence(s), preserving key facts and entities.\n\n${base.slice(0, 6000)}`;
  const t0 = Date.now();
  const rsp = await createWithFallback(client, { messages: [{ role: 'user', content: prompt }] }, ctx);
  const dt = Date.now() - t0;
  const content = rsp.choices?.[0]?.message?.content || '';

  const usage = (rsp as any)?.usage || {};
  const inputTokens = usage.prompt_tokens ?? usage.input_tokens ?? undefined;
  const outputTokens = usage.completion_tokens ?? usage.output_tokens ?? undefined;
  const totalTokens = usage.total_tokens ?? (typeof inputTokens === 'number' && typeof outputTokens === 'number' ? inputTokens + outputTokens : undefined);
  ctx.trace.info('tool.usage', { tool: 'summarize', elapsedMs: dt, inputTokens, outputTokens, totalTokens });

  const ts = Date.now();
  ctx.memory.putDoc(`summary_${ts}`, content);
  ctx.memory.putDoc(`usage_${ts}`, JSON.stringify({ inputTokens, outputTokens, totalTokens, elapsedMs: dt }));
  return { summary: content };
};

