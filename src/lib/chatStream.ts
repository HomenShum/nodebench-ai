// ChatStreamManager - SSE streaming support for FastAgentPanel
import { Id } from "../../convex/_generated/dataModel";

export interface StreamEvent {
  type: 'thinking' | 'tool.call' | 'tool.result' | 'source' | 'token' | 'agent.spawn' | 'agent.complete' | 'complete' | 'error';
  data?: any;
  message?: string;
}

export interface ThinkingStep {
  type: 'thinking' | 'tool_call' | 'result';
  content: string;
  timestamp: Date;
  toolCall?: {
    name: string;
    args?: any;
    result?: any;
    error?: string;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  args: any;
  result?: any;
  error?: string;
  status: 'pending' | 'running' | 'complete' | 'error';
}

export interface Source {
  id: string;
  title: string;
  url?: string;
  snippet?: string;
  type: 'document' | 'web' | 'file';
}

export interface SpawnedAgent {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  startedAt: number;
  completedAt?: number;
}

export type StreamEventHandler = (event: StreamEvent) => void;

export interface StreamCallbacks {
  onThinking?: (step: ThinkingStep) => void;
  onToolCall?: (call: {
    callId: string;
    toolName?: string;
    args?: any;
    result?: any;
    error?: string;
    status?: string;
  }) => void;
  onSource?: (source: Source) => void;
  onToken?: (token: string) => void;
  onAgentSpawn?: (agent: { id: string; name: string }) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export class ChatStreamManager {
  private eventSource: EventSource | null = null;
  private handlers: StreamEventHandler[] = [];
  private runId: Id<"agentRuns"> | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    // Initialize
  }

