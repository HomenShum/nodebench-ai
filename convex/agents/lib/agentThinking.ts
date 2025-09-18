// Agent thinking and tool-call helpers extracted from aiAgents.ts
import { internal } from "../../_generated/api";
import type { AgentState, ThinkingStep, ToolCall, Adaptation } from "./types";

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function previewJson(value: any, maxLen = 1200) {
  try {
    const json = JSON.stringify(
      value,
      (_key, v) => {
        if (v instanceof ArrayBuffer) return `ArrayBuffer(${v.byteLength})`;
        if (typeof v === "bigint") return v.toString();
        return v;
      },
      2,
    );
    return json.length > maxLen ? json.slice(0, maxLen) + "…" : json;
  } catch {
    try {
      const s = String(value);
      return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
    } catch {
      return "<unserializable>";
    }
  }
}

export async function addThinkingStep(
  ctx: any,
  agentState: AgentState,
  type: "analysis" | "planning" | "tool_selection" | "execution" | "evaluation" | "adaptation",
  content: string,
  metadata?: any,
): Promise<ThinkingStep> {
  const step: ThinkingStep = { id: newId("step"), type, content, timestamp: Date.now(), metadata };
  agentState.thinkingSteps.push(step);
  // eslint-disable-next-line no-console
  console.info(`🧠 [${String(type).toUpperCase()}]`, content.slice(0, 200));
  try {
    const runId = (agentState as any).context.runId as string | undefined;
    if (ctx && runId) {
      await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
        runId,
        kind: "thinking",
        message: content,
        data: { type, metadata },
      });
    }
  } catch {}
  return step;
}

export async function addToolCall(
  ctx: any,
  agentState: AgentState,
  toolName: string,
  reasoning: string,
  input: any,
  output: any,
  success: boolean,
): Promise<ToolCall> {
  const toolCall: ToolCall = {
    id: newId("tool"),
    toolName,
    reasoning,
    input,
    output,
    success,
    timestamp: Date.now(),
  };
  agentState.toolCalls.push(toolCall);
  // eslint-disable-next-line no-console
  console.info(`🔧 [TOOL-${toolName}] -> ${success ? "SUCCESS" : "FAILED"}`);
  // eslint-disable-next-line no-console
  console.info("   ↳ input:", previewJson(input));
  // eslint-disable-next-line no-console
  console.info("   ↳ output:", previewJson(output));
  try {
    const runId = (agentState as any).context.runId as string | undefined;
    if (ctx && runId) {
      await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
        runId,
        kind: "tool",
        message: reasoning,
        data: { toolName, input, output, success },
      });
    }
  } catch {}
  return toolCall;
}

export async function addAdaptation(
  ctx: any,
  agentState: AgentState,
  trigger: string,
  decision: string,
  action: string,
): Promise<Adaptation> {
  const adaptation: Adaptation = {
    id: newId("adapt"),
    trigger,
    decision,
    action,
    timestamp: Date.now(),
  };
  agentState.adaptations.push(adaptation);
  // eslint-disable-next-line no-console
  console.info("🔄 [ADAPTATION]", trigger, "->", decision, "->", action);
  try {
    const runId = (agentState as any).context.runId as string | undefined;
    if (ctx && runId) {
      await ctx.runMutation((internal as any).aiAgents.appendRunEvent, {
        runId,
        kind: "adaptation",
        message: `${trigger} -> ${decision}`,
        data: { action },
      });
    }
  } catch {}
  return adaptation;
}

