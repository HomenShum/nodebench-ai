import { useEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  autoFocus?: boolean;
  positionClassName?: string;
  backdropClassName?: string;
  contentClassName?: string;
};

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [locked]);
}

/**
 * DialogOverlay — shared modal primitive.
 *
 * Root cause: many views rolled their own fixed overlays without focus traps,
 * Escape handling, or scroll locking. That causes a11y regressions and visual
 * inconsistency (including harsh fade animations that read as "flashes").
 */
export function DialogOverlay({
  isOpen,
  onClose,
  children,
  ariaLabel,
  closeOnBackdrop = true,
  closeOnEscape = true,
  autoFocus = true,
  positionClassName,
  backdropClassName,
  contentClassName,
}: Props) {
  useBodyScrollLock(isOpen);

  const { containerProps } = useFocusTrap<HTMLDivElement>({
    enabled: isOpen,
    autoFocus,
    onEscape: closeOnEscape ? onClose : undefined,
  });

  const portalRoot = useMemo(() => (typeof document === "undefined" ? null : document.body), []);

  if (!isOpen || !portalRoot) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        positionClassName,
      )}
    >
      <div
        className={cn("absolute inset-0 bg-black/50", backdropClassName)}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        {...containerProps}
        aria-label={ariaLabel}
        className={cn("relative z-10", contentClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    portalRoot,
  );
}

export default DialogOverlay;
