import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ArrowUpRight, Check, Clock3, Filter, Link2, Search, Sparkles, Upload } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useConvexApi } from "@/lib/convexApi";
import { buildCockpitPath } from "@/lib/registry/viewRegistry";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { useProductBootstrap } from "@/features/product/lib/useProductBootstrap";
import { ProductWorkspaceHeader } from "@/features/product/components/ProductWorkspaceHeader";
import { ProductThumbnail } from "@/features/product/components/ProductThumbnail";
import { buildCrmSummary, buildEntityMarkdown, buildEntityShareUrl, buildOutreachDraft } from "@/features/entities/lib/entityExport";
import { EntityMemoryGraph } from "@/features/entities/components/EntityMemoryGraph";
import { EntityNotebookMeta } from "@/features/entities/components/EntityNotebookMeta";
import {
  buildEntityNoteDocumentDraft,
  createEmptyEntityNoteDocument,
  type EntityNoteDocument,
  type LegacyEntityNoteBlock,
} from "@/features/entities/lib/entityNoteDocument";
import { STARTER_ENTITY_WORKSPACES } from "@/features/entities/lib/starterEntityWorkspaces";

const EntityNoteEditor = lazy(() => import("@/features/entities/components/EntityNoteEditor"));

type EntityCard = {
  _id?: string;
  slug: string;
  name: string;
  summary: string;
  entityType: string;
  latestRevision: number;
  reportCount: number;
  updatedAt?: number;
  updatedLabel: string;
};

type EntityTimelineItem = {
  _id?: string;
  title: string;
  summary: string;
  query: string;
  lens: string;
  revision?: number;
  updatedAt?: number;
  updatedLabel?: string;
  sections: Array<{ id: string; title: string; body: string }>;
  diffs: Array<{ id: string; title: string; status: "new" | "changed"; previousBody: string; currentBody: string }>;
  isLatest?: boolean;
};

type EntityWorkspace = {
  entity: {
    _id?: string;
    slug: string;
    name: string;
    summary: string;
    entityType: string;
    reportCount: number;
    latestRevision: number;
  };
  note: { content: string; blocks?: LegacyEntityNoteBlock[] } | null;
  noteDocument?: EntityNoteDocument | null;
  timeline: EntityTimelineItem[];
  latest: EntityTimelineItem | null;
  evidence: Array<{ _id?: string; label: string; type?: string; sourceUrl?: string }>;
  relatedEntities?: Array<{ slug: string; name: string; entityType: string; summary: string; reason?: string }>;
};

const FILTERS = ["All", "Companies", "People", "Jobs", "Markets", "Notes", "Recent"] as const;

