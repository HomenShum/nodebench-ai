import { describe, it, expect } from 'vitest';
import { orchestrate } from '../core/orchestrator';
import type { ToolsRegistry } from '../core/execute';

class TestTrace { info(){} warn(){} error(){} count(){return 0;} }

// Tools: 'structured' returns an eval branch instruction; 'answer' echoes
const tools: ToolsRegistry = {
  'structured': async (_args) => ({ pass: false, addNodes: [ { id: 'X', kind: 'answer', label: 'X', prompt: 'From eval' } ], addEdges: [ { from: 'A', to: 'X' } ] }),
  'answer': async (args, ctx: any) => { const out = `ANS:${args?.query ?? ''}`; ctx.memory.putDoc(`answer_${Date.now()}`, out); return out; },
};

describe('orchestrator eval branching', () => {
  it('inserts new nodes at runtime and executes them', async () => {
    const taskSpec: any = {
      goal: 'Eval branch',
      type: 'orchestrate',
      topic: 'T',
      graph: {
        nodes: [ { id: 'A', kind: 'eval', label: 'Eval', prompt: 'Decide' } ],
        edges: [],
      },
    };

    const res = await orchestrate({ taskSpec, tools, trace: new TestTrace() as any, data: undefined });

    // Final result is last node's output. Graph's last node is A, but after branching
    // we want to ensure node X executed and channels got a value; since final node is A,
    // the result will be JSON from eval. We can still assert artifacts include answer_* for X
    const artifacts = res.artifacts as Record<string, any>;
    const xDocs = artifacts['X'] || {};
    const keys = Object.keys(xDocs).filter(k => k.startsWith('answer_'));
    expect(keys.length).toBeGreaterThan(0);
  });
});

