import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { Plan, PlanSchema } from "./planning";
import { getOpenAI, isGpt5MiniOrNano, openAIModelFromContext, isOpenAI } from "./openaiUtils";
import { addThinkingStep, addAdaptation } from "./agentThinking";
import { executeStructuredPlan } from "./planningExec";



import type { AgentState } from "./types";

export async function tryGenerateStructuredPlan(ctx: any, agentState: AgentState): Promise<Plan | undefined> {
  try {
    const { model, openaiVariant, uiSummary, message } = agentState.context as any;
    if (!isOpenAI(agentState.context as any)) return undefined;
    const OpenAI = await getOpenAI();
    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const openaiModel = openAIModelFromContext(agentState.context);

    const sys = [
      "You are an orchestrator that returns ONLY JSON per the schema.",
      "Plan small, safe steps. Use parallel groups when independent.",
      "If editing a document, ensure a prior read step exists and prefer precise anchored edits.",
      "If the user requests a large-scale reorganization/restructure of a page, include a doc.edit step with args.propose=true so changes are proposed for review (not applied immediately).",
      uiSummary ? `Interface context (authoritative):\n${uiSummary}` : undefined,
    ]
      .filter(Boolean)
      .join("\n\n");

    // Streaming plan via function calling when runId available
    const runId = (agentState.context as any).runId as Id<"agentRuns"> | undefined;
    if (runId) {
      try {
        const messages = [
          { role: "system", content: sys },
          { role: "user", content: message },
        ];
        const planSchemaJson: any = {
          type: "object",
          additionalProperties: false,
          properties: {
            intent: { type: "string", enum: ["edit_doc", "code_change", "answer", "search", "file_ops"] },
            explain: { type: "string" },
            final: { type: "string", enum: ["answer_only", "apply_edit", "both"] },
            groups: {
              type: "array",
              items: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: true,
                  properties: {
                    id: { type: "string" },
                    kind: { type: "string", enum: ["web.search", "rag.search", "doc.create", "doc.readFirstChunk", "doc.edit", "answer"] },
                    label: { type: "string" },
                    args: { type: "object" },
                  },
                  required: ["kind"],
                },
              },
            },
          },
          required: ["intent", "groups"],
        };
        const final: any = await ctx.runAction((internal as any).aiAgents.openaiStreamWithTools, {
          runId,
          messages,
          tools: [
            {
              type: "function",
              function: { name: "plan", description: "Return the execution plan JSON.", parameters: planSchemaJson },
            },
          ],
          model: openaiModel,
        });
        const tc = final?.choices?.[0]?.message?.tool_calls?.[0];
        const argStr = tc?.function?.arguments || "";
        if (argStr) {
          try {
            return JSON.parse(argStr) as Plan;
          } catch {}
        }
      } catch (e) {
        console.warn("[plan] streaming failed; falling back to parse()", e);
      }
    }

    const completion = await openaiClient.chat.completions.parse({
      model: openaiModel,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: message },
      ],
      response_format: zodResponseFormat(PlanSchema, "plan"),
      temperature: isGpt5MiniOrNano(openaiModel) ? undefined : 0.2,
    });
    const parsed: Plan | undefined = completion.choices?.[0]?.message?.parsed ?? undefined;
    return parsed;
  } catch (e) {
    console.warn("[plan] structured plan generation failed", e);
    return undefined;
  }
}

