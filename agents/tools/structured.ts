// agents/tools/structured.ts
// OpenAI structured output tool: returns a JSON object matching a provided JSON Schema.

import OpenAI from 'openai';
import type { ExecContext, Tool } from '../core/execute';

function getClient() {
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

// Args:
// - prompt: string (user instruction)
// - schema: JSON Schema object for the desired result
// - name?: optional tool/function name
// - description?: optional description for the tool/function
// - mode?: 'tool' | 'json' (default 'tool'); 'tool' uses function calling; 'json' uses response_format
export const structuredTool: Tool = async (args: any, ctx: ExecContext) => {
  const client = getClient();
  const prompt: string = String(args?.prompt || 'Return a JSON object.');
  // If caption not provided, try to read the latest answer_* artifact as the caption
  let caption: string | undefined = args?.caption ? String(args.caption) : undefined;
  if (!caption) {
    const docs = ctx.memory.docsSnapshot();
    const keys = Object.keys(docs).filter((k) => k.startsWith('answer_'));
    const lastKey = keys.slice(-1)[0];
    if (lastKey) caption = String(docs[lastKey]);
  }
  const combinedPrompt = caption ? `${prompt}\n\nCaption:\n${caption}` : prompt;
  const schema: any = args?.schema || { type: 'object', properties: {}, additionalProperties: true };
  const name: string = String(args?.name || 'produce_structured_output');
  const description: string = String(args?.description || 'Produce a structured JSON object matching the given schema.');
  const mode: 'tool' | 'json' = (args?.mode === 'json' ? 'json' : 'tool');

  const system = 'You are a careful assistant. Always respect the requested JSON schema and avoid extra fields.';

  // Simple retry/backoff helper to survive transient rate limits (e.g., 429)
  async function createWithBackoff(payload: any): Promise<any> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await client.chat.completions.create(payload);
      } catch (e: any) {
        const status = e?.status ?? e?.code ?? e?.response?.status;
        if (status === 429 && attempt < maxAttempts) {
          const delayMs = 750 * attempt;
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        throw e;
      }
    }
    // Should never reach here, but satisfy TypeScript's definite-return analysis
    throw new Error('createWithBackoff: Exhausted retries without a successful response');
  }

  // Minimal local validator/coercer for common JSON Schema subset
  function validateAndCoerce(schema: any, obj: any): any {
    if (!schema || typeof schema !== 'object') return obj;
    if (schema.type === 'object' && schema.properties && typeof obj === 'object' && obj) {
      const props = schema.properties as Record<string, any>;
      const out: any = {};
      for (const key of Object.keys(props)) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) out[key] = obj[key];
      }
      // required defaults to null if missing
      const req: string[] = Array.isArray(schema.required) ? schema.required : [];
      for (const r of req) { if (!Object.prototype.hasOwnProperty.call(out, r)) out[r] = null; }
      // additionalProperties === false -> prune keys
      return out;
    }
    return obj;
  }

  // Try tool calling first (more robust on models that support it)
  if (mode === 'tool') {
    const rsp = await createWithBackoff({
      model: process.env.OPENAI_MODEL || (process.env.OPENROUTER_API_KEY ? 'x-ai/grok-4-fast:free' : 'gpt-5-nano'),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: combinedPrompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name,
            description,
            parameters: schema,
            strict: true as any,
          },
        } as any,
      ],
      tool_choice: 'auto' as any,
    });

    // Parse first tool call args as JSON
    const msg: any = rsp.choices?.[0]?.message;
    const call = msg?.tool_calls?.[0];
    if (call?.function?.arguments) {
      try {
        const parsed = JSON.parse(call.function.arguments);
        const cleaned = validateAndCoerce(schema, parsed);
        ctx.memory.putDoc(`structured_${Date.now()}`, JSON.stringify(cleaned));
        return cleaned;
      } catch (e) {
        ctx.trace.warn('structured.parse.failed', { message: (e as Error).message });
      }
    }
    // Fallback to JSON response format
  }

  // JSON text mode
  const rsp2 = await createWithBackoff({
    model: process.env.OPENAI_MODEL || (process.env.OPENROUTER_API_KEY ? 'x-ai/grok-4-fast:free' : 'gpt-5-nano'),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `${combinedPrompt}\n\nReturn ONLY JSON.` },
    ],
    response_format: { type: 'json_object' } as any,
  });
  const content = rsp2.choices?.[0]?.message?.content || '{}';
  let obj: any = {};
  try { obj = JSON.parse(content); } catch {}
  const cleaned = validateAndCoerce(schema, obj);
  ctx.memory.putDoc(`structured_${Date.now()}`, JSON.stringify(cleaned));
  return cleaned;
};

