/**
 * ReportDetailWorkspace — the recursive Cards workspace for a single report.
 *
 * v1 scope (locked):
 *   - Tabs: Summary | Cards | Map | Sources (Cards default; Map shell only)
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
import type {
  ResourceCard,
  ResourceUri,
} from "../../../../shared/research/resourceCards";

type WorkspaceTab = "summary" | "cards" | "map" | "sources";

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
}: ReportDetailWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("cards");
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

      <TabBar activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {activeTab === "summary" && (
          <SummaryTab cards={columns[0]?.cards ?? []} />
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
        {activeTab === "map" && <MapTab />}
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

function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: WorkspaceTab;
  onChange: (t: WorkspaceTab) => void;
}) {
  const tabs: Array<{ id: WorkspaceTab; label: string; disabled?: boolean }> = [
    { id: "summary", label: "Summary" },
    { id: "cards", label: "Cards" },
    { id: "map", label: "Map", disabled: true },
    { id: "sources", label: "Sources" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Workspace view"
      className="flex items-center gap-1 border-b border-white/[0.06] bg-white/[0.01] px-3"
    >
      {tabs.map((t) => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-disabled={t.disabled}
            onClick={() => !t.disabled && onChange(t.id)}
            className={`relative px-3 py-2 text-xs font-medium transition ${
              t.disabled
                ? "cursor-not-allowed text-white/25"
                : isActive
                ? "text-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            {t.label}
            {t.disabled && (
              <span className="ml-1.5 rounded bg-white/[0.04] px-1 text-[10px] uppercase tracking-wide text-white/40">
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

function SummaryTab({ cards }: { cards: ReadonlyArray<ResourceCard> }) {
  const root = cards[0];
  if (!root) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-white/40">
        No summary available.
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-lg font-semibold text-white">{root.title}</h2>
      {root.subtitle && (
        <p className="mt-1 text-sm text-white/50">{root.subtitle}</p>
      )}
      {root.summary && (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80">
          {root.summary}
        </p>
      )}
      {root.keyFacts && root.keyFacts.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm text-white/70">
          {root.keyFacts.map((f, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-white/30">
                •
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MapTab() {
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
