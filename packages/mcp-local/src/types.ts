export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** If true, handler returns ContentBlock[] directly instead of a JSON-serializable object. */
  rawContent?: boolean;
  handler: (args: any) => Promise<unknown>;
};
