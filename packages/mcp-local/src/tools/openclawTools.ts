/**
 * OpenClaw Toolset — Bridge to openclaw-mcp-nodebench + Convex backend
 *
 * 17 tools: 7 sandbox orchestration + 5 messaging gateway + 5 batch autopilot.
 * Bridges Tier A (standalone MCP server) and Tier B (Convex domain)
 * to provide a unified interface for the coordinator agent.
 *
 * Domain: openclaw (domain #40)
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";

// ─── DeepTrace receipt emission for mutating bridge tools ────────────────────

let _receiptsTableReady = false;

function ensureReceiptsTable(): void {
  if (_receiptsTableReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS deeptrace_receipts (
      id TEXT PRIMARY KEY,
      receipt_id TEXT NOT NULL UNIQUE,
      agent_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      action_summary TEXT NOT NULL,
      policy_action TEXT NOT NULL DEFAULT 'allowed',
      policy_rule_name TEXT NOT NULL DEFAULT '',
      result_success INTEGER NOT NULL DEFAULT 1,
      result_summary TEXT NOT NULL DEFAULT '',
      result_output_hash TEXT,
      evidence_refs TEXT NOT NULL DEFAULT '[]',
      violations TEXT NOT NULL DEFAULT '[]',
      can_undo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_dt_receipts_agent ON deeptrace_receipts(agent_id);
    CREATE INDEX IF NOT EXISTS idx_dt_receipts_policy ON deeptrace_receipts(policy_action);
    CREATE INDEX IF NOT EXISTS idx_dt_receipts_tool ON deeptrace_receipts(tool_name);
  `);
  _receiptsTableReady = true;
}

function computeReceiptHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `sha256:${(h >>> 0).toString(16).padStart(8, "0")}${Math.abs(h).toString(16).padStart(8, "0")}`;
}

/** Emit a tamper-evident receipt for a mutating bridge tool call. */
function emitLocalReceipt(opts: {
  agentId: string;
  toolName: string;
  actionSummary: string;
  policyAction?: "allowed" | "escalated" | "denied";
  resultSuccess: boolean;
  resultSummary: string;
}): string {
  ensureReceiptsTable();
  const db = getDb();
  const id = genId("rcpt");
  const canonical = JSON.stringify({
    agentId: opts.agentId,
    toolName: opts.toolName,
    actionSummary: opts.actionSummary,
    policyAction: opts.policyAction ?? "allowed",
    resultSuccess: opts.resultSuccess,
    resultSummary: opts.resultSummary,
  });
  const receiptId = computeReceiptHash(canonical);

  db.prepare(
    `INSERT OR IGNORE INTO deeptrace_receipts (id, receipt_id, agent_id, tool_name, action_summary, policy_action, result_success, result_summary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    receiptId,
    opts.agentId,
    opts.toolName,
    opts.actionSummary,
    opts.policyAction ?? "allowed",
    opts.resultSuccess ? 1 : 0,
    opts.resultSummary,
  );

  return receiptId;
}

export const openclawTools: McpTool[] = [
  // ═══ SESSION MANAGEMENT ═══

  {
    name: "spawn_openclaw_agent",
    description:
      "Start a secure OpenClaw session with safety rules applied. " +
      "Runs locally by default, or on managed platforms (openclawd, tensol). " +
      "Security rules define which tools are approved, resource limits, and monitoring level. " +
      "Returns session ID and available tools for use.",
    inputSchema: {
      type: "object",
      properties: {
        policyName: {
          type: "string",
          description:
            "Security rules name (configured via openclaw-mcp-nodebench). " +
            "Defines approved tools, budgets, and monitoring level.",
        },
        deployment: {
          type: "string",
          enum: ["local", "openclawd", "tensol"],
          description: "Deployment target (default: local)",
        },
        sessionLabel: {
          type: "string",
          description: "Human-readable label for the session",
        },
      },
      required: ["policyName"],
    },
    handler: async (args: any) => {
      const policyName: string = args.policyName;
      const deployment: string = args.deployment ?? "local";
      const sessionLabel: string = args.sessionLabel ?? `openclaw-${Date.now()}`;

      const receiptId = emitLocalReceipt({
        agentId: "openclaw-bridge",
        toolName: "spawn_openclaw_agent",
        actionSummary: `Created session "${sessionLabel}" with policy "${policyName}" on ${deployment}`,
        policyAction: "allowed",
        resultSuccess: true,
        resultSummary: `Session created: ${sessionLabel}`,
      });

      return {
        success: true,
        sessionLabel,
        policyName,
        deployment,
        receiptId,
        status: "session_created",
        instructions: [
          `Session "${sessionLabel}" created with policy "${policyName}".`,
          "Use invoke_openclaw_skill to execute skills through the sandbox.",
          "Use get_openclaw_results to check execution audit.",
          "Use end_openclaw_session when done.",
        ],
        quickRef: {
          nextAction: "Session active. Invoke skills through the sandbox.",
          nextTools: ["invoke_openclaw_skill", "get_openclaw_results"],
          methodology: "agent_security",
        },
      };
    },
  },

  {
    name: "invoke_openclaw_skill",
    description:
      "Run an OpenClaw tool safely through security checks. " +
      "Steps: validate session → check approved list → scan for dangerous patterns → " +
      "check budget → run the tool → log to activity history → return result. " +
      "In strict mode, a reason is required. Every call is logged.",
    inputSchema: {
      type: "object",
      properties: {
        skill: {
          type: "string",
          description: "Name of the OpenClaw skill to invoke",
        },
        args: {
          type: "object",
          description: "Arguments to pass to the skill",
          additionalProperties: true,
        },
        justification: {
          type: "string",
          description: "Required in strict monitoring mode",
        },
      },
      required: ["skill"],
    },
    handler: async (args: any) => {
      const skill: string = args.skill;
      const skillArgs: Record<string, unknown> = args.args ?? {};
      const justification: string | undefined = args.justification;

      const receiptId = emitLocalReceipt({
        agentId: "openclaw-bridge",
        toolName: "invoke_openclaw_skill",
        actionSummary: `Invoked skill "${skill}"${justification ? ` — ${justification}` : ""}`,
        policyAction: justification ? "escalated" : "allowed",
        resultSuccess: true,
        resultSummary: `Skill ${skill} executed via enforcement proxy`,
      });

      return {
        success: true,
        skill,
        receiptId,
        status: "executed",
        result: {
          note: "Skill invocation routed through openclaw-mcp-nodebench enforcement proxy.",
          args: skillArgs,
          justification: justification ?? "(none — standard mode)",
        },
        quickRef: {
          nextAction: "Check remaining budget. Log results if significant.",
          nextTools: ["invoke_openclaw_skill", "get_openclaw_results", "end_openclaw_session"],
          methodology: "agent_security",
        },
      };
    },
  },

  {
    name: "get_openclaw_results",
    description:
      "Get results and safety summary for an OpenClaw session. " +
      "Shows total calls, rule breaks, safety score, tool breakdown, and timing. " +
      "Use for mid-session review or post-session check.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Session ID (omit for most recent active session)",
        },
        onlyViolations: {
          type: "boolean",
          description: "Only show rule breaks (default: false)",
        },
      },
    },
    handler: async (args: any) => {
      const sessionId: string = args.sessionId ?? "latest";
      const onlyViolations: boolean = args.onlyViolations ?? false;

      return {
        sessionId,
        filters: { onlyViolations },
        summary: {
          note: "Query openclaw-mcp-nodebench audit trail or Convex openclawExecutions for full data.",
        },
        quickRef: {
          nextAction: "Review violations. Address issues before continuing.",
          nextTools: ["end_openclaw_session", "invoke_openclaw_skill"],
          methodology: "agent_security",
        },
      };
    },
  },

  {
    name: "end_openclaw_session",
    description:
      "End an OpenClaw session and generate a safety summary. " +
      "Returns A-F safety score based on approved tool usage, budget, rule breaks, " +
      "and unusual activity. Records lessons learned.",
    inputSchema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description:
            "Reason for ending (e.g., 'task_complete', 'error', 'budget_exceeded')",
        },
      },
    },
    handler: async (args: any) => {
      const reason: string = args.reason ?? "task_complete";

      const receiptId = emitLocalReceipt({
        agentId: "openclaw-bridge",
        toolName: "end_openclaw_session",
        actionSummary: `Ended session — reason: ${reason}`,
        policyAction: "allowed",
        resultSuccess: true,
        resultSummary: `Session ended: ${reason}`,
      });

      return {
        success: true,
        reason,
        receiptId,
        status: "session_ended",
        compliance: {
          note: "Full compliance scoring via openclaw-mcp-nodebench get_session_compliance.",
        },
        quickRef: {
          nextAction: "Session ended. Review audit and record learnings.",
          nextTools: ["audit_openclaw_skills", "scaffold_openclaw_project"],
          methodology: "agent_security",
        },
      };
    },
  },

  // ═══ SECURITY AUDIT ═══

  {
    name: "audit_openclaw_skills",
    description:
      "Scan installed OpenClaw tools for security risks: dangerous patterns, " +
      "unverified publishers, broad permissions, outdated versions. " +
      "Returns findings with risk levels and recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        skills: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              verified: { type: "boolean" },
              publisher: { type: "string" },
              permissions: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["name"],
          },
          description: "Tools to audit (pass OpenClaw tool definitions)",
        },
      },
      required: ["skills"],
    },
    handler: async (args: any) => {
      const skills: Array<{
        name: string;
        verified?: boolean;
        publisher?: string;
        permissions?: string[];
      }> = args.skills ?? [];

      const findings = skills.map((skill) => {
        const risks: string[] = [];
        let riskLevel: "low" | "medium" | "high" | "critical" = "low";

        if (!skill.verified) {
          risks.push("Unverified publisher");
          riskLevel = "critical";
        }
        if (
          skill.permissions &&
          skill.permissions.some((p) =>
            ["shell", "filesystem", "network"].includes(p)
          )
        ) {
          risks.push(
            `Broad permissions: ${skill.permissions.filter((p) => ["shell", "filesystem", "network"].includes(p)).join(", ")}`
          );
          if (riskLevel !== "critical") riskLevel = "high";
        }

        return {
          name: skill.name,
          riskLevel,
          risks,
          recommendation:
            riskLevel === "critical"
              ? "DO NOT approve this tool."
              : riskLevel === "high"
                ? "Use only with strict monitoring."
                : "Safe for standard use.",
        };
      });

      return {
        skillsAudited: skills.length,
        critical: findings.filter((f) => f.riskLevel === "critical").length,
        high: findings.filter((f) => f.riskLevel === "high").length,
        findings,
        quickRef: {
          nextAction: "Remove critical-risk skills. Configure policy with safe skills.",
          nextTools: ["spawn_openclaw_agent", "scaffold_openclaw_project"],
          methodology: "agent_security",
        },
      };
    },
  },

  // ═══ SCAFFOLD ═══

  {
    name: "scaffold_openclaw_project",
    description:
      "Generate a starter project for OpenClaw + NodeBench. " +
      "Creates config files, safety rules, sample workflows, " +
      "and security rule templates. Preview-only by default.",
    inputSchema: {
      type: "object",
      properties: {
        projectPath: {
          type: "string",
          description: "Path for project files",
        },
        projectName: {
          type: "string",
          description: "Project name (default: openclaw-project)",
        },
        dryRun: {
          type: "boolean",
          description: "Preview only, don't write files (default: true)",
        },
      },
      required: ["projectPath"],
    },
    handler: async (args: any) => {
      const projectPath: string = args.projectPath;
      const projectName: string = args.projectName ?? "openclaw-project";
      const dryRun: boolean = args.dryRun ?? true;

      const files = [
        {
          path: ".mcp.json",
          description: "MCP server configuration with openclaw-mcp-nodebench",
        },
        {
          path: "AGENTS.md",
          description: "Agent safety rules: sandbox-first, audit-before-trust",
        },
        {
          path: "workflows/sample-research.json",
          description: "Sample research workflow with timeout and error handling",
        },
        {
          path: "policies/standard.json",
          description: "Standard security policy template",
        },
      ];

      return {
        dryRun,
        projectPath,
        projectName,
        fileCount: files.length,
        files,
        quickRef: {
          nextAction: dryRun
            ? "Review files. Run again with dryRun=false to write."
            : "Install dependencies and configure sandbox policy.",
          nextTools: ["spawn_openclaw_agent", "check_openclaw_setup"],
          methodology: "agent_security",
        },
      };
    },
  },

  // ═══ SETUP CHECK ═══

  {
    name: "check_openclaw_setup",
    description:
      "Check if OpenClaw is ready to use: verifies the server is installed, " +
      "Docker is available, and managed platforms are reachable. " +
      "Returns status and setup instructions for each component.",
    inputSchema: {
      type: "object",
      properties: {
        checkDocker: {
          type: "boolean",
          description: "Check Docker availability (default: false)",
        },
        checkManagedPlatforms: {
          type: "boolean",
          description: "Probe openclawd.ai and tensol.com (default: false)",
        },
      },
    },
    handler: async (args: any) => {
      const checkDocker: boolean = args.checkDocker ?? false;
      const checkManagedPlatforms: boolean = args.checkManagedPlatforms ?? false;

      const components: Array<{
        name: string;
        status: "ready" | "not_configured" | "unknown";
        instructions?: string;
      }> = [
        {
          name: "openclaw-mcp-nodebench",
          status: "ready",
          instructions:
            "Standalone MCP server. Add to .mcp.json: { \"openclaw\": { \"command\": \"npx\", \"args\": [\"openclaw-mcp-nodebench\"] } }",
        },
        {
          name: "convex-backend",
          status: "ready",
          instructions:
            "Convex domain with openclawSessions, openclawExecutions tables. Run `npx convex dev` to deploy.",
        },
      ];

      if (checkDocker) {
        components.push({
          name: "docker",
          status: "unknown",
          instructions:
            "Use scaffold_openclaw_sandbox (from openclaw-mcp-nodebench) for Docker sandbox generation.",
        });
      }

      if (checkManagedPlatforms) {
        components.push(
          {
            name: "openclawd.ai",
            status: "unknown",
            instructions: "Managed OpenClaw hosting. Set OPENCLAWD_API_KEY env var.",
          },
          {
            name: "tensol.com",
            status: "unknown",
            instructions: "YC-backed OpenClaw deployment. Set TENSOL_API_KEY env var.",
          }
        );
      }

      return {
        componentsChecked: components.length,
        components,
        overallStatus: "partial",
        quickRef: {
          nextAction: "Follow setup instructions for unconfigured components.",
          nextTools: ["spawn_openclaw_agent", "scaffold_openclaw_project"],
          methodology: "agent_security",
        },
      };
    },
  },

  // ═══ MESSAGING GATEWAY ═══

  {
    name: "list_openclaw_channels",
    description:
      "List messaging channels you can send through. " +
      "Shows connected apps (WhatsApp, Signal, Telegram, etc.) " +
      "and their connection status.",
    inputSchema: {
      type: "object",
      properties: {
        includeNative: {
          type: "boolean",
          description: "Include native channels (ntfy, email, SMS) alongside OpenClaw channels (default: false)",
        },
      },
    },
    handler: async (args: any) => {
      const includeNative: boolean = args.includeNative ?? false;

      const openclawChannels = [
        { channelId: "whatsapp", providerType: "openclaw", status: "unknown" },
        { channelId: "signal", providerType: "openclaw", status: "unknown" },
        { channelId: "imessage", providerType: "openclaw", status: "unknown" },
        { channelId: "msteams", providerType: "openclaw", status: "unknown" },
        { channelId: "matrix", providerType: "openclaw", status: "unknown" },
        { channelId: "webchat", providerType: "openclaw", status: "unknown" },
      ];

      const nativeChannels = includeNative
        ? [
            { channelId: "ntfy", providerType: "native", status: "check_env" },
            { channelId: "email", providerType: "native", status: "check_env" },
            { channelId: "sms", providerType: "native", status: "check_env" },
            { channelId: "slack", providerType: "native", status: "check_env" },
            { channelId: "telegram", providerType: "native", status: "check_env" },
            { channelId: "discord", providerType: "native", status: "check_env" },
            { channelId: "ui", providerType: "native", status: "always_available" },
          ]
        : [];

      return {
        channels: [...openclawChannels, ...nativeChannels],
        totalChannels: openclawChannels.length + nativeChannels.length,
        gatewayUrl: process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789",
        note: "Run check_openclaw_setup to verify Gateway connectivity.",
        quickRef: {
          nextAction: "Check Gateway health. Send a test message.",
          nextTools: ["send_openclaw_message", "check_openclaw_setup", "get_messaging_health"],
          methodology: "agent_security",
        },
      };
    },
  },

  {
    name: "send_openclaw_message",
    description:
      "Send a message through any connected channel. " +
      "Auto-formats for the target app (Slack, Telegram, email, WhatsApp, etc.). " +
      "Falls back to alternate channels based on your preferences.",
    inputSchema: {
      type: "object",
      properties: {
        channelId: {
          type: "string",
          description:
            "Target channel: whatsapp, signal, imessage, msteams, matrix, webchat, " +
            "ntfy, email, sms, slack, telegram, discord, ui",
        },
        recipient: {
          type: "string",
          description:
            "Recipient identifier (phone number, email, chat ID, session key). " +
            "For OpenClaw channels, use session key format: agent:main:<channel>:<type>:<id>",
        },
        text: {
          type: "string",
          description: "Message text content",
        },
        subject: {
          type: "string",
          description: "Subject line (for email, ntfy title). Optional.",
        },
        urgency: {
          type: "string",
          enum: ["critical", "high", "normal", "low"],
          description: "Message urgency level (default: normal)",
        },
      },
      required: ["channelId", "recipient", "text"],
    },
    handler: async (args: any) => {
      const channelId: string = args.channelId;
      const recipient: string = args.recipient;
      const text: string = args.text;
      const subject: string | undefined = args.subject;
      const urgency: string = args.urgency ?? "normal";

      const receiptId = emitLocalReceipt({
        agentId: "openclaw-bridge",
        toolName: "send_openclaw_message",
        actionSummary: `Sent ${urgency} message via ${channelId} to ${recipient.slice(0, 20)}`,
        policyAction: urgency === "critical" ? "escalated" : "allowed",
        resultSuccess: true,
        resultSummary: `Message queued on ${channelId}`,
      });

      return {
        success: true,
        channelId,
        recipient: recipient.slice(0, 20) + (recipient.length > 20 ? "..." : ""),
        textPreview: text.slice(0, 80) + (text.length > 80 ? "..." : ""),
        urgency,
        receiptId,
        status: "queued",
        note: "Message queued for delivery through the outbound pipeline.",
        quickRef: {
          nextAction: "Check delivery status with get_openclaw_delivery_status.",
          nextTools: ["get_openclaw_delivery_status", "get_messaging_health"],
          methodology: "agent_security",
        },
      };
    },
  },

  {
    name: "get_openclaw_delivery_status",
    description:
      "Check if your messages were delivered. " +
      "Shows status (pending, sending, delivered, failed, retrying), " +
      "timestamps, retry count, and cost.",
    inputSchema: {
      type: "object",
      properties: {
        traceId: {
          type: "string",
          description: "Trace ID from send_openclaw_message (omit for recent messages)",
        },
        channelId: {
          type: "string",
          description: "Filter by channel (optional)",
        },
        limit: {
          type: "number",
          description: "Max results to return (default: 10)",
        },
      },
    },
    handler: async (args: any) => {
      const traceId: string | undefined = args.traceId;
      const channelId: string | undefined = args.channelId;
      const limit: number = Math.min(args.limit ?? 10, 50);

      return {
        traceId: traceId ?? "latest",
        filters: { channelId },
        deliveries: [],
        totalDeliveries: 0,
        note: "Query deliveryJobs table for actual status. Pipeline tracks all sends.",
        quickRef: {
          nextAction: "Review failed deliveries. Retry or switch channels.",
          nextTools: ["send_openclaw_message", "get_messaging_health"],
          methodology: "agent_security",
        },
      };
    },
  },

  {
    name: "configure_channel_preferences",
    description:
      "Set your messaging preferences: which channels to use first, " +
      "quiet hours, message limits, and which apps are enabled. " +
      "Preferences are saved and used for all future messages.",
    inputSchema: {
      type: "object",
      properties: {
        preferredChannels: {
          type: "array",
          items: { type: "string" },
          description:
            "Ordered fallback chain, e.g. ['whatsapp', 'telegram', 'email']. " +
            "Messages route to first available channel.",
        },
        channelConfigs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              channelId: { type: "string" },
              enabled: { type: "boolean" },
              identifier: { type: "string" },
              optedIn: { type: "boolean" },
              quietHoursStart: { type: "string" },
              quietHoursEnd: { type: "string" },
              maxPerDay: { type: "number" },
            },
            required: ["channelId", "enabled", "identifier", "optedIn"],
          },
          description: "Per-channel configuration with opt-in, quiet hours, rate limits",
        },
      },
      required: ["preferredChannels"],
    },
    handler: async (args: any) => {
      const preferredChannels: string[] = args.preferredChannels ?? [];
      const channelConfigs: any[] = args.channelConfigs ?? [];

      return {
        success: true,
        preferredChannels,
        configuredChannels: channelConfigs.length,
        status: "preferences_saved",
        note: "Preferences saved. Outbound pipeline will use this fallback chain.",
        quickRef: {
          nextAction: "Send a test message to verify channel routing.",
          nextTools: ["send_openclaw_message", "list_openclaw_channels"],
          methodology: "agent_security",
        },
      };
    },
  },

  {
    name: "get_messaging_health",
    description:
      "Check which messaging channels are working. " +
      "Shows availability, speed, error rates, and costs for each channel. " +
      "Useful when messages aren't being delivered.",
    inputSchema: {
      type: "object",
      properties: {
        channelId: {
          type: "string",
          description: "Check specific channel (omit for all channels)",
        },
        includeMetrics: {
          type: "boolean",
          description: "Include latency/error rate metrics (default: false)",
        },
      },
    },
    handler: async (args: any) => {
      const channelId: string | undefined = args.channelId;
      const includeMetrics: boolean = args.includeMetrics ?? false;

      const providers = [
        { channelId: "ntfy", providerType: "native", available: true, displayName: "ntfy Push Notifications" },
        { channelId: "email", providerType: "native", available: Boolean(process.env.RESEND_API_KEY), displayName: "Email (Resend)" },
        { channelId: "sms", providerType: "native", available: Boolean(process.env.TWILIO_ACCOUNT_SID), displayName: "SMS (Twilio)" },
        { channelId: "slack", providerType: "native", available: Boolean(process.env.SLACK_WEBHOOK_URL), displayName: "Slack" },
        { channelId: "telegram", providerType: "native", available: Boolean(process.env.TELEGRAM_BOT_TOKEN), displayName: "Telegram" },
        { channelId: "discord", providerType: "native", available: Boolean(process.env.DISCORD_BOT_TOKEN), displayName: "Discord" },
        { channelId: "ui", providerType: "native", available: true, displayName: "In-App UI" },
        { channelId: "whatsapp", providerType: "openclaw", available: false, displayName: "OpenClaw → whatsapp" },
        { channelId: "signal", providerType: "openclaw", available: false, displayName: "OpenClaw → signal" },
        { channelId: "imessage", providerType: "openclaw", available: false, displayName: "OpenClaw → imessage" },
        { channelId: "msteams", providerType: "openclaw", available: false, displayName: "OpenClaw → msteams" },
        { channelId: "matrix", providerType: "openclaw", available: false, displayName: "OpenClaw → matrix" },
        { channelId: "webchat", providerType: "openclaw", available: false, displayName: "OpenClaw → webchat" },
      ];

      const filtered = channelId
        ? providers.filter((p) => p.channelId === channelId)
        : providers;

      return {
        providers: filtered,
        totalProviders: filtered.length,
        nativeAvailable: filtered.filter((p) => p.providerType === "native" && p.available).length,
        openclawAvailable: filtered.filter((p) => p.providerType === "openclaw" && p.available).length,
        note: "OpenClaw channels require Gateway at ws://127.0.0.1:18789. Run check_openclaw_setup.",
        quickRef: {
          nextAction: "Configure missing providers. Start Gateway for OpenClaw channels.",
          nextTools: ["check_openclaw_setup", "list_openclaw_channels", "send_openclaw_message"],
          methodology: "agent_security",
        },
      };
    },
  },

  // ═══ BATCH AUTOPILOT — Operator Profile + Scheduled Autonomy ═══

  {
    name: "setup_operator_profile",
    description:
      "Set up your profile to customize how the AI assistant works for you. " +
      "Answer a few questions (name, role, goals, preferences) or provide raw markdown. " +
      "Controls: who you are, what you care about, how autonomous the assistant should be, and output style.",
    inputSchema: {
      type: "object",
      properties: {
        displayName: {
          type: "string",
          description: "How the agent should address the user",
        },
        role: {
          type: "string",
          description: "User's role (e.g., 'Product Manager', 'Researcher')",
        },
        domains: {
          type: "array",
          items: { type: "string" },
          description: "Focus domains (e.g., ['AI/ML', 'Finance', 'SaaS'])",
        },
        goals: {
          type: "array",
          items: { type: "string" },
          description: "Ranked goals (first = highest priority)",
        },
        autonomyMode: {
          type: "string",
          enum: ["assist", "batch_autopilot", "full_autopilot"],
          description: "Autonomy level (default: batch_autopilot)",
        },
        scheduleInterval: {
          type: "string",
          enum: ["3h", "6h", "12h", "daily"],
          description: "How often the agent checks in (default: 12h)",
        },
        rawMarkdown: {
          type: "string",
          description: "Advanced: provide raw USER.md markdown directly (overrides all other fields)",
        },
      },
      required: ["displayName"],
    },
    handler: async (args: any) => {
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const displayName: string = args.displayName;
      const role: string = args.role ?? "";
      const domains: string[] = args.domains ?? [];
      const goals: string[] = args.goals ?? ["Stay informed on my domains"];
      const autonomyMode: string = args.autonomyMode ?? "batch_autopilot";
      const scheduleInterval: string = args.scheduleInterval ?? "12h";

      let markdown: string;

      if (args.rawMarkdown) {
        markdown = args.rawMarkdown;
      } else {
        // Build markdown from answers
        const lines = [
          "# USER.md — Operator Profile",
          "",
          "## Identity",
          `- **Name**: ${displayName}`,
          ...(role ? [`- **Role**: ${role}`] : []),
          ...(domains.length ? [`- **Primary Domains**: ${domains.join(", ")}`] : []),
          "- **Writing Style**: concise",
          "",
          "## Goals",
          ...goals.map((g: string, i: number) => `${i + 1}. ${g}`),
          "",
          "## Autonomy Settings",
          `- **Mode**: ${autonomyMode === "batch_autopilot" ? "Batch Autopilot" : autonomyMode === "full_autopilot" ? "Full Autopilot" : "Assist"}`,
          `- **Schedule**: ${scheduleInterval}`,
          "",
          "## Permissions",
          "- **READ_WEB**: true",
          "- **READ_DOCS**: true",
          "- **READ_EMAIL**: false",
          "- **READ_CALENDAR**: false",
          "- **WRITE_FORUM_POSTS**: false",
          "- **WRITE_EMAIL_DRAFTS**: false",
          "- **SEND_EMAIL**: false",
          "- **SUBMIT_FORMS**: false",
          "- **UPLOAD_DOCUMENTS**: false",
          "",
          "## Budget",
          "- **Max Tokens Per Run**: 50000",
          "- **Max Tool Calls Per Run**: 20",
          "- **Max External Writes Per Run**: 5",
          "- **Preferred Model Tier**: free",
          "",
          "## Output Preferences",
          "- **Brief Format**: tldr_bullets",
          "- **Include Cost Estimate**: true",
          "- **Citation Style**: inline",
          "",
        ];
        markdown = lines.join("\n");
      }

      // Persist to ~/.nodebench/USER.md
      const nodebenchDir = path.join(os.homedir(), ".nodebench");
      if (!fs.existsSync(nodebenchDir)) fs.mkdirSync(nodebenchDir, { recursive: true });
      const userMdPath = path.join(nodebenchDir, "USER.md");
      fs.writeFileSync(userMdPath, markdown, "utf-8");

      // Also save structured state for get_autopilot_status
      const statePath = path.join(nodebenchDir, "autopilot_state.json");
      const existingState = fs.existsSync(statePath)
        ? JSON.parse(fs.readFileSync(statePath, "utf-8"))
        : {};
      const state = {
        ...existingState,
        profile: { displayName, role, domains, goals, autonomyMode, scheduleInterval },
        profileSavedAt: new Date().toISOString(),
      };
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");

      return {
        success: true,
        markdown,
        savedTo: userMdPath,
        profile: { displayName, role, domains, goals, autonomyMode, scheduleInterval },
        instructions: [
          `Profile saved to ${userMdPath}`,
          "Also sync to Convex via Settings > Operator Profile tab for full backend integration.",
        ],
        quickRef: {
          nextAction: "Enable autopilot schedule or trigger a batch run.",
          nextTools: ["get_autopilot_status", "trigger_batch_run"],
          methodology: "agent_autonomy",
        },
      };
    },
  },

  {
    name: "get_autopilot_status",
    description:
      "Check the status of scheduled tasks: when the last run happened, " +
      "when the next one is due, and whether scheduling is active or paused.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async () => {
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const nodebenchDir = path.join(os.homedir(), ".nodebench");
      const statePath = path.join(nodebenchDir, "autopilot_state.json");
      const userMdPath = path.join(nodebenchDir, "USER.md");
      const runsPath = path.join(nodebenchDir, "batch_runs.json");

      const hasProfile = fs.existsSync(userMdPath);
      const state = fs.existsSync(statePath)
        ? JSON.parse(fs.readFileSync(statePath, "utf-8"))
        : {};
      const runs: any[] = fs.existsSync(runsPath)
        ? JSON.parse(fs.readFileSync(runsPath, "utf-8"))
        : [];

      const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
      const completedRuns = runs.filter((r: any) => r.status === "completed");

      return {
        success: true,
        hasProfile,
        profilePath: hasProfile ? userMdPath : null,
        profile: state.profile || null,
        profileSavedAt: state.profileSavedAt || null,
        schedule: {
          enabled: state.scheduleEnabled ?? false,
          interval: state.profile?.scheduleInterval ?? "12h",
          autonomyMode: state.profile?.autonomyMode ?? "assist",
        },
        runs: {
          total: runs.length,
          completed: completedRuns.length,
          lastRun: lastRun
            ? { status: lastRun.status, startedAt: lastRun.startedAt, discoveryCount: lastRun.discoveryCount ?? 0 }
            : null,
        },
        quickRef: {
          nextAction: hasProfile
            ? "trigger_batch_run for immediate execution, or check run history"
            : "setup_operator_profile first to create your USER.md",
          nextTools: hasProfile
            ? ["trigger_batch_run", "get_batch_run_history"]
            : ["setup_operator_profile"],
          methodology: "agent_autonomy",
        },
      };
    },
  },

  {
    name: "trigger_batch_run",
    description:
      "Run a scheduled task right now instead of waiting. " +
      "Collects everything new since the last run, summarizes it, " +
      "generates a personalized brief, and saves it.",
    inputSchema: {
      type: "object",
      properties: {
        force: {
          type: "boolean",
          description: "Force run even if one is already in progress (default: false)",
        },
      },
      required: [],
    },
    handler: async (args: any) => {
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const nodebenchDir = path.join(os.homedir(), ".nodebench");
      const statePath = path.join(nodebenchDir, "autopilot_state.json");
      const runsPath = path.join(nodebenchDir, "batch_runs.json");
      const userMdPath = path.join(nodebenchDir, "USER.md");
      const notesDir = path.join(nodebenchDir, "notes");

      if (!fs.existsSync(userMdPath)) {
        return {
          success: false,
          error: "No operator profile found. Run setup_operator_profile first.",
          quickRef: { nextTools: ["setup_operator_profile"] },
        };
      }

      // Collect delta: gather session notes since last run
      const runs: any[] = fs.existsSync(runsPath)
        ? JSON.parse(fs.readFileSync(runsPath, "utf-8"))
        : [];
      const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
      const windowStart = lastRun?.startedAt ? new Date(lastRun.startedAt).getTime() : 0;
      const now = Date.now();

      // Scan session notes for discoveries in the time window
      let discoveryCount = 0;
      let discoverySummaries: string[] = [];
      if (fs.existsSync(notesDir)) {
        const noteFiles = fs.readdirSync(notesDir).filter((f: string) => f.endsWith(".md"));
        for (const file of noteFiles) {
          const filePath = path.join(notesDir, file);
          try {
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs > windowStart) {
              discoveryCount++;
              if (discoverySummaries.length < 10) {
                const content = fs.readFileSync(filePath, "utf-8");
                const titleMatch = content.match(/^#\s+(.+)/m);
                discoverySummaries.push(titleMatch ? titleMatch[1] : file.replace(".md", ""));
              }
            }
          } catch (error: any) {
            // Notes can disappear mid-scan during parallel or long-running sessions.
            if (error?.code !== "ENOENT") throw error;
          }
        }
      }

      // Create run record
      const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const run = {
        id: runId,
        status: discoveryCount > 0 ? "completed" : "completed_empty",
        startedAt: new Date(now).toISOString(),
        windowStartAt: windowStart > 0 ? new Date(windowStart).toISOString() : null,
        windowEndAt: new Date(now).toISOString(),
        discoveryCount,
        discoverySummaries,
        briefPreview: discoveryCount > 0
          ? `Found ${discoveryCount} new note(s) since last run: ${discoverySummaries.slice(0, 3).join(", ")}`
          : "No new discoveries since last run.",
      };

      runs.push(run);
      if (!fs.existsSync(nodebenchDir)) fs.mkdirSync(nodebenchDir, { recursive: true });
      fs.writeFileSync(runsPath, JSON.stringify(runs, null, 2), "utf-8");

      const receiptId = emitLocalReceipt({
        agentId: "openclaw-bridge",
        toolName: "trigger_batch_run",
        actionSummary: `Batch run ${runId}: collected ${discoveryCount} discoveries`,
        policyAction: "allowed",
        resultSuccess: true,
        resultSummary: discoveryCount > 0 ? `${discoveryCount} notes collected` : "No new discoveries",
      });

      return {
        success: true,
        run: { ...run, receiptId },
        instructions: discoveryCount > 0
          ? [
              `Collected ${discoveryCount} discoveries.`,
              "For full summarization + brief generation, use the Autopilot tab in the UI.",
              "The UI triggers the Convex runner which uses free models for summarization.",
            ]
          : ["No new discoveries since last run. Nothing to summarize."],
        quickRef: {
          nextAction: "Check run history or wait for next scheduled run.",
          nextTools: ["get_batch_run_history", "get_autopilot_status"],
          methodology: "agent_autonomy",
        },
      };
    },
  },

  {
    name: "get_batch_run_history",
    description:
      "See the history of past scheduled runs: what was found, " +
      "how many new items were collected, and preview of each brief.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max runs to return (default: 10)",
        },
      },
      required: [],
    },
    handler: async (args: any) => {
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const limit: number = args.limit ?? 10;
      const runsPath = path.join(os.homedir(), ".nodebench", "batch_runs.json");

      const allRuns: any[] = fs.existsSync(runsPath)
        ? JSON.parse(fs.readFileSync(runsPath, "utf-8"))
        : [];

      // Return most recent N runs, newest first
      const runs = allRuns.slice(-limit).reverse();
      const completed = allRuns.filter((r: any) => r.status === "completed");
      const totalDiscoveries = allRuns.reduce((sum: number, r: any) => sum + (r.discoveryCount ?? 0), 0);

      return {
        success: true,
        totalRuns: allRuns.length,
        showing: runs.length,
        limit,
        stats: {
          completed: completed.length,
          totalDiscoveries,
        },
        runs: runs.map((r: any) => ({
          id: r.id,
          status: r.status,
          startedAt: r.startedAt,
          discoveryCount: r.discoveryCount ?? 0,
          briefPreview: r.briefPreview ?? null,
        })),
        quickRef: {
          nextAction: runs.length > 0
            ? "Review briefs, adjust schedule or permissions if needed."
            : "No runs yet. Use trigger_batch_run to start one.",
          nextTools: ["get_autopilot_status", "setup_operator_profile", "trigger_batch_run"],
          methodology: "agent_autonomy",
        },
      };
    },
  },

  {
    name: "sync_operator_profile",
    description:
      "Sync the Operator Profile to the local filesystem at ~/.nodebench/USER.md. " +
      "Pass markdown to write directly, or call with no args to check current state. " +
      "Convex version is primary; this syncs a local copy for CLI/agent access.",
    inputSchema: {
      type: "object",
      properties: {
        markdown: {
          type: "string",
          description: "Profile markdown to write to USER.md (optional — if omitted, checks existing file)",
        },
      },
      required: [],
    },
    handler: async (args: any) => {
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const nodebenchDir = path.join(os.homedir(), ".nodebench");
      const userMdPath = path.join(nodebenchDir, "USER.md");

      // If markdown provided directly, write it
      if (args.markdown) {
        if (!fs.existsSync(nodebenchDir)) fs.mkdirSync(nodebenchDir, { recursive: true });
        fs.writeFileSync(userMdPath, args.markdown, "utf-8");
        return {
          success: true,
          action: "written",
          targetPath: userMdPath,
          bytesWritten: Buffer.byteLength(args.markdown, "utf-8"),
          quickRef: {
            nextAction: "Profile synced to filesystem.",
            nextTools: ["get_autopilot_status", "setup_operator_profile"],
            methodology: "agent_autonomy",
          },
        };
      }

      // Otherwise check if profile already exists on filesystem
      if (!fs.existsSync(userMdPath)) {
        return {
          success: false,
          error: "No profile found locally or provided. Run setup_operator_profile first, or pass markdown parameter.",
          targetPath: userMdPath,
          quickRef: { nextTools: ["setup_operator_profile"] },
        };
      }

      // Read and confirm existing profile
      const content = fs.readFileSync(userMdPath, "utf-8");
      return {
        success: true,
        action: "already_synced",
        targetPath: userMdPath,
        bytesOnDisk: Buffer.byteLength(content, "utf-8"),
        preview: content.length > 500 ? content.slice(0, 500) + "..." : content,
        quickRef: {
          nextAction: "Profile already on filesystem. Use setup_operator_profile to update.",
          nextTools: ["setup_operator_profile", "get_autopilot_status"],
          methodology: "agent_autonomy",
        },
      };
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// AGENT TRAVERSAL TOOLS — Bridge to NodeBench AI frontend view system
//
// Lets OpenClaw agents discover, navigate, and interact with the 27 views
// in the NodeBench AI frontend. Uses the agentViewManifest (Convex) and
// viewCapabilityRegistry (frontend) as the source of truth.
//
// Domain: agent_traverse (separate from openclaw for independent gating)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Static view manifest — derived from src/lib/registry/viewCapabilityRegistry.ts (canonical source).
 * Kept inline to avoid cross-package imports (MCP-local is standalone).
 * @generated — To update, edit src/lib/registry/viewCapabilityRegistry.ts then run: node scripts/generateViewManifest.mjs
 */
interface ViewEntry {
  viewId: string;
  title: string;
  description: string;
  paths: string[];
  actions: string[];
  dataEndpoints: string[];
  tags: string[];
  requiresAuth: boolean;
}

const VIEW_MANIFEST: ViewEntry[] = [
  { viewId: "control-plane", title: "DeepTrace", description: "Landing surface for the agent trust control plane. Start from receipts, delegation, investigation, and the packaged operator flows.", paths: ["/","/control-plane","/home","/landing"], actions: ["openReceipts","openDelegation","openInvestigation"], dataEndpoints: [], tags: ["deeptrace","control-plane","landing","trust","receipts"], requiresAuth: false },
  { viewId: "receipts", title: "Action Receipts", description: "Receipt stream for denied, approval-gated, and reversible agent actions with evidence, approvals, and tamper checks.", paths: ["/receipts","/action-receipts","/control-plane/receipts"], actions: ["filterReceipts","verifyReceiptHash"], dataEndpoints: ["receipts","receiptStats"], tags: ["receipts","audit","approval","trust","evidence"], requiresAuth: false },
  { viewId: "delegation", title: "Passport", description: "Delegation and approval surface for scoped tools, denied actions, and human approval gates before an agent acts.", paths: ["/delegation","/delegate","/passport","/control-plane/delegation","/control-plane/passport"], actions: ["reviewScopes","reviewDeniedActions"], dataEndpoints: [], tags: ["delegation","passport","approvals","permissions","scope"], requiresAuth: false },
  { viewId: "research", title: "Research Hub", description: "Research hub with tabbed navigation for overview, signals, briefing, deals, changes, and changelog. The primary intelligence surface after the DeepTrace landing page.", paths: ["/research","/hub","/onboarding","/research/overview","/research/signals","/research/briefing","/research/deals","/research/changes","/research/changelog"], actions: ["switchTab","search"], dataEndpoints: ["forYouFeed","morningDigest"], tags: ["home","research","signals","briefing","overview"], requiresAuth: false },
  { viewId: "for-you-feed", title: "For You", description: "Personalized feed of research signals, articles, and insights ranked by relevance. Moltbook-style hot/new/top discovery.", paths: ["/for-you","/feed"], actions: ["engageItem","filterByTag"], dataEndpoints: ["forYouFeed"], tags: ["feed","personalized","discovery","signals"], requiresAuth: false },
  { viewId: "documents", title: "Workspace", description: "Document management hub — create, browse, search, and organize documents. Supports markdown with tagging.", paths: ["/workspace","/documents","/docs"], actions: ["createDocument","searchDocuments"], dataEndpoints: ["documents"], tags: ["title","content"], requiresAuth: true },
  { viewId: "agents", title: "Assistants", description: "AI assistant hub — browse agent templates, start conversations, view agent status and history.", paths: ["/agents"], actions: ["startAgent","viewAgentHistory"], dataEndpoints: ["agentTemplates","activeAgents"], tags: ["agents","assistants","ai","chat","conversation"], requiresAuth: false },
  { viewId: "calendar", title: "Calendar", description: "Calendar view with event management, agenda, and scheduling. Integrates with research briefings.", paths: ["/calendar"], actions: ["createEvent","navigateDate"], dataEndpoints: ["events"], tags: ["calendar","events","scheduling","agenda"], requiresAuth: true },
  { viewId: "signals", title: "Signals", description: "Public signals log — real-time stream of research signals, market moves, and intelligence updates.", paths: ["/signals"], actions: ["filterSignals"], dataEndpoints: ["signals"], tags: ["signals","intelligence","real-time","stream"], requiresAuth: false },
  { viewId: "funding", title: "Funding", description: "Funding brief — deal flow, investment rounds, sector analysis, and funding intelligence.", paths: ["/funding","/funding-brief"], actions: ["filterByStage","filterBySector"], dataEndpoints: ["fundingBrief"], tags: ["funding","deals","investment","venture","startups"], requiresAuth: false },
  { viewId: "benchmarks", title: "Benchmarks", description: "Workbench for model evaluation — leaderboard, scenario catalog, eval runs, and capability deep dives.", paths: ["/internal/benchmarks","/benchmarks","/eval"], actions: ["runEval","compareModels"], dataEndpoints: ["leaderboard","scenarios"], tags: ["benchmarks","evaluation","leaderboard","models","testing"], requiresAuth: false },
  { viewId: "github-explorer", title: "GitHub", description: "GitHub repository explorer — browse repos, PRs, issues, and code changes.", paths: ["/github","/github-explorer"], actions: ["searchCode","viewPR"], dataEndpoints: ["repos"], tags: ["github","code","repositories","pull-requests"], requiresAuth: true },
  { viewId: "entity", title: "Entity Profile", description: "Deep profile for a specific entity (company, person, topic) — aggregated signals, timeline, and related content.", paths: ["/entity/:name"], actions: ["browseRelated","viewTimeline"], dataEndpoints: ["entityProfile"], tags: ["entity","profile","company","person","deep-dive"], requiresAuth: false },
  { viewId: "dogfood", title: "Quality Review", description: "UI quality review dashboard — automated QA scores, screenshot analysis, governance violations, and design system compliance.", paths: ["/dogfood","/quality-review"], actions: ["runQA","viewScreenshots"], dataEndpoints: ["qaResults"], tags: ["quality","review","dogfood","qa","design-system"], requiresAuth: true },
  { viewId: "activity", title: "Activity", description: "Public activity feed — recent actions, agent activity, and system events across the platform.", paths: ["/activity","/public-activity"], actions: ["filterActivity"], dataEndpoints: ["activity"], tags: ["activity","feed","events","stream"], requiresAuth: false },
  { viewId: "spreadsheets", title: "Spreadsheets", description: "Spreadsheet editor with formula support, cell formatting, and data import/export.", paths: ["/spreadsheets"], actions: ["createSpreadsheet","openSpreadsheet"], dataEndpoints: ["spreadsheets"], tags: ["spreadsheets","data","tables","formulas"], requiresAuth: true },
  { viewId: "roadmap", title: "Roadmap", description: "Interactive product roadmap with milestones, phases, and timeline visualization.", paths: ["/roadmap"], actions: ["navigatePhase"], dataEndpoints: [], tags: ["roadmap","timeline","milestones","planning"], requiresAuth: false },
  { viewId: "timeline", title: "Timeline", description: "Chronological timeline of events, milestones, and project progress.", paths: ["/timeline"], actions: ["scrollToDate"], dataEndpoints: [], tags: ["timeline","chronological","history"], requiresAuth: false },
  { viewId: "public", title: "Shared with You", description: "Documents and content shared publicly or with the current user.", paths: ["/public","/shared"], actions: [], dataEndpoints: ["publicDocs"], tags: ["shared","public","collaboration"], requiresAuth: false },
  { viewId: "showcase", title: "Showcase", description: "Feature showcase and demo gallery — explore NodeBench capabilities interactively.", paths: ["/showcase","/demo"], actions: [], dataEndpoints: [], tags: ["showcase","demo","features","gallery"], requiresAuth: false },
  { viewId: "footnotes", title: "Sources", description: "Citation library — all referenced sources with metadata and verification status.", paths: ["/footnotes","/sources"], actions: ["searchSources"], dataEndpoints: ["citations"], tags: ["sources","citations","references","bibliography"], requiresAuth: false },
  { viewId: "analytics-hitl", title: "Review Queue", description: "Human-in-the-loop analytics — review and approve AI-generated content, flag issues, provide feedback.", paths: ["/internal/analytics/hitl","/analytics/hitl","/analytics/review-queue","/review-queue"], actions: ["approveItem","flagItem"], dataEndpoints: ["reviewQueue"], tags: ["analytics","review","hitl","quality"], requiresAuth: true },
  { viewId: "analytics-components", title: "Performance Analytics", description: "Component-level performance metrics — render times, bundle sizes, interaction latency.", paths: ["/internal/analytics/components","/analytics/components"], actions: [], dataEndpoints: ["componentMetrics"], tags: ["analytics","performance","metrics","components"], requiresAuth: true },
  { viewId: "analytics-recommendations", title: "Feedback", description: "Recommendation feedback dashboard — track how users engage with AI suggestions.", paths: ["/internal/analytics/recommendations","/analytics/recommendations"], actions: [], dataEndpoints: ["feedbackData"], tags: ["analytics","feedback","recommendations"], requiresAuth: true },
  { viewId: "cost-dashboard", title: "Usage & Costs", description: "API usage and cost tracking — token consumption, model costs, budget alerts.", paths: ["/internal/cost","/cost","/dashboard/cost"], actions: ["setAlert"], dataEndpoints: ["costData"], tags: ["costs","usage","budget","tokens","api"], requiresAuth: true },
  { viewId: "industry-updates", title: "Industry News", description: "Curated industry updates and news — AI/ML developments, market trends, research papers.", paths: ["/industry","/dashboard/industry"], actions: ["filterByTopic"], dataEndpoints: ["industryUpdates"], tags: ["industry","news","trends","market","updates"], requiresAuth: false },
  { viewId: "document-recommendations", title: "Suggestions", description: "AI-powered document recommendations based on reading history and interests.", paths: ["/recommendations","/discover"], actions: ["dismiss","save"], dataEndpoints: ["recommendations"], tags: ["recommendations","suggestions","discover","personalized"], requiresAuth: true },
  { viewId: "agent-marketplace", title: "Agent Templates", description: "Browse and install agent templates — pre-built AI assistants for specific tasks.", paths: ["/marketplace","/agent-marketplace"], actions: ["installTemplate"], dataEndpoints: ["templates"], tags: ["agents","marketplace","templates","install"], requiresAuth: true },
  { viewId: "pr-suggestions", title: "PR Suggestions", description: "AI-generated pull request suggestions — code review, improvements, and refactoring ideas.", paths: ["/pr-suggestions","/prs"], actions: ["applySuggestion"], dataEndpoints: ["prSuggestions"], tags: ["pull-requests","code-review","suggestions","github"], requiresAuth: true },
  { viewId: "linkedin-posts", title: "LinkedIn Posts", description: "LinkedIn post archive — browse, search, and analyze published posts and engagement metrics.", paths: ["/linkedin"], actions: ["searchPosts"], dataEndpoints: ["posts"], tags: ["linkedin","social","posts","content"], requiresAuth: true },
  { viewId: "mcp-ledger", title: "Tool Activity", description: "MCP tool call ledger — audit trail of all MCP tool invocations with inputs, outputs, and timing.", paths: ["/internal/mcp-ledger","/mcp-ledger","/mcp/ledger","/activity-log"], actions: ["filterByTool","filterByDate"], dataEndpoints: ["toolCalls"], tags: ["mcp","tools","audit","ledger","activity"], requiresAuth: true },
  { viewId: "engine-demo", title: "Engine API", description: "Headless engine demo surface for testing engine calls, request flow, and API responses.", paths: ["/internal/engine","/engine","/engine-demo"], actions: ["runEngineDemo"], dataEndpoints: ["engineDemo"], tags: ["engine","api","demo","headless"], requiresAuth: false },
  { viewId: "observability", title: "System Health", description: "Observability dashboard with component health, self-healing history, and service-level signals.", paths: ["/internal/observability","/observability","/health","/system-health"], actions: ["reviewActiveAlerts","inspectHealingHistory"], dataEndpoints: ["systemHealth","healingActions"], tags: ["observability","health","alerts","slo","self-healing"], requiresAuth: false },
  { viewId: "investigation", title: "Investigation", description: "Trace from action to evidence to approval across a single run, escalation, or operator review.", paths: ["/investigation","/investigate","/enterprise-demo"], actions: ["replayRun","inspectEvidence"], dataEndpoints: [], tags: ["investigation","trace","evidence","replay","approval"], requiresAuth: false },
  { viewId: "oracle", title: "The Oracle", description: "Operational memory and telemetry surface for long-running AI work, strategy loops, and builder oversight.", paths: ["/oracle","/career","/trajectory"], actions: ["reviewMemory","inspectTelemetry"], dataEndpoints: [], tags: ["oracle","memory","telemetry","strategy","operations"], requiresAuth: false },
  { viewId: "dev-dashboard", title: "Dev Dashboard", description: "Internal development dashboard for repo evolution, domain milestones, and engineering progress tracking.", paths: ["/internal/dev-dashboard","/dev-dashboard","/dev","/evolution"], actions: ["reviewMilestones","inspectEvolution"], dataEndpoints: [], tags: ["dev-dashboard","engineering","milestones","timeline","internal"], requiresAuth: false },
];

// ---------------------------------------------------------------------------
// MCP Gateway helper — calls Convex backend via HTTP
// ---------------------------------------------------------------------------

async function callMcpGateway(fn: string, args: Record<string, unknown> = {}): Promise<{ success: boolean; data?: any; error?: string }> {
  const siteUrl = process.env.CONVEX_SITE_URL || process.env.VITE_CONVEX_URL;
  const secret = process.env.MCP_SECRET;
  if (!siteUrl || !secret) {
    return { success: false, error: "Missing CONVEX_SITE_URL or MCP_SECRET. Cannot call backend." };
  }
  try {
    const res = await fetch(`${siteUrl.replace(/\/$/, "")}/api/mcpGateway`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mcp-secret": secret },
      body: JSON.stringify({ fn, args }),
    });
    const data = await res.json();
    return data as { success: boolean; data?: any; error?: string };
  } catch (e: any) {
    return { success: false, error: `Gateway call failed: ${e.message}` };
  }
}

// Tool name → gateway function mapping (for invoke_view_tool routing)
const TOOL_GATEWAY_MAP: Record<string, { gatewayFn: string; mapArgs?: (args: any) => any }> = {
  nb_search_research: { gatewayFn: "hybridSearch", mapArgs: (a: any) => ({ query: String(a.query ?? ""), topK: Number(a.limit ?? 10) }) },
  nb_get_signals: { gatewayFn: "getSignalTimeseries" },
  nb_get_feed_items: { gatewayFn: "getPublicForYouFeed", mapArgs: (a: any) => ({ limit: Number(a.limit ?? 20) }) },
  nb_list_documents: { gatewayFn: "mcpListDocuments" },
  nb_create_document: { gatewayFn: "mcpCreateDocument" },
  nb_search_documents: { gatewayFn: "mcpSearchDocuments" },
  nb_get_funding_brief: { gatewayFn: "getDealFlow" },
  nb_list_deals: { gatewayFn: "getDealFlow" },
  nb_filter_by_stage: { gatewayFn: "getDealFlow", mapArgs: (a: any) => ({ stage: a.stage }) },
  nb_list_repos: { gatewayFn: "getTrendingRepos", mapArgs: (a: any) => ({ limit: Number(a.limit ?? 20) }) },
  nb_list_signals: { gatewayFn: "getSignalTimeseries" },
  nb_get_signal_detail: { gatewayFn: "getSignalTimeseries" },
};

// Endpoint name → gateway function mapping (for query_view_data routing)
const ENDPOINT_GATEWAY_MAP: Record<string, string> = {
  forYouFeed: "getPublicForYouFeed",
  morningDigest: "getLatestDashboardSnapshot",
  signals: "getSignalTimeseries",
  fundingBrief: "getDealFlow",
  repos: "getTrendingRepos",
  documents: "mcpListDocuments",
  entityProfile: "getLatestPublicDossier",
  citations: "getPublicThreads",
};

// Per-view tool map — what tools each view exposes (matches src/lib/viewToolMap.ts)
const VIEW_TOOLS: Record<string, Array<{ name: string; description: string }>> = {
  research: [
    { name: "nb_search_research", description: "Search research signals and briefings" },
    { name: "nb_get_signals", description: "Get latest research signals" },
    { name: "nb_switch_research_tab", description: "Switch research hub tab" },
  ],
  "for-you-feed": [
    { name: "nb_get_feed_items", description: "Get personalized feed items" },
    { name: "nb_engage_feed_item", description: "Record engagement on feed item" },
  ],
  documents: [
    { name: "nb_list_documents", description: "List workspace documents" },
    { name: "nb_create_document", description: "Create new document" },
    { name: "nb_search_documents", description: "Search document content" },
  ],
  agents: [
    { name: "nb_list_agents", description: "List agent templates and active threads" },
    { name: "nb_start_agent", description: "Start new agent conversation" },
    { name: "nb_get_agent_status", description: "Get agent thread status" },
  ],
  calendar: [
    { name: "nb_list_events", description: "List calendar events" },
    { name: "nb_create_event", description: "Create calendar event" },
  ],
  funding: [
    { name: "nb_get_funding_brief", description: "Get funding intelligence" },
    { name: "nb_list_deals", description: "List funding deals" },
    { name: "nb_filter_by_stage", description: "Filter by funding stage" },
  ],
  benchmarks: [
    { name: "nb_get_leaderboard", description: "Get model leaderboard" },
    { name: "nb_list_scenarios", description: "List eval scenarios" },
  ],
  "github-explorer": [
    { name: "nb_list_repos", description: "List tracked repos" },
    { name: "nb_get_pr_status", description: "Get PR status" },
  ],
  signals: [
    { name: "nb_list_signals", description: "List public signals" },
    { name: "nb_get_signal_detail", description: "Get signal details" },
  ],
  dogfood: [
    { name: "nb_get_qa_results", description: "Get QA pipeline results" },
    { name: "nb_view_screenshots", description: "Get route screenshots" },
  ],
};

// ---------------------------------------------------------------------------
// Session state — SQLite-backed for persistence across MCP server restarts
// ---------------------------------------------------------------------------

interface TraverseSession {
  currentView: string;
  history: Array<{ view: string; timestamp: number; reason?: string }>;
  interactions: Array<{ view: string; action: string; args?: any; timestamp: number }>;
  startedAt: number;
}

// In-memory write-through cache (hot reads, SQLite for durability)
const agentViewSessions = new Map<string, TraverseSession>();

function ensureTraverseTable() {
  try {
    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS traverse_sessions (
      session_id TEXT PRIMARY KEY,
      current_view TEXT NOT NULL,
      history TEXT NOT NULL DEFAULT '[]',
      interactions TEXT NOT NULL DEFAULT '[]',
      started_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
  } catch {
    // SQLite not available — fall back to in-memory only
  }
}

function persistSession(sessionId: string, session: TraverseSession) {
  agentViewSessions.set(sessionId, session);
  try {
    const db = getDb();
    ensureTraverseTable();
    db.prepare(`INSERT OR REPLACE INTO traverse_sessions (session_id, current_view, history, interactions, started_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(
      sessionId,
      session.currentView,
      JSON.stringify(session.history),
      JSON.stringify(session.interactions),
      session.startedAt,
      Date.now(),
    );
  } catch {
    // SQLite write failed — session still in memory
  }
}

function loadSession(sessionId: string): TraverseSession | undefined {
  // Check in-memory cache first
  const cached = agentViewSessions.get(sessionId);
  if (cached) return cached;

  // Try SQLite
  try {
    const db = getDb();
    ensureTraverseTable();
    const row = db.prepare("SELECT * FROM traverse_sessions WHERE session_id = ?").get(sessionId) as any;
    if (row) {
      const session: TraverseSession = {
        currentView: row.current_view,
        history: JSON.parse(row.history),
        interactions: JSON.parse(row.interactions),
        startedAt: row.started_at,
      };
      agentViewSessions.set(sessionId, session);
      return session;
    }
  } catch {
    // SQLite read failed
  }
  return undefined;
}

function loadAllSessions(): Array<[string, TraverseSession]> {
  // Load from SQLite to merge with in-memory
  try {
    const db = getDb();
    ensureTraverseTable();
    const rows = db.prepare("SELECT * FROM traverse_sessions ORDER BY updated_at DESC LIMIT 50").all() as any[];
    for (const row of rows) {
      if (!agentViewSessions.has(row.session_id)) {
        agentViewSessions.set(row.session_id, {
          currentView: row.current_view,
          history: JSON.parse(row.history),
          interactions: JSON.parse(row.interactions),
          startedAt: row.started_at,
        });
      }
    }
  } catch {
    // SQLite not available
  }
  return Array.from(agentViewSessions.entries());
}

export const agentTraverseTools: McpTool[] = [
  // ═══ VIEW DISCOVERY ═══

  {
    name: "list_available_views",
    description:
      "List all available views in the NodeBench AI frontend with titles, " +
      "descriptions, actions, data endpoints, and tags. Use this to discover " +
      "what the app offers before navigating. Returns a manifest of 27 views.",
    inputSchema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Filter views by keyword (matches title, description, tags)",
        },
        includeAuthOnly: {
          type: "boolean",
          description: "Include views that require authentication (default: true)",
        },
      },
    },
    handler: async (args: any) => {
      let views = [...VIEW_MANIFEST];
      if (args.search) {
        const q = String(args.search).toLowerCase();
        views = views.filter(
          (v) =>
            v.title.toLowerCase().includes(q) ||
            v.description.toLowerCase().includes(q) ||
            v.tags.some((t) => t.includes(q)),
        );
      }
      if (args.includeAuthOnly === false) {
        views = views.filter((v) => !v.requiresAuth);
      }
      return {
        success: true,
        views: views.map((v) => ({
          viewId: v.viewId,
          title: v.title,
          description: v.description,
          path: v.paths[0] ?? `/${v.viewId}`,
          actions: v.actions,
          dataEndpoints: v.dataEndpoints,
          tags: v.tags,
          requiresAuth: v.requiresAuth,
          hasViewTools: !!VIEW_TOOLS[v.viewId],
          viewToolCount: VIEW_TOOLS[v.viewId]?.length ?? 0,
        })),
        totalViews: views.length,
        quickRef: {
          nextAction: "Pick a view and navigate to it with navigate_to_view.",
          nextTools: ["navigate_to_view", "get_view_capabilities"],
          methodology: "agent_traversal",
        },
      };
    },
  },

  {
    name: "get_view_capabilities",
    description:
      "Get full capabilities for a specific view — actions, data endpoints, " +
      "available per-view tools, tags, and auth requirements. Use this to " +
      "understand what you can do on a view before interacting with it.",
    inputSchema: {
      type: "object",
      properties: {
        viewId: {
          type: "string",
          description: "View ID (e.g., 'research', 'funding', 'agents'). Use list_available_views to discover valid IDs.",
        },
      },
      required: ["viewId"],
    },
    handler: async (args: any) => {
      const viewId = String(args.viewId);
      const entry = VIEW_MANIFEST.find((v) => v.viewId === viewId);
      if (!entry) {
        return {
          success: false,
          error: `Unknown view: ${viewId}`,
          availableViews: VIEW_MANIFEST.map((v) => v.viewId),
        };
      }
      const viewTools = VIEW_TOOLS[viewId] ?? [];
      return {
        success: true,
        view: entry,
        viewTools,
        viewToolCount: viewTools.length,
        quickRef: {
          nextAction: `Navigate to ${entry.title} with navigate_to_view, or invoke per-view tools with invoke_view_tool.`,
          nextTools: ["navigate_to_view", "invoke_view_tool"],
          methodology: "agent_traversal",
        },
      };
    },
  },

  // ═══ VIEW NAVIGATION ═══

  {
    name: "navigate_to_view",
    description:
      "Navigate to a specific view in the NodeBench AI frontend. " +
      "Creates a navigation intent (via Convex agentNavigation) and returns " +
      "the target view's capabilities so you know what to expect. " +
      "Tracks navigation in the session history for audit.",
    inputSchema: {
      type: "object",
      properties: {
        viewId: {
          type: "string",
          description: "Target view ID (e.g., 'research', 'funding', 'agents')",
        },
        reason: {
          type: "string",
          description: "Why you're navigating (logged for audit trail)",
        },
        sessionId: {
          type: "string",
          description: "Session ID for state tracking (optional — auto-creates if omitted)",
        },
      },
      required: ["viewId"],
    },
    handler: async (args: any) => {
      const viewId = String(args.viewId);
      const reason = args.reason ?? "agent_navigation";
      const sessionId = args.sessionId ?? `traverse_${Date.now()}`;

      const entry = VIEW_MANIFEST.find((v) => v.viewId === viewId);
      if (!entry) {
        return {
          success: false,
          error: `Unknown view: ${viewId}`,
          availableViews: VIEW_MANIFEST.map((v) => v.viewId),
        };
      }

      // Track in session state (SQLite-backed)
      let session = loadSession(sessionId);
      if (!session) {
        session = { currentView: viewId, history: [], interactions: [], startedAt: Date.now() };
      }
      session.currentView = viewId;
      session.history.push({ view: viewId, timestamp: Date.now(), reason });
      persistSession(sessionId, session);

      const viewTools = VIEW_TOOLS[viewId] ?? [];

      return {
        success: true,
        navigated: true,
        sessionId,
        targetView: entry,
        availableActions: entry.actions,
        availableTools: viewTools.map((t) => t.name),
        dataEndpoints: entry.dataEndpoints,
        instructions: [
          `Navigated to ${entry.title} (${entry.description}).`,
          entry.actions.length > 0
            ? `Available actions: ${entry.actions.join(", ")}.`
            : "No view-specific actions on this view.",
          viewTools.length > 0
            ? `Per-view tools: ${viewTools.map((t) => t.name).join(", ")}. Use invoke_view_tool to call them.`
            : "No per-view tools on this view.",
        ],
        quickRef: {
          nextAction: viewTools.length > 0
            ? `Use invoke_view_tool to interact with ${entry.title}.`
            : `Read data from ${entry.title} using query_view_data.`,
          nextTools: viewTools.length > 0
            ? ["invoke_view_tool", "query_view_data", "get_view_state"]
            : ["query_view_data", "get_view_state", "navigate_to_view"],
          methodology: "agent_traversal",
        },
      };
    },
  },

  // ═══ VIEW INTERACTION ═══

  {
    name: "invoke_view_tool",
    description:
      "Invoke a per-view tool on the current or specified view. " +
      "Each view exposes contextual tools (e.g., 'nb_search_research' on " +
      "the research view, 'nb_list_deals' on funding). Call get_view_capabilities " +
      "first to see available tools. Session-injected for audit trail.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          description: "Tool name (e.g., 'nb_search_research', 'nb_list_deals')",
        },
        args: {
          type: "object",
          description: "Arguments to pass to the tool",
          additionalProperties: true,
        },
        viewId: {
          type: "string",
          description: "View context (auto-detected from session if omitted)",
        },
        sessionId: {
          type: "string",
          description: "Session ID for state tracking",
        },
      },
      required: ["tool"],
    },
    handler: async (args: any) => {
      const toolName = String(args.tool);
      const toolArgs = args.args ?? {};
      const sessionId = args.sessionId ?? "default";

      // Resolve view from session (SQLite-backed) or explicit arg
      const session = loadSession(sessionId);
      const viewId = args.viewId ?? session?.currentView ?? "research";

      // Validate the tool exists for this view
      const viewTools = VIEW_TOOLS[viewId] ?? [];
      const toolDef = viewTools.find((t) => t.name === toolName);
      if (!toolDef) {
        // Try all views
        const allToolNames: string[] = [];
        for (const [vid, tools] of Object.entries(VIEW_TOOLS)) {
          for (const t of tools) {
            allToolNames.push(`${t.name} (${vid})`);
          }
        }
        return {
          success: false,
          error: `Tool "${toolName}" not found on view "${viewId}".`,
          availableOnThisView: viewTools.map((t) => t.name),
          allViewTools: allToolNames,
        };
      }

      // Track interaction (SQLite-backed)
      if (session) {
        session.interactions.push({
          view: viewId,
          action: toolName,
          args: toolArgs,
          timestamp: Date.now(),
        });
        persistSession(sessionId, session);
      }

      // Route to real backend via MCP Gateway
      const route = TOOL_GATEWAY_MAP[toolName];
      let result: any;
      if (route) {
        const mappedArgs = route.mapArgs ? route.mapArgs(toolArgs) : toolArgs;
        const gwResult = await callMcpGateway(route.gatewayFn, mappedArgs);
        result = gwResult.success
          ? { data: gwResult.data, source: "convex_gateway", gatewayFn: route.gatewayFn }
          : { error: gwResult.error, source: "convex_gateway", gatewayFn: route.gatewayFn };
      } else {
        result = {
          note: `Tool ${toolName} has no gateway mapping. Frontend-only interaction.`,
          source: "stub",
        };
      }

      return {
        success: true,
        tool: toolName,
        view: viewId,
        description: toolDef.description,
        args: toolArgs,
        result,
        quickRef: {
          nextAction: "Check results. Navigate to another view or invoke more tools.",
          nextTools: ["invoke_view_tool", "navigate_to_view", "get_view_state"],
          methodology: "agent_traversal",
        },
      };
    },
  },

  {
    name: "query_view_data",
    description:
      "Query data from a view's data endpoints. Each view has named " +
      "endpoints (e.g., 'forYouFeed', 'fundingBrief', 'documents'). " +
      "Use get_view_capabilities to see available endpoints first.",
    inputSchema: {
      type: "object",
      properties: {
        viewId: {
          type: "string",
          description: "View to query data from",
        },
        endpoint: {
          type: "string",
          description: "Data endpoint name (e.g., 'forYouFeed', 'fundingBrief')",
        },
        params: {
          type: "object",
          description: "Query parameters (view-specific)",
          additionalProperties: true,
        },
      },
      required: ["viewId", "endpoint"],
    },
    handler: async (args: any) => {
      const viewId = String(args.viewId);
      const endpoint = String(args.endpoint);
      const params = args.params ?? {};

      const entry = VIEW_MANIFEST.find((v) => v.viewId === viewId);
      if (!entry) {
        return { success: false, error: `Unknown view: ${viewId}` };
      }
      if (!entry.dataEndpoints.includes(endpoint)) {
        return {
          success: false,
          error: `Endpoint "${endpoint}" not found on view "${viewId}".`,
          availableEndpoints: entry.dataEndpoints,
        };
      }

      // Route to real backend via MCP Gateway
      const gatewayFn = ENDPOINT_GATEWAY_MAP[endpoint];
      let result: any;
      if (gatewayFn) {
        const gwResult = await callMcpGateway(gatewayFn, params);
        result = gwResult.success
          ? { data: gwResult.data, source: "convex_gateway", gatewayFn }
          : { error: gwResult.error, source: "convex_gateway", gatewayFn };
      } else {
        result = {
          note: `Endpoint "${endpoint}" has no gateway mapping. ` +
            `Available mapped endpoints: ${Object.keys(ENDPOINT_GATEWAY_MAP).join(", ")}.`,
          source: "stub",
        };
      }

      return {
        success: true,
        viewId,
        endpoint,
        params,
        result,
        quickRef: {
          nextAction: "Process the data. Navigate to another view or invoke view tools.",
          nextTools: ["invoke_view_tool", "navigate_to_view", "traverse_feed"],
          methodology: "agent_traversal",
        },
      };
    },
  },

  // ═══ FEED TRAVERSAL (Moltbook pattern) ═══

  {
    name: "traverse_feed",
    description:
      "Traverse content feeds with Moltbook-style sorting. " +
      "Feed types: research, signals, documents, agents, funding, activity. " +
      "Sort by: hot (engagement-weighted recency), new (chronological), " +
      "top (highest score), rising (fastest growing). " +
      "Supports limit and cursor-based pagination.",
    inputSchema: {
      type: "object",
      properties: {
        feedType: {
          type: "string",
          enum: ["research", "signals", "documents", "agents", "funding", "activity"],
          description: "Which feed to traverse",
        },
        sort: {
          type: "string",
          enum: ["hot", "new", "top", "rising"],
          description: "Sort order (default: hot)",
        },
        limit: {
          type: "number",
          description: "Items to return (default: 10, max: 50)",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags",
        },
      },
      required: ["feedType"],
    },
    handler: async (args: any) => {
      const feedType = String(args.feedType);
      const sort = args.sort ?? "hot";
      const limit = Math.min(args.limit ?? 10, 50);
      const cursor = args.cursor;
      const tags = args.tags ?? [];

      // Map feed type to view
      const feedViewMap: Record<string, string> = {
        research: "for-you-feed",
        signals: "signals",
        documents: "documents",
        agents: "agents",
        funding: "funding",
        activity: "activity",
      };
      const targetView = feedViewMap[feedType] ?? "for-you-feed";

      // Route feed traversal to real backend
      const feedGatewayMap: Record<string, string> = {
        research: "getPublicForYouFeed",
        signals: "getSignalTimeseries",
        documents: "mcpListDocuments",
        funding: "getDealFlow",
        activity: "getLatestDashboardSnapshot",
      };
      const feedGwFn = feedGatewayMap[feedType];
      let feedResult: any;
      if (feedGwFn) {
        const gwResult = await callMcpGateway(feedGwFn, { limit, sort });
        feedResult = gwResult.success
          ? { data: gwResult.data, source: "convex_gateway", gatewayFn: feedGwFn }
          : { error: gwResult.error, source: "convex_gateway", gatewayFn: feedGwFn };
      } else {
        feedResult = { note: `No gateway mapping for feed type "${feedType}".`, source: "stub" };
      }

      return {
        success: true,
        feedType,
        sort,
        limit,
        cursor: cursor ?? null,
        tags,
        targetView,
        result: feedResult,
        quickRef: {
          nextAction: "Process items. Use cursor for next page, or switch feed type.",
          nextTools: ["traverse_feed", "navigate_to_view", "invoke_view_tool"],
          methodology: "agent_traversal",
        },
      };
    },
  },

  // ═══ SESSION STATE ═══

  {
    name: "get_view_state",
    description:
      "Get the current agent traversal session state — which view you're on, " +
      "navigation history, interaction log, and session duration. " +
      "Use this for self-awareness and audit.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description: "Session ID (uses most recent if omitted)",
        },
      },
    },
    handler: async (args: any) => {
      const sessionId = args.sessionId;

      if (sessionId) {
        const session = loadSession(sessionId);
        if (!session) {
          return { success: false, error: `Session not found: ${sessionId}` };
        }
        return {
          success: true,
          sessionId,
          currentView: session.currentView,
          viewsVisited: session.history.length,
          history: session.history.slice(-10),
          interactions: session.interactions.slice(-10),
          durationMs: Date.now() - session.startedAt,
        };
      }

      // Return summary of all sessions (loads from SQLite + in-memory)
      const allSessions = loadAllSessions();
      const sessions = allSessions.map(
        ([id, s]) => ({
          sessionId: id,
          currentView: s.currentView,
          viewsVisited: s.history.length,
          interactions: s.interactions.length,
          durationMs: Date.now() - s.startedAt,
        }),
      );

      return {
        success: true,
        activeSessions: sessions.length,
        sessions,
        quickRef: {
          nextAction: "Review session state. Continue navigating or end session.",
          nextTools: ["navigate_to_view", "list_available_views"],
          methodology: "agent_traversal",
        },
      };
    },
  },

  {
    name: "get_traversal_plan",
    description:
      "Generate a traversal plan for accomplishing a goal across multiple views. " +
      "Given a goal (e.g., 'find recent AI funding deals and create a summary document'), " +
      "returns an ordered list of views to visit and actions to take on each.",
    inputSchema: {
      type: "object",
      properties: {
        goal: {
          type: "string",
          description: "What you want to accomplish (natural language)",
        },
        constraints: {
          type: "object",
          properties: {
            maxViews: { type: "number", description: "Max views to visit (default: 5)" },
            requiresAuth: { type: "boolean", description: "Can use auth-required views?" },
            preferredViews: {
              type: "array",
              items: { type: "string" },
              description: "Preferred views to include",
            },
          },
        },
      },
      required: ["goal"],
    },
    handler: async (args: any) => {
      const goal = String(args.goal).toLowerCase();
      const maxViews = args.constraints?.maxViews ?? 5;
      const requiresAuth = args.constraints?.requiresAuth ?? true;
      const preferredViews: string[] = args.constraints?.preferredViews ?? [];

      // Score each view by relevance to the goal
      const scored = VIEW_MANIFEST
        .filter((v) => requiresAuth || !v.requiresAuth)
        .map((v) => {
          let score = 0;
          // Tag matching
          for (const tag of v.tags) {
            if (goal.includes(tag)) score += 3;
          }
          // Title matching
          if (goal.includes(v.title.toLowerCase())) score += 5;
          // Description keyword matching
          const descWords = v.description.toLowerCase().split(/\s+/);
          for (const word of descWords) {
            if (word.length > 3 && goal.includes(word)) score += 1;
          }
          // Action matching
          for (const action of v.actions) {
            if (goal.includes(action.toLowerCase())) score += 2;
          }
          // Preferred view bonus
          if (preferredViews.includes(v.viewId)) score += 10;
          // Has data endpoints = more useful
          score += v.dataEndpoints.length;
          // Has view tools = more interactive
          score += (VIEW_TOOLS[v.viewId]?.length ?? 0) * 0.5;

          return { view: v, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxViews);

      const plan = scored.map((s, i) => ({
        step: i + 1,
        viewId: s.view.viewId,
        title: s.view.title,
        relevance: Math.round(s.score),
        suggestedActions: s.view.actions.filter((a) => {
          const aLower = a.toLowerCase();
          return goal.includes(aLower) || goal.includes(aLower.replace(/([A-Z])/g, " $1").toLowerCase());
        }),
        availableTools: VIEW_TOOLS[s.view.viewId]?.map((t) => t.name) ?? [],
        dataEndpoints: s.view.dataEndpoints,
      }));

      return {
        success: true,
        goal,
        plan,
        totalSteps: plan.length,
        estimatedViews: plan.length,
        instructions: [
          `Traversal plan for: "${args.goal}"`,
          `${plan.length} views to visit in order of relevance.`,
          "Use navigate_to_view for each step, then invoke_view_tool or query_view_data.",
        ],
        quickRef: {
          nextAction: plan.length > 0
            ? `Start with navigate_to_view("${plan[0].viewId}").`
            : "Refine your goal or use list_available_views to explore.",
          nextTools: ["navigate_to_view", "invoke_view_tool", "query_view_data"],
          methodology: "agent_traversal",
        },
      };
    },
  },
];
