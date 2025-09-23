/*
  agents/app/cli.ts
  Minimal CLI to run agent demo scenarios end-to-end using local tools.

  Usage:
    npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_1.json
*/

import { promises as fs } from 'fs';
import path from 'path';
import { makePlan } from '../core/plan';
import { executePlan, ToolsRegistry } from '../core/execute';
import { orchestrate } from '../core/orchestrator';
import { InMemoryStore } from '../core/memory';
import { Trace } from '../core/trace';
import { assertions } from '../core/eval';

// Tools
import { searchTool } from '../tools/search';
import { fetchUrlTool } from '../tools/fetchUrl';
import { answerTool, summarizeTool } from '../tools/openai';
import { structuredTool } from '../tools/structured';
import { createContextStoreFromEnv } from '../data/contextStore';

async function main() {
  const specPath = process.argv[2];
  if (!specPath) {
    console.error('Usage: cli.ts <path-to-task-spec.json>');
    process.exit(1);
  }
  const abs = path.resolve(process.cwd(), specPath);
  const raw = await fs.readFile(abs, 'utf-8');
  const taskSpec = JSON.parse(raw);

  const trace = new Trace();
  const memory = new InMemoryStore();
  const data = createContextStoreFromEnv() || null; // optional Convex store when AGENTS_DATA=convex

  const tools: ToolsRegistry = {
    'web.search': searchTool({ root: path.resolve(process.cwd(), 'agents/app/demo_scenarios') }),
    'web.fetch': fetchUrlTool(),
    'answer': answerTool,
    'summarize': summarizeTool,
    'structured': structuredTool,
  };

  trace.info('taskSpec.loaded', { path: abs, type: taskSpec.type, goal: taskSpec.goal });

  if (taskSpec.type === 'orchestrate') {
    trace.info('orchestrate.mode', { topic: taskSpec.topic || taskSpec.goal });
    const orch = await orchestrate({ taskSpec, tools, trace, data });
    const summary = { success: orch.success, result: orch.result, artifacts: orch.artifacts, logsCount: trace.count() };
    console.log(JSON.stringify({ event: 'final', data: summary }));
    return;
  }

  const plan = makePlan({ taskSpec, state: { docs: memory.docsSnapshot() } });
  trace.info('plan.created', { groups: plan.groups.length, type: taskSpec.type });

  const execResult = await executePlan({ plan, tools, memory, trace, data, constraints: taskSpec.constraints });

  // Optional lightweight validation
  try {
    if (taskSpec.type === 'research') {
      assertions.assertIncludes(String(execResult.result || ''), taskSpec.input.query);
    }
  } catch (e) {
    trace.warn('validation.failed', { message: (e as Error).message });
  }

  const summary = {
    success: execResult.success,
    result: execResult.result,
    artifacts: memory.docsSnapshot(),
    logsCount: trace.count(),
  };

  // Emit final outputs
  console.log(JSON.stringify({ event: 'final', data: summary }));
}

main().catch((err) => {
  console.error(JSON.stringify({ event: 'error', data: { message: String(err?.message || err) } }));
  process.exit(1);
});

