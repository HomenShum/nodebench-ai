import { api } from "../../_generated/api";
import { addThinkingStep, addToolCall } from "./agentThinking";
import type { AgentState, AgentStateContext } from "./types";
import { isOpenAI } from "./openaiUtils";

export async function gatherContext(ctx: any, context: AgentStateContext): Promise<string> {
  const contextInfo: string[] = [];

  if (context.selectedDocumentId) {
    try {
      const doc = await ctx.runQuery(api.documents.getById, { documentId: context.selectedDocumentId });
      if (doc) contextInfo.push(`Working with document: "${doc.title}" (${doc.nodes?.length || 0} blocks)`);
    } catch {
      contextInfo.push("Document context unavailable");
    }
  }

  if (context.mcpServerId) {
    try {
      const server = await ctx.runQuery(api.mcp.getMcpServerById, { serverId: context.mcpServerId });
      if (server) contextInfo.push(`MCP Server available: ${server.name}`);
    } catch {
      contextInfo.push("MCP Server context unavailable");
    }
  }

  contextInfo.push(
    `Using ${String(context.model).toUpperCase()} model` +
      (isOpenAI(context) && context.openaiVariant ? ` (${context.openaiVariant})` : ""),
  );

  return contextInfo.length > 0 ? `Context gathered: ${contextInfo.join(". ")}` : "No specific context available.";
}

export async function performWebSearch(ctx: any, agentState: AgentState, query: string): Promise<string> {
  const { mcpServerId } = agentState.context;
  if (!mcpServerId) {
    await addToolCall(ctx, agentState, "web_search", "Attempted web search", { query }, { error: "No MCP server" }, false);
    return "Web search unavailable - no MCP server configured.";
  }

  try {
    const urlMatch = query.match(/https?:\/\/[^\s]+/);
    const searchQuery = urlMatch ? `extract content from ${urlMatch[0]}` : query;

    await addThinkingStep(ctx, agentState, "execution", `Searching for: "${searchQuery}"`);
    const result = await ctx.runAction(api.aiAgents.executeToolWithNaturalLanguage, {
      serverId: mcpServerId,
      toolName: "tavily_search",
      naturalLanguageQuery: searchQuery,
      model: agentState.context.model,
      isLearning: false,
    });

    await addToolCall(
      ctx,
      agentState,
      "tavily_search",
      `Searching: ${searchQuery}`,
      { query: searchQuery },
      result,
      !!result && !result.error,
    );

    const isSuccess =
      result &&
      (result.success === true ||
        (result.result && typeof result.result === "string" && result.result.length > 0) ||
        (result.result && typeof result.result === "object" && Object.keys(result.result).length > 0)) &&
      !result.error;

    if (isSuccess) {
      await addThinkingStep(ctx, agentState, "execution", "Search completed successfully");
      return typeof result.result === "string" ? result.result : JSON.stringify(result.result || result);
    } else {
      const errorMsg = (result as any)?.error || `No valid result returned`;
      await addThinkingStep(ctx, agentState, "execution", `Search failed: ${errorMsg}`);
      return `Search encountered an issue: ${errorMsg}`;
    }
  } catch (error) {
    await addToolCall(ctx, agentState, "web_search", "Web search attempt", { query }, { error: String(error) }, false);
    return `Web search encountered an issue. Let me provide what I know about: ${query}`;
  }
}

