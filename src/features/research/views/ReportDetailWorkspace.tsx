/**
 * ReportDetailWorkspace — the recursive Cards workspace for a single report.
 *
 * v1 scope (locked):
 *   - Tabs: Brief | Cards | Map | Sources (Cards default;
 *     labels + icons + count pills aligned with the NodeBench design-system
 *     workspace kit at docs/design/nodebench-ai-design-system/)
 *   - Breadcrumb path always visible
 *   - Max 3 active depth columns
 *   - Pin / Promote-to-root / Compare affordances on every card
 *   - "Return to root" always visible when user has drilled
 *
 * Data contract: shared/research/resourceCards.ts ResourceCard[].
 * The parent wires the data source (Convex query, /v1/resources/expand, or
 * fixture). This component does not talk to the network directly.
 */

import { useCallback, useMemo, useState } from "react";
import { FileText, LayoutGrid, Map as MapIcon, FileStack } from "lucide-react";
import type {
  ResourceCard,
  ResourceUri,
} from "../../../../shared/research/resourceCards";

export type WorkspaceTab = "brief" | "cards" | "map" | "sources";

interface BreadcrumbHop {
  uri: ResourceUri;
  label: string;
}

interface ColumnState {
  uri: ResourceUri;
  cards: ReadonlyArray<ResourceCard>;
}

export interface ReportDetailWorkspaceProps {
  reportTitle: string;
  rootUri: ResourceUri;
  rootLabel: string;
  /** Cards returned by the first expand for rootUri. */
  initialCards: ReadonlyArray<ResourceCard>;
  /** Expand handler wired to /v1/resources/expand or a Convex query. */
  onExpand: (uri: ResourceUri) => Promise<ReadonlyArray<ResourceCard>>;
  onOpenBrief?: () => void;
  onOpenInChat?: (uri: ResourceUri) => void;
  /**
   * Initial tab for the workspace. Used by `/workspace/w/:id?tab=...` so the
   * URL can land directly on Brief / Cards / Map / Sources. Defaults to "cards".
   */
  initialTab?: WorkspaceTab;
}

const MAX_COLUMNS = 3;

