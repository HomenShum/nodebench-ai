import { useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Bot,
  FileText,
  GitBranch,
  LayoutGrid,
  Map,
  MessageSquare,
  Search,
  Share2,
  ShieldCheck,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ComposerRoutingPreview } from "@/features/product/components/ComposerRoutingPreview";
import {
  HERO_SCENARIO_TESTS,
  PRODUCT_SURFACE_MODEL,
  SCENARIO_MATRIX,
} from "@/features/workspace/data/scenarioCatalog";
import {
  buildLocalWorkspacePath,
  type WorkspaceTab,
} from "@/features/workspace/lib/workspaceRouting";

type WorkspaceTabDef = {
  id: WorkspaceTab;
  label: string;
  icon: LucideIcon;
  count?: number;
};

const WORKSPACE_TABS: WorkspaceTabDef[] = [
  { id: "brief", label: "Brief", icon: FileText },
  { id: "cards", label: "Cards", icon: LayoutGrid, count: 14 },
  { id: "notebook", label: "Notebook", icon: BookOpen },
  { id: "sources", label: "Sources", icon: ShieldCheck, count: 24 },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "map", label: "Map", icon: Map },
];

const VALID_TABS = new Set<WorkspaceTab>(WORKSPACE_TABS.map((tab) => tab.id));

const SAMPLE_ENTITIES = [
  {
    name: "Orbital Labs",
    type: "Company",
    summary: "Voice-agent eval infrastructure. Seed stage. Looking for healthcare design partners.",
    confidence: "86%",
  },
  {
    name: "Alex Chen",
    type: "Person",
    summary: "Founder contact from Ship Demo Day. Needs pilot criteria and buyer intro path.",
    confidence: "78%",
  },
  {
    name: "Healthcare design partners",
    type: "Market",
    summary: "Likely wedge for call-center QA, prior auth operations, and clinical support workflows.",
    confidence: "72%",
  },
  {
    name: "Verification queue",
    type: "Claims",
    summary: "Traction and seed-stage claims stay field-note status until public evidence is attached.",
    confidence: "64%",
  },
];

const SAMPLE_SOURCES = [
  { label: "Voice memo transcript", type: "field evidence", status: "field_note" },
  { label: "Notebook photo OCR", type: "capture", status: "needs_review" },
  { label: "Company website", type: "public source", status: "provisionally_verified" },
  { label: "LinkedIn profile", type: "public source", status: "provisionally_verified" },
  { label: "Event attendee list", type: "event context", status: "needs_review" },
];

const DEFAULT_INPUT =
  "Met Alex from Orbital Labs. Voice agent eval infra, seed, wants healthcare design partners.";

function getTabFromParams(value: string | null): WorkspaceTab {
  if (value && VALID_TABS.has(value as WorkspaceTab)) return value as WorkspaceTab;
  return "brief";
}

