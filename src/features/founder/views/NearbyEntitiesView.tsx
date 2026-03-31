/* ------------------------------------------------------------------ */
/*  Nearby Entities — Phase 6: Narrow entity context for v1           */
/*  Surfaces company, competitors, partners, and initiatives.         */
/* ------------------------------------------------------------------ */

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Eye, EyeOff, GitBranch, List, Network, Plus, X } from "lucide-react";
import {
  DEMO_COMPANY,
  DEMO_INITIATIVES,
  DEMO_NEARBY_ENTITIES,
  type NearbyEntity,
} from "./founderFixtures";
import { EntityGraph, type GraphNode, type GraphEdge } from "../components/EntityGraph";

// ─── Types ──────────────────────────────────────────────────────────

type EntityRelationship =
  | "competitor"
  | "partner"
  | "customer"
  | "product"
  | "initiative"
  | "comparable"
  | "design partner"
  | "market signal";

interface NearbyEntityRecord {
  id: string;
  name: string;
  relationship: EntityRelationship | string;
  description: string;
  watched: boolean;
  claimCount?: number;
  changeCount?: number;
  contradictionCount?: number;
  lastUpdated?: string;
}

interface CompanyRecord {
  name: string;
  companyState: string;
  identityConfidence: number;
  wedge: string;
}

// ─── localStorage keys ──────────────────────────────────────────────

const LS_COMPANY = "nodebench-company";
const LS_INTAKE_ENTITIES = "nodebench-intake-entities";
const LS_NEARBY_ENTITIES = "nodebench-nearby-entities";
const LS_WATCHED = "nodebench-watched-entities";

// ─── Helpers ────────────────────────────────────────────────────────

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

const COMPETITOR_TYPES = new Set(["competitor", "comparable"]);
const PARTNER_TYPES = new Set(["partner", "customer", "design partner"]);

// ─── Default demo competitors/partners ──────────────────────────────

const DEMO_COMPETITORS: NearbyEntityRecord[] = [];

const DEMO_PARTNERS: NearbyEntityRecord[] = [];

// ─── Component ──────────────────────────────────────────────────────

