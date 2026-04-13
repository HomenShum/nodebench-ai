/**
 * EntityPage - Compound note page for a single entity.
 *
 * Like an Obsidian vault page: shows ALL interactions with one entity over time.
 * Temporal diffs between reports, editable notes, source accumulation.
 *
 * Route: /entity/:slug (via viewRegistry "entity" entry)
 */

import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Check,
  Clock,
  ExternalLink,
  FileText,
  Link2,
  MessageSquare,
  Search,
  Building2,
  User,
  Briefcase,
  TrendingUp,
  StickyNote,
  Upload,
} from "lucide-react";
import { useConvexApi } from "@/lib/convexApi";
import { buildCockpitPath } from "@/lib/registry/viewRegistry";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { useProductBootstrap } from "@/features/product/lib/useProductBootstrap";
import { ProductWorkspaceHeader } from "@/features/product/components/ProductWorkspaceHeader";
import { buildCrmSummary, buildEntityMarkdown, buildEntityShareUrl, buildOutreachDraft } from "@/features/entities/lib/entityExport";
import { EntityMemoryGraph } from "@/features/entities/components/EntityMemoryGraph";
import { EntityNotebookMeta } from "@/features/entities/components/EntityNotebookMeta";
import { EntityActionPanel } from "@/features/entities/components/EntityActionPanel";
import {
  buildEntityNoteDocumentDraft,
  createEmptyEntityNoteDocument,
  type LegacyEntityNoteBlock,
  type EntityNoteDocument,
} from "@/features/entities/lib/entityNoteDocument";
import { getStarterEntityWorkspace } from "@/features/entities/lib/starterEntityWorkspaces";

const EntityNoteEditor = lazy(() => import("@/features/entities/components/EntityNoteEditor"));

// ── Types ────────────────────────────────────────────────────────────────────

type ReportSection = {
  id: string;
  title: string;
  body: string;
  status?: string;
};

type ReportSource = {
  id: string;
  label: string;
  href?: string;
  type?: string;
  domain?: string;
};

type SectionDiff = {
  id: string;
  title: string;
  status: "new" | "changed";
  previousBody: string;
  currentBody: string;
};

type TimelineReport = {
  _id: string;
  title: string;
  type: string;
  summary: string;
  query: string;
  lens: string;
  sections: ReportSection[];
  sources: ReportSource[];
  diffs: SectionDiff[];
  isLatest: boolean;
  createdAt: number;
  updatedAt: number;
  revision?: number;
};

