/**
 * DevelopersPage — Architecture, tools, and integrations under the hood.
 * Houses CAPABILITIES stats, SYSTEM_LAYERS, and TECH_TAGS moved from the old landing shell.
 */

import { memo, useCallback, useState, type CSSProperties, type ReactNode } from "react";
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

function AgentOneLinerBlock({ stagger }: { stagger: (delay: string) => CSSProperties }) {
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

const MCP_PRIMITIVES = [
  {
    name: "nodebench.research_run",
    job: "Start an evidence-backed run from messy inputs.",
    output: "plan, streamed checkpoints, answer packet, saved report link",
  },
  {
    name: "nodebench.expand_resource",
    job: "Expand a nodebench:// URI into the next useful ring.",
    output: "cards, evidence refs, next-hop URIs, confidence",
  },
] as const;

const CLI_COMMANDS = [
  `claude mcp add nodebench -- npx -y nodebench-mcp`,
  `npx nodebench-mcp`,
  `npx nodebench-mcp --cloud`,
  `npx nodebench-mcp --list-presets`,
  `npx nodebench-mcp --preset power`,
] as const;

function TerminalLine({
  lead = "",
  children,
  tone = "muted",
}: {
  lead?: string;
  children: ReactNode;
  tone?: "muted" | "accent" | "ok" | "warn" | "fail";
}) {
  const toneClass =
    tone === "accent"
      ? "text-[#d97757]"
      : tone === "ok"
        ? "text-emerald-300"
        : tone === "warn"
          ? "text-amber-300"
          : tone === "fail"
            ? "text-red-300"
            : "text-slate-400";

  return (
    <div className="flex gap-3 whitespace-pre-wrap font-mono text-[12px] leading-6">
      <span className={`w-4 shrink-0 text-right ${toneClass}`}>{lead}</span>
      <span className="min-w-0 flex-1 text-slate-200">{children}</span>
    </div>
  );
}

function TerminalWindow({
  label,
  badge,
  children,
}: {
  label: string;
  badge: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0f1115] shadow-lg shadow-black/20">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#171b22] px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff605c]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd44]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#00ca4e]" />
        </div>
        <div className="truncate rounded border border-white/[0.06] bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-slate-200">
          {label}
        </div>
        <div className="ml-auto rounded border border-[#d97757]/30 bg-[#d97757]/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#e59579]">
          {badge}
        </div>
      </div>
      <div className="space-y-1 bg-[radial-gradient(circle_at_12%_0%,rgba(217,119,87,.08),transparent_44%),radial-gradient(circle_at_100%_100%,rgba(140,151,240,.08),transparent_50%)] p-4">
        {children}
      </div>
    </section>
  );
}

function McpParitySurface({ stagger }: { stagger: (delay: string) => CSSProperties }) {
  return (
    <div style={stagger("0.5s")} className="mt-12">
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
        MCP run surface
      </div>
      <div className="space-y-4">
        <TerminalWindow label="~/diligence - zsh - 120x32" badge="core lane">
          <TerminalLine>
            <span className="text-[#8c97f0]">homen@mac</span>
            <span className="text-[#d97757]"> &gt; </span>
            <span>claude mcp add nodebench -- npx -y nodebench-mcp</span>
          </TerminalLine>
          <TerminalLine lead="|" tone="ok">registered with Claude Code - nodebench-mcp</TerminalLine>
          <TerminalLine lead="|" tone="ok">loaded default tools - investigate, report, track, nodebench.research_run</TerminalLine>
          <div className="my-3 h-px bg-white/[0.06]" />
          <TerminalLine>
            <span className="text-[#8c97f0]">homen@mac</span>
            <span className="text-[#d97757]"> &gt; </span>
            <span>npx nodebench-mcp investigate --entity "DISCO" --lane answer</span>
          </TerminalLine>
          <TerminalLine lead=">" tone="accent">plan - resolve entity, search, synthesize, verify</TerminalLine>
          <TerminalLine lead=">" tone="ok">24 sources captured - answer packet streaming</TerminalLine>
          <div className="rounded-md border border-[#d97757]/25 bg-[#d97757]/10 p-3 font-mono text-[12px] leading-6 text-slate-100">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#e59579]">
              Answer packet
            </div>
            Worth reaching out. Save the report, verify the funding claim, then open Workspace for cards and sources.
          </div>
          <TerminalLine lead=">" tone="ok">verified - 6 branches - 24 sources - saved report URI</TerminalLine>
        </TerminalWindow>

        <TerminalWindow label="~/diligence - tool loading" badge="power lane">
          <TerminalLine>
            <span className="text-[#8c97f0]">homen@mac</span>
            <span className="text-[#d97757]"> &gt; </span>
            <span>npx nodebench-mcp --list-presets</span>
          </TerminalLine>
          <div className="overflow-hidden rounded-md border border-white/[0.06]">
            {[
              ["core", "fast lane - investigate, compare, report, track"],
              ["power", "founder, recon, packet workflows"],
              ["admin", "profiling, dashboards, eval, observability"],
              ["full", "maximum coverage across domains"],
            ].map(([preset, useCase]) => (
              <div
                key={preset}
                className="grid grid-cols-[92px_minmax(0,1fr)] border-b border-white/[0.04] px-3 py-2 font-mono text-[11px] last:border-b-0"
              >
                <span className="text-[#e59579]">{preset}</span>
                <span className="text-slate-400">{useCase}</span>
              </div>
            ))}
          </div>
          <TerminalLine>
            <span className="text-[#8c97f0]">homen@mac</span>
            <span className="text-[#d97757]"> &gt; </span>
            <span>npx nodebench-mcp-power discover_tools --query "visual QA"</span>
          </TerminalLine>
          <TerminalLine lead=">" tone="ok">matches - dogfood.visual_qa, ui_ux_dive.inspect_surface, ui_ux_dive.motion_trace</TerminalLine>
          <TerminalLine>
            <span className="text-[#8c97f0]">homen@mac</span>
            <span className="text-[#d97757]"> &gt; </span>
            <span>npx nodebench-mcp-power load_toolset --domain ui_ux_dive</span>
          </TerminalLine>
          <TerminalLine lead=">" tone="warn">missing GEMINI_API_KEY - set env var before synthesis</TerminalLine>
        </TerminalWindow>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            Canonical MCP tools
          </div>
          <div className="space-y-3">
            {MCP_PRIMITIVES.map((tool) => (
              <div key={tool.name} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="font-mono text-[12px] text-[#e59579]">{tool.name}</div>
                <p className="mt-1 text-[12px] leading-5 text-content-secondary">{tool.job}</p>
                <p className="mt-1 font-mono text-[11px] text-content-muted">{tool.output}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
            CLI entrypoints
          </div>
          <div className="space-y-2">
            {CLI_COMMANDS.map((cmd) => (
              <CopyBlock key={cmd} code={cmd} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

interface DevelopersPageProps {
  onNavigate: (view: MainView, path?: string) => void;
}

export const DevelopersPage = memo(function DevelopersPage({
  onNavigate,
}: DevelopersPageProps) {
  const { ref: revealRef, isVisible, instant } = useRevealOnMount();

  const stagger = (delay: string): CSSProperties => ({
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

        <McpParitySurface stagger={stagger} />

        {/* Capabilities stats */}
        <div style={stagger("0.55s")} className="mt-10">
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
        <div style={stagger("0.6s")} className="mt-8">
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
        <div style={stagger("0.65s")} className="mt-8">
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
        <div style={stagger("0.7s")} className="mt-12">
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
