import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Check,
  Clock,
  FileText,
  GitBranch,
  Globe2,
  LayoutGrid,
  Layers,
  Map,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { RichNotebookEditor } from "@/features/notebook/components/RichNotebookEditor";
import {
  buildWorkspaceRouteForHost,
  type WorkspaceTab,
} from "@/features/workspace/lib/workspaceRouting";

type WorkspaceTabDef = {
  id: WorkspaceTab;
  label: string;
  icon: LucideIcon;
  count?: number;
};

type WorkspaceMetric = {
  label: string;
  value: string;
  trend?: "up" | "down";
};

type WorkspaceCard = {
  id: string;
  name: string;
  initials: string;
  subtitle: string;
  kind: string;
  accent: string;
  kicker?: string;
  metrics: WorkspaceMetric[];
  footer?: string;
};

type WorkspaceSource = {
  n: number;
  title: string;
  domain: string;
  type: string;
  date: string;
  support: string;
};

type WorkspaceThread = {
  id: string;
  title: string;
  meta: string;
  query: string;
};

// Tab order matches docs/design/.../nodebench-workspace: Chat leads the deep-work shell.
const WORKSPACE_TABS: WorkspaceTabDef[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "brief", label: "Brief", icon: FileText },
  { id: "cards", label: "Cards", icon: LayoutGrid, count: 14 },
  { id: "notebook", label: "Notebook", icon: BookOpen },
  { id: "sources", label: "Sources", icon: ShieldCheck, count: 24 },
  { id: "map", label: "Map", icon: Map },
];

const VALID_TABS = new Set<WorkspaceTab>(WORKSPACE_TABS.map((tab) => tab.id));

const THREADS: WorkspaceThread[] = [
  {
    id: "t1",
    title: "Ship Demo Day follow-up",
    meta: "2h - 24 src",
    query: "Ship Demo Day - fastest investor debrief.",
  },
  {
    id: "t2",
    title: "Orbital Labs diligence",
    meta: "1d - 18 src",
    query: "Orbital Labs - verify voice-agent eval claims and healthcare wedge.",
  },
  {
    id: "t3",
    title: "Healthcare design partners",
    meta: "2d - 11 src",
    query: "Who should we ask for healthcare design partner intros?",
  },
  {
    id: "t4",
    title: "Founder follow-ups",
    meta: "1w - 12 src",
    query: "Rank founder follow-ups by urgency and evidence quality.",
  },
  {
    id: "t5",
    title: "Event themes",
    meta: "2w - 9 src",
    query: "Cluster the event by market, product layer, and unverified claims.",
  },
];

const WORKSPACE_CARDS: WorkspaceCard[] = [
  {
    id: "orbital",
    name: "Orbital Labs",
    initials: "OL",
    subtitle: "voice-agent eval infra - seed",
    kind: "company",
    kicker: "root",
    accent: "from-[#1A365D] to-[#0F4C81]",
    metrics: [
      { label: "Stage", value: "Seed" },
      { label: "Wedge", value: "Voice" },
      { label: "Fit", value: "High", trend: "up" },
      { label: "Proof", value: "Field" },
    ],
    footer: "captured 2h ago - 4 field notes",
  },
  {
    id: "alex",
    name: "Alex Chen",
    initials: "AC",
    subtitle: "founder contact - needs pilot criteria",
    kind: "person",
    kicker: "founder",
    accent: "from-[#334155] to-[#475569]",
    metrics: [
      { label: "Role", value: "CEO" },
      { label: "Intro", value: "Warm" },
      { label: "Need", value: "Pilots" },
      { label: "Risk", value: "Verify" },
    ],
    footer: "relationship note - active_event_session",
  },
  {
    id: "healthcare",
    name: "Healthcare Ops",
    initials: "H",
    subtitle: "design partner market - prior auth",
    kind: "market",
    kicker: "market",
    accent: "from-[#C77826] to-[#E09149]",
    metrics: [
      { label: "Pain", value: "High", trend: "up" },
      { label: "Budget", value: "Open" },
      { label: "Cycle", value: "Slow" },
      { label: "Proof", value: "ROI" },
    ],
    footer: "clustered from 6 captures",
  },
  {
    id: "claim",
    name: "Seed claim",
    initials: "SC",
    subtitle: "funding and traction - needs evidence",
    kind: "claim",
    kicker: "verify",
    accent: "from-[#0E7A5C] to-[#16A37E]",
    metrics: [
      { label: "Status", value: "Field" },
      { label: "Sources", value: "0" },
      { label: "Owner", value: "HS" },
      { label: "Next", value: "Web" },
    ],
    footer: "do not promote until sourced",
  },
  {
    id: "event",
    name: "Ship Demo Day",
    initials: "SD",
    subtitle: "event corpus - public context",
    kind: "event",
    kicker: "corpus",
    accent: "from-[#6B3BA3] to-[#8B5CC1]",
    metrics: [
      { label: "Companies", value: "18" },
      { label: "People", value: "31" },
      { label: "Captures", value: "12" },
      { label: "Paid", value: "$0" },
    ],
    footer: "event corpus first - no paid calls",
  },
];

