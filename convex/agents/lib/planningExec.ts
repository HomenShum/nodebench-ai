import { z } from "zod";
import { api, internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { Plan, StepSchema, validateStepArgs, substituteTemplates } from "./planning";
import { addThinkingStep } from "./agentThinking";
import { performWebSearch } from "./agentContext";
import { ragSearch } from "./ragOps";
import { createDocumentFromMessage, workWithDocument } from "./docEdit";
import { generateKnowledgeResponse } from "./generation";
import { getOpenAI, openAIModelFromContext } from "./openaiUtils";
import { AgentStateContext, AgentState } from "./types";

export type StepResult = { text: string; data?: any };

export async function runPlannedStep(ctx: any, agentState: any, step: z.infer<typeof StepSchema>): Promise<StepResult> {
  const context = agentState.context as AgentStateContext;
  const { selectedDocumentId } = context;
  switch (step.kind) {
    case "web.search": {
      // Prefill missing query from context before validation to avoid strict schema errors
      const prefilled = { ...(step.args || {}), ...(step?.args && (step.args as any).query ? {} : { query: context.message }) } as any;
      const args = validateStepArgs(step.kind, prefilled) as any;
      const q = String(args.query ?? context.message);
      await addThinkingStep(ctx, agentState, "tool_selection", `MCP web.search: ${q.slice(0, 80)}`);
      const text = await performWebSearch(ctx, agentState, q);
      return { text };
    }
    case "rag.search": {
      const prefilled = { ...(step.args || {}), ...(step?.args && (step.args as any).query ? {} : { query: context.message }) } as any;
      const args = validateStepArgs(step.kind, prefilled) as any;
      const q = String(args.query ?? context.message);
      await addThinkingStep(ctx, agentState, "tool_selection", `RAG search: ${q.slice(0, 80)}`);
      try {
        const res = await ragSearch(ctx, { namespace: "default", query: q });
        const items = Array.isArray((res as any)?.results) ? (res as any).results : [];
        const text = items
          .map((r: any) => {
            const t = r?.content?.[0]?.text ?? r?.text ?? "";
            return `• ${String(t).slice(0, 200)}`;
          })
          .join("\n");
        return { text, data: res };
      } catch (e) {
        return { text: `RAG search failed: ${String(e)}` };
      }
    }
    case "doc.create": {
      const args = validateStepArgs(step.kind, step.args) as any;
      const ask: string = (args.title || args.topic ? `${args.title ?? args.topic}` : (context.message || "New document"));
      const text = await createDocumentFromMessage(ctx, agentState, ask);
      return { text };
    }
    case "doc.readFirstChunk": {
      const args = validateStepArgs(step.kind, step.args) as any;
      if (!selectedDocumentId) {
        const ui = (agentState.context as any).uiSummary;
        if (ui && typeof ui === "string") {
          const maxChars = Number(args.maxChars ?? 1200);
          const chunk = ui.slice(0, maxChars);
          await addThinkingStep(ctx, agentState, "execution", `Read ${chunk.length} chars from UI summary context`);
          const data = { documentId: null, chunk, cursor: chunk.length, isEnd: true, fromUiSummary: true };
          return { text: chunk || "", data };
        }
        return { text: "No selectedDocumentId for readFirstChunk" };
      }
      // Announce selected doc in step context
      try {
        const runId = agentState.context.runId as Id<"agentRuns"> | undefined;
        if (runId) {
          await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
            runId,
            kind: "context.docs",
            data: { ids: [selectedDocumentId] },
          });
        }
      } catch {}

      const nodes = await ctx.runQuery(api.nodes.by_document, { docId: selectedDocumentId });
      const full = (nodes || []).map((n: any) => n.text || "").filter(Boolean).join("\n\n");
      const maxChars = Number(args.maxChars ?? 1200);
      const chunk = full.slice(0, maxChars);
      const data = { documentId: selectedDocumentId, chunk, cursor: chunk.length, isEnd: chunk.length >= full.length };
      await addThinkingStep(ctx, agentState, "execution", `Read ${chunk.length} chars from selected doc`);
      return { text: chunk || "", data };
    }
    case "doc.edit": {
      const args = validateStepArgs(step.kind, step.args) as any;

      // Proposal mode driven by structured plan (args.propose === true)
      if (args?.propose === true) {
        try {
          if (!selectedDocumentId) return { text: "No selectedDocumentId for proposal" };
          const nodes = await ctx.runQuery(api.nodes.by_document, { docId: selectedDocumentId });
          const full = (nodes || []).map((n: any) => n.text || "").filter(Boolean).join("\n\n").slice(0, 20000);
          const OpenAI = await getOpenAI();
          const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const openaiModel = openAIModelFromContext(context);
          const sysMsg = "You are an expert technical editor. Return ONLY well-structured Markdown for the page; no explanations.";
          const userMsg = `Reorganize the following page into clear hierarchical sections with headings (#, ##, ###), paragraphs, lists, quotes (>), and callouts. Preserve all important content, deduplicate, and improve clarity.\n\nPAGE CONTENT:\n\n${full}`;
          const completion = await openaiClient.chat.completions.create({
            model: openaiModel,
            messages: [
              { role: "system", content: sysMsg },
              { role: "user", content: userMsg },
            ],
            temperature: 0.3,
          });
          const proposed = completion.choices?.[0]?.message?.content?.trim() || "# Outline\n\n- Section 1\n- Section 2";
          return { text: 'Prepared a reorganization proposal (review before applying).', data: { proposed } };
        } catch (e) {
          return { text: `Failed to generate proposal: ${String(e)}` };
        }
      }

      // Try structured pmOperations path first (handled at higher level); fallback heuristic edit
      const text = await workWithDocument(ctx, agentState, context.message || "");
      return { text, data: { strategy: args.strategy ?? "heuristic" } };
    }
    case "answer": {
      const args = validateStepArgs(step.kind, step.args) as any;
      const text = await generateKnowledgeResponse(ctx, agentState, context.message || "");
      return { text, data: { style: args.style ?? "concise" } };
    }
    default:
      return { text: "Unsupported step kind" };
  }
}

