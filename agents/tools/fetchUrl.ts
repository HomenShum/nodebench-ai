// agents/tools/fetchUrl.ts
// Fetch local files (relative path) or http(s) urls using global fetch (Node >= 18)

// Note: Avoid static Node imports to support browser bundlers.
// Dynamically import Node modules only when running under Node.
import type { ExecContext } from '../core/execute';

export function fetchUrlTool() {
  return async function tool(args: { url: string }, ctx: ExecContext): Promise<{ url: string; text: string }> {
    const url = String(args?.url || '');
    let text = '';

    // Local file path (no scheme)
    if (!/^https?:\/\//i.test(url)) {
      const isNode = typeof process !== 'undefined' && !!(process as any).versions?.node;
      if (isNode) {
        const { default: pathMod } = await (0, eval)("import('node:path')");
        const fsMod = await (0, eval)("import('node:fs/promises')");
        const local = pathMod.resolve(process.cwd(), 'agents/app/demo_scenarios', url);
        text = await fsMod.readFile(local, 'utf-8');
        ctx.memory.putDoc(url, text);
        return { url, text };
      } else {
        // Try fetching as a static asset when served by the dev server
        const res = await fetch(`/agents/app/demo_scenarios/${url}`);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        text = await res.text();
        ctx.memory.putDoc(url, text);
        return { url, text };
      }
    }

    // Remote (optional)
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    text = await res.text();
    ctx.memory.putDoc(url, text);
    return { url, text };
  };
}

