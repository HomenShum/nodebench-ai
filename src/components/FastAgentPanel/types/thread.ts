// Thread/Conversation types for FastAgentPanel
import { Id } from "../../../../convex/_generated/dataModel";

export interface Thread {
  _id: Id<"chatThreads">;
  userId: Id<"users">;
  title: string;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
  _creationTime: number;
  
  // Computed fields (from queries)
  messageCount?: number;
  lastMessage?: string;
  lastMessageAt?: number;
}

export interface ThreadCreateInput {
  title?: string;
  pinned?: boolean;
}

export interface ThreadUpdateInput {
  threadId: Id<"chatThreads">;
  title?: string;
  pinned?: boolean;
}

