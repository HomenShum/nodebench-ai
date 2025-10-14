// Message types for FastAgentPanel
import { Id } from "../../../../convex/_generated/dataModel";

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'sending' | 'streaming' | 'complete' | 'error';

export interface ThinkingStep {
  type: string;
  content: string;
  timestamp?: Date;
}

export interface ToolCall {
  callId: string;
  toolName: string;
  args?: any;
  result?: any;
  error?: string;
  status?: 'pending' | 'running' | 'complete' | 'error' | string;
  elapsedMs?: number;
  timestamp?: Date;
}

export interface Source {
  title: string;
  documentId?: Id<"documents">;
  url?: string;
  snippet?: string;
  score?: number;
  datetime?: string;
  publishedDate?: string;
  type?: 'document' | 'web' | 'image' | 'video' | 'context' | string;
  thumbnail?: string;
  mediaUrl?: string;
}

export interface Message {
  id: string;
  threadId: Id<"chatThreads">;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  timestamp: Date;

  // Streaming state
  isStreaming?: boolean;
  streamedTokens?: number;
  streamId?: string; // For persistent text streaming

  // Agent execution
  runId?: Id<"agentRuns">;
  thinkingSteps?: ThinkingStep[];
  toolCalls?: ToolCall[];
  sources?: Source[];

  // Metadata
  model?: string;
  fastMode?: boolean;
  tokensUsed?: {
    input: number;
    output: number;
  };
  elapsedMs?: number;

  // Convex fields
  _id?: Id<"chatMessages">;
  _creationTime?: number;
}

export interface MessageCreateInput {
  threadId: Id<"chatThreads">;
  role: MessageRole;
  content: string;
  status?: MessageStatus;
  runId?: Id<"agentRuns">;
  model?: string;
  fastMode?: boolean;
}

export interface MessageUpdateInput {
  messageId: Id<"chatMessages">;
  content?: string;
  status?: MessageStatus;
  runId?: Id<"agentRuns">;
  tokensUsed?: {
    input: number;
    output: number;
  };
  elapsedMs?: number;
}
