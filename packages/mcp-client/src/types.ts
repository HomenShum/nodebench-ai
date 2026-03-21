/** Client configuration */
export interface ClientConfig {
  /** API key in format nb_key_[32 hex chars] */
  apiKey: string;
  /** WebSocket gateway URL (default: wss://api.nodebenchai.com/mcp) */
  url?: string;
  /** Max reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number;
}

/** MCP tool definition returned by tools/list */
export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    title?: string;
    category?: string;
    phase?: string;
    complexity?: string;
  };
}

/** Content block in a tool result */
export interface ContentBlock {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
}

/** Result of a tools/call request */
export interface ToolResult {
  content: ContentBlock[];
  isError: boolean;
  _meta?: {
    durationMs?: number;
    sessionToolCallCount?: number;
    isTimeout?: boolean;
  };
}

/** Connection state */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

/** JSON-RPC 2.0 request (internal) */
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

/** JSON-RPC 2.0 response (internal) */
export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

/** WebSocket close codes from the gateway */
export const WS_CLOSE_CODES = {
  AUTH_FAILED: 4001,
  RATE_LIMITED: 4002,
  IDLE_TIMEOUT: 4003,
  SERVER_ERROR: 4004,
  CAPACITY_FULL: 4005,
} as const;
