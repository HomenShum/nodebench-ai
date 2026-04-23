import { memo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Star, Pencil, Folder, Info, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMotionConfig } from "@/lib/motion";

export interface ThreadAction {
  id: string;
  label: string;
  icon: typeof Star;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  subtitle?: string;
  active?: boolean;
}

export interface ThreadActionsSheetProps {
  open: boolean;
  onClose: () => void;
  onFavorite: () => void;
  onRename: () => void;
  onViewFiles: () => void;
  onRunDetails: () => void;
  onDelete: () => void;
  isFavorite?: boolean;
  hasActiveSession?: boolean;
}

const haptic = (pattern: number | number[] = 10) => {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
};

export const ThreadActionsSheet = memo(function ThreadActionsSheet({
  open,
  onClose,
  onFavorite,
  onRename,
  onViewFiles,
  onRunDetails,
  onDelete,
  isFavorite = false,
  hasActiveSession = true,
}: ThreadActionsSheetProps) {
  const firstItemRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const { transition } = useMotionConfig();
  const portalRoot = typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    if (!open) return;
    haptic(12);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && sheetRef.current?.contains(target)) return;
      onClose();
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("touchstart", handlePointer);
    const t = window.setTimeout(() => firstItemRef.current?.focus(), 90);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("touchstart", handlePointer);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const disabledReason = hasActiveSession
    ? undefined
    : "Start or pick a thread to enable this action.";

  const actions: ThreadAction[] = [
    {
      id: "favorite",
      label: "Favorite",
      icon: Star,
      subtitle: isFavorite ? "Saved for quick access." : "Keep this thread close at hand.",
      active: isFavorite,
      onSelect: () => {
        haptic(8);
        onFavorite();
        onClose();
      },
    },
    {
      id: "rename",
      label: "Rename",
      icon: Pencil,
      subtitle: "Give the thread a sharper title.",
      onSelect: () => {
        haptic(8);
        onRename();
        onClose();
      },
      disabled: !hasActiveSession,
      disabledReason,
    },
    {
      id: "view-files",
      label: "View all files",
      icon: Folder,
      subtitle: "Open every file linked to this thread.",
      onSelect: () => {
        haptic(8);
        onViewFiles();
        onClose();
      },
    },
    {
      id: "run-details",
      label: "Task details",
      icon: Info,
      subtitle: "Inspect run timing, credits, and metadata.",
      onSelect: () => {
        haptic(8);
        onRunDetails();
        onClose();
      },
      disabled: !hasActiveSession,
      disabledReason,
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      subtitle: "Remove the thread and its working trace.",
      onSelect: () => {
        haptic([10, 40, 10]);
        onDelete();
        onClose();
      },
      destructive: true,
      disabled: !hasActiveSession,
      disabledReason,
    },
  ];

  if (!portalRoot) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Thread actions"
          className="fixed inset-0 z-[110] isolate flex items-end justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition({ duration: 0.24, ease: [0.22, 1, 0.36, 1] })}
        >
          <motion.button
            type="button"
            aria-label="Close thread actions"
            onClick={onClose}
            className="absolute inset-0 bg-black/58 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition({ duration: 0.24 })}
          />
          <motion.div
            ref={sheetRef}
            role="menu"
            aria-label="Thread actions"
            className="pointer-events-auto relative isolate w-full max-w-[520px] overflow-hidden rounded-t-[30px] border border-white/[0.08] bg-[#151a21] px-3 pb-[calc(env(safe-area-inset-bottom)+108px)] pt-3 shadow-[0_-30px_80px_-28px_rgba(0,0,0,0.98)] [backface-visibility:hidden] sm:mb-0 sm:max-w-[388px] sm:rounded-[26px] sm:pb-[max(14px,env(safe-area-inset-bottom))]"
            initial={{ y: 72, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 42, opacity: 0, scale: 0.985 }}
            transition={transition({ type: "spring", stiffness: 250, damping: 28, mass: 0.9 })}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.18 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 86 || info.velocity.y > 720) {
                onClose();
              }
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0))]"
            />
            <div className="mx-auto mb-3 mt-1 h-[5px] w-[42px] rounded-full bg-white/[0.18]" aria-hidden="true" />
            <div className="relative mb-2 flex items-center justify-center px-2">
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                Thread actions
              </span>
            </div>

            <ul className="relative flex flex-col gap-1 px-1">
              {actions.map((action, index) => {
                const Icon = action.icon;
                const disabled = action.disabled ?? false;
                return (
                  <li key={action.id}>
                    <button
                      ref={index === 0 ? firstItemRef : undefined}
                      type="button"
                      role="menuitem"
                      onClick={action.onSelect}
                      disabled={disabled}
                      title={disabled ? action.disabledReason : undefined}
                      className={`nb-pressable flex min-h-[56px] w-full items-start gap-3.5 rounded-[18px] px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                        action.destructive
                          ? "text-[#ff453a] hover:bg-[#ff453a]/[0.09]"
                          : "text-gray-100 hover:bg-white/[0.06]"
                      } ${disabled ? "cursor-not-allowed opacity-40 hover:bg-transparent" : ""}`}
                    >
                      <Icon
                        className={`mt-0.5 h-5.5 w-5.5 shrink-0 ${
                          action.destructive
                            ? "text-[#ff453a]"
                            : action.active
                              ? "fill-current text-amber-300"
                              : "text-gray-300"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-semibold tracking-[-0.01em]">
                          {action.label}
                        </span>
                        {action.subtitle ? (
                          <span className="mt-0.75 block text-[11.5px] text-gray-400">
                            {action.subtitle}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    portalRoot,
  );
});