export function ReportDetailWorkspace({
  reportTitle,
  rootUri,
  rootLabel,
  initialCards,
  onExpand,
  onOpenBrief,
  onOpenInChat,
  initialTab,
}: ReportDetailWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab ?? "cards");
  const [columns, setColumns] = useState<ColumnState[]>([
    { uri: rootUri, cards: initialCards },
  ]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbHop[]>([
    { uri: rootUri, label: rootLabel },
  ]);
  const [pinnedUris, setPinnedUris] = useState<ResourceUri[]>([]);
  const [compareTray, setCompareTray] = useState<ResourceUri[]>([]);
  const [loadingUri, setLoadingUri] = useState<ResourceUri | null>(null);
  const [errorForUri, setErrorForUri] = useState<
    { uri: ResourceUri; message: string } | null
  >(null);

  const drilled = breadcrumb.length > 1;
  const canGoDeeper = columns.length < MAX_COLUMNS;

  // Derive tab count pills per design spec (ws-tab-count).
  const tabCounts = useMemo(() => {
    let cards = 0;
    const evidence = new Set<string>();
    for (const col of columns) {
      cards += col.cards.length;
      for (const card of col.cards) {
        for (const ref of card.evidenceRefs ?? []) {
          evidence.add(String(ref));
        }
      }
    }
    return { cards, sources: evidence.size };
  }, [columns]);

  const handleExpand = useCallback(
    async (uri: ResourceUri, label: string) => {
      if (!canGoDeeper) {
        // Collapse the oldest non-root column (keep root + last two).
        setColumns((prev) => [prev[0], ...prev.slice(-1)]);
      }
      setLoadingUri(uri);
      setErrorForUri(null);
      try {
        const cards = await onExpand(uri);
        setColumns((prev) => [...prev, { uri, cards }]);
        setBreadcrumb((prev) => [...prev, { uri, label }]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Expand failed";
        setErrorForUri({ uri, message });
      } finally {
        setLoadingUri(null);
      }
    },
    [canGoDeeper, onExpand],
  );

  const handleReturnToRoot = useCallback(() => {
    setColumns((prev) => [prev[0]]);
    setBreadcrumb((prev) => [prev[0]]);
  }, []);

  const handleJumpTo = useCallback(
    (index: number) => {
      setColumns((prev) => prev.slice(0, index + 1));
      setBreadcrumb((prev) => prev.slice(0, index + 1));
    },
    [],
  );

  const togglePinned = useCallback((uri: ResourceUri) => {
    setPinnedUris((prev) =>
      prev.includes(uri) ? prev.filter((p) => p !== uri) : [...prev, uri],
    );
  }, []);

  const toggleCompare = useCallback((uri: ResourceUri) => {
    setCompareTray((prev) =>
      prev.includes(uri) ? prev.filter((p) => p !== uri) : [...prev, uri],
    );
  }, []);

  const handlePromote = useCallback(
    async (uri: ResourceUri, label: string) => {
      setLoadingUri(uri);
      setErrorForUri(null);
      try {
        const cards = await onExpand(uri);
        setColumns([{ uri, cards }]);
        setBreadcrumb([{ uri, label }]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Promote failed";
        setErrorForUri({ uri, message });
      } finally {
        setLoadingUri(null);
      }
    },
    [onExpand],
  );

  return (
    <div
      data-testid="report-detail-workspace"
      className="flex h-full min-h-0 flex-col"
    >
      <WorkspaceHeader
        reportTitle={reportTitle}
        breadcrumb={breadcrumb}
        drilled={drilled}
        onReturnToRoot={handleReturnToRoot}
        onJumpTo={handleJumpTo}
        onOpenBrief={onOpenBrief}
      />

      <TabBar
        activeTab={activeTab}
        onChange={setActiveTab}
        cardCount={tabCounts.cards}
        sourceCount={tabCounts.sources}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {activeTab === "brief" && (
          <BriefTab cards={columns[0]?.cards ?? []} />
        )}
        {activeTab === "cards" && (
          <CardsTab
            columns={columns}
            loadingUri={loadingUri}
            errorForUri={errorForUri}
            pinnedUris={pinnedUris}
            compareTray={compareTray}
            onExpand={handleExpand}
            onPromote={handlePromote}
            onTogglePin={togglePinned}
            onToggleCompare={toggleCompare}
            onOpenInChat={onOpenInChat}
          />
        )}
        {activeTab === "map" && (
          <MapTab
            cards={columns.flatMap((c) => c.cards)}
            rootUri={columns[0]?.uri ?? rootUri}
          />
        )}
        {activeTab === "sources" && (
          <SourcesTab cards={columns.flatMap((c) => c.cards)} />
        )}
      </div>

      {compareTray.length > 0 && (
        <CompareTray
          uris={compareTray}
          onClear={() => setCompareTray([])}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function WorkspaceHeader({
  reportTitle,
  breadcrumb,
  drilled,
  onReturnToRoot,
  onJumpTo,
  onOpenBrief,
}: {
  reportTitle: string;
  breadcrumb: ReadonlyArray<BreadcrumbHop>;
  drilled: boolean;
  onReturnToRoot: () => void;
  onJumpTo: (index: number) => void;
  onOpenBrief?: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2 overflow-hidden">
        <span className="truncate text-[11px] uppercase tracking-[0.2em] text-white/50">
          {reportTitle}
        </span>
        <span className="text-white/20">·</span>
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1 overflow-hidden"
        >
          {breadcrumb.map((hop, i) => {
            const isLast = i === breadcrumb.length - 1;
            return (
              <span key={hop.uri} className="flex min-w-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onJumpTo(i)}
                  className={`truncate rounded px-1.5 py-0.5 text-xs transition ${
                    isLast
                      ? "bg-[#d97757]/15 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                  aria-current={isLast ? "page" : undefined}
                >
                  {hop.label}
                </button>
                {!isLast && <span className="text-white/20">›</span>}
              </span>
            );
          })}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {drilled && (
          <button
            type="button"
            onClick={onReturnToRoot}
            className="rounded border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-white/80 transition hover:bg-white/[0.06]"
          >
            Return to root
          </button>
        )}
        {onOpenBrief && (
          <button
            type="button"
            onClick={onOpenBrief}
            className="rounded border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-white/80 transition hover:bg-white/[0.06]"
          >
            Open brief
          </button>
        )}
      </div>
    </div>
  );
}

type TabDef = {
  id: WorkspaceTab;
  label: string;
  icon: typeof FileText;
  count?: number;
  disabled?: boolean;
};

function TabBar({
  activeTab,
  onChange,
  cardCount,
  sourceCount,
}: {
  activeTab: WorkspaceTab;
  onChange: (t: WorkspaceTab) => void;
  cardCount: number;
  sourceCount: number;
}) {
  // Tab set + icons mirror the NodeBench design-system workspace kit
  // (docs/design/nodebench-ai-design-system/ui_kits/nodebench-workspace/
  //  Report.jsx:14-20). Count pills follow the same kit's `.ws-tab-count` pattern.
  const tabs: TabDef[] = [
    { id: "brief", label: "Brief", icon: FileText },
    { id: "cards", label: "Cards", icon: LayoutGrid, count: cardCount },
    { id: "map", label: "Map", icon: MapIcon },
    { id: "sources", label: "Sources", icon: FileStack, count: sourceCount },
  ];
  return (
    <div
      role="tablist"
      aria-label="Workspace view"
      className="flex items-center gap-1 border-b border-white/[0.06] bg-white/[0.01] px-3"
    >
      {tabs.map((t) => {
        const isActive = activeTab === t.id;
        const IconCmp = t.icon;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-disabled={t.disabled}
            onClick={() => !t.disabled && onChange(t.id)}
            className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${
              t.disabled
                ? "cursor-not-allowed text-white/25"
                : isActive
                ? "text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            <IconCmp size={13} aria-hidden />
            <span>{t.label}</span>
            {t.count != null && t.count > 0 && !t.disabled && (
              <span
                className={`ml-0.5 rounded-full px-1.5 py-[1px] text-[10px] font-semibold tabular-nums ${
                  isActive
                    ? "bg-[#d97757]/20 text-[#e59579]"
                    : "bg-white/[0.05] text-white/50"
                }`}
                aria-label={`${t.count} ${t.label.toLowerCase()}`}
              >
                {t.count}
              </span>
            )}
            {t.disabled && (
              <span className="ml-1 rounded bg-white/[0.04] px-1 text-[10px] uppercase tracking-wide text-white/40">
                v2
              </span>
            )}
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-px h-px bg-[#d97757]"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function CardsTab({
  columns,
  loadingUri,
  errorForUri,
  pinnedUris,
  compareTray,
  onExpand,
  onPromote,
  onTogglePin,
  onToggleCompare,
  onOpenInChat,
}: {
  columns: ReadonlyArray<ColumnState>;
  loadingUri: ResourceUri | null;
  errorForUri: { uri: ResourceUri; message: string } | null;
  pinnedUris: ReadonlyArray<ResourceUri>;
  compareTray: ReadonlyArray<ResourceUri>;
  onExpand: (uri: ResourceUri, label: string) => void;
  onPromote: (uri: ResourceUri, label: string) => void;
  onTogglePin: (uri: ResourceUri) => void;
  onToggleCompare: (uri: ResourceUri) => void;
  onOpenInChat?: (uri: ResourceUri) => void;
}) {
  return (
    <div className="flex flex-1 gap-3 overflow-x-auto overflow-y-hidden px-3 py-3">
      {columns.map((col, i) => (
        <CardColumn
          key={`${col.uri}-${i}`}
          cards={col.cards}
          columnIndex={i}
          loadingUri={loadingUri}
          errorForUri={errorForUri}
          pinnedUris={pinnedUris}
          compareTray={compareTray}
          onExpand={onExpand}
          onPromote={onPromote}
          onTogglePin={onTogglePin}
          onToggleCompare={onToggleCompare}
          onOpenInChat={onOpenInChat}
        />
      ))}
      {columns.length === MAX_COLUMNS && (
        <div className="flex h-full min-w-[180px] items-center justify-center rounded border border-dashed border-white/[0.08] bg-white/[0.01] px-3 text-center text-[11px] text-white/40">
          Max depth reached. Opening a new card will collapse the oldest column.
        </div>
      )}
    </div>
  );
}

function CardColumn({
  cards,
  columnIndex,
  loadingUri,
  errorForUri,
  pinnedUris,
  compareTray,
  onExpand,
  onPromote,
  onTogglePin,
  onToggleCompare,
  onOpenInChat,
}: {
  cards: ReadonlyArray<ResourceCard>;
  columnIndex: number;
  loadingUri: ResourceUri | null;
  errorForUri: { uri: ResourceUri; message: string } | null;
  pinnedUris: ReadonlyArray<ResourceUri>;
  compareTray: ReadonlyArray<ResourceUri>;
  onExpand: (uri: ResourceUri, label: string) => void;
  onPromote: (uri: ResourceUri, label: string) => void;
  onTogglePin: (uri: ResourceUri) => void;
  onToggleCompare: (uri: ResourceUri) => void;
  onOpenInChat?: (uri: ResourceUri) => void;
}) {
  return (
    <section
      data-testid={`card-column-${columnIndex}`}
      className="flex h-full min-w-[280px] max-w-[340px] flex-1 flex-col gap-2 overflow-y-auto"
    >
      {cards.map((card) => (
        <Card
          key={card.cardId}
          card={card}
          pinned={pinnedUris.includes(card.uri)}
          inCompare={compareTray.includes(card.uri)}
          isLoading={loadingUri === card.uri}
          errorMessage={
            errorForUri?.uri === card.uri ? errorForUri.message : undefined
          }
          onExpand={onExpand}
          onPromote={onPromote}
          onTogglePin={onTogglePin}
          onToggleCompare={onToggleCompare}
          onOpenInChat={onOpenInChat}
        />
      ))}
      {cards.length === 0 && (
        <div className="rounded border border-white/[0.06] bg-white/[0.01] p-4 text-center text-[11px] text-white/40">
          No cards for this expansion.
        </div>
      )}
    </section>
  );
}

function Card({
  card,
  pinned,
  inCompare,
  isLoading,
  errorMessage,
  onExpand,
  onPromote,
  onTogglePin,
  onToggleCompare,
  onOpenInChat,
}: {
  card: ResourceCard;
  pinned: boolean;
  inCompare: boolean;
  isLoading: boolean;
  errorMessage?: string;
  onExpand: (uri: ResourceUri, label: string) => void;
  onPromote: (uri: ResourceUri, label: string) => void;
  onTogglePin: (uri: ResourceUri) => void;
  onToggleCompare: (uri: ResourceUri) => void;
  onOpenInChat?: (uri: ResourceUri) => void;
}) {
  return (
    <article
      data-testid="resource-card"
      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/[0.1]"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">
            {card.title}
          </h3>
          {card.subtitle && (
            <p className="truncate text-[11px] uppercase tracking-wide text-white/40">
              {card.subtitle}
            </p>
          )}
        </div>
        <span
          className="shrink-0 rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/60"
          title={`Confidence: ${(card.confidence * 100).toFixed(0)}%`}
        >
          {(card.confidence * 100).toFixed(0)}%
        </span>
      </header>

      {card.chips && card.chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.chips.map((chip, i) => (
            <span
              key={`${chip.label}-${i}`}
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                chip.tone === "accent"
                  ? "bg-[#d97757]/15 text-[#d97757]"
                  : chip.tone === "warn"
                  ? "bg-amber-500/10 text-amber-300"
                  : chip.tone === "positive"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-white/[0.04] text-white/60"
              }`}
            >
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {card.summary && (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/70">
          {card.summary}
        </p>
      )}

      {card.keyFacts && card.keyFacts.length > 0 && (
        <ul className="mt-2 space-y-1 text-[11px] text-white/60">
          {card.keyFacts.slice(0, 4).map((f, i) => (
            <li key={i} className="flex gap-1.5">
              <span aria-hidden className="text-white/30">
                •
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      {errorMessage && (
        <p className="mt-2 rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-300">
          {errorMessage}
        </p>
      )}

      <footer className="mt-3 flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onExpand(card.uri, card.title)}
          className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/80 transition hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-60"
          aria-label={`Expand ${card.title} — open one ring deeper`}
        >
          {isLoading ? "Expanding…" : "Expand"}
        </button>
        <button
          type="button"
          onClick={() => onPromote(card.uri, card.title)}
          className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/80 transition hover:bg-white/[0.06]"
          aria-label={`Promote ${card.title} to root`}
        >
          Promote
        </button>
        <button
          type="button"
          onClick={() => onTogglePin(card.uri)}
          aria-pressed={pinned}
          className={`rounded border px-2 py-1 text-[11px] transition ${
            pinned
              ? "border-[#d97757]/40 bg-[#d97757]/15 text-[#d97757]"
              : "border-white/[0.08] bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"
          }`}
        >
          {pinned ? "Pinned" : "Pin"}
        </button>
        <button
          type="button"
          onClick={() => onToggleCompare(card.uri)}
          aria-pressed={inCompare}
          className={`rounded border px-2 py-1 text-[11px] transition ${
            inCompare
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
              : "border-white/[0.08] bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"
          }`}
        >
          {inCompare ? "In compare" : "Compare"}
        </button>
        {onOpenInChat && (
          <button
            type="button"
            onClick={() => onOpenInChat(card.uri)}
            className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/80 transition hover:bg-white/[0.06]"
          >
            Ask
          </button>
        )}
      </footer>
    </article>
  );
}

// BriefTab — design-aligned executive brief surface.
// Matches docs/design/nodebench-ai-design-system/.../Report.jsx BRIEF artboard:
// kicker + title + subtitle + summary + key-facts. Future polish can add the
// what / so-what / now-what triad and receipts grid once backend provides them.
function BriefTab({ cards }: { cards: ReadonlyArray<ResourceCard> }) {
  const root = cards[0];
  if (!root) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-white/40">
        No brief available for this expansion yet.
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Design kicker — matches .type-kicker: 11px, uppercase, 0.18em tracking. */}
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Brief
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-white">
        {root.title}
      </h2>
      {root.subtitle && (
        <p className="mt-1 text-sm text-white/50">{root.subtitle}</p>
      )}
      {root.summary && (
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/80">
          {root.summary}
        </p>
      )}
      {root.keyFacts && root.keyFacts.length > 0 && (
        <div className="mt-6 max-w-2xl">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Key facts
          </div>
          <ul className="space-y-2 text-sm text-white/70">
            {root.keyFacts.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-[#d97757]">
                  •
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MapTab({
  cards,
  rootUri,
}: {
  cards: ReadonlyArray<ResourceCard>;
  rootUri: ResourceUri;
}) {
  const graph = useMemo(() => buildSimpleMapGraph(cards, rootUri), [cards, rootUri]);
  const [selectedUri, setSelectedUri] = useState<ResourceUri>(rootUri);
  const selected =
    graph.nodes.find((node) => node.uri === selectedUri) ??
    graph.nodes[0];

  if (graph.nodes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-white/40">
        No map nodes surfaced for this report yet.
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] overflow-hidden">
      <section className="min-h-0 overflow-hidden p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Relationship map
            </div>
            <p className="mt-1 text-xs text-white/45">
              Double-click a node from Cards to keep exploring the report graph.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-white/45">
            <span>{graph.nodes.length} nodes</span>
            <span>{graph.edges.length} edges</span>
          </div>
        </div>
        <svg
          viewBox="0 0 900 560"
          className="h-full max-h-[calc(100vh-190px)] min-h-[420px] w-full rounded-lg border border-white/[0.06] bg-[#0d1117]"
          role="img"
          aria-label="Report relationship map"
        >
          <defs>
            <radialGradient id="report-map-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(217,119,87,0.16)" />
              <stop offset="100%" stopColor="rgba(217,119,87,0)" />
            </radialGradient>
            <pattern id="report-map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M24 0 L0 0 0 24" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="900" height="560" fill="url(#report-map-grid)" />
          <circle cx="450" cy="280" r="235" fill="url(#report-map-glow)" />
          <circle cx="450" cy="280" r="190" fill="none" stroke="rgba(255,255,255,0.07)" strokeDasharray="2 6" />

          {graph.edges.map((edge) => {
            const from = graph.nodes.find((node) => node.uri === edge.from);
            const to = graph.nodes.find((node) => node.uri === edge.to);
            if (!from || !to) return null;
            const active = selected?.uri === edge.from || selected?.uri === edge.to;
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={active ? "#d97757" : "rgba(255,255,255,0.2)"}
                strokeWidth={active ? 2.2 : 1.2}
                strokeLinecap="round"
              />
            );
          })}

          {graph.nodes.map((node) => {
            const active = selected?.uri === node.uri;
            const radius = node.ring === 0 ? 42 : 31;
            return (
              <g
                key={node.uri}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedUri(node.uri)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedUri(node.uri);
                  }
                }}
                className="cursor-pointer outline-none"
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius + (active ? 7 : 3)}
                  fill="rgba(255,255,255,0.08)"
                  stroke={active ? "#d97757" : "rgba(255,255,255,0.1)"}
                />
                <circle cx={node.x} cy={node.y} r={radius} fill={mapNodeColor(node.kind)} />
                <text
                  x={node.x}
                  y={node.y + 4}
                  textAnchor="middle"
                  fontSize={node.ring === 0 ? 13 : 11}
                  fontWeight="800"
                  fill="#fffaf0"
                >
                  {node.initials}
                </text>
                <text x={node.x} y={node.y + radius + 18} textAnchor="middle" fontSize="12" fontWeight="700" fill="#f8fafc">
                  {shortMapTitle(node.title)}
                </text>
                <text x={node.x} y={node.y + radius + 32} textAnchor="middle" fontSize="10" fill="rgba(248,250,252,0.52)">
                  {node.kind}
                </text>
              </g>
            );
          })}
        </svg>
      </section>

      <aside className="min-h-0 overflow-y-auto border-l border-white/[0.06] bg-white/[0.02] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Selected node
        </div>
        {selected ? (
          <div className="mt-3">
            <h2 className="text-lg font-semibold text-white">{selected.title}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/60">
                {selected.kind}
              </span>
              <span className="rounded border border-[#d97757]/25 bg-[#d97757]/10 px-2 py-1 text-[11px] text-[#e59579]">
                {selected.confidence}% confidence
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/60">
              {selected.summary || "No summary surfaced for this node yet."}
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

type SimpleMapNode = {
  uri: ResourceUri;
  title: string;
  kind: string;
  summary: string;
  confidence: number;
  initials: string;
  ring: number;
  x: number;
  y: number;
};

type SimpleMapEdge = {
  from: ResourceUri;
  to: ResourceUri;
};

function buildSimpleMapGraph(cards: ReadonlyArray<ResourceCard>, rootUri: ResourceUri) {
  const byUri = new Map<ResourceUri, ResourceCard>();
  for (const card of cards) byUri.set(card.uri, card);
  const root = byUri.get(rootUri) ?? cards[0];
  if (!root) return { nodes: [] as SimpleMapNode[], edges: [] as SimpleMapEdge[] };

  const relatedUris =
    root.nextHops?.length
      ? root.nextHops
      : cards.filter((card) => card.uri !== root.uri).slice(0, 8).map((card) => card.uri);
  const relatedCards = relatedUris.map((uri) => byUri.get(uri) ?? makeSyntheticMapCard(uri)).slice(0, 8);
  const nodes: SimpleMapNode[] = [toSimpleMapNode(root, 0, 450, 280)];
  relatedCards.forEach((card, index) => {
    const angle = (index / Math.max(relatedCards.length, 1)) * Math.PI * 2 - Math.PI / 2;
    nodes.push(
      toSimpleMapNode(card, 1, 450 + Math.cos(angle) * 190, 280 + Math.sin(angle) * 190),
    );
  });
  const edges = relatedCards.map((card) => ({ from: root.uri, to: card.uri }));
  return { nodes, edges };
}

function toSimpleMapNode(card: ResourceCard, ring: number, x: number, y: number): SimpleMapNode {
  return {
    uri: card.uri,
    title: card.title,
    kind: mapNodeKind(card.kind, card.uri),
    summary: card.summary,
    confidence: Math.round(card.confidence * 100),
    initials: card.title
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    ring,
    x,
    y,
  };
}

function makeSyntheticMapCard(uri: ResourceUri): ResourceCard {
  const label = uri.split("/").pop()?.replace(/[-_]+/g, " ") || uri;
  return {
    cardId: `synthetic:${uri}`,
    uri,
    kind: uri.includes("person") ? "person_summary" : uri.includes("topic") ? "topic_summary" : "org_summary",
    title: label.replace(/\b\w/g, (char) => char.toUpperCase()),
    summary: "Related resource surfaced as a next hop.",
    confidence: 0.5,
  };
}

function mapNodeKind(kind: ResourceCard["kind"], uri: ResourceUri) {
  if (kind.includes("person") || uri.includes("person")) return "person";
  if (kind.includes("product") || uri.includes("product")) return "product";
  if (kind.includes("event") || uri.includes("event")) return "event";
  if (kind.includes("topic") || uri.includes("topic")) return "topic";
  if (kind.includes("evidence") || uri.includes("artifact")) return "source";
  if (kind.includes("signal")) return "claim";
  return "company";
}

function mapNodeColor(kind: string) {
  if (kind === "company") return "#0f4c81";
  if (kind === "person") return "#475569";
  if (kind === "product") return "#7a50b8";
  if (kind === "event") return "#0e7a5c";
  if (kind === "topic") return "#c77826";
  if (kind === "source") return "#64748b";
  if (kind === "claim") return "#d97757";
  return "#64748b";
}

function shortMapTitle(title: string) {
  const normalized = title.replace(/\s+/g, " ").trim();
  return normalized.length > 22 ? `${normalized.slice(0, 20).trim()}...` : normalized;
}

function LegacyMapTab() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <span className="rounded bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-wide text-white/50">
        v2
      </span>
      <h2 className="text-sm font-semibold text-white">Map view coming in v2</h2>
      <p className="max-w-md text-xs text-white/50">
        The canonical entity graph is live in v1 — use the Cards tab to explore.
        Force-directed mapping ships once the ontology is proven on real dossiers.
      </p>
    </div>
  );
}

function SourcesTab({ cards }: { cards: ReadonlyArray<ResourceCard> }) {
  const evidenceRefs = useMemo(
    () =>
      Array.from(
        new Set(
          cards
            .flatMap((c) => c.evidenceRefs ?? [])
            .map((ref) => String(ref)),
        ),
      ),
    [cards],
  );
  if (evidenceRefs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-white/40">
        No evidence surfaced for this expansion yet.
      </div>
    );
  }
  return (
    <ul className="flex-1 overflow-y-auto p-4 text-sm text-white/70">
      {evidenceRefs.map((ref) => (
        <li
          key={ref}
          className="truncate border-b border-white/[0.04] py-2 font-mono text-xs text-white/60"
        >
          {ref}
        </li>
      ))}
    </ul>
  );
}

function CompareTray({
  uris,
  onClear,
}: {
  uris: ReadonlyArray<ResourceUri>;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
        Compare tray ({uris.length})
      </span>
      <div className="flex items-center gap-2">
        <span className="truncate text-xs text-white/60">
          {uris.slice(-3).join(" · ")}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/70 transition hover:bg-white/[0.06]"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
