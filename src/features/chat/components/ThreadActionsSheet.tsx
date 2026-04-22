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
  const popoverRef = useRef<HTMLDivElement | null>(null);
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
      if (target && popoverRef.current?.contains(target)) return;
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
          role="presentation"
          className="fixed inset-0 z-[100] isolate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition({ duration: 0.24 })}
        >
          <div className="absolute inset-0" aria-hidden="true" />
          <motion.div
            ref={popoverRef}
            role="menu"
            aria-label="Thread actions"
            className="pointer-events-auto absolute right-3 top-[calc(env(safe-area-inset-top)+58px)] w-[min(296px,calc(100vw-24px))] overflow-hidden rounded-[24px] border border-white/[0.12] bg-[#171c23]/[0.98] p-2 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.92)] backdrop-blur-2xl"
            initial={{ opacity: 0, y: -14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={transition({ type: "spring", stiffness: 300, damping: 26, mass: 0.84 })}
          >
            <ul className="flex flex-col gap-1">
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
                      className={`nb-pressable flex min-h-[48px] w-full items-center gap-3 rounded-[16px] px-3.5 py-3 text-[15px] font-medium tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                        action.destructive
                          ? "text-[#ff453a] hover:bg-[#ff453a]/[0.09]"
                          : "text-gray-100 hover:bg-white/[0.06]"
                      } ${disabled ? "cursor-not-allowed opacity-40 hover:bg-transparent" : ""}`}
                    >
                      <Icon
                        className={`h-4.5 w-4.5 shrink-0 ${
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
    </AnimatePresence>,
    portalRoot,
  );
});
