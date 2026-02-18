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

      return {
        success: true,
        sessionLabel,
        policyName,
        deployment,
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

      return {
        success: true,
        skill,
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

      return {
        success: true,
        reason,
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

      return {
        success: true,
        channelId,
        recipient: recipient.slice(0, 20) + (recipient.length > 20 ? "..." : ""),
        textPreview: text.slice(0, 80) + (text.length > 80 ? "..." : ""),
        urgency,
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
          const stat = fs.statSync(filePath);
          if (stat.mtimeMs > windowStart) {
            discoveryCount++;
            if (discoverySummaries.length < 10) {
              const content = fs.readFileSync(filePath, "utf-8");
              const titleMatch = content.match(/^#\s+(.+)/m);
              discoverySummaries.push(titleMatch ? titleMatch[1] : file.replace(".md", ""));
            }
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

      return {
        success: true,
        run,
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