const SOURCES: WorkspaceSource[] = [
  {
    n: 1,
    title: "Voice memo transcript - Alex at Orbital Labs",
    domain: "field note",
    type: "capture",
    date: "Today",
    support: "Founder, product, pilot ask",
  },
  {
    n: 2,
    title: "Notebook photo OCR - Ship Demo Day booth notes",
    domain: "private capture",
    type: "ocr",
    date: "Today",
    support: "Healthcare wedge and design partner note",
  },
  {
    n: 3,
    title: "Ship Demo Day public company list",
    domain: "event corpus",
    type: "public",
    date: "Apr 2026",
    support: "Company attendance and event context",
  },
  {
    n: 4,
    title: "Orbital Labs company site",
    domain: "orbital.example",
    type: "public",
    date: "Apr 2026",
    support: "Product description only",
  },
  {
    n: 5,
    title: "Healthcare ops market notes",
    domain: "team memory",
    type: "internal",
    date: "Mar 2026",
    support: "Prior auth and call-center QA pain themes",
  },
];

const BRIEF_RECEIPTS: WorkspaceMetric[] = [
  { label: "Captures", value: "12", trend: "up" },
  { label: "Companies", value: "8", trend: "up" },
  { label: "People", value: "11", trend: "up" },
  { label: "Claims to verify", value: "6" },
  { label: "Follow-ups", value: "7" },
  { label: "Paid calls", value: "$0" },
  { label: "Source count", value: "24" },
  { label: "Corpus hit rate", value: "91%", trend: "up" },
];

const WORKSPACE_NOTEBOOK_CONTENT = `
  <h2>Ship Demo Day memo</h2>
  <p>The strongest signal is not one company. It is the repeated pattern: voice-agent infrastructure companies are looking for narrow design partners where evaluation failures have direct operational cost.</p>
  <p>Orbital Labs belongs in the follow-up queue once the seed claim is verified. Ask for pilot criteria, deployment surface, and whether healthcare is a real wedge or just the clearest event conversation.</p>
`;

const DEFAULT_INPUT =
  "Compare Orbital Labs to the other voice-agent infra companies from Ship Demo Day.";

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
  const [activeThread, setActiveThread] = useState(THREADS[0].id);
  const [selectedCardId, setSelectedCardId] = useState(WORKSPACE_CARDS[0].id);

  const setActiveTab = (tab: WorkspaceTab) => {
    navigate(buildWorkspaceRouteForHost({ workspaceId, tab }), { replace: true });
  };

  return (
    <div
      data-testid="universal-workspace-page"
      className="h-screen overflow-hidden bg-[#f5f2ee] text-[#111827]"
    >
      <WorkspaceFrame
        workspaceId={workspaceId}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {activeTab === "chat" && (
          <ChatSurface
            activeThread={activeThread}
            onThreadChange={setActiveThread}
            composerText={composerText}
            onComposerTextChange={setComposerText}
          />
        )}
        {activeTab === "brief" && <BriefSurface onJump={setActiveTab} />}
        {activeTab === "cards" && (
          <CardsSurface
            selectedCardId={selectedCardId}
            onSelectCard={setSelectedCardId}
          />
        )}
        {activeTab === "notebook" && <NotebookSurface />}
        {activeTab === "sources" && <SourcesSurface />}
        {activeTab === "map" && <MapSurface />}
      </WorkspaceFrame>
    </div>
  );
}

