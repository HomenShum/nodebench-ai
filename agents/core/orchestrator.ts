// agents/core/orchestrator.ts
// High-level orchestrator that delegates to specialized "leaf" agents built from Plans.

import { InMemoryStore } from "./memory";
import { Trace } from "./trace";
import { makePlan, TaskSpec } from "./plan";
import { executePlan, ToolsRegistry } from "./execute";

export type OrchestrateGraph = {
  nodes: Array<{
    id: string;
    kind: "answer" | "search" | "summarize" | "structured" | "eval" | "custom" | "code.exec";
    label?: string;
    prompt?: string; // may include {{channel:<nodeId>.last}}
    tool?: string; // for custom kind, specify which tool to use (e.g., "image.validate")
    payload?: any; // for custom kind, specify the payload to pass to the tool
    includeImages?: boolean; // for search kind, include images in results
    depth?: "standard" | "deep"; // for search kind, search depth
  }>;
  edges: Array<{ from: string; to: string }>;
};

export type OrchestrateInput = {
  taskSpec: TaskSpec & { topic?: string; graph?: OrchestrateGraph };
  tools: ToolsRegistry;
  trace: Trace;
  data?: any;
};

export type OrchestrateResult = {
  success: boolean;
  result: string;
  artifacts: Record<string, any>;
  metrics?: Record<string, { elapsedMs?: number; inputTokens?: number; outputTokens?: number; totalTokens?: number }>;
};