function getWorkspaceId(pathname: string) {
  const match = pathname.match(/(?:^\/workspace)?\/w\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "ship-demo-day";
}

export function UniversalWorkspacePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspaceId = useMemo(() => getWorkspaceId(location.pathname), [location.pathname]);
  const activeTab = getTabFromParams(searchParams.get("tab"));
  const [composerText, setComposerText] = useState(DEFAULT_INPUT);
  const activeScenario = HERO_SCENARIO_TESTS[0];

  const setActiveTab = (tab: WorkspaceTab) => {
    navigate(buildLocalWorkspacePath({ workspaceId, tab }), { replace: true });
  };

  return (
    <div
      data-testid="universal-workspace-page"
      className="h-screen overflow-hidden bg-[#f5f2ee] text-[#111827]"
    >
      <div className="flex h-full flex-col">
        <WorkspaceHeader
          workspaceId={workspaceId}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-h-0 overflow-y-auto">
            {activeTab === "brief" && <BriefSurface />}
            {activeTab === "cards" && <CardsSurface />}
            {activeTab === "notebook" && <NotebookSurface />}
            {activeTab === "sources" && <SourcesSurface />}
            {activeTab === "chat" && (
              <ChatSurface value={composerText} onChange={setComposerText} />
            )}
            {activeTab === "map" && <MapSurface />}
          </main>
          <aside className="hidden min-h-0 overflow-y-auto border-l border-black/[0.06] bg-[#fafaf7] lg:block">
            <WorkspaceInspector activeTab={activeTab} activeScenario={activeScenario} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function WorkspaceHeader({
  workspaceId,
  activeTab,
  onTabChange,
}: {
  workspaceId: string;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}) {
  return (
    <header className="flex min-h-[58px] items-center gap-4 border-b border-black/[0.06] bg-white/85 px-4 backdrop-blur-xl sm:px-5">
      <button
        type="button"
        className="flex items-center gap-2 font-semibold"
        aria-label="NodeBench workspace"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#d97757] text-xs font-bold text-[#fffaf0]">
          N
        </span>
        <span className="hidden text-sm sm:inline">
          NodeBench <span className="text-[#d97757]">AI</span>
        </span>
      </button>
      <div className="flex min-w-0 items-center gap-2 rounded-full border border-black/[0.06] bg-white px-2.5 py-1.5 shadow-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1a365d] text-[10px] font-bold text-[#fffaf0]">
          SD
        </span>
        <span className="truncate text-sm font-semibold">Ship Demo Day</span>
        <span className="hidden font-mono text-[11px] text-gray-500 sm:inline">
          workspace / {workspaceId}
        </span>
      </div>
      <nav
        className="ml-auto hidden items-center gap-1 rounded-[10px] bg-[#f5f4f1] p-1 xl:flex"
        aria-label="Workspace tabs"
      >
        {WORKSPACE_TABS.map((tab) => (
          <WorkspaceTabButton
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </nav>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-black/[0.06] bg-white text-gray-600 transition hover:bg-gray-50"
          aria-label="Share workspace"
        >
          <Share2 size={15} />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-black/[0.06] bg-white text-gray-600 transition hover:bg-gray-50"
          aria-label="Search workspace"
        >
          <Search size={15} />
        </button>
      </div>
    </header>
  );
}

function WorkspaceTabButton({
  tab,
  active,
  onClick,
}: {
  tab: WorkspaceTabDef;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium text-gray-500 transition",
        active && "bg-white font-semibold text-gray-950 shadow-sm",
      )}
    >
      <Icon size={13} aria-hidden />
      {tab.label}
      {tab.count ? (
        <span className={cn("rounded-full px-1.5 py-px font-mono text-[10px]", active ? "bg-[#d97757]/10 text-[#ad5f45]" : "bg-black/[0.05] text-gray-500")}>
          {tab.count}
        </span>
      ) : null}
    </button>
  );
}

function SurfaceShell({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
          {kicker}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-gray-950">
          {title}
        </h1>
      </div>
      {children}
    </section>
  );
}

function BriefSurface() {
  return (
    <SurfaceShell kicker="Brief" title="Messy capture to event intelligence.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <Panel>
          <p className="text-[15px] leading-7 text-gray-700">
            NodeBench keeps the operating app calm, then opens this deep workspace
            when a report needs recursive exploration. The active report separates
            field-note claims from verified evidence and keeps follow-ups attached
            to the entity graph.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric label="Entities" value="18" />
            <Metric label="Claims" value="11" />
            <Metric label="Follow-ups" value="7" />
          </div>
        </Panel>
        <Panel>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
            Next action
          </div>
          <h2 className="mt-2 text-lg font-semibold">Verify the seed-stage claims.</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Keep the live note useful without polluting the canonical graph. Promote
            Orbital Labs after the company source and founder profile are attached.
          </p>
          <button className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#d97757] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#c76648]">
            Open verification queue
            <Target size={14} aria-hidden />
          </button>
        </Panel>
      </div>
    </SurfaceShell>
  );
}

function CardsSurface() {
  return (
    <SurfaceShell kicker="Cards" title="Recursive entities, claims, and next hops.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {SAMPLE_ENTITIES.map((entity) => (
          <Panel key={entity.name} className="min-h-[210px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-[#ad5f45]">{entity.type}</div>
                <h2 className="mt-1 text-base font-semibold">{entity.name}</h2>
              </div>
              <span className="rounded-full border border-black/[0.06] bg-black/[0.03] px-2 py-1 font-mono text-[11px] text-gray-500">
                {entity.confidence}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-gray-600">{entity.summary}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Open card", "Go deeper", "Verify"].map((action) => (
                <span key={action} className="rounded border border-black/[0.06] bg-[#f5f4f1] px-2 py-1 text-[11px] text-gray-600">
                  {action}
                </span>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </SurfaceShell>
  );
}

function NotebookSurface() {
  return (
    <SurfaceShell kicker="Notebook" title="Living memo from captures and evidence.">
      <article className="rounded-md border border-black/[0.08] bg-[#fffcf6] p-6 shadow-sm">
        <div className="border-l-2 border-[#d97757] pl-5">
          <h2 className="font-serif text-2xl font-semibold tracking-[-0.02em]">
            Ship Demo Day memo
          </h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-8 text-gray-700">
            The strongest signal is not one company. It is the repeated pattern:
            voice-agent infrastructure companies are looking for narrow design
            partners where evaluation failures have direct operational cost.
          </p>
          <p className="mt-4 max-w-3xl text-[15px] leading-8 text-gray-700">
            Orbital Labs belongs in the follow-up queue once the seed claim is
            verified. Ask for pilot criteria, deployment surface, and whether
            healthcare is a real wedge or just the clearest event conversation.
          </p>
        </div>
      </article>
    </SurfaceShell>
  );
}

function SourcesSurface() {
  return (
    <SurfaceShell kicker="Sources" title="Evidence and verification status.">
      <Panel>
        <div className="divide-y divide-black/[0.06]">
          {SAMPLE_SOURCES.map((source) => (
            <div key={source.label} className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="text-sm font-semibold">{source.label}</div>
                <div className="mt-1 text-xs text-gray-500">{source.type}</div>
              </div>
              <span className="rounded-full border border-black/[0.06] bg-[#f5f4f1] px-2.5 py-1 font-mono text-[11px] text-gray-600">
                {source.status}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </SurfaceShell>
  );
}

function ChatSurface({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SurfaceShell kicker="Chat" title="Ask with the workspace context attached.">
      <Panel>
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#111827] text-white">
            <Bot size={16} />
          </span>
          <div>
            <div className="font-semibold">Workspace context resolver</div>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              This chat is scoped to the report. Captures can append to the
              notebook, open a card, or go to unassigned review based on confidence.
            </p>
          </div>
        </div>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-5 min-h-[120px] w-full resize-none rounded-md border border-black/[0.08] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#d97757]/60 focus:ring-2 focus:ring-[#d97757]/15"
          aria-label="Workspace composer"
        />
        <ComposerRoutingPreview
          text={value}
          files={[]}
          mode="note"
          activeContextLabel="Ship Demo Day"
          className="mt-3"
        />
      </Panel>
    </SurfaceShell>
  );
}

function MapSurface() {
  return (
    <SurfaceShell kicker="Map" title="Relationship graph for the report.">
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] pb-3">
          <div className="text-sm text-gray-600">
            Companies, people, markets, and verification queues stay in one resource graph.
          </div>
          <span className="rounded-full border border-black/[0.06] bg-[#f5f4f1] px-2.5 py-1 font-mono text-[11px] text-gray-600">
            9 nodes / 10 edges
          </span>
        </div>
        <svg
          viewBox="0 0 900 520"
          className="mt-4 h-[420px] w-full"
          role="img"
          aria-label="Workspace entity relationship map"
        >
          <defs>
            <radialGradient id="workspace-map-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(217,119,87,0.14)" />
              <stop offset="100%" stopColor="rgba(217,119,87,0)" />
            </radialGradient>
          </defs>
          <rect width="900" height="520" fill="#fbf9f6" />
          <circle cx="450" cy="260" r="210" fill="url(#workspace-map-glow)" />
          <GraphEdge x1={450} y1={260} x2={240} y2={160} label="founder" />
          <GraphEdge x1={450} y1={260} x2={665} y2={155} label="market" />
          <GraphEdge x1={450} y1={260} x2={255} y2={365} label="claim" />
          <GraphEdge x1={450} y1={260} x2={655} y2={365} label="source" />
          <GraphEdge x1={665} y1={155} x2={740} y2={270} label="similar" secondary />
          <GraphNode x={450} y={260} label="Orbital Labs" kind="Company" color="#0f4c81" large />
          <GraphNode x={240} y={160} label="Alex Chen" kind="Person" color="#475569" />
          <GraphNode x={665} y={155} label="Healthcare" kind="Market" color="#c77826" />
          <GraphNode x={255} y={365} label="Seed claim" kind="Claim" color="#0e7a5c" />
          <GraphNode x={655} y={365} label="Evidence" kind="Source" color="#7a50b8" />
          <GraphNode x={740} y={270} label="Eval infra" kind="Product" color="#d97757" />
        </svg>
      </Panel>
    </SurfaceShell>
  );
}

function GraphEdge({
  x1,
  y1,
  x2,
  y2,
  label,
  secondary = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  secondary?: boolean;
}) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <g opacity={secondary ? 0.6 : 0.9}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={secondary ? "#b8b2a5" : "#d97757"}
        strokeWidth={secondary ? 1.2 : 1.7}
        strokeDasharray={secondary ? "4 5" : undefined}
      />
      <rect x={midX - 34} y={midY - 9} width="68" height="18" rx="9" fill="#faf8f5" stroke="#d7d0c8" />
      <text x={midX} y={midY + 3} textAnchor="middle" fontSize="10" fontWeight="700" fill="#6b7280">
        {label}
      </text>
    </g>
  );
}

function GraphNode({
  x,
  y,
  label,
  kind,
  color,
  large = false,
}: {
  x: number;
  y: number;
  label: string;
  kind: string;
  color: string;
  large?: boolean;
}) {
  const radius = large ? 42 : 32;
  return (
    <g>
      <circle cx={x} cy={y} r={radius + 4} fill="rgba(255,255,255,0.78)" stroke="rgba(15,23,42,0.08)" />
      <circle cx={x} cy={y} r={radius} fill={color} />
      <text x={x} y={y - 2} textAnchor="middle" fontSize={large ? 12 : 11} fontWeight="800" fill="#fffaf0">
        {label.split(" ").map((part) => part[0]).join("").slice(0, 2)}
      </text>
      <text x={x} y={y + radius + 18} textAnchor="middle" fontSize="12" fontWeight="700" fill="#111827">
        {label}
      </text>
      <text x={x} y={y + radius + 33} textAnchor="middle" fontSize="10" fill="#6b7280">
        {kind}
      </text>
    </g>
  );
}

function WorkspaceInspector({
  activeTab,
  activeScenario,
}: {
  activeTab: WorkspaceTab;
  activeScenario: (typeof HERO_SCENARIO_TESTS)[number];
}) {
  return (
    <div className="flex flex-col gap-5 p-5">
      <Panel>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
          <GitBranch size={13} />
          Separate surface
        </div>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Workspace is not a sixth tab. The operating app opens deep work here
          from Chat, Reports, and Inbox.
        </p>
        <div className="mt-4 rounded-md border border-black/[0.06] bg-[#f5f4f1] p-3 font-mono text-[11px] leading-6 text-gray-600">
          nodebenchai.com: Home / Reports / Chat / Inbox / Me
          <br />
          workspace.nodebenchai.com: Brief / Cards / Notebook / Sources / Chat / Map
        </div>
      </Panel>

      <Panel>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
          Scenario test
        </div>
        <h2 className="mt-2 text-base font-semibold">{activeScenario.title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">{activeScenario.realLifeInput}</p>
        <div className="mt-4 space-y-2 text-xs text-gray-600">
          <InspectorLine label="Intent" value={activeScenario.inferredIntent} />
          <InspectorLine label="Target" value={activeScenario.target} />
          <InspectorLine label="Ack" value={activeScenario.ack} />
          <InspectorLine label="Tab" value={activeTab} />
        </div>
      </Panel>

      <Panel>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
          Surface roles
        </div>
        <div className="mt-3 space-y-3">
          {PRODUCT_SURFACE_MODEL.map((surface) => (
            <div key={surface.surface} className="rounded-md border border-black/[0.06] bg-[#f5f4f1] p-3">
              <div className="text-sm font-semibold">{surface.surface}</div>
              <div className="mt-1 text-xs text-gray-600">{surface.job}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
          Scenario coverage
        </div>
        <div className="mt-3 space-y-2">
          {SCENARIO_MATRIX.slice(0, 7).map((row) => (
            <div key={row.scenario} className="rounded-md border border-black/[0.06] bg-white p-3">
              <div className="text-sm font-semibold">{row.scenario}</div>
              <div className="mt-1 text-xs text-gray-500">Primary: {row.primarySurface}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-black/[0.06] bg-white p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-[#f5f4f1] p-3">
      <div className="font-mono text-xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function InspectorLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="rounded bg-[#f5f4f1] px-2 py-1 font-mono text-[11px] text-gray-700">
        {value}
      </span>
    </div>
  );
}

export default UniversalWorkspacePage;
