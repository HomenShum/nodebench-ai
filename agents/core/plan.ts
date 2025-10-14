// agents/core/plan.ts
// Pure planner: given a TaskSpec and current state, produce a bounded Plan.

export type StepKind = 'web.search' | 'web.fetch' | 'answer' | 'summarize' | 'structured' | 'code.exec';

export type Step = {
  id?: string;
  kind: StepKind;
  label?: string;
  args?: Record<string, unknown>;
};

export type Plan = {
  intent: 'answer' | 'search' | 'summarize' | 'custom';
  groups: Step[][]; // sequential groups; each group can run in parallel
  final?: 'answer_only' | 'apply_edit' | 'both';
  explain?: string;
};

export type TaskSpec = {
  goal: string;
  type: 'research' | 'summarize' | 'edit' | 'custom';
  input?: Record<string, unknown>;
  constraints?: { maxSteps?: number };
  planHints?: string[];
  overridePlan?: Partial<Plan> & { groups: Step[][] };
};

export function makePlan(input: { taskSpec: TaskSpec; state?: any }): Plan {
  const { taskSpec } = input;
  const maxSteps = taskSpec.constraints?.maxSteps ?? 6;

  // Allow explicit override of the plan when provided in the spec
  if ((taskSpec as any).overridePlan && Array.isArray((taskSpec as any).overridePlan.groups)) {
    const ov = (taskSpec as any).overridePlan as any;
    return {
      intent: ov.intent || 'custom',
      groups: ov.groups,
      final: ov.final || 'answer_only',
      explain: ov.explain || 'Override plan from task spec',
    } as Plan;
  }

  if (taskSpec.type === 'research') {
    const query = String((taskSpec.input as any)?.query || taskSpec.goal || '');
    const sources = Array.isArray((taskSpec.input as any)?.sources)
      ? ((taskSpec.input as any)?.sources as string[])
      : [];

    const inputAny: any = taskSpec.input || {};
    const steps: Step[] = [
      {
        kind: 'web.search',
        label: 'Search (schema-aware) via Linkup',
        args: {
          query,
          sources,
          intent: inputAny.intent || taskSpec.type || 'research',
          // If caller provides a schema, we pass it through; otherwise default to Grok-based synthesis
          schema: inputAny.schema,
          schemaGenerator: inputAny.schema ? 'provided' : 'grok',
          // Support image search
          includeImages: inputAny.includeImages || false,
        },
      },
    ];
    if (sources.length > 0) {
      for (const s of sources.slice(0, 2)) {
        steps.push({ kind: 'web.fetch', label: `Fetch ${s}`, args: { url: s } });
      }
    }
    const ansArgs: Record<string, unknown> = { query };
    const input: any = taskSpec.input || {};
    if (input.imageUrl) ansArgs.imageUrl = String(input.imageUrl);
    if (Array.isArray(input.imageUrls)) ansArgs.imageUrls = input.imageUrls.map((u: any) => String(u));
    steps.push({ kind: 'answer', label: 'Draft concise findings', args: ansArgs });

    return {
      intent: 'search',
      groups: chunkBy(steps, maxSteps).map((chunk) => chunk),
      explain: `Plan for research on "${query}" with up to ${maxSteps} steps.`,
      final: 'answer_only',
    };
  }

  if (taskSpec.type === 'summarize') {
    const doc = String((taskSpec.input as any)?.doc || '');
    const steps: Step[] = [];
    if (doc) steps.push({ kind: 'web.fetch', label: `Load ${doc}`, args: { url: doc } });
    steps.push({ kind: 'summarize', label: 'Create executive summary', args: { sentences: 2 } });
    return {
      intent: 'summarize',
      groups: [steps],
      explain: `Summarize ${doc || 'input'} in a bounded number of steps`,
      final: 'answer_only',
    };
  }

  // Fallback minimal plan
  return {
    intent: 'custom',
    groups: [[{ kind: 'answer', label: 'Direct answer', args: { goal: taskSpec.goal } }]],
    explain: 'Direct answer fallback plan',
    final: 'answer_only',
  };
}

function chunkBy<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  let i = 0;
  while (i < arr.length) out.push(arr.slice(i, (i += size)));
  return out;
}