export async function executeStructuredPlan(ctx: any, agentState: AgentState, plan: Plan): Promise<string> {
  let aggregate = "";
  const outputs: Record<string, StepResult> = {};
  for (let gi = 0; gi < plan.groups.length; gi++) {
    const group = plan.groups[gi];
    // Resolve templates in args before executing, using outputs from prior groups
    const prepared = group.map((step, si) => {
      const id = step.id || `g${gi}_s${si}`;
      const resolvedArgs = substituteTemplates(step.args ?? {}, outputs);
      return { ...step, id, args: resolvedArgs } as typeof step & { id: string };
    });

    // Stream group start
    try {
      const runId = agentState.context.runId as Id<"agentRuns"> | undefined;
      if (runId) {
        await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
          runId,
          kind: "group.start",
          message: `Group ${gi + 1} of ${plan.groups.length}`,
          data: { groupIndex: gi, steps: prepared.length },
        });
      }
    } catch {}

    const results = await Promise.all(
      prepared.map(async (step) => {
        // step.start
        try {
          const runId = agentState.context.runId as Id<"agentRuns"> | undefined;
          if (runId) {
            await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
              runId,
              kind: "step.start",
              message: `${step.kind} [${step.id}]`,
              data: { args: step.args },
            });
          }
        } catch {}

        try {
          const res = await runPlannedStep(ctx, agentState, step as any);
          outputs[(step as any).id] = res;
          await addThinkingStep(
            ctx,
            agentState,
            "evaluation",
            `${(step as any).kind}[${(step as any).id}]: ${String(res.text).slice(0, 140)}`,
          );

          // step.done (success)
          try {
            const runId = agentState.context.runId as Id<"agentRuns"> | undefined;
            if (runId) {
              await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
                runId,
                kind: "step.done",
                message: `${(step as any).kind} [${(step as any).id}] ok`,
                data: { result: typeof res.text === "string" ? res.text.slice(0, 400) : res },
              });
            }
          } catch {}

          return res.text;
        } catch (e) {
          const msg = `${(step as any).kind}[${(step as any).id}] failed: ${String(e)}`;
          await addThinkingStep(ctx, agentState, "evaluation", msg);
          outputs[(step as any).id] = { text: msg };

          // step.done (error)
          try {
            const runId = agentState.context.runId as Id<"agentRuns"> | undefined;
            if (runId) {
              await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
                runId,
                kind: "step.done",
                message: `${(step as any).kind} [${(step as any).id}] error`,
                data: { error: String(e) },
              });
            }
          } catch {}

          return msg;
        }
      }),
    );
    aggregate += (aggregate ? "\n\n" : "") + results.filter(Boolean).join("\n\n");
  }
  return aggregate;
}

