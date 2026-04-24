/**
 * MobileCaptureFab — 52px terracotta circle, bottom-right, above the
 * MobileTabBar. Mirrors `docs/design/.../ui_kits/nodebench-mobile/Fab.jsx`
 * one-for-one (right 14px, bottom 72px, 52x52, rounded-full, shadow).
 *
 * Tap opens the FastAgentPanel — the "universal composer" entry point for
 * mobile. Aligns with the universal-capture principle in the active plan.
 *
 * Hidden above `md` viewport (desktop has rail + top nav already).
 */
import { Plus } from "lucide-react";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";

export function MobileCaptureFab() {
  const { open } = useFastAgent();
  return (
    <button
      type="button"
      onClick={() => open({})}
      aria-label="Capture or ask"
      data-testid="mobile-capture-fab"
      className="
        fixed right-4 z-40 flex h-[52px] w-[52px] items-center justify-center
        rounded-full border-0 text-white
        transition-transform duration-150 ease-out
        active:scale-[0.96]
        md:hidden
      "
      style={{
        // `calc(env(safe-area-inset-bottom) + 72px)` keeps the FAB clear of
        // the MobileTabBar + mobile Safari's home indicator. The 72px baseline
        // matches the design-kit spec.
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
        background: "var(--accent-primary, #D97757)",
        boxShadow:
          "0 10px 28px rgba(217,119,87,0.34), 0 2px 8px rgba(15,23,42,0.12)",
      }}
    >
      <Plus size={22} strokeWidth={2.4} aria-hidden />
    </button>
  );
}

export default MobileCaptureFab;
