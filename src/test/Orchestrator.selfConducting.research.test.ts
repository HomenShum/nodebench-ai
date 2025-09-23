import { describe, it, expect } from 'vitest';
import { orchestrate } from '../../agents/core/orchestrator';
import type { ToolsRegistry, Tool } from '../../agents/core/execute';
import { Trace } from '../../agents/core/trace';

// This test simulates a self-conducting orchestrator that dynamically spawns
// main and leaf agents using an eval node that returns addNodes/addEdges.
// No network calls: tools are stubbed and return deterministic outputs.

describe('orchestrator self-conducting research (dynamic spawn via eval)', () => {
  it('spawns person/company mains, parallel leaf searches, then fundraising and synthesis', async () => {
    const topic = "Research Jacob Cole, Ideaflow, and the company's fundraising for the next round";

    let evalCalls = 0;

    const structured: Tool = async (args: any) => {
      // Orchestrator's eval passes name: 'eval_orchestrator' and our prompt per node
      if (args?.name === 'eval_orchestrator') {
        evalCalls++;
        if (evalCalls === 1) {
          // First gate: spawn person/company mains and their leaf searches; then add a gate1
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
          // Second gate: after main leaves finish, spawn fundraising analysis, then synthesis
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
        // Final gate: no more additions
        return { pass: true };
      }
      // Non-eval structured calls (leaf structured nodes) return a simple JSON-y string
      return { summary: `structured:${String(args?.prompt || '')}` } as any;
    };

    const webSearch: Tool = async (args: any) => {
      return { summary: `search:${String(args?.query || args?.prompt || '')}` } as any;
    };

    const answer: Tool = async (args: any) => {
      return `answer:${String(args?.query || '')}`;
    };

    const tools: ToolsRegistry = {
      'structured': structured,
      'web.search': webSearch,
      'answer': answer,
      // not used in this test: 'web.fetch'
    };

    const graph = {
      nodes: [
        { id: 'plan', kind: 'eval', label: 'Planner', prompt: 'Seed plan for {{topic}}' },
      ],
      edges: [],
    };

    const trace = new Trace();
    const out = await orchestrate({
      taskSpec: { goal: topic, type: 'ad-hoc', graph } as any,
      tools,
      trace,
      data: {},
    });

    expect(out.success).toBe(true);
    // Ensure dynamic spawn occurred (both mains, both leaf searches, and later stages)
    const keys = Object.keys(out.metrics || {});
    expect(keys).toContain('person_main');
    expect(keys).toContain('company_main');
    expect(keys).toContain('jacob_search');
    expect(keys).toContain('ideaflow_search');
    expect(keys).toContain('fundraising_main');
    expect(keys).toContain('synthesis_main');
  });
});

