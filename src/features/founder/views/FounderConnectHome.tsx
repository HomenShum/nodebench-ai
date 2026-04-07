/**
 * FounderConnectHome — Canonical "Connect" surface.
 *
 * MCP init/index/search/explore, workspace sync, watchlist setup,
 * agent and runtime connections.
 */

import { lazy, Suspense, useState } from "react";
import { Radio, Eye, Bot, Terminal, Copy, Check } from "lucide-react";
import { ViewSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";

const CoordinationTabs = lazy(() =>
  import("@/features/founder/views/CoordinationTabs").then((mod) => ({
    default: mod.default,
  })),
);

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
      className="flex h-7 w-7 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-white/[0.08] hover:text-content"
      aria-label="Copy command"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

const CONNECT_CARDS = [
  {
    id: "mcp",
    title: "MCP Server",
    description: "Connect your IDE (Claude Code, Cursor, Windsurf) to NodeBench's 304-tool MCP server",
    icon: Terminal,
    status: "ready",
  },
  {
    id: "watchlists",
    title: "Watchlists",
    description: "Monitor entities, competitors, and market signals with ambient alerts",
    icon: Eye,
    status: "setup",
  },
  {
    id: "agents",
    title: "Agent Connections",
    description: "Register Claude Code, OpenClaw, or custom agents for delegation and oversight",
    icon: Bot,
    status: "setup",
  },
] as const;

export function FounderConnectHome() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-auto px-4 pb-24 pt-4">
      {/* Hero */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary/10">
            <Radio className="h-5 w-5 text-accent-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-content">Connect</h2>
            <p className="text-sm text-content-muted">
              Wire NodeBench into your tools, agents, and monitoring
            </p>
          </div>
        </div>
      </div>

      {/* MCP install command */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
          Quick Start
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2">
          <Terminal className="h-4 w-4 shrink-0 text-accent-primary" />
          <code className="flex-1 text-sm font-mono text-content">{MCP_INSTALL_COMMAND}</code>
          <CopyButton text={MCP_INSTALL_COMMAND} />
        </div>
        <p className="mt-2 text-xs text-content-muted">
          Installs the MCP server with founder preset (contextual tools for company intelligence)
        </p>
      </div>

      {/* Connection cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {CONNECT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-accent-primary" />
                  <span className="text-sm font-medium text-content">{card.title}</span>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                    card.status === "ready"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-amber-500/15 text-amber-400",
                  )}
                >
                  {card.status === "ready" ? "Ready" : "Setup"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-content-muted">{card.description}</p>
            </div>
          );
        })}
      </div>

      {/* Coordination hub — existing component */}
      <div className="min-h-0 flex-1">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
          Team Coordination
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <Suspense fallback={<ViewSkeleton variant="default" />}>
            <CoordinationTabs />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default FounderConnectHome;
