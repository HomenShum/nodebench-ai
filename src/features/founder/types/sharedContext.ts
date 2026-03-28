/* ------------------------------------------------------------------ */
/*  Shared Context Protocol — Frontend Types                          */
/*  Mirrors server/routes/sharedContext.ts + sync/protocol.ts shapes  */
/* ------------------------------------------------------------------ */

export type PeerStatus = "active" | "idle" | "stale";
export type PeerRole = "researcher" | "compiler" | "judge" | "explorer" | "replay" | "environment_builder" | "runner" | "observer" | "monitor" | "router";
export type PacketType = "entity_packet" | "workflow_packet" | "trace_packet" | "judge_packet" | "environment_packet" | "failure_packet" | "state_snapshot_packet" | "verdict_packet" | "scenario_packet" | "change_packet";
export type PacketFreshness = "fresh" | "warming" | "stale";
export type TaskStatus = "proposed" | "accepted" | "completed" | "rejected" | "escalated";
export type MessageClass = "request" | "response" | "context_offer" | "context_pull" | "task_handoff" | "status_update" | "verdict" | "escalation" | "invalidation";

export interface SharedContextPeer {
  peerId: string;
  product: string;
  workspaceId?: string;
  surface: string;
  role: PeerRole;
  capabilities: string[];
  status: PeerStatus;
  lastHeartbeatAt?: string;
  summary?: {
    currentTask?: string;
    focusEntity?: string;
    confidence?: number;
  };
}

export interface SharedContextPacket {
  contextId: string;
  contextType: PacketType;
  producerPeerId: string;
  workspaceId?: string;
  subject: string;
  summary: string;
  claims: string[];
  evidenceRefs: Array<{ id?: string; href?: string; label?: string; title?: string }>;
  confidence?: number;
  freshness: { status: PacketFreshness; trustTier?: string };
  status: "active" | "invalidated";
  lineage?: { parentContextIds?: string[]; sourceRunId?: string; supersedes?: string };
  createdAt?: string;
}

export interface SharedContextTask {
  taskId: string;
  taskType: string;
  proposerPeerId: string;
  assigneePeerId: string;
  status: TaskStatus;
  description?: string;
  inputContextIds: string[];
  outputContextId?: string;
  reason?: string;
  createdAt?: string;
}

export interface SharedContextMessage {
  messageId: string;
  fromPeerId: string;
  toPeerId: string;
  messageType: MessageClass;
  content: string;
  acknowledged: boolean;
  createdAt?: string;
}

export interface SharedContextSnapshot {
  peers: SharedContextPeer[];
  recentPackets: SharedContextPacket[];
  recentTasks: SharedContextTask[];
  recentMessages: SharedContextMessage[];
  counts: {
    activePeers: number;
    activePackets: number;
    invalidatedPackets: number;
    openTasks: number;
    unreadMessages: number;
  };
}

export interface SharedContextEvent {
  type: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}
