import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Archive,
  Bell,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Command,
  Copy,
  Eye,
  FileText,
  GitBranch,
  Grid3X3,
  Home,
  Inbox,
  LayoutGrid,
  Link2,
  List,
  Map,
  MessageSquare,
  Mic,
  Moon,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Terminal,
  User,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { buildCockpitPath, type CockpitSurfaceId } from "@/lib/registry/viewRegistry";
import { RichNotebookEditor } from "@/features/notebook/components/RichNotebookEditor";
import {
  buildLocalWorkspacePath,
  buildWorkspaceUrl,
  type WorkspaceTab,
} from "@/features/workspace/lib/workspaceRouting";

import "./exactKit.css";

type WebSurfaceProps = {
  onSurfaceChange?: (surface: CockpitSurfaceId) => void;
};

type LaneId = "answer" | "deep" | "admin";
type MobileSurface = "home" | "reports" | "chat" | "inbox" | "me";

const LANES: Array<{ id: LaneId; label: string; note: string }> = [
  { id: "answer", label: "Answer", note: "fast - default" },
  { id: "deep", label: "Deep dive", note: "multi-agent - 3-5 min" },
  { id: "admin", label: "Admin", note: "nodebench-mcp-admin" },
];

const PROMPT_CARDS: Array<{ icon: LucideIcon; prompt: string }> = [
  { icon: Sparkles, prompt: "DISCO - worth reaching out? Fastest debrief." },
  { icon: FileText, prompt: "Summarize the attached 10-K into a 1-pager." },
  { icon: Eye, prompt: "Watch Mercor and nudge me on hiring signal." },
];

const REPORTS = [
  {
    id: "disco-diligence",
    kind: "Company",
    title: "DISCO - diligence debrief",
    summary: "Legal AI platform with SOC2 movement, enterprise momentum, and still-open valuation risk.",
    state: "verified",
    sources: 24,
    updated: "12h ago",
    watched: true,
    colorA: "#1a365d",
    colorB: "#d97757",
  },
  {
    id: "mercor-hiring",
    kind: "Hiring",
    title: "Mercor - hiring velocity",
    summary: "Engineering hiring pattern supports the infra-heavy Series B prep hypothesis.",
    state: "needs review",
    sources: 18,
    updated: "2h ago",
    watched: true,
    colorA: "#0e7a5c",
    colorB: "#5e6ad2",
  },
  {
    id: "cognition-devin",
    kind: "Agent",
    title: "Cognition - devin postmortem",
    summary: "Benchmark claims were promoted after independent reruns and source reconciliation.",
    state: "verified",
    sources: 31,
    updated: "1d ago",
    watched: false,
    colorA: "#6b3ba3",
    colorB: "#d97757",
  },
  {
    id: "turing-contract",
    kind: "Services",
    title: "Turing - contract spend YoY",
    summary: "Quarterly filing refresh changed the model inputs but not the spend trend.",
    state: "verified",
    sources: 16,
    updated: "3d ago",
    watched: false,
    colorA: "#c77826",
    colorB: "#0f4c81",
  },
  {
    id: "anthropic-safety",
    kind: "Foundation",
    title: "Anthropic - safety framework",
    summary: "Framework v2.3 affects notebook assumptions but has not yet attached to a saved report.",
    state: "watching",
    sources: 9,
    updated: "4d ago",
    watched: true,
    colorA: "#334155",
    colorB: "#5e6ad2",
  },
  {
    id: "foundation-labs",
    kind: "Market",
    title: "Foundation labs - positioning",
    summary: "Landscape map for foundation-model labs, open claims, and category edges.",
    state: "needs review",
    sources: 14,
    updated: "6d ago",
    watched: false,
    colorA: "#0e7a5c",
    colorB: "#c77826",
  },
];

const INBOX_SEED = [
  {
    id: "n1",
    when: "just now",
    entity: "DISCO",
    priority: "act",
    icon: Zap,
    title: "Announced GA of native SOC 2 Type II in EU",
    body: "Addresses the regulatory risk flagged in your Nov 14 run. This is material. Your needs-review stance likely flips.",
    actions: ["rerun", "open", "snooze", "dismiss"],
    report: "DISCO - diligence debrief",
    deltaSources: 3,
  },
  {
    id: "n2",
    when: "2h ago",
    entity: "Mercor",
    priority: "act",
    icon: Zap,
    title: "Posted 7 new eng roles in 24h - infra heavy",
    body: "Consistent with the Series B prep hypothesis. Three new stealth hires reinforce it.",
    actions: ["rerun", "open", "snooze", "dismiss"],
    report: "Mercor - hiring velocity",
    deltaSources: 5,
  },
  {
    id: "n3",
    when: "yesterday",
    entity: "Cognition",
    priority: "auto",
    icon: Check,
    title: "Two claims verified - we promoted the report",
    body: "Independent benchmark rerun landed. The report moved from needs review to verified automatically.",
    actions: ["open", "undo", "dismiss"],
    report: "Cognition - devin postmortem",
    deltaSources: 2,
  },
  {
    id: "n4",
    when: "yesterday",
    entity: "Anthropic",
    priority: "watch",
    icon: Eye,
    title: "New safety framework doc v2.3 published",
    body: "Not on any saved report, but in your notebook. Want me to draft a brief?",
    actions: ["draft", "watch", "dismiss"],
    report: null,
    deltaSources: 1,
  },
  {
    id: "n5",
    when: "3d ago",
    entity: "Turing",
    priority: "fyi",
    icon: GitBranch,
    title: "Quarterly filing updated - no material change",
    body: "We refreshed the numbers in your saved report. Contract spend trend is unchanged.",
    actions: ["open", "dismiss"],
    report: "Turing - contract spend YoY",
    deltaSources: 1,
  },
] as const;

const WATCHLIST = [
  { id: "disco", name: "DISCO", ticker: "DSCO", value: "84", delta: "+12", trend: "up", meta: "3 new sources", initials: "D", avatar: "linear-gradient(135deg,#1A365D,#0F4C81)" },
  { id: "mercor", name: "Mercor", ticker: "MRC", value: "91", delta: "+7", trend: "up", meta: "hiring spike", initials: "M", avatar: "linear-gradient(135deg,#0E7A5C,#16A37E)" },
  { id: "cognition", name: "Cognition", ticker: "COG", value: "68", delta: "-4", trend: "down", meta: "claim review", initials: "C", avatar: "linear-gradient(135deg,#6B3BA3,#8B5CC1)" },
  { id: "anthropic", name: "Anthropic", ticker: "ANT", value: "76", delta: "+3", trend: "up", meta: "framework v2.3", initials: "A", avatar: "linear-gradient(135deg,#334155,#475569)" },
];

const THREADS = [
  { id: "t1", title: "DISCO debrief", meta: "12h ago - 24 sources" },
  { id: "t2", title: "Mercor hiring signal", meta: "2h ago - inbox routed" },
  { id: "t3", title: "Technical vendor API notes", meta: "yesterday - saved report" },
];

const WORKSPACE_TABS: Array<{ id: WorkspaceTab; label: string; icon: LucideIcon; count?: number }> = [
  { id: "brief", label: "Brief", icon: FileText },
  { id: "cards", label: "Cards", icon: LayoutGrid, count: 14 },
  { id: "notebook", label: "Notebook", icon: BookOpen },
  { id: "sources", label: "Sources", icon: ShieldCheck, count: 24 },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "map", label: "Map", icon: Map },
];

const VALID_WORKSPACE_TABS = new Set<WorkspaceTab>(WORKSPACE_TABS.map((tab) => tab.id));

