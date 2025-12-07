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
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-gray-500">Overnight Moves</p>
            <p className="text-sm font-semibold text-gray-900">What changed while you were away</p>
          </div>
        </div>
        <span className="text-[11px] text-gray-500 font-semibold">{items.length} updates</span>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen?.(item)}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                  {item.tag && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${tagStyles[item.tag]}`}>
                      {item.tag === "up" ? "Up" : item.tag === "alert" ? "Alert" : "Watch"}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-gray-600 line-clamp-2">{item.summary}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                  {item.date && <span className="rounded-full bg-gray-100 px-2 py-0.5">{item.date}</span>}
                  {item.sourceName && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5">{item.sourceName}</span>
                  )}
                  {item.amount && <span>{item.amount}</span>}
                  {item.stage && <span>• {item.stage}</span>}
                  {item.sector && <span>• {item.sector}</span>}
                </div>
              </div>
              {item.url && (
                <span className="text-gray-400 hover:text-gray-600">
                  <LinkIcon className="w-4 h-4" />
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-2 p-3 border-t border-gray-100 bg-gray-50">
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
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Full report
        </button>
      </div>
    </div>
  );
}

export default OvernightMovesCard;
