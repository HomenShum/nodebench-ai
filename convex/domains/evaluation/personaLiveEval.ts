"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";

import { determineArchitecture } from "../agents/adapters/routing/personaRouter";
import { MODEL_CATALOG } from "../agents/adapters/types";
import { getLanguageModelSafe } from "../agents/mcp_tools/models/modelResolver";

import { internal } from "../../_generated/api";

import { generateText } from "ai";

import {
  buildEvidencePack,
  planEvidenceTasks,
  runEvidenceTasksInParallel,
  type EvidenceResult,
} from "./evidencePlanner";

async function runExternalOrchestratorWithFallback(
  ctx: any,
  args: {
    provider: "openai" | "gemini";
    message: string;
    models: string[];
    context?: string;
  }
): Promise<{ ok: boolean; provider: string; modelUsed?: string; text: string; error?: string }> {
  let lastError: string | undefined;

  for (const model of args.models) {
    try {
      const result = await ctx.runAction(internal.actions.externalOrchestrator.runExternalOrchestrator, {
        provider: args.provider,
        message: args.message,
        model,
        context: args.context,
      });

      const text = String(result?.text ?? "").trim();
      if (text.length > 0) {
        return {
          ok: true,
          provider: String(result?.provider ?? args.provider),
          modelUsed: String(result?.metadata?.model ?? model),
          text,
        };
      }

      lastError = "Provider returned empty text";
    } catch (e: any) {
      lastError = e?.message ?? String(e);
      continue;
    }
  }

  return {
    ok: false,
    provider: args.provider,
    modelUsed: args.models[0],
    text: "",
    error: lastError ?? "Provider failed",
  };
}

