import { describe, it, expect } from 'vitest';
import { orchestrate } from '../core/orchestrator';
import type { ToolsRegistry } from '../core/execute';

class TestTrace {
  events: Array<{ event: string; data?: any }> = [];
  n = 0;
  info(event: string, data?: any) { this.events.push({ event, data }); this.n++; }
  warn(event: string, data?: any) { this.events.push({ event, data }); this.n++; }
  error(event: string, data?: any) { this.events.push({ event, data }); this.n++; }
  count() { return this.n; }
}

// Minimal fake tools that just echo back prompts to be deterministic and fast
const tools: ToolsRegistry = {
  'web.search': async (args) => `S:${args?.query ?? ''}`,
  'web.fetch': async (args) => `F:${args?.url ?? ''}`,
  'answer': async (args) => `OUT:${args?.query ?? ''}`,
  'summarize': async (args) => `SUM:${(args?.text ?? '').slice(0, 20)}`,
  'structured': async (args) => ({ ok: true, prompt: String(args?.prompt ?? '') }),
};

describe('orchestrator graph execution', () => {
  it('substitutes channels and preserves topological execution order', async () => {
    const trace = new TestTrace();

    const taskSpec: any = {
      goal: 'Test graph orchestration',
      type: 'orchestrate',
      topic: 'T',
      graph: {
        nodes: [
          { id: 'A', kind: 'answer', label: 'A', prompt: 'A on {{topic}}' },
          { id: 'B', kind: 'answer', label: 'B', prompt: 'B sees {{channel:A.last}}' },
          { id: 'C', kind: 'answer', label: 'C', prompt: 'C sees {{channel:A.last}}' },
          { id: 'D', kind: 'answer', label: 'D', prompt: 'Combine {{channel:B.last}} + {{channel:C.last}}' },
        ],
        edges: [
          { from: 'A', to: 'B' },
          { from: 'A', to: 'C' },
          { from: 'B', to: 'D' },
          { from: 'C', to: 'D' },
        ],
      },
    };

    const res = await orchestrate({ taskSpec, tools, trace: trace as any, data: undefined });

    // Final result should be D's prompt echoed by the fake 'answer' tool with resolved channels
    expect(res.success).toBe(true);
    expect(res.result).toBe(
      'OUT:Combine OUT:B sees OUT:A on T + OUT:C sees OUT:A on T'
    );

    // Verify topological order: A starts before B/C, and D starts after B/C
    const starts = trace.events.filter((e) => e.event === 'node.start').map((e) => e.data.id);
    const posA = starts.indexOf('A');
    const posB = starts.indexOf('B');
    const posC = starts.indexOf('C');
    const posD = starts.indexOf('D');

    expect(posA).toBeGreaterThanOrEqual(0);
    expect(posB).toBeGreaterThan(posA);
    expect(posC).toBeGreaterThan(posA);
    expect(posD).toBeGreaterThan(Math.max(posB, posC));
  });
});

