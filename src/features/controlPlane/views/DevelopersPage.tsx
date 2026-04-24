/**
 * DevelopersPage — Architecture, tools, and integrations under the hood.
 * Houses CAPABILITIES stats, SYSTEM_LAYERS, and TECH_TAGS moved from the old landing shell.
 */

import { memo, useCallback, useState } from "react";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import { ArrowLeft, Check, Copy, Terminal, Monitor, Wind } from "lucide-react";
import { VIEW_PATH_MAP, type MainView } from "@/lib/registry/viewRegistry";

const CAPABILITIES = [
  { value: "350", label: "MCP tools" },
  { value: "63", label: "Backend domains" },
  { value: "8", label: "Score dimensions" },
  { value: "1,510", label: "Tests passing" },
] as const;

const SYSTEM_LAYERS = [
  {
    name: "Judgment Layer",
    description:
      "Boolean gates, 6 agent roles, self-evolution, institutional memory, passport enforcement",
    color: "#d97757",
  },
  {
    name: "Trajectory Intelligence",
    description:
      "Compounding scores, drift detection, intervention tracking, trust graph, 11 schema tables",
    color: "#7aac8c",
  },
  {
    name: "Decision Workbench",
    description:
      "Claim graphs, variable extraction, counter-models, scenario simulation, ranked interventions",
    color: "#6b9fc4",
  },
  {
    name: "Autoresearch Optimizer",
    description:
      "Offline mutation testing, runtime research cells, throughput scoring, hard quality guards",
    color: "#c4a06b",
  },
] as const;

const TECH_TAGS = [
  "React",
  "TypeScript",
  "Convex",
  "MCP Protocol",
  "Agent-as-a-Graph",
  "Boolean Rubric",
  "Progressive Discovery",
  "TOON Encoding",
  "Replay Engine",
  "Forecast Scorekeeping",
  "OpenClaw Bridge",
] as const;

/* ─── Copy Block ──────────────────────────────────────────────────── */

function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="group relative">
      {label && (
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-content-muted">
          {label}
        </div>
      )}
      <div className="relative rounded-lg bg-white/[0.04] px-3 py-2.5 pr-10 font-mono text-[12px] leading-relaxed text-content-muted">
        <pre className="overflow-x-auto whitespace-pre-wrap break-all">{code}</pre>
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-white/[0.08] hover:text-content"
          aria-label={copied ? "Copied" : "Copy to clipboard"}
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

/* ─── Agent One-Liner ─────────────────────────────────────────────── */

const AGENT_ONELINER = "Read https://www.nodebenchai.com/agent-setup.txt and follow all steps.";

