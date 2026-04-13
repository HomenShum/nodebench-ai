import { useMemo } from "react";
import { useThemeSafe } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

type ProductThumbnailProps = {
  title: string;
  summary: string;
  type: string;
  meta?: string;
  tone?: number;
  className?: string;
  compact?: boolean;
};

const LIGHT_TONES = [
  { accent: "#d97757", wash: "linear-gradient(145deg, #fff7f4 0%, #f8ece8 100%)", glow: "rgba(217, 119, 87, 0.14)" },
  { accent: "#4f46e5", wash: "linear-gradient(145deg, #f4f4ff 0%, #ececff 100%)", glow: "rgba(79, 70, 229, 0.14)" },
  { accent: "#0f766e", wash: "linear-gradient(145deg, #f2fcfa 0%, #e6f5f2 100%)", glow: "rgba(15, 118, 110, 0.14)" },
  { accent: "#7c3aed", wash: "linear-gradient(145deg, #faf5ff 0%, #f3ebff 100%)", glow: "rgba(124, 58, 237, 0.14)" },
  { accent: "#b45309", wash: "linear-gradient(145deg, #fff9ef 0%, #f8efde 100%)", glow: "rgba(180, 83, 9, 0.14)" },
  { accent: "#0369a1", wash: "linear-gradient(145deg, #f1f9ff 0%, #e6f2fb 100%)", glow: "rgba(3, 105, 161, 0.14)" },
] as const;

const DARK_TONES = [
  { accent: "#d97757", wash: "linear-gradient(145deg, #2a1b16 0%, #171311 100%)", glow: "rgba(217, 119, 87, 0.18)" },
  { accent: "#7c8cff", wash: "linear-gradient(145deg, #1b1d2a 0%, #13151d 100%)", glow: "rgba(124, 140, 255, 0.18)" },
  { accent: "#3ba889", wash: "linear-gradient(145deg, #162520 0%, #121816 100%)", glow: "rgba(59, 168, 137, 0.18)" },
  { accent: "#c08bff", wash: "linear-gradient(145deg, #24182c 0%, #17131c 100%)", glow: "rgba(192, 139, 255, 0.18)" },
  { accent: "#f0c75e", wash: "linear-gradient(145deg, #2b2414 0%, #18150f 100%)", glow: "rgba(240, 199, 94, 0.18)" },
  { accent: "#6bb9ff", wash: "linear-gradient(145deg, #152330 0%, #11171d 100%)", glow: "rgba(107, 185, 255, 0.18)" },
] as const;

function getInitials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProductThumbnail({
  title,
  summary,
  type,
  meta,
  tone = 0,
  className,
  compact = false,
}: ProductThumbnailProps) {
  const { resolvedMode } = useThemeSafe();
  const palette = useMemo(
    () => (resolvedMode === "dark" ? DARK_TONES : LIGHT_TONES)[tone % LIGHT_TONES.length],
    [resolvedMode, tone],
  );
  const footerChips = [
    { label: "State", value: meta ?? "Ready" },
    { label: "Proof", value: "Source-led" },
    { label: "Use", value: "Reopen" },
  ];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[18px] border p-4",
        resolvedMode === "dark"
          ? "border-white/8 text-white"
          : "border-[rgba(15,23,42,0.08)] text-slate-900",
        className,
      )}
      style={{ background: palette.wash }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl"
        style={{ backgroundColor: palette.glow }}
      />
      <div
        className={cn(
          "relative flex h-full flex-col justify-between",
          compact ? "gap-3" : "gap-4",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "inline-flex max-w-[70%] items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
              resolvedMode === "dark" ? "bg-white/8 text-white/82" : "bg-white/70 text-slate-700",
            )}
          >
            {type}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold",
              resolvedMode === "dark" ? "bg-black/18 text-white/88" : "bg-white/82 text-slate-800",
            )}
            style={{ boxShadow: `inset 0 0 0 1px ${palette.glow}` }}
          >
            {getInitials(title)}
          </div>
        </div>

        <div>
          <div className={cn("line-clamp-2 font-semibold tracking-tight", compact ? "text-sm leading-5" : "text-[15px] leading-5")}>
            {title}
          </div>
          <div
            className={cn(
              "mt-2 line-clamp-2 text-xs leading-5",
              resolvedMode === "dark" ? "text-white/72" : "text-slate-600",
            )}
          >
            {summary}
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[1.3fr_0.9fr] gap-2">
            <div
              className={cn(
                "rounded-2xl px-3 py-2",
                resolvedMode === "dark" ? "bg-black/16" : "bg-white/74",
              )}
            >
              <div className={cn("text-[10px] uppercase tracking-[0.16em]", resolvedMode === "dark" ? "text-white/56" : "text-slate-500")}>
                What it is
              </div>
              <div className={cn("mt-1 line-clamp-2 text-[11px] leading-4.5", resolvedMode === "dark" ? "text-white/72" : "text-slate-600")}>
                {summary}
              </div>
            </div>
            <div className="grid gap-2">
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-[10px] uppercase tracking-[0.16em]",
                  resolvedMode === "dark" ? "bg-black/16 text-white/56" : "bg-white/74 text-slate-500",
                )}
              >
                {meta ?? "Ready"}
              </div>
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-[10px] uppercase tracking-[0.16em]",
                  resolvedMode === "dark" ? "bg-black/16 text-white/56" : "bg-white/74 text-slate-500",
                )}
              >
                Source-led
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {footerChips.map((item) => (
              <div
                key={`${title}-${item.label}`}
                className={cn(
                  "rounded-2xl px-3 py-2",
                  resolvedMode === "dark" ? "bg-black/16" : "bg-white/74",
                )}
              >
                <div className={cn("text-[9px] uppercase tracking-[0.16em]", resolvedMode === "dark" ? "text-white/56" : "text-slate-500")}>
                  {item.label}
                </div>
                <div className={cn("mt-1 truncate text-[11px] font-medium", resolvedMode === "dark" ? "text-white/78" : "text-slate-700")}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductThumbnail;