function formatUpdatedLabel(timestamp?: number) {
  if (!timestamp) return "Recently";
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const STARTER_WORKSPACES: EntityWorkspace[] = STARTER_ENTITY_WORKSPACES.map((workspace) => ({
  ...workspace,
  noteDocument: null,
}));

const STARTER_CARDS: EntityCard[] = STARTER_WORKSPACES.map((workspace, index) => ({
  slug: workspace.entity.slug,
  name: workspace.entity.name,
  summary: workspace.entity.summary,
  entityType: workspace.entity.entityType,
  latestRevision: workspace.entity.latestRevision,
  reportCount: workspace.entity.reportCount,
  updatedAt: Date.now() - index * 60 * 60 * 1000,
  updatedLabel: workspace.latest?.updatedLabel ?? "Starter",
}));

function toEntityWorkspace(raw: any): EntityWorkspace | null {
  if (!raw?.entity) return null;
  return {
    entity: {
      _id: String(raw.entity._id),
      slug: raw.entity.slug,
      name: raw.entity.name,
      summary: raw.entity.summary,
      entityType: raw.entity.entityType,
      reportCount: raw.entity.reportCount,
      latestRevision: raw.entity.latestRevision,
    },
    note: raw.note
      ? {
          content: raw.note.content ?? "",
          blocks: Array.isArray(raw.note.blocks) ? raw.note.blocks : undefined,
        }
      : null,
    noteDocument: raw.noteDocument
      ? {
          _id: String(raw.noteDocument._id),
          title: raw.noteDocument.title,
          markdown: raw.noteDocument.markdown ?? "",
          plainText: raw.noteDocument.plainText ?? "",
          lexicalState: raw.noteDocument.lexicalState,
          latestRevision: raw.noteDocument.latestRevision ?? 0,
          updatedAt: raw.noteDocument.updatedAt,
          blocks: Array.isArray(raw.noteDocument.blocks) ? raw.noteDocument.blocks : [],
          snapshots: Array.isArray(raw.noteDocument.snapshots)
            ? raw.noteDocument.snapshots.map((snapshot: any) => ({
                _id: String(snapshot._id),
                revision: snapshot.revision,
                markdown: snapshot.markdown,
                plainText: snapshot.plainText,
                createdAt: snapshot.createdAt,
              }))
            : [],
          outline: Array.isArray(raw.noteDocument.outline)
            ? raw.noteDocument.outline.map((item: any) => ({
                blockId: item.blockId,
                title: item.title,
                order: item.order,
                depth: item.depth,
              }))
            : [],
          entityLinks: Array.isArray(raw.noteDocument.entityLinks)
            ? raw.noteDocument.entityLinks.map((link: any) => ({
                _id: String(link._id),
                blockId: link.blockId,
                entitySlug: link.entitySlug,
                relation: link.relation,
                entityName: link.entityName,
                entityType: link.entityType,
                createdAt: link.createdAt,
              }))
            : [],
          sourceLinks: Array.isArray(raw.noteDocument.sourceLinks)
            ? raw.noteDocument.sourceLinks.map((link: any) => ({
                _id: String(link._id),
                blockId: link.blockId,
                evidenceId: link.evidenceId,
                label: link.label,
                type: link.type,
                sourceUrl: link.sourceUrl,
                createdAt: link.createdAt,
              }))
            : [],
          events: Array.isArray(raw.noteDocument.events)
            ? raw.noteDocument.events.map((event: any) => ({
                _id: String(event._id),
                type: event.type,
                label: event.label,
                summary: event.summary,
                createdAt: event.createdAt,
              }))
            : [],
        }
      : null,
    latest: raw.latest
      ? {
          ...raw.latest,
          _id: String(raw.latest._id),
          updatedLabel: formatUpdatedLabel(raw.latest.updatedAt),
        }
      : null,
    timeline: (raw.timeline ?? []).map((item: any) => ({
      ...item,
      _id: String(item._id),
      updatedLabel: formatUpdatedLabel(item.updatedAt),
    })),
    evidence: (raw.evidence ?? []).map((item: any) => ({
      _id: String(item._id),
      label: item.label,
      type: item.type,
      sourceUrl: item.sourceUrl,
    })),
    relatedEntities: (raw.relatedEntities ?? []).map((item: any) => ({
      slug: item.slug,
      name: item.name,
      entityType: item.entityType,
      summary: item.summary,
      reason: item.reason,
    })),
  };
}

export function ReportsHome() {
  useProductBootstrap();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const api = useConvexApi();
  const anonymousSessionId = getAnonymousProductSessionId();

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("All");
  const [selectedEntitySlug, setSelectedEntitySlug] = useState<string | null>(null);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [copiedEntitySlug, setCopiedEntitySlug] = useState<string | null>(null);
  const [copiedExport, setCopiedExport] = useState<string | null>(null);
  const [noteDocumentDraft, setNoteDocumentDraft] = useState<EntityNoteDocument>(createEmptyEntityNoteDocument());
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [attachingEvidenceId, setAttachingEvidenceId] = useState<string | null>(null);
  const generateUploadUrl = useMutation(api?.domains.product.me.generateUploadUrl ?? ("skip" as any));
  const saveFileMutation = useMutation(api?.domains.product.me.saveFile ?? ("skip" as any));
  const attachEvidence = useMutation(api?.domains.product.entities.attachEvidenceToEntity ?? ("skip" as any));
  const saveNoteDocument = useMutation(api?.domains.product.documents.saveEntityNoteDocument ?? ("skip" as any));
  const ensureNoteDocumentBackfill = useMutation(api?.domains.product.documents.ensureEntityNoteDocumentBackfill ?? ("skip" as any));

  const entities = useQuery(
    api?.domains.product.entities.listEntities ?? "skip",
    api?.domains.product.entities.listEntities
      ? { anonymousSessionId, search: query, filter: activeFilter }
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
        latestRevision: entity.latestRevision,
        reportCount: entity.reportCount,
        updatedAt: entity.latestReportUpdatedAt,
        updatedLabel: formatUpdatedLabel(entity.latestReportUpdatedAt),
      })),
    [entities],
  );

  const hasLiveEntities = liveCards.length > 0;
  const cards = hasLiveEntities ? liveCards : STARTER_CARDS;

  useEffect(() => {
    const fromUrl = searchParams.get("entity");
    if (fromUrl && cards.some((card) => card.slug === fromUrl)) {
      setSelectedEntitySlug(fromUrl);
      return;
    }
    if (!selectedEntitySlug || !cards.some((card) => card.slug === selectedEntitySlug)) {
      setSelectedEntitySlug(cards[0]?.slug ?? null);
    }
  }, [cards, searchParams, selectedEntitySlug]);

  const liveWorkspace = useQuery(
    api?.domains.product.entities.getEntityWorkspace ?? "skip",
    api?.domains.product.entities.getEntityWorkspace && hasLiveEntities && selectedEntitySlug
      ? { anonymousSessionId, entitySlug: selectedEntitySlug }
      : "skip",
  );
  const attachableEvidence = useQuery(
    api?.domains.product.entities.listAttachableEvidence ?? "skip",
    api?.domains.product.entities.listAttachableEvidence && hasLiveEntities && selectedEntitySlug
      ? { anonymousSessionId, entitySlug: selectedEntitySlug }
      : "skip",
  );

  const workspace = useMemo(() => {
    if (hasLiveEntities) return toEntityWorkspace(liveWorkspace);
    return STARTER_WORKSPACES.find((item) => item.entity.slug === selectedEntitySlug) ?? STARTER_WORKSPACES[0] ?? null;
  }, [hasLiveEntities, liveWorkspace, selectedEntitySlug]);

  const selectedTimelineItem = useMemo(() => {
    if (!workspace) return null;
    if (selectedRevisionId) {
      return workspace.timeline.find((item) => item._id === selectedRevisionId) ?? workspace.latest;
    }
    return workspace.latest;
  }, [selectedRevisionId, workspace]);

  useEffect(() => {
    if (!workspace) return;
    setSelectedRevisionId(workspace.latest?._id ?? null);
    setNoteDocumentDraft(
      buildEntityNoteDocumentDraft(workspace.entity.name, workspace.noteDocument ?? null, workspace.note),
    );
    setNoteStatus("idle");
  }, [workspace?.entity.slug, workspace]);

  useEffect(() => {
    if (!hasLiveEntities || !workspace?.entity._id || workspace.noteDocument || !ensureNoteDocumentBackfill) return;
    void ensureNoteDocumentBackfill({
      anonymousSessionId,
      entityId: workspace.entity._id as any,
    }).catch((error: unknown) => {
      console.error("[reports] Failed to ensure notebook backfill:", error);
    });
  }, [anonymousSessionId, ensureNoteDocumentBackfill, hasLiveEntities, workspace]);

  const handleSaveNotes = useCallback(async () => {
    if (!hasLiveEntities || !workspace?.entity._id || !saveNoteDocument) return;
    setNoteStatus("saving");
    try {
      await saveNoteDocument({
        anonymousSessionId,
        entityId: workspace.entity._id as any,
        title: noteDocumentDraft.title,
        markdown: noteDocumentDraft.markdown,
        plainText: noteDocumentDraft.plainText,
        lexicalState: noteDocumentDraft.lexicalState,
        blocks: noteDocumentDraft.blocks,
      });
      setNoteStatus("saved");
      trackEvent("entity_notes_saved", { entity: workspace.entity.slug, length: noteDocumentDraft.plainText.length });
      window.setTimeout(() => setNoteStatus("idle"), 1500);
    } catch {
      setNoteStatus("idle");
    }
  }, [anonymousSessionId, hasLiveEntities, noteDocumentDraft, saveNoteDocument, workspace]);

  const shareEntity = (entitySlug: string) => {
    void navigator.clipboard.writeText(buildEntityShareUrl(entitySlug));
    setCopiedEntitySlug(entitySlug);
    setTimeout(() => setCopiedEntitySlug(null), 1500);
    trackEvent("entity_link_shared", { entity: entitySlug });
  };

  const copyExport = async (kind: "markdown" | "outreach" | "crm") => {
    if (!workspace) return;
    const payload =
      kind === "markdown"
        ? buildEntityMarkdown(workspace, selectedTimelineItem)
        : kind === "outreach"
          ? buildOutreachDraft(workspace, selectedTimelineItem)
          : buildCrmSummary(workspace, selectedTimelineItem);
    await navigator.clipboard.writeText(payload);
    setCopiedExport(kind);
    window.setTimeout(() => setCopiedExport(null), 1500);
    trackEvent("entity_export_copied", { entity: workspace.entity.slug, kind });
  };

  const openEntityInChat = () => {
    if (!selectedTimelineItem || !workspace) return;
    trackEvent("report_to_chat_reentry", {
      entity: workspace.entity.slug,
      revision: selectedTimelineItem.revision ?? 0,
    });
    navigate(
      buildCockpitPath({
        surfaceId: "workspace",
        entity: workspace.entity.slug,
        extra: { q: selectedTimelineItem.query, lens: selectedTimelineItem.lens },
      }),
    );
  };

  const openFullPage = () => {
    if (!workspace) return;
    navigate(`/entity/${encodeURIComponent(workspace.entity.slug)}`);
  };

  const attachFileToEntity = async (file: File) => {
    if (!workspace || !api) return;
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
      trackEvent("entity_evidence_uploaded", { entity: workspace.entity.slug, fileType: file.type || "upload" });
    } finally {
      setUploadingEvidence(false);
    }
  };

  return (
    <div className="nb-public-shell mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-6 py-8 xl:px-8 xl:py-10">
      <ProductWorkspaceHeader
        kicker="Reports"
        title="Entity memory that compounds over time."
        description="One page per company, person, market, or role. Revisions stack over time, notes stay editable, and the next live Chat run reopens the same memory instead of starting from zero."
        aside={
          <>
            <span className="nb-chip nb-chip-active">{hasLiveEntities ? `${cards.length} entities` : "Starter compound"}</span>
            <span className="nb-chip">{workspace?.entity.reportCount ?? 0} runs on current entity</span>
            <span className="nb-chip">Revision-aware memory</span>
          </>
        }
      />

      <button
        type="button"
        className="nb-secondary-button mb-1 flex items-center gap-2 px-4 py-2 text-sm xl:hidden"
        onClick={() => setShowFilters((value) => !value)}
      >
        <Filter className="h-4 w-4" />
        Filters
      </button>

      <section className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_420px]">
        <aside className={`space-y-8 xl:sticky xl:top-24 xl:self-start ${showFilters ? "" : "hidden xl:block"}`}>
          <article className="px-5 py-6">
            <div className="nb-section-kicker">Find entity memory</div>
            <div className="nb-input-shell mt-4 flex items-center gap-3 rounded-[18px] px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-content-muted" />
              <input
                id="entity-search"
                name="entitySearch"
                aria-label="Search entities"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search entities..."
                className="w-full bg-transparent text-sm text-content placeholder:text-content-muted/55 focus:outline-none"
              />
            </div>
            <div className="mt-5 space-y-1">
              {FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    activeFilter === filter
                      ? "bg-[#d97757]/12 text-[#ad5f45] dark:text-[#f5c1ae]"
                      : "text-content-muted hover:bg-[rgba(15,23,42,0.04)] hover:text-content dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <span>{filter}</span>
                  {activeFilter === filter ? <span className="text-[11px] uppercase tracking-[0.18em]">On</span> : null}
                </button>
              ))}
            </div>
          </article>

          <article className="px-5 py-6">
            <div className="nb-section-kicker">Compound rule</div>
            <div className="mt-4 space-y-3">
              {[
                ["Capture once", "A screenshot, note, link, or message should route into one entity memory instead of another isolated chat."],
                ["Accumulate revisions", "New runs should stack onto the same entity and make changes visible over time."],
                ["Work from memory", "Outreach, diligence, and follow-ups should reopen this page and continue in Chat."],
              ].map(([title, body]) => (
                <div key={title} className="nb-panel-inset p-4">
                  <div className="text-sm font-medium text-content">{title}</div>
                  <p className="mt-2 text-sm leading-6 text-content-muted">{body}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>

        <main className="px-5 py-6 xl:px-6 xl:py-7">
          <div className="nb-section-kicker">Entity cards</div>
          <p className="mt-2 text-sm leading-6 text-content-muted">
            Each card is the current state of one memory object. Click or hover to inspect the entity workspace on the right.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card, index) => (
              <article
                key={card.slug}
                onMouseEnter={() => setSelectedEntitySlug(card.slug)}
                onFocus={() => setSelectedEntitySlug(card.slug)}
                className={`group nb-hover-lift relative rounded-[22px] border p-3 transition ${
                  selectedEntitySlug === card.slug
                    ? "border-[#d97757]/[0.3] bg-[#d97757]/[0.05]"
                    : "border-[rgba(15,23,42,0.08)] bg-white/74 hover:border-[rgba(15,23,42,0.12)] hover:bg-white/92 dark:border-white/10 dark:bg-black/18 dark:hover:border-white/14 dark:hover:bg-black/24"
                }`}
              >
                <button
                  type="button"
                  onClick={() => shareEntity(card.slug)}
                  className={`absolute right-3 top-3 z-10 rounded-full border p-2 transition ${
                    copiedEntitySlug === card.slug
                      ? "border-green-400/30 bg-green-400/10 text-green-400"
                      : "border-[rgba(15,23,42,0.08)] bg-white/82 text-content-muted opacity-0 hover:text-content group-hover:opacity-100 dark:border-white/10 dark:bg-black/20"
                  }`}
                  aria-label={`Share ${card.name}`}
                >
                  {copiedEntitySlug === card.slug ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedEntitySlug(card.slug);
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.set("surface", "reports");
                    nextParams.set("entity", card.slug);
                    setSearchParams(nextParams, { replace: true });
                    trackEvent("entity_workspace_opened", { entity: card.slug, reportCount: card.reportCount });
                  }}
                  className="w-full cursor-pointer text-left"
                >
                  <ProductThumbnail
                    title={card.name}
                    summary={card.summary}
                    type={card.entityType}
                    meta={`${card.reportCount} run${card.reportCount === 1 ? "" : "s"}`}
                    tone={index}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3 px-1">
                    <div>
                      <div className="text-sm font-semibold text-content">{card.name}</div>
                      <div className="mt-1 text-xs text-content-muted">
                        Rev {card.latestRevision} • {card.updatedLabel}
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full border border-[rgba(15,23,42,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-content-muted dark:border-white/10">
                      {card.entityType}
                    </div>
                  </div>
                </button>
              </article>
            ))}
          </div>
        </main>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          {workspace ? (
            <>
              <article className="px-5 py-6 xl:px-6 xl:py-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="nb-section-kicker">Entity workspace</div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-content">{workspace.entity.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-content-muted">{workspace.entity.summary}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-content-muted dark:border-white/10">
                    <Clock3 className="h-3.5 w-3.5" />
                    Rev {selectedTimelineItem?.revision ?? workspace.entity.latestRevision}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={openEntityInChat} className="nb-primary-button px-4 py-2 text-sm">
                    Open in Chat
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={openFullPage} className="nb-secondary-button px-4 py-2 text-sm">
                    Open full page
                  </button>
                  <button type="button" onClick={() => shareEntity(workspace.entity.slug)} className="nb-secondary-button px-4 py-2 text-sm">
                    {copiedEntitySlug === workspace.entity.slug ? "Copied link" : "Copy link"}
                  </button>
                  <button type="button" onClick={() => void copyExport("markdown")} className="nb-secondary-button px-4 py-2 text-sm">
                    {copiedExport === "markdown" ? "Copied markdown" : "Copy markdown"}
                  </button>
                  <button type="button" onClick={() => void copyExport("outreach")} className="nb-secondary-button px-4 py-2 text-sm">
                    {copiedExport === "outreach" ? "Copied outreach" : "Copy outreach"}
                  </button>
                  <button type="button" onClick={() => void copyExport("crm")} className="nb-secondary-button px-4 py-2 text-sm">
                    {copiedExport === "crm" ? "Copied CRM block" : "Copy CRM block"}
                  </button>
                </div>
              </article>

              <article className="px-5 py-6 xl:px-6 xl:py-7">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="nb-section-kicker">Working notes</h3>
                  <button
                    type="button"
                    onClick={() => void handleSaveNotes()}
                    className="nb-secondary-button px-3 py-1.5 text-xs"
                    data-density="compact"
                    disabled={!hasLiveEntities || noteStatus === "saving"}
                  >
                    {noteStatus === "saving" ? "Saving..." : noteStatus === "saved" ? "Saved" : "Save notes"}
                  </button>
                </div>
                <div className="mt-4">
                  <Suspense
                    fallback={
                      <div className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white/72 p-6 text-sm text-content-muted dark:border-white/10 dark:bg-white/[0.03]">
                        Loading entity notebook...
                      </div>
                    }
                  >
                    <EntityNoteEditor
                      document={noteDocumentDraft}
                      onChange={setNoteDocumentDraft}
                      statusLabel={noteStatus === "saving" ? "Saving..." : noteStatus === "saved" ? "Saved" : "Editable"}
                      helperText="This notebook is the canonical memory surface for the entity. Rich mode runs on Lexical, Markdown mode runs on CodeMirror, and saves normalize into Convex document blocks instead of a single blob."
                    />
                  </Suspense>
                </div>
                {workspace.noteDocument?.snapshots?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {workspace.noteDocument.snapshots.slice(0, 4).map((snapshot) => (
                      <span
                        key={snapshot._id ?? `snapshot-${snapshot.revision}`}
                        className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.08)] bg-white/72 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-content-muted dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        Notebook rev {snapshot.revision}
                        <span className="normal-case tracking-normal">{formatUpdatedLabel(snapshot.createdAt)}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>

              <article className="px-5 py-6 xl:px-6 xl:py-7">
                <h3 className="nb-section-kicker">Notebook graph</h3>
                <div className="mt-4">
                  <EntityNotebookMeta
                    document={workspace.noteDocument ?? noteDocumentDraft}
                    onOpenEntity={(nextSlug) => {
                      setSelectedEntitySlug(nextSlug);
                      const nextParams = new URLSearchParams(searchParams);
                      nextParams.set("surface", "reports");
                      nextParams.set("entity", nextSlug);
                      setSearchParams(nextParams, { replace: true });
                    }}
                  />
                </div>
              </article>

              <article className="px-5 py-6 xl:px-6 xl:py-7">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="nb-section-kicker">Current revision</h3>
                  <span className="nb-status-badge nb-status-badge-accent px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                    {selectedTimelineItem?.updatedLabel ?? "Latest"}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedTimelineItem?.sections.map((section) => (
                    <div key={section.id} className="nb-panel-inset p-4">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-content-muted">{section.title}</div>
                      <p className="mt-2 text-sm leading-6 text-content-muted">{section.body}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="px-5 py-6 xl:px-6 xl:py-7">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-content-muted" />
                  <h3 className="nb-section-kicker">What changed</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedTimelineItem?.diffs?.length ? (
                    selectedTimelineItem.diffs.map((diff) => (
                      <div key={diff.id} className="nb-panel-inset p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-content">{diff.title}</div>
                          <span className="text-[10px] uppercase tracking-[0.18em] text-content-muted">{diff.status}</span>
                        </div>
                        {diff.previousBody ? <p className="mt-2 text-sm leading-6 text-content-muted">Before: {diff.previousBody}</p> : null}
                        <p className="mt-2 text-sm leading-6 text-content">Now: {diff.currentBody}</p>
                      </div>
                    ))
                  ) : (
                    <div className="nb-panel-inset p-4 text-sm leading-6 text-content-muted">
                      No structural changes yet. The next run on this entity will show a revision diff here instead of replacing the prior memory.
                    </div>
                  )}
                </div>
              </article>

              <article className="px-5 py-6 xl:px-6 xl:py-7">
                <h3 className="nb-section-kicker">Revision timeline</h3>
                <div className="mt-4 space-y-3">
                  {workspace.timeline.map((item) => (
                    <button
                      key={item._id ?? `${workspace.entity.slug}-${item.revision}`}
                      type="button"
                      onClick={() => {
                        setSelectedRevisionId(item._id ?? null);
                        trackEvent("entity_revision_opened", { entity: workspace.entity.slug, revision: item.revision ?? 0 });
                      }}
                      className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${
                        selectedTimelineItem?._id === item._id
                          ? "border-[#d97757]/[0.3] bg-[#d97757]/[0.05]"
                          : "border-[rgba(15,23,42,0.08)] bg-white/66 dark:border-white/10 dark:bg-black/18"
                      }`}
                    >
                      <div className="text-sm font-medium text-content">{item.title}</div>
                      <div className="mt-1 text-xs text-content-muted">
                        Rev {item.revision ?? "?"} • {item.updatedLabel}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-content-muted">{item.summary}</p>
                    </button>
                  ))}
                </div>
              </article>

              <article className="px-5 py-6 xl:px-6 xl:py-7">
                <h3 className="nb-section-kicker">Evidence</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <label className="nb-secondary-button inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-sm">
                      <Upload className="h-4 w-4" />
                      {uploadingEvidence ? "Uploading..." : "Attach file"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={async (event) => {
                          const input = event.currentTarget;
                          const file = event.target.files?.[0];
                          if (!file) return;
                          await attachFileToEntity(file);
                          input.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {attachableEvidence && attachableEvidence.length > 0 ? (
                    <div className="grid gap-2">
                      {attachableEvidence.slice(0, 4).map((item: any) => (
                        <div key={String(item._id)} className="nb-panel-inset flex items-center justify-between gap-3 px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-content">{item.label}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-content-muted">{item.type ?? "file"}</div>
                          </div>
                          {item.entityId ? (
                            <span className="text-[11px] uppercase tracking-[0.18em] text-content-muted">Attached</span>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!workspace?.entity._id) return;
                                setAttachingEvidenceId(String(item._id));
                                try {
                                  await attachEvidence({
                                    anonymousSessionId,
                                    entityId: workspace.entity._id as any,
                                    evidenceId: item._id as any,
                                  });
                                  trackEvent("entity_evidence_attached", { entity: workspace.entity.slug, evidenceId: String(item._id) });
                                } finally {
                                  setAttachingEvidenceId(null);
                                }
                              }}
                              className="nb-secondary-button px-3 py-1.5 text-xs"
                              data-density="compact"
                              disabled={attachingEvidenceId === String(item._id)}
                            >
                              {attachingEvidenceId === String(item._id) ? "Attaching..." : "Attach"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                  {workspace.evidence.length ? (
                    workspace.evidence.map((item) => (
                      <div key={item._id ?? item.label} className="nb-panel-inset px-3 py-2">
                        <div className="text-xs font-medium text-content">{item.label}</div>
                        <div className="mt-1 text-[11px] text-content-muted">{item.type ?? "evidence"}</div>
                      </div>
                    ))
                  ) : (
                    <div className="nb-panel-inset px-4 py-3 text-sm leading-6 text-content-muted">
                      New uploads tied to this entity will appear here and stay attached to the memory over time.
                    </div>
                  )}
                  </div>
                </div>
              </article>

              <article className="px-5 py-6 xl:px-6 xl:py-7">
                <h3 className="nb-section-kicker">Linked memories</h3>
                <div className="mt-4 space-y-3">
                  {workspace.relatedEntities?.length ? (
                    workspace.relatedEntities.map((item) => (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => {
                          setSelectedEntitySlug(item.slug);
                          const nextParams = new URLSearchParams(searchParams);
                          nextParams.set("surface", "reports");
                          nextParams.set("entity", item.slug);
                          setSearchParams(nextParams, { replace: true });
                        }}
                        className="nb-panel-inset w-full px-4 py-3 text-left transition hover:bg-white/[0.05]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-content">{item.name}</div>
                          <span className="text-[10px] uppercase tracking-[0.18em] text-content-muted">{item.entityType}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-content-muted">{item.summary}</p>
                        {item.reason ? (
                          <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-content-muted">{item.reason}</div>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <div className="nb-panel-inset px-4 py-3 text-sm leading-6 text-content-muted">
                      Backlinks and related memories will show up here as NodeBench sees overlapping sources, themes, and follow-on work across entities.
                    </div>
                  )}
                </div>
              </article>

              <article className="px-5 py-6 xl:px-6 xl:py-7">
                <EntityMemoryGraph
                  entityName={workspace.entity.name}
                  relatedEntities={workspace.relatedEntities}
                  evidence={workspace.evidence}
                  onOpenEntity={(nextSlug) => {
                    setSelectedEntitySlug(nextSlug);
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.set("surface", "reports");
                    nextParams.set("entity", nextSlug);
                    setSearchParams(nextParams, { replace: true });
                  }}
                />
              </article>
            </>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

export default ReportsHome;