function AgentOneLinerBlock({ stagger }: { stagger: (delay: string) => React.CSSProperties }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(AGENT_ONELINER).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return (
    <div style={stagger("0.15s")} className="mt-8">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
        Connect any agent
      </div>
      <div className="rounded-2xl border border-[#d97757]/30 bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4">
          <p className="mb-3 text-[13px] text-content-secondary">
            Paste this into any AI agent to connect it to NodeBench:
          </p>
          <div className="group relative">
            <pre className="overflow-x-auto rounded-lg bg-white/[0.04] px-4 py-3 pr-24 font-mono text-[12px] leading-relaxed text-content-muted">
              {AGENT_ONELINER}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-content-muted transition-colors hover:bg-white/[0.08] hover:text-content"
              aria-label={copied ? "Copied" : "Copy to clipboard"}
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? <span className="text-emerald-400">Copied!</span> : "Copy"}
            </button>
          </div>
          <p className="mt-3 text-[11px] text-content-muted">
            Works with Claude Code, Cursor, Windsurf, OpenClaw, or any MCP-compatible agent.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Install Configs ─────────────────────────────────────────────── */

const CURSOR_CONFIG = `{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp"]
    }
  }
}`;

const WINDSURF_CONFIG = `{
  "mcpServers": {
    "nodebench": {
      "command": "npx",
      "args": ["-y", "nodebench-mcp"]
    }
  }
}`;

interface DevelopersPageProps {
  onNavigate: (view: MainView, path?: string) => void;
}

export const DevelopersPage = memo(function DevelopersPage({
  onNavigate,
}: DevelopersPageProps) {
  const { ref: revealRef, isVisible, instant } = useRevealOnMount();

  const stagger = (delay: string): React.CSSProperties => ({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "none" : "translateY(8px)",
    transition: instant ? "none" : "opacity 0.2s ease-out, transform 0.2s ease-out",
    transitionDelay: instant ? "0s" : delay,
  });

  return (
    <div className="h-full overflow-y-auto">
      <div
        ref={revealRef}
        className="mx-auto flex min-h-full max-w-3xl flex-col px-6 py-12"
      >
        {/* Back link */}
        <button
          type="button"
          onClick={() => onNavigate("control-plane", VIEW_PATH_MAP["control-plane"] ?? "/")}
          className="mb-8 inline-flex w-fit items-center gap-1.5 text-sm text-content-muted transition-colors hover:text-content"
          style={stagger("0s")}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to home
        </button>

        {/* Hero */}
        <h1
          style={stagger("0.05s")}
          className="text-3xl font-bold tracking-tight text-content"
        >
          CLI, MCP, and API setup
        </h1>
        <p
          style={stagger("0.1s")}
          className="mt-3 max-w-xl text-base leading-relaxed text-content-secondary"
        >
          Install NodeBench in Claude Code, Cursor, Windsurf, terminal workflows, and automation pipelines.
        </p>

        {/* Agent one-liner */}
        <AgentOneLinerBlock stagger={stagger} />

        {/* Capabilities stats */}
        <div style={stagger("0.2s")} className="mt-10">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            What&apos;s inside
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 pb-4 pt-3"
              >
                <div className="text-2xl font-bold text-content">{cap.value}</div>
                <div className="mt-1.5 text-[11px] leading-normal text-content-muted">
                  {cap.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Layers */}
        <div style={stagger("0.3s")} className="mt-8">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            System layers
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SYSTEM_LAYERS.map((layer) => (
              <div
                key={layer.name}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
              >
                <div
                  className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: layer.color }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-content">{layer.name}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-content-muted">
                    {layer.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Tags */}
        <div style={stagger("0.4s")} className="mt-8">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            Built with
          </div>
          <div className="flex flex-wrap gap-2">
            {TECH_TAGS.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[10px] font-medium text-content-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* ── Install / Integrate ──────────────────────────────── */}
        <div style={stagger("0.5s")} className="mt-12">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            Install
          </div>

          {/* Claude Code */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="h-4 w-4 text-[#d97757]" aria-hidden="true" />
              <span className="text-sm font-semibold text-content">Claude Code</span>
            </div>
            <CopyBlock
              label="One-liner"
              code="claude mcp add nodebench -- npx -y nodebench-mcp"
            />
            <p className="mt-2 text-[11px] text-content-muted">
              Adds NodeBench to your Claude Code environment. 350 tools available instantly.
            </p>
          </div>

          {/* Cursor */}
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="h-4 w-4 text-[#d97757]" aria-hidden="true" />
              <span className="text-sm font-semibold text-content">Cursor</span>
            </div>
            <CopyBlock
              label="Add to .cursor/mcp.json"
              code={CURSOR_CONFIG}
            />
          </div>

          {/* Windsurf */}
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wind className="h-4 w-4 text-[#d97757]" aria-hidden="true" />
              <span className="text-sm font-semibold text-content">Windsurf</span>
            </div>
            <CopyBlock
              label="Add to .windsurf/mcp.json"
              code={WINDSURF_CONFIG}
            />
          </div>

          {/* Local vs Cloud */}
          <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted mb-3">
              Local mode vs Cloud mode
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-content mb-1.5">Local (default)</div>
                <CopyBlock code="npx nodebench-mcp" />
                <p className="mt-1.5 text-[11px] text-content-muted leading-relaxed">
                  Runs entirely on your machine. No account needed. All data stays local.
                </p>
              </div>
              <div>
                <div className="text-sm font-medium text-content mb-1.5">Cloud</div>
                <CopyBlock code="npx nodebench-mcp --cloud" />
                <p className="mt-1.5 text-[11px] text-content-muted leading-relaxed">
                  Syncs to NodeBench dashboard at nodebenchai.com. Knowledge persists across machines.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DevelopersPage;