function NearbyEntitiesView() {
  // ── Company ────────────────────────────────────────────────────
  const company = useMemo<CompanyRecord>(() => {
    const stored = loadJSON<Partial<CompanyRecord> | null>(LS_COMPANY, null);
    if (stored?.name) {
      return {
        name: stored.name,
        companyState: stored.companyState ?? DEMO_COMPANY.companyState,
        identityConfidence:
          stored.identityConfidence ?? DEMO_COMPANY.identityConfidence,
        wedge: stored.wedge ?? DEMO_COMPANY.wedge,
      };
    }
    return {
      name: DEMO_COMPANY.name,
      companyState: DEMO_COMPANY.companyState,
      identityConfidence: DEMO_COMPANY.identityConfidence,
      wedge: DEMO_COMPANY.wedge,
    };
  }, []);

  // ── Entities (merged from intake + custom + demo fallback) ────
  const [entities, setEntities] = useState<NearbyEntityRecord[]>(() => {
    const custom = loadJSON<NearbyEntityRecord[]>(LS_NEARBY_ENTITIES, []);
    const intake = loadJSON<NearbyEntity[]>(LS_INTAKE_ENTITIES, []);

    // Convert intake entities
    const intakeRecords: NearbyEntityRecord[] = intake.map((e) => ({
      id: e.id,
      name: e.name,
      relationship: e.relationship,
      description: e.whyItMatters,
      watched: false,
    }));

    // Convert demo nearby entities
    const demoRecords: NearbyEntityRecord[] = DEMO_NEARBY_ENTITIES.map((e) => ({
      id: e.id,
      name: e.name,
      relationship: e.relationship,
      description: e.whyItMatters,
      watched: false,
      claimCount: e.claimCount,
      changeCount: e.changeCount,
      contradictionCount: e.contradictionCount,
      lastUpdated: e.lastUpdated,
    }));

    // Merge: custom first, then intake, then demo competitors/partners as fallback
    const merged = new Map<string, NearbyEntityRecord>();
    for (const e of custom) merged.set(e.id, e);
    for (const e of intakeRecords) if (!merged.has(e.id)) merged.set(e.id, e);

    // If no competitors/partners exist, inject demo data
    const vals = [...merged.values()];
    const hasCompetitors = vals.some((e) => COMPETITOR_TYPES.has(e.relationship));
    const hasPartners = vals.some((e) => PARTNER_TYPES.has(e.relationship));

    if (!hasCompetitors && intakeRecords.length === 0 && custom.length === 0) {
      for (const e of DEMO_COMPETITORS) merged.set(e.id, e);
    }
    if (!hasPartners && intakeRecords.length === 0 && custom.length === 0) {
      for (const e of DEMO_PARTNERS) merged.set(e.id, e);
    }

    // Also add demo nearby entities if nothing else
    if (merged.size === 0) {
      for (const e of demoRecords) merged.set(e.id, e);
    }

    return [...merged.values()];
  });

  // ── Watched set ────────────────────────────────────────────────
  const [watchedIds, setWatchedIds] = useState<Set<string>>(
    () => new Set(loadJSON<string[]>(LS_WATCHED, [])),
  );

  useEffect(() => {
    saveJSON(LS_WATCHED, [...watchedIds]);
  }, [watchedIds]);

  const toggleWatch = useCallback((id: string) => {
    setWatchedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Add entity form ────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<string>("competitor");
  const [formDesc, setFormDesc] = useState("");

  const handleAddEntity = useCallback(() => {
    if (!formName.trim()) return;
    const newEntity: NearbyEntityRecord = {
      id: `custom-${Date.now()}`,
      name: formName.trim(),
      relationship: formType,
      description: formDesc.trim() || `${formType} entity`,
      watched: false,
    };
    setEntities((prev) => {
      const next = [...prev, newEntity];
      saveJSON(LS_NEARBY_ENTITIES, next);
      return next;
    });
    setFormName("");
    setFormType("competitor");
    setFormDesc("");
    setShowForm(false);
  }, [formName, formType, formDesc]);

  // ── Grouped entities ───────────────────────────────────────────
  const competitors = useMemo(
    () => entities.filter((e) => COMPETITOR_TYPES.has(e.relationship)),
    [entities],
  );
  const partners = useMemo(
    () => entities.filter((e) => PARTNER_TYPES.has(e.relationship)),
    [entities],
  );
  const others = useMemo(
    () =>
      entities.filter(
        (e) =>
          !COMPETITOR_TYPES.has(e.relationship) &&
          !PARTNER_TYPES.has(e.relationship) &&
          e.relationship !== "initiative",
      ),
    [entities],
  );

  const confidencePct = Math.round(company.identityConfidence * 100);

  // ── Graph data derivation ─────────────────────────────────────
  const [viewMode, setViewMode] = useState<"list" | "graph">("list");

  const graphData = useMemo(() => {
    const gNodes: GraphNode[] = [];
    const gEdges: GraphEdge[] = [];

    // Center node: user's company
    gNodes.push({
      id: "self",
      label: company.name,
      type: "company",
      description: company.wedge || "Your company",
      isPrimary: true,
    });

    // Add all entities as graph nodes with edges to center
    for (const entity of entities) {
      const nodeId = `entity-${entity.id}`;
      gNodes.push({
        id: nodeId,
        label: entity.name,
        type: entity.relationship as GraphNode["type"],
        description: entity.description,
      });
      gEdges.push({
        source: "self",
        target: nodeId,
        relationship: entity.relationship,
      });
    }

    return { nodes: gNodes, edges: gEdges };
  }, [company, entities]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Network className="h-5 w-5 text-[#d97757]" />
            <h1 className="text-xl font-semibold text-white">
              Nearby Entities
            </h1>
          </div>
          <p className="mt-1 text-sm text-white/60">
            Context for your company's competitive and partnership landscape
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-white/[0.10] overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-[#d97757]/15 text-[#d97757]"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("graph")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "graph"
                  ? "bg-[#d97757]/15 text-[#d97757]"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Graph
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((p) => !p)}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.20] bg-white/[0.12] px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Entity
          </button>
        </div>
      </div>

      {/* ── Graph View ──────────────────────────────────────────── */}
      {viewMode === "graph" && (
        <div className="mb-8">
          <EntityGraph
            nodes={graphData.nodes}
            edges={graphData.edges}
            onNodeClick={(_id, label) => {
              // Could navigate to search for this entity
              window.dispatchEvent(new CustomEvent("nodebench:search", { detail: { query: label } }));
            }}
          />
        </div>
      )}

      {/* ── List View ───────────────────────────────────────────── */}
      {viewMode === "list" && (<>


      {/* ── Add Entity Form ──────────────────────────────────────── */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
              New Entity
            </span>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-white/60 transition-colors hover:text-white/60"
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Entity name"
              className="rounded-lg border border-white/[0.06] bg-white/[0.07] px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#d97757]/40"
            />
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="rounded-lg border border-white/[0.06] bg-white/[0.07] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#d97757]/40"
            >
              <option value="competitor">Competitor</option>
              <option value="partner">Partner</option>
              <option value="customer">Customer</option>
              <option value="product">Product</option>
            </select>
            <input
              type="text"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Brief description"
              className="rounded-lg border border-white/[0.06] bg-white/[0.07] px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#d97757]/40"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleAddEntity}
              disabled={!formName.trim()}
              className="rounded-lg bg-[#d97757] px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* ── Your Company ─────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
          Your Company
        </div>
        <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-base font-semibold text-white">
              {company.name}
            </span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.07] px-2 py-0.5 text-[11px] font-medium capitalize text-white/60">
              {company.companyState}
            </span>
            <span className="text-[11px] text-white/60">
              {confidencePct}% confidence
            </span>
          </div>
          <p className="mt-1.5 text-sm text-white/60">{company.wedge}</p>
        </div>
      </section>

      {/* ── Competitors ──────────────────────────────────────────── */}
      {competitors.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Competitors ({competitors.length})
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {competitors.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                watched={watchedIds.has(entity.id)}
                onToggleWatch={toggleWatch}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Partners / Customers ─────────────────────────────────── */}
      {partners.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Partners ({partners.length})
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                watched={watchedIds.has(entity.id)}
                onToggleWatch={toggleWatch}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Other entities (products, market signals, etc.) ──────── */}
      {others.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Other Entities ({others.length})
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                watched={watchedIds.has(entity.id)}
                onToggleWatch={toggleWatch}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Initiatives ──────────────────────────────────────────── */}
      <section>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
          Initiatives ({DEMO_INITIATIVES.length})
        </div>
        <div className="flex flex-wrap gap-2">
          {DEMO_INITIATIVES.map((init) => (
            <span
              key={init.id}
              className="inline-flex items-center rounded-full border border-white/[0.20] bg-white/[0.12] px-3 py-1 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white/80"
            >
              {init.title}
            </span>
          ))}
        </div>
      </section>
      </>)}
    </div>
  );
}

// ─── Entity Card ──────────────────────────────────────────────────────

/** Compute staleness level from an ISO date string. */
function getStaleness(
  lastUpdated: string | undefined,
): "fresh" | "stale" | "very-stale" {
  if (!lastUpdated) return "fresh";
  const diffMs = Date.now() - new Date(lastUpdated).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 14) return "very-stale";
  if (diffDays > 7) return "stale";
  return "fresh";
}