export async function orchestrate(input: OrchestrateInput): Promise<OrchestrateResult> {
  const { taskSpec, tools, trace, data } = input;
  const topic = (taskSpec as any).topic || taskSpec.goal || "";

  trace.info("orchestrator.start", { topic });

  // If an explicit graph is provided, execute nodes and pass results via channels
  const graph = (taskSpec as any).graph as OrchestrateGraph | undefined;
  if (graph && Array.isArray(graph.nodes) && graph.nodes.length) {
    const channels: Record<string, Array<string>> = {};
    const artifacts: Record<string, any> = {};
    const metrics: Record<string, { elapsedMs?: number; inputTokens?: number; outputTokens?: number; totalTokens?: number }> = {};

    const mems = new Map<string, InMemoryStore>();
    const ensureMem = (id: string) => {
      let m = mems.get(id);
      if (!m) { m = new InMemoryStore(); mems.set(id, m); }
      return m;
    };

    const resolvePrompt = (tmpl?: string): string => {
      if (!tmpl) return "";
      return tmpl.replace(/\{\{channel:([^}]+)\.last\}\}/g, (_, nodeId) => {
        const arr = channels[nodeId] || [];
        return arr.length ? arr[arr.length - 1] : "";
      }).replace(/\{\{topic\}\}/g, topic);
    };

    // Build adjacency + indegree for topo scheduling
    const idToNode = new Map(graph.nodes.map(n => [n.id, n] as const));
    const indegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const n of graph.nodes) { indegree.set(n.id, 0); adj.set(n.id, []); }
    for (const e of graph.edges || []) {
      if (idToNode.has(e.from) && idToNode.has(e.to)) {
        adj.get(e.from)!.push(e.to);
        indegree.set(e.to, (indegree.get(e.to) || 0) + 1);
      }
    }

    const ready = Array.from(indegree.entries()).filter(([, d]) => d === 0).map(([id]) => id);
    const executed = new Set<string>();

    while (ready.length) {
      const batch = [...ready];
      ready.length = 0;

      await Promise.all(batch.map(async (id) => {
        if (executed.has(id)) return;
        const node = idToNode.get(id)!;
        trace.info("node.start", { id: node.id, kind: node.kind });
        const memory = ensureMem(node.id);
        const t0 = Date.now();
        let result = "";
        if (node.kind === "search") {
          const plan = makePlan({ taskSpec: { goal: node.label || `Search: ${topic}`, type: "research", input: { query: resolvePrompt(node.prompt) || topic, includeImages: (node as any).includeImages || false }, constraints: { maxSteps: 2 }, planHints: ["web"] } as any });
          const res = await executePlan({ plan, tools, memory, trace, data, constraints: { maxSteps: 2 } });
          result = res.result || "";
        } else if (node.kind === "answer") {
          const plan = { intent: "answer", groups: [[{ kind: "answer", label: node.label || "Answer", args: { query: resolvePrompt(node.prompt) || topic } }]], final: "answer_only" as const };
          const res = await executePlan({ plan: plan as any, tools, memory, trace, data });
          result = res.result || "";
        } else if (node.kind === "summarize") {
          const plan = { intent: "answer", groups: [[{ kind: "summarize", label: node.label || "Summarize", args: { text: resolvePrompt(node.prompt) } }]], final: "answer_only" as const };
          const res = await executePlan({ plan: plan as any, tools, memory, trace, data });
          result = res.result || "";
        } else if (node.kind === "structured") {
          const plan = { intent: "answer", groups: [[{ kind: "structured", label: node.label || "Structured", args: { prompt: resolvePrompt(node.prompt) } }]], final: "answer_only" as const };
          const res = await executePlan({ plan: plan as any, tools, memory, trace, data });
          result = typeof res.result === 'string' ? res.result : JSON.stringify(res.result);
        } else if (node.kind === "eval") {
          // Run structured tool directly to get an object with pass/addNodes/addEdges
          const structured = tools['structured'];
          const schema = {
            type: 'object',
            additionalProperties: false,
            properties: {
              pass: { type: 'boolean' },
              addNodes: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    id: { type: 'string' },
                    kind: { type: 'string' },
                    label: { type: 'string' },
                    prompt: { type: 'string' },
                    tool: { type: 'string' },
                    payload: { type: 'object', additionalProperties: true },
                    includeImages: { type: 'boolean' },
                    depth: { type: 'string', enum: ['standard','deep'] },
                  },
                  required: ['id','kind']
                }
              },
              addEdges: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: { from: { type: 'string' }, to: { type: 'string' } },
                  required: ['from','to']
                }
              }
            },
            required: ['pass']
          } as any;
          const out: any = structured
            ? await structured({ prompt: resolvePrompt(node.prompt), schema, name: 'eval_orchestrator', description: 'Return pass boolean and optional nodes/edges to add' }, { memory, trace, data } as any)
            : { pass: true };
          // If failed, dynamically extend the graph
          if (out && out.pass === false) {
            const newNodes: Array<any> = Array.isArray(out.addNodes) ? out.addNodes : [];
            const newEdges: Array<any> = Array.isArray(out.addEdges) ? out.addEdges : [];
            // Emit a trace so the host can dynamically add tasks/links
            trace.info("graph.extend", { addNodes: newNodes, addEdges: newEdges });
            // Add nodes
            for (const nn of newNodes) {
              if (!idToNode.has(nn.id)) {
                idToNode.set(nn.id, nn);
                if (!indegree.has(nn.id)) indegree.set(nn.id, 0);
                if (!adj.has(nn.id)) adj.set(nn.id, []);
              }
            }
            // Add edges and update indegrees
            for (const ee of newEdges) {
              if (!idToNode.has(ee.from) || !idToNode.has(ee.to)) continue;
              (adj.get(ee.from)!).push(ee.to);
              indegree.set(ee.to, (indegree.get(ee.to) || 0) + 1);
            }
            // Any newly added node with indegree 0 and not executed becomes ready
            for (const nn of newNodes) {
              if ((indegree.get(nn.id) || 0) === 0 && !executed.has(nn.id)) {
                if (!ready.includes(nn.id)) ready.push(nn.id);
              }
            }
          }
          result = JSON.stringify(out ?? {});
        } else if (node.kind === "custom") {
          // Custom kind: if tool is specified, call it directly; otherwise use code.exec
          if (node.tool && tools[node.tool]) {
            const toolFn = tools[node.tool];
            const resolvedPayload = typeof node.payload === 'string'
              ? resolvePrompt(node.payload)
              : node.payload && typeof node.payload === 'object'
                ? JSON.parse(
                    JSON.stringify(node.payload).replace(/\{\{channel:([^}]+?)(?:\.last)?\}\}/g, (_m, ref) => {
                      const arr = channels[ref] || [];
                      const val = Array.isArray(arr) && arr.length ? arr[arr.length - 1] : '';
                      return typeof val === 'string' ? val : JSON.stringify(val);
                    })
                  )
                : {};
            const toolResult = await toolFn(resolvedPayload, { memory, trace, data });
            result = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult);
          } else {
            // Fallback to code.exec if no tool specified
            const plan = { intent: "custom", groups: [[{ kind: "code.exec" as any, label: node.label || "Code Execution", args: { prompt: resolvePrompt(node.prompt) || topic } }]], final: "answer_only" as const };
            const res = await executePlan({ plan: plan as any, tools, memory, trace, data });
            result = typeof res.result === 'string' ? res.result : JSON.stringify(res.result);
          }
        } else if (node.kind === "code.exec") {
          // Direct code execution. If payload is provided, call tool with payload; otherwise use prompt-only plan.
          const toolFn = tools['code.exec'];
          if (toolFn && node.payload) {
            const resolvedPayload = typeof node.payload === 'string'
              ? resolvePrompt(node.payload)
              : node.payload && typeof node.payload === 'object'
                ? JSON.parse(
                    JSON.stringify(node.payload).replace(/\{\{channel:([^}]+?)(?:\.last)?\}\}/g, (_m, ref) => {
                      const arr = channels[ref] || [];
                      const val = Array.isArray(arr) && arr.length ? arr[arr.length - 1] : '';
                      return typeof val === 'string' ? val : JSON.stringify(val);
                    })
                  )
                : {};
            const toolRes = await toolFn(resolvedPayload, { memory, trace, data });
            result = typeof toolRes === 'string' ? toolRes : JSON.stringify(toolRes);
          } else {
            const plan = { intent: "code.exec", groups: [[{ kind: "code.exec" as any, label: node.label || "Code Execution", args: { prompt: resolvePrompt(node.prompt) || topic } }]], final: "answer_only" as const };
            const res = await executePlan({ plan: plan as any, tools, memory, trace, data });
            result = typeof res.result === 'string' ? res.result : JSON.stringify(res.result);
          }
        } else {
          // Unknown kinds default to an 'answer' plan using the prompt/topic
          const plan = { intent: "answer", groups: [[{ kind: "answer", label: node.label || "Answer", args: { query: resolvePrompt(node.prompt) || topic } }]], final: "answer_only" as const };
          const res = await executePlan({ plan: plan as any, tools, memory, trace, data });
          result = res.result || "";
        }
        const dt = Date.now() - t0;
        (channels[node.id] ||= []).push(result);
        const snap = memory.docsSnapshot();
        artifacts[node.id] = snap;
        // extract last usage_* doc if present
        const usageKey = Object.keys(snap).filter(k => k.startsWith('usage_')).slice(-1)[0];
        if (usageKey) {
          let u: any = {};
          try { u = JSON.parse(snap[usageKey] as string); } catch {}

          metrics[node.id] = { elapsedMs: dt, inputTokens: u.inputTokens, outputTokens: u.outputTokens, totalTokens: u.totalTokens };
        } else {
          metrics[node.id] = { elapsedMs: dt };
        }
        trace.info("node.end", { id: node.id, len: result?.length || 0, elapsedMs: dt });
        executed.add(id);
      }));

      // decrement indegrees
      for (const id of batch) {
        for (const nxt of adj.get(id) || []) {
          indegree.set(nxt, (indegree.get(nxt) || 0) - 1);
          if ((indegree.get(nxt) || 0) === 0) ready.push(nxt);
        }
      }
    }

    const last = graph.nodes[graph.nodes.length - 1]?.id;
    const finalOut = last ? (channels[last]?.slice(-1)[0] || "") : "";
    trace.info("orchestrator.complete", { totalLen: finalOut.length, mode: "graph" });
    return { success: true, result: finalOut, artifacts, metrics };
  }

  // Default template: 4-leaf pipeline
  // 1) Leaf Agent: Web Researcher (search + answer)
  const memResearch = new InMemoryStore();
  trace.info("agent.start", { name: "web_researcher" });
  const planResearch = makePlan({ taskSpec: { goal: `Research: ${topic}`, type: "research", input: { query: topic }, constraints: { maxSteps: 3 }, planHints: ["web"] } as any });
  const resResearch = await executePlan({ plan: planResearch, tools, memory: memResearch, trace, data, constraints: { maxSteps: 3 } });
  const researchOut = resResearch.result || "";
  trace.info("agent.end", { name: "web_researcher", len: researchOut.length });

  // 2) Leaf Agent: KB Retriever (prompted retrieval via LLM)
  const memKB = new InMemoryStore();
  trace.info("agent.start", { name: "kb_retriever" });
  const kbQuery = `List foundational concepts and definitions for topic: "${topic}" in bullet points. Use concise, accurate explanations.`;
  const planKB = { intent: "answer", groups: [[{ kind: "answer", label: "KB bullets", args: { query: kbQuery } }]], final: "answer_only" as const };
  const resKB = await executePlan({ plan: planKB as any, tools, memory: memKB, trace, data });
  const kbOut = resKB.result || "";
  trace.info("agent.end", { name: "kb_retriever", len: kbOut.length });

  // 3) Leaf Agent: Content Generator (outline + draft)
  const memGen = new InMemoryStore();
  trace.info("agent.start", { name: "content_generator" });
  const genPrompt = `Using these research notes and definitions, produce a structured outline with sections and brief summaries.\n\n# Research Notes\n${researchOut}\n\n# Foundations\n${kbOut}`;
  const planGen = { intent: "answer", groups: [[{ kind: "answer", label: "Generate outline", args: { query: genPrompt } }]], final: "answer_only" as const };
  const resGen = await executePlan({ plan: planGen as any, tools, memory: memGen, trace, data });
  const genOut = resGen.result || "";
  trace.info("agent.end", { name: "content_generator", len: genOut.length });

  // 4) Leaf Agent: Editor (refine and improve)
  const memEdit = new InMemoryStore();
  trace.info("agent.start", { name: "editor" });
  const editPrompt = `Refine the following outline for clarity, cohesion, and correctness. Improve headings and ensure logical flow. Return the improved outline.\n\n${genOut}`;
  const planEdit = { intent: "answer", groups: [[{ kind: "answer", label: "Edit outline", args: { query: editPrompt } }]], final: "answer_only" as const };
  const resEdit = await executePlan({ plan: planEdit as any, tools, memory: memEdit, trace, data });
  const finalOut = resEdit.result || genOut;
  trace.info("agent.end", { name: "editor", len: finalOut.length });

  const artifacts: Record<string, any> = {
    web_researcher: memResearch.docsSnapshot(),
    kb_retriever: memKB.docsSnapshot(),
    content_generator: memGen.docsSnapshot(),
    editor: memEdit.docsSnapshot(),
  };

  trace.info("orchestrator.complete", { totalLen: finalOut.length });
  return { success: true, result: finalOut, artifacts };
}

