import { api, internal } from "../../_generated/api";
import { Id, Doc } from "../../_generated/dataModel";
import { addThinkingStep, addToolCall } from "./agentThinking";
import { getOpenAI } from "./openaiUtils";
import { createBlockJson, detectNodeType, extractPlainText, parseMarkdownToBlocks } from "../../lib/markdown";

const DEFAULT_OPENAI_MODEL = "gpt-5-nano";

export async function createDocumentFromMessage(ctx: any, agentState: any, message: string): Promise<string> {
  const { model } = agentState.context;
  try {
    // Extract a topic/title
    const titleMatch = message.match(/document about ([^.!?]+)/i) || message.match(/create.*?([^.!?]+)/i);
    const topic = titleMatch ? titleMatch[1].trim() : "general topic";
    const title = topic.charAt(0).toUpperCase() + topic.slice(1);

    // Generate markdown content (Gemini or OpenAI)
    let content = "";
    if (model === "gemini") {
      const { getGeminiKey } = await import("../../genai");
      const geminiKey = await getGeminiKey(ctx);
      if (!geminiKey) throw new Error("Gemini API key not configured");
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: geminiKey ?? undefined });
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          { role: "system", parts: [{ text: `Create comprehensive markdown content about "${topic}". Include multiple sections with headings, bullet points, **bold**, and examples.` }] },
          { role: "user", parts: [{ text: `Create detailed content about ${topic}` }] },
        ],
      });
      try {
        await ctx.runMutation(internal.usage.incrementDailyUsage, { provider: "gemini" });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[usage] incrementDailyUsage failed (gemini)", e);
      }
      content = (result as any).text || "Content generation failed.";
    } else {
      const OpenAI = await getOpenAI();
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const openaiModel = agentState.context.openaiVariant ?? DEFAULT_OPENAI_MODEL;
      const completion = await openaiClient.chat.completions.create({
        model: openaiModel,
        messages: [
          {
            role: "system",
            content: `Create comprehensive markdown content about "${topic}". Include multiple sections with headings, bullet points, **bold**, and examples.`,
          },
          { role: "user", content: `Create detailed content about ${topic}` },
        ],
      });
      content = completion.choices[0]?.message?.content || "Content generation failed.";
    }

    // Create document directly via mutation (same as tool's handler)
    const documentId = await ctx.runMutation((internal as any).aiAgents.internalCreateDocument, { title, content });

    await addToolCall(
      ctx,
      agentState,
      "createDocument",
      `Creating document "${title}"`,
      { title, contentPreview: content.slice(0, 160) },
      { documentId },
      true,
    );

    return `✅ Successfully created document "${title}" with comprehensive content.`;
  } catch (error) {
    await addToolCall(ctx, agentState, "createDocument", "Failed to create document from message", { message }, { error }, false);
    return `❌ I encountered an issue creating the document: ${
      (error as Error)?.message || String(error)
    }. Please try again or be more specific.`;
  }
}

