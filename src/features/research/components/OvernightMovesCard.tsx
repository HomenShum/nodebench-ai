import React from "react";
import { Clock, ArrowUpRight, AlertTriangle, Link as LinkIcon } from "lucide-react";

export type MoveItem = {
  id: string;
  title: string;
  amount?: string;
  stage?: string;
  sector?: string;
  summary: string;
  date?: string;
  sourceName?: string;
  url?: string;
  tag?: "up" | "alert" | "watch";
};

interface OvernightMovesCardProps {
  items: MoveItem[];
  onOpen?: (item: MoveItem) => void;
  onBrief?: () => void;
}

const tagStyles: Record<NonNullable<MoveItem["tag"]>, string> = {
  up: "bg-green-50 text-green-700 border border-green-100",
  alert: "bg-amber-50 text-amber-700 border border-amber-100",
  watch: "bg-blue-50 text-blue-700 border border-blue-100",
};

export function OvernightMovesCard({ items, onOpen, onBrief }: OvernightMovesCardProps) {
  return (
    <div className="rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border-color)]">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-[color:var(--text-secondary)]">Overnight Moves</p>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">What changed while you were away</p>
          </div>
        </div>
        <span className="text-[11px] text-[color:var(--text-secondary)] font-semibold">{items.length} updates</span>
      </div>

      <div className="divide-y divide-[color:var(--border-color)]">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen?.(item)}
            className="w-full text-left px-4 py-3 hover:bg-[color:var(--bg-hover)] transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)] truncate">{item.title}</p>
                  {item.tag && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${tagStyles[item.tag]}`}>
                      {item.tag === "up" ? "Up" : item.tag === "alert" ? "Alert" : "Watch"}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[color:var(--text-primary)] line-clamp-2">{item.summary}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--text-secondary)]">
                  {item.date && <span className="rounded-full bg-[color:var(--bg-secondary)] px-2 py-0.5">{item.date}</span>}
                  {item.sourceName && (
                    <span className="rounded-full bg-[color:var(--bg-secondary)] px-2 py-0.5">{item.sourceName}</span>
                  )}
                  {item.amount && <span>{item.amount}</span>}
                  {item.stage && <span>• {item.stage}</span>}
                  {item.sector && <span>• {item.sector}</span>}
                </div>
              </div>
              {item.url && (
                <span className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]">
                  <LinkIcon className="w-4 h-4" />
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-2 p-3 border-t border-[color:var(--border-color)] bg-[color:var(--bg-secondary)]">
        <button
          type="button"
          onClick={onBrief}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 text-white text-sm font-semibold px-3 py-2 hover:bg-gray-800 transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
          Quick brief
        </button>
        <button
          type="button"
          onClick={() => onOpen?.({ id: "all", title: "All Overnight Moves", summary: "Full report" })}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] text-sm font-semibold px-3 py-2 hover:bg-[color:var(--bg-hover)] transition-colors"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Full report
        </button>
      </div>
    </div>
  );
}

export default OvernightMovesCard;
