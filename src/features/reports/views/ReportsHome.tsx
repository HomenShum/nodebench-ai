import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { Check, Link2, Search, Building2, User, Briefcase, TrendingUp, FileText } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useConvexApi } from "@/lib/convexApi";
import { cn } from "@/lib/utils";
import { ProductThumbnail } from "@/features/product/components/ProductThumbnail";
import { buildEntityShareUrl } from "@/features/entities/lib/entityExport";
import { STARTER_ENTITY_WORKSPACES } from "@/features/entities/lib/starterEntityWorkspaces";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { useProductBootstrap } from "@/features/product/lib/useProductBootstrap";
import { RecentPulseStrip } from "@/features/reports/components/RecentPulseStrip";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EntityCard = {
  _id?: string;
  slug: string;
  name: string;
  summary: string;
  entityType: string;
  latestReportType?: string;
  latestRevision: number;
  reportCount: number;
  updatedAt?: number;
  updatedLabel: string;
  thumbnailUrl?: string;
  thumbnailUrls?: string[];
  sourceUrls?: string[];
  sourceLabels?: string[];
  origin?: "user" | "system";
  originLabel?: string;
  systemGroup?: string;
  relatedEntities?: Array<{ slug: string; name: string; entityType: string; reason?: string }>;
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "companies", label: "Companies", type: "company" },
  { id: "people", label: "People", type: "person" },
  { id: "jobs", label: "Jobs", type: "job" },
  { id: "markets", label: "Markets", type: "market" },
  { id: "notes", label: "Notes", type: "note" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];
