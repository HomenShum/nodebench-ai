import { memo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, ExternalLink, Link2, Send, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMotionConfig } from "@/lib/motion";

export interface ChatShareSheetProps {
  open: boolean;
  onClose: () => void;
  threadLabel: string;
  shareUrl: string;
  linkCopied?: boolean;
  onCopyLink: () => void;
  onSystemShare?: () => void;
  onOpenCanonicalReport?: () => void;
  canSystemShare?: boolean;
  canOpenCanonicalReport?: boolean;
}

export const ChatShareSheet = memo(function ChatShareSheet({
  open,
  onClose,
  threadLabel,
  shareUrl,
  linkCopied = false,
  onCopyLink,
  onSystemShare,
  onOpenCanonicalReport,
  canSystemShare = false,
  canOpenCanonicalReport = false,
}: ChatShareSheetProps) {
  const { transition } = useMotionConfig();
  const portalRoot = typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!portalRoot) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Share ${threadLabel}`}
          className="fixed inset-0 z-[110] isolate flex items-end justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition({ duration: 0.24, ease: [0.22, 1, 0.36, 1] })}
        >
          <motion.button
            type="button"
            aria-label="Close share options"
            onClick={onClose}
            className="absolute inset-0 bg-black/58 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition({ duration: 0.24 })}
          />
          <motion.div
            className="pointer-events-auto relative isolate w-full max-w-[520px] overflow-hidden rounded-t-[30px] border border-white/[0.08] bg-[#151a21] px-3 pb-[calc(env(safe-area-inset-bottom)+108px)] pt-3 shadow-[0_-30px_80px_-28px_rgba(0,0,0,0.98)] [backface-visibility:hidden] sm:mb-0 sm:max-w-[380px] sm:rounded-[26px] sm:pb-[max(14px,env(safe-area-inset-bottom))]"
            initial={{ y: 72, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 42, opacity: 0, scale: 0.985 }}
            transition={transition({ type: "spring", stiffness: 250, damping: 28, mass: 0.9 })}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0))]"
            />
            <div className="mx-auto mt-1 mb-3 h-[5px] w-[42px] rounded-full bg-white/[0.18]" aria-hidden="true" />
            <div className="relative mb-2 flex items-center justify-between px-2">
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                Share {threadLabel}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/[0.06] hover:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="relative px-1">
              <span className="px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                Share options
              </span>
              <ul className="mt-1 flex flex-col gap-1">
                <ActionRow
                  icon={linkCopied ? Check : Link2}
                  label={linkCopied ? "Link copied" : "Copy link"}
                  subtitle={shareUrl}
                  onSelect={onCopyLink}
                  accent={linkCopied ? "success" : undefined}
                />
                {canSystemShare && onSystemShare ? (
                  <ActionRow
                    icon={Send}
                    label="Share via device"
                    subtitle="Open your system share sheet."
                    onSelect={onSystemShare}
                  />
                ) : null}
                {canOpenCanonicalReport && onOpenCanonicalReport ? (
                  <ActionRow
                    icon={ExternalLink}
                    label="Open canonical report"
                    subtitle="Jump to the saved report view."
                    onSelect={onOpenCanonicalReport}
                  />
                ) : null}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
    ,
    portalRoot,
  );
});

interface ActionRowProps {
  icon: typeof Link2;
  label: string;
  subtitle?: string;
  onSelect: () => void;
  accent?: "success";
}

function ActionRow({ icon: Icon, label, subtitle, onSelect, accent }: ActionRowProps) {
  return (
    <li>
      <button
        type="button"
        role="menuitem"
        onClick={onSelect}
        className={`flex min-h-[56px] w-full items-start gap-3.5 rounded-[18px] px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
          accent === "success"
            ? "text-emerald-300 hover:bg-emerald-500/10"
            : "text-gray-100 hover:bg-white/[0.06]"
        }`}
      >
        <Icon className={`h-5.5 w-5.5 shrink-0 ${accent === "success" ? "text-emerald-400" : "text-gray-300"}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold tracking-[-0.01em]">{label}</div>
          {subtitle ? (
            <div className="mt-0.75 truncate text-[11.5px] text-gray-400">{subtitle}</div>
          ) : null}
        </div>
      </button>
    </li>
  );
}
