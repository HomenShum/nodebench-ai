// agents/core/execute.ts
// Step executor: runs Plan via a tools registry, updates memory, and writes trace.

import type { Plan, Step } from './plan';
import type { InMemoryStore } from './memory';
import type { Trace } from './trace';

export type Tool = (args: any, ctx: ExecContext) => Promise<any>;
export type ToolsRegistry = Record<string, Tool>;

export type ExecContext = {
  memory: InMemoryStore;
  trace: Trace;
  // Optional data provider (Convex or in-memory)
  data?: any;
};

export async function executePlan(input: {
  plan: Plan;
  tools: ToolsRegistry;
  memory: InMemoryStore;
  trace: Trace;
  data?: any;
  constraints?: { maxSteps?: number };
}): Promise<{ success: boolean; result?: string }> {
  const { plan, tools, memory, trace } = input;
  let stepsRun = 0;
  let lastOutput: any = undefined;

  for (let gi = 0; gi < plan.groups.length; gi++) {
    const group = plan.groups[gi];
    trace.info('group.start', { index: gi, size: group.length });

    // Execute group sequentially for determinism (can parallelize if needed)
    for (let si = 0; si < group.length; si++) {
      const step = group[si];
      stepsRun++;
      if (input.constraints?.maxSteps && stepsRun > input.constraints.maxSteps) {
        trace.warn('constraints.maxSteps.hit', { stepsRun });
        break;
      }
      lastOutput = await executeStep(step, tools, { memory, trace, data: input.data });
    }

    trace.info('group.end', { index: gi });
  }

  const result = normalizeResult(lastOutput, memory);
  trace.info('plan.complete', { stepsRun, finalSummaryLen: (result || '').length });
  return { success: true, result };
}

async function executeStep(step: Step, tools: ToolsRegistry, ctx: ExecContext): Promise<any> {
  const name = resolveToolName(step.kind);
  const tool = tools[name];
  ctx.trace.info('step.start', { kind: step.kind, label: step.label });
  if (!tool) {
    ctx.trace.error('tool.missing', { requested: name });
    throw new Error(`Unknown tool: ${name}`);
  }
  try {
    const t0 = Date.now();
    const output = await tool(step.args ?? {}, ctx);
    const dt = Date.now() - t0;
    ctx.trace.info('step.success', { kind: step.kind, label: step.label, elapsedMs: dt });
    return output;
  } catch (e) {
    ctx.trace.error('step.error', { kind: step.kind, message: (e as Error).message });
    throw e;
  }
}

function resolveToolName(kind: Step['kind']): string {
  switch (kind) {
    case 'web.search':
      return 'web.search';
    case 'web.fetch':
      return 'web.fetch';
    case 'summarize':
      return 'summarize';
    case 'answer':
      return 'answer';
    default:
      return String(kind);
  }
}

function normalizeResult(lastOutput: any, memory: InMemoryStore): string {
  if (typeof lastOutput === 'string') return lastOutput;
  if (lastOutput && typeof lastOutput.summary === 'string') return lastOutput.summary;
  // Prefer latest doc artifact if available
  const docs = memory.docsSnapshot();
  const lastDocKey = Object.keys(docs).slice(-1)[0];
  if (lastDocKey) return String(docs[lastDocKey]);
  return '';
}

