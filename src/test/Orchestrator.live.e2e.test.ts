import { describe, it, expect } from 'vitest';

// Gated live E2E: requires LIVE_E2E=1 and API keys for both LLM and Linkup
const hasLLM = !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.CONVEX_OPENAI_API_KEY);
const hasLinkup = !!(process.env.LINKUP_API_KEY || process.env.NEXT_PUBLIC_LINKUP_API_KEY);
const live = process.env.LIVE_E2E === '1' && hasLLM && hasLinkup;

const d = live ? describe : describe.skip;

d('orchestrator live e2e (OpenRouter/OpenAI + Linkup)', () => {
  it(
    'runs a real search -> answer pipeline (no mocks) and returns output',
    async () => {
      // Dynamic imports to avoid loading networked modules when gated off
      const [{ orchestrate }, { Trace }, { searchTool }, { answerTool }, { structuredTool }] = await Promise.all([
        import('../../agents/core/orchestrator'),
        import('../../agents/core/trace'),
        import('../../agents/tools/search'),
        import('../../agents/tools/openai'),
        import('../../agents/tools/structured'),
      ]);

      const demoRoot = `${process.cwd()}/agents/app/demo_scenarios`;

      // Build a minimal live registry using real tools (will hit Linkup + LLM)
      const tools: any = {
        'web.search': searchTool({ root: demoRoot }),
        'answer': answerTool,
        'structured': structuredTool,
      };

      // Simple graph: Web search feeds into an answer. No dynamic branching.
      const topic = "Research Jacob Cole, Ideaflow, and the company's fundraising for the next round";
      const graph = {
        nodes: [
          { id: 's1', kind: 'search', label: 'Web Research', prompt: '{{topic}}' },
          { id: 'a1', kind: 'answer', label: 'Write brief', prompt: 'Write a concise research brief based on: {{channel:s1.last}}' },
        ],
        edges: [
          { from: 's1', to: 'a1' },
        ],
      } as const;

      const trace = new Trace();
      const out = await orchestrate({ taskSpec: { goal: topic, type: 'ad-hoc', graph } as any, tools, trace, data: {} });

      expect(out.success).toBe(true);
      expect(typeof out.result).toBe('string');
      // Result should be non-empty when LLM responds
      expect((out.result || '').length).toBeGreaterThan(0);

      // Metrics should include nodes s1 and a1
      const m = out.metrics as Record<string, any> | undefined;
      expect(m && typeof m === 'object').toBe(true);
      expect(Object.keys(m || {})).toEqual(expect.arrayContaining(['s1', 'a1']));
    },
    120_000,
  );
});