function WorkspaceFrame({
  workspaceId,
  activeTab,
  onTabChange,
  children,
}: {
  workspaceId: string;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  children: ReactNode;
}) {
  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#fbf9f6]">
      <WorkspaceHeader
        workspaceId={workspaceId}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      <main className="relative min-h-0 overflow-hidden">{children}</main>
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
    <header className="flex min-h-[58px] flex-wrap items-center gap-3 border-b border-black/[0.06] bg-white/90 px-4 backdrop-blur-xl sm:px-5">
      <button
        type="button"
        className="flex shrink-0 items-center gap-2 font-semibold"
        aria-label="NodeBench workspace"
      >
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-[#d97757] text-[10px] font-black text-[#fffaf0]">
          N
        </span>
        <span className="hidden text-[13.5px] sm:inline">
          NodeBench <span className="text-[#d97757]">AI</span>
        </span>
      </button>

      <div className="flex min-w-0 items-center gap-2 rounded-full border border-black/[0.06] bg-white px-2.5 py-1 shadow-sm">
        <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br from-[#1A365D] to-[#0F4C81] text-[9.5px] font-bold tracking-[0.04em] text-[#fffaf0]">
          SD
        </span>
        <span className="truncate text-[13px] font-semibold">Ship Demo Day</span>
        <span className="hidden whitespace-nowrap font-mono text-[11px] text-gray-500 md:inline">
          Workspace / {workspaceId} / 2h / 24 src
        </span>
      </div>

      <nav
        className="ml-auto hidden items-center gap-0.5 rounded-[10px] bg-[#f5f4f1] p-0.5 xl:flex"
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

      <div className="flex shrink-0 items-center gap-1.5">
        <IconButton label="Share workspace">
          <Share2 size={15} />
        </IconButton>
        <IconButton label="History">
          <Clock size={15} />
        </IconButton>
        <IconButton label="Search workspace">
          <Search size={15} />
        </IconButton>
        <IconButton label="More">
          <MoreHorizontal size={15} />
        </IconButton>
      </div>

      <nav
        className="order-last -mx-4 flex w-[calc(100%+2rem)] items-center gap-0.5 overflow-x-auto border-t border-black/[0.06] bg-[#f8f6f1] px-4 py-2 xl:hidden"
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
        "inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium text-gray-500 transition",
        active && "bg-white font-semibold text-gray-950 shadow-sm",
      )}
    >
      <Icon size={13} aria-hidden />
      {tab.label}
      {tab.count ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-px font-mono text-[10px]",
            active ? "bg-[#d97757]/10 text-[#ad5f45]" : "bg-black/[0.05] text-gray-500",
          )}
        >
          {tab.count}
        </span>
      ) : null}
    </button>
  );
}

function ChatSurface({
  activeThread,
  onThreadChange,
  composerText,
  onComposerTextChange,
}: {
  activeThread: string;
  onThreadChange: (thread: string) => void;
  composerText: string;
  onComposerTextChange: (value: string) => void;
}) {
  const thread = THREADS.find((item) => item.id === activeThread) ?? THREADS[0];
  const canSend = composerText.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    onComposerTextChange("");
  };

  const handleKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative h-full overflow-hidden">
      <div className="grid h-full grid-cols-1 overflow-hidden md:grid-cols-[208px_minmax(0,1fr)]">
        <ThreadRail activeThread={activeThread} onThreadChange={onThreadChange} />

        <section className="min-h-0 overflow-y-auto px-4 pb-48 pt-7 sm:px-8">
          <div className="mx-auto w-full max-w-[920px]">
            <div className="mb-5 flex items-start gap-3 border-b border-black/[0.06] pb-5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d97757] to-[#5e6ad2] text-[10px] font-bold tracking-[0.04em] text-white">
                HS
              </div>
              <h1 className="pt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.015em]">
                {thread.query}
              </h1>
            </div>

            <RunBar />

            <article className="break-words text-[15.5px] leading-7 text-gray-800">
              <h2 className="mb-5 max-w-[760px] break-words bg-gradient-to-b from-[#111827] to-[#374151] bg-clip-text text-[22px] font-bold leading-[1.18] tracking-[-0.025em] text-transparent sm:text-[26px]">
                Yes - Orbital Labs belongs in the first follow-up queue, but keep
                the seed and traction claims in field-note status.
              </h2>
              <p className="mb-4">
                <EntityChip name="Orbital Labs" code="OL" /> came through the
                Ship Demo Day event corpus <Cite n={3} /> and two private captures{" "}
                <Cite n={1} /> <Cite n={2} />. The repeated theme is not generic
                voice AI. It is evaluation infrastructure for regulated workflows,
                especially <EntityChip name="Healthcare Ops" code="H" tone="amber" />.
              </p>
              <p className="mb-4">
                Treat the founder conversation as useful memory, not verified truth.
                The system used event corpus and team memory first, spent{" "}
                <strong>$0 on paid search</strong>, and left funding/traction claims
                in the verification queue <Cite n={5} />.
              </p>

              <Callout
                kicker="Recommendation"
                icon={<Target size={13} />}
                className="my-5"
              >
                Reach out this quarter. Ask Alex for pilot criteria, source the seed
                claim before promoting it, and test whether healthcare is a real wedge
                or only the clearest event conversation.
              </Callout>
            </article>

            <TopCardsStrip />
            <ChatSourceStrip />
            <FollowUpStrip />
          </div>
        </section>
      </div>

      <WorkspaceComposer
        value={composerText}
        onChange={onComposerTextChange}
        onKeyDown={handleKey}
        onSend={handleSend}
        canSend={canSend}
      />
    </div>
  );
}

