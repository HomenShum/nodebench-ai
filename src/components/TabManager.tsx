import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { DocumentGrid, type GridTab } from "./DocumentGrid";
import { DocumentView } from "@/components/views/DocumentView";
import { CalendarHomeHub } from "./CalendarHomeHub";
import { X } from "lucide-react";

interface TabManagerProps {
  selectedDocumentId: Id<"documents"> | null;
  onDocumentSelect: (documentId: Id<"documents"> | null) => void;
  isGridMode?: boolean;
  setIsGridMode?: (isGridMode: boolean) => void;
  onOpenTabsChange?: (openTabIds: Id<"documents">[]) => void;
  currentView?: 'documents' | 'calendar' | 'timeline' | 'public';
}

export function TabManager({
  selectedDocumentId,
  onDocumentSelect,
  isGridMode: externalIsGridMode,
  setIsGridMode: externalSetIsGridMode,
  onOpenTabsChange,
  currentView,
}: TabManagerProps) {
  const [openTabs, setOpenTabs] = useState<GridTab[]>([]);
  const [internalIsGridMode, setInternalIsGridMode] = useState(false);
  const [fullscreenDocumentId, setFullscreenDocumentId] = useState<Id<"documents"> | null>(null);

  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabsWrapRef = useRef<HTMLDivElement | null>(null);

  const isGridMode = externalIsGridMode ?? internalIsGridMode;
  const setIsGridMode = externalSetIsGridMode ?? setInternalIsGridMode;

  // Size presets for the single-row scroller
  const iconOnly = containerWidth < 520;
  const compact = !iconOnly && containerWidth < 760;

  const documents = useQuery(api.documents.getSidebar);

  const addDocumentTab = useCallback(
    (documentId: Id<"documents">) => {
      // Use functional update to avoid races/duplicates when multiple
      // events try to add the same tab in quick succession.
      setOpenTabs((prev) => {
        if (prev.some((t) => t.id === documentId)) return prev;

        const doc = documents?.find((d: any) => d._id === documentId);
        const index = prev.length;
        // If this is the second tab (index 1), ensure grid mode turns on.
        if (index >= 1) setIsGridMode(true);

        const newTab: GridTab = {
          kind: "document",
          id: documentId,
          title: doc?.title ?? "Document",
          color: `color-${index % 12}`,
          position: index,
        };
        return [...prev, newTab];
      });
    },
    [documents, setIsGridMode]
  );

  // Ensure the selected doc becomes a tab in grid mode
  useEffect(() => {
    if (isGridMode && selectedDocumentId) {
      if (!openTabs.find((t) => t.id === selectedDocumentId)) {
        addDocumentTab(selectedDocumentId);
      }
    }
  }, [isGridMode, selectedDocumentId, openTabs, addDocumentTab]);

  // Sync placeholder tab titles with real titles when sidebar data arrives
  useEffect(() => {
    if (!documents) return;
    setOpenTabs((prev) => {
      let changed = false;
      const updated = prev.map((t) => {
        if (t.kind !== "document") return t;
        const doc = documents.find((d: any) => d._id === t.id);
        if (doc && t.title !== doc.title) {
          changed = true;
          return { ...t, title: doc.title };
        }
        return t;
      });
      return changed ? updated : prev;
    });
  }, [documents]);

  // Emit open tabs to parent (if requested)
  useEffect(() => {
    if (onOpenTabsChange) {
      const docs = openTabs.filter((t): t is Extract<GridTab, { kind: "document" }> => t.kind === "document");
      onOpenTabsChange(docs.map((t) => t.id));
    }
  }, [openTabs, onOpenTabsChange]);

  // Listen for a request to pin a document as the first tab in grid mode
  useEffect(() => {
    const handler = (evt: Event) => {
      try {
        const e = evt as CustomEvent<{ docId?: string }>;
        const rawId = e.detail?.docId;
        if (!rawId) return;
        const pinId = rawId as Id<"documents">;

        // Ensure grid mode is enabled
        setIsGridMode(true);

        setOpenTabs((prev) => {
          // Build a map of existing tabs by id for quick lookup
          const existingById = new Map(prev.map((t) => [t.id, t] as const));

          // Create a base list of ids in desired order: pinned first, then others excluding pinned
          const remainingIds = prev.filter((t) => t.id !== pinId).map((t) => t.id);
          const orderedIds: Array<GridTab["id"]> = [pinId, ...remainingIds];

          // Ensure the pinned doc exists as a tab; if not, we'll create it below
          const newTabs: GridTab[] = [];
          orderedIds.forEach((id, index) => {
            const existing = existingById.get(id);
            if (existing) {
              newTabs.push({
                ...existing,
                position: index,
                color: `color-${index % 12}`,
              });
            } else if (id === pinId) {
              const doc = documents?.find((d: any) => d._id === id);
              newTabs.push({
                kind: "document",
                id: pinId,
                title: doc?.title ?? "Document",
                color: `color-${index % 12}`,
                position: index,
              });
            }
          });

          return newTabs;
        });
      } catch (err) {
        console.warn("Failed to handle grid:pinFirst event", err);
      }
    };
    window.addEventListener("grid:pinFirst", handler as EventListener);
    return () => {
      window.removeEventListener("grid:pinFirst", handler as EventListener);
    };
  }, [documents, setIsGridMode]);

  // Track container width for responsive pill sizing with improved measurement
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width || containerRef.current.offsetWidth;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    };

    // Initial measurement
    handleResize();

    // Set up ResizeObserver for more accurate measurements
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    const currentRef = containerRef.current;
    if (currentRef) {
      resizeObserver.observe(currentRef);
    }

    // Fallback with window resize
    window.addEventListener("resize", handleResize);
    
    return () => {
      if (currentRef) {
        resizeObserver.unobserve(currentRef);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Scroll the selected pill into view when selection changes
  useEffect(() => {
    if (!tabsWrapRef.current || !selectedDocumentId) return;
    const el = tabsWrapRef.current.querySelector<HTMLElement>(
      `[data-tab-id="${String(selectedDocumentId)}"]`
    );
    el?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [selectedDocumentId, openTabs.length]);

  const removeDocumentTab = useCallback(
    (documentId: Id<"documents">) => {
      setOpenTabs((prev) => {
        const newTabs = prev.filter((tab) => tab.id !== documentId);
        const reordered = newTabs.map((tab, i) => ({ ...tab, position: i }));

        if (reordered.length <= 1) {
          setIsGridMode(false);
          if (reordered.length === 1 && reordered[0].kind === "document") {
            onDocumentSelect(reordered[0].id);
          } else {
            onDocumentSelect(null);
          }
        }
        return reordered;
      });
    },
    [onDocumentSelect, setIsGridMode]
  );

  const toggleFullscreen = useCallback((tabId: GridTab["id"]) => {
    // Only documents are currently supported for fullscreen state in TabManager
    const tab = openTabs.find((t) => t.id === tabId);
    if (!tab || tab.kind !== "document") return;
    setFullscreenDocumentId((prev) => (prev === tab.id ? null : tab.id));
  }, [openTabs]);

  const renderMainContent = () => {
    if (isGridMode) {
      return (
        <div className="h-full w-full">
          <DocumentGrid
            openTabs={openTabs}
            onCloseTab={(tabId) => {
              // Only handle closing document tabs in TabManager for now
              const tab = openTabs.find(t => t.id === tabId);
              if (tab && tab.kind === "document") removeDocumentTab(tabId as Id<"documents">);
            }}
            onReorderTabs={setOpenTabs}
            selectedTabId={selectedDocumentId}
            onTabSelect={(tabId) => {
              const tab = openTabs.find(t => t.id === tabId);
              if (tab && tab.kind === "document") onDocumentSelect(tabId as Id<"documents">);
            }}
            fullscreenTabId={fullscreenDocumentId}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>
      );
    }
    if (selectedDocumentId) {
      return (
        <div className="h-full w-full">
          <DocumentView documentId={selectedDocumentId} />
        </div>
      );
    }
    return (
      <div className="h-full w-full">
        {currentView === 'timeline' ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="text-[var(--text-secondary)] text-sm">Timeline view is not available.</div>
          </div>
        ) : (
          <CalendarHomeHub
            onDocumentSelect={(docId) => onDocumentSelect(docId)}
            onGridModeToggle={toggleGridMode}
          />
        )}
      </div>
    );
  };

  const colorClasses = [
    "bg-[var(--accent-primary)]/10 text-[var(--text-primary)] border-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/15",
    "bg-[var(--accent-secondary)]/10 text-[var(--text-primary)] border-[var(--accent-secondary)]/20 hover:bg-[var(--accent-secondary)]/15",
    "bg-[var(--accent-primary)]/8 text-[var(--text-primary)] border-[var(--accent-primary)]/15 hover:bg-[var(--accent-primary)]/12",
    "bg-[var(--accent-secondary)]/8 text-[var(--text-primary)] border-[var(--accent-secondary)]/15 hover:bg-[var(--accent-secondary)]/12",
    "bg-[var(--accent-primary)]/12 text-[var(--text-primary)] border-[var(--accent-primary)]/25 hover:bg-[var(--accent-primary)]/18",
    "bg-[var(--accent-secondary)]/12 text-[var(--text-primary)] border-[var(--accent-secondary)]/25 hover:bg-[var(--accent-secondary)]/18",
    "bg-[var(--accent-primary)]/6 text-[var(--text-primary)] border-[var(--accent-primary)]/12 hover:bg-[var(--accent-primary)]/10",
    "bg-[var(--accent-secondary)]/6 text-[var(--text-primary)] border-[var(--accent-secondary)]/12 hover:bg-[var(--accent-secondary)]/10",
    "bg-[var(--accent-primary)]/14 text-[var(--text-primary)] border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/20",
    "bg-[var(--accent-secondary)]/14 text-[var(--text-primary)] border-[var(--accent-secondary)]/30 hover:bg-[var(--accent-secondary)]/20",
    "bg-[var(--accent-primary)]/9 text-[var(--text-primary)] border-[var(--accent-primary)]/18 hover:bg-[var(--accent-primary)]/13",
    "bg-[var(--accent-secondary)]/9 text-[var(--text-primary)] border-[var(--accent-secondary)]/18 hover:bg-[var(--accent-secondary)]/13",
  ];
  const dotColors = [
    "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-orange-500",
    "bg-pink-500", "bg-cyan-500", "bg-red-500", "bg-yellow-500",
    "bg-indigo-500", "bg-rose-500", "bg-teal-500", "bg-lime-500",
  ];

  return (
    <div className="h-full w-full flex flex-col">
      {isGridMode && (
        <div ref={containerRef} className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] px-2 sm:px-4 py-2 flex-shrink-0">
          <div className="flex items-start gap-2">
            {/* Tabs – single row scroller */}
            <div className="flex-1 min-w-0 relative">
              <div
                ref={tabsWrapRef}
                className="flex flex-nowrap items-center gap-x-1 sm:gap-x-2 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                style={{
                  WebkitOverflowScrolling: "touch",
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
                  maskImage:
                    "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)",
                }}
              >
                {openTabs.filter((t): t is Extract<GridTab, { kind: "document" }> => t.kind === "document").map((tab, index) => {
                  const colorIndex = index % 12;
                  const basePad = iconOnly ? "px-1.5 py-1" : compact ? "px-2 py-1.5" : "px-3 py-2";
                  const baseGap = iconOnly ? "gap-1" : compact ? "gap-1.5" : "gap-2";
                  const baseText = iconOnly ? "text-[10px]" : compact ? "text-xs" : "text-sm";
                  const baseMinW = iconOnly ? "min-w-[30px]" : compact ? "min-w-[44px]" : "min-w-[64px]";
                  const selRing = selectedDocumentId === tab.id ? "ring-2 ring-[var(--accent-primary)]/40" : "";

                  return (
                    <button
                      key={tab.id}
                      data-tab-pill="true"
                      data-tab-id={String(tab.id)}
                      className={[
                        "flex items-center rounded-lg border font-medium cursor-pointer transition-all duration-200 shrink-0 whitespace-nowrap",
                        colorClasses[colorIndex],
                        basePad, baseGap, baseText, baseMinW, selRing,
                        "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50",
                      ].join(" ")}
                      onClick={() => onDocumentSelect(tab.id)}
                      title={tab.title}
                    >
                      <div className={`rounded-full ${dotColors[colorIndex]} opacity-80 ${iconOnly ? "w-1.5 h-1.5" : "w-2 h-2"}`} />
                      {!iconOnly && <span className={`truncate ${compact ? "max-w-14" : "max-w-24"}`}>{tab.title}</span>}
                      <div className="flex items-center gap-0.5">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFullscreen(tab.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              (e as any).stopPropagation?.();
                              toggleFullscreen(tab.id);
                            }
                          }}
                          className="p-0.5 rounded-full hover:bg-current/20 transition-colors"
                          title={fullscreenDocumentId === tab.id ? "Exit fullscreen" : "Expand fullscreen"}
                          aria-label={fullscreenDocumentId === tab.id ? "Exit fullscreen" : "Expand fullscreen"}
                        >
                          <svg
                            className={iconOnly ? "h-2.5 w-2.5" : compact ? "h-3 w-3" : "h-3.5 w-3.5"}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            {fullscreenDocumentId === tab.id ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            )}
                          </svg>
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDocumentTab(tab.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              (e as any).stopPropagation?.();
                              removeDocumentTab(tab.id);
                            }
                          }}
                          className="p-0.5 rounded-full hover:bg-current/20 transition-colors"
                          title="Close tab"
                          aria-label="Close tab"
                        >
                          <X className={iconOnly ? "h-2.5 w-2.5" : compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-hidden min-h-0">
        {renderMainContent()}
      </div>
    </div>
  );
}