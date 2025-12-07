import React, { useMemo, useState } from "react";
import { Filter, Users, ArrowRight, Building, FileText, FlaskConical, ShieldCheck, BookOpen, Zap } from "lucide-react";
import { Sparkline } from "@/components/ui/Sparkline";

export type Deal = {
  id: string;
  company: string;
  sector: string;
  stage: string;
  amount: string;
  date: string;
  location: string;
  leads: string[];
  coInvestors?: string[];
  summary: string;
  traction?: string;
  sentiment?: "hot" | "watch";
  spark?: number[];
  people: Array<{
    name: string;
    role: string;
    past: string;
  }>;
  timeline: Array<{
    label: string;
    detail: string;
  }>;
  regulatory?: {
    fdaStatus?: string;
    patents?: string[];
    papers?: string[];
  };
};

interface DealListPanelProps {
  deals: Deal[];
  onOpenDeal: (deal: Deal) => void;
}

const sentimentStyles: Record<NonNullable<Deal["sentiment"]>, string> = {
  hot: "bg-green-50 text-green-700 border border-green-100",
  watch: "bg-blue-50 text-blue-700 border border-blue-100",
};

export function DealListPanel({ deals, onOpenDeal }: DealListPanelProps) {
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [focusedSelect, setFocusedSelect] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return deals.filter((deal) => {
      const stageOk = stageFilter === "all" || deal.stage.toLowerCase() === stageFilter;
      const sectorOk = sectorFilter === "all" || deal.sector.toLowerCase() === sectorFilter;
      return stageOk && sectorOk;
    });
  }, [deals, stageFilter, sectorFilter]);

  const stages = Array.from(new Set(deals.map((d) => d.stage.toLowerCase())));
  const sectors = Array.from(new Set(deals.map((d) => d.sector.toLowerCase())));

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-gray-500">Deal List</p>
            <p className="text-sm font-semibold text-gray-900">Filter by stage & sector</p>
          </div>
        </div>
        <Filter className="w-4 h-4 text-gray-400" />
      </div>

      <div className="flex gap-2 px-4 pt-3 pb-2">
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          onFocus={() => setFocusedSelect("stage")}
          onBlur={() => setFocusedSelect(null)}
          className={`flex-1 text-sm border rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 ${
            focusedSelect === "stage" ? "border-gray-300 ring-gray-300" : "border-gray-200 ring-gray-200"
          }`}
        >
          <option value="all">Stage: All</option>
          {stages.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          onFocus={() => setFocusedSelect("sector")}
          onBlur={() => setFocusedSelect(null)}
          className={`flex-1 text-sm border rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 ${
            focusedSelect === "sector" ? "border-gray-300 ring-gray-300" : "border-gray-200 ring-gray-200"
          }`}
        >
          <option value="all">Sector: All</option>
          {sectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>
      </div>

      <div className="divide-y divide-gray-100">
        {filtered.map((deal) => (
          <button
            key={deal.id}
            type="button"
            onClick={() => onOpenDeal(deal)}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{deal.company}</p>
                  <span className="text-[11px] font-semibold text-gray-500">{deal.amount}</span>
                  <span className="text-[11px] text-gray-500">• {deal.stage}</span>
                  <span className="text-[11px] text-gray-500">• {deal.date}</span>
                  {deal.sentiment && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${sentimentStyles[deal.sentiment]}`}>
                      {deal.sentiment === "hot" ? "Hot" : "Watch"}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-gray-600 line-clamp-2">{deal.summary}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-gray-500">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5">{deal.location}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5">{deal.sector}</span>
                  {deal.leads?.[0] && <span className="rounded-full bg-gray-100 px-2 py-0.5">Lead: {deal.leads[0]}</span>}
                  {deal.traction && <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">{deal.traction}</span>}
                </div>
              </div>
              {deal.spark && (
                <div className="w-24">
                  <Sparkline data={deal.spark} width={90} height={32} color="#22c55e" />
                </div>
              )}
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DealFlyout({
  deal,
  onClose,
  onPrep,
}: {
  deal: Deal | null;
  onClose: () => void;
  onPrep: (intent: "email" | "call" | "invite", deal: Deal) => void;
}) {
  if (!deal) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-start justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/10 pointer-events-auto" onClick={onClose} />
      <div className="relative pointer-events-auto mt-10 mr-6 w-[420px] max-w-[94vw] bg-white border border-gray-200 shadow-2xl rounded-2xl overflow-hidden">
        <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-gray-900">{deal.company}</p>
              <span className="text-[11px] font-semibold text-gray-600">{deal.amount}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">{deal.stage}</span>
            </div>
            <p className="text-sm text-gray-600">{deal.sector} • {deal.location}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-700"
            aria-label="Close deal details"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="text-sm text-gray-800 leading-relaxed">{deal.summary}</div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-1">
            <div className="text-[11px] font-semibold text-gray-500">Leads & Co-investors</div>
            <p className="text-sm text-gray-800">
              Lead: {deal.leads.join(", ")}
              {deal.coInvestors?.length ? ` • Co-investors: ${deal.coInvestors.join(", ")}` : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-100 p-3 bg-white">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                <Users className="w-3.5 h-3.5" />
                People
              </div>
              <ul className="mt-2 space-y-1">
                {deal.people.map((p, idx) => (
                  <li key={idx} className="text-sm text-gray-800">
                    <span className="font-semibold">{p.name}</span> — {p.role}
                    <div className="text-[12px] text-gray-500">{p.past}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-gray-100 p-3 bg-white">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                <FileText className="w-3.5 h-3.5" />
                Timeline
              </div>
              <ul className="mt-2 space-y-1">
                {deal.timeline.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-800 flex gap-2">
                    <span className="text-gray-500 text-[12px]">{item.label}</span>
                    <span>{item.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 p-3 bg-white space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500">
              <FlaskConical className="w-3.5 h-3.5" />
              Regulatory & Papers
            </div>
            {deal.regulatory?.fdaStatus && (
              <div className="inline-flex items-center gap-2 text-[12px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                <ShieldCheck className="w-3.5 h-3.5" />
                {deal.regulatory.fdaStatus}
              </div>
            )}
            {deal.regulatory?.patents?.length ? (
              <div className="text-sm text-gray-800">
                <span className="font-semibold">Patents:</span> {deal.regulatory.patents.join(", ")}
              </div>
            ) : null}
            {deal.regulatory?.papers?.length ? (
              <div className="text-sm text-gray-800 space-y-1">
                <div className="font-semibold">Academic papers</div>
                <ul className="list-disc list-inside text-gray-700 text-[13px]">
                  {deal.regulatory.papers.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onPrep("email", deal)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold px-3 py-2 hover:bg-gray-800 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Prep email
            </button>
            <button
              type="button"
              onClick={() => onPrep("call", deal)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Call brief
            </button>
            <button
              type="button"
              onClick={() => onPrep("invite", deal)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Invite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DealListPanel;