export const runPersonaLiveEval = action({
  args: {
    scenarios: v.optional(
      v.array(
        v.object({
          name: v.string(),
          query: v.string(),
          persona: v.string(),
        })
      )
    ),
    linkupDepth: v.optional(v.union(v.literal("standard"), v.literal("deep"))),
    evidenceMaxTasks: v.optional(v.number()),
    evidenceMaxConcurrency: v.optional(v.number()),
    skipFusionCache: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const scenarios = args.scenarios ?? [
      {
        name: "Banker: seed deals",
        query: "Find seed deals in biotech this week. Provide 3 targets with sources.",
        persona: "JPM_STARTUP_BANKER",
      },
      {
        name: "CTO: CVE audit",
        query: "Audit mquickjs for CVE-2025-62495. Summarize impact and fix guidance with sources.",
        persona: "CTO_TECH_LEAD",
      },
      {
        name: "Executive: synthesis",
        query: "Summarize Gemini vs GPT-5.2 vs Claude 4.5 for enterprise adoption. Use recent sources.",
        persona: "ENTERPRISE_EXEC",
      },
    ];

    const out: any[] = [];

    for (const s of scenarios) {
      const arch = determineArchitecture(s.query, s.persona);
      const startedAt = Date.now();

      const record: any = {
        name: s.name,
        persona: s.persona,
        query: s.query,
        architecture: arch,
        toolChecks: {},
        modelChecks: {},
        answerPreview: "",
        success: false,
        error: undefined,
        elapsedMs: 0,
      };

      try {
        // Tool usage verification: OpenBB MCP server (often not reachable from Convex cloud)
        try {
          const openbbTest = await ctx.runAction(internal.actions.openbbActions.testOpenBBConnection, {});
          record.toolChecks.openbb = openbbTest;
        } catch (e: any) {
          record.toolChecks.openbb = { success: false, error: e?.message ?? String(e) };
        }

        const plan = await planEvidenceTasks({
          question: s.query,
          persona: s.persona,
          linkupDepth: args.linkupDepth ?? "standard",
          maxTasks: args.evidenceMaxTasks ?? 4,
        });

        const evidenceResults = await runEvidenceTasksInParallel(ctx, plan.tasks, {
          maxConcurrency: args.evidenceMaxConcurrency ?? 4,
          skipRateLimit: true,
          skipCache: args.skipFusionCache ?? false,
        });

        const evidencePack = buildEvidencePack({
          planTasks: plan.tasks,
          results: evidenceResults,
          maxChars: 14000,
        });

        const linkup = evidenceResults.find((r): r is Extract<EvidenceResult, { kind: "linkup" }> => r.kind === "linkup");
        if (linkup) {
          record.toolChecks.linkupSearch = {
            ok: !!linkup.ok,
            sources: linkup.sources ?? [],
            answerLen: String(linkup.answer ?? "").length,
            error: linkup.ok ? undefined : linkup.error,
          };
        } else {
          record.toolChecks.linkupSearch = {
            ok: false,
            sources: [],
            answerLen: 0,
            error: "No linkup task executed",
          };
        }

        record.toolChecks.evidencePlanner = {
          plannedTasks: plan.tasks,
          results: evidenceResults.map((r: any) => ({
            kind: r.kind,
            ok: r.ok,
            elapsedMs: r.elapsedMs,
            error: r.ok ? undefined : r.error,
          })),
        };

        const groundingInstruction =
          "Use the evidence pack as your primary grounding. Preserve any inline citations exactly (copy them verbatim). Do not invent citations. If the evidence does not support a claim, say so.";

        const finalPrompt = [
          groundingInstruction,
          "",
          "QUESTION:",
          s.query,
          "",
          evidencePack,
        ].join("\n");

        // Now run an LLM call based on persona routing.
        if (arch.primarySdk === "anthropic" || String(arch.reasoningModel).startsWith("claude-")) {
          const res = await generateText({
            model: getLanguageModelSafe(String(arch.reasoningModel)),
            prompt: finalPrompt,
            maxOutputTokens: 450,
          });

          record.modelChecks.anthropic = { model: String(arch.reasoningModel), ok: !!res.text };
          record.answerPreview = res.text.slice(0, 900);
          record.success = true;
        } else if (
          arch.primarySdk === "openai" ||
          arch.primarySdk === "langgraph" ||
          String(arch.reasoningModel).startsWith("gpt-")
        ) {
          const model = String(arch.reasoningModel).startsWith("gpt-") ? arch.reasoningModel : MODEL_CATALOG.OPENAI.FLAGSHIP;

          const openaiRes = await runExternalOrchestratorWithFallback(ctx, {
            provider: "openai",
            message: finalPrompt,
            models: [model, MODEL_CATALOG.OPENAI.FAST, MODEL_CATALOG.OPENAI.NANO],
            context: "You are a precise analyst. Preserve citations exactly; do not invent citations.",
          });

          record.modelChecks.openai = { model: openaiRes.modelUsed, ok: openaiRes.ok };

          if (!openaiRes.ok) {
            record.error = openaiRes.error;
            record.answerPreview = String(linkup?.answer ?? "").slice(0, 900);
            record.success = !!linkup?.ok;
          } else {
            record.answerPreview = openaiRes.text.slice(0, 900);
            record.success = true;
          }
        } else if (arch.primarySdk === "vercel" || String(arch.reasoningModel).startsWith("gemini-")) {
          const geminiRes = await runExternalOrchestratorWithFallback(ctx, {
            provider: "gemini",
            message: finalPrompt,
            models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"],
            context: "You are an executive summarizer. Preserve citations exactly; do not invent citations. Provide crisp bullets.",
          });

          record.modelChecks.gemini = {
            model: geminiRes.modelUsed,
            ok: geminiRes.ok,
          };

          if (!geminiRes.ok) {
            record.error = geminiRes.error;
            record.answerPreview = String(linkup?.answer ?? "").slice(0, 900);
            record.success = !!linkup?.ok;
          } else {
            record.answerPreview = geminiRes.text.slice(0, 900);
            record.success = true;
          }
        } else {
          record.answerPreview = String(linkup?.answer ?? "").slice(0, 900);
          record.success = !!linkup?.ok;
        }
      } catch (e: any) {
        record.error = e?.message ?? String(e);
        record.success = false;
      } finally {
        record.elapsedMs = Date.now() - startedAt;
        out.push(record);
      }
    }

    return {
      timestamp: Date.now(),
      scenarios: out,
    };
  },
});


