import { memo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Star, Pencil, Folder, Info, Trash2, X } from "lucide-react";
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
    window.addEventListener("keydown", handleKey);
    const t = window.setTimeout(() => firstItemRef.current?.focus(), 120);
    return () => {
      window.removeEventListener("keydown", handleKey);
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
      label: isFavorite ? "Remove from favorites" : "Favorite",
      icon: Star,
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
          className="fixed inset-0 z-[100] isolate flex items-end justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition({ duration: 0.28, ease: [0.16, 1, 0.3, 1] })}
        >
          <motion.button
            type="button"
            aria-label="Close thread actions"
            onClick={() => {
              haptic(6);
              onClose();
            }}
            className="absolute inset-0 bg-black/44 backdrop-blur-[10px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition({ duration: 0.22 })}
          />
          <motion.div
            role="menu"
            className="pointer-events-auto relative isolate w-full max-w-[520px] overflow-hidden rounded-t-[30px] border border-white/[0.1] bg-[#171c23] px-3 pb-[calc(env(safe-area-inset-bottom)+108px)] pt-3 shadow-[0_-26px_72px_-26px_rgba(0,0,0,0.88)] [backface-visibility:hidden] sm:mb-0 sm:max-w-[380px] sm:rounded-[28px] sm:pb-[max(14px,env(safe-area-inset-bottom))]"
            initial={{ y: 52, opacity: 0, scale: 0.992 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.992 }}
            transition={transition({ type: "spring", stiffness: 340, damping: 30, mass: 0.78 })}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0))]"
            />
            <div className="mx-auto mt-1 mb-3 h-[5px] w-[42px] rounded-full bg-white/[0.18]" aria-hidden="true" />
            <div className="relative mb-2 flex items-center justify-between px-2">
              <h2 className="nb-text-title text-[15px] font-semibold tracking-[-0.01em] text-gray-50">Thread actions</h2>
              <button
                type="button"
                onClick={() => {
                  haptic(6);
                  onClose();
                }}
                aria-label="Close"
                className="nb-pressable inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-white/[0.08] hover:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <ul className="relative flex flex-col gap-1">
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
                      className={`nb-pressable flex min-h-[56px] w-full items-center gap-3.5 rounded-[18px] px-4 py-4 text-[16px] font-semibold tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                        action.destructive
                          ? "text-[#ff453a] hover:bg-[#ff453a]/[0.09]"
                          : "text-gray-100 hover:bg-white/[0.06]"
                      } ${disabled ? "cursor-not-allowed opacity-40 hover:bg-transparent" : ""}`}
                    >
                      <Icon
                        className={`h-5.5 w-5.5 shrink-0 ${
                          action.destructive ? "text-[#ff453a]" : "text-gray-300"
                        }`}
                      />
                      <span className="flex-1 text-left">{action.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
    ,
    portalRoot,
  );
});
