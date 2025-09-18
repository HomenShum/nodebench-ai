import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { getOpenAI, GPT5_NANO, GPT5_MINI, isOpenAI } from "./openaiUtils";
import { GoogleGenAI } from "@google/genai";
import type { AgentStateContext } from "./types";

export async function analyzeUserIntent(
  ctx: any,
  message: string,
  model: "openai" | "gemini",
): Promise<string> {
  const analysisPrompt = `Analyze this user message and determine:
1. Primary intent (search, create, update, question, etc.)
2. Required tools/capabilities
3. Context needs
4. Complexity level

User message: "${message}"

Provide a concise analysis focusing on what the user wants and how to achieve it.`;

  try {
    if (isOpenAI({ model })) {
      const OpenAI = await getOpenAI();
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openaiClient.chat.completions.create({
        model: GPT5_NANO,
        messages: [{ role: "user", content: analysisPrompt }],
      });
      return completion.choices[0]?.message?.content || "Intent analysis completed";
    } else {
      const { getGeminiKey } = await import("../../genai");
      const geminiKey = await getGeminiKey(ctx);
      if (!geminiKey) throw new Error("Gemini API key not configured");
      const ai = new GoogleGenAI({ apiKey: geminiKey ?? undefined });
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
      });
      try {
        await ctx.runMutation((internal as any).usage.incrementDailyUsage, { provider: "gemini" });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[usage] incrementDailyUsage failed (gemini)", e);
      }
      return (result as any).text || "Intent analysis completed";
    }
  } catch (error) {
    return `Intent analysis: User wants to "${message}". Will attempt to fulfill request using available tools.`;
  }
}

export async function planToolUsage(
  _ctx: any,
  message: string,
  context: AgentStateContext,
): Promise<string> {
  const signals = {
    needsSearch: /search|find|look|research|web|internet|current|recent|news|latest/i.test(message),
    needsDocument: /create|write|document|note|save|add|update|edit/i.test(message),
    needsAnalysis: /analyze|explain|understand|breakdown|summarize/i.test(message),
    hasUrl: /https?:\/\//i.test(message),
  };

  const plan: string[] = [];
  if (signals.hasUrl && signals.needsSearch) plan.push("EXTRACT from URL via web search");
  else if (signals.needsSearch && context?.mcpServerId) plan.push("SEARCH web via MCP");
  if (signals.needsDocument) plan.push("CREATE/UPDATE document with findings");
  if (signals.needsAnalysis) plan.push("ANALYZE results and summarize");
  if (plan.length === 0) plan.push("RESPOND from knowledge");

  return `Execution plan: ${plan.join(" -> ")}`;
}

export const classifyIntent = internalAction({
  args: {
    message: v.string(),
    uiSummary: v.optional(v.string()),
    hasSelectedDoc: v.optional(v.boolean()),
    model: v.optional(v.string()),
  },
  returns: v.object({
    kind: v.union(
      v.literal("doc.search.internal"),
      v.literal("web.search"),
      v.literal("doc.create"),
      v.literal("doc.edit"),
      v.literal("open_doc"),
      v.literal("answer"),
    ),
    topic: v.optional(v.string()),
    title: v.optional(v.string()),
    confidence: v.optional(v.number()),
  }),
  handler: async (_ctx, { message, uiSummary, hasSelectedDoc, model }) => {
    try {
      const OpenAI = await getOpenAI();
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
      const schema = {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: [
              "doc.search.internal",
              "web.search",
              "doc.create",
              "doc.edit",
              "open_doc",
              "answer",
            ],
          },
          topic: { type: "string" },
          title: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["kind"],
        additionalProperties: false,
      } as const;

      const tools: any[] = [
        {
          type: "function",
          function: {
            name: "classify_intent",
            description: "Classify the user message into an intent with optional fields.",
            parameters: schema,
          },
        },
      ];

      const sys = `You are an intent classifier for a document-centric workspace.\n- doc.search.internal: user wants to find their OWN documents by topic.\n- web.search: user wants the Web/Internet or provides a URL.\n- doc.create: user wants to create a new document.\n- doc.edit: user wants to edit/update/insert into the currently selected doc (hasSelectedDoc helps).\n- open_doc: user wants to open a specific document.\n- answer: general Q&A without document operations.\nReturn only the tool call with structured JSON.`;

      const content = [
        { role: "system", content: sys },
        { role: "user", content: `Message: ${message}\nHasSelectedDoc: ${!!hasSelectedDoc}\nUISummary: ${(uiSummary || "").slice(0, 1200)}` },
      ];

      const resp = await openai.chat.completions.create({
        model: (model as any) || GPT5_MINI,
        messages: content as any,
        tools,
        tool_choice: { type: "function", function: { name: "classify_intent" } },
        temperature: 0,
      });

      const msg: any = resp.choices?.[0]?.message;
      const call = msg?.tool_calls?.[0];
      if (call?.function?.arguments) {
        try {
          const parsed = JSON.parse(call.function.arguments);
          return {
            kind: parsed.kind,
            topic: typeof parsed.topic === "string" ? parsed.topic.trim() : undefined,
            title: typeof parsed.title === "string" ? parsed.title.trim() : undefined,
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : undefined,
          } as any;
        } catch {}
      }
    } catch {}

    // Heuristic fallback if LLM/tooling failed
    const m = message.toLowerCase();
    if (/\bfind\b.*\b(doc|document|docs|documents)\b/.test(m)) {
      const t = m.replace(/.*\b(?:about|on|for)\s+/, "").slice(0, 120).trim();
      return { kind: "doc.search.internal", topic: t || undefined, confidence: 0.4 } as any;
    }
    if (/(web|internet|online|https?:\/\/)/i.test(message)) return { kind: "web.search", confidence: 0.4 } as any;
    if (/\b(create|new)\b.*\bdoc(ument)?\b/.test(m)) return { kind: "doc.create", confidence: 0.4 } as any;
    if (/\b(open)\b.*\b(doc|document)\b/.test(m)) return { kind: "open_doc", confidence: 0.4 } as any;
    if (/\b(edit|update|modify|insert|append|add)\b/.test(m) && hasSelectedDoc) return { kind: "doc.edit", confidence: 0.4 } as any;
    return { kind: "answer", confidence: 0.3 } as any;
  },
});