  /**
   * Connect to SSE stream for a specific agent run
   */
  connect(runId: Id<"agentRuns">, deploymentUrl?: string): void {
    this.close(); // Close any existing connection
    this.runId = runId;

    // Build SSE endpoint URL (prefer explicit Convex URL in env)
    const envUrl = (import.meta as any)?.env?.VITE_CONVEX_URL as string | undefined;
    const baseUrl = (deploymentUrl || (window as any).CONVEX_URL || envUrl || '').toString();
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${normalizedBase}/api/stream/${runId}`;

    // Retry connection with exponential backoff to handle run creation races
    const maxAttempts = 5;
    const baseDelayMs = 300;

    const open = (attempt: number) => {
      try {
        // Include credentials so Convex auth cookies are sent across origins
        this.eventSource = new EventSource(url, { withCredentials: true } as EventSourceInit);

        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emit(data);
          } catch (error) {
            console.error('[ChatStream] Failed to parse event:', error);
          }
        };

        this.eventSource.onerror = (error) => {
          console.error('[ChatStream] SSE error:', error);
          if (attempt < maxAttempts) {
            try { this.eventSource?.close(); } catch {}
            this.eventSource = null;
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            setTimeout(() => open(attempt + 1), delay);
          } else {
            this.emit({ type: 'error', message: 'Stream connection error' });
            this.close();
          }
        };
      } catch (error) {
        if (attempt < maxAttempts) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          setTimeout(() => open(attempt + 1), delay);
        } else {
          console.error('[ChatStream] Failed to connect:', error);
        }
      }
    };

    console.info('[ChatStream] SSE URL:', url);
    open(1);
  }

  /**
   * Register an event handler
   */
  on(handler: StreamEventHandler): () => void {
    this.handlers.push(handler);
    // Return unsubscribe function
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index > -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  /**
   * Start streaming events for the given run ID with UI callbacks
   */
  async startStream(
    runId: Id<"agentRuns">,
    callbacks: StreamCallbacks = {},
    options?: { deploymentUrl?: string }
  ): Promise<void> {
    this.detachHandler();
    this.connect(runId, options?.deploymentUrl);

    const handler: StreamEventHandler = (event) => {
      const kind = (event as any).kind ?? event.type;

      switch (kind) {
        case 'thinking': {
          const step = parseThinkingStep(event);
          if (step) {
            callbacks.onThinking?.(step);
          }
          break;
        }
        case 'tool.call': {
          const call = parseToolCall(event);
          if (call) {
            callbacks.onToolCall?.({
              callId: call.id,
              toolName: call.name,
              args: call.args,
              status: call.status,
            });
          }
          break;
        }
        case 'tool.result': {
          const result = parseToolResult(event);
          if (result && callbacks.onToolCall) {
            callbacks.onToolCall({
              callId: result.id,
              result: result.result,
              error: result.error,
              status: result.error ? 'error' : 'complete',
            });
          }
          break;
        }
        case 'token':
        case 'token.delta': {
          if (callbacks.onToken) {
            const token = typeof event.message === 'string'
              ? event.message
              : typeof (event as any).data?.delta === 'string'
              ? (event as any).data.delta
              : '';
            if (token) callbacks.onToken(token);
          }
          break;
        }
        case 'source':
        case 'search.results':
        case 'rag.results': {
          const source = parseSource(event);
          if (source) {
            callbacks.onSource?.(source);
          }
          break;
        }
        case 'agent.spawn': {
          const agent = parseSpawnedAgent(event);
          if (agent) {
            callbacks.onAgentSpawn?.({ id: agent.id, name: agent.name });
          }
          break;
        }
        case 'agent.complete':
        case 'run.complete':
        case 'complete': {
          callbacks.onComplete?.();
          break;
        }
        case 'run.error':
        case 'error': {
          const message = event.message || 'Stream error';
          callbacks.onError?.(new Error(message));
          break;
        }
        default:
          break;
      }
    };

    this.unsubscribe = this.on(handler);
  }

  /**
   * Emit an event to all handlers
   */
  private emit(event: StreamEvent): void {
    this.handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('[ChatStream] Handler error:', error);
      }
    });
  }

  /**
   * Close the SSE connection
   */
  close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.detachHandler();
    this.runId = null;
  }

  private detachHandler(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  /**
   * Get current run ID
   */
  getRunId(): Id<"agentRuns"> | null {
    return this.runId;
  }
}

/**
 * Create a new ChatStreamManager instance
 */
export function createChatStream(): ChatStreamManager {
  return new ChatStreamManager();
}

/**
 * Parse thinking step from stream event
 */
export function parseThinkingStep(event: StreamEvent): ThinkingStep | null {
  if (event.type !== 'thinking') return null;

  return {
    type: 'thinking',
    content: event.message || '',
    timestamp: new Date(),
  };
}

/**
 * Parse tool call from stream event
 */
export function parseToolCall(event: StreamEvent): ToolCall | null {
  if (event.type !== 'tool.call') return null;

  const data = event.data || {};
  return {
    id: data.id || `tool_${Date.now()}`,
    name: data.name || 'unknown',
    args: data.args || {},
    status: 'running',
  };
}

/**
 * Parse tool result from stream event
 */
export function parseToolResult(event: StreamEvent): { id: string; result?: any; error?: string } | null {
  if (event.type !== 'tool.result') return null;

  const data = event.data || {};
  return {
    id: data.id || '',
    result: data.result,
    error: data.error,
  };
}

/**
 * Parse source from stream event
 */
export function parseSource(event: StreamEvent): Source | null {
  if (event.type !== 'source') return null;

  const data = event.data || {};
  return {
    id: data.id || `source_${Date.now()}`,
    title: data.title || 'Untitled',
    url: data.url,
    snippet: data.snippet,
    type: data.type || 'document',
  };
}

/**
 * Parse spawned agent from stream event
 */
export function parseSpawnedAgent(event: StreamEvent): SpawnedAgent | null {
  if (event.type !== 'agent.spawn') return null;

  const data = event.data || {};
  return {
    id: data.id || `agent_${Date.now()}`,
    name: data.name || 'Agent',
    type: data.type || 'unknown',
    status: 'running',
    startedAt: Date.now(),
  };
}

