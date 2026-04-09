/**
 * FounderConnectHome — Canonical "Connect" surface.
 *
 * Matches Ask/Library pattern: centered headline, subtitle, then content.
 * No hero cards, no section labels, no nested tab components.
 */

import { useState, useEffect } from "react";
import { Terminal, Eye, Bot, Copy, Check, ChevronRight, MessageSquareCode } from "lucide-react";
import { useDataSource } from "@/lib/hooks/useDataSource";
import { DataSourceBanner } from "@/shared/components/DataSourceBanner";
import { cn } from "@/lib/utils";

const MCP_INSTALL_COMMAND = `npx nodebench-mcp@latest --preset=founder`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="flex h-8 w-8 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-white/[0.08] hover:text-content"
      aria-label="Copy command"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

const CONNECTIONS_STATIC = [
  {
    id: "claude_code",
    title: "Claude Code Transcripts",
    description: "Ingest session history from ~/.claude/ as founder context",
    icon: MessageSquareCode,
    status: "setup" as const,
    action: "Connect",
  },
  {
    id: "mcp",
    title: "MCP Server",
    description: "Connect your IDE to 304 tools for company intelligence",
    icon: Terminal,
    status: "ready" as const,
    action: "Configure",
  },
  {
    id: "watchlists",
    title: "Watchlists",
    description: "Monitor entities and get alerts when things change",
    icon: Eye,
    status: "setup" as const,
    action: "Set up",
  },
  {
    id: "agents",
    title: "Agents",
    description: "Register Claude Code or OpenClaw for delegation",
    icon: Bot,
    status: "setup" as const,
    action: "Set up",
  },
] as const;

export function FounderConnectHome() {
  const { convexAuth, mcpReachable } = useDataSource();

  // Claude Code detection — check if MCP server can reach transcripts
  // When MCP is running, Claude Code ingest tools are available
  const [claudeCodeReady, setClaudeCodeReady] = useState(false);
  useEffect(() => {
    // If MCP server is reachable, Claude Code data is accessible through the ingest tools
    setClaudeCodeReady(mcpReachable);
  }, [mcpReachable]);

  // Live status detection for connection cards
  const connections: typeof CONNECTIONS_STATIC = CONNECTIONS_STATIC.map((c) => {
    if (c.id === "claude_code") return { ...c, status: claudeCodeReady ? "ready" as const : "setup" as const };
    if (c.id === "mcp") return { ...c, status: mcpReachable ? "ready" as const : "setup" as const };
    if (c.id === "agents") return { ...c, status: convexAuth ? "ready" as const : "setup" as const };
    return c;
  });

  return (
    <div className="flex h-full flex-col items-center overflow-auto px-4 pb-24 pt-12">
      {/* Headline — matches Ask/Library */}
      <h1 className="text-center text-3xl font-bold text-content sm:text-4xl">
        Your <span className="text-accent-primary">connections</span>
      </h1>
      <p className="mt-3 max-w-lg text-center text-sm text-content-muted">
        Wire NodeBench into your IDE, agents, and monitoring.
      </p>
      <DataSourceBanner className="mt-3" />

      {/* Install command — the primary action */}
      <div className="mt-8 w-full max-w-2xl">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#1a1918] px-4 py-3.5">
          <Terminal className="h-4 w-4 shrink-0 text-accent-primary" />
          <span className="flex-1 select-all font-mono text-[13px] text-white">{MCP_INSTALL_COMMAND}</span>
          <CopyButton text={MCP_INSTALL_COMMAND} />
        </div>
        <p className="mt-2.5 text-center text-xs text-content-muted">
          Run this in your terminal to connect your IDE
        </p>
      </div>

      {/* How it works — 3-step narrative (Attrition pattern) */}
      <div className="mt-6 grid w-full max-w-2xl grid-cols-3 gap-3">
        {[
          { step: "1", label: "Install", detail: "Run the command above in your IDE terminal" },
          { step: "2", label: "Index", detail: "NodeBench reads your docs, code, and agent context" },
          { step: "3", label: "Search", detail: "Ask anything — your company context is always live" },
        ].map((s) => (
          <div key={s.step} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-center">
            <div className="text-lg font-bold text-accent-primary">{s.step}</div>
            <div className="text-[12px] font-medium text-content">{s.label}</div>
            <div className="mt-1 text-[10px] leading-relaxed text-content-muted">{s.detail}</div>
          </div>
        ))}
      </div>

      {/* Connection cards */}
      <div className="mt-6 grid w-full max-w-2xl gap-3">
        {connections.map((conn) => {
          const Icon = conn.icon;
          return (
            <div
              key={conn.id}
              className={cn(
                "group flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all",
                "border-white/[0.06] bg-white/[0.02]",
                "hover:border-white/[0.12] hover:bg-white/[0.04]",
                "active:scale-[0.98]",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-primary/8">
                <Icon className="h-5 w-5 text-accent-primary/70" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-content">{conn.title}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                      conn.status === "ready"
                        ? "bg-emerald-500/12 text-emerald-400"
                        : "bg-amber-500/12 text-amber-400",
                    )}
                  >
                    {conn.status === "ready" ? "Connected" : "Not set up"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-content-muted">{conn.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-content-muted/40" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FounderConnectHome;
