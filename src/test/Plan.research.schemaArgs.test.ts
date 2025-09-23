import { describe, it, expect } from 'vitest';
import { makePlan } from '../../agents/core/plan';

describe('makePlan schema-aware web.search', () => {
  it('injects intent and schema flags for research tasks', () => {
    const plan = makePlan({ taskSpec: { goal: 'Find 2024 revenue for Microsoft', type: 'research', input: { sources: ['https://example.com'] } } as any });
    const search = plan.groups.flat().find((s) => s.kind === 'web.search');
    expect(search).toBeTruthy();
    const args = (search as any).args || {};
    expect(args.intent).toBe('research');
    // When no schema provided, schemaGenerator should be grok
    expect(args.schemaGenerator).toBe('grok');
  });

  it('passes through provided schema when supplied', () => {
    const schema = { type: 'object', properties: { summary: { type: 'string' } } };
    const plan = makePlan({ taskSpec: { goal: 'Competitor snapshot', type: 'research', input: { schema } } as any });
    const search = plan.groups.flat().find((s) => s.kind === 'web.search');
    const args = (search as any).args || {};
    expect(args.schema).toEqual(schema);
    expect(args.schemaGenerator).toBe('provided');
  });
});

