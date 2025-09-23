import { describe, it, expect, vi } from 'vitest';
import { orchestrate } from '../../agents/core/orchestrator';
import type { ToolsRegistry, Tool } from '../../agents/core/execute';
import { Trace } from '../../agents/core/trace';

// Mock networked modules to provide deterministic outputs while keeping the same registry shape
vi.mock('../../agents/services/linkup', () => {
  const linkupStructuredSearch = vi.fn(async (query: string, schema: any, depth: 'standard'|'deep') => {
    return {
      answer: `Mocked structured answer for: ${query}`,
      summary: `Summary: ${query.slice(0, 40)}`,
      sources: [
        { name: 'mock:source:1', url: 'https://example.com/1' },
        { name: 'mock:source:2', url: 'https://example.com/2' },
      ],
      structured: { ok: true, schemaSummary: Object.keys(schema?.properties || {}).slice(0,3) },
    };
  });
  const linkupPersonProfile = vi.fn(async (_name: string) => ({ ok: true, type: 'person' }));
  const linkupCompanyProfile = vi.fn(async (_name: string) => ({ ok: true, type: 'company' }));
  return { linkupStructuredSearch, linkupPersonProfile, linkupCompanyProfile };
});

vi.mock('../../agents/tools/openai', () => {
  const answerTool: Tool = async (args: any) => `answer:${String(args?.query || args?.goal || '')}`;
  // summarizeTool unused here
  const summarizeTool: Tool = async (args: any) => ({ summary: String(args?.text || 'summary') });
  return { answerTool, summarizeTool };
});

vi.mock('../../agents/tools/structured', () => {
  let evalCalls = 0;
  const structuredTool: Tool = async (args: any) => {
    // Orchestrator uses structured tool for eval nodes with name 'eval_orchestrator'
    if (args?.name === 'eval_orchestrator') {
      evalCalls++;
      if (evalCalls === 1) {
        return {
          pass: false,
          addNodes: [
            { id: 'person_main', kind: 'structured', label: 'Person Research Agent', prompt: 'Generate person research plan for {{topic}}' },
            { id: 'company_main', kind: 'structured', label: 'Company Research Agent', prompt: 'Generate company research plan for {{topic}}' },
            { id: 'jacob_search', kind: 'search', label: 'Jacob Cole search', prompt: '{{topic}}' },
            { id: 'ideaflow_search', kind: 'search', label: 'Ideaflow search', prompt: '{{topic}}' },
            { id: 'gate1', kind: 'eval', label: 'Gate after main', prompt: 'Evaluate if fundraising analysis is needed for {{topic}}' },
          ],
          addEdges: [
            { from: 'plan', to: 'person_main' },
            { from: 'plan', to: 'company_main' },
            { from: 'person_main', to: 'jacob_search' },
            { from: 'company_main', to: 'ideaflow_search' },
            { from: 'jacob_search', to: 'gate1' },
            { from: 'ideaflow_search', to: 'gate1' },
          ],
        };
      } else if (evalCalls === 2) {
        return {
          pass: false,
          addNodes: [
            { id: 'fundraising_main', kind: 'structured', label: 'Fundraising Analysis Agent', prompt: 'Analyze fundraising context for {{topic}}' },
            { id: 'synthesis_main', kind: 'structured', label: 'Report Synthesis Agent', prompt: 'Synthesize final report for {{topic}}' },
          ],
          addEdges: [
            { from: 'gate1', to: 'fundraising_main' },
            { from: 'fundraising_main', to: 'synthesis_main' },
          ],
        };
      }
      return { pass: true };
    }
    // Non-eval structured calls return a simple JSON-ish object
    return { summary: `structured:${String(args?.prompt || '')}` } as any;
  };
  return { structuredTool };
});

// Import after mocks so mocked modules are bound inside these implementations
import { searchTool } from '../../agents/tools/search';
import { answerTool } from '../../agents/tools/openai';
import { structuredTool } from '../../agents/tools/structured';
// get reference to mock for assertions
import * as linkupMod from '../../agents/services/linkup';

// Optional: Grok quality judge (skips if no key)
async function judgeQualityWithGrok(prompt: string, output: string): Promise<number | null> {
  // Only run if an API key is present
  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY && !process.env.CONVEX_OPENAI_API_KEY) return null;
  const { default: OpenAI } = await import('openai');
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.CONVEX_OPENAI_API_KEY;
  const baseFromEnv = process.env.OPENAI_BASE_URL || process.env.CONVEX_OPENAI_BASE_URL || (process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : '');
  const baseURL = baseFromEnv ? (/\/v\d+\/?$/.test(baseFromEnv) ? baseFromEnv : baseFromEnv.replace(/\/?$/, '/v1')) : undefined;
  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) } as any);
  const model = process.env.OPENAI_MODEL || (process.env.OPENROUTER_API_KEY ? 'x-ai/grok-4-fast:free' : 'gpt-5-nano');
  const sys = 'You are a strict grader. Return ONLY a JSON object with {"rating": 1..5} where 5 is excellent.';
  const user = `Grade the following output for the prompt. Consider coverage, correctness, and structure. Return ONLY JSON with rating.\n\n# Prompt\n${prompt}\n\n# Output\n${output}`;
  try {
    const rsp = await client.chat.completions.create({ model, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], response_format: { type: 'json_object' } as any });
    const content = rsp.choices?.[0]?.message?.content || '{}';
    const obj = JSON.parse(content);
    const r = Number(obj?.rating);
    return Number.isFinite(r) ? r : null;
  } catch {
    return null;
  }
}

describe('orchestrator self-conducting (real registry shape, network mocked)', () => {
  it('spawns mains/leaves, calls web.search (linkup) and proceeds to later stages', async () => {
    const topic = "Research Jacob Cole, Ideaflow, and the company's fundraising for the next round";

    // Build a registry using the same tool names as convex/agents/orchestrate.ts but with mocked net
    const demoRoot = `${process.cwd()}/agents/app/demo_scenarios`;
    const tools: ToolsRegistry = {
      'web.search': searchTool({ root: demoRoot }), // internally uses mocked linkupStructuredSearch
      'web.fetch': async () => ({ ok: true }),
      'answer': answerTool, // mocked
      'structured': structuredTool, // mocked; also used internally by orchestrator for eval nodes
    } as any;

    const graph = { nodes: [{ id: 'plan', kind: 'eval', label: 'Planner', prompt: 'Seed plan for {{topic}}' }], edges: [] };
    const trace = new Trace();
    const out = await orchestrate({ taskSpec: { goal: topic, type: 'ad-hoc', graph } as any, tools, trace, data: {} });

    expect(out.success).toBe(true);
    const keys = Object.keys(out.metrics || {});
    // Completeness of spawned agents
    expect(keys).toEqual(expect.arrayContaining(['person_main','company_main','jacob_search','ideaflow_search','fundraising_main','synthesis_main']));

    // Tools called: linkupStructuredSearch should have been invoked by web.search at least twice (jacob + ideaflow)
    const linkSpy = (linkupMod as any).linkupStructuredSearch as ReturnType<typeof vi.fn>;
    expect(linkSpy).toBeDefined();
    expect(linkSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Optional: judge output quality via Grok 4 fast if key present (does not affect pass/fail)
    const rating = await judgeQualityWithGrok(topic, out.result || '');
    if (rating != null) {
      expect(rating).toBeGreaterThanOrEqual(1);
      expect(rating).toBeLessThanOrEqual(5);
    }
  }, 60000);
});