export async function workWithDocument(ctx: any, agentState: any, message: string): Promise<string> {
  const { selectedDocumentId, model } = agentState.context as { selectedDocumentId?: Id<"documents">; model: string };
  if (!selectedDocumentId) return "No document is currently selected. Please select a document first.";

  try {
    // If a fenced code block was provided, prefer it
    let markdown: string | null = null;
    const codeBlockMatch = message.match(/```[a-zA-Z]*\n([\s\S]*?)```/m);
    if (codeBlockMatch) markdown = codeBlockMatch[1].trim();

    // Otherwise ask the model to produce a concise snippet
    if (!markdown) {
      const prompt = `Instruction:\n\"\"\"${message}\"\"\"\n\nReturn ONLY a minimal, self-contained Markdown snippet (no extra prose).`;
      if (model === "openai") {
        const OpenAI = await getOpenAI();
        const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const openaiModel = agentState.context.openaiVariant ?? DEFAULT_OPENAI_MODEL;
        const completion = await openaiClient.chat.completions.create({
          model: openaiModel,
          messages: [
            { role: "system", content: "You output only raw Markdown snippets." },
            { role: "user", content: prompt },
          ],
        });
        markdown = completion.choices[0]?.message?.content?.trim() || null;
      } else {
        const { getGeminiKey } = await import("../../genai");
        const geminiKey = await getGeminiKey(ctx);
        if (!geminiKey) throw new Error("Gemini API key not configured");
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: geminiKey ?? undefined });
        const result = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        try {
          await ctx.runMutation((internal as any).usage.incrementDailyUsage, { provider: "gemini" });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[usage] incrementDailyUsage failed (gemini)", e);
        }
        markdown = (result as any).text?.trim() || null;
      }
    }

    if (!markdown) markdown = message.trim();

    // Find anchor if user referenced a section
    const existing = (await ctx.runQuery(api.nodes.by_document, { docId: selectedDocumentId })) as Doc<"nodes">[];

    // Special case: page reorganization intent -> generate a full-page markdown proposal instead of applying immediately
    const reorgIntent = /(reorganize|restructure|organize|structure|clean\s*up|tidy\s*up)/i.test(message);
    if (reorgIntent) {
      try {
        const fullText = (existing || []).map((n) => n.text || "").filter(Boolean).join("\n\n").slice(0, 20000);
        let proposed: string | null = null;
        if (model === "openai") {
          const OpenAI = await getOpenAI();
          const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const openaiModel = agentState.context.openaiVariant ?? DEFAULT_OPENAI_MODEL;
          const sys = "You are an expert technical editor. Return ONLY well-structured Markdown for the page, no explanations.";
          const user = `Reorganize the following page into clear hierarchical sections with headings (use #, ##, ###), paragraphs, lists, quotes (>), and callouts where appropriate. Preserve all important content, deduplicate, and improve clarity.\n\nPAGE CONTENT:\n\n${fullText}`;
          const completion = await openaiClient.chat.completions.create({ model: openaiModel, messages: [ { role: 'system', content: sys }, { role: 'user', content: user } ], temperature: 0.3 });
          proposed = completion.choices?.[0]?.message?.content?.trim() || null;
        }
        if (!proposed || proposed.length < 10) proposed = "# Outline\n\n- Section 1\n- Section 2";

        const output = { actions: [ { type: 'updateNode', markdown: proposed } ], message: 'Proposed page reorganization' };
        await addToolCall(ctx, agentState, 'proposeUpdateNode', 'Proposed page reorganization (review required)', { documentId: selectedDocumentId }, output, true);
        return `I prepared a reorganized page proposal. Review the red/green diff and click Apply to accept.`;
      } catch (_e) {
        // Fall through to normal heuristic insertion if proposal generation fails
      }
    }

    const msgLower = message.toLowerCase();
    const anchorMatch = message.match(/(?:after|below|under|inside|within|into|in|following)\s+(?:the\s+)?(?:section|heading)\s+"?(.+?)"?(?:\.|,|$)/i);
    let anchorTitle: string | null = anchorMatch?.[1] ?? null;
    const knownSections = ["analysis", "overview", "conclusion", "introduction", "background", "results", "discussion"];
    if (!anchorTitle) {
      const found = knownSections.find((s) => msgLower.includes(s));
      if (found) anchorTitle = found;
    }

    const headings = (existing || []).filter((n) => n.type === "heading" && typeof n.text === "string");
    let anchorNode: Doc<"nodes"> | null = null;
    if (anchorTitle) {
      const t = anchorTitle.toLowerCase();
      anchorNode = (headings as any).find((h: any) => (h.text || "").toLowerCase().includes(t)) || null;
    }

    const rootSiblings = (existing || []).filter((n) => !n.parentId);
    const rootMaxOrder = rootSiblings.reduce((m: number, n) => (typeof (n as any).order === "number" && (n as any).order > m ? (n as any).order : m), 0);

    const wantsEnd = /\bat the end\b|\bappend\b|\bat end\b/i.test(message);
    const wantsUnder = /\b(under|inside|within|in)\b/i.test(message);

    let parentIdToUse: Id<"nodes"> | undefined;
    let baseOrder = 0;

    if (anchorNode && wantsUnder) {
      parentIdToUse = anchorNode._id as Id<"nodes">;
      const children = (existing || []).filter((n) => String(n.parentId) === String(anchorNode!._id));
      const childMax = children.reduce((m: number, n) => (typeof (n as any).order === "number" && (n as any).order > m ? (n as any).order : m), 0);
      baseOrder = childMax + 1;
    } else if (wantsEnd || !anchorNode) {
      parentIdToUse = undefined;
      baseOrder = rootMaxOrder + 1;
    } else {
      parentIdToUse = anchorNode!._id as Id<"nodes">;
      const children = (existing || []).filter((n) => String(n.parentId) === String(anchorNode!._id));
      const childMax = children.reduce((m: number, n) => (typeof (n as any).order === "number" && (n as any).order > m ? (n as any).order : m), 0);
      baseOrder = childMax + 1;
    }

    // Parse into multiple blocks if possible
    let blocks: any[] | null = null;
    try {
      const parsed = (parseMarkdownToBlocks as any)?.(markdown);
      blocks = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch {
      /* ignore */
    }

    const createdIds: Id<"nodes">[] = [];
    const insertOne = async (bType: string, bText: string, ord: number) => {
      const json = createBlockJson(bType, bText);
      const text = extractPlainText(bText);
      const id = await ctx.runMutation(api.nodes.add, {
        documentId: selectedDocumentId,
        parentId: parentIdToUse,
        order: ord,
        type: bType,
        json,
        text,
      });
      return id as Id<"nodes">;
    };

    if (blocks && blocks.length > 1) {
      let currentOrder = baseOrder;
      for (const b of blocks) {
        const bType = (b as any).type || detectNodeType((b as any).text ?? "");
        const bText = typeof (b as any).text === "string" ? (b as any).text : String((b as any).text ?? "");
        const id = await insertOne(bType, bText, currentOrder++);
        createdIds.push(id);
      }
    } else {
      const nodeType = detectNodeType(markdown);
      const id = await insertOne(nodeType, markdown, baseOrder);
      createdIds.push(id);
    }

    await addToolCall(
      ctx,
      agentState,
      "editDoc",
      "Inserted content into the selected document with smart placement",
      { documentId: selectedDocumentId, createdCount: createdIds.length },
      { documentId: selectedDocumentId, createdNodeId: createdIds[0] },
      true,
    );

    return "✅ Updated the document with the requested content.";
  } catch (error) {
    await addToolCall(
      ctx,
      agentState,
      "editDoc",
      "Failed to update the selected document",
      { documentId: agentState.context.selectedDocumentId, message },
      { error: String(error) },
      false,
    );
    return `I encountered an issue working with the document: ${(error as Error)?.message || String(error)}`;
  }
}

