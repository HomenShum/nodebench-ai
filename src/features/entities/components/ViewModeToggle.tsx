/**
 * ViewModeToggle — small segmented pill that flips the entity page
 * between edit and read mode.
 *
 * Matches the Notion edit/publish duality: same page, same data,
 * stripped chrome. See `useViewMode` for URL-param semantics.
 *
 * Design rules:
 *   - Always-visible in the top action row (when editable)
 *   - Keyboard: `⌘E` / `Ctrl+E` toggles between edit ↔ read
 *   - Quiet visual weight — this is a mode switcher, not a CTA
 *   - Hidden entirely on public share routes (forced-read view)
 */

import { memo, useEffect } from "react";
import { Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/features/entities/lib/useViewMode";

export interface ViewModeToggleProps {
  /** Hide the toggle (e.g. public share view, where mode is forced). */
  hidden?: boolean;
  className?: string;
}

export const ViewModeToggle = memo(function ViewModeToggle({
  hidden,
  className,
}: ViewModeToggleProps) {
  const { viewMode, setViewMode } = useViewMode();

  // Keyboard shortcut: ⌘E / Ctrl+E toggles modes. Guarded against IME
  // composition and against firing when the user is typing in an
  // editable surface (matches the askShortcut guard pattern).
  useEffect(() => {
    if (hidden) return;
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing || e.repeat) return;
      const isModE = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e";
      if (!isModE) return;
      if (e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      setViewMode(viewMode === "read" ? "edit" : "read");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hidden, viewMode, setViewMode]);

  if (hidden) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02] p-0.5 text-[11px]",
        className,
      )}
      role="group"
      aria-label="View mode"
    >
      <button
        type="button"
        onClick={() => setViewMode("edit")}
        aria-pressed={viewMode === "edit"}
        aria-label="Edit mode"
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition",
          viewMode === "edit"
            ? "bg-white/[0.08] text-content"
            : "text-content-muted hover:text-content",
        )}
      >
        <Pencil className="h-3 w-3" />
        <span>Edit</span>
      </button>
      <button
        type="button"
        onClick={() => setViewMode("read")}
        aria-pressed={viewMode === "read"}
        aria-label="Read mode"
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition",
          viewMode === "read"
            ? "bg-white/[0.08] text-content"
            : "text-content-muted hover:text-content",
        )}
      >
        <Eye className="h-3 w-3" />
        <span>Read</span>
      </button>
    </div>
  );
});

ViewModeToggle.displayName = "ViewModeToggle";
