"use node";

/**
 * Daily Brief Worker (Worker Agent)
 *
 * Statelessly advances one failing/pending task in a dailyBriefMemory.
 */

import { v } from "convex/values";
import { internalAction, action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import {
  getLlmModel,
  resolveModelAlias,
  getModelWithFailover,
} from "../../../shared/llm/modelCatalog";

async function generateWithProvider(
  modelInput: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 400,
): Promise<string> {
  const { model: modelName, provider } = getModelWithFailover(
    resolveModelAlias(modelInput),
  );

  if (provider === "anthropic") {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    return response.content[0]?.type === "text" ? response.content[0].text : "";
  }

  if (provider === "gemini") {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    const result = await generateText({
      model: google(modelName),
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: maxTokens,
    });
    return result.text;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: modelName,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content || "";
}

async function executeFeature(
  feature: any,
  memory: any,
  modelOverride?: string,
): Promise<{ status: "passing" | "failing"; markdown: string; notes?: string }> {
  const source = feature.sourceRefs?.feedItem ?? feature.sourceRefs ?? null;
  const systemPrompt =
    "You are a senior research analyst. Produce crisp, evidence-based markdown.";

  let userPrompt = `TASK: ${feature.name}\n\nCRITERIA:\n${feature.testCriteria}\n\nSOURCE:\n${JSON.stringify(
    source,
    null,
    2,
  )}\n\nCONTEXT (metrics + summary):\n${JSON.stringify(
    memory.context,
    null,
    2,
  )}\n\nOUTPUT: Provide a concise markdown response that satisfies the criteria.`;

  if (feature.type === "repo_analysis") {
    userPrompt =
      `Analyze the GitHub repo described below.\n\n` +
      `Criteria: ${feature.testCriteria}\n\n` +
      `Repo/Feed data:\n${JSON.stringify(source, null, 2)}\n\n` +
      `Return markdown with sections: Purpose, Key Features, Recent Signals, Relevance to NodeBench AI.`;
  } else if (feature.type === "paper_summary") {
    userPrompt =
      `Summarize the research paper described below.\n\n` +
      `Criteria: ${feature.testCriteria}\n\n` +
      `Paper/Feed data:\n${JSON.stringify(source, null, 2)}\n\n` +
      `Return markdown with sections: Main Contribution, Methodology, Results, Implications.`;
  } else if (feature.type === "metric_anomaly") {
    userPrompt =
      `Investigate the metric anomaly described below.\n\n` +
      `Criteria: ${feature.testCriteria}\n\n` +
      `Delta data:\n${JSON.stringify(source, null, 2)}\n\n` +
      `Use today's top feed items to hypothesize causes. Provide a short markdown explanation with 2-4 bullet evidence points.`;
  }

  const text = await generateWithProvider(
    modelOverride ?? getLlmModel("analysis"),
    systemPrompt,
    userPrompt,
    500,
  );

  if (!text || text.trim().length < 20) {
    return {
      status: "failing",
      markdown: text?.trim() ? text : "",
      notes: "Worker returned insufficient output.",
    };
  }

  return { status: "passing", markdown: text };
}

export const runNextTaskInternal = internalAction({
  args: {
    memoryId: v.optional(v.id("dailyBriefMemories")),
    taskId: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const memory: any = args.memoryId
      ? await ctx.runQuery(
          internal.domains.research.dailyBriefMemoryQueries.getMemoryByIdInternal,
          { memoryId: args.memoryId },
        )
      : await ctx.runQuery(
          internal.domains.research.dailyBriefMemoryQueries.getLatestMemoryInternal,
          {},
        );

    if (!memory) {
      return { done: true, message: "No daily brief memory available." };
    }

    const features: any[] = memory.features ?? [];

    const forced = args.taskId
      ? features.find((f) => f.id === args.taskId)
      : null;

    const pending = features.filter(
      (f) => f?.status === "pending" || f?.status == null,
    );
    const failing = features.filter((f) => f?.status === "failing");

    if (pending.length === 0 && failing.length === 0) {
      return { done: true, memoryId: memory._id, message: "All tasks passing." };
    }

    const candidates = pending.length > 0 ? pending : failing;
    candidates.sort((a, b) => (a?.priority ?? 999) - (b?.priority ?? 999));

    const next = forced ?? candidates[0];
    if (!next) {
      return { done: true, memoryId: memory._id, message: "No runnable tasks." };
    }

    const exec = await executeFeature(next, memory, args.model ?? undefined);

    const resultId = await ctx.runMutation(
      internal.domains.research.dailyBriefMemoryMutations.insertTaskResult,
      {
        memoryId: memory._id,
        taskId: next.id,
        resultMarkdown: exec.markdown,
      },
    );

    await ctx.runMutation(
      internal.domains.research.dailyBriefMemoryMutations.updateTaskStatus,
      {
        memoryId: memory._id,
        taskId: next.id,
        status: exec.status,
        notes: exec.notes,
        resultId,
        logMessage: `${next.name} → ${exec.status}`,
        logStatus: exec.status,
        meta: { taskType: next.type },
      },
    );

    return {
      done: false,
      memoryId: memory._id,
      taskId: next.id,
      status: exec.status,
      resultId,
    };
  },
});

// Public wrapper for UI/on-demand runs. Requires auth.
export const runNextTask = action({
  args: {
    memoryId: v.optional(v.id("dailyBriefMemories")),
    taskId: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const res: any = await ctx.runAction(
      internal.domains.research.dailyBriefWorker.runNextTaskInternal,
      args,
    );
    return res;
  },
});
