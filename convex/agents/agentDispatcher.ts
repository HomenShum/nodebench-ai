// convex/agents/agentDispatcher.ts
// Dispatcher to execute OpenAI tool-calls against Convex backend.
// It calls the Convex action aiAgents.executeOpenAITool which routes to the right handler.

export type OpenAIToolCall = {
  name: string;
  arguments: any;
};

// Low-level: just shapes a request for Convex action
export function buildExecutePayload(call: OpenAIToolCall) {
  return { name: call.name, params: call.arguments ?? {} };
}

// High-level: run via a Convex client instance (browser or server safe wrapper)
// client.action(api.aiAgents.executeOpenAITool, { name, params }) must be supported by your client.
export async function dispatchOpenAIToolViaConvex(client: any, call: OpenAIToolCall): Promise<any> {
  if (!client) throw new Error("Convex client is required");
  // When this module lives inside convex/, the generated API is a sibling at ../_generated/api
  const { api } = await import("../_generated/api");
  const payload = buildExecutePayload(call);
  return await client.action(api.aiAgents.executeOpenAITool, payload);
}

// Generic dispatcher with a custom runner (e.g., HTTP fetch to a proxy route)
export type ToolRunner = (name: string, params: any) => Promise<any>;

export async function dispatchOpenAITool(run: ToolRunner, call: OpenAIToolCall): Promise<any> {
  if (!run) throw new Error("A ToolRunner is required");
  const payload = buildExecutePayload(call);
  return await run(payload.name, payload.params);
}