type ReportGroupBy = "entityType" | "updatedAt" | "origin";
type ReportGroup = {
  label: string;
  cards: EntityCard[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatRelative(timestamp?: number) {
  if (!timestamp) return "—";
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

export type FreshnessTier = "fresh" | "recent" | "stale" | "unknown";

export function getFreshness(timestamp?: number, now: number = Date.now()): FreshnessTier {
  if (!timestamp) return "unknown";
  const ageMs = now - timestamp;
  if (ageMs < 0) return "fresh"; // future timestamp treated as fresh, not negative-age
  if (ageMs < 24 * 60 * 60 * 1000) return "fresh";
  if (ageMs < 7 * 24 * 60 * 60 * 1000) return "recent";
  return "stale";
}

function freshnessPillClass(tier: FreshnessTier) {
  switch (tier) {
    case "fresh":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "recent":
      return "border-gray-200 bg-gray-50 text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300";
    case "stale":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
    default:
      return "border-gray-200 bg-gray-50 text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-400";
  }
}

function getDateGroup(timestamp?: number): string {
  if (!timestamp) return "Earlier";
  const ageMs = Date.now() - timestamp;
  if (ageMs < 24 * 60 * 60 * 1000) return "Today";
  if (ageMs < 7 * 24 * 60 * 60 * 1000) return "This week";
  if (ageMs < 30 * 24 * 60 * 60 * 1000) return "This month";
  return "Earlier";
}

function getEntityTypeGroup(entityType: string) {
  const normalized = entityType.trim().toLowerCase();
  if (normalized === "person") return "People";
  if (normalized === "company") return "Companies";
  if (normalized === "job") return "Roles";
  if (normalized === "market") return "Markets";
  if (normalized === "note") return "Notes";
  return "Other";
}

export function filterReportCards(cards: EntityCard[], filterId: FilterId): EntityCard[] {
  const activeFilterDef = FILTERS.find((filter) => filter.id === filterId);
  const typeFilter =
    activeFilterDef && "type" in activeFilterDef ? activeFilterDef.type : undefined;
  if (!typeFilter) return cards;
  return cards.filter((card) => card.entityType.toLowerCase() === typeFilter);
}

export function buildReportGroups(cards: EntityCard[], groupBy: ReportGroupBy): ReportGroup[] {
  const groups = new Map<string, EntityCard[]>();
  for (const card of cards) {
    const group =
      groupBy === "entityType"
        ? getEntityTypeGroup(card.entityType)
        : groupBy === "origin"
          ? card.origin === "system"
            ? "System intelligence"
            : "Your workspace"
          : getDateGroup(card.updatedAt);
    const list = groups.get(group) ?? [];
    list.push(card);
    groups.set(group, list);
  }

  const order =
    groupBy === "entityType"
      ? ["People", "Companies", "Roles", "Markets", "Notes", "Other"]
      : groupBy === "origin"
        ? ["Your workspace", "System intelligence"]
      : ["Today", "This week", "This month", "Earlier"];

  return order
    .map((label) => ({ label, cards: groups.get(label) ?? [] }))
    .filter((group) => group.cards.length > 0);
}

function EntityIcon({ type, className = "h-3.5 w-3.5" }: { type: string; className?: string }) {
  const normalized = type.toLowerCase();
  if (normalized === "company") return <Building2 className={className} />;
  if (normalized === "person") return <User className={className} />;
  if (normalized === "job") return <Briefcase className={className} />;
  if (normalized === "market") return <TrendingUp className={className} />;
  return <FileText className={className} />;
}

function entityTypeColor(type: string) {
  const normalized = type.toLowerCase();
  if (normalized === "company") return "text-blue-600 dark:text-blue-400";
  if (normalized === "person") return "text-violet-600 dark:text-violet-400";
  if (normalized === "job") return "text-amber-600 dark:text-amber-400";
  if (normalized === "market") return "text-emerald-600 dark:text-emerald-400";
  return "text-gray-500 dark:text-gray-400";
}

function getEntityThumbnailTone(entityType: string, index: number) {
  const normalized = entityType.toLowerCase();
  if (normalized === "company") return 1;
  if (normalized === "person") return 3;
  if (normalized === "job") return 4;
  if (normalized === "market") return 2;
  return index % 6;
}

/* ------------------------------------------------------------------ */
/*  Starter cards                                                      */
/* ------------------------------------------------------------------ */

const STARTER_CARDS: EntityCard[] = STARTER_ENTITY_WORKSPACES.map((workspace, index) => ({
  slug: workspace.entity.slug,
  name: workspace.entity.name,
  summary: workspace.entity.summary,
  entityType: workspace.entity.entityType,
  latestRevision: workspace.entity.latestRevision,
  reportCount: workspace.entity.reportCount,
  updatedAt: Date.now() - index * 60 * 60 * 1000,
  updatedLabel: workspace.latest?.updatedLabel ?? "Starter",
  sourceUrls: workspace.evidence
    .map((item) => item.sourceUrl)
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0),
  sourceLabels: workspace.evidence.map((item) => item.label),
}));

/* ------------------------------------------------------------------ */
/*  Report Card (Linear-inspired)                                      */
/* ------------------------------------------------------------------ */

function ReportCard({
  card,
  index,
  copiedSlug,
  onShare,
  onClick,
}: {
  card: EntityCard;
  index: number;
  copiedSlug: string | null;
  onShare: (slug: string) => void;
  onClick: (slug: string) => void;
}) {
  const iconColor = entityTypeColor(card.entityType);
  const sourceCount = card.sourceUrls?.length ?? 0;
  const relatedPreview = card.relatedEntities?.slice(0, 2) ?? [];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/[0.15] dark:hover:bg-white/[0.03]">
      {/* Main clickable area */}
      <button
        type="button"
        onClick={() => onClick(card.slug)}
        className="flex h-full w-full flex-col text-left"
      >
        {/* Thumbnail — no meta prop to avoid top-right collision with share button */}
        <div aria-hidden="true" className="relative border-b border-gray-100 dark:border-white/[0.06]">
          <ProductThumbnail
            className="aspect-[16/10]"
            title={card.name}
            summary={card.summary}
            type={card.entityType}
            imageUrl={card.thumbnailUrl}
            imageUrls={card.thumbnailUrls}
            sourceUrls={card.sourceUrls}
            sourceLabels={card.sourceLabels}
            tone={getEntityThumbnailTone(card.entityType, index)}
            compact
          />
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-2 px-4 py-3">
          {/* Title + type icon */}
          <div className="flex items-center gap-2">
            <span className={iconColor}>
              <EntityIcon type={card.entityType} />
            </span>
            <h3 className="flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {card.name}
            </h3>
          </div>

          {/* Summary */}
          <p className="line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {card.summary}
          </p>

          {relatedPreview.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {relatedPreview.map((related) => (
                <span
                  key={`${card.slug}-${related.slug}`}
                  className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500 dark:border-white/[0.08] dark:text-gray-400"
                >
                  {related.name}
                </span>
              ))}
            </div>
          ) : null}

          {/* Metadata footer */}
          <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-3">
              <span>{card.originLabel ?? (card.origin === "system" ? "System" : "Workspace")}</span>
              <span className="capitalize">{card.entityType}</span>
              {card.reportCount > 0 && (
                <span className="tabular-nums">
                  {card.reportCount} brief{card.reportCount === 1 ? "" : "s"}
                </span>
              )}
              {sourceCount > 0 && (
                <span className="hidden tabular-nums sm:inline">
                  {sourceCount} source{sourceCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums",
                freshnessPillClass(getFreshness(card.updatedAt)),
              )}
            >
              {formatRelative(card.updatedAt)}
            </span>
          </div>
        </div>
      </button>

      {/* Share button — overlay on top-right, appears on hover. Placed AFTER main button so it sits above. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onShare(card.slug);
        }}
        className={`absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-md border bg-white/95 shadow-sm backdrop-blur transition-all dark:bg-gray-900/90 ${
          copiedSlug === card.slug
            ? "border-green-400 text-green-500 opacity-100 dark:border-green-500/40"
            : "border-gray-200 text-gray-400 opacity-0 hover:text-gray-600 group-hover:opacity-100 dark:border-white/10 dark:hover:text-gray-300"
        }`}
        aria-label={`Share ${card.name}`}
      >
        {copiedSlug === card.slug ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
      </button>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function ReportsHome() {
  useProductBootstrap();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const api = useConvexApi();
  const anonymousSessionId = getAnonymousProductSessionId();

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [copiedEntitySlug, setCopiedEntitySlug] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<ReportGroupBy>("updatedAt");

  const entities = useQuery(
    api?.domains.product.entities.listEntities ?? "skip",
    api?.domains.product.entities.listEntities
      ? { anonymousSessionId, search: query, filter: "All" }
      : "skip",
  );

  const liveCards = useMemo<EntityCard[]>(
    () =>
      (entities ?? []).map((entity: any) => ({
        _id: String(entity._id),
        slug: entity.slug,
        name: entity.name,
        summary: entity.summary,
        entityType: entity.entityType,
        latestReportType: typeof entity.latestReportType === "string" ? entity.latestReportType : undefined,
        latestRevision: entity.latestRevision,
        reportCount: entity.reportCount,
        updatedAt: entity.latestReportUpdatedAt,
        updatedLabel: formatRelative(entity.latestReportUpdatedAt),
        thumbnailUrl: typeof entity.thumbnailUrl === "string" ? entity.thumbnailUrl : undefined,
        thumbnailUrls: Array.isArray(entity.thumbnailUrls)
          ? entity.thumbnailUrls.filter((url: unknown): url is string => typeof url === "string")
          : undefined,
        sourceUrls: Array.isArray(entity.sourceUrls)
          ? entity.sourceUrls.filter((url: unknown): url is string => typeof url === "string")
          : undefined,
        sourceLabels: Array.isArray(entity.sourceLabels)
          ? entity.sourceLabels.filter((label: unknown): label is string => typeof label === "string")
          : undefined,
        origin: "user",
        originLabel: "Workspace",
      })),
    [entities],
  );
  const systemEntities = useQuery(
    api?.domains?.product?.systemIntelligence?.listSystemReportCards ?? "skip",
    api?.domains?.product?.systemIntelligence?.listSystemReportCards
      ? { search: query, filter: "All" }
      : "skip",
  );

  const systemCards = useMemo<EntityCard[]>(
    () =>
      (systemEntities ?? []).map((entity: any) => ({
        slug: entity.slug,
        name: entity.name,
        summary: entity.summary,
        entityType: entity.entityType,
        latestReportType: typeof entity.latestReportType === "string" ? entity.latestReportType : "system_intelligence",
        latestRevision: entity.latestRevision,
        reportCount: entity.reportCount,
        updatedAt: entity.latestReportUpdatedAt,
        updatedLabel: formatRelative(entity.latestReportUpdatedAt),
        thumbnailUrl: typeof entity.thumbnailUrl === "string" ? entity.thumbnailUrl : undefined,
        thumbnailUrls: Array.isArray(entity.thumbnailUrls)
          ? entity.thumbnailUrls.filter((url: unknown): url is string => typeof url === "string")
          : undefined,
        sourceUrls: Array.isArray(entity.sourceUrls)
          ? entity.sourceUrls.filter((url: unknown): url is string => typeof url === "string")
          : undefined,
        sourceLabels: Array.isArray(entity.sourceLabels)
          ? entity.sourceLabels.filter((label: unknown): label is string => typeof label === "string")
          : undefined,
        origin: "system",
        originLabel: typeof entity.originLabel === "string" ? entity.originLabel : "System intelligence",
        systemGroup: typeof entity.systemGroup === "string" ? entity.systemGroup : undefined,
        relatedEntities: Array.isArray(entity.relatedEntities)
          ? entity.relatedEntities.filter(
              (related: unknown): related is { slug: string; name: string; entityType: string; reason?: string } =>
                Boolean(related) &&
                typeof (related as any).slug === "string" &&
                typeof (related as any).name === "string" &&
                typeof (related as any).entityType === "string",
            )
          : undefined,
      })),
    [systemEntities],
  );

  const cards = useMemo(() => {
    const merged = [...liveCards, ...systemCards];
    if (merged.length === 0) return STARTER_CARDS;
    const seen = new Set<string>();
    const deduped: EntityCard[] = [];
    for (const card of merged) {
      const key = card.slug.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(card);
    }
    return deduped;
  }, [liveCards, systemCards]);

  const filteredCards = useMemo(() => {
    return filterReportCards(cards, activeFilter);
  }, [cards, activeFilter]);

  const groupedCards = useMemo(() => {
    return buildReportGroups(filteredCards, groupBy);
  }, [filteredCards, groupBy]);

  const shareEntity = useCallback((slug: string) => {
    void navigator.clipboard.writeText(buildEntityShareUrl(slug));
    setCopiedEntitySlug(slug);
    setTimeout(() => setCopiedEntitySlug(null), 1500);
    trackEvent("entity_link_shared", { entity: slug });
  }, []);

  const openEntity = useCallback(
    (slug: string) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("surface", "reports");
      nextParams.set("entity", slug);
      setSearchParams(nextParams, { replace: true });
      trackEvent("entity_workspace_opened", { entity: slug });
      navigate(`/entity/${encodeURIComponent(slug)}`);
    },
    [navigate, searchParams, setSearchParams],
  );

  const totalCount = filteredCards.length;
  const freshCount = useMemo(
    () => filteredCards.filter((c) => getFreshness(c.updatedAt) === "fresh").length,
    [filteredCards],
  );
  const staleCount = useMemo(
    () => filteredCards.filter((c) => getFreshness(c.updatedAt) === "stale").length,
    [filteredCards],
  );

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 sm:py-8">
      {/* ── New updates strip (Phase 4 spec: "Updates section") ──
           Silent-when-idle; surfaces unread pulses across all watched
           entities. Click-through to /entity/<slug>/pulse. */}
      <RecentPulseStrip className="mb-4" />
      {/* ── Header ── */}
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Reports</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {totalCount} {totalCount === 1 ? "report" : "reports"}
            {freshCount > 0 ? (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                · {freshCount} updated today
              </span>
            ) : null}
            {staleCount > 0 ? (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                · {staleCount} stale
              </span>
            ) : null}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full max-w-[280px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            id="reports-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            aria-label="Search reports"
            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-white/20"
          />
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>Group by</span>
        {[
          { id: "origin" as const, label: "Origin" },
          { id: "updatedAt" as const, label: "Date" },
          { id: "entityType" as const, label: "Type" },
        ].map((option) => {
          const active = groupBy === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setGroupBy(option.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 transition-colors",
                active
                  ? "border-gray-300 bg-gray-100 text-gray-900 dark:border-white/[0.16] dark:bg-white/[0.08] dark:text-gray-100"
                  : "border-gray-200 text-gray-500 hover:text-gray-800 dark:border-white/[0.08] dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* ── Filter tabs ── */}
      <nav
        className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-gray-100 dark:border-white/[0.06]"
        aria-label="Filter reports"
      >
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.id;
          const count = f.id === "all"
            ? cards.length
            : "type" in f
              ? cards.filter((c) => c.entityType.toLowerCase() === f.type).length
              : 0;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              aria-pressed={isActive}
            >
              {f.label}
              {count > 0 && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] tabular-nums text-gray-600 dark:bg-white/[0.05] dark:text-gray-400">
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute inset-x-0 bottom-[-1px] h-[2px] bg-gray-900 dark:bg-gray-100" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Grouped card grid ── */}
      {groupedCards.length > 0 ? (
        <div className="space-y-8">
          {groupedCards.map((group) => (
            <section key={group.label}>
              {/* Group header — subtle */}
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {group.label}
                </h2>
                <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500">
                  {group.cards.length}
                </span>
              </div>

              {/* Card grid */}
              <div
                className={cn(
                  "grid gap-3",
                  group.cards.length === 1
                    ? "max-w-[28rem] grid-cols-1"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                )}
              >
                {group.cards.map((card, index) => (
                  <ReportCard
                    key={card.slug}
                    card={card}
                    index={index}
                    copiedSlug={copiedEntitySlug}
                    onShare={shareEntity}
                    onClick={openEntity}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 bg-white py-16 text-center dark:border-white/[0.06] dark:bg-white/[0.01]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No reports match your search.
          </p>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-2 text-sm text-[var(--accent-primary)] hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportsHome;