function getWorkspaceTab(value: string | null): WorkspaceTab {
  if (value && VALID_WORKSPACE_TABS.has(value as WorkspaceTab)) return value as WorkspaceTab;
  return "brief";
}

function getWorkspaceId(pathname: string) {
  const match = pathname.match(/(?:^\/workspace)?\/w\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "ship-demo-day";
}

function openWorkspace(workspaceId: string, tab: WorkspaceTab) {
  window.location.assign(buildWorkspaceUrl({ workspaceId, tab }));
}

function ReportThumb({
  label,
  colorA,
  colorB,
}: {
  label: string;
  colorA: string;
  colorB: string;
}) {
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <svg viewBox="0 0 420 236" role="img" aria-label={`${label} report preview`}>
      <defs>
        <linearGradient id={`g-${label.replace(/[^a-z0-9]/gi, "-")}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={colorA} />
          <stop offset="100%" stopColor={colorB} />
        </linearGradient>
      </defs>
      <rect width="420" height="236" fill={`url(#g-${label.replace(/[^a-z0-9]/gi, "-")})`} />
      <circle cx="350" cy="36" r="70" fill="rgba(255,255,255,.14)" />
      <circle cx="68" cy="192" r="92" fill="rgba(255,255,255,.10)" />
      <rect x="28" y="28" width="104" height="26" rx="13" fill="rgba(255,255,255,.22)" />
      <rect x="28" y="76" width="270" height="14" rx="7" fill="rgba(255,255,255,.22)" />
      <rect x="28" y="101" width="222" height="10" rx="5" fill="rgba(255,255,255,.16)" />
      <text x="32" y="174" fill="#fffaf0" fontFamily="monospace" fontSize="44" fontWeight="800">{initials}</text>
    </svg>
  );
}

function MobileIcon({ name, size = 16 }: { name: string; size?: number }) {
  const map: Record<string, LucideIcon> = {
    archive: Archive,
    bell: Bell,
    brief: FileText,
    camera: Eye,
    cards: Grid3X3,
    chat: MessageSquare,
    chevron: ChevronRight,
    file: FileText,
    home: Home,
    inbox: Inbox,
    map: Map,
    me: User,
    mic: Mic,
    notebook: BookOpen,
    plus: Plus,
    reports: FileText,
    search: Search,
    send: Send,
    settings: Settings,
    source: ShieldCheck,
    thread: MoreHorizontal,
  };
  const Icon = map[name] ?? Sparkles;
  return <Icon size={size} strokeWidth={1.8} aria-hidden />;
}

function ResponsiveSurface({
  mobile,
  children,
}: {
  mobile: MobileSurface;
  children: ReactNode;
}) {
  return (
    <>
      <div className="md:hidden">
        <ExactMobileSurface surface={mobile} />
      </div>
      <div className="nb-kit hidden min-h-full md:block">
        <div className="nb-shell">{children}</div>
      </div>
    </>
  );
}

export function ExactHomeSurface(_props: WebSurfaceProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [lane, setLane] = useState<LaneId>("answer");

  const start = (nextQuery = query) => {
    const resolved = nextQuery.trim() || PROMPT_CARDS[0].prompt;
    navigate(buildCockpitPath({ surfaceId: "workspace", extra: { q: resolved, lane } }));
  };

  return (
    <ResponsiveSurface mobile="home">
      <section className="nb-composer-hero">
        <div className="nb-kicker">Entity intelligence</div>
        <h1>What are we researching today?</h1>
        <p>Answer-first. Backed by sources. Saved reports become reusable memory.</p>

        <div className="nb-composer-box" data-testid="exact-web-home-composer">
          <textarea
            className="nb-composer-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                start();
              }
            }}
            placeholder="Ask anything - a company, a market, or a question..."
            aria-label="Ask anything - a company, a market, or a question"
          />
          <div className="nb-composer-bottom">
            <div className="nb-lanes">
              {LANES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="nb-lane"
                  data-active={lane === item.id}
                  onClick={() => setLane(item.id)}
                >
                  {item.label}
                  <small>{item.note}</small>
                </button>
              ))}
            </div>
            <span style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
              <Command size={12} style={{ display: "inline", verticalAlign: "-2px" }} /> Enter
            </span>
            <button type="button" className="nb-btn nb-btn-primary" onClick={() => start()}>
              <Send size={14} />
              Start run
            </button>
          </div>
        </div>

        <div className="nb-prompt-grid">
          {PROMPT_CARDS.map(({ icon: Icon, prompt }) => (
            <button
              key={prompt}
              type="button"
              className="nb-prompt-card"
              onClick={() => {
                setQuery(prompt);
                start(prompt);
              }}
            >
              <span className="nb-prompt-icon"><Icon size={14} /></span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 800, lineHeight: 1.35 }}>
                {prompt}
              </span>
            </button>
          ))}
        </div>

        <div className="nb-install-chip">
          <span style={{ textTransform: "uppercase", letterSpacing: ".14em" }}>Use from Claude or Cursor</span>
          <code>npx nodebench-mcp</code>
          <a href="/cli" style={{ color: "var(--accent-ink)", fontWeight: 800, textDecoration: "none" }}>Developer docs -&gt;</a>
        </div>
      </section>
    </ResponsiveSurface>
  );
}