function ThreadRail({
  activeThread,
  onThreadChange,
}: {
  activeThread: string;
  onThreadChange: (thread: string) => void;
}) {
  return (
    <aside className="hidden min-h-0 overflow-y-auto border-r border-black/[0.06] bg-white/40 px-2.5 pb-28 pt-4 md:block">
      <div className="mb-2 flex items-center justify-between px-1.5">
        <Kicker>Threads</Kicker>
        <IconButton label="New thread" className="h-[22px] w-[22px] rounded-md">
          <span className="text-sm leading-none">+</span>
        </IconButton>
      </div>
      <div className="space-y-0.5">
        {THREADS.map((thread) => (
          <button
            type="button"
            key={thread.id}
            onClick={() => onThreadChange(thread.id)}
            data-active={thread.id === activeThread}
            className="w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-black/[0.04] data-[active=true]:bg-[#d97757]/10 data-[active=true]:shadow-[inset_2px_0_0_#d97757]"
          >
            <div className="truncate text-[12.5px] font-semibold tracking-[-0.01em]">
              {thread.title}
            </div>
            <div className="mt-0.5 font-mono text-[10.5px] text-gray-400">
              {thread.meta}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function BriefSurface({ onJump }: { onJump: (tab: WorkspaceTab) => void }) {
  const sections = [
    "Executive summary",
    "What happened",
    "So what",
    "Now what",
    "Receipts",
    "Timeline",
    "Watch conditions",
  ];

  return (
    <div className="grid h-full grid-cols-1 overflow-hidden lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 overflow-y-auto border-r border-black/[0.06] bg-white/40 p-4 lg:block">
        <Kicker>Contents</Kicker>
        <nav className="mt-3 space-y-1" aria-label="Brief contents">
          {sections.map((section, index) => (
            <button
              key={section}
              type="button"
              className={cn(
                "block w-full rounded-md px-3 py-2 text-left text-[12.5px] font-medium text-gray-500 hover:bg-black/[0.04]",
                index === 0 && "bg-[#d97757]/10 text-[#ad5f45]",
              )}
            >
              {section}
            </button>
          ))}
        </nav>

        <div className="mt-8 rounded-md border border-black/[0.06] bg-white p-3 shadow-sm">
          <Kicker>Report health</Kicker>
          <div className="mt-3 space-y-3">
            <HealthMeter label="Freshness" value={92} />
            <HealthMeter label="Source diversity" value={78} />
            <HealthMeter label="Claim support" value={63} />
            <HealthMeter label="Paid calls" value={0} warn />
          </div>
        </div>
      </aside>

      <article className="min-h-0 overflow-y-auto px-4 py-7 sm:px-8">
        <div className="mx-auto w-full max-w-[980px]">
          <header className="mb-6">
            <Kicker>Event diligence - active_event_session</Kicker>
            <h1 className="mt-2 max-w-[820px] text-[32px] font-bold leading-[1.08] tracking-[-0.03em] text-gray-950">
              Ship Demo Day - follow up on Orbital Labs, but verify the claims before
              promoting them.
            </h1>
            <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-gray-600">
              A workspace-ready brief from messy notes, voice transcript, event corpus,
              and team memory. The answer leads with what to do, then keeps receipts,
              timeline, and watch conditions close enough to audit.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="ok" icon={<Check size={10} />}>event corpus hit</Pill>
              <Pill tone="accent">0 paid calls</Pill>
              <Pill>24 sources - 6 branches</Pill>
              <Pill>captures private by default</Pill>
            </div>
          </header>

          <section className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <Panel className="border-[#d97757]/24 bg-gradient-to-b from-[#d97757]/[0.055] to-[#d97757]/[0.02]">
              <Kicker className="text-[#ad5f45]">Verdict</Kicker>
              <h2 className="mt-2 text-[22px] font-bold tracking-[-0.02em]">
                Reach out this quarter.
              </h2>
              <p className="mt-2 text-[14.5px] leading-7 text-gray-700">
                Lead with healthcare design partner fit, ask how they measure voice
                agent failures, and confirm whether their seed claim is public enough
                to attach as evidence.
              </p>
            </Panel>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
              {BRIEF_RECEIPTS.slice(0, 4).map((metric) => (
                <StatCard key={metric.label} metric={metric} />
              ))}
            </div>
          </section>

          <section className="mb-6 grid gap-3 md:grid-cols-3">
            <TriadCard
              kicker="What happened"
              title="Captured founder, company, product, and ask"
              body="Alex from Orbital Labs described voice-agent eval infrastructure and asked for healthcare design partners."
            />
            <TriadCard
              kicker="So what"
              title="The event theme is regulated eval infrastructure"
              body="The strongest pattern is not broad AI tooling. It is validation, QA, and evidence loops for high-cost operations."
            />
            <TriadCard
              kicker="Now what"
              title="Verify before graph promotion"
              body="Keep field-note claims private, attach public sources, then promote the company card if confidence clears policy."
            />
          </section>

          <section className="mb-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-bold tracking-[-0.02em]">Receipts</h2>
              <button
                type="button"
                onClick={() => onJump("sources")}
                className="text-[12px] font-semibold text-[#ad5f45]"
              >
                Open sources
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {BRIEF_RECEIPTS.map((metric) => (
                <ReceiptCard key={metric.label} metric={metric} />
              ))}
            </div>
          </section>

          <section className="mb-7 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Panel>
              <h2 className="mb-4 text-[17px] font-bold tracking-[-0.02em]">Timeline</h2>
              <div className="space-y-4">
                {[
                  ["Today", "Voice memo captured", "Founder and product claim attached to active event session."],
                  ["Today", "Event corpus match", "Ship Demo Day list matched Orbital Labs and healthcare ops theme."],
                  ["Next", "Verification pass", "Public profile and company source need attachment before promotion."],
                  ["Later", "Workspace memo", "Notebook turns captures into a shareable diligence memo."],
                ].map(([date, title, body], index) => (
                  <TimelineRow
                    key={title}
                    date={date}
                    title={title}
                    body={body}
                    accent={index === 0}
                  />
                ))}
              </div>
            </Panel>

            <Panel>
              <h2 className="mb-3 text-[17px] font-bold tracking-[-0.02em]">
                Watch conditions
              </h2>
              <div className="space-y-2">
                {[
                  ["Seed claim verified", "promote to team memory", "#d97757"],
                  ["Healthcare pilot criteria found", "create follow-up", "#047857"],
                  ["No public source found", "keep private field note", "#b45309"],
                ].map(([title, meta, color]) => (
                  <div
                    key={title}
                    className="flex items-center gap-3 rounded-md border border-black/[0.06] bg-[#f8f6f1] p-3"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold">{title}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-gray-500">
                        {meta}
                      </div>
                    </div>
                    <Bell size={14} className="ml-auto text-gray-500" />
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </div>
      </article>
    </div>
  );
}

function CardsSurface({
  selectedCardId,
  onSelectCard,
}: {
  selectedCardId: string;
  onSelectCard: (cardId: string) => void;
}) {
  const selected = WORKSPACE_CARDS.find((card) => card.id === selectedCardId) ?? WORKSPACE_CARDS[0];
  const related = WORKSPACE_CARDS.filter((card) => card.id !== selected.id);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="mb-4 flex items-center gap-2">
          <CardCrumb card={WORKSPACE_CARDS[4]} muted />
          <span className="text-gray-300">/</span>
          <CardCrumb card={WORKSPACE_CARDS[0]} />
          <div className="ml-auto flex gap-1.5">
            <IconButton label="Reset cards">
              <RefreshCw size={13} />
            </IconButton>
            <IconButton label="Filter cards">
              <Search size={13} />
            </IconButton>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.85fr)_minmax(360px,1fr)_minmax(300px,0.9fr)]">
          <CardColumn title="Root" subtitle="1 card">
            <CompanyCard card={WORKSPACE_CARDS[0]} active />
          </CardColumn>

          <CardColumn title="Related" subtitle={`${related.length} from graph`}>
            {related.map((card) => (
              <CompanyCard
                key={card.id}
                card={card}
                active={card.id === selected.id}
                onClick={() => onSelectCard(card.id)}
              />
            ))}
          </CardColumn>

          <CardColumn
            title={`Drilldown - ${selected.name}`}
            subtitle="one hop deeper"
          >
            <Panel className="bg-[#fafaf7]">
              <Kicker>{selected.kind}</Kicker>
              <h2 className="mt-2 text-lg font-bold">{selected.name}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Expand this card into public footprint, claims, sources, and follow-up
                actions. Live search remains gated by workspace policy.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Pill tone="accent">Go deeper</Pill>
                <Pill>Verify</Pill>
                <Pill>Open notebook</Pill>
              </div>
            </Panel>
            {SOURCES.slice(0, 3).map((source) => (
              <SourceMiniCard key={source.n} source={source} />
            ))}
          </CardColumn>
        </div>
      </div>
    </div>
  );
}

function NotebookSurface() {
  return (
    <div className="grid h-full grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-h-0 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-[900px]">
          <RichNotebookEditor
            initialContent={WORKSPACE_NOTEBOOK_CONTENT}
            storageKey="nodebench.workspace.ship-demo-day.notebook"
            testId="workspace-notebook-editor"
            className="min-h-[620px] p-6"
            footer={
              <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                <span>TipTap - StarterKit</span>
                <span>Notebook stays private until shared</span>
              </div>
            }
          />
        </div>
      </section>
      <aside className="hidden min-h-0 overflow-y-auto border-l border-black/[0.06] bg-[#fafaf7] p-5 xl:block">
        <Kicker>Notebook context</Kicker>
        <div className="mt-4 space-y-3">
          {[
            ["Raw notes", "Voice transcript and OCR stay in source memory."],
            ["Cleaned memo", "Only verified claims should enter the team brief."],
            ["Follow-ups", "Alex needs pilot criteria and a healthcare intro angle."],
          ].map(([title, body]) => (
            <Panel key={title}>
              <div className="text-sm font-semibold">{title}</div>
              <p className="mt-1 text-xs leading-5 text-gray-600">{body}</p>
            </Panel>
          ))}
        </div>
      </aside>
    </div>
  );
}

function SourcesSurface() {
  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto grid w-full max-w-[1160px] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <header className="mb-4">
            <Kicker>Sources</Kicker>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] text-gray-950">
              Evidence, field notes, and verification status.
            </h1>
          </header>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Pill tone="ok" icon={<Check size={10} />}>field notes separated</Pill>
            <Pill>public sources</Pill>
            <Pill>team memory</Pill>
            <Pill tone="accent">verification queue</Pill>
          </div>
          <Panel className="overflow-hidden p-0">
            <div className="grid grid-cols-[44px_minmax(0,1fr)_110px_120px] border-b border-black/[0.06] bg-[#f5f4f1] px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-gray-500">
              <span>#</span>
              <span>Source</span>
              <span>Type</span>
              <span>Date</span>
            </div>
            {SOURCES.map((source) => (
              <div
                key={source.n}
                className="grid grid-cols-[44px_minmax(0,1fr)_110px_120px] items-center gap-0 border-b border-black/[0.06] px-4 py-3 last:border-b-0 hover:bg-[#f8f6f1]"
              >
                <Cite n={source.n} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{source.title}</div>
                  <div className="mt-0.5 truncate text-xs text-gray-500">
                    {source.domain} - {source.support}
                  </div>
                </div>
                <span className="text-xs text-gray-600">{source.type}</span>
                <span className="font-mono text-[11px] text-gray-500">{source.date}</span>
              </div>
            ))}
          </Panel>
        </section>

        <aside className="space-y-4">
          <Panel>
            <Kicker>Claim support</Kicker>
            <div className="mt-3 space-y-3">
              {[
                ["Orbital builds voice-agent eval infrastructure", "supported by field note and website", "provisional"],
                ["Orbital is seed-stage", "field note only", "needs evidence"],
                ["Healthcare is the best wedge", "team memory and repeated captures", "working thesis"],
              ].map(([claim, support, status]) => (
                <div key={claim} className="rounded-md border border-black/[0.06] bg-[#f8f6f1] p-3">
                  <div className="text-sm font-semibold leading-5">{claim}</div>
                  <div className="mt-1 text-xs leading-5 text-gray-600">{support}</div>
                  <div className="mt-2 font-mono text-[10.5px] text-[#ad5f45]">{status}</div>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function MapSurface() {
  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6">
      <Panel className="mx-auto w-full max-w-[1120px] overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
          <div>
            <Kicker>Map</Kicker>
            <h1 className="mt-1 text-xl font-bold tracking-[-0.02em]">
              Event corpus, private captures, team memory, and verification queues.
            </h1>
          </div>
          <Pill>9 nodes - 10 edges</Pill>
        </div>
        <svg
          viewBox="0 0 900 520"
          className="h-[calc(100vh-180px)] min-h-[520px] w-full bg-[#fbf9f6]"
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
    </div>
  );
}

function WorkspaceComposer({
  value,
  onChange,
  onKeyDown,
  onSend,
  canSend,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  canSend: boolean;
}) {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-b from-transparent via-[#fbf9f6]/90 to-[#fbf9f6] px-4 pb-5 pt-12 md:left-[208px] sm:px-8">
      <div className="pointer-events-auto mx-auto max-w-[820px] rounded-[14px] border border-black/[0.08] bg-white p-3 shadow-[0_20px_48px_rgba(15,23,42,0.12),0_4px_10px_rgba(15,23,42,0.06)]">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          className="max-h-28 min-h-[34px] w-full resize-none bg-transparent px-1 text-sm outline-none placeholder:text-gray-400"
          aria-label="Workspace composer"
          placeholder="Compare Orbital Labs to the other voice-agent infra companies from Ship Demo Day."
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ComposerTool icon={<Paperclip size={12} />}>Attach</ComposerTool>
          <ComposerTool icon={<Globe2 size={12} />} active>Web</ComposerTool>
          <ComposerTool icon={<Sparkles size={12} />}>Branches - 6</ComposerTool>
          <ComposerTool icon={<Layers size={12} />}>Use report</ComposerTool>
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            data-testid="workspace-chat-send"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d97757] text-white shadow-sm transition hover:bg-[#c76648] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 sm:ml-auto"
            aria-label="Send"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TopCardsStrip() {
  return (
    <section className="my-7">
      <div className="mb-3 flex items-center justify-between">
        <Kicker>Top cards - 3 of 14</Kicker>
        <button type="button" className="text-[12px] font-semibold text-[#ad5f45]">
          Open all
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {WORKSPACE_CARDS.slice(0, 3).map((card, index) => (
          <CompanyCard key={card.id} card={card} active={index === 0} />
        ))}
      </div>
    </section>
  );
}

function ChatSourceStrip() {
  return (
    <section className="my-6">
      <div className="mb-3 flex items-center justify-between">
        <Kicker>Sources - top 4 of 24</Kicker>
        <button type="button" className="text-[12px] font-semibold text-[#ad5f45]">
          View all
        </button>
      </div>
      <Panel className="overflow-hidden p-0">
        {SOURCES.slice(0, 4).map((source) => (
          <div
            key={source.n}
            className="grid grid-cols-[28px_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-black/[0.06] px-4 py-2.5 text-[12.5px] last:border-b-0 hover:bg-[#f8f6f1]"
          >
            <Cite n={source.n} />
            <span className="truncate font-semibold">{source.title}</span>
            <Pill className="text-[10px]">{source.type}</Pill>
            <span className="hidden font-mono text-[11px] text-gray-500 sm:inline">
              {source.domain}
            </span>
          </div>
        ))}
      </Panel>
    </section>
  );
}

function FollowUpStrip() {
  const followUps = [
    "Verify Orbital Labs seed claim",
    "Draft a follow-up to Alex",
    "Compare voice-agent infra companies",
    "Open healthcare design partner map",
  ];

  return (
    <div className="mb-8 flex flex-wrap items-center gap-2">
      <Kicker className="mr-1">Continue</Kicker>
      {followUps.map((followUp) => (
        <button
          key={followUp}
          type="button"
          className="rounded-full border border-black/[0.10] bg-white px-3 py-1.5 text-[12.5px] font-medium text-gray-600 transition hover:border-[#d97757]/30 hover:bg-[#d97757]/10 hover:text-[#ad5f45]"
        >
          {followUp}
        </button>
      ))}
    </div>
  );
}

function CompanyCard({
  card,
  active = false,
  onClick,
}: {
  card: WorkspaceCard;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className="w-full rounded-lg border border-black/[0.08] bg-white text-left shadow-sm transition hover:-translate-y-px hover:shadow-md data-[active=true]:border-[#d97757]/30 data-[active=true]:shadow-[0_0_0_2px_rgba(217,119,87,0.08)]"
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-[12px] font-bold tracking-[0.04em] text-[#fffaf0]",
            card.accent,
          )}
        >
          {card.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-bold tracking-[-0.01em]">{card.name}</h3>
            {card.kicker ? <Pill className="ml-auto text-[10px]">{card.kicker}</Pill> : null}
          </div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-gray-500">
            {card.subtitle}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-4 pb-4">
        {card.metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-gray-500">{metric.label}</span>
            <span
              data-trend={metric.trend}
              className="font-mono text-[11px] font-semibold text-gray-800 data-[trend=down]:text-red-600 data-[trend=up]:text-emerald-700"
            >
              {metric.value}
              {metric.trend === "up" ? " +" : metric.trend === "down" ? " -" : ""}
            </span>
          </div>
        ))}
      </div>
      {card.footer ? (
        <div className="border-t border-black/[0.06] bg-[#f5f4f1] px-4 py-2 font-mono text-[10.5px] text-gray-500">
          {card.footer}
        </div>
      ) : null}
    </button>
  );
}

function CardColumn({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="min-h-[520px] rounded-lg border border-black/[0.06] bg-[#fafaf7] p-3">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
          {title}
        </div>
        <div className="font-mono text-[10.5px] text-gray-400">{subtitle}</div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function CardCrumb({ card, muted = false }: { card: WorkspaceCard; muted?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-black/[0.06] bg-white px-2.5 py-1.5 text-sm font-semibold shadow-sm",
        muted && "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br text-[8px] font-bold text-white",
          card.accent,
        )}
      >
        {card.initials}
      </span>
      {card.name}
    </button>
  );
}

function SourceMiniCard({ source }: { source: WorkspaceSource }) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-white p-3">
      <div className="flex items-center gap-2">
        <Cite n={source.n} />
        <span className="truncate text-sm font-semibold">{source.title}</span>
      </div>
      <div className="mt-1 font-mono text-[10.5px] text-gray-500">
        {source.type} - {source.domain}
      </div>
    </div>
  );
}

function TriadCard({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <Panel>
      <Kicker>{kicker}</Kicker>
      <h3 className="mt-2 text-[15px] font-bold tracking-[-0.01em]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{body}</p>
    </Panel>
  );
}

function StatCard({ metric }: { metric: WorkspaceMetric }) {
  return (
    <Panel className="p-3">
      <div
        data-trend={metric.trend}
        className="font-mono text-[19px] font-bold data-[trend=down]:text-red-600 data-[trend=up]:text-emerald-700"
      >
        {metric.value}
      </div>
      <div className="mt-1 text-[11px] text-gray-500">{metric.label}</div>
    </Panel>
  );
}

function ReceiptCard({ metric }: { metric: WorkspaceMetric }) {
  return (
    <button
      type="button"
      className="rounded-md border border-black/[0.06] bg-white p-3 text-left shadow-sm transition hover:border-[#d97757]/30 hover:bg-[#d97757]/[0.04]"
    >
      <div className="text-[11px] text-gray-500">{metric.label}</div>
      <div
        data-trend={metric.trend}
        className="mt-1 font-mono text-[17px] font-bold data-[trend=down]:text-red-600 data-[trend=up]:text-emerald-700"
      >
        {metric.value}
      </div>
      <div className="mt-1 font-mono text-[10.5px] text-gray-400">event workspace</div>
    </button>
  );
}

function TimelineRow({
  date,
  title,
  body,
  accent = false,
}: {
  date: string;
  title: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div className="grid grid-cols-[88px_16px_minmax(0,1fr)] gap-3">
      <div className="font-mono text-[11px] text-gray-500">{date}</div>
      <div className="relative flex justify-center">
        <span
          className={cn(
            "mt-1 h-2.5 w-2.5 rounded-full bg-gray-300",
            accent && "bg-[#d97757]",
          )}
        />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-xs leading-5 text-gray-600">{body}</div>
      </div>
    </div>
  );
}

function HealthMeter({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-gray-500">
        <span>{label}</span>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
        <span
          className={cn("block h-full rounded-full bg-[#d97757]", warn && "bg-amber-600")}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
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

function EntityChip({
  name,
  code,
  tone = "blue",
}: {
  name: string;
  code: string;
  tone?: "blue" | "amber" | "green" | "purple";
}) {
  const toneClass = {
    blue: "from-[#1A365D] to-[#0F4C81]",
    amber: "from-[#C77826] to-[#E09149]",
    green: "from-[#0E7A5C] to-[#16A37E]",
    purple: "from-[#6B3BA3] to-[#8B5CC1]",
  }[tone];

  return (
    <span className="inline-flex items-center gap-1 rounded-[5px] border border-[#5e6ad2]/20 bg-[#5e6ad2]/10 py-px pl-1 pr-2 text-[12.5px] font-semibold text-[#5e6ad2]">
      <span
        className={cn(
          "flex h-3.5 min-w-3.5 items-center justify-center rounded-[3px] bg-gradient-to-br px-0.5 text-[8px] font-black text-white",
          toneClass,
        )}
      >
        {code.slice(0, 1)}
      </span>
      {name}
    </span>
  );
}

function Cite({ n }: { n: number }) {
  return (
    <span
      className="inline-flex rounded-[3px] bg-[#d97757]/10 px-1.5 py-px font-mono text-[10px] font-bold text-[#ad5f45]"
      aria-label={`Source ${n}`}
      title={`Source ${n}`}
    >
      {n}
    </span>
  );
}

function RunBar() {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Pill tone="ok" icon={<Check size={10} />}>verified</Pill>
      <Pill tone="accent" icon={<Sparkles size={10} />}>6 branches</Pill>
      <Pill>Using event corpus - 0 paid calls - judge 9.6</Pill>
      <span className="ml-auto hidden gap-1.5 sm:flex">
        <IconButton label="Save as report">
          <FileText size={13} />
        </IconButton>
        <IconButton label="Watch entity">
          <Bell size={13} />
        </IconButton>
      </span>
    </div>
  );
}

function Callout({
  kicker,
  icon,
  children,
  className,
}: {
  kicker: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-[#d97757]/25 border-l-[3px] border-l-[#d97757] bg-gradient-to-b from-[#d97757]/[0.055] to-[#d97757]/[0.02] p-4",
        className,
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#ad5f45]">
        {icon}
        {kicker}
      </div>
      <p className="m-0 text-[14.5px] leading-7 text-gray-700">{children}</p>
    </div>
  );
}

function ComposerTool({
  children,
  icon,
  active = false,
}: {
  children: ReactNode;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-[#f5f4f1] px-2.5 py-1 text-[11.5px] font-semibold text-gray-600",
        active && "border-[#d97757]/25 bg-[#d97757]/10 text-[#ad5f45]",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Pill({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "accent";
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold",
        tone === "neutral" && "border-black/[0.06] bg-[#f5f4f1] text-gray-500",
        tone === "ok" && "border-emerald-700/15 bg-emerald-700/10 text-emerald-700",
        tone === "accent" && "border-[#d97757]/20 bg-[#d97757]/10 text-[#ad5f45]",
        className,
      )}
    >
      {icon}
      {children}
    </span>
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
    <div className={cn("rounded-lg border border-black/[0.06] bg-white p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

function Kicker({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[10.5px] font-bold uppercase tracking-[0.16em] text-gray-500",
        className,
      )}
    >
      {children}
    </div>
  );
}

function IconButton({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-black/[0.06] bg-white text-gray-600 transition hover:border-black/[0.10] hover:bg-[#f5f4f1] hover:text-gray-950",
        className,
      )}
    >
      {children}
    </button>
  );
}

export default UniversalWorkspacePage;
