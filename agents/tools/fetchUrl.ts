// agents/tools/fetchUrl.ts
// Fetch local files (relative path) or http(s) urls using global fetch (Node >= 18)

// Note: Avoid static Node imports to support browser bundlers.
// Dynamically import Node modules only when running under Node.
import type { ExecContext } from '../core/execute';

export function fetchUrlTool() {
  return async function tool(args: { url: string; maxBytes?: number }, ctx: ExecContext): Promise<{ url: string; text: string }> {
    const url = String(args?.url || '').trim();
    const maxBytes = args?.maxBytes || 1_000_000; // 1MB default

    // Validate URL is not empty and doesn't contain unresolved template variables
    if (!url) {
      throw new Error('web.fetch requires a non-empty url parameter');
    }
    if (url.includes('${') || url.includes('{{channel:')) {
      throw new Error(`web.fetch received unresolved template variable in URL: "${url}". Ensure upstream nodes have completed and channel references are resolved.`);
    }

    let text = '';

    // Local file path (no scheme) - only for demo scenarios
    if (!/^https?:\/\//i.test(url)) {
      const isNode = typeof process !== 'undefined' && !!(process as any).versions?.node;
      if (isNode) {
        const { default: pathMod } = await (0, eval)("import('node:path')");
        const fsMod = await (0, eval)("import('node:fs/promises')");
        const local = pathMod.resolve(process.cwd(), 'agents/app/demo_scenarios', url);
        text = await fsMod.readFile(local, 'utf-8');
        ctx.memory.putDoc(url, text);
        ctx.trace.info('web.fetch.local', { path: local, size: text.length });
        return { url, text };
      } else {
        // Try fetching as a static asset when served by the dev server
        const res = await fetch(`/agents/app/demo_scenarios/${url}`);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        text = await res.text();
        ctx.memory.putDoc(url, text);
        ctx.trace.info('web.fetch.static', { url, size: text.length });
        return { url, text };
      }
    }

    // Remote HTTP(S) URL
    ctx.trace.info('web.fetch.start', { url, maxBytes });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);

    // Read response with size limit
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
      throw new Error(`Response too large: ${buffer.byteLength} bytes (max: ${maxBytes})`);
    }

    text = new TextDecoder().decode(buffer);
    ctx.memory.putDoc(url, text);
    ctx.trace.info('web.fetch.complete', { url, size: text.length });
    return { url, text };
  };
}