export async function tryGeneratePmOpsWithStructuredOutputs(ctx: any, agentState: AgentState) {
  try {
    const { model, openaiVariant, uiSummary, message } = agentState.context as any;
    if (!isOpenAI(agentState.context as any)) return undefined;

    const OpenAI = await getOpenAI();
    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const openaiModel = openAIModelFromContext(agentState.context);

    // Minimal op schema. We keep content as unknown JSON; the client-side editor validates/sanitizes.
    const InsertOp = z.object({ type: z.literal("insert"), at: z.number().int().nonnegative(), content: z.array(z.unknown()) });
    const ReplaceOp = z.object({ type: z.literal("replace"), from: z.number().int().nonnegative(), to: z.number().int().nonnegative(), content: z.array(z.unknown()) });
    const DeleteOp = z.object({ type: z.literal("delete"), from: z.number().int().nonnegative(), to: z.number().int().nonnegative() });
    const SetAttrs = z.object({ type: z.literal("setAttrs"), pos: z.number().int().nonnegative(), attrs: z.record(z.unknown()) });
    const PmOps = z.array(z.union([InsertOp, ReplaceOp, DeleteOp, SetAttrs]));

    const DocEditSchema = z.object({ pmOperations: PmOps.optional(), text: z.string().optional() });

    // Streaming via function calling if runId present
    const sysPm = uiSummary
      ? `You are a document editing assistant. Use the provided interface context to understand the ProseMirror/Tiptap document and selection. When the user asks to edit the document, return pmOperations using exact positions present in context (do not guess). If no edit is requested, leave pmOperations empty and include text.\n\nInterface context (authoritative):\n${uiSummary}`
      : `You are a document editing assistant. When the user asks to edit the document, return pmOperations using exact positions present in context (do not guess). If no edit is requested, leave pmOperations empty and include text.`;

    try {
      const runId = (agentState.context as any).runId as Id<"agentRuns"> | undefined;
      if (runId) {
        const pmSchemaJson: any = {
          type: "object",
          additionalProperties: false,
          properties: {
            pmOperations: {
              type: "array",
              items: {
                anyOf: [
                  { type: "object", properties: { type: { const: "insert" }, at: { type: "integer", minimum: 0 }, content: { type: "array", items: {} } }, required: ["type", "at", "content"], additionalProperties: true },
                  { type: "object", properties: { type: { const: "replace" }, from: { type: "integer", minimum: 0 }, to: { type: "integer", minimum: 0 }, content: { type: "array", items: {} } }, required: ["type", "from", "to", "content"], additionalProperties: true },
                  { type: "object", properties: { type: { const: "delete" }, from: { type: "integer", minimum: 0 }, to: { type: "integer", minimum: 0 } }, required: ["type", "from", "to"], additionalProperties: true },
                  { type: "object", properties: { type: { const: "setAttrs" }, pos: { type: "integer", minimum: 0 }, attrs: { type: "object" } }, required: ["type", "pos", "attrs"], additionalProperties: true },
                ],
              },
            },
            text: { type: "string" },
          },
        };
        const final: any = await ctx.runAction((internal as any).aiAgents.openaiStreamWithTools, {
          runId,
          messages: [
            { role: "system", content: sysPm },
            { role: "user", content: message },
          ],
          tools: [
            {
              type: "function",
              function: { name: "propose_pm_ops", description: "Return document pmOperations and/or text.", parameters: pmSchemaJson },
            },
          ],
          model: openaiModel,
        });
        const tc = final?.choices?.[0]?.message?.tool_calls?.[0];
        const argStr = tc?.function?.arguments || "";
        if (argStr) {
          try {
            const parsed = JSON.parse(argStr);
            const pmOps = Array.isArray(parsed?.pmOperations) ? parsed.pmOperations : undefined;
            if (pmOps) return pmOps;
          } catch {}
        }
      }
    } catch (e) {
      console.warn("[pmOps] streaming failed; falling back to parse()", e);
    }

    const sys = uiSummary
      ? `You are a document editing assistant. Use the provided interface context to understand the ProseMirror/Tiptap document and selection. When the user asks to edit the document, return pmOperations using exact positions present in context (do not guess). If no edit is requested, leave pmOperations empty and include text.\n\nInterface context (authoritative):\n${uiSummary}`
      : `You are a document editing assistant. When the user asks to edit the document, return pmOperations using exact positions present in context (do not guess). If no edit is requested, leave pmOperations empty and include text.`;

    const messages = [
      { role: "system", content: sys },
      { role: "user", content: message },
    ];

    // 1) Try structured plan first (intent + parallel tool groups)
    try {
      const plan = await tryGenerateStructuredPlan(ctx, agentState);
      if (plan && plan.groups && plan.groups.length > 0) {
        await addThinkingStep(ctx, agentState, "planning", `Structured plan: intent=${plan.intent}, groups=${plan.groups.length}`);
        if (plan.explain) {
          await addThinkingStep(ctx, agentState, "planning", `Plan explain: ${plan.explain.slice(0, 300)}`);
        }
        try {
          const runId = agentState.context.runId as Id<"agentRuns"> | undefined;
          if (runId) {
            await ctx.runMutation((internal as any).aiAgents.updateAgentRun, {
              runId,
              fields: { planExplain: plan.explain, plan },
            });
            await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
              runId,
              kind: "plan",
              message: (plan.explain || `Plan with ${plan.groups.length} groups`).slice(0, 2000),
              data: { intent: plan.intent, groups: plan.groups.length },
            });
          }
        } catch {}

        const aggregate = await executeStructuredPlan(ctx, agentState, plan);
        const response = {
          finalResponse: aggregate || "Done.",
          thinkingSteps: agentState.thinkingSteps,
          toolCalls: agentState.toolCalls,
          adaptations: agentState.adaptations,
          candidateDocs: [],
          planExplain: plan.explain,
          plan,
        };
        return JSON.stringify(response);
      }
    } catch (e) {
      await addAdaptation(ctx, agentState, "Plan generation failed", "Fallback", "Use heuristic pipeline");
    }

    const completion = await openaiClient.chat.completions.parse({
      model: openaiModel,
      messages,
      response_format: zodResponseFormat(DocEditSchema, "doc_edit"),
    });

    const parsed: any = completion.choices?.[0]?.message?.parsed ?? null;
    const pmOps = Array.isArray(parsed?.pmOperations) ? parsed.pmOperations : undefined;
    return pmOps;
  } catch (e) {
    console.warn("[pmOps] structured output generation failed", e);
    return undefined;
  }
}