type EntityWorkspace = {
  entity: {
    _id: string;
    name: string;
    slug: string;
    entityType: string;
    summary: string;
    reportCount: number;
    createdAt: number;
    updatedAt: number;
  };
  note: { _id: string; content: string; blocks?: LegacyEntityNoteBlock[]; createdAt: number; updatedAt: number } | null;
  noteDocument?: EntityNoteDocument | null;
  latest: TimelineReport | null;
  timeline: TimelineReport[];
  evidence: Array<{ _id: string; label: string; type: string; sourceUrl?: string; entityId?: string }>;
  relatedEntities?: Array<{ slug: string; name: string; entityType: string; summary: string; reason?: string }>;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number | undefined | null) {
  if (!ts || ts <= 0) return "Recently";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(ts: number | undefined | null): string {
  if (!ts || ts <= 0) return "Recently";
  const delta = Date.now() - ts;
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(ts);
}

function entityTypeIcon(type: string) {
  switch (type) {
    case "company":
      return <Building2 className="h-4 w-4" />;
    case "person":
      return <User className="h-4 w-4" />;
    case "job":
      return <Briefcase className="h-4 w-4" />;
    case "market":
      return <TrendingUp className="h-4 w-4" />;
    case "note":
      return <StickyNote className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function computeDiffSummary(diffs: SectionDiff[]): string {
  if (!diffs.length) return "";
  const parts: string[] = [];
  const newSections = diffs.filter((d) => d.status === "new");
  const changedSections = diffs.filter((d) => d.status === "changed");
  if (newSections.length) {
    parts.push(
      `${newSections.length} new section${newSections.length > 1 ? "s" : ""}: ${newSections
        .map((d) => `"${d.title}"`)
        .join(", ")}`,
    );
  }
  if (changedSections.length) {
    parts.push(
      `${changedSections.length} updated: ${changedSections.map((d) => `"${d.title}"`).join(", ")}`,
    );
  }
  return parts.join(" · ");
}

function totalSources(timeline: TimelineReport[]): number {
  const seen = new Set<string>();
  for (const report of timeline) {
    for (const source of report.sources ?? []) {
      seen.add(source.id || source.label);
    }
  }
  return seen.size;
}

// ── Entity Index (no entity selected) ────────────────────────────────────────

const FILTERS = ["All", "Companies", "People", "Jobs", "Markets", "Notes", "Recent"] as const;

function EntityIndex() {
  useProductBootstrap();
  const api = useConvexApi();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const anonymousSessionId = getAnonymousProductSessionId();

  const entities = useQuery(
    api?.domains.product.entities.listEntities ?? ("skip" as any),
    api?.domains.product.entities.listEntities
      ? { anonymousSessionId, search: search || undefined, filter: activeFilter }
      : "skip",
  );

  const starterEntities = useMemo(
    () => [
      {
        _id: "starter-company",
        name: "Your first company",
        entityType: "company",
        summary:
          "Search any company in Chat and the entity page will accumulate every report, note, and source about it.",
        reportCount: 0,
        updatedAt: Date.now(),
        starter: true,
      },
    ],
    [],
  );

  const displayEntities = entities?.length ? entities : starterEntities;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ProductWorkspaceHeader
        kicker="Entities"
        title="Every company, person, and topic you have researched."
        description="Each entity page compounds searches, notes, evidence, and follow-on work over time."
      />

      {/* Search + Filter */}
      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entities..."
            className="w-full rounded-lg border border-white/6 bg-transparent py-2.5 pl-10 pr-4 text-sm text-content placeholder:text-content-muted/60 focus:outline-none focus:ring-1 focus:ring-[#d97757]/50"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              activeFilter === f
                ? "bg-[#d97757] text-white"
                : "bg-white/[0.04] text-content-muted hover:bg-white/[0.08]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Entity cards */}
      <div className="mt-6 space-y-2">
        {displayEntities.map((entity: any) => (
          <button
            key={entity._id}
            type="button"
            onClick={() => {
              if (entity.starter) {
                navigate(buildCockpitPath({ surfaceId: "workspace" }));
              } else {
                navigate(`/entity/${encodeURIComponent(entity.slug ?? entity.name)}`);
              }
            }}
            className="group flex w-full items-start gap-4 rounded-lg border border-white/6 bg-white/[0.02] px-4 py-3.5 text-left transition hover:border-white/10 hover:bg-white/[0.04]"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-content-muted">
              {entityTypeIcon(entity.entityType)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-content group-hover:text-[#d97757] transition">
                  {entity.name}
                </span>
                {entity.reportCount > 0 && (
                  <span className="shrink-0 rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-content-muted">
                    {entity.reportCount} {entity.reportCount === 1 ? "search" : "searches"}
                  </span>
                )}
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-content-muted">
                {entity.summary}
              </p>
            </div>
            <span className="shrink-0 pt-1 text-[10px] text-content-muted">
              {entity.updatedLabel ?? formatRelative(entity.updatedAt)}
            </span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {entities !== undefined && entities.length === 0 && search && (
        <div className="mt-12 text-center text-sm text-content-muted">
          No entities matching &ldquo;{search}&rdquo;
        </div>
      )}
    </div>
  );
}

// ── Main Entity Page ─────────────────────────────────────────────────────────

export function EntityPage({ entitySlug }: { entitySlug?: string }) {
  useProductBootstrap();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Resolve slug from: prop > URL path /entity/:slug > query param ?entity=
  const slugFromPath = useMemo(() => {
    const match = location.pathname.match(/^\/entity[/\\](.+)$/i);
    return match ? decodeURIComponent(match[1]) : null;
  }, [location.pathname]);

  const slug = entitySlug || slugFromPath || searchParams.get("entity") || "";

  // If no entity, show the index
  if (!slug) return <EntityIndex />;

  return <EntityWorkspaceView slug={slug} />;
}

function EntityWorkspaceView({ slug }: { slug: string }) {
  const api = useConvexApi();
  const navigate = useNavigate();
  const anonymousSessionId = getAnonymousProductSessionId();
  const generateUploadUrl = useMutation(api?.domains.product.me.generateUploadUrl ?? ("skip" as any));
  const saveFileMutation = useMutation(api?.domains.product.me.saveFile ?? ("skip" as any));
  const attachEvidence = useMutation(api?.domains.product.entities.attachEvidenceToEntity ?? ("skip" as any));

  const liveWorkspace = useQuery(
    api?.domains.product.entities.getEntityWorkspace ?? ("skip" as any),
    api?.domains.product.entities.getEntityWorkspace
      ? { anonymousSessionId, entitySlug: slug }
      : "skip",
  ) as EntityWorkspace | null | undefined;

  const saveNoteDocument = useMutation(
    api?.domains.product.documents.saveEntityNoteDocument ?? ("skip" as any),
  );
  const ensureNoteDocumentBackfill = useMutation(
    api?.domains.product.documents.ensureEntityNoteDocumentBackfill ?? ("skip" as any),
  );
  const attachableEvidence = useQuery(
    api?.domains.product.entities.listAttachableEvidence ?? ("skip" as any),
    api?.domains.product.entities.listAttachableEvidence
      ? { anonymousSessionId, entitySlug: slug }
      : "skip",
  );

  const [noteDocumentDraft, setNoteDocumentDraft] = useState<EntityNoteDocument>(createEmptyEntityNoteDocument());
  const [noteSaving, setNoteSaving] = useState(false);
  const [copyState, setCopyState] = useState<string | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [attachingEvidenceId, setAttachingEvidenceId] = useState<string | null>(null);

  const starterWorkspace = useMemo<EntityWorkspace | null>(() => {
    const starter = getStarterEntityWorkspace(slug);
    if (!starter) return null;
    const starterSources = starter.evidence.map((item, index) => ({
      id: `starter-source-${starter.entity.slug}-${index}`,
      label: item.label,
      href: item.sourceUrl,
      type: item.type,
      domain: undefined,
    }));
    return {
      entity: {
        _id: undefined,
        ...starter.entity,
      },
      note: {
        _id: `starter-note-${starter.entity.slug}`,
        content: starter.note.content,
        blocks: undefined,
        createdAt: starter.entity.createdAt,
        updatedAt: starter.entity.updatedAt,
      },
      noteDocument: null,
      latest: starter.latest
        ? {
            _id: `starter-latest-${starter.entity.slug}`,
            ...starter.latest,
            type: starter.entity.entityType,
            createdAt: starter.latest.updatedAt,
            updatedAt: starter.latest.updatedAt,
            sources: starterSources,
          }
        : null,
      timeline: starter.timeline.map((item, index) => ({
        _id: `starter-${starter.entity.slug}-${index}`,
        ...item,
        type: starter.entity.entityType,
        createdAt: item.updatedAt,
        updatedAt: item.updatedAt,
        sources: starterSources,
      })),
      evidence: starter.evidence.map((item, index) => ({
        _id: `starter-evidence-${starter.entity.slug}-${index}`,
        ...item,
        entityId: undefined,
      })),
      relatedEntities: starter.relatedEntities,
    };
  }, [slug]);

  const workspace = liveWorkspace ?? starterWorkspace;
  const hasLiveEntity = Boolean(liveWorkspace?.entity?._id);

  useEffect(() => {
    if (!workspace) return;
    setNoteDocumentDraft(
      buildEntityNoteDocumentDraft(workspace.entity.name, workspace.noteDocument ?? null, workspace.note),
    );
  }, [workspace]);

  useEffect(() => {
    if (!liveWorkspace?.entity?._id || liveWorkspace.noteDocument || !ensureNoteDocumentBackfill) return;
    void ensureNoteDocumentBackfill({
      anonymousSessionId,
      entityId: liveWorkspace.entity._id as any,
    }).catch((error: unknown) => {
      console.error("[entity] Failed to ensure notebook backfill:", error);
    });
  }, [anonymousSessionId, ensureNoteDocumentBackfill, liveWorkspace]);

  const handleSaveNote = useCallback(async () => {
    if (!saveNoteDocument || !liveWorkspace?.entity?._id) return;
    setNoteSaving(true);
    try {
      await saveNoteDocument({
        anonymousSessionId,
        entityId: liveWorkspace.entity._id as any,
        title: noteDocumentDraft.title,
        markdown: noteDocumentDraft.markdown,
        plainText: noteDocumentDraft.plainText,
        lexicalState: noteDocumentDraft.lexicalState,
        blocks: noteDocumentDraft.blocks,
      });
    } catch (err) {
      console.error("[entity] Failed to save note:", err);
    } finally {
      setNoteSaving(false);
    }
  }, [anonymousSessionId, liveWorkspace?.entity?._id, noteDocumentDraft, saveNoteDocument]);

  const copyPayload = useCallback(async (kind: "link" | "markdown" | "outreach" | "crm") => {
    if (!workspace) return;
    const payload =
      kind === "link"
        ? buildEntityShareUrl(workspace.entity.slug)
        : kind === "markdown"
          ? buildEntityMarkdown(workspace)
          : kind === "outreach"
            ? buildOutreachDraft(workspace)
            : buildCrmSummary(workspace);
    await navigator.clipboard.writeText(payload);
    setCopyState(kind);
    window.setTimeout(() => setCopyState(null), 1500);
  }, [workspace]);

  const handleAttachFile = useCallback(async (file: File) => {
    if (!workspace || !liveWorkspace?.entity?._id || !api) return;
    setUploadingEvidence(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      const { storageId } = await uploadResponse.json();
      await saveFileMutation({
        anonymousSessionId,
        storageId,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        entitySlug: workspace.entity.slug,
      });
    } finally {
      setUploadingEvidence(false);
    }
  }, [anonymousSessionId, api, generateUploadUrl, liveWorkspace?.entity?._id, saveFileMutation, workspace]);

  const sourceCount = useMemo(
    () => totalSources(workspace?.timeline ?? []),
    [workspace?.timeline],
  );

  // Loading state
  if (liveWorkspace === undefined && !starterWorkspace) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 rounded bg-white/[0.06]" />
          <div className="h-8 w-64 rounded bg-white/[0.06]" />
          <div className="h-4 w-48 rounded bg-white/[0.06]" />
          <div className="mt-8 h-32 rounded-lg bg-white/[0.03]" />
          <div className="mt-4 h-48 rounded-lg bg-white/[0.03]" />
        </div>
      </div>
    );
  }

  // Entity not found
  if (!workspace) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <button
          type="button"
          onClick={() => navigate("/entity")}
          className="mb-6 flex items-center gap-1.5 text-sm text-content-muted hover:text-content transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All entities
        </button>
        <div className="rounded-lg border border-white/6 bg-white/[0.02] px-6 py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-content-muted/40" />
          <p className="mt-3 text-sm text-content-muted">
            No entity found for &ldquo;{slug}&rdquo;
          </p>
          <p className="mt-1 text-xs text-content-muted/60">
            Search something in Chat to create an entity page.
          </p>
        </div>
      </div>
    );
  }

  const { entity, note, timeline, evidence } = workspace;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back nav */}
      <button
        type="button"
        onClick={() => navigate("/entity")}
        className="mb-6 flex items-center gap-1.5 text-sm text-content-muted hover:text-content transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All entities
      </button>

      {/* ── Entity Header ──────────────────────────────────────────────── */}
      <header className="pb-6 border-b border-white/6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
          {entityTypeIcon(entity.entityType)}
          <span>{entity.entityType}</span>
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-content">
          {entity.name}
        </h1>
        <p className="mt-2 text-sm leading-6 text-content-muted">{entity.summary}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-content-muted">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            First seen {formatDate(entity.createdAt)}
          </span>
          <span>
            {entity.reportCount} {entity.reportCount === 1 ? "search" : "searches"}
          </span>
          <span>{sourceCount} sources</span>
          {note && <span>1 note</span>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              navigate(
                buildCockpitPath({
                  surfaceId: "workspace",
                  entity: entity.slug,
                  extra: {
                    q: timeline[0]?.query ?? `Update ${entity.name} and show me what changed.`,
                    lens: timeline[0]?.lens ?? "founder",
                  },
                }),
              )
            }
            className="rounded-full bg-[#d97757] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#c4684a]"
          >
            Reopen in Chat
          </button>
          <button
            type="button"
            onClick={() => void copyPayload("link")}
            className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-xs text-content-muted transition hover:bg-white/[0.06]"
          >
            <span className="inline-flex items-center gap-1.5">
              <Link2 className="h-3 w-3" />
              {copyState === "link" ? "Copied link" : "Copy link"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => void copyPayload("markdown")}
            className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-xs text-content-muted transition hover:bg-white/[0.06]"
          >
            {copyState === "markdown" ? "Copied markdown" : "Copy markdown"}
          </button>
          <button
            type="button"
            onClick={() => void copyPayload("outreach")}
            className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-xs text-content-muted transition hover:bg-white/[0.06]"
          >
            {copyState === "outreach" ? "Copied outreach" : "Copy outreach"}
          </button>
          <button
            type="button"
            onClick={() => void copyPayload("crm")}
            className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-xs text-content-muted transition hover:bg-white/[0.06]"
          >
            {copyState === "crm" ? "Copied CRM block" : "Copy CRM block"}
          </button>
        </div>
      </header>

      {/* ── User Notes (editable, Obsidian-like) ───────────────────────── */}
      <section className="py-6 border-b border-white/6">
        <EntityActionPanel
          anonymousSessionId={anonymousSessionId}
          entitySlug={entity.slug}
          revisionId={workspace.latest?._id ?? null}
        />
      </section>

      <section className="py-6 border-b border-white/6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
            Working notes
          </h2>
          <button
            type="button"
            onClick={() => void handleSaveNote()}
            disabled={noteSaving || !hasLiveEntity}
            className="rounded-lg bg-[#d97757] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40 transition hover:bg-[#c4684a]"
          >
            {noteSaving ? "Saving..." : "Save notes"}
          </button>
        </div>

        <div className="mt-4">
          <Suspense
            fallback={
              <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-6 text-sm text-content-muted">
                Loading entity notebook...
              </div>
            }
          >
            <EntityNoteEditor
              document={noteDocumentDraft}
              onChange={setNoteDocumentDraft}
              statusLabel={
                !hasLiveEntity
                  ? "Starter memory"
                  : noteSaving
                  ? "Saving..."
                  : workspace.noteDocument?.updatedAt
                    ? `Saved ${formatRelative(workspace.noteDocument.updatedAt)}`
                    : note?.updatedAt
                      ? `Saved ${formatRelative(note.updatedAt)}`
                      : "Editable"
              }
              helperText="This is the canonical notebook for the entity. Rich mode runs on Lexical, Markdown mode runs on CodeMirror, and saves normalize into Convex blocks so future runs can compound instead of replacing context."
            />
          </Suspense>
        </div>
        {workspace.noteDocument?.snapshots?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {workspace.noteDocument.snapshots.slice(0, 4).map((snapshot) => (
              <span
                key={snapshot._id ?? `snapshot-${snapshot.revision}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-content-muted"
              >
                Notebook rev {snapshot.revision}
                <span className="normal-case tracking-normal">{formatRelative(snapshot.createdAt)}</span>
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── Evidence / Sources ──────────────────────────────────────────── */}
      <section className="py-6 border-b border-white/6">
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
          Notebook graph
        </h2>
        <EntityNotebookMeta
          document={workspace.noteDocument ?? noteDocumentDraft}
          onOpenEntity={(nextSlug) => navigate(`/entity/${encodeURIComponent(nextSlug)}`)}
        />
      </section>

      <section className="py-6 border-b border-white/6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted mb-3">
          Evidence
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <label
            className={`inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] text-content-muted transition ${
              hasLiveEntity ? "cursor-pointer hover:bg-white/[0.06]" : "cursor-not-allowed opacity-50"
            }`}
          >
            <Upload className="h-3 w-3" />
            {!hasLiveEntity ? "Attach file in a live entity" : uploadingEvidence ? "Uploading..." : "Attach file"}
            <input
              type="file"
              className="hidden"
              disabled={!hasLiveEntity}
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = event.target.files?.[0];
                if (!file) return;
                await handleAttachFile(file);
                input.value = "";
              }}
            />
          </label>
        </div>
        {attachableEvidence && attachableEvidence.length > 0 && (
          <div className="mb-4 space-y-2">
            {attachableEvidence.slice(0, 4).map((item: any) => (
              <div key={String(item._id)} className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-white/[0.02] px-4 py-3">
                <div>
                  <div className="text-sm text-content">{item.label}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-content-muted">{item.type ?? "file"}</div>
                </div>
                {item.entityId ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-content-muted">
                    <Check className="h-3 w-3" />
                    attached
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      setAttachingEvidenceId(String(item._id));
                      try {
                        await attachEvidence({
                          anonymousSessionId,
                          entityId: entity._id as any,
                          evidenceId: item._id as any,
                        });
                      } finally {
                        setAttachingEvidenceId(null);
                      }
                    }}
                    className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] text-content-muted transition hover:bg-white/[0.06]"
                  >
                    {attachingEvidenceId === String(item._id) ? "Attaching..." : "Attach"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {evidence.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {evidence.map((item) => (
              <span
                key={item._id}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[11px] text-content-muted"
              >
                <FileText className="h-3 w-3" />
                {item.label}
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#d97757] transition"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/6 bg-white/[0.02] px-6 py-6 text-sm text-content-muted">
            Attach screenshots, notes, PDFs, and other artifacts here so they stay on this entity across future runs.
          </div>
        )}
      </section>

      <section className="py-6 border-b border-white/6">
        <EntityMemoryGraph
          entityName={entity.name}
          relatedEntities={workspace.relatedEntities}
          evidence={workspace.evidence}
          onOpenEntity={(nextSlug) => navigate(`/entity/${encodeURIComponent(nextSlug)}`)}
        />

        {workspace.relatedEntities && workspace.relatedEntities.length > 0 ? (
          <div className="mt-4 space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
              Linked memories
            </h2>
            {workspace.relatedEntities.map((related) => (
              <button
                key={related.slug}
                type="button"
                onClick={() => navigate(`/entity/${encodeURIComponent(related.slug)}`)}
                className="w-full rounded-lg border border-white/6 bg-white/[0.02] px-4 py-3 text-left transition hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-content">{related.name}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">{related.entityType}</div>
                </div>
                <p className="mt-2 text-sm leading-6 text-content-muted">{related.summary}</p>
                {related.reason ? (
                  <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-content-muted">{related.reason}</div>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── Research Timeline ──────────────────────────────────────────── */}
      <section className="py-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted mb-4">
          Research timeline
        </h2>

        {timeline.length === 0 && (
          <div className="rounded-lg border border-white/6 bg-white/[0.02] px-6 py-10 text-center">
            <MessageSquare className="mx-auto h-6 w-6 text-content-muted/40" />
            <p className="mt-2 text-sm text-content-muted">No searches yet</p>
            <p className="mt-1 text-xs text-content-muted/60">
              Search this entity in Chat to start building its timeline.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {timeline.map((report, idx) => {
            const diffSummary = computeDiffSummary(report.diffs);
            return (
              <article
                key={report._id}
                className="relative pl-6 border-l-2 border-white/6"
              >
                {/* Timeline dot */}
                <div
                  className={`absolute -left-[5px] top-1 h-2 w-2 rounded-full ${
                    report.isLatest ? "bg-[#d97757]" : "bg-white/20"
                  }`}
                />

                {/* Date + lens + sources */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-content-muted">
                  <span>{formatDate(report.createdAt)}</span>
                  <span className="rounded-full bg-white/[0.04] px-2 py-0.5">
                    {report.lens}
                  </span>
                  {report.revision && (
                    <span className="text-content-muted/60">rev {report.revision}</span>
                  )}
                  <span>{(report.sources ?? []).length} sources</span>
                </div>

                {/* Report sections (show first 4) */}
                <div className="mt-3 space-y-3">
                  {(report.sections ?? []).slice(0, 4).map((section) => (
                    <div key={section.id}>
                      <div className="text-xs font-semibold text-content-muted">
                        {section.title}
                      </div>
                      <p className="mt-0.5 text-sm leading-6 text-content">
                        {section.body}
                      </p>
                    </div>
                  ))}
                  {(report.sections ?? []).length > 4 && (
                    <p className="text-[11px] text-content-muted/60">
                      + {(report.sections ?? []).length - 4} more sections
                    </p>
                  )}
                </div>

                {/* Temporal diff with previous report */}
                {diffSummary && (
                  <div className="mt-3 rounded-lg border border-[#d97757]/20 bg-[#d97757]/5 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d97757]">
                      What changed
                    </div>
                    <p className="mt-1 text-xs leading-5 text-content-muted">
                      {diffSummary}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  <a
                    href={buildCockpitPath({
                      surfaceId: "workspace",
                      extra: {
                        q: report.query,
                        lens: report.lens,
                      },
                    })}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[11px] text-content-muted hover:bg-white/[0.08] transition"
                  >
                    <MessageSquare className="h-3 w-3" /> Reopen in Chat
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default EntityPage;