export function ExactReportsSurface() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState("all");
  const filteredReports = filter === "all" ? REPORTS : REPORTS.filter((report) => report.state.includes(filter));

  return (
    <ResponsiveSurface mobile="reports">
      <section>
        <div className="nb-reports-toolbar">
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 760, letterSpacing: "-0.02em" }}>Reports</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
              Reusable entity memory. Open serious work in workspace.nodebenchai.com.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div className="nb-view-toggle" aria-label="Report filter">
              {["all", "verified", "review", "watching"].map((item) => (
                <button key={item} type="button" data-active={filter === item} onClick={() => setFilter(item)}>
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
            <div className="nb-view-toggle" aria-label="Report view">
              <button type="button" data-active={view === "grid"} onClick={() => setView("grid")}><Grid3X3 size={13} /> Grid</button>
              <button type="button" data-active={view === "list"} onClick={() => setView("list")}><List size={13} /> List</button>
            </div>
          </div>
        </div>

        <div className="nb-reports-grid" data-view={view}>
          {filteredReports.map((report) => (
            <article
              key={report.id}
              className="nb-rcard"
              onClick={() => openWorkspace(report.id, "brief")}
              data-testid="report-card"
              data-exact-testid="exact-report-card"
            >
              <div className="nb-rcard-thumb">
                <ReportThumb label={report.title} colorA={report.colorA} colorB={report.colorB} />
                <div className="nb-rcard-thumb-overlay">
                  <span className="nb-badge nb-badge-accent">{report.kind}</span>
                  <span className={report.state === "verified" ? "nb-badge nb-badge-success" : "nb-badge"}>
                    {report.state}
                  </span>
                </div>
              </div>
              <div className="nb-rcard-body">
                <div className="nb-rcard-title">{report.title}</div>
                <div className="nb-rcard-sub">{report.summary}</div>
                <div data-testid="report-card-actions" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                  <button type="button" className="nb-btn nb-btn-secondary" onClick={(event) => { event.stopPropagation(); openWorkspace(report.id, "brief"); }}>Brief</button>
                  <button type="button" className="nb-btn nb-btn-secondary" aria-label="Explore workspace cards" onClick={(event) => { event.stopPropagation(); openWorkspace(report.id, "cards"); }}>Explore</button>
                  <button type="button" className="nb-btn nb-btn-secondary" aria-label="Ask NodeBench" onClick={(event) => { event.stopPropagation(); openWorkspace(report.id, "chat"); }}>Chat</button>
                </div>
                <div className="nb-rcard-foot">
                  <span>{report.sources} sources</span>
                  <span>{report.updated}</span>
                  <span className="nb-rcard-watch" data-on={report.watched}>
                    <Eye size={11} />
                    {report.watched ? "Watching" : "Watch"}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </ResponsiveSurface>
  );
}

export function ExactChatSurface() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "DISCO - worth reaching out? Fastest debrief.";
  const [query, setQuery] = useState(initialQuery);

  return (
    <ResponsiveSurface mobile="chat">
      <section className="nb-answer" data-testid="exact-web-chat-answer">
        <div className="nb-badge nb-badge-accent">
          <Sparkles size={12} />
          Answer packet
        </div>
        <h1>DISCO is worth a fast reach-out, but only after the EU compliance claim is verified.</h1>
        <div className="nb-reasoning">
          <ul className="nb-reasoning-list">
            <li><span className="nb-reasoning-dot" /> Resolved entity and existing report context</li>
            <li><span className="nb-reasoning-dot" /> Pulled current public sources and notebook claims</li>
            <li><span className="nb-reasoning-dot" /> Separated field-note claims from verified evidence</li>
          </ul>
        </div>
        <p className="nb-answer-p">
          The strongest signal is not the launch itself. It is that the product move directly addresses the risk
          already flagged in the saved diligence report <span className="nb-cite">1</span>. That makes the next action
          concrete: verify the SOC 2 Type II scope, then reopen the workspace and update the follow-up memo
          <span className="nb-cite">2</span>.
        </p>
        <p className="nb-answer-p">
          The report should stay in provisional mode until the claim is backed by an official source and one independent
          customer or partner signal <span className="nb-cite">3</span>.
        </p>

        <div className="nb-sources-grid">
          {["Company security page", "Saved DISCO diligence report", "EU launch note"].map((source, index) => (
            <div key={source} className="nb-source-card">
              <div style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: 11 }}>Source {index + 1}</div>
              <div style={{ marginTop: 5, fontWeight: 800 }}>{source}</div>
              <div style={{ marginTop: 5, color: "var(--text-muted)", fontSize: 12 }}>confidence {index === 0 ? "high" : "medium"}</div>
            </div>
          ))}
        </div>

        <div className="nb-followups">
          {["Verify the SOC2 claim", "Open DISCO workspace", "Draft the reach-out"].map((item) => (
            <button key={item} type="button" className="nb-followup-chip">{item}</button>
          ))}
        </div>

        <div className="nb-composer-box" style={{ marginTop: 22 }}>
          <textarea
            className="nb-composer-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask a follow-up..."
            aria-label="Chat follow-up"
          />
          <div className="nb-composer-bottom">
            <div className="nb-lanes">
              <span className="nb-lane" data-active="true">Scoped to current answer</span>
              <span className="nb-lane">3 citations</span>
            </div>
            <button type="button" className="nb-btn nb-btn-secondary" onClick={() => openWorkspace("disco-diligence", "chat")}>
              Open workspace
            </button>
            <button type="button" className="nb-btn nb-btn-primary" onClick={() => navigate(buildCockpitPath({ surfaceId: "packets" }))}>
              Save report
            </button>
          </div>
        </div>
      </section>
    </ResponsiveSurface>
  );
}

export function ExactInboxSurface() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "act" | "auto" | "watch">("all");
  const [items, setItems] = useState(() => [...INBOX_SEED]);
  const counts = useMemo(
    () => ({
      all: items.length,
      act: items.filter((item) => item.priority === "act").length,
      auto: items.filter((item) => item.priority === "auto").length,
      watch: items.filter((item) => item.priority === "watch").length,
    }),
    [items],
  );
  const visible = filter === "all" ? items : items.filter((item) => item.priority === filter);

  const act = (id: string, action: string) => {
    if (action === "dismiss" || action === "snooze") {
      setItems((current) => current.filter((item) => item.id !== id));
      return;
    }
    if (action === "open" || action === "rerun") {
      navigate(buildCockpitPath({ surfaceId: action === "open" ? "packets" : "workspace" }));
    }
  };

  return (
    <ResponsiveSurface mobile="inbox">
      <section>
        <div className="nb-inbox-head">
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 760, letterSpacing: "-0.02em" }}>Inbox</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
              Return at the right moment - only when something meaningful changed about an entity you watch.
            </p>
          </div>
          <div className="nb-inbox-filter" role="tablist" aria-label="Inbox filters">
            {[
              ["all", "All", counts.all],
              ["act", "Act", counts.act],
              ["auto", "Auto", counts.auto],
              ["watch", "Watching", counts.watch],
            ].map(([key, label, count]) => (
              <button key={key} type="button" data-active={filter === key} onClick={() => setFilter(key as typeof filter)}>
                {label} <span style={{ marginLeft: 5, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
          {visible.length === 0 ? (
            <div className="nb-panel" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
              <Check size={24} />
              <div style={{ marginTop: 8 }}>All caught up. New items arrive when watched entities move.</div>
            </div>
          ) : (
            visible.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="nb-ibx-row" data-priority={item.priority}>
                  <div className="nb-ibx-icon"><Icon size={15} /></div>
                  <div>
                    <div className="nb-ibx-top">
                      <span className="nb-ibx-entity">{item.entity}</span>
                      <span className="nb-ibx-title">{item.title}</span>
                      <span className="nb-ibx-when">{item.when}</span>
                    </div>
                    <div className="nb-ibx-msg">{item.body}</div>
                    <div className="nb-ibx-actions">
                      {item.actions.includes("rerun") ? <button className="primary" onClick={() => act(item.id, "rerun")}><GitBranch size={11} /> Re-run report</button> : null}
                      {item.actions.includes("draft") ? <button className="primary" onClick={() => act(item.id, "draft")}><Sparkles size={11} /> Draft brief</button> : null}
                      {item.actions.includes("open") && item.report ? <button onClick={() => act(item.id, "open")}><FileText size={11} /> Open {item.entity}</button> : null}
                      {item.actions.includes("watch") ? <button onClick={() => act(item.id, "watch")}><Eye size={11} /> Watch {item.entity}</button> : null}
                      {item.actions.includes("undo") ? <button onClick={() => act(item.id, "undo")}>Undo auto-promote</button> : null}
                      {item.actions.includes("snooze") ? <button onClick={() => act(item.id, "snooze")}><Clock3 size={11} /> Snooze 1h</button> : null}
                      {item.actions.includes("dismiss") ? <button onClick={() => act(item.id, "dismiss")}><X size={11} /> Dismiss</button> : null}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <span className="nb-ibx-priority">{item.priority === "act" ? "act now" : item.priority === "auto" ? "auto-handled" : item.priority === "watch" ? "watching" : "fyi"}</span>
                    <span style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>
                      +{item.deltaSources} source{item.deltaSources > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </ResponsiveSurface>
  );
}

export function ExactMeSurface() {
  const [section, setSection] = useState("notebook");
  const [entities, setEntities] = useState([
    { id: "disco", name: "DISCO", tag: "legal tech", lastReport: "Nov 14", reports: 3, changes: 2 },
    { id: "mercor", name: "Mercor", tag: "hiring", lastReport: "Nov 12", reports: 4, changes: 5 },
    { id: "cognition", name: "Cognition", tag: "agents", lastReport: "Nov 10", reports: 2, changes: 1 },
    { id: "turing", name: "Turing", tag: "services", lastReport: "Nov 03", reports: 5, changes: 0 },
    { id: "anthropic", name: "Anthropic", tag: "foundation", lastReport: "Oct 28", reports: 1, changes: 3 },
    { id: "openai", name: "OpenAI", tag: "foundation", lastReport: "Oct 22", reports: 6, changes: 4 },
  ]);
  const nav = [
    { group: "Account", items: [{ id: "notebook", label: "Notebook", icon: BookOpen, count: entities.length }, { id: "profile", label: "Profile", icon: User }] },
    { group: "Preferences", items: [{ id: "notifications", label: "Notifications", icon: Bell }, { id: "pace", label: "Pace & feel", icon: Zap }, { id: "data", label: "Data & memory", icon: FileText }] },
    { group: "Workspace", items: [{ id: "integrations", label: "Integrations", icon: Link2 }, { id: "usage", label: "Usage", icon: Sparkles }] },
  ];

  return (
    <ResponsiveSurface mobile="me">
      <section className="nb-me-grid">
        <aside className="nb-me-sidenav">
          <div className="hd">
            <div className="av">HS</div>
            <div style={{ minWidth: 0 }}>
              <div className="nm">Homen Shum</div>
              <div className="em">homen@nodebench.ai</div>
            </div>
          </div>
          {nav.map((group) => (
            <div key={group.group}>
              <div className="section-title">{group.group}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" data-active={section === item.id} onClick={() => setSection(item.id)}>
                    <Icon size={14} />
                    <span>{item.label}</span>
                    {"count" in item ? <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11 }}>{item.count}</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        <section>
          {section === "notebook" ? (
            <div>
              <h1 className="nb-settings-h1">Notebook</h1>
              <p className="nb-settings-sub">Entities you have taught NodeBench to watch. Reports and Inbox items anchor to these.</p>
              <div className="nb-settings-section" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", padding: "14px 20px" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800 }}>{entities.length} watched entities</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11.5 }}>New reports automatically link to entities they mention.</div>
                  </div>
                  <button className="nb-btn nb-btn-secondary" type="button"><Plus size={13} /> Add entity</button>
                </div>
                {entities.map((entity, index) => (
                  <div
                    key={entity.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "36px 1fr auto auto",
                      gap: 14,
                      alignItems: "center",
                      borderTop: index === 0 ? 0 : "1px solid var(--border-subtle)",
                      padding: "12px 20px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9, background: "var(--accent-primary-tint)", color: "var(--accent-ink)", fontWeight: 800 }}>
                      {entity.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 750 }}>{entity.name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
                        {entity.tag} - {entity.reports} reports - last activity {entity.lastReport}
                        {entity.changes > 0 ? <span style={{ color: "var(--accent-primary)", marginLeft: 6, fontWeight: 800 }}>- {entity.changes} new</span> : null}
                      </div>
                    </div>
                    <button type="button" className="nb-btn nb-btn-secondary"><FileText size={12} /> Reports</button>
                    <button type="button" className="nb-btn" aria-label="Unwatch" onClick={() => setEntities((current) => current.filter((item) => item.id !== entity.id))}><X size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {section === "profile" ? <ProfileSettings /> : null}
          {section === "notifications" ? <NotificationSettings /> : null}
          {section === "pace" ? <PaceSettings /> : null}
          {section === "data" ? <DataSettings /> : null}
          {section === "integrations" ? <IntegrationsSettings /> : null}
          {section === "usage" ? <UsageSettings /> : null}
        </section>
      </section>
    </ResponsiveSurface>
  );
}

function ProfileSettings() {
  return (
    <div>
      <h1 className="nb-settings-h1">Profile</h1>
      <p className="nb-settings-sub">How you appear inside NodeBench and on shared reports.</p>
      <div className="nb-settings-section">
        <h2>Identity</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Name and email shown on anything you share.</p>
        <SettingField label="Display name"><input type="text" defaultValue="Homen Shum" /></SettingField>
        <SettingField label="Email"><input type="email" defaultValue="homen@nodebench.ai" /></SettingField>
        <SettingField label="Role"><select defaultValue="founder"><option value="founder">Founder</option><option value="investor">Investor</option><option value="analyst">Analyst</option></select></SettingField>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const [values, setValues] = useState({ act: true, auto: true, watch: true, fyi: false });
  return (
    <div>
      <h1 className="nb-settings-h1">Notifications</h1>
      <p className="nb-settings-sub">Only four rings. Silence the ones you do not need.</p>
      <div className="nb-settings-section">
        {[
          ["act", "Act-now items", "Materially changes a saved report"],
          ["auto", "Auto-handled", "Report was refreshed or promoted automatically"],
          ["watch", "Watching", "Entity you follow moved but no report affected"],
          ["fyi", "FYI", "Filings refreshed, no material change"],
        ].map(([key, label, hint]) => (
          <SettingField key={key} label={label} hint={hint}>
            <button type="button" className="nb-switch" data-on={values[key as keyof typeof values]} onClick={() => setValues((current) => ({ ...current, [key]: !current[key as keyof typeof values] }))} />
          </SettingField>
        ))}
      </div>
    </div>
  );
}

function PaceSettings() {
  const [pace, setPace] = useState("conversational");
  return (
    <div>
      <h1 className="nb-settings-h1">Pace & feel</h1>
      <p className="nb-settings-sub">How NodeBench shows its thinking.</p>
      <div className="nb-settings-section">
        <SettingField label="Pace">
          {["instant", "conversational", "deliberate"].map((item) => (
            <button key={item} type="button" className={pace === item ? "nb-btn nb-btn-primary" : "nb-btn nb-btn-secondary"} onClick={() => setPace(item)}>
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </SettingField>
        <SettingField label="Texture"><button className="nb-switch" data-on={false} /></SettingField>
        <SettingField label="Show trace"><button className="nb-switch" data-on={true} /></SettingField>
      </div>
    </div>
  );
}

function DataSettings() {
  return (
    <div>
      <h1 className="nb-settings-h1">Data & memory</h1>
      <p className="nb-settings-sub">What NodeBench retains across sessions.</p>
      <div className="nb-settings-section">
        <SettingField label="Keep unsaved runs"><select defaultValue="30"><option value="7">7 days</option><option value="30">30 days</option><option value="forever">Keep forever</option></select></SettingField>
        <SettingField label="Learn from saves"><button className="nb-switch" data-on={true} /></SettingField>
        <SettingField label="Learn from dismisses"><button className="nb-switch" data-on={true} /></SettingField>
      </div>
    </div>
  );
}

function IntegrationsSettings() {
  return (
    <div>
      <h1 className="nb-settings-h1">Integrations</h1>
      <p className="nb-settings-sub">Where NodeBench reaches out from - never in.</p>
      <div className="nb-settings-section">
        {["Slack", "Gmail", "Linear", "Notion", "Calendar"].map((name, index) => (
          <SettingField key={name} label={name} hint={index < 2 ? "Connected" : "Not connected"}>
            <button className={index < 2 ? "nb-btn nb-btn-secondary" : "nb-btn nb-btn-primary"} type="button">
              {index < 2 ? "Disconnect" : "Connect"}
            </button>
          </SettingField>
        ))}
      </div>
    </div>
  );
}

function UsageSettings() {
  return (
    <div>
      <h1 className="nb-settings-h1">Usage</h1>
      <p className="nb-settings-sub">Current billing period. Resets monthly.</p>
      <div className="nb-settings-section">
        {[
          ["Runs this month", "84 / 200"],
          ["Saved reports", "17 / 50"],
          ["Watched entities", "12 / 25"],
          ["Source credits", "1,840 / 2,500"],
        ].map(([label, value]) => (
          <SettingField key={label} label={label}><span style={{ fontFamily: "var(--font-mono)", fontWeight: 800 }}>{value}</span></SettingField>
        ))}
        <button type="button" className="nb-btn nb-btn-primary">Upgrade to Team</button>
      </div>
    </div>
  );
}

function SettingField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="nb-field">
      <div className="nb-field-l">{label}{hint ? <span className="hint">{hint}</span> : null}</div>
      <div className="nb-field-r">{children}</div>
    </div>
  );
}

function ExactMobileSurface({ surface }: { surface: MobileSurface }) {
  const [reportTab, setReportTab] = useState<"brief" | "sources" | "notebook">("brief");
  const topTitle: Record<MobileSurface, string> = {
    home: "NodeBench",
    reports: "DISCO report",
    chat: "NodeBench Chat",
    inbox: "Inbox",
    me: "Me",
  };
  return (
    <div className="nb-mobile-kit">
      <div className="m-screen">
        <header className="m-top">
          <button className="m-icon-btn" aria-label="Menu"><MobileIcon name="thread" /></button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="m-title">{topTitle[surface]}</div>
            <div className="m-top-sub">{surface === "home" ? "Disco Corp. - workspace" : "capture to intelligence"}</div>
          </div>
          <button className="m-icon-btn" aria-label="Notifications"><MobileIcon name="bell" /></button>
        </header>

        {surface === "home" ? <MobileHomeBody /> : null}
        {surface === "chat" ? <MobileChatBody /> : null}
        {surface === "reports" ? (
          <div className="m-body">
            <div className="m-sub-tabs">
              {(["brief", "sources", "notebook"] as const).map((tab) => (
                <button key={tab} type="button" className="m-sub-tab" data-active={reportTab === tab} onClick={() => setReportTab(tab)}>
                  {tab[0].toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            {reportTab === "brief" ? <MobileBriefBody embedded /> : null}
            {reportTab === "sources" ? <MobileSourcesBody embedded /> : null}
            {reportTab === "notebook" ? <MobileNotebookBody embedded /> : null}
          </div>
        ) : null}
        {surface === "inbox" ? <MobileInboxBody /> : null}
        {surface === "me" ? <MobileMeBody /> : null}
      </div>
    </div>
  );
}

function MobileHomeBody() {
  return (
    <main className="m-body">
      <div className="m-home-greet">
        <h2>Good morning, Homen.</h2>
        <p>Four signals on your watchlist this morning.</p>
      </div>
      <div className="m-search">
        <MobileIcon name="search" />
        <input placeholder="Ask NodeBench about any company..." readOnly />
        <kbd>Cmd K</kbd>
      </div>
      <section className="m-section">
        <header className="m-section-head"><span className="kicker">Watchlist</span><a href="/?surface=reports">Manage</a></header>
        <div className="m-watch">
          {WATCHLIST.map((item) => (
            <div key={item.id} className="m-watch-tile">
              <div className="m-watch-tile-head">
                <div className="m-watch-tile-avatar" style={{ background: item.avatar }}>{item.initials}</div>
                <div className="m-watch-tile-name">{item.name}</div>
                <div className="m-watch-tile-ticker">{item.ticker}</div>
              </div>
              <div className="m-watch-tile-val"><strong>{item.value}</strong><span className="delta" data-trend={item.trend}>{item.delta}</span></div>
              <div className="m-watch-tile-meta">{item.meta}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="m-section">
        <header className="m-section-head"><span className="kicker">Since you were last here</span><a href="/?surface=inbox">All 5</a></header>
        <div className="m-nudges">
          {INBOX_SEED.slice(0, 3).map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="m-nudge">
                <div className="m-nudge-icon"><Icon size={14} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="m-nudge-title">{item.title}</div>
                  <div className="m-nudge-meta"><span>{item.entity}</span><span>{item.when}</span></div>
                </div>
                <MobileIcon name="chevron" />
              </div>
            );
          })}
        </div>
      </section>
      <section className="m-section">
        <header className="m-section-head"><span className="kicker">Recent threads</span><a href="/?surface=chat">View all</a></header>
        <div className="m-threads">
          {THREADS.map((thread) => (
            <div key={thread.id} className="m-thread">
              <div className="m-thread-icon"><MobileIcon name="chat" size={14} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="m-thread-title">{thread.title}</div>
                <div className="m-thread-meta">{thread.meta}</div>
              </div>
              <MobileIcon name="chevron" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function MobileChatBody() {
  return (
    <main className="m-body m-chat-body">
      <div className="m-chat-query">
        <div className="m-chat-query-u">HS</div>
        <div className="m-chat-query-t">Is DISCO worth reaching out to this week?</div>
      </div>
      <div className="m-chat-runbar">
        <span className="pill pill-accent">research run</span>
        <span className="pill pill-ok">24 sources</span>
        <span className="pill pill-neutral">saved context</span>
      </div>
      <h1 className="m-chat-title">Reach out, but verify the EU compliance claim first.</h1>
      <p className="m-chat-p">DISCO now looks more actionable because its newest source directly addresses a risk already flagged in the saved diligence report.</p>
      <div className="m-chat-callout">
        <div className="m-chat-callout-head"><Sparkles size={12} /> So what</div>
        <p>The next best action is not a generic intro. Verify the claim, then send a tight follow-up around regulated EU expansion.</p>
      </div>
      <div className="m-strip-head"><span className="kicker">Entities</span><a href="/?surface=reports">Open cards</a></div>
      <div className="m-strip">
        {WATCHLIST.slice(0, 3).map((item) => (
          <div key={item.id} className="m-card">
            <div className="m-card-head">
              <div className="m-card-avatar" style={{ background: item.avatar }}>{item.initials}</div>
              <div><div className="m-card-name">{item.name}</div><div className="m-card-sub">{item.meta}</div></div>
            </div>
            <div className="m-card-metrics">
              <div><div className="m-card-metric-l">Signal</div><div className="m-card-metric-v" data-trend={item.trend}>{item.value}</div></div>
              <div><div className="m-card-metric-l">Delta</div><div className="m-card-metric-v" data-trend={item.trend}>{item.delta}</div></div>
            </div>
          </div>
        ))}
      </div>
      <div className="m-strip-head"><span className="kicker">Top sources</span><a href="/?surface=reports">View all</a></div>
      {["Security page", "Saved report", "Launch note"].map((source, index) => (
        <div key={source} className="m-src-row">
          <MobileIcon name="source" />
          <div style={{ flex: 1 }}>
            <div className="m-src-title">{source}</div>
            <div className="m-src-meta"><span>source {index + 1}</span><span>medium confidence</span></div>
          </div>
        </div>
      ))}
      <div className="m-followups">
        {["Verify", "Open card", "Draft reply"].map((item) => <button key={item} className="m-followup">{item}</button>)}
      </div>
      <div className="m-composer-dock">
        <input placeholder="Ask a follow-up..." />
        <button className="m-composer-send" aria-label="Send"><MobileIcon name="send" /></button>
      </div>
    </main>
  );
}

function MobileBriefBody({ embedded = false }: { embedded?: boolean }) {
  return (
    <main className={embedded ? "m-brief-body" : "m-body m-brief-body"}>
      <div className="m-brief-kicker"><span className="pill pill-accent">Brief</span><span className="pill pill-ok">Verified</span></div>
      <h1 className="m-brief-title">DISCO diligence debrief</h1>
      <p className="m-brief-sub">A concise read on why this company matters now, what changed, and what to do next.</p>
      <div className="m-brief-meta">
        <span className="pill pill-neutral">24 sources</span>
        <span className="pill pill-neutral">6 entities</span>
        <span className="pill pill-warn">2 claims to verify</span>
      </div>
      <section className="m-verdict">
        <span className="kicker">Verdict</span>
        <h2>Reach out after verification.</h2>
        <p>The compliance update removes one concern, but the funding and customer claims still need public evidence before the report becomes canonical.</p>
      </section>
      <div className="m-stats">
        <div className="m-stat"><div className="m-stat-v" data-trend="up">84</div><div className="m-stat-l">Signal score</div></div>
        <div className="m-stat"><div className="m-stat-v">24</div><div className="m-stat-l">Sources</div></div>
      </div>
      <div className="m-triad">
        <div className="m-triad-card"><span className="kicker">What</span><h3>Legal AI workflow company</h3><p>Strongest signal is regulated workflow expansion.</p></div>
        <div className="m-triad-card"><span className="kicker">So what</span><h3>Risk posture changed</h3><p>The latest source may flip a prior review flag.</p></div>
        <div className="m-triad-card"><span className="kicker">Now what</span><h3>Verify, then follow up</h3><p>Keep the field-note claims separate until evidence lands.</p></div>
      </div>
      <h3 className="m-h3"><Clock3 size={14} /> Timeline</h3>
      {["Today", "Yesterday", "Nov 14"].map((date) => (
        <div key={date} className="m-timeline-row">
          <div className="m-timeline-date">{date}</div>
          <div><div className="m-timeline-t">Signal added</div><div className="m-timeline-m">Claim attached to report and routed to verification.</div></div>
        </div>
      ))}
    </main>
  );
}

function MobileSourcesBody({ embedded = false }: { embedded?: boolean }) {
  return (
    <main className={embedded ? "m-src-body" : "m-body m-src-body"}>
      <div className="m-src-head">
        <span className="kicker">Sources</span>
        <h2>Claims and evidence</h2>
      </div>
      {["SOC2 EU scope is available", "Hiring spike implies infra investment", "Customer claim needs verification"].map((claim, index) => (
        <div key={claim} className="m-claim">
          <div className="m-claim-q">{claim}</div>
          <div className="m-claim-status">
            <span className={index === 2 ? "pill pill-warn" : "pill pill-ok"}>{index === 2 ? "needs review" : "verified"}</span>
            <span className="pill pill-neutral">{index + 2} sources</span>
          </div>
        </div>
      ))}
    </main>
  );
}

function MobileNotebookBody({ embedded = false }: { embedded?: boolean }) {
  return (
    <main className={embedded ? "m-notebook-body" : "m-body m-notebook-body"}>
      <h1 className="m-notebook-title">DISCO memo</h1>
      <div className="m-notebook-meta"><span className="pill pill-accent">living note</span><span className="pill pill-neutral">auto-saved</span></div>
      <p className="m-notebook-p">The strongest signal is that DISCO's compliance movement is directly connected to a previously identified blocker.</p>
      <h2 className="m-notebook-h2">Next paragraph</h2>
      <p className="m-notebook-p">Keep the reach-out short. Mention the EU compliance update, ask for scope details, and verify whether the launch changes customer readiness.</p>
      <div className="m-notebook-proposal">
        <span className="kicker">Agent proposal</span>
        <div className="m-notebook-proposal-note">Insert a verification checklist before the follow-up draft.</div>
      </div>
    </main>
  );
}

function MobileInboxBody() {
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? INBOX_SEED : INBOX_SEED.filter((item) => item.priority === filter);
  return (
    <main className="m-body">
      <div className="m-inbox-tabs">
        {["all", "act", "auto", "watch"].map((tab) => (
          <button key={tab} className="m-inbox-tab" data-active={filter === tab} onClick={() => setFilter(tab)}>
            {tab === "all" ? "All" : tab}
          </button>
        ))}
      </div>
      <section className="m-inbox-section">
        <div className="m-inbox-section-head">Inbox queue</div>
        <div className="m-inbox-list">
          {visible.map((item) => (
            <button key={item.id} type="button" className="m-inbox-row" data-unread={item.priority === "act"}>
              <div className="m-inbox-row-avatar" style={{ background: item.priority === "act" ? "#d97757" : "#5e6ad2" }}>{item.entity[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="m-inbox-row-title">{item.title}</div>
                <div className="m-inbox-row-snippet">{item.body}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function MobileMeBody() {
  return (
    <main className="m-body">
      <section className="m-me-identity">
        <div className="m-me-avatar" style={{ background: "linear-gradient(135deg,#D97757,#5E6AD2)" }}>HS</div>
        <div className="m-me-identity-main">
          <div className="m-me-name">Homen Shum</div>
          <div className="m-me-email">homen@nodebench.ai</div>
        </div>
        <button className="m-me-edit">Edit</button>
      </section>
      <section className="m-me-stats">
        {[
          ["17", "reports"],
          ["12", "watched"],
          ["84", "runs"],
          ["2.4k", "sources"],
        ].map(([value, label]) => (
          <div key={label} className="m-me-stat"><div className="m-me-stat-v">{value}</div><div className="m-me-stat-l">{label}</div></div>
        ))}
      </section>
      <section className="m-me-section">
        <div className="m-me-section-head">Workspaces</div>
        <div className="m-me-ws-list">
          {REPORTS.slice(0, 4).map((report) => (
            <button key={report.id} type="button" className="m-me-ws-row">
              <div className="m-me-ws-avatar" style={{ background: report.colorA }}>{report.title[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div className="m-me-ws-name">{report.title}</div><div className="m-me-ws-meta">{report.sources} sources</div></div>
            </button>
          ))}
        </div>
      </section>
      <section className="m-me-section">
        <div className="m-me-section-head">Settings</div>
        {["Evidence mode", "Files", "Credits", "Integrations"].map((item) => (
          <button key={item} type="button" className="m-me-setting-row">
            <div className="m-me-setting-icon"><MobileIcon name="settings" /></div>
            <div style={{ flex: 1 }}><div className="m-me-setting-label">{item}</div><div className="m-me-setting-value">Configured</div></div>
          </button>
        ))}
      </section>
    </main>
  );
}

export function ExactWorkspaceKitPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspaceId = useMemo(() => getWorkspaceId(location.pathname), [location.pathname]);
  const activeTab = getWorkspaceTab(searchParams.get("tab"));
  const setTab = (tab: WorkspaceTab) => navigate(buildLocalWorkspacePath({ workspaceId, tab }), { replace: true });

  return (
    <div className="ws-kit" data-testid="exact-workspace-page">
      <div className="ws-shell">
        <header className="ws-header">
          <button type="button" className="ws-brand" aria-label="NodeBench workspace">
            <span className="ws-logo">N</span>
            <span>NodeBench <span style={{ color: "#d97757" }}>AI</span></span>
          </button>
          <div className="ws-entity-chip">
            <span className="ws-chip-icon">SD</span>
            <strong>Ship Demo Day</strong>
            <span style={{ color: "#6b7280", fontFamily: "var(--font-mono)", fontSize: 11 }}>workspace / {workspaceId}</span>
          </div>
          <nav className="ws-tabs" aria-label="Workspace tabs">
            {WORKSPACE_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} type="button" className="ws-tab" data-active={activeTab === tab.id} onClick={() => setTab(tab.id)}>
                  <Icon size={13} />
                  {tab.label}
                  {tab.count ? <span style={{ color: "#ad5f45", fontFamily: "var(--font-mono)", fontSize: 10 }}>{tab.count}</span> : null}
                </button>
              );
            })}
          </nav>
          <button className="m-icon-btn" aria-label="Share"><Share2 size={15} /></button>
          <button className="m-icon-btn" aria-label="Search"><Search size={15} /></button>
        </header>
        <div className="ws-main">
          <main className="ws-content">
            {activeTab === "brief" ? <WorkspaceBrief /> : null}
            {activeTab === "cards" ? <WorkspaceCards /> : null}
            {activeTab === "notebook" ? <WorkspaceNotebook /> : null}
            {activeTab === "sources" ? <WorkspaceSources /> : null}
            {activeTab === "chat" ? <WorkspaceChat /> : null}
            {activeTab === "map" ? <WorkspaceMap /> : null}
          </main>
          <aside className="ws-aside">
            <WorkspaceInspector activeTab={activeTab} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function WorkspacePage({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <section className="ws-page">
      <div className="ws-kicker">{kicker}</div>
      <h1 className="ws-title">{title}</h1>
      {children}
    </section>
  );
}

function WorkspaceBrief() {
  return (
    <WorkspacePage kicker="Brief" title="Messy capture to event intelligence.">
      <div className="ws-grid">
        <div className="ws-panel">
          <p>NodeBench keeps the operating app calm, then opens this deep workspace when a report needs recursive exploration. The active report separates field-note claims from verified evidence and keeps follow-ups attached to the entity graph.</p>
          <div className="ws-metric-row">
            <div className="ws-metric"><strong>18</strong><span>Entities</span></div>
            <div className="ws-metric"><strong>11</strong><span>Claims</span></div>
            <div className="ws-metric"><strong>7</strong><span>Follow-ups</span></div>
          </div>
        </div>
        <div className="ws-panel">
          <div className="ws-kicker">Next action</div>
          <h2>Verify the seed-stage claims.</h2>
          <p>Keep the live note useful without polluting the canonical graph. Promote Orbital Labs after company evidence and founder profile are attached.</p>
          <button className="nb-kit nb-btn nb-btn-primary" type="button">Open verification queue</button>
        </div>
      </div>
    </WorkspacePage>
  );
}

function WorkspaceCards() {
  const cards = [
    ["Orbital Labs", "Company", "Voice-agent eval infrastructure. Seed stage. Looking for healthcare design partners.", "86%"],
    ["Alex Chen", "Person", "Founder contact from Ship Demo Day. Needs pilot criteria and buyer intro path.", "78%"],
    ["Healthcare design partners", "Market", "Likely wedge for call-center QA, prior auth operations, and clinical support workflows.", "72%"],
    ["Verification queue", "Claims", "Traction and seed-stage claims stay field-note status until public evidence is attached.", "64%"],
  ];
  return (
    <WorkspacePage kicker="Cards" title="Recursive entities, claims, and next hops.">
      <div className="ws-grid-3">
        {cards.map(([name, type, summary, confidence]) => (
          <article key={name} className="ws-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div><div style={{ color: "#ad5f45", fontSize: 12, fontWeight: 800 }}>{type}</div><h3>{name}</h3></div>
              <span style={{ alignSelf: "start", border: "1px solid rgba(15,23,42,.06)", borderRadius: 999, padding: "4px 8px", color: "#6b7280", fontFamily: "var(--font-mono)", fontSize: 11 }}>{confidence}</span>
            </div>
            <p>{summary}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Open card", "Go deeper", "Verify"].map((action) => <span key={action} className="nb-kit nb-badge">{action}</span>)}
            </div>
          </article>
        ))}
      </div>
    </WorkspacePage>
  );
}

function WorkspaceNotebook() {
  return (
    <WorkspacePage kicker="Notebook" title="Living memo from captures and evidence.">
      <div className="ws-note-paper">
        <RichNotebookEditor
          initialContent={`<h2>Ship Demo Day memo</h2><p>The strongest signal is not one company. It is the repeated pattern: voice-agent infrastructure companies are looking for narrow design partners where evaluation failures have direct operational cost.</p><p>Orbital Labs belongs in the follow-up queue once the seed claim is verified. Ask for pilot criteria, deployment surface, and whether healthcare is a real wedge.</p>`}
          storageKey="nodebench.workspace.ship-demo-day.exact-kit"
          testId="workspace-notebook-editor"
          className="border-0 bg-transparent p-0 shadow-none"
          editorClassName="font-serif"
        />
      </div>
    </WorkspacePage>
  );
}

function WorkspaceSources() {
  const sources = [
    ["Voice memo transcript", "field evidence", "field_note"],
    ["Notebook photo OCR", "capture", "needs_review"],
    ["Company website", "public source", "provisionally_verified"],
    ["LinkedIn profile", "public source", "provisionally_verified"],
    ["Event attendee list", "event context", "needs_review"],
  ];
  return (
    <WorkspacePage kicker="Sources" title="Evidence and verification status.">
      <div className="ws-panel">
        {sources.map(([label, type, status]) => (
          <div key={label} className="ws-source-row">
            <div><strong>{label}</strong><div style={{ color: "#6b7280", fontSize: 12, marginTop: 3 }}>{type}</div></div>
            <span className="nb-kit nb-badge">{status}</span>
          </div>
        ))}
      </div>
    </WorkspacePage>
  );
}

function WorkspaceChat() {
  return (
    <div className="ws-chat-shell">
      <aside className="ws-chat-rail">
        <button className="nb-kit nb-btn nb-btn-primary" type="button" style={{ width: "100%" }}><Plus size={14} /> New thread</button>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {THREADS.map((thread, index) => (
            <button key={thread.id} className="nb-kit nb-btn nb-btn-secondary" type="button" style={{ justifyContent: "flex-start", width: "100%" }}>
              {index === 0 ? <span style={{ width: 6, height: 6, borderRadius: 999, background: "#d97757" }} /> : null}
              {thread.title}
            </button>
          ))}
        </div>
      </aside>
      <section className="ws-chat-thread">
        <div className="ws-chat-scroll">
          <div className="ws-chat-turn">
            <div className="ws-chat-avatar">HS</div>
            <div><strong>Homen</strong><p>Met Alex from Orbital Labs. Voice agent eval infra, seed, wants healthcare design partners.</p></div>
          </div>
          <div className="ws-chat-turn">
            <div className="ws-chat-avatar">N</div>
            <div>
              <strong>NodeBench</strong>
              <p>Saved to Ship Demo Day. I extracted Alex Chen, Orbital Labs, voice-agent eval infrastructure, healthcare design partners, and one follow-up about pilot criteria.</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Open card", "Move", "Go deeper", "Verify"].map((item) => <span key={item} className="nb-kit nb-badge nb-badge-accent">{item}</span>)}
              </div>
            </div>
          </div>
        </div>
        <div className="ws-chat-composer">
          <div className="ws-chat-field">
            <textarea placeholder="Ask with this workspace attached..." />
            <button className="nb-kit nb-btn nb-btn-primary" type="button"><Send size={14} /></button>
          </div>
        </div>
      </section>
    </div>
  );
}

function WorkspaceMap() {
  return (
    <WorkspacePage kicker="Map" title="Relationship graph for the report.">
      <svg className="ws-map" viewBox="0 0 900 520" role="img" aria-label="Workspace relationship map">
        <rect width="900" height="520" fill="#fbf9f6" />
        <circle cx="450" cy="260" r="210" fill="rgba(217,119,87,.10)" />
        <GraphEdge x1={450} y1={260} x2={240} y2={160} label="founder" />
        <GraphEdge x1={450} y1={260} x2={665} y2={155} label="market" />
        <GraphEdge x1={450} y1={260} x2={255} y2={365} label="claim" />
        <GraphEdge x1={450} y1={260} x2={655} y2={365} label="source" />
        <GraphNode x={450} y={260} label="Orbital Labs" kind="Company" color="#0f4c81" large />
        <GraphNode x={240} y={160} label="Alex Chen" kind="Person" color="#475569" />
        <GraphNode x={665} y={155} label="Healthcare" kind="Market" color="#c77826" />
        <GraphNode x={255} y={365} label="Seed claim" kind="Claim" color="#0e7a5c" />
        <GraphNode x={655} y={365} label="Evidence" kind="Source" color="#7a50b8" />
      </svg>
    </WorkspacePage>
  );
}

function GraphEdge({ x1, y1, x2, y2, label }: { x1: number; y1: number; x2: number; y2: number; label: string }) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d97757" strokeWidth={1.7} />
      <rect x={midX - 34} y={midY - 9} width={68} height={18} rx={9} fill="#faf8f5" stroke="#d7d0c8" />
      <text x={midX} y={midY + 3} textAnchor="middle" fontSize={10} fontWeight={800} fill="#6b7280">{label}</text>
    </g>
  );
}

function GraphNode({ x, y, label, kind, color, large = false }: { x: number; y: number; label: string; kind: string; color: string; large?: boolean }) {
  const radius = large ? 42 : 32;
  return (
    <g>
      <circle cx={x} cy={y} r={radius + 4} fill="rgba(255,255,255,.78)" stroke="rgba(15,23,42,.08)" />
      <circle cx={x} cy={y} r={radius} fill={color} />
      <text x={x} y={y - 2} textAnchor="middle" fontSize={large ? 12 : 11} fontWeight={800} fill="#fffaf0">
        {label.split(" ").map((part) => part[0]).join("").slice(0, 2)}
      </text>
      <text x={x} y={y + radius + 18} textAnchor="middle" fontSize={12} fontWeight={800} fill="#111827">{label}</text>
      <text x={x} y={y + radius + 33} textAnchor="middle" fontSize={10} fill="#6b7280">{kind}</text>
    </g>
  );
}

function WorkspaceInspector({ activeTab }: { activeTab: WorkspaceTab }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="ws-panel">
        <div className="ws-kicker">Separate surface</div>
        <p>Workspace is not a sixth tab. The operating app opens deep work here from Chat, Reports, and Inbox.</p>
        <div style={{ border: "1px solid rgba(15,23,42,.06)", borderRadius: 8, background: "#f5f4f1", padding: 12, fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.7 }}>
          nodebenchai.com: Home / Reports / Chat / Inbox / Me<br />
          workspace.nodebenchai.com: Brief / Cards / Notebook / Sources / Chat / Map
        </div>
      </div>
      <div className="ws-panel">
        <div className="ws-kicker">Scenario test</div>
        <h2>Live event capture</h2>
        <p>Intent: capture_field_note. Target: active event report. Ack: Saved to Ship Demo Day.</p>
        <span className="nb-kit nb-badge nb-badge-accent">Current tab: {activeTab}</span>
      </div>
    </div>
  );
}

export function ExactMcpTerminalPage() {
  const copyCommand = "claude mcp add nodebench -- npx -y nodebench-mcp";
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(copyCommand).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="nb-kit" style={{ minHeight: "100dvh", background: "#09090b", color: "#e5e7eb" }}>
      <div className="nb-shell">
        <a href="/" style={{ color: "#9ca3af", textDecoration: "none", fontSize: 13 }}>{"<- Back to NodeBench"}</a>
        <div style={{ marginTop: 28, display: "grid", gap: 18, gridTemplateColumns: "minmax(0,1.1fr) minmax(320px,.9fr)" }}>
          <section>
            <div className="nb-kicker" style={{ color: "#d97757" }}>CLI / MCP</div>
            <h1 style={{ margin: "8px 0", color: "#fff", fontSize: 42, lineHeight: 1.05, letterSpacing: "-.04em" }}>Bring NodeBench into Claude, Cursor, and agent workflows.</h1>
            <p style={{ color: "#a1a1aa", fontSize: 16, lineHeight: 1.7, maxWidth: 620 }}>The CLI/MCP kit is the distribution lane: plan, streamed checkpoints, answer packet, resource URIs, verification summary, and saved workspace links.</p>
            <button className="nb-btn nb-btn-primary" type="button" onClick={copy} style={{ marginTop: 18 }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copied" : "Copy install command"}
            </button>
          </section>
          <TerminalCard title="~/diligence - zsh - 120x32" badge="core lane">
            <TerminalLine>homen@mac &gt; claude mcp add nodebench -- npx -y nodebench-mcp</TerminalLine>
            <TerminalLine tone="ok">registered with Claude Code - nodebench-mcp</TerminalLine>
            <TerminalLine tone="ok">loaded tools - nodebench.research_run, nodebench.expand_resource</TerminalLine>
            <TerminalDivider />
            <TerminalLine>agent &gt; nodebench.research_run({"{"} objective: "Fast debrief on DISCO" {"}"})</TerminalLine>
            <TerminalLine tone="accent">plan - resolve entity, search, synthesize, verify</TerminalLine>
            <TerminalLine tone="ok">24 sources captured - answer packet streaming</TerminalLine>
            <div style={{ border: "1px solid rgba(217,119,87,.26)", borderRadius: 8, background: "rgba(217,119,87,.10)", padding: 12, color: "#f8fafc", fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.7 }}>
              Worth reaching out. Save the report, verify the claim, then open Workspace for cards and sources.
            </div>
            <TerminalLine tone="ok">verified - saved report URI nodebench://report/disco-diligence</TerminalLine>
          </TerminalCard>
        </div>
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
          {["nodebench.research_run", "nodebench.expand_resource"].map((tool) => (
            <section key={tool} style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, background: "rgba(255,255,255,.03)", padding: 18 }}>
              <div style={{ color: "#e59579", fontFamily: "var(--font-mono)", fontSize: 13 }}>{tool}</div>
              <p style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.7 }}>Outputs plan, checkpoints, answer packet, resource URIs, verification summary, and saved report link.</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function TerminalCard({ title, badge, children }: { title: string; badge: string; children: ReactNode }) {
  return (
    <section style={{ overflow: "hidden", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, background: "#0f1115", boxShadow: "0 24px 60px rgba(0,0,0,.32)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,.06)", background: "#171b22", padding: "12px 14px" }}>
        <span style={{ display: "flex", gap: 5 }}><i style={dot("#ff605c")} /><i style={dot("#ffbd44")} /><i style={dot("#00ca4e")} /></span>
        <span style={{ border: "1px solid rgba(255,255,255,.06)", borderRadius: 5, background: "rgba(255,255,255,.04)", color: "#e5e7eb", padding: "4px 8px", fontFamily: "var(--font-mono)", fontSize: 11 }}>{title}</span>
        <span style={{ marginLeft: "auto", border: "1px solid rgba(217,119,87,.3)", borderRadius: 5, background: "rgba(217,119,87,.10)", color: "#e59579", padding: "4px 8px", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>{badge}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 16 }}>{children}</div>
    </section>
  );
}

function TerminalLine({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "ok" }) {
  const color = tone === "ok" ? "#86efac" : tone === "accent" ? "#e59579" : "#cbd5e1";
  return <div style={{ color, fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.8 }}>{children}</div>;
}

function TerminalDivider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,.06)", margin: "6px 0" }} />;
}

function dot(background: string): CSSProperties {
  return { display: "inline-block", width: 10, height: 10, borderRadius: 999, background };
}
