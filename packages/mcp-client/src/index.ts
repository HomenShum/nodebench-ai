export type {
  ClientConfig,
  Tool,
  ToolResult,
  ContentBlock,
  ConnectionState,
} from "./types.js";
export { WS_CLOSE_CODES } from "./types.js";

import type {
  ClientConfig,
  Tool,
  ToolResult,
  ConnectionState,
  JsonRpcResponse,
} from "./types.js";
import { WS_CLOSE_CODES } from "./types.js";

const DEFAULT_URL = "wss://api.nodebenchai.com/mcp";
const KEY_REGEX = /^nb_key_[0-9a-f]{32}$/;

/**
 * Thin MCP client for NodeBench's WebSocket gateway.
 * Zero runtime dependencies — uses native WebSocket.
 */
export class NodeBenchClient {
  private readonly apiKey: string;
  private readonly url: string;
  private readonly maxReconnectDelay: number;

  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private requestId = 0;
  private pending = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
  }>();

  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  private errorHandler: ((error: Error) => void) | null = null;
  private disconnectHandler: ((code: number, reason: string) => void) | null = null;

  constructor(config: ClientConfig) {
    if (!KEY_REGEX.test(config.apiKey)) {
      throw new Error("Invalid API key format — expected nb_key_[32 hex chars]");
    }
    this.apiKey = config.apiKey;
    this.url = config.url ?? DEFAULT_URL;
    this.maxReconnectDelay = config.maxReconnectDelay ?? 30_000;
  }

  get isConnected(): boolean { return this.state === "connected"; }
  get connectionState(): ConnectionState { return this.state; }

  onError(handler: (error: Error) => void): void { this.errorHandler = handler; }
  onDisconnect(handler: (code: number, reason: string) => void): void { this.disconnectHandler = handler; }

  connect(): Promise<void> {
    if (this.state === "connected") return Promise.resolve();
    this.intentionalClose = false;
    return this.doConnect();
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.rejectAllPending("Client disconnected");
    this.state = "disconnected";
  }

  /** List all available tools */
  async listTools(): Promise<Tool[]> {
    const result = await this.request("tools/list", {}) as { tools: Tool[] };
    return result.tools;
  }

  /** Call a tool by name */
  async callTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    const result = await this.request("tools/call", { name, arguments: args });
    return result as ToolResult;
  }

  // ── Private methods ─────────────────────────────────────────────────

  private doConnect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.state = this.reconnectAttempts > 0 ? "reconnecting" : "connecting";

      // Use subprotocol auth for environments that can't set headers
      const ws = new WebSocket(this.url, [`mcp.${this.apiKey}`]);
      this.ws = ws;

      const onOpen = () => {
        cleanup();
        this.state = "connected";
        this.reconnectAttempts = 0;
        resolve();
      };

      const onError = (ev: Event) => {
        cleanup();
        const err = new Error("WebSocket connection failed");
        if (this.state !== "connected") {
          reject(err);
        }
        this.errorHandler?.(err);
      };

      const onClose = (ev: CloseEvent) => {
        cleanup();
        this.handleClose(ev.code, ev.reason);
        if (this.state !== "connected") {
          reject(new Error(`Connection closed: ${ev.code} ${ev.reason}`));
        }
      };

      const onMessage = (ev: MessageEvent) => {
        this.handleMessage(String(ev.data));
      };

      const cleanup = () => {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("error", onError);
      };

      ws.addEventListener("open", onOpen);
      ws.addEventListener("error", onError);
      ws.addEventListener("close", onClose);
      ws.addEventListener("message", onMessage);
    });
  }

  private handleMessage(raw: string): void {
    let msg: JsonRpcResponse;
    try {
      msg = JSON.parse(raw) as JsonRpcResponse;
    } catch {
      return; // ignore malformed messages
    }

    // Notifications (no id or null id) — skip
    if (msg.id == null) return;

    const entry = this.pending.get(msg.id);
    if (!entry) return;
    this.pending.delete(msg.id);

    if (msg.error) {
      entry.reject(new Error(`[${msg.error.code}] ${msg.error.message}`));
    } else {
      entry.resolve(msg.result);
    }
  }

  private handleClose(code: number, reason: string): void {
    this.ws = null;
    this.rejectAllPending(`Connection closed: ${code}`);
    this.disconnectHandler?.(code, reason);

    // Don't reconnect for auth failures, intentional close, or capacity issues
    const noReconnect = [
      WS_CLOSE_CODES.AUTH_FAILED,
      WS_CLOSE_CODES.CAPACITY_FULL,
      1000,
    ];
    if (this.intentionalClose || noReconnect.includes(code)) {
      this.state = "disconnected";
      return;
    }

    // Exponential backoff reconnect
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay,
    );
    this.reconnectAttempts++;
    this.state = "reconnecting";
    this.reconnectTimer = setTimeout(() => {
      this.doConnect().catch((err) => {
        this.errorHandler?.(err instanceof Error ? err : new Error(String(err)));
      });
    }, delay);
  }

  private request(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.ws || this.state !== "connected") {
      return Promise.reject(new Error("Not connected"));
    }

    const id = ++this.requestId;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });

    return new Promise((resolve, reject) => {
      // 60s timeout per request
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 60_000);

      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (err) => { clearTimeout(timer); reject(err); },
      });

      this.ws!.send(payload);
    });
  }

  private rejectAllPending(reason: string): void {
    for (const [id, entry] of this.pending) {
      entry.reject(new Error(reason));
    }
    this.pending.clear();
  }
}
