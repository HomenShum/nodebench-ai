/**
 * CommandPanelView — Conversational command interface for founder-to-agent messaging.
 * Slack/Discord-like threaded messaging with structured business context.
 * Route: /founder/command
 */

import { memo, useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Send,
  MessageSquare,
  FolderOpen,
  BarChart3,
  Wrench,
  CheckCircle2,
  Plus,
  ChevronRight,
  Clock,
  Zap,
  Shield,
  ExternalLink,
  PanelRightClose,
  PanelRightOpen,
  Activity,
  Bot,
  FileText,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

/* ── localStorage helpers ────────────────────────────────────────────────── */

const LS_MESSAGES_KEY = "nodebench-command-messages";
const LS_APPROVALS_KEY = "nodebench-command-approvals";

function loadPersistedMessages(): Record<string, DemoMessage[]> | null {
  try {
    const raw = localStorage.getItem(LS_MESSAGES_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, DemoMessage[]>;
  } catch {
    return null;
  }
}

function persistMessages(msgs: Record<string, DemoMessage[]>): void {
  try {
    localStorage.setItem(LS_MESSAGES_KEY, JSON.stringify(msgs));
  } catch { /* quota exceeded — silent */ }
}

function loadApprovalDecisions(): Record<string, "approved" | "rejected"> {
  try {
    const raw = localStorage.getItem(LS_APPROVALS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, "approved" | "rejected">;
  } catch {
    return {};
  }
}

function persistApprovalDecision(msgId: string, decision: "approved" | "rejected"): void {
  try {
    const current = loadApprovalDecisions();
    current[msgId] = decision;
    localStorage.setItem(LS_APPROVALS_KEY, JSON.stringify(current));
  } catch { /* silent */ }
}

/* ── Canned response generators ──────────────────────────────────────────── */

const CANNED_ORCHESTRATOR_RESPONSES = [
  "I'll dispatch that to the active agent. Creating task...",
  "Routing your request. Task queued for processing.",
  "Understood. Dispatching to the assigned agent now.",
  "Task created and dispatched. You'll see results shortly.",
];

const CANNED_AGENT_RESPONSES = [
  (n: number) => `Working on it. Scanning ${n} files across the repository...`,
  (n: number) => `Processing request. Found ${n} relevant entries to analyze...`,
  (n: number) => `On it. Checking ${n} data points for your query...`,
  (n: number) => `Executing. Reviewing ${n} items matching your criteria...`,
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/* ── Quick action prompts ────────────────────────────────────────────────── */

const QUICK_ACTION_PROMPTS: Record<string, string> = {
  Retrieve: 'Retrieve all files related to ',
  Analyze: 'Analyze the current state of ',
  Setup: 'Set up the configuration for ',
  Check: 'Check the status of ',
};

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

type AgentType = "claude_code" | "openclaw" | "background";
type AgentStatus = "healthy" | "blocked" | "waiting" | "idle";
type MessageSender = "founder" | "orchestrator" | "agent" | "system";
type MessageType =
  | "text"
  | "task_request"
  | "task_result"
  | "approval_request"
  | "status_update"
  | "evidence";
type Priority = "low" | "medium" | "high";
type TaskStatus = "dispatched" | "running" | "completed" | "failed" | "pending";

interface Conversation {
  id: string;
  agentName: string;
  agentType: AgentType;
  lastMessage: string;
  timestamp: number;
  unread: number;
  hasActiveTask: boolean;
}

interface DemoMessage {
  id: string;
  sender: MessageSender;
  agentName?: string;
  type: MessageType;
  content: string;
  timestamp: number;
  taskType?: string;
  capabilities?: string[];
  priority?: Priority;
  status?: TaskStatus;
  artifactCount?: number;
  duration?: string;
  riskLevel?: "low" | "medium" | "high";
  expiresIn?: string;
  sourceType?: string;
  evidencePreview?: string;
}

interface AgentInfo {
  name: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: string[];
  lastHeartbeat: string;
}

/* ================================================================== */
/*  Demo Data                                                          */
/* ================================================================== */

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_1",
    agentName: "Carbon Analyst",
    agentType: "claude_code",
    lastMessage: "Found 23 carbon credit pricing datasets in the repo...",
    timestamp: Date.now() - 1800000,
    unread: 2,
    hasActiveTask: false,
  },
  {
    id: "conv_2",
    agentName: "Compliance Monitor",
    agentType: "openclaw",
    lastMessage: "Waiting for API access approval to check SOC 2 status",
    timestamp: Date.now() - 7200000,
    unread: 0,
    hasActiveTask: true,
  },
  {
    id: "conv_3",
    agentName: "Research Scout",
    agentType: "claude_code",
    lastMessage: "Expanding scope — found 3 adjacent market reports",
    timestamp: Date.now() - 86400000,
    unread: 0,
    hasActiveTask: false,
  },
  {
    id: "conv_4",
    agentName: "Ops Runner",
    agentType: "background",
    lastMessage: "Nightly CI pipeline completed — 0 failures",
    timestamp: Date.now() - 172800000,
    unread: 0,
    hasActiveTask: false,
  },
];

const DEMO_MESSAGES: Record<string, DemoMessage[]> = {
  conv_1: [
    {
      id: "m1",
      sender: "founder",
      type: "text",
      content:
        "Can you pull together all the carbon credit pricing data from our repo? I need it for the investor deck.",
      timestamp: Date.now() - 3600000,
    },
    {
      id: "m2",
      sender: "orchestrator",
      type: "task_request",
      content: "Task created: Retrieve carbon credit pricing datasets",
      taskType: "retrieve_items",
      capabilities: ["read_repo_metadata", "read_selected_docs"],
      priority: "high",
      status: "dispatched",
      timestamp: Date.now() - 3590000,
    },
    {
      id: "m3",
      sender: "system",
      type: "text",
      content: "Task dispatched to Carbon Analyst",
      timestamp: Date.now() - 3585000,
    },
    {
      id: "m4",
      sender: "agent",
      agentName: "Carbon Analyst",
      type: "status_update",
      content:
        "Scanning repository... found 23 files matching carbon/credit/pricing patterns",
      timestamp: Date.now() - 3000000,
    },
    {
      id: "m5",
      sender: "agent",
      agentName: "Carbon Analyst",
      type: "task_result",
      content:
        "Found 23 carbon credit pricing datasets across 4 directories. Key findings: EU ETS spot prices (daily), Verra VCU historical (monthly), Gold Standard CER (quarterly), internal model outputs (hourly).",
      status: "completed",
      artifactCount: 23,
      duration: "12s",
      timestamp: Date.now() - 2400000,
    },
    {
      id: "m6",
      sender: "founder",
      type: "text",
      content:
        "Great. Now run an analysis — which of these are fresh enough for the deck? Anything older than 90 days flag it.",
      timestamp: Date.now() - 2100000,
    },
    {
      id: "m7",
      sender: "orchestrator",
      type: "task_request",
      content: "Task created: Analyze dataset freshness",
      taskType: "run_analysis",
      capabilities: ["read_selected_docs"],
      priority: "medium",
      status: "running",
      timestamp: Date.now() - 2090000,
    },
    {
      id: "m8",
      sender: "system",
      type: "text",
      content: "Task dispatched to Carbon Analyst",
      timestamp: Date.now() - 2085000,
    },
    {
      id: "m9",
      sender: "agent",
      agentName: "Carbon Analyst",
      type: "status_update",
      content:
        "Checking file modification dates and data timestamps across all 23 datasets...",
      timestamp: Date.now() - 1900000,
    },
    {
      id: "m10",
      sender: "agent",
      agentName: "Carbon Analyst",
      type: "task_result",
      content:
        "Freshness analysis complete. 17 of 23 datasets are within 90 days. Flagged 6 stale: Gold Standard CER Q3 (142 days), 3 internal model archives (100-130 days), 2 Verra VCU snapshots (95 days).",
      status: "completed",
      artifactCount: 6,
      duration: "8s",
      timestamp: Date.now() - 1800000,
    },
  ],
  conv_2: [
    {
      id: "m20",
      sender: "founder",
      type: "text",
      content:
        "TradeFlow wants our SOC 2 compliance timeline. Can you check where we stand?",
      timestamp: Date.now() - 10800000,
    },
    {
      id: "m21",
      sender: "orchestrator",
      type: "task_request",
      content: "Task created: Check SOC 2 compliance status",
      taskType: "run_analysis",
      capabilities: ["api_access", "read_selected_docs"],
      priority: "high",
      status: "dispatched",
      timestamp: Date.now() - 10790000,
    },
    {
      id: "m22",
      sender: "agent",
      agentName: "Compliance Monitor",
      type: "approval_request",
      content:
        "I need API access to your compliance tracking platform (Vanta) to pull current SOC 2 readiness data. This requires read-only OAuth access.",
      riskLevel: "medium",
      capabilities: ["api_access"],
      expiresIn: "23h",
      timestamp: Date.now() - 7200000,
    },
  ],
  conv_3: [
    {
      id: "m30",
      sender: "founder",
      type: "text",
      content:
        "Find me the latest market reports on voluntary carbon credit trading volumes.",
      timestamp: Date.now() - 90000000,
    },
    {
      id: "m31",
      sender: "agent",
      agentName: "Research Scout",
      type: "task_result",
      content:
        "Found 7 relevant reports. Top 3: MSCI VCM Q1 2026 outlook, Ecosystem Marketplace annual report, and Bloomberg NEF carbon offset tracker.",
      status: "completed",
      artifactCount: 7,
      duration: "34s",
      timestamp: Date.now() - 89000000,
    },
    {
      id: "m32",
      sender: "agent",
      agentName: "Research Scout",
      type: "evidence",
      content: "Expanding scope — found 3 adjacent market reports",
      sourceType: "market_report",
      evidencePreview:
        "ICVCM integrity council published new core carbon principles assessment framework. This may affect VCU pricing standards in Q2 2026.",
      timestamp: Date.now() - 86400000,
    },
  ],
  conv_4: [
    {
      id: "m40",
      sender: "agent",
      agentName: "Ops Runner",
      type: "task_result",
      content:
        "Nightly CI pipeline completed. All 47 tests passing, build artifact size stable at 2.3MB. No security vulnerabilities detected in dependency scan.",
      status: "completed",
      artifactCount: 1,
      duration: "3m 12s",
      timestamp: Date.now() - 172800000,
    },
  ],
};

const DEMO_AGENT_INFO: Record<string, AgentInfo> = {
  conv_1: {
    name: "Carbon Analyst",
    type: "claude_code",
    status: "healthy",
    capabilities: ["read_repo_metadata", "read_selected_docs", "run_analysis", "generate_report"],
    lastHeartbeat: "2 min ago",
  },
  conv_2: {
    name: "Compliance Monitor",
    type: "openclaw",
    status: "waiting",
    capabilities: ["api_access", "read_selected_docs", "compliance_check"],
    lastHeartbeat: "15 min ago",
  },
  conv_3: {
    name: "Research Scout",
    type: "claude_code",
    status: "idle",
    capabilities: ["web_search", "read_selected_docs", "summarize"],
    lastHeartbeat: "1 day ago",
  },
  conv_4: {
    name: "Ops Runner",
    type: "background",
    status: "healthy",
    capabilities: ["run_ci", "deploy", "monitor"],
    lastHeartbeat: "6 hours ago",
  },
};

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

const AGENT_TYPE_COLORS: Record<AgentType, string> = {
  claude_code: "bg-blue-400",
  openclaw: "bg-violet-400",
  background: "bg-emerald-400",
};

const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  claude_code: "Claude Code",
  openclaw: "OpenClaw",
  background: "Background",
};

const AGENT_STATUS_COLORS: Record<AgentStatus, string> = {
  healthy: "text-emerald-400",
  blocked: "text-rose-400",
  waiting: "text-amber-400",
  idle: "text-white/60",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-white/5 text-white/60",
  medium: "bg-amber-500/15 text-amber-400",
  high: "bg-rose-500/15 text-rose-400",
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

/* ── Conversation List Item ────────────────────────────────────────── */

const ConversationItem = memo(function ConversationItem({
  conv,
  isActive,
  onClick,
}: {
  conv: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`Conversation with ${conv.agentName}`}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        isActive
          ? "border border-[#d97757]/20 bg-[#d97757]/5"
          : "border border-transparent hover:bg-white/[0.06]",
      )}
    >
      <span
        className={cn(
          "mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full",
          AGENT_TYPE_COLORS[conv.agentType],
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-white/90">
            {conv.agentName}
          </span>
          <span className="flex-shrink-0 text-[10px] text-white/60">
            {relativeTime(conv.timestamp)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-white/60">
          {conv.lastMessage}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {conv.hasActiveTask && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <Activity className="h-2.5 w-2.5" />
              Running
            </span>
          )}
          {conv.unread > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d97757] px-1 text-[10px] font-semibold text-white">
              {conv.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});

/* ── Message Bubble Variants ───────────────────────────────────────── */

const FounderBubble = memo(function FounderBubble({ msg }: { msg: DemoMessage }) {
  return (
    <div className="flex justify-end animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="max-w-[90%]">
        <div className="rounded-xl rounded-br-sm border border-[#d97757]/20 bg-[#d97757]/10 px-4 py-2.5">
          <p className="text-sm leading-relaxed text-white/90">{msg.content}</p>
        </div>
        <p className="mt-1 text-right text-[10px] text-white/60">
          {relativeTime(msg.timestamp)}
        </p>
      </div>
    </div>
  );
});

const OrchestratorBubble = memo(function OrchestratorBubble({
  msg,
}: {
  msg: DemoMessage;
}) {
  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-200">
      <div className="max-w-[92%]">
        <div className="mb-1 flex items-center gap-2">
          <Zap className="h-3 w-3 text-blue-400" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-blue-400/70">
            Orchestrator
          </span>
        </div>
        {msg.type === "task_request" ? (
          <TaskRequestCard msg={msg} />
        ) : (
          <div className="rounded-xl rounded-bl-sm border border-blue-500/20 bg-blue-500/10 px-4 py-2.5">
            <p className="text-sm leading-relaxed text-white/90">{msg.content}</p>
          </div>
        )}
        <p className="mt-1 text-[10px] text-white/60">
          {relativeTime(msg.timestamp)}
        </p>
      </div>
    </div>
  );
});

const AgentBubble = memo(function AgentBubble({ msg }: { msg: DemoMessage }) {
  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-200">
      <div className="max-w-[92%]">
        <div className="mb-1 flex items-center gap-2">
          <Bot className="h-3 w-3 text-white/60" />
          <span className="text-[11px] font-medium text-white/60">
            {msg.agentName}
          </span>
        </div>
        {msg.type === "task_result" ? (
          <TaskResultCard msg={msg} />
        ) : msg.type === "approval_request" ? (
          <ApprovalRequestCard msg={msg} />
        ) : msg.type === "evidence" ? (
          <EvidenceCard msg={msg} />
        ) : msg.type === "status_update" ? (
          <StatusUpdateBubble msg={msg} />
        ) : (
          <div className="rounded-xl rounded-bl-sm border border-white/[0.20] bg-white/[0.12] px-4 py-2.5">
            <p className="text-sm leading-relaxed text-white/90">{msg.content}</p>
          </div>
        )}
        <p className="mt-1 text-[10px] text-white/60">
          {relativeTime(msg.timestamp)}
        </p>
      </div>
    </div>
  );
});

const SystemBubble = memo(function SystemBubble({ msg }: { msg: DemoMessage }) {
  return (
    <div className="flex justify-center py-1 animate-in fade-in duration-150">
      <span className="text-xs italic text-white/60">{msg.content}</span>
    </div>
  );
});

/* ── Special Cards ─────────────────────────────────────────────────── */

const TaskRequestCard = memo(function TaskRequestCard({ msg }: { msg: DemoMessage }) {
  return (
    <div className="rounded-xl border border-dashed border-blue-500/30 bg-blue-500/5 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-sm font-medium text-white/90">{msg.content}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {msg.taskType && (
          <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-300">
            {msg.taskType.replace(/_/g, " ")}
          </span>
        )}
        {msg.priority && (
          <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-medium", PRIORITY_STYLES[msg.priority])}>
            {msg.priority}
          </span>
        )}
        {msg.status && (
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
            {msg.status}
          </span>
        )}
      </div>
      {msg.capabilities && msg.capabilities.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {msg.capabilities.map((cap) => (
            <span key={cap} className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-white/60">
              {cap}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

const TaskResultCard = memo(function TaskResultCard({ msg }: { msg: DemoMessage }) {
  const success = msg.status === "completed";
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        success ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <CheckCircle2
          className={cn("h-3.5 w-3.5", success ? "text-emerald-400" : "text-rose-400")}
        />
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider",
            success ? "text-emerald-400" : "text-rose-400",
          )}
        >
          {success ? "Completed" : "Failed"}
        </span>
        {msg.duration && <span className="text-[10px] text-white/60">in {msg.duration}</span>}
      </div>
      <p className="text-sm leading-relaxed text-white/80">{msg.content}</p>
      {msg.artifactCount != null && msg.artifactCount > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/60">
          <FolderOpen className="h-3 w-3" />
          {msg.artifactCount} artifact{msg.artifactCount > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
});

const ApprovalRequestCard = memo(function ApprovalRequestCard({ msg }: { msg: DemoMessage }) {
  const { toast } = useToast();
  const [resolved, setResolved] = useState<"approved" | "rejected" | null>(() => {
    const saved = loadApprovalDecisions();
    return saved[msg.id] ?? null;
  });

  const handleDecision = useCallback((decision: "approved" | "rejected") => {
    setResolved(decision);
    persistApprovalDecision(msg.id, decision);
    toast(
      decision === "approved" ? "Request approved" : "Request rejected",
      decision === "approved" ? "success" : "error",
    );
  }, [msg.id, toast]);

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
          Approval Required
        </span>
        {msg.riskLevel && (
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[9px] font-medium",
              msg.riskLevel === "high"
                ? "bg-rose-500/15 text-rose-400"
                : msg.riskLevel === "medium"
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-white/5 text-white/60",
            )}
          >
            {msg.riskLevel} risk
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-white/80">{msg.content}</p>
      {msg.capabilities && msg.capabilities.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {msg.capabilities.map((cap) => (
            <span key={cap} className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-300/70">
              {cap}
            </span>
          ))}
        </div>
      )}
      {msg.expiresIn && (
        <p className="mt-2 text-[10px] text-white/60">
          <Clock className="mr-0.5 inline h-2.5 w-2.5" />
          Expires in {msg.expiresIn}
        </p>
      )}
      {!resolved ? (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => handleDecision("approved")}
            aria-label="Approve request"
            className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30"
          >
            Approve
          </button>
          <button
            onClick={() => handleDecision("rejected")}
            aria-label="Reject request"
            className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/25"
          >
            Reject
          </button>
        </div>
      ) : (
        <p className={cn("mt-3 text-xs font-medium", resolved === "approved" ? "text-emerald-400" : "text-rose-400")}>
          {resolved === "approved" ? "Approved" : "Rejected"}
        </p>
      )}
    </div>
  );
});

const EvidenceCard = memo(function EvidenceCard({ msg }: { msg: DemoMessage }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] px-4 py-3">
      <div className="mb-1 flex items-center gap-2">
        <ExternalLink className="h-3 w-3 text-white/60" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
          Evidence
        </span>
        {msg.sourceType && (
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-white/60">
            {msg.sourceType.replace(/_/g, " ")}
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-white/80">{msg.content}</p>
      {msg.evidencePreview && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse evidence" : "Expand evidence"}
            className="mt-2 flex items-center gap-1 text-[10px] text-[#d97757] transition-colors hover:text-[#d97757]/80"
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
            {expanded ? "Collapse" : "Preview"}
          </button>
          {expanded && (
            <p className="mt-2 rounded-lg bg-white/[0.02] p-2 text-xs leading-relaxed text-white/60">
              {msg.evidencePreview}
            </p>
          )}
        </>
      )}
    </div>
  );
});

const StatusUpdateBubble = memo(function StatusUpdateBubble({ msg }: { msg: DemoMessage }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.20] bg-white/[0.12] px-4 py-2.5">
      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      <p className="text-sm text-white/60">{msg.content}</p>
    </div>
  );
});

/* ── Context Panel ─────────────────────────────────────────────────── */

const ContextPanel = memo(function ContextPanel({
  agentInfo,
  messages,
}: {
  agentInfo: AgentInfo | null;
  messages: DemoMessage[];
}) {
  const activeTasks = useMemo(
    () => messages.filter((m) => m.type === "task_request" && (m.status === "running" || m.status === "dispatched")),
    [messages],
  );
  const evidence = useMemo(
    () => messages.filter((m) => m.type === "evidence" || m.type === "task_result"),
    [messages],
  );
  const approvals = useMemo(() => messages.filter((m) => m.type === "approval_request"), [messages]);

  if (!agentInfo) {
    return <div className="flex h-full items-center justify-center text-xs text-white/60">Select a conversation</div>;
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      {/* Agent Info */}
      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Agent</h3>
        <div className="rounded-lg border border-white/[0.20] bg-white/[0.12] p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", AGENT_TYPE_COLORS[agentInfo.type])} />
            <span className="text-sm font-medium text-white/90">{agentInfo.name}</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-white/60">Type</span>
              <span className="text-white/60">{AGENT_TYPE_LABELS[agentInfo.type]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Status</span>
              <span className={AGENT_STATUS_COLORS[agentInfo.status]}>{agentInfo.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Heartbeat</span>
              <span className="text-white/60">{agentInfo.lastHeartbeat}</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {agentInfo.capabilities.map((cap) => (
              <span key={cap} className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-white/60">
                {cap}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <section>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Active Tasks</h3>
          <div className="space-y-2">
            {activeTasks.map((t) => (
              <div key={t.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                <p className="text-xs text-white/70">{t.content}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                  <span className="text-[10px] text-amber-400/70">{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Approval Queue */}
      {approvals.length > 0 && (
        <section>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Approval Queue</h3>
          <div className="space-y-2">
            {approvals.map((a) => (
              <div key={a.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                <p className="line-clamp-2 text-xs text-white/70">{a.content}</p>
                {a.expiresIn && <p className="mt-1 text-[10px] text-white/60">Expires in {a.expiresIn}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Evidence */}
      {evidence.length > 0 && (
        <section>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Recent Evidence</h3>
          <div className="space-y-2">
            {evidence.slice(0, 5).map((e) => (
              <div key={e.id} className="rounded-lg border border-white/[0.20] bg-white/[0.12] p-2.5">
                <p className="line-clamp-2 text-xs text-white/60">{e.content}</p>
                {e.artifactCount != null && (
                  <p className="mt-1 text-[10px] text-white/60">
                    {e.artifactCount} artifact{e.artifactCount > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
});

/* ── Input Bar ─────────────────────────────────────────────────────── */

const QUICK_ACTIONS = [
  { label: "Retrieve", icon: FolderOpen },
  { label: "Analyze", icon: BarChart3 },
  { label: "Setup", icon: Wrench },
  { label: "Check", icon: CheckCircle2 },
] as const;

const InputBar = memo(function InputBar({ onSend, onClear }: { onSend: (text: string) => void; onClear: () => void }) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [text, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, []);

  return (
    <div className="border-t border-white/[0.06] bg-[#151413] p-3">
      {/* Quick actions */}
      <div className="mb-2 flex items-center gap-1.5 overflow-x-auto">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              const prompt = QUICK_ACTION_PROMPTS[action.label] ?? "";
              setText(prompt);
              textareaRef.current?.focus();
            }}
            aria-label={`Quick action: ${action.label}`}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-white/[0.20] bg-white/[0.12] px-2 py-1 text-[10px] text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white/60"
          >
            <action.icon className="h-3 w-3" />
            {action.label}
          </button>
        ))}
        <button
          onClick={onClear}
          aria-label="Clear conversation"
          className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-white/[0.20] bg-white/[0.12] px-2 py-1 text-[10px] text-white/60 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
        <div className="ml-auto flex flex-shrink-0 items-center gap-1">
          <span className="mr-1 text-[9px] text-white/60">Priority:</span>
          {(["low", "medium", "high"] as Priority[]).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              aria-label={`Set priority to ${p}`}
              className={cn(
                "rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors",
                priority === p ? PRIORITY_STYLES[p] : "text-white/60 hover:text-white/60",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2">
        <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 transition-colors focus-within:border-[#d97757]/30">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Send a command or message..."
            rows={1}
            aria-label="Message input"
            className="w-full resize-none bg-transparent text-sm text-white/90 placeholder:text-white/40 focus:outline-none"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          aria-label="Send message"
          className={cn(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors",
            text.trim() ? "bg-[#d97757] text-white hover:bg-[#d97757]/80" : "bg-white/5 text-white/70",
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export default function CommandPanelView() {
  const { toast } = useToast();
  const [activeConvId, setActiveConvId] = useState("conv_1");
  const [contextOpen, setContextOpen] = useState(true);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [localMessages, setLocalMessages] = useState<Record<string, DemoMessage[]>>(() => {
    return loadPersistedMessages() ?? DEMO_MESSAGES;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeMessages = useMemo(() => localMessages[activeConvId] ?? [], [localMessages, activeConvId]);
  const activeAgent = useMemo(() => DEMO_AGENT_INFO[activeConvId] ?? null, [activeConvId]);
  const activeConv = useMemo(() => DEMO_CONVERSATIONS.find((c) => c.id === activeConvId), [activeConvId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length]);

  // Persist messages whenever they change
  useEffect(() => {
    persistMessages(localMessages);
  }, [localMessages]);

  const handleSend = useCallback(
    (text: string) => {
      const agentName = activeAgent?.name ?? "Agent";
      const now = Date.now();

      // 1. Add founder message immediately
      const founderMsg: DemoMessage = {
        id: `m_${now}`,
        sender: "founder",
        type: "text",
        content: text,
        timestamp: now,
      };
      setLocalMessages((prev) => ({
        ...prev,
        [activeConvId]: [...(prev[activeConvId] ?? []), founderMsg],
      }));

      // 2. After 1s, add orchestrator response
      setTimeout(() => {
        const orchMsg: DemoMessage = {
          id: `m_${now}_orch`,
          sender: "orchestrator",
          type: "task_request",
          content: pickRandom(CANNED_ORCHESTRATOR_RESPONSES).replace("the active agent", agentName),
          taskType: "general_task",
          priority: "medium",
          status: "dispatched",
          timestamp: Date.now(),
        };
        setLocalMessages((prev) => ({
          ...prev,
          [activeConvId]: [...(prev[activeConvId] ?? []), orchMsg],
        }));
      }, 1000);

      // 3. After 3s total, add agent response
      setTimeout(() => {
        const fileCount = Math.floor(Math.random() * 46) + 5; // 5-50
        const agentMsg: DemoMessage = {
          id: `m_${now}_agent`,
          sender: "agent",
          agentName,
          type: "status_update",
          content: pickRandom(CANNED_AGENT_RESPONSES)(fileCount),
          timestamp: Date.now(),
        };
        setLocalMessages((prev) => ({
          ...prev,
          [activeConvId]: [...(prev[activeConvId] ?? []), agentMsg],
        }));
      }, 3000);
    },
    [activeConvId, activeAgent],
  );

  const handleClear = useCallback(() => {
    setLocalMessages((prev) => ({
      ...prev,
      [activeConvId]: [],
    }));
    toast("Conversation cleared", "info");
  }, [activeConvId, toast]);

  const renderMessage = useCallback((msg: DemoMessage) => {
    switch (msg.sender) {
      case "founder":
        return <FounderBubble key={msg.id} msg={msg} />;
      case "orchestrator":
        return <OrchestratorBubble key={msg.id} msg={msg} />;
      case "agent":
        return <AgentBubble key={msg.id} msg={msg} />;
      case "system":
        return <SystemBubble key={msg.id} msg={msg} />;
      default:
        return null;
    }
  }, []);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Conversation List (desktop) ─────────────────────── */}
      <aside className="hidden w-[260px] flex-shrink-0 flex-col border-r border-white/[0.06] bg-[#151413] md:flex">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Conversations</h2>
          <button
            aria-label="New conversation"
            className="flex h-6 w-6 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white/60"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-auto p-2" aria-label="Conversation list">
          {DEMO_CONVERSATIONS.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              isActive={conv.id === activeConvId}
              onClick={() => {
                setActiveConvId(conv.id);
                setMobileListOpen(false);
              }}
            />
          ))}
        </nav>
      </aside>

      {/* ── Center: Message Thread ────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Thread header */}
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Mobile conversation selector */}
            <button
              onClick={() => setMobileListOpen(!mobileListOpen)}
              aria-label="Toggle conversation list"
              className="flex items-center gap-2 rounded-lg border border-white/[0.20] bg-white/[0.12] px-2.5 py-1.5 text-sm text-white/70 md:hidden"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <ChevronRight className={cn("h-3 w-3 transition-transform", mobileListOpen && "rotate-90")} />
            </button>

            {activeConv && (
              <>
                <span className={cn("h-2.5 w-2.5 rounded-full", AGENT_TYPE_COLORS[activeConv.agentType])} />
                <div>
                  <h1 className="text-sm font-medium text-white/90">{activeConv.agentName}</h1>
                  <span className="text-[10px] text-white/60">
                    {AGENT_TYPE_LABELS[activeConv.agentType]}
                    {activeConv.hasActiveTask && (
                      <span className="ml-2 text-amber-400">
                        <Activity className="mr-0.5 inline h-2.5 w-2.5" />
                        Task running
                      </span>
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setContextOpen(!contextOpen)}
            aria-label={contextOpen ? "Close context panel" : "Open context panel"}
            className="hidden items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white/60 md:flex"
          >
            {contextOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
            Context
          </button>
        </header>

        {/* Mobile conversation dropdown */}
        {mobileListOpen && (
          <div className="border-b border-white/[0.06] bg-[#151413] p-2 md:hidden">
            {DEMO_CONVERSATIONS.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConvId}
                onClick={() => {
                  setActiveConvId(conv.id);
                  setMobileListOpen(false);
                }}
              />
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-auto px-4 py-4" role="log" aria-label="Message history" aria-live="polite">
          {activeMessages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <InputBar onSend={handleSend} onClear={handleClear} />
      </main>

      {/* ── Right: Context Panel (desktop, collapsible) ───────────── */}
      {contextOpen && (
        <aside className="hidden w-[300px] flex-shrink-0 border-l border-white/[0.06] bg-[#151413] lg:block">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Context</h2>
          </div>
          <ContextPanel agentInfo={activeAgent} messages={activeMessages} />
        </aside>
      )}
    </div>
  );
}
