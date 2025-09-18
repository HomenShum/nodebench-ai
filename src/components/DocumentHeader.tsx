import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { PresenceIndicator } from "./PresenceIndicator";
import {
  MoreHorizontal,
  Star,
  Share,
  Archive,
  Trash2,
  Globe,
  Lock,
  Image as ImageIcon,
  Smile,
  Sparkles,
  Loader2
} from "lucide-react";

interface DocumentHeaderProps {
  document: Doc<"documents">;
}

// Component to display who last edited the document
function LastEditorDisplay({ userId }: { userId: string }) {
  const user = useQuery(api.documents.getUserById, { userId: userId as any });

  if (!user) {
    return (
      <span className="text-[10px] text-[var(--text-muted)] opacity-60 italic">
        by {userId.slice(-8)} (loading...)
      </span>
    );
  }

  return (
    <span className="text-[10px] text-[var(--text-muted)] opacity-60 italic" title={`User ID: ${userId}`}>
      by {user.name || 'Unknown'} ({userId.slice(-8)})
    </span>
  );
}

export function DocumentHeader({ document }: DocumentHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [title, setTitle] = useState(document.title);

  const updateDocument = useMutation(api.documents.update);
  const archiveDocument = useMutation(api.documents.archive);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const userId = useQuery(api.presence.getUserId);
  const isOwner = !!userId && userId === (document as any).createdBy;

  // Tags: list + AI generation
  // Cast `api` to any to avoid type errors until Convex codegen includes the new `tags` module
  const tags = useQuery((api as any).tags.listForDocument, { documentId: document._id });
  const generateTags = useAction((api as any).tags_actions.generateForDocument);
  const [isGenerating, setIsGenerating] = useState(false);
  const canGenerateTags = isOwner;

  const addTagsToDocument = useMutation((api as any).tags.addTagsToDocument);
  const removeTagFromDocument = useMutation((api as any).tags.removeTagFromDocument);
  const updateTagKind = useMutation((api as any).tags.updateTagKind);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [adding, setAdding] = useState(false);

  const KINDS: Array<string> = ["keyword", "entity", "topic", "community", "relationship"];
  const kindPillClass = (k?: string) => {
    switch ((k || "").toLowerCase()) {
      case "keyword": return "bg-amber-50 text-amber-800 border-amber-200";
      case "entity": return "bg-violet-50 text-violet-800 border-violet-200";
      case "topic": return "bg-sky-50 text-sky-800 border-sky-200";
      case "community": return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "relationship": return "bg-rose-50 text-rose-800 border-rose-200";
      default: return "bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--border-color)]";
    }
  };
  const kindStripClass = (k?: string) => {
    switch ((k || "").toLowerCase()) {
      case "keyword": return "bg-amber-400";
      case "entity": return "bg-violet-400";
      case "topic": return "bg-sky-400";
      case "community": return "bg-emerald-400";
      case "relationship": return "bg-rose-400";
      default: return "bg-[var(--border-color)]";
    }
  };
  const handleCycleKind = async (t: { _id: string; kind?: string }) => {
    const idx = KINDS.indexOf((t.kind || "").toLowerCase());
    const next = KINDS[(idx + 1 + KINDS.length) % KINDS.length];
    try {
      await updateTagKind({ documentId: document._id, tagId: t._id as any, kind: next });
    } catch (err) {
      console.warn('[DocumentHeader] update kind failed', err);
    }
  };


  const handleTitleSubmit = async () => {
    if (title.trim() !== document.title) {
      await updateDocument({
        id: document._id,
        title: title.trim() || "Untitled",
      });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleTitleSubmit();
    }
    if (e.key === "Escape") {
      setTitle(document.title);
      setIsEditing(false);
    }
  };

  const handleTogglePublic = async () => {
    await updateDocument({
      id: document._id,
      isPublic: !document.isPublic,
    });
  };

  const handleAddIcon = async () => {
    const emoji = prompt("Enter an emoji:");
    if (emoji) {
      await updateDocument({
        id: document._id,
        icon: emoji,
      });
    }
  };

  const handleAddCover = async () => {
    const input = window.document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          const { storageId } = await result.json();

          await updateDocument({
            id: document._id,
            coverImage: storageId,
          });
        } catch (error) {
          console.error("Failed to upload cover image:", error);
        }
      }
    };
    input.click();
  };

  const handleArchive = async () => {
    if (confirm("Are you sure you want to archive this document?")) {
      await archiveDocument({ id: document._id });
    }
  };

  const handleToggleFavorite = async () => {
    await updateDocument({
      id: document._id,
      isFavorite: !document.isFavorite,
    });
  };

  const handleShare = () => {
    if (document.isPublic) {
      const url = `${window.location.origin}/documents/${document._id}`;
      navigator.clipboard.writeText(url).then(() => {
        alert("Public link copied to clipboard!");
      }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert("Failed to copy link.");
      });
    } else {
      alert("This document is private. Make it public to share.");
    }
  };

  const handleGenerateTags = useCallback(async () => {
    if (!canGenerateTags) {
      alert("You don't have permission to generate tags for this document.");
      return;
    }
    try {
      setIsGenerating(true);
      await generateTags({ documentId: document._id });
      // tags query will auto-refresh via Convex reactivity
    } catch (e) {
      console.error("Failed to generate tags:", e);
      alert("Failed to generate tags. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerateTags, document._id, generateTags]);

  // Listen for auto-generate requests (from FileViewer after analysis)
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const id = e?.detail?.documentId;
        if (String(id) === String(document._id)) {
          void handleGenerateTags();
        }
      } catch { /* noop */ }
    };
    window.addEventListener('nodebench:generateTags', handler as any);
    return () => window.removeEventListener('nodebench:generateTags', handler as any);
  }, [document._id, handleGenerateTags]);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to permanently delete this document? This action cannot be undone.")) {
      alert("Delete functionality not yet implemented.");
    }
  };

  return (
    <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          {/* Public/Private Status */}
          <div className="flex items-center gap-2">
            {document.isPublic ? (
              <>
                <Globe className="h-4 w-4 text-[var(--accent-green)]" />
                <span className="text-sm text-[var(--text-secondary)]">Public</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                    (document as any).allowPublicEdit
                      ? 'border-[var(--accent-green)] text-[var(--accent-green)]'
                      : 'border-[var(--border-color)] text-[var(--text-muted)]'
                  }`}
                  title={(document as any).allowPublicEdit ? 'Anyone with the link can edit' : 'Public view-only'}
                >
                  {(document as any).allowPublicEdit ? 'Editable' : 'View-only'}
                </span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">Private</span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Inspect Tab toggle (header tab) */}
            <button
              onClick={() => {
                try {
                  window.dispatchEvent(new CustomEvent('nodebench:toggleInspector'));
                } catch {}
              }}
              className="px-2 py-1 rounded-md text-xs border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              title="Toggle Inspect view"
            >
              Inspect
            </button>

            {isOwner && (
              <button
                onClick={() => void handleToggleFavorite()}
                className="p-2 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                title={document.isFavorite ? "Unfavorite" : "Favorite"}
              >
                <Star className={`h-4 w-4 ${document.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-[var(--text-muted)]'}`} />
              </button>
            )}

            <button
              onClick={handleShare}
              className="p-2 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
              title="Share"
            >
              <Share className="h-4 w-4 text-[var(--text-secondary)]" />
            </button>

            {/* More Options Menu (owner only) */}
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                  title="More options"
                >
                  <MoreHorizontal className="h-4 w-4 text-[var(--text-secondary)]" />
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-primary)] rounded-md shadow-lg border border-[var(--border-color)] z-10">
                    <div className="py-1">
                      {!document.isPublic ? (
                        <>
                          <button onClick={async () => { await updateDocument({ id: document._id, isPublic: true, allowPublicEdit: false }); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Make Public (view-only)
                          </button>
                          <button onClick={async () => { await updateDocument({ id: document._id, isPublic: true, allowPublicEdit: true }); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Make Public (editable)
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={async () => { await updateDocument({ id: document._id, isPublic: false, allowPublicEdit: false }); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Make Private
                          </button>
                          <button onClick={async () => { await updateDocument({ id: document._id, allowPublicEdit: !(document as any).allowPublicEdit }); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            {(document as any).allowPublicEdit ? "Disable public editing" : "Enable public editing"}
                          </button>
                        </>
                      )}
                      <button onClick={() => { void handleAddIcon(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2">
                        <Smile className="h-4 w-4" />
                        Change Icon
                      </button>
                      <button onClick={() => { void handleAddCover(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Change Cover
                      </button>
                      <div className="border-t border-[var(--border-color)] my-1"></div>
                      <button onClick={() => { void handleArchive(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] flex items-center gap-2">
                        <Archive className="h-4 w-4" />
                        Archive
                      </button>
                      <button onClick={() => { void handleDelete(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title and Icon */}
        <div className="flex items-center gap-3">
          {document.icon && (
            <span className="text-4xl">{document.icon}</span>
          )}

          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => void handleTitleSubmit()}
              onKeyDown={handleKeyDown}
              className="text-3xl font-bold text-[var(--text-primary)] bg-transparent border-none outline-none flex-1"
              autoFocus
            />
          ) : (
            <h1
              onClick={isOwner ? () => setIsEditing(true) : undefined}
              className={`text-3xl font-bold text-[var(--text-primary)] ${isOwner ? 'cursor-pointer hover:bg-[var(--bg-hover)]' : ''} px-2 py-1 rounded flex-1`}
            >
              {document.title}
            </h1>
          )}
        </div>

        {/* Tags Row */}
        <div className="mt-2 px-2 flex items-center justify-between">
          <div className="flex flex-wrap gap-1 items-center min-h-[24px]">
            {tags === undefined ? (
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tags...
              </span>
            ) : (
              <>
                {tags && tags.length > 0 ? (
                  tags.map((t: { _id: string; name: string; kind?: string; importance?: number }) => (
                    <span
                      key={t._id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${kindPillClass(t.kind)}`}
                      title={t.kind ? `${t.name} · ${t.kind}${typeof t.importance === 'number' ? ` · ${t.importance.toFixed(2)}` : ''}` : (typeof t.importance === 'number' ? `${t.name} · ${t.importance.toFixed(2)}` : t.name)}
                    >
                      {/* Left kind strip (click to cycle kind) */}
                      <button
                        onClick={() => void handleCycleKind(t)}
                        className={`${kindStripClass(t.kind)} w-1.5 h-3 rounded-sm`}
                        title={`Kind: ${t.kind ?? 'unknown'} (click to change)`}
                        aria-label={`Change kind for ${t.name}`}
                      />

                      {/* Name with inline rename */}
                      {editingTagId === (t._id as any) ? (
                        <input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              const name = editingValue.trim();
                              setEditingTagId(null);
                              if (!name || name === t.name) return;
                              void addTagsToDocument({ documentId: document._id, tags: [{ name }] })
                                .then(() => removeTagFromDocument({ documentId: document._id, tagId: t._id as any }))
                                .catch((err) => console.warn('[DocumentHeader] rename failed', err));
                            }
                          }}
                          onBlur={() => {
                            const name = editingValue.trim();
                            setEditingTagId(null);
                            if (!name || name === t.name) return;
                            void addTagsToDocument({ documentId: document._id, tags: [{ name }] })
                              .then(() => removeTagFromDocument({ documentId: document._id, tagId: t._id as any }))
                              .catch((err) => console.warn('[DocumentHeader] rename failed', err));
                          }}
                          className="bg-transparent outline-none min-w-[60px] max-w-[160px] text-[var(--text-primary)]"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingTagId(t._id as any); setEditingValue(t.name); }}
                          className="truncate max-w-[140px] text-left"
                          title={`Rename ${t.name}`}
                        >
                          {t.name}
                        </button>
                      )}

                      {/* Remove */}
                      <button
                        onClick={() => void removeTagFromDocument({ documentId: document._id, tagId: t._id as any })}
                        className="ml-1 px-1 rounded hover:bg-red-100 text-[10px] text-red-600"
                        title={`Remove ${t.name}`}
                        aria-label={`Remove ${t.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">No tags yet</span>
                )}

                {/* Ghost add pill */}
                {adding ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed text-xs text-[var(--text-secondary)]">
                    <input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      placeholder="Add tag…"
                      className="bg-transparent outline-none h-5 min-w-[80px]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const name = editingValue.trim();
                          setAdding(false);
                          setEditingValue("");
                          if (!name) return;
                          void addTagsToDocument({ documentId: document._id, tags: [{ name }] })
                            .catch((err) => console.warn('[DocumentHeader] add tag failed', err));
                        }
                      }}
                      onBlur={() => {
                        const name = editingValue.trim();
                        setAdding(false);
                        setEditingValue("");
                        if (!name) return;
                        void addTagsToDocument({ documentId: document._id, tags: [{ name }] })
                          .catch((err) => console.warn('[DocumentHeader] add tag failed', err));
                      }}
                    />
                  </span>
                ) : (
                  <button
                    onClick={() => { setAdding(true); setEditingValue(""); }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    title="Add tag"
                  >
                    + Add tag
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center">
            <button
              onClick={() => void handleGenerateTags()}
              disabled={isGenerating || !canGenerateTags}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-colors ${
                isGenerating || !canGenerateTags
                  ? 'bg-[var(--bg-hover)] text-[var(--text-muted)] border-[var(--border-color)] cursor-not-allowed'
                  : 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/20'
              }`}
              title={canGenerateTags ? 'Generate tags with AI' : 'Only the document owner can generate tags'}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{tags && tags.length > 0 ? 'Regenerate Tags' : 'Generate Tags'}</span>
            </button>
          </div>
        </div>

        {/* Presence and Date Information Row */}
        <div className="flex items-center justify-between mt-2 px-2">
          {/* Editing Presence (Left side) */}
          <div className="flex items-center gap-2">
            {userId && (
              <div className="flex items-center gap-3">
                <PresenceIndicator documentId={document._id} userId={userId} />
                {!document.isPublic && isOwner && (
                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] opacity-75">
                    <span>•</span>
                    <span className="italic">
                      You're editing alone. Make this document{" "}
                      <button
                        onClick={() => void handleTogglePublic()}
                        className="text-[var(--accent-primary)] hover:underline font-medium"
                      >
                        public
                      </button>
                      {" "}for collaboration
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date Information (Right side) */}
          <div className="flex flex-col items-end gap-0.5">
            {(() => {
              const lastModified = (document as any).lastModified || document._creationTime;
              const lastEditedBy = (document as any).lastEditedBy;
              const isRecent = Date.now() - lastModified < 24 * 60 * 60 * 1000; // Within 24 hours
              const showBothDates = lastModified !== document._creationTime;

              return showBothDates ? (
                <>
                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <span>updated</span>
                    <span>{new Date(lastModified).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>{new Date(lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {lastEditedBy && <LastEditorDisplay userId={lastEditedBy} />}
                    {isRecent && <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full"></span>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] opacity-75">
                    <span>created</span>
                    <span>{new Date(document._creationTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <span>created</span>
                  <span>{new Date(document._creationTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>{new Date(document._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isRecent && <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full"></span>}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
