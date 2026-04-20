/**
 * EntityNotebookLive â€” Phase 3-4 of the Ideaflow/Mew-inspired notebook.
 *
 * Renders the entity as a single flowing document of persisted blocks from
 * productBlocks. Focused editable blocks use a Tiptap + Convex ProseMirror
 * sync editor so collaboration happens on maintained OT plumbing while the
 * notebook keeps its existing BlockChip[] persistence contract and provenance.
 * Enter appends a block, Backspace at start merges with previous, and `/`
 * opens the slash command palette.
 *
 * The notebook keeps the backend contract stable and only swaps the editing
 * shell, so report/backfill/query behavior can harden independently from the
 * editor implementation.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, ExternalLink, Link2, Lock } from "lucide-react";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useConvexApi } from "@/lib/convexApi";
import { buildEntityPath } from "@/features/entities/lib/entityExport";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { useStreamingSearch } from "@/hooks/useStreamingSearch";
import { publishNotebookAlert } from "@/lib/notebookAlerts";
import { useToast } from "@/shared/ui";
import {
  chipsFromMarkup,
  BlockChipRenderer,
  type BlockChip,
} from "./BlockChipRenderer";
import { BlockProvenance } from "./BlockProvenance";
import { NotebookBlockEditor, type NotebookBlockEditorHandle, type MarkdownBlockKind } from "./NotebookBlockEditor";
import { SlashPalette, type SlashCommand } from "./SlashPalette";
import { MentionPicker, type EntityMatch } from "./MentionPicker";
import { BlockStatusBar } from "./BlockStatusBar";
import { NotebookDiligenceOverlayHost } from "./NotebookDiligenceOverlayHost";
import { NotebookRightRail } from "./NotebookRightRail";
import { NotebookOutline } from "./NotebookOutline";
import { NotebookDismissalsSync } from "./NotebookDismissalsSync";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { NotebookScratchpadTracePanel } from "./NotebookScratchpadTracePanel";
import { NotebookRunMapPanel } from "./NotebookRunMapPanel";
import {
  enqueue as enqueueOfflineEdit,
  makeEditId,
  readQueue,
  removeById as removeOfflineEdit,
} from "./notebookOfflineQueue";
import { buildProductBlockSyncId } from "../../../../../shared/productBlockSync";
import { useDiligenceBlocks } from "./useDiligenceBlocks";
import type { DiligenceDecorationData } from "./DiligenceDecorationPlugin";
import { acceptDecorationIntoNotebook } from "./acceptDecorationIntoNotebook";
import { useAgentActions, type DecorationContext } from "@/features/agents/hooks/useAgentActions";
import { AgentAuthorTag } from "@/features/agents/primitives/AgentAuthorTag";
import { useScrubTime } from "./useScrubTime";

type BlockKind =
  | "text"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bullet"
  | "todo"
  | "quote"
  | "callout"
  | "code"
  | "image"
  | "evidence"
  | "mention"
  | "generated_marker";

type AuthorKind = "user" | "agent" | "anonymous";
type AccessMode = "read" | "append" | "edit";

type LiveBlock = {
  _id: Id<"productBlocks">;
  entityId: Id<"productEntities">;
  parentBlockId?: Id<"productBlocks">;
  kind: BlockKind;
  authorKind: AuthorKind;
  authorId?: string;
  content: BlockChip[];
  positionInt: number;
  positionFrac: string;
  isChecked?: boolean;
  sourceSessionId?: Id<"productChatSessions">;
  sourceToolStep?: number;
  sourceRefIds?: string[];
  attributes?: Record<string, unknown>;
  revision: number;
  accessMode?: AccessMode;
  isPublic?: boolean;
  updatedAt: number;
};

type Props = {
  entitySlug: string;
  shareToken?: string;
  canEdit?: boolean;
  onOpenReferenceNotebook?: () => void;
  viewerOwnerKey?: string | null;
  collaborationParticipants?: Array<{ ownerKey: string; label: string; email?: string }>;
  latestHumanEdit?: {
    ownerKey?: string | null;
    updatedAt?: number | null;
  } | null;
};

function chipsToPlainText(chips: BlockChip[]): string {
  return chips
    .map((c) => {
      if (c.type === "linebreak") return "\n";
      if (c.type === "mention") return `${c.mentionTrigger ?? "@"}${c.value}`;
      if (c.type === "link") return c.value;
      if (c.type === "image") return "";
      return c.value;
    })
    .join("");
}

function chipsEqual(left: BlockChip[] | undefined, right: BlockChip[] | undefined): boolean {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
}

function isSyncEditableBlock(block: Pick<LiveBlock, "kind" | "content">): boolean {
  return (
    block.kind !== "image" &&
    block.kind !== "generated_marker" &&
    !block.content.some((chip) => chip.type === "image")
  );
}

function isTriviallyEmptyNotebookBlock(block: LiveBlock | undefined, displayContent: BlockChip[]): boolean {
  if (!block) return false;
  if (block.kind !== "text") return false;
  if (block.authorKind !== "user") return false;
  if ((block.sourceRefIds?.length ?? 0) > 0) return false;
  return chipsToPlainText(displayContent).trim().length === 0;
}

function resolvePresenceSelfUserId(
  viewerOwnerKey?: string | null,
  anonymousSessionId?: string | null,
): string | null {
  if (viewerOwnerKey?.trim()) return viewerOwnerKey.trim();
  const trimmed = anonymousSessionId?.trim();
  return trimmed ? `anon:${trimmed}` : null;
}

function formatNotebookRuntimeRelative(timestamp: number): string {
  const ageMs = Math.max(0, Date.now() - timestamp);
  if (ageMs < 60_000) return "just now";
  const minutes = Math.round(ageMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function shouldRefreshAgentNotebookProjection(
  blocks: LiveBlock[] | undefined,
  snapshot:
    | {
        reportUpdatedAt?: number;
        blocks?: Array<unknown>;
      }
    | null
    | undefined,
) {
  if (!blocks) return false;
  if (blocks.length === 0) {
    return Array.isArray(snapshot.blocks) && snapshot.blocks.length > 0;
  }
  if (!snapshot?.reportUpdatedAt) return false;

  const latestUserEditAt = blocks
    .filter((block) => block.authorKind === "user")
    .reduce<number | null>((latest, block) => Math.max(latest ?? 0, block.updatedAt ?? 0), null);
  if (latestUserEditAt != null && latestUserEditAt > snapshot.reportUpdatedAt) {
    return false;
  }

  const latestAgentBlockAt = blocks
    .filter((block) => block.authorKind === "agent")
    .reduce<number | null>((latest, block) => Math.max(latest ?? 0, block.updatedAt ?? 0), null);

  if (latestAgentBlockAt == null) {
    return Array.isArray(snapshot.blocks) && snapshot.blocks.length > 0;
  }

  return latestAgentBlockAt < snapshot.reportUpdatedAt;
}

export function getNotebookLoadState(args: {
  loadedCount: number;
  totalCount?: number;
  paginationStatus?: string;
}) {
  const totalCount = Math.max(args.totalCount ?? args.loadedCount, args.loadedCount);
  const paginationStatus = args.paginationStatus ?? "Exhausted";
  const remainingCount = Math.max(totalCount - args.loadedCount, 0);
  return {
    totalCount,
    remainingCount,
    fullyLoaded: paginationStatus === "Exhausted" && remainingCount === 0,
    canLoadMore: paginationStatus === "CanLoadMore" || paginationStatus === "LoadingMore",
    isLoadingMore: paginationStatus === "LoadingMore" || paginationStatus === "LoadingFirstPage",
  };
}

type ParsedNotebookMutationError = {
  code?: string;
  current?: number;
  expected?: number;
  retryAfterMs?: number;
  message?: string;
  // Convex Request ID — the HTTP client puts this in err.message as
  // "[Request ID: <hex>] Server Error". Surfacing it in the client toast
  // + console lets support correlate user reports to `npx convex logs`
  // entries in seconds instead of minutes.
  requestId?: string;
};

// Pull the Convex Request ID out of a thrown error's message string.
// Returns null if no ID present (e.g. purely client-side error).
export function extractConvexRequestId(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const match = /\[Request ID:\s*([a-f0-9]+)\]/i.exec(message);
  return match ? match[1] : null;
}

export function parseNotebookMutationError(error: unknown): ParsedNotebookMutationError {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error == null
          ? undefined
          : String(error);

  const requestId = extractConvexRequestId(error) ?? undefined;

  // ConvexError surfaces structured payload on `err.data` (the HTTP client
  // replaces `err.message` with "[Request ID: ...] Server Error"). Prefer
  // reading err.data directly; fall back to regex for legacy serializations.
  if (
    error &&
    typeof error === "object" &&
    (error as { constructor?: { name?: string } }).constructor?.name === "ConvexError"
  ) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object") {
      return { ...(data as ParsedNotebookMutationError), message, requestId };
    }
  }

  if (!message) return { requestId };
  if (
    message.includes("OptimisticConcurrencyControlFailure") &&
    message.includes("productBlockWriteWindows")
  ) {
    return {
      code: "RATE_LIMITED",
      retryAfterMs: 10_000,
      message,
      requestId,
    };
  }
  const match = /ConvexError:\s*(\{.*\})/s.exec(message);
  if (!match) {
    return { message, requestId };
  }
  try {
    const parsed = JSON.parse(match[1]) as ParsedNotebookMutationError;
    return {
      ...parsed,
      message,
      requestId,
    };
  } catch {
    return { message, requestId };
  }
}

export function describeNotebookMutationFailure(
  action: "save" | "mention" | "command",
  error: unknown,
): { title: string; detail?: string; level: "error" | "warning" } {
  const parsed = parseNotebookMutationError(error);
  if (parsed.code === "REVISION_MISMATCH") {
    const revisionDetail =
      typeof parsed.current === "number" && typeof parsed.expected === "number"
        ? `This block moved from revision ${parsed.expected} to ${parsed.current} in another tab or agent run.`
        : "Another tab or agent run updated this block first.";
    return {
      title: "Notebook changed in another tab",
      detail: `${revisionDetail} The latest version has been reloaded. Reapply your edit if it still matters.`,
      level: "warning",
    };
  }
  if (parsed.code === "RATE_LIMITED") {
    const waitSeconds =
      typeof parsed.retryAfterMs === "number" && parsed.retryAfterMs > 0
        ? Math.max(1, Math.ceil(parsed.retryAfterMs / 1000))
        : null;
    return {
      title: "Notebook write rate limit reached",
      detail: waitSeconds
        ? `Too many notebook edits landed in a short burst. Wait about ${waitSeconds}s and try again.`
        : "Too many notebook edits landed in a short burst. Wait a moment and try again.",
      level: "warning",
    };
  }
  if (parsed.code === "CONTENT_TOO_LARGE") {
    return {
      title: "Notebook block is too large",
      detail: "Split this block into smaller sections before saving it again.",
      level: "error",
    };
  }
  const actionLabel =
    action === "mention"
      ? "attach the mention"
      : action === "command"
        ? "finish the notebook command"
        : "save the notebook block";
  // Tail the Convex Request ID onto the detail so support can jump to the
  // exact log line with `npx convex logs --prod | grep <id>`.
  const detailWithId = parsed.requestId
    ? `${parsed.message ?? "Unknown error"} (ref: ${parsed.requestId})`
    : parsed.message;
  return {
    title: `Failed to ${actionLabel}`,
    detail: detailWithId,
    level: "error",
  };
}

export function EntityNotebookLive({
  entitySlug,
  shareToken,
  canEdit = true,
  onOpenReferenceNotebook,
  viewerOwnerKey,
  collaborationParticipants,
  latestHumanEdit,
}: Props) {
  const api = useConvexApi();
  const navigate = useNavigate();
  const buildEntityPathWithShare = useCallback(
    (nextSlug: string) => buildEntityPath(nextSlug, shareToken),
    [shareToken],
  );
  const anonymousSessionId = getAnonymousProductSessionId();
  const toast = useToast();
  // Unified agent actions — routes inline decoration events into the
  // drawer's history + persists dismissals. See useAgentActions for
  // the seam contract. Keep this call ONCE at component top so the
  // React identity of the returned callbacks is stable for memoized
  // handlers below.
  const agentActions = useAgentActions();
  const participantDirectory = useMemo(
    () =>
      Object.fromEntries(
        (collaborationParticipants ?? []).map((participant) => [
          participant.ownerKey,
          participant.label,
        ]),
      ),
    [collaborationParticipants],
  );

  const blocksPagination = usePaginatedQuery(
    api?.domains.product.blocks.listEntityBlocksPaginated ?? ("skip" as any),
    api?.domains.product.blocks.listEntityBlocksPaginated
      ? { anonymousSessionId, shareToken, entitySlug }
      : "skip",
    { initialNumItems: 150 },
  );
  const blocks = blocksPagination.results as LiveBlock[] | undefined;

  const snapshot = useQuery(
    api?.domains.product.blocks.getEntityNotebook ?? "skip",
    api?.domains.product.blocks.getEntityNotebook
      ? { anonymousSessionId, shareToken, entitySlug }
      : "skip",
  );

  const blockSummary = useQuery(
    api?.domains.product.blocks.getEntityBlockSummary ?? "skip",
    api?.domains.product.blocks.getEntityBlockSummary
      ? { anonymousSessionId, shareToken, entitySlug }
      : "skip",
  );

  const latestScratchpadRun = useQuery(
    api?.domains.product.diligenceScratchpads?.getLatestForEntity as never,
    canEdit && api?.domains.product.diligenceScratchpads?.getLatestForEntity
      ? { anonymousSessionId, shareToken, entitySlug, checkpointLimit: 8 }
      : "skip",
  ) as
    | {
        runId: string;
        status: "streaming" | "structuring" | "merged" | "failed";
        markdownSource: string | null;
        version: number;
        updatedAt: number;
        checkpointCount: number;
        latestBlockType?: string | null;
        latestHeaderText?: string | null;
        checkpoints: Array<{
          checkpointId: string;
          checkpointNumber: number;
          currentStep: string;
          status: "active" | "paused" | "completed" | "error" | "waiting_approval";
          progress: number;
          createdAt: number;
          error?: string;
        }>;
      }
    | null
    | undefined;

  const backlinks = useQuery(
    api?.domains.product.blocks.listBacklinksForEntity ?? "skip",
    api?.domains.product.blocks.listBacklinksForEntity
      ? { anonymousSessionId, shareToken, entitySlug }
      : "skip",
  );

  const appendBlock = useMutation(api?.domains.product.blocks.appendBlock ?? ("skip" as any));
  const moveBlock = useMutation(api?.domains.product.blocks.moveBlock ?? ("skip" as any));
  const insertBlockBetween = useMutation(
    api?.domains.product.blocks.insertBlockBetween ?? ("skip" as any),
  );
  const updateBlock = useMutation(api?.domains.product.blocks.updateBlock ?? ("skip" as any));
  const deleteBlock = useMutation(api?.domains.product.blocks.deleteBlock ?? ("skip" as any));
  const createBlockRelation = useMutation(
    api?.domains.product.blocks.createBlockRelation ?? ("skip" as any),
  );
  const notebookHeartbeat = useMutation(
    api?.domains.product.notebookPresence.notebookHeartbeat ?? ("skip" as any),
  );
  const notebookPresenceDisconnect = useMutation(
    api?.domains.product.notebookPresence.notebookPresenceDisconnect ?? ("skip" as any),
  );
  const submitOfflineSnapshot = useMutation(
    api?.domains.product.blockProsemirror.submitOfflineSnapshot ?? ("skip" as any),
  );
  const materializeProjectionOverlays = useMutation(
    api?.domains.product.diligenceProjections?.materializeForEntity as never,
  );
  const requestProjectionRefreshAndRun = useMutation(
    api?.domains.product.diligenceProjections?.requestRefreshAndRun as never,
  );

  const [slashFor, setSlashFor] = useState<Id<"productBlocks"> | null>(null);
  const [mentionFor, setMentionFor] = useState<{ blockId: Id<"productBlocks">; initial: string } | null>(null);
  const [focusedBlockId, setFocusedBlockId] = useState<Id<"productBlocks"> | null>(null);
  // Sticky mount set: once a block has been focused (or hovered near) this
  // session, keep its Tiptap editor mounted so subsequent clicks don't
  // re-fetch the Convex sync snapshot. Fixes the click-reload delay.
  const [mountedBlockIds, setMountedBlockIds] = useState<Set<string>>(new Set());
  const warmBlock = useCallback((blockId: Id<"productBlocks">) => {
    setMountedBlockIds((prev) => {
      const key = String(blockId);
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);
  const [runtimeError, setRuntimeError] = useState<{ title: string; detail?: string } | null>(null);
  const [creatingFirstBlock, setCreatingFirstBlock] = useState(false);
  const [optimisticBlockContent, setOptimisticBlockContent] = useState<Record<string, BlockChip[]>>(
    {},
  );
  const [presenceRoomToken, setPresenceRoomToken] = useState<string | null>(null);
  const [presenceSessionToken, setPresenceSessionToken] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine === false : false,
  );
  const [offlineQueueLength, setOfflineQueueLength] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [hiddenDecorationRunIds, setHiddenDecorationRunIds] = useState<Record<string, true>>({});
  const createFirstBlockInFlightRef = useRef<Promise<Id<"productBlocks"> | null> | null>(null);
  const autoCreateFirstBlockAttemptedRef = useRef(false);
  const autoFocusInitialBlockAttemptedRef = useRef(false);
  const editorHandlesRef = useRef<Map<string, NotebookBlockEditorHandle>>(new Map());
  const pendingOptimisticBlockContentRef = useRef<Record<string, BlockChip[]>>({});
  const presenceClientSessionIdRef = useRef(
    `nb-live-${entitySlug}-${Math.random().toString(36).slice(2, 10)}`,
  );
  const materializedProjectionVersionKeyRef = useRef<string | null>(null);

  const presence = useQuery(
    api?.domains.product.notebookPresence.notebookPresenceList ?? "skip",
    api?.domains.product.notebookPresence.notebookPresenceList && presenceRoomToken
      ? { roomToken: presenceRoomToken }
      : "skip",
  ) as Array<{ userId: string; online: boolean; lastDisconnected: number }> | undefined;

  const describeError = useCallback((error: unknown): string | undefined => {
    if (!error) return undefined;
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return undefined;
  }, []);

  const reportNotebookError = useCallback(
    (title: string, error: unknown) => {
      const detail = describeError(error);
      console.warn(`[notebook] ${title}`, error);
      setRuntimeError({ title, detail });
      toast.error(title, detail);
    },
    [describeError, toast],
  );

  // Codes we expect and handle gracefully — do NOT alert on these. They
  // correspond to the `level: "warning"` branch in describeNotebookMutationFailure
  // plus rate limit, both of which are designed-for states that don't need
  // a page-the-on-call signal.
  const EXPECTED_ALERT_CODES = useMemo(
    () => new Set(["REVISION_MISMATCH", "RATE_LIMITED", "CONTENT_TOO_LARGE"]),
    [],
  );

  const reportNotebookMutationFailure = useCallback(
    (action: "save" | "mention" | "command", error: unknown) => {
      const failure = describeNotebookMutationFailure(action, error);
      const parsed = parseNotebookMutationError(error);
      console.warn(`[notebook] ${failure.title}`, error);
      setRuntimeError({ title: failure.title, detail: failure.detail });
      if (failure.level === "warning") {
        toast.warning(failure.title, failure.detail);
      } else {
        toast.error(failure.title, failure.detail);
      }
      // Real-time alert: fire ntfy only on UNEXPECTED failures. Expected
      // codes (conflict, rate limit, content too large) are designed states
      // and would otherwise pager-storm on normal usage. Sampling at the
      // ntfy helper guarantees at most 1 alert per code per 60s per tab.
      const code = parsed.code ?? "UNKNOWN_ERROR";
      if (code === "RATE_LIMITED") {
        setRateLimited(true);
        window.setTimeout(
          () => setRateLimited(false),
          typeof parsed.retryAfterMs === "number" && parsed.retryAfterMs > 0
            ? parsed.retryAfterMs
            : 3_000,
        );
      }
      if (!EXPECTED_ALERT_CODES.has(code)) {
        publishNotebookAlert({
          severity: code === "SERVER_ERROR" || code === "UNKNOWN_ERROR" ? "P0" : "P1",
          code,
          title: failure.title,
          detail: failure.detail,
          requestId: parsed.requestId,
          context: { action, entitySlug },
        });
      }
    },
    [EXPECTED_ALERT_CODES, entitySlug, toast],
  );

  const notifyReadOnly = useCallback(
    (action: string) => {
      const title = "Block is read-only";
      const detail = `You cannot ${action} this block until its access mode is set to edit.`;
      setRuntimeError({ title, detail });
      toast.warning(title, detail);
    },
    [toast],
  );

  const openFirstBlock = useCallback(async (): Promise<Id<"productBlocks"> | null> => {
    if (createFirstBlockInFlightRef.current) {
      return createFirstBlockInFlightRef.current;
    }
    setCreatingFirstBlock(true);
    const run = appendBlock({
      anonymousSessionId,
      shareToken,
      entitySlug,
      kind: "text",
      content: [{ type: "text", value: "" }],
      authorKind: "user",
    })
      .then((blockId) => {
        setRuntimeError(null);
        setFocusedBlockId(blockId);
        return blockId;
      })
      .catch((error: unknown) => {
        reportNotebookError("Failed to open the live notebook editor", error);
        return null;
      })
      .finally(() => {
        setCreatingFirstBlock(false);
        createFirstBlockInFlightRef.current = null;
      });
    createFirstBlockInFlightRef.current = run;
    return run;
  }, [anonymousSessionId, appendBlock, entitySlug, reportNotebookError, shareToken]);

  useEffect(() => {
    autoCreateFirstBlockAttemptedRef.current = false;
    autoFocusInitialBlockAttemptedRef.current = false;
    createFirstBlockInFlightRef.current = null;
    setCreatingFirstBlock(false);
  }, [entitySlug, shareToken]);

  useEffect(() => {
    if (!canEdit || !blocks || snapshot === undefined) return;
    if (blocks.length > 0) return;
    if (autoCreateFirstBlockAttemptedRef.current) return;
    autoCreateFirstBlockAttemptedRef.current = true;
    void openFirstBlock();
  }, [blocks, canEdit, openFirstBlock, snapshot]);

  useEffect(() => {
    if (!blocks || Object.keys(optimisticBlockContent).length === 0) return;
    setOptimisticBlockContent((current) => {
      let changed = false;
      const next = { ...current };
      for (const block of blocks) {
        const key = String(block._id);
        const optimistic = next[key];
        if (optimistic && chipsEqual(optimistic, block.content)) {
          delete next[key];
          changed = true;
        }
      }
      if (changed) {
        setLastSyncedAt(Date.now());
      }
      return changed ? next : current;
    });
  }, [blocks, optimisticBlockContent]);

  const registerEditorHandle = useCallback(
    (blockId: Id<"productBlocks">, handle: NotebookBlockEditorHandle | null) => {
      const key = String(blockId);
      if (handle) {
        editorHandlesRef.current.set(key, handle);
      } else {
        editorHandlesRef.current.delete(key);
      }
    },
    [],
  );

  const focusBlockHandleWithRetry = useCallback((blockId: Id<"productBlocks">) => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let attempts = 0;

    const tryFocus = () => {
      if (cancelled) return;
      const handle = editorHandlesRef.current.get(String(blockId));
      if (handle) {
        handle.focus();
        return;
      }
      if (attempts >= 12) return;
      attempts += 1;
      window.requestAnimationFrame(tryFocus);
    };

    window.requestAnimationFrame(tryFocus);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!focusedBlockId) return;
    return focusBlockHandleWithRetry(focusedBlockId);
  }, [focusBlockHandleWithRetry, focusedBlockId]);

  const refreshOfflineQueueLength = useCallback(() => {
    setOfflineQueueLength(readQueue(entitySlug).length);
  }, [entitySlug]);

  const flushOptimisticBlockContent = useCallback((blockId: Id<"productBlocks">) => {
    const key = String(blockId);
    const pending = pendingOptimisticBlockContentRef.current[key];
    if (!pending) return;
    setOptimisticBlockContent((current) => {
      if (chipsEqual(current[key], pending)) return current;
      return { ...current, [key]: pending };
    });
  }, []);

  const handleLocalContentChange = useCallback((blockId: Id<"productBlocks">, content: BlockChip[]) => {
    pendingOptimisticBlockContentRef.current[String(blockId)] = content;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      enqueueOfflineEdit({
        id: makeEditId(),
        blockId: String(blockId),
        entitySlug,
        kind: "content",
        payload: content,
        queuedAt: Date.now(),
      });
      refreshOfflineQueueLength();
    }
    setRuntimeError(null);
  }, [entitySlug, refreshOfflineQueueLength]);

  useEffect(() => {
    refreshOfflineQueueLength();
    const handleOnline = () => {
      setIsOffline(false);
      refreshOfflineQueueLength();
    };
    const handleOffline = () => {
      setIsOffline(true);
      refreshOfflineQueueLength();
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshOfflineQueueLength]);

  useEffect(() => {
    if (!blocks || blocks.length === 0) return;
    if (lastSyncedAt == null) {
      setLastSyncedAt(Date.now());
    }
  }, [blocks, lastSyncedAt]);

  useEffect(() => {
    if (!api?.domains.product.notebookPresence?.notebookHeartbeat) return;
    const sessionId = presenceClientSessionIdRef.current;
    let disposed = false;
    let intervalId: number | null = null;

    const beat = async () => {
      try {
        const result = await notebookHeartbeat({
          anonymousSessionId,
          shareToken,
          entitySlug,
          sessionId,
          interval: 30_000,
        });
        if (disposed) return;
        setPresenceRoomToken(result.roomToken || null);
        setPresenceSessionToken(result.sessionToken || null);
      } catch {
        if (!disposed) {
          setPresenceRoomToken(null);
          setPresenceSessionToken(null);
        }
      }
    };

    void beat();
    intervalId = window.setInterval(() => {
      void beat();
    }, 25_000);

    return () => {
      disposed = true;
      if (intervalId != null) window.clearInterval(intervalId);
      const token = presenceSessionToken;
      if (token) {
        void notebookPresenceDisconnect({ sessionToken: token }).catch(() => undefined);
      }
    };
  }, [
    anonymousSessionId,
    api,
    entitySlug,
    notebookHeartbeat,
    notebookPresenceDisconnect,
    presenceSessionToken,
    shareToken,
  ]);

  useEffect(() => {
    if (isOffline || !api?.domains.product.blockProsemirror?.submitOfflineSnapshot) return;
    const queued = readQueue(entitySlug);
    if (queued.length === 0) return;

    let cancelled = false;
    const replay = async () => {
      for (const entry of queued) {
        if (cancelled) break;
        if (!Array.isArray(entry.payload)) continue;
        try {
          await submitOfflineSnapshot({
            anonymousSessionId,
            shareToken,
            id: buildProductBlockSyncId({
              anonymousSessionId,
              shareToken,
              blockId: entry.blockId,
            }),
            chips: entry.payload as BlockChip[],
          });
          removeOfflineEdit(entitySlug, entry.id);
          setLastSyncedAt(Date.now());
        } catch {
          break;
        }
      }
      if (!cancelled) {
        refreshOfflineQueueLength();
      }
    };

    void replay();
    return () => {
      cancelled = true;
    };
  }, [
    anonymousSessionId,
    api,
    entitySlug,
    isOffline,
    refreshOfflineQueueLength,
    shareToken,
    submitOfflineSnapshot,
  ]);

  const handleEnter = useCallback(
    async (block: LiveBlock, blockIndex: number) => {
      if (!blocks) return;
      if (!canEdit || block.accessMode === "read") {
        notifyReadOnly("insert after");
        return;
      }
      const next = blocks[blockIndex + 1];
      const insertedBlockId = await insertBlockBetween({
        anonymousSessionId,
        shareToken,
        entitySlug,
        beforeBlockId: block._id,
        afterBlockId: next?._id,
        parentBlockId: block.parentBlockId,
        kind: "text",
        content: [{ type: "text", value: "" }],
        authorKind: "user",
      });
      setFocusedBlockId(insertedBlockId);
    },
    [blocks, canEdit, insertBlockBetween, anonymousSessionId, entitySlug, notifyReadOnly, shareToken],
  );

  const streaming = useStreamingSearch();

  const handleMentionPick = useCallback(
    async (match: EntityMatch) => {
      if (!mentionFor) return;
      const targetBlockId = mentionFor.blockId;
      setMentionFor(null);
      // Find the current block to append a mention chip inline.
      const block = blocks?.find((b) => b._id === targetBlockId);
      if (!block) return;
      if (!canEdit || block.accessMode !== "edit") {
        notifyReadOnly("add mentions to");
        return;
      }
      try {
        const handle = editorHandlesRef.current.get(String(targetBlockId));
        if (handle) {
          handle.insertMention(match);
          handle.focus();
        } else if (!isSyncEditableBlock(block)) {
          await updateBlock({
            anonymousSessionId,
            shareToken,
            blockId: targetBlockId,
            content: [
              ...block.content,
              ...(block.content.length > 0 ? ([{ type: "text", value: " " }] as BlockChip[]) : []),
              {
                type: "mention",
                value: match.name,
                mentionTrigger: "@",
                mentionTarget: match.slug,
              },
            ],
            expectedRevision: block.revision,
          });
        } else {
          throw new Error("Focused notebook editor was not available for this mention.");
        }
        // Record the relation so backlinks work.
        await createBlockRelation({
          anonymousSessionId,
          shareToken,
          fromBlockId: targetBlockId,
          toEntityId: undefined,
          toBlockId: undefined,
          toUrl: undefined,
          relationKind: "mention",
          relationLabel: match.slug,
          authorKind: "user",
        });
      } catch (err) {
        reportNotebookMutationFailure("mention", err);
      }
    },
    [
      anonymousSessionId,
      canEdit,
      blocks,
      createBlockRelation,
      editorHandlesRef,
      mentionFor,
      notifyReadOnly,
      reportNotebookMutationFailure,
      shareToken,
      updateBlock,
    ],
  );

  const runSlashCommand = useCallback(
    async (command: SlashCommand, block: LiveBlock) => {
      setSlashFor(null);
      const prompt = command.prompt ?? "";
      if (!prompt.trim() && command.id !== "mention") return;
      if (!canEdit || block.accessMode === "read") {
        notifyReadOnly("run notebook commands from");
        return;
      }

      if (command.id === "ai" || command.id === "search" || command.id === "deepresearch") {
        // Insert a lightweight progress callout so the user sees work start immediately.
        const progressBlockId = await appendBlock({
          anonymousSessionId,
          shareToken,
          entitySlug,
          parentBlockId: block.parentBlockId,
          kind: "callout",
          content: [
            { type: "text", value: `${command.label}: ${prompt}` },
            { type: "text", value: " - working..." },
          ],
          authorKind: "agent",
          authorId: `slash:${command.id}`,
        });

        // Kick off the existing streaming search. On complete, we persist each
        // section as a block so the user can edit them inline.
        const lens = command.id === "deepresearch" ? "founder" : "general";
        streaming.startStream(prompt, lens, {
          onComplete: async (payload) => {
            const packet = (payload.packet ?? payload) as {
              answerBlocks?: Array<{ text?: string; title?: string; sourceRefIds?: string[] }>;
              answer?: string;
            };
            // Mark the progress block as complete and capture the headline answer.
            try {
              if (packet.answerBlocks && packet.answerBlocks.length > 0) {
                for (let i = 0; i < packet.answerBlocks.length; i++) {
                  const ab = packet.answerBlocks[i];
                  const text = ab.text ?? "";
                  if (!text.trim()) continue;
                  await appendBlock({
                    anonymousSessionId,
                    shareToken,
                    entitySlug,
                    parentBlockId: block.parentBlockId,
                    kind: ab.title ? "heading_3" : "text",
                    content: [{ type: "text", value: ab.title ?? text }],
                    authorKind: "agent",
                    authorId: `slash:${command.id}`,
                    sourceRefIds: ab.sourceRefIds,
                  });
                  if (ab.title && ab.text) {
                    await appendBlock({
                      anonymousSessionId,
                      shareToken,
                      entitySlug,
                      parentBlockId: block.parentBlockId,
                      kind: "text",
                      content: [{ type: "text", value: ab.text }],
                      authorKind: "agent",
                      authorId: `slash:${command.id}`,
                      sourceRefIds: ab.sourceRefIds,
                    });
                  }
                }
              } else if (packet.answer) {
                await appendBlock({
                  anonymousSessionId,
                  shareToken,
                  entitySlug,
                  parentBlockId: block.parentBlockId,
                  kind: "text",
                  content: [{ type: "text", value: packet.answer }],
                  authorKind: "agent",
                  authorId: `slash:${command.id}`,
                });
              }
              // Mark the progress block as complete.
              await updateBlock({
                anonymousSessionId,
                shareToken,
                blockId: progressBlockId,
                content: [{ type: "text", value: `[done] ${command.label}: ${prompt}` }],
                expectedRevision: 1,
              });
            } catch (err) {
              reportNotebookMutationFailure("command", err);
            }
          },
          onError: (message) => {
            updateBlock({
              anonymousSessionId,
              shareToken,
              blockId: progressBlockId,
              content: [{ type: "text", value: `[error] ${command.label}: ${prompt} - ${message}` }],
              expectedRevision: 1,
            }).catch((err) => reportNotebookMutationFailure("command", err));
            setRuntimeError({ title: `Notebook command failed`, detail: message });
            toast.error("Notebook command failed", message);
          },
        });
      } else if (command.id === "mention") {
        // Open the entity picker seeded with whatever the user typed.
        setMentionFor({ blockId: block._id, initial: prompt });
      }
    },
    [
      anonymousSessionId,
      appendBlock,
      canEdit,
      entitySlug,
      notifyReadOnly,
      reportNotebookMutationFailure,
      shareToken,
      streaming,
      toast,
      updateBlock,
    ],
  );

  const sourcesById = useMemo(() => {
    const map = new Map<string, { id: string; label: string; href?: string; confidence?: number; domain?: string }>();
    if (snapshot?.sources) {
      for (const src of snapshot.sources) {
        map.set(src.id, src);
      }
    }
    return map;
  }, [snapshot?.sources]);

  const citationLabelsById = useMemo(() => {
    const map = new Map<string, string>();
    if (snapshot?.sources) {
      snapshot.sources.forEach((src, index) => {
        map.set(src.id, `s${index + 1}`);
      });
    }
    return map;
  }, [snapshot?.sources]);

  const diligenceBlocks = useDiligenceBlocks(entitySlug, snapshot);
  // Persisted dismissals live as lifted state. The actual Convex subscription
  // runs inside <NotebookDismissalsSync /> which is wrapped in a local
  // ErrorBoundary at the render site — so a server-side failure on the
  // dismissals query (schema drift, deploy lag) degrades to "empty set"
  // instead of crashing the whole notebook. See decorationPreferences.ts
  // and NotebookDismissalsSync.tsx.
  const [dismissedKeySet, setDismissedKeySet] = useState<Set<string>>(
    () => new Set<string>(),
  );
  // Timeline scrub cursor — when set, decorations filter to those
  // authored at-or-before the cursor. Null == view "now". Subscribed
  // via URL-hash hook so NotebookTimeline can set the cursor from a
  // sibling component without prop-drilling through Suspense.
  const scrubTime = useScrubTime();
  const visibleDiligenceDecorations = useMemo(
    () =>
      diligenceBlocks.projections.filter((projection) => {
        if (hiddenDecorationRunIds[projection.scratchpadRunId]) return false;
        // Honor persisted dismissals (Milestone 4c — dismissal now
        // survives refresh). Keyed by (scratchpadRunId, blockType)
        // so dismissing one block's decoration from a run does not
        // silence the other block types produced by the same run.
        if (dismissedKeySet.has(`${projection.scratchpadRunId}::${projection.blockType}`)) {
          return false;
        }
        // Timeline scrub filter — when the user has scrubbed back,
        // hide decorations produced after the cursor (they didn't
        // exist at that moment yet).
        if (scrubTime != null && projection.updatedAt > scrubTime) {
          return false;
        }
        // Suppress starter/placeholder cards that have no real content.
        // Notion/Linear rule: if the agent returned nothing, render nothing —
        // not a card saying "the agent returned nothing".
        const prose = (projection.bodyProse ?? "").trim();
        if (prose.length === 0) return false;
        const placeholderFragments = [
          "no clear summary was returned",
          "no explicit gap was returned",
          "no next action was returned",
          "the agent did not return",
          "no live diligence content is available",
          "use this notebook to accumulate",
        ];
        const lower = prose.toLowerCase();
        if (placeholderFragments.some((frag) => lower.includes(frag))) return false;
        return true;
      }),
    [diligenceBlocks.projections, hiddenDecorationRunIds, dismissedKeySet, scrubTime],
  );

  const notebookLoadState = getNotebookLoadState({
    loadedCount: blocks?.length ?? 0,
    totalCount: blockSummary?.blockCount,
    paginationStatus: blocksPagination.status,
  });
  const latestRunCheckpoint = latestScratchpadRun?.checkpoints?.at(-1);
  const isNotebookRunActive =
    latestScratchpadRun?.status === "streaming" ||
    latestScratchpadRun?.status === "structuring";
  const notebookRuntimeTone = latestScratchpadRun
    ? latestScratchpadRun.status === "failed"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
      : isNotebookRunActive
        ? "border-sky-500/20 bg-sky-500/10 text-sky-200"
        : latestScratchpadRun.status === "merged"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          : "border-amber-500/20 bg-amber-500/10 text-amber-200"
    : "border-gray-200 bg-gray-50 text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200";
  const notebookRuntimeLabel = latestScratchpadRun
    ? latestScratchpadRun.status === "streaming"
      ? "Running"
      : latestScratchpadRun.status === "structuring"
        ? "Structuring"
        : latestScratchpadRun.status === "merged"
          ? "Ready"
          : latestScratchpadRun.status === "failed"
            ? "Needs review"
            : latestScratchpadRun.status
    : "Ready";
  const scratchpadRailSlot = useMemo(() => {
    if (!canEdit || !latestScratchpadRun) return undefined;
    return (
      <NotebookScratchpadTracePanel
        markdownSource={latestScratchpadRun?.markdownSource}
        runLabel={
          latestScratchpadRun
            ? `${snapshot?.entityName ?? entitySlug} · ${latestScratchpadRun.status}`
            : `${snapshot?.entityName ?? entitySlug} · no active run`
        }
        version={latestScratchpadRun?.version}
        updatedAt={latestScratchpadRun?.updatedAt}
        checkpoints={latestScratchpadRun?.checkpoints}
      />
    );
  }, [canEdit, entitySlug, latestScratchpadRun, snapshot?.entityName]);
  const runMapRailSlot = useMemo(() => {
    if (!latestScratchpadRun) return undefined;
    return (
      <NotebookRunMapPanel
        entitySlug={entitySlug}
        runStatus={latestScratchpadRun.status}
        checkpointCount={latestScratchpadRun.checkpointCount}
        updatedAt={latestScratchpadRun.updatedAt}
        latestBlockType={latestScratchpadRun.latestBlockType}
      />
    );
  }, [entitySlug, latestScratchpadRun]);
  const focusedBlock = blocks?.find((block) => block._id === focusedBlockId);
  const showReferenceOverlayStrip =
    visibleDiligenceDecorations.length > 0 && (blocks?.length ?? 0) > 0;
  const showNotebookRuntimeHeader =
    canEdit ||
    Boolean(latestScratchpadRun) ||
    showReferenceOverlayStrip ||
    visibleDiligenceDecorations.length > 0;
  // Nesting depth per block. Walks parentBlockId chain once, caches in a
  // Map for O(1) lookup during the render map. Guards against parent cycles
  // by stopping after 16 hops.
  const blockDepthMap = useMemo(() => {
    const byId = new Map<string, LiveBlock>();
    for (const b of blocks ?? []) byId.set(String(b._id), b);
    const depthByBlock = new Map<string, number>();
    for (const b of blocks ?? []) {
      let depth = 0;
      let cursor: LiveBlock | undefined = b;
      const seen = new Set<string>();
      while (cursor?.parentBlockId && depth < 16) {
        const parentKey = String(cursor.parentBlockId);
        if (seen.has(parentKey)) break;
        seen.add(parentKey);
        const parent = byId.get(parentKey);
        if (!parent) break;
        // Only indent when parent is an editable sibling block, not a
        // seeded section marker (heading_1 / heading_2). This matches the
        // Roam/Notion behavior where Tab indents lists and paragraphs but
        // doesn't push headings under headings.
        if (parent.kind === "heading_1" || parent.kind === "heading_2") {
          break;
        }
        depth += 1;
        cursor = parent;
      }
      depthByBlock.set(String(b._id), depth);
    }
    return depthByBlock;
  }, [blocks]);
  // Outline items — collect H1/H2/H3 with non-empty text. Rendered in the
  // right rail only when ≥2 exist (NotebookOutline enforces the floor).
  const outlineItems = useMemo(
    () =>
      (blocks ?? [])
        .filter(
          (b) =>
            b.kind === "heading_1" || b.kind === "heading_2" || b.kind === "heading_3",
        )
        .map((b) => ({
          blockId: String(b._id),
          kind: b.kind as "heading_1" | "heading_2" | "heading_3",
          text: chipsToPlainText(
            (optimisticBlockContent[String(b._id)] ?? b.content) as BlockChip[],
          ),
        })),
    [blocks, optimisticBlockContent],
  );
  const canUseOverlayActions = canEdit && notebookLoadState.fullyLoaded;

  useEffect(() => {
    const reportUpdatedAt = snapshot?.reportUpdatedAt;
    const reportBlockCount = snapshot?.blocks?.length ?? 0;
    if (!canEdit) return;
    if (!entitySlug) return;
    if (!reportUpdatedAt || reportBlockCount === 0) return;

    const versionKey = `${entitySlug}:${reportUpdatedAt}:${reportBlockCount}`;
    if (materializedProjectionVersionKeyRef.current === versionKey) return;
    materializedProjectionVersionKeyRef.current = versionKey;

    void materializeProjectionOverlays({
      anonymousSessionId,
      shareToken,
      entitySlug,
    } as never).catch((error: unknown) => {
      materializedProjectionVersionKeyRef.current = null;
      console.warn("[notebook] failed to materialize diligence overlays", error);
    });
  }, [
    anonymousSessionId,
    canEdit,
    entitySlug,
    materializeProjectionOverlays,
    shareToken,
    snapshot?.blocks?.length,
    snapshot?.reportUpdatedAt,
  ]);

  /**
   * Shared helper — turn a decoration into the context shape the
   * drawer and action log expect. Keeps the three call sites below
   * (ask / accept / dismiss / refresh) reading identically.
   */
  const buildDecorationContext = useCallback(
    (decoration: DiligenceDecorationData): DecorationContext => ({
      entitySlug,
      scratchpadRunId: decoration.scratchpadRunId,
      blockType: decoration.blockType,
      overallTier: decoration.overallTier,
      headerText: decoration.headerText,
      bodyProse: decoration.bodyProse,
      sourceCount: decoration.sourceCount,
      sourceRefIds: decoration.sourceRefIds,
    }),
    [entitySlug],
  );

  /**
   * "Ask NodeBench about this" — opens the drawer pre-loaded with this
   * decoration as context. Logs the escalation so the drawer timeline
   * reflects the inline ↔ chat continuity (Milestone 4 seam).
   */
  const handleAskAboutDecoration = useCallback(
    (scratchpadRunId: string, blockType: DiligenceDecorationData["blockType"]) => {
      const decoration = visibleDiligenceDecorations.find(
        (c) => c.scratchpadRunId === scratchpadRunId && c.blockType === blockType,
      );
      if (!decoration) return;
      agentActions.askAboutDecoration(
        buildDecorationContext(decoration),
        anonymousSessionId ?? undefined,
      );
    },
    [agentActions, anonymousSessionId, buildDecorationContext, visibleDiligenceDecorations],
  );

  const handleDismissDecoration = useCallback(
    (scratchpadRunId: string, blockType?: DiligenceDecorationData["blockType"]) => {
      // Still update the local Set instantly for responsive UX — the
      // Convex write is fire-and-forget so the user never sees a lag
      // between click and fade-out. The persisted state syncs via
      // query reactivity in the next tick.
      setHiddenDecorationRunIds((current) =>
        current[scratchpadRunId] ? current : { ...current, [scratchpadRunId]: true },
      );
      if (!blockType) return; // legacy callers (should shrink to zero)
      const decoration = visibleDiligenceDecorations.find(
        (c) => c.scratchpadRunId === scratchpadRunId && c.blockType === blockType,
      );
      if (!decoration) return;
      void agentActions.dismissDecoration(
        buildDecorationContext(decoration),
        anonymousSessionId ?? undefined,
      );
    },
    [agentActions, anonymousSessionId, buildDecorationContext, visibleDiligenceDecorations],
  );

  /**
   * Refresh handler — requests a re-run of a specific decoration's block.
   *
   * UX contract (industry-standard async acknowledgement, Linear / Figma /
   * Notion pattern):
   *   1. Click acknowledged instantly with a toast so the button doesn't
   *      feel dead while the mutation round-trips.
   *   2. requestRefreshAndRun flags the row when it exists, then re-runs the
   *      same generic projection orchestrator that writes authoritative
   *      overlay rows from saved report sections.
   *   3. useQuery reactivity picks up the newer version automatically when
   *      the rerun finishes. No imperative re-fetch is needed here.
   *   4. Snapshot-only fallback overlays also converge because the mutation
   *      materializes server rows when the old client-only row is missing.
   */
  const handleRefreshDecoration = useCallback(
    async (
      scratchpadRunId: string,
      blockType: DiligenceDecorationData["blockType"],
    ) => {
      const decoration = visibleDiligenceDecorations.find(
        (candidate) =>
          candidate.scratchpadRunId === scratchpadRunId && candidate.blockType === blockType,
      );
      if (!decoration) return;

      toast.info(
        "Refreshing live intelligence…",
        `Queued a refresh for this ${blockType} block. The overlay will update when the orchestrator emits a newer version.`,
      );

      try {
        const result = (await requestProjectionRefreshAndRun({
          anonymousSessionId,
          shareToken,
          entitySlug,
          blockType,
          scratchpadRunId,
        } as never)) as
          | {
              refreshStatus: "queued" | "already-queued" | "not-found";
              queuedAt?: number;
              rerun?: {
                status: "materialized" | "noop";
                total: number;
                created: number;
                updated: number;
                stale: number;
                deleted: number;
              };
            }
          | undefined;

        if (!result) return;
        if (result.refreshStatus === "already-queued") {
          toast.info(
            "Already refreshing",
            "The orchestrator is still processing your previous refresh request.",
          );
          return;
        }
        if (result.rerun?.status === "materialized") {
          toast.success(
            "Live intelligence refreshed",
            result.rerun.updated + result.rerun.created > 0
              ? "The overlay now reflects the latest structured diligence projection."
              : "The overlay was re-run but no newer structured output was produced.",
          );
        } else if (result.refreshStatus === "not-found") {
          toast.info(
            "Overlay resynced",
            "The overlay was rebuilt from the latest saved report for this entity.",
          );
        }
      } catch (err) {
        toast.error(
          "Refresh failed",
          err instanceof Error ? err.message : "Unknown error while requesting a refresh.",
        );
      }
    },
    [
      anonymousSessionId,
      entitySlug,
      requestProjectionRefreshAndRun,
      shareToken,
      toast,
      visibleDiligenceDecorations,
    ],
  );

  const handleAcceptDecoration = useCallback(
    async (scratchpadRunId: string, blockType: DiligenceDecorationData["blockType"]) => {
      if (!blocks || blocks.length === 0) return;
      if (!canEdit || !notebookLoadState.fullyLoaded) {
        notifyReadOnly("accept live intelligence into");
        return;
      }

      const decoration = visibleDiligenceDecorations.find(
        (candidate) =>
          candidate.scratchpadRunId === scratchpadRunId && candidate.blockType === blockType,
      );
      if (!decoration) return;

      const accepted = acceptDecorationIntoNotebook({ decoration });
      if (!accepted.succeeded || !accepted.drafts || accepted.drafts.length === 0) {
        const title = "Could not add the live snapshot";
        const detail = accepted.failureReason ?? "No notebook content was generated.";
        setRuntimeError({ title, detail });
        toast.error(title, detail);
        return;
      }

      const anchorBlock =
        blocks.find((block) => block._id === focusedBlockId) ??
        blocks.find((block) => (block.accessMode ?? "edit") === "edit") ??
        blocks[0];
      if (!anchorBlock) return;

      const anchorIndex = blocks.findIndex((block) => block._id === anchorBlock._id);
      const afterOriginalBlockId = blocks[anchorIndex + 1]?._id;
      const anchorDisplayContent =
        optimisticBlockContent[String(anchorBlock._id)] ?? anchorBlock.content;
      const shouldReuseAnchor = isTriviallyEmptyNotebookBlock(anchorBlock, anchorDisplayContent);
      let beforeBlockId = anchorBlock._id;
      let lastCreatedBlockId: Id<"productBlocks"> = anchorBlock._id;
      let draftStartIndex = 0;

      try {
        if (shouldReuseAnchor) {
          const firstDraft = accepted.drafts[0];
          await updateBlock({
            anonymousSessionId,
            shareToken,
            blockId: anchorBlock._id,
            kind: firstDraft.kind,
            content: firstDraft.content,
            sourceRefIds: firstDraft.sourceRefIds,
            attributes: firstDraft.attributes,
            expectedRevision: anchorBlock.revision,
          });
          draftStartIndex = 1;
        }

        for (let index = draftStartIndex; index < accepted.drafts.length; index += 1) {
          const draft = accepted.drafts[index];
          const insertedBlockId = await insertBlockBetween({
            anonymousSessionId,
            shareToken,
            entitySlug,
            beforeBlockId,
            afterBlockId: afterOriginalBlockId,
            parentBlockId: anchorBlock.parentBlockId,
            kind: draft.kind,
            content: draft.content,
            authorKind: "user",
            authorId: viewerOwnerKey ?? undefined,
            sourceRefIds: draft.sourceRefIds,
            attributes: draft.attributes,
          });
          beforeBlockId = insertedBlockId;
          lastCreatedBlockId = insertedBlockId;
        }

        setHiddenDecorationRunIds((current) => ({ ...current, [scratchpadRunId]: true }));
        setRuntimeError(null);
        setLastSyncedAt(Date.now());
        setFocusedBlockId(lastCreatedBlockId);
        toast.success("Live snapshot added to notebook");
        // Log the accept so the drawer's activity timeline shows it.
        // Fire-and-forget; network/log failure must NEVER undo the
        // successful accept (HONEST_STATUS applies: the notebook was
        // truly updated).
        agentActions.logAcceptDecoration(
          buildDecorationContext(decoration),
          anonymousSessionId ?? undefined,
        );
      } catch (error) {
        reportNotebookMutationFailure("save", error);
      }
    },
    [
      agentActions,
      anonymousSessionId,
      blocks,
      buildDecorationContext,
      canEdit,
      entitySlug,
      focusedBlockId,
      insertBlockBetween,
      notebookLoadState.fullyLoaded,
      notifyReadOnly,
      optimisticBlockContent,
      reportNotebookMutationFailure,
      shareToken,
      toast,
      updateBlock,
      viewerOwnerKey,
      visibleDiligenceDecorations,
    ],
  );

  useEffect(() => {
    if (!canEdit || !blocks || blocks.length === 0 || focusedBlockId || !notebookLoadState.fullyLoaded) return;
    if (autoFocusInitialBlockAttemptedRef.current) return;
    const firstEditableBlock = blocks.find((block) => (block.accessMode ?? "edit") === "edit");
    if (!firstEditableBlock) return;
    autoFocusInitialBlockAttemptedRef.current = true;
    setFocusedBlockId(firstEditableBlock._id);
  }, [blocks, canEdit, focusedBlockId, notebookLoadState.fullyLoaded]);

  if (blocksPagination.status === "LoadingFirstPage" || blocks === undefined || snapshot === undefined) {
    return <div className="py-16 text-center text-sm text-gray-500">Loading notebookâ€¦</div>;
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white/[0.02] px-6 py-16 text-center dark:border-white/10">
        <div className="mx-auto max-w-xl">
          <p className="text-base font-medium text-gray-900 dark:text-gray-100">
            {canEdit
              ? creatingFirstBlock
                ? "Opening the live notebook editor."
                : "This live notebook is ready for the first block."
              : "No live notebook blocks yet."}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {canEdit
              ? visibleDiligenceDecorations.length > 0
                ? "Your notes stay editable. The latest intelligence will appear as a read-only reference overlay as soon as the editor opens."
                : "Start writing directly. The first editable block will open for you."
              : "This workspace has no persisted live blocks yet. Ask an editor to open the live notebook first."}
          </p>
          {canEdit ? (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => void openFirstBlock()}
                disabled={creatingFirstBlock}
                className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--accent-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingFirstBlock ? "Opening editor..." : "Open live notebook"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6" data-testid="entity-live-notebook">
      {/* Dismissals sync — isolated boundary so a backend error on this
          specific query (e.g. schema drift, prod deploy lag) can't crash
          the whole notebook. Degrades to "no persisted dismissals". */}
      <ErrorBoundary section="Dismissals sync" fallback={null}>
        <NotebookDismissalsSync
          entitySlug={entitySlug}
          anonymousSessionId={anonymousSessionId}
          onKeysChange={setDismissedKeySet}
        />
      </ErrorBoundary>
      {showNotebookRuntimeHeader ? (
        <div className="mb-5 rounded-2xl border border-gray-200/80 bg-gradient-to-b from-white/80 to-white/45 px-4 py-4 shadow-sm dark:border-white/10 dark:from-white/[0.04] dark:to-white/[0.02]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                  Live notebook
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${notebookRuntimeTone}`}
                >
                  {notebookRuntimeLabel}
                </span>
                {showReferenceOverlayStrip ? (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300">
                    Reference overlay active
                  </span>
                ) : null}
                {latestScratchpadRun?.checkpointCount ? (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300">
                    {latestScratchpadRun.checkpointCount} checkpoint
                    {latestScratchpadRun.checkpointCount === 1 ? "" : "s"}
                  </span>
                ) : null}
                {visibleDiligenceDecorations.length > 0 ? (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300">
                    {visibleDiligenceDecorations.length} live overlay
                    {visibleDiligenceDecorations.length === 1 ? "" : "s"}
                  </span>
                ) : null}
                {latestScratchpadRun?.updatedAt ? (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
                    updated {formatNotebookRuntimeRelative(latestScratchpadRun.updatedAt)}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                {isNotebookRunActive
                  ? "Keep writing in the notebook. The current diligence run is structuring sections in place while raw trace and scratchpad stay in the run inspector."
                  : showReferenceOverlayStrip
                    ? "Write in the notebook first. Structured intelligence stays read-only until you explicitly accept it into owned prose."
                    : "The notebook is the primary surface. Runtime details stay compact here and open into the run inspector only when you need them."}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {latestRunCheckpoint?.currentStep ? (
                <div className="rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-[11px] text-gray-600 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {latestRunCheckpoint.currentStep}
                  </div>
                  <div className="mt-0.5 text-gray-500 dark:text-gray-400">
                    {typeof latestRunCheckpoint.progress === "number"
                      ? `${latestRunCheckpoint.progress}% complete`
                      : "checkpoint active"}
                  </div>
                </div>
              ) : null}
              {onOpenReferenceNotebook ? (
                <button
                  type="button"
                  onClick={onOpenReferenceNotebook}
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
                >
                  Open reference view
                </button>
              ) : null}
            </div>
          </div>

          {isNotebookRunActive ? (
            <div className="mt-4 rounded-xl border border-sky-200/70 bg-sky-50/70 px-3 py-3 dark:border-sky-500/20 dark:bg-sky-500/10">
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <Activity className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-300" />
                  <span className="truncate font-medium text-sky-900 dark:text-sky-100">
                    {latestRunCheckpoint
                      ? `Checkpoint #${latestRunCheckpoint.checkpointNumber} · ${latestRunCheckpoint.currentStep}`
                      : "Structuring live run"}
                  </span>
                </div>
                <span className="shrink-0 text-sky-700 dark:text-sky-200">
                  {latestRunCheckpoint?.progress ?? 0}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-100 dark:bg-sky-500/20">
                <div
                  className="h-full rounded-full bg-sky-500 transition-[width] duration-300"
                  style={{ width: `${Math.max(8, latestRunCheckpoint?.progress ?? 12)}%` }}
                />
              </div>
              {latestScratchpadRun?.latestBlockType || latestScratchpadRun?.latestHeaderText ? (
                <div className="mt-2 text-[11px] text-sky-800/80 dark:text-sky-100/80">
                  {latestScratchpadRun.latestHeaderText
                    ? `Latest section: ${latestScratchpadRun.latestHeaderText}`
                    : latestScratchpadRun.latestBlockType
                      ? `Latest block: ${latestScratchpadRun.latestBlockType}`
                      : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {runtimeError ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{runtimeError.title}</div>
              {runtimeError.detail ? <div className="mt-1 text-xs opacity-80">{runtimeError.detail}</div> : null}
            </div>
            <button
              type="button"
              onClick={() => setRuntimeError(null)}
              className="rounded border border-amber-300/70 px-2 py-1 text-[11px] transition-colors hover:bg-amber-100/70 dark:border-amber-400/30 dark:hover:bg-amber-400/10"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {visibleDiligenceDecorations.length > 0 ? (
        <NotebookDiligenceOverlayHost
          decorations={visibleDiligenceDecorations}
          onAcceptDecoration={
            canUseOverlayActions
              ? (runId, blockType) => void handleAcceptDecoration(runId, blockType)
              : undefined
          }
          onDismissDecoration={
            canUseOverlayActions
              ? (runId, blockType) => handleDismissDecoration(runId, blockType)
              : undefined
          }
          onRefreshDecoration={canEdit ? handleRefreshDecoration : undefined}
          onAskAboutDecoration={handleAskAboutDecoration}
        />
      ) : null}

      {!notebookLoadState.fullyLoaded ? (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                Live notebook loaded {blocks.length} of {notebookLoadState.totalCount} block
                {notebookLoadState.totalCount === 1 ? "" : "s"}
              </div>
              <div className="mt-1 text-xs opacity-80">
                Editing stays locked until the full notebook is loaded so inserts and saves cannot target a partial block list.
              </div>
            </div>
            {notebookLoadState.canLoadMore ? (
              <button
                type="button"
                onClick={() =>
                  blocksPagination.loadMore(
                    Math.min(Math.max(notebookLoadState.remainingCount, 1), 150),
                  )
                }
                disabled={notebookLoadState.isLoadingMore}
                className="shrink-0 rounded border border-sky-300/70 px-2 py-1 text-[11px] transition-colors hover:bg-sky-100/70 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-400/30 dark:hover:bg-sky-400/10"
              >
                {notebookLoadState.isLoadingMore
                  ? "Loading..."
                  : `Load ${Math.min(notebookLoadState.remainingCount, 150)} more`}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Compute outline items from heading blocks. Outline shows only when
          the notebook has ≥2 headings (ship-gate §8 — no low-value modules). */}
      {(() => null)()}
      {/* Only claim the 320px right-rail column when a rail slot is actually
          populated (scratchpad OR outline). When there's nothing to show,
          the notebook gets the full width. */}
      <div
        className={
          scratchpadRailSlot || runMapRailSlot || outlineItems.length >= 2
            ? "lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6"
            : "block"
        }
      >
        <div className="min-w-0">
          <div className="space-y-0">
            {blocks.map((block, blockIndex) => (
              <BlockRow
                key={block._id}
                block={block}
                prev={blocks[blockIndex - 1]}
                sourcesById={sourcesById}
                citationLabelsById={citationLabelsById}
                displayContent={optimisticBlockContent[String(block._id)] ?? block.content}
                isEditable={canEdit && notebookLoadState.fullyLoaded && block.accessMode === "edit"}
                accessMode={
                  canEdit && notebookLoadState.fullyLoaded ? (block.accessMode ?? "edit") : "read"
                }
                isFocused={focusedBlockId === block._id}
                hasBeenMounted={mountedBlockIds.has(String(block._id))}
                depth={blockDepthMap.get(String(block._id)) ?? 0}
                onHoverPrewarm={() => warmBlock(block._id)}
                showSlash={slashFor === block._id}
                syncDocumentId={buildProductBlockSyncId({
                  blockId: String(block._id),
                  anonymousSessionId,
                  shareToken,
                })}
                onFocus={() => {
                  warmBlock(block._id);
                  setFocusedBlockId(block._id);
                }}
                onBlur={() => {
                  flushOptimisticBlockContent(block._id);
                  setFocusedBlockId((current) => (current === block._id ? null : current));
                }}
                onLocalContentChange={(content) => handleLocalContentChange(block._id, content)}
                registerEditorHandle={(handle) => registerEditorHandle(block._id, handle)}
                onEnter={() => void handleEnter(block, blockIndex)}
                onBackspaceAtStart={async () => {
                  if (blockIndex === 0) return;
                  if (!canEdit || block.accessMode !== "edit") {
                    notifyReadOnly("delete");
                    return;
                  }
                  await deleteBlock({ anonymousSessionId, shareToken, blockId: block._id });
                }}
                onOpenSlash={() => setSlashFor(block._id)}
                onCloseSlash={() => setSlashFor(null)}
                onSlashCommand={(cmd) => void runSlashCommand(cmd, block)}
                onMarkdownShortcut={(kind) => {
                  if (!canEdit || block.accessMode !== "edit") return;
                  void updateBlock({
                    anonymousSessionId,
                    shareToken,
                    blockId: block._id,
                    kind,
                    content: [],
                    expectedRevision: block.revision,
                  });
                }}
                onTabIndent={() => {
                  // Indent this block under the previous one. No-op if
                  // there is no previous block or the user can't edit.
                  if (!canEdit || block.accessMode !== "edit") return;
                  const prevBlock = blocks[blockIndex - 1];
                  if (!prevBlock) return;
                  // Don't nest under self (shouldn't happen, but guard
                  // against parentBlockId === block._id loops).
                  if (prevBlock._id === block._id) return;
                  void moveBlock({
                    anonymousSessionId,
                    shareToken,
                    blockId: block._id,
                    parentBlockId: prevBlock._id,
                  });
                }}
                onShiftTabOutdent={() => {
                  // Outdent — move this block up to sibling of current
                  // parent. If block has no parent, no-op.
                  if (!canEdit || block.accessMode !== "edit") return;
                  if (!block.parentBlockId) return;
                  const currentParent = blocks.find(
                    (b) => b._id === block.parentBlockId,
                  );
                  // Passing `undefined` via the `parentBlockId` arg keeps
                  // the current value (moveBlock falls back to existing).
                  // To actually clear, we need to pass null — but the
                  // mutation doesn't support that. Workaround: set to
                  // grandparent explicitly (may be undefined → root).
                  void moveBlock({
                    anonymousSessionId,
                    shareToken,
                    blockId: block._id,
                    parentBlockId: currentParent?.parentBlockId ?? undefined,
                  });
                }}
                onAcceptDecoration={(runId, blockType) =>
                  void handleAcceptDecoration(runId, blockType)
                }
                onDismissDecoration={(runId, blockType) => handleDismissDecoration(runId, blockType)}
                onRefreshDecoration={(runId, blockType) =>
                  handleRefreshDecoration(runId, blockType)
                }
                onAskAboutDecoration={handleAskAboutDecoration}
                navigate={navigate}
              />
            ))}
          </div>

          {notebookLoadState.canLoadMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  blocksPagination.loadMore(Math.min(Math.max(notebookLoadState.remainingCount, 1), 150))
                }
                disabled={notebookLoadState.isLoadingMore}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
              >
                {notebookLoadState.isLoadingMore
                  ? "Loading more blocks..."
                  : `Load ${Math.min(notebookLoadState.remainingCount, 150)} more block${Math.min(notebookLoadState.remainingCount, 150) === 1 ? "" : "s"}`}
              </button>
            </div>
          ) : null}

          <BlockStatusBar
            presence={presence ?? []}
            selfUserId={resolvePresenceSelfUserId(viewerOwnerKey, anonymousSessionId)}
            participantDirectory={participantDirectory}
            latestHumanEdit={latestHumanEdit}
            lastSyncedAt={lastSyncedAt}
            offlineQueueLength={offlineQueueLength}
            isOffline={isOffline}
            rateLimited={rateLimited}
            readOnly={
              !canEdit ||
              !notebookLoadState.fullyLoaded ||
              (!!focusedBlock && (focusedBlock.accessMode ?? "edit") !== "edit")
            }
          />
        </div>

        {scratchpadRailSlot || runMapRailSlot || outlineItems.length >= 2 ? (
          <div className="mt-6 flex flex-col gap-3 lg:mt-0 lg:sticky lg:top-[80px] lg:self-start">
            {outlineItems.length >= 2 ? (
              <NotebookOutline items={outlineItems} />
            ) : null}
            <NotebookRightRail
              scratchpadSlot={scratchpadRailSlot}
              sessionArtifactsSlot={runMapRailSlot}
              defaultOpen={isNotebookRunActive}
            />
          </div>
        ) : null}
      </div>

      {/* Backlinks */}
      {/* Mention picker â€” modal overlay when active */}
      {mentionFor ? (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 px-4 pt-32"
          onClick={() => setMentionFor(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative"
          >
            <MentionPicker
              entitySlug={entitySlug}
              shareToken={shareToken}
              initialQuery={mentionFor.initial}
              onSelect={(match) => void handleMentionPick(match)}
              onClose={() => setMentionFor(null)}
            />
          </div>
        </div>
      ) : null}

      {backlinks && backlinks.length > 0 ? (
        <div className="mt-10 border-t border-gray-100 pt-6 dark:border-white/[0.06]">
          <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Linked from - {backlinks.length} place{backlinks.length === 1 ? "" : "s"}
          </h3>
          <div className="mt-3 space-y-2">
            {backlinks.map((ref) =>
              shareToken ? (
                <div
                  key={ref.relationId}
                  className="block w-full rounded-md border border-gray-100 px-3 py-2 text-left text-sm dark:border-white/[0.06]"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">{ref.fromEntityName}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                    {ref.snippet || <em className="opacity-60">(empty block)</em>}
                  </div>
                </div>
              ) : (
                <button
                  key={ref.relationId}
                  type="button"
                  onClick={() => navigate(buildEntityPathWithShare(ref.fromEntitySlug))}
                  className="block w-full rounded-md border border-gray-100 px-3 py-2 text-left text-sm transition-colors hover:border-gray-200 hover:bg-gray-50 dark:border-white/[0.06] dark:hover:bg-white/[0.02]"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">{ref.fromEntityName}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                    {ref.snippet || <em className="opacity-60">(empty block)</em>}
                  </div>
                </button>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BlockRow - per-block inline editor / renderer
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type BlockRowProps = {
  block: LiveBlock;
  prev?: LiveBlock;
  sourcesById: Map<string, { id: string; label: string; href?: string; confidence?: number; domain?: string }>;
  citationLabelsById: Map<string, string>;
  displayContent: BlockChip[];
  isEditable: boolean;
  accessMode: AccessMode;
  isFocused: boolean;
  /** Sticky mount flag — once a block has been focused or pre-warmed, keep
      its editor mounted so re-clicks don't re-fetch the sync snapshot. */
  hasBeenMounted?: boolean;
  /** Hover prewarm callback — schedules the editor to mount before the
      user actually clicks, for near-instant interaction. */
  onHoverPrewarm?: () => void;
  showSlash: boolean;
  diligenceDecorations?: readonly DiligenceDecorationData[];
  // Encoded sync id combining anonymousSessionId + blockId; drives
  // useTiptapSync inside NotebookBlockEditor. Must be stable across renders.
  syncDocumentId: string;
  onFocus: () => void;
  onBlur: () => void;
  onLocalContentChange: (content: BlockChip[]) => void;
  registerEditorHandle: (handle: NotebookBlockEditorHandle | null) => void;
  onEnter: () => void;
  onBackspaceAtStart: () => void;
  onOpenSlash: () => void;
  onCloseSlash: () => void;
  onSlashCommand: (cmd: SlashCommand) => void;
  onMarkdownShortcut: (kind: MarkdownBlockKind) => void;
  onTabIndent: () => void;
  onShiftTabOutdent: () => void;
  /** Nesting depth — 0 for top-level, 1+ for indented children. Used to
      apply visual indent (`ml-6` per depth). */
  depth?: number;
  onAcceptDecoration: (
    scratchpadRunId: string,
    blockType: DiligenceDecorationData["blockType"],
  ) => void;
  onDismissDecoration: (
    scratchpadRunId: string,
    blockType: DiligenceDecorationData["blockType"],
  ) => void;
  onRefreshDecoration: (
    scratchpadRunId: string,
    blockType: DiligenceDecorationData["blockType"],
  ) => void;
  /** Seam to side-panel drawer — opens with decoration as context. */
  onAskAboutDecoration?: (
    scratchpadRunId: string,
    blockType: DiligenceDecorationData["blockType"],
  ) => void;
  navigate: (path: string) => void;
};

const BlockRow = memo(function BlockRow({
  block,
  prev,
  sourcesById,
  citationLabelsById,
  displayContent,
  isEditable,
  accessMode,
  isFocused,
  hasBeenMounted,
  onHoverPrewarm,
  showSlash,
  diligenceDecorations,
  syncDocumentId,
  onFocus,
  onBlur,
  onLocalContentChange,
  registerEditorHandle,
  onEnter,
  onBackspaceAtStart,
  onOpenSlash,
  onCloseSlash,
  onSlashCommand,
  onMarkdownShortcut,
  onTabIndent,
  onShiftTabOutdent,
  depth = 0,
  onAcceptDecoration,
  onDismissDecoration,
  onRefreshDecoration,
  onAskAboutDecoration,
}: BlockRowProps) {
  const isEvidence = block.kind === "evidence";
  const supportsSyncEditing = isSyncEditableBlock(block);
  const shouldMountSyncEditor =
    supportsSyncEditing &&
    (isFocused || hasBeenMounted || (diligenceDecorations?.length ?? 0) > 0);
  const isAgentAuthored = block.authorKind === "agent";
  const isRecentAgentEdit =
    isAgentAuthored && Date.now() - block.updatedAt < 5 * 60 * 1000;
  const startsAuthorRun =
    !prev ||
    prev.authorKind !== block.authorKind ||
    prev.authorId !== block.authorId ||
    prev.sourceSessionId !== block.sourceSessionId;
  const followsParentHeading = Boolean(block.parentBlockId && prev?._id === block.parentBlockId);
  const opensSection =
    block.kind === "heading_2" ||
    block.kind === "heading_3" ||
    (!prev && block.kind === "text");
  const isEmptyTextBlock = isTriviallyEmptyNotebookBlock(block, displayContent);
  const blockSpacingClass =
    block.kind === "heading_2"
      ? "pt-5"
      : block.kind === "heading_3"
        ? "pt-3"
        : followsParentHeading
          ? "pt-px"
          : isEmptyTextBlock
            ? "pt-px"
            : "pt-0.5";

  // Render heading/text/bullet/todo/callout/evidence kinds.
  const classesForKind = (): string => {
    switch (block.kind) {
      case "heading_1":
        return "text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-100";
      case "heading_2":
        return "text-[1.38rem] font-semibold leading-tight text-gray-900 dark:text-gray-100";
      case "heading_3":
        return "text-[0.95rem] font-semibold tracking-tight text-gray-900 dark:text-gray-100";
      case "bullet":
        return "text-[15px] leading-[1.5] text-gray-700 dark:text-gray-200";
      case "todo":
        return "text-[15px] leading-[1.5] text-gray-700 dark:text-gray-200";
      case "callout":
        return "border-l-2 border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 py-1 pl-3 text-[15px] leading-[1.5] text-gray-700 dark:text-gray-200";
      case "quote":
        return "border-l-2 border-gray-300 pl-3 text-[15px] italic leading-[1.5] text-gray-600 dark:border-white/20 dark:text-gray-400";
      case "code":
        return "rounded bg-gray-100 px-3 py-2 font-mono text-[12.5px] text-gray-800 dark:bg-white/[0.04] dark:text-gray-200";
      case "generated_marker":
        return "text-[10px] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400";
      default:
        return "text-[15px] leading-[1.5] text-gray-700 dark:text-gray-200";
    }
  };

  if (isEvidence) {
    const href = displayContent.find((c) => c.type === "link")?.url ?? displayContent[0]?.url;
    const label =
      displayContent.find((c) => c.type === "link")?.value ?? chipsToPlainText(displayContent);
    return (
      <div className="group ml-6 py-1">
        <a
          href={href ?? "#"}
          target={href ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white/40 px-2.5 py-1 text-[12.5px] text-gray-600 transition-colors hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-400"
        >
          <Link2 className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          <span className="truncate">{label}</span>
          {href ? <ExternalLink className="h-3 w-3 text-gray-400" /> : null}
        </a>
      </div>
    );
  }

  return (
    <div
      data-testid="notebook-block"
      data-block-id={String(block._id)}
      data-block-kind={block.kind}
      data-block-focused={String(isFocused)}
      data-author-kind={block.authorKind}
      onMouseEnter={onHoverPrewarm}
      onClick={() => {
        if (supportsSyncEditing) {
          onFocus();
        }
      }}
      data-depth={depth}
      className={`group relative -mx-2 px-2 ${blockSpacingClass} transition-[background,padding] duration-150 ${
        isRecentAgentEdit ? "notebook-block-wet-ink" : ""
      } ${
        isFocused
          ? "rounded-md bg-white/[0.045] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
          : "hover:bg-white/[0.02]"
      }`}
      style={depth > 0 ? { marginLeft: `${depth * 1.5}rem` } : undefined}
    >
      <div className="relative min-w-0">
        {isAgentAuthored && startsAuthorRun ? (
          <div className={`${opensSection ? "mb-3" : "mb-2"} flex flex-wrap items-center gap-2`}>
            {/* Per-agent author tag — colored pill carrying WHICH agent
                wrote this block, not a generic "AI generated" stamp.
                Pulled from the v3/v4 prototypes: attribution is what
                makes the notebook feel co-authored rather than auto-
                generated. `authorId` parsed into a display name:
                  - "agent:<name>"  → <name>
                  - "slash:<cmd>"   → "/<cmd>"
                  - anything else   → "Agent" (fallback) */}
            <AgentAuthorTag
              agentId={block.authorId ?? "agent"}
              agentName={
                typeof block.authorId === "string"
                  ? block.authorId.startsWith("agent:")
                    ? block.authorId.slice(6) || "Agent"
                    : block.authorId.startsWith("slash:")
                      ? `/${block.authorId.slice(6)}`
                      : "Agent"
                  : "Agent"
              }
            />
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {shouldMountSyncEditor ? (
              <NotebookBlockEditor
                ref={registerEditorHandle}
                syncDocumentId={syncDocumentId}
                chips={displayContent}
                diligenceDecorations={diligenceDecorations}
                className={classesForKind()}
                isEditable={isEditable}
                ariaLabel={`Block - ${block.kind}`}
                autoFocus={isFocused}
                onFocus={onFocus}
                onBlur={onBlur}
                onLocalContentChange={onLocalContentChange}
                onEnter={onEnter}
                onBackspaceAtStart={onBackspaceAtStart}
                onOpenSlash={onOpenSlash}
                onMarkdownShortcut={onMarkdownShortcut}
                onTabIndent={onTabIndent}
                onShiftTabOutdent={onShiftTabOutdent}
                onCloseSlash={onCloseSlash}
                onAcceptDecoration={onAcceptDecoration}
                onDismissDecoration={onDismissDecoration}
                onRefreshDecoration={onRefreshDecoration}
                onAskAboutDecoration={onAskAboutDecoration}
              />
            ) : (
              <div
                className={`outline-none focus-visible:outline-none ${classesForKind()} ${
                  !isEditable ? "cursor-default opacity-80" : supportsSyncEditing ? "cursor-text" : ""
                }`}
                onFocus={shouldMountSyncEditor ? undefined : onFocus}
                onBlur={shouldMountSyncEditor ? undefined : onBlur}
                role="textbox"
                aria-readonly={!isEditable}
                aria-label={`Block - ${block.kind}`}
                tabIndex={supportsSyncEditing ? 0 : undefined}
              >
                <BlockChipRenderer chips={displayContent} />
              </div>
            )}
            {/* Render inline citations (sourceRefIds) after the editable surface */}
            {block.sourceRefIds && block.sourceRefIds.length > 0 ? (
              <span className="mt-1.5 inline-flex flex-wrap items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                {block.sourceRefIds.map((refId, idx) => {
                  const source = sourcesById.get(refId);
                  const tooltip = source
                    ? `${source.domain ?? source.label}${
                        source.confidence != null ? ` - confidence ${source.confidence.toFixed(2)}` : ""
                      }`
                    : refId;
                  const citationLabel = citationLabelsById.get(refId) ?? `s${idx + 1}`;
                  return (
                    <a
                      key={`${block._id}-cite-${idx}`}
                      href={source?.href ?? "#"}
                      target={source?.href ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      title={tooltip}
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/10"
                    >
                      [{citationLabel}]
                    </a>
                  );
                })}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-start gap-2 pt-1">
            {accessMode !== "edit" ? (
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-amber-600 bg-amber-500/10"
                title={accessMode === "read" ? "Read-only block" : "Append-only block"}
              >
                <Lock className="h-2.5 w-2.5" />
                {accessMode}
              </span>
            ) : null}
            <BlockProvenance block={block} />
          </div>
        </div>

        {showSlash ? (
          <SlashPalette
            onCommand={onSlashCommand}
            onClose={onCloseSlash}
          />
        ) : null}
      </div>
    </div>
  );
});

BlockRow.displayName = "BlockRow";

export default EntityNotebookLive;