const EntityCard = memo(function EntityCard({
  entity,
  watched,
  onToggleWatch,
}: {
  entity: NearbyEntityRecord;
  watched: boolean;
  onToggleWatch: (id: string) => void;
}) {
  const WatchIcon = watched ? Eye : EyeOff;
  const claims = entity.claimCount ?? 0;
  const changes = entity.changeCount ?? 0;
  const contradictions = entity.contradictionCount ?? 0;
  const hasUpdates = claims > 0 || changes > 0 || contradictions > 0;
  const staleness = getStaleness(entity.lastUpdated);

  return (
    <div className="flex min-h-[44px] flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-white">
            {entity.name}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {staleness !== "fresh" && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  staleness === "very-stale"
                    ? "border border-rose-500/20 bg-rose-500/10 text-rose-400"
                    : "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                }`}
              >
                <AlertTriangle className="h-2.5 w-2.5" />
                Stale
              </span>
            )}
            <span className="rounded-full border border-white/[0.08] bg-white/[0.07] px-2 py-0.5 text-[10px] font-medium text-white/60">
              {entity.relationship}
            </span>
          </div>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-white/60">
          {entity.description}
        </p>

        {/* ── Inline claim / change / contradiction indicators ──── */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
          {hasUpdates ? (
            <>
              {claims > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {claims} {claims === 1 ? "claim" : "claims"}
                </span>
              )}
              {changes > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {changes} {changes === 1 ? "change" : "changes"}
                </span>
              )}
              {contradictions > 0 && (
                <span className="inline-flex items-center gap-1 text-[#d97757]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#d97757]" />
                  {contradictions}{" "}
                  {contradictions === 1 ? "contradiction" : "contradictions"}
                </span>
              )}
            </>
          ) : (
            <span className="text-white/30">No updates</span>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => onToggleWatch(entity.id)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-white/[0.06]"
          style={{ color: watched ? "#d97757" : "rgba(255,255,255,0.35)" }}
          aria-label={
            watched ? `Stop watching ${entity.name}` : `Watch ${entity.name}`
          }
        >
          <WatchIcon className="h-3.5 w-3.5" />
          {watched ? "Watching" : "Watch"}
        </button>
      </div>
    </div>
  );
});

export default memo(NearbyEntitiesView);
